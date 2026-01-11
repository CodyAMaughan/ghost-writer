import { ref, reactive } from 'vue';
import Peer from 'peerjs';
import { fetchAI } from '../services/ai';
import { THEMES } from '../config/themes';

// Singleton State
let revealTimer = null;

const gameState = reactive({
    phase: 'LOBBY',
    currentTheme: 'classic',
    roomCode: '',
    hostId: '',
    round: 1,
    maxRounds: 5,
    timer: 0,
    prompt: ' Waiting for Host...',
    players: [],
    submissions: [],
    finishedVotingIDs: [],
    revealedIndex: -1,
    revealStep: 0,
    settings: {
        provider: 'gemini',
        apiKey: '',
        roundDuration: 45,
        requirePassword: false,
        password: '',
        enableWaitingRoom: false
    },
    usedPrompts: [], // Track used prompts to prevent duplicates
    pendingPlayers: [] // Players awaiting approval (if waiting room enabled)
});

const myId = ref('');
const myName = ref('');
const isHost = ref(false);
const isPending = ref(false); // Track if waiting for host approval
const connectionError = ref(''); // Error message for connection issues
const connMap = new Map();
let peer = null;
let hostConn = null;
let wasKicked = false; // Track if we were intentionally disconnected
let pendingGhostResolve = null;

export function usePeer() {

    // --- HOST LOGIC ---

    const getUniqueAvatarId = () => {
        const used = gameState.players.map(p => p.avatarId);
        const all = Array.from({ length: 12 }, (_, i) => i);
        const available = all.filter(id => !used.includes(id));
        if (available.length === 0) return Math.floor(Math.random() * 12);
        return available[Math.floor(Math.random() * available.length)];
    };

    const setPlayerAvatar = (playerId, avatarId) => {
        const p = gameState.players.find(p => p.id === playerId);
        if (p) {
            const others = gameState.players.filter(x => x.id !== playerId);
            // Allow duplicates if user specifically chooses one? Or strict "no duplicates"?
            // User said: "you can click on your icon and change it to an available icon (no duplicates)"
            if (others.some(o => o.avatarId === avatarId)) return; // Taken/Ignore
            p.avatarId = avatarId;
            broadcastState();
        }
    };

    const initHost = (name, provider, apiKey, lobbySettings = {}) => {
        isHost.value = true;
        myName.value = name;
        gameState.settings.provider = provider;
        gameState.settings.apiKey = apiKey;

        // Apply lobby settings
        gameState.settings.requirePassword = lobbySettings.requirePassword || false;
        gameState.settings.password = lobbySettings.password || '';
        gameState.settings.enableWaitingRoom = lobbySettings.enableWaitingRoom || false;

        // Generate 6-char code for better security
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        gameState.roomCode = code;

        // Namespace the Peer ID to avoid collisions with other users of the public PeerJS server
        // logic: ghost-writer-[CODE]
        peer = new Peer(`ghost-writer-${code}`);

        peer.on('open', (id) => {
            console.log('Host created w/ ID:', id);
            myId.value = id;
            gameState.hostId = id;
            addPlayer(id, name, true);
        });

        peer.on('connection', (conn) => {
            connMap.set(conn.peer, conn);
            conn.on('data', (data) => handleHostData(data, conn.peer));
            conn.on('close', () => {
                removePlayer(conn.peer);
                // Also remove from pending if they were there
                gameState.pendingPlayers = gameState.pendingPlayers.filter(p => p.id !== conn.peer);
            });
            // Don't send SYNC yet - wait for JOIN with password if needed
        });
    };

    const GAME_ID_PREFIX = 'ghost-writer-';

    // --- CLIENT LOGIC ---
    const joinGame = (code, name, password = '') => {
        isHost.value = false;
        myName.value = name;
        gameState.roomCode = code;
        connectionError.value = ''; // Clear any previous errors
        isPending.value = false; // Reset pending state

        // Cleanup existing peer if any to efficiently handle re-attempts
        if (peer) {
            peer.destroy();
            peer = null;
        }

        peer = new Peer();

        peer.on('open', (id) => {
            myId.value = id;
            const hostId = `${GAME_ID_PREFIX}${code}`;

            hostConn = peer.connect(hostId);

            hostConn.on('open', () => {
                hostConn.send({ type: 'JOIN', payload: { name, password } });
            });

            hostConn.on('data', (data) => handleClientData(data));

            hostConn.on('close', () => {
                // Only show "Host disconnected" if it wasn't an intentional kick/reject
                if (!wasKicked) {
                    alert("Host disconnected");
                    window.location.reload();
                }
            });
        });
    };

    // --- DATA HANDLERS ---

    const handleHostData = (msg, senderId) => {
        console.log(`[HOST] Received ${msg.type} from ${senderId}`, msg.payload);
        switch (msg.type) {
            case 'JOIN':
                // Password check
                if (gameState.settings.requirePassword) {
                    if (msg.payload.password !== gameState.settings.password) {
                        const conn = connMap.get(senderId);
                        if (conn) {
                            conn.send({ type: 'AUTH_ERROR', payload: { message: 'Incorrect password' } });
                            conn.close();
                        }
                        connMap.delete(senderId);
                        return;
                    }
                }

                // Check for duplicate names
                const nameExists = gameState.players.some(p => p.name === msg.payload.name) ||
                    gameState.pendingPlayers.some(p => p.name === msg.payload.name);

                if (nameExists) {
                    const conn = connMap.get(senderId);
                    if (conn) {
                        conn.send({ type: 'REJECTED', payload: { message: 'Name already taken' } });
                        conn.close();
                    }
                    connMap.delete(senderId);
                    return;
                }

                // Waiting room routing
                if (gameState.settings.enableWaitingRoom) {
                    // Add to pending list
                    gameState.pendingPlayers.push({
                        id: senderId,
                        name: msg.payload.name,
                        avatarId: null
                    });
                    // Send pending status (not full SYNC)
                    const conn = connMap.get(senderId);
                    if (conn) {
                        conn.send({ type: 'PENDING', payload: { message: 'Waiting for host approval' } });
                    }
                } else {
                    // Direct entry
                    addPlayer(senderId, msg.payload.name, false);
                    // Send welcome SYNC
                    const conn = connMap.get(senderId);
                    if (conn) {
                        conn.send({ type: 'SYNC', payload: gameState });
                    }
                }
                broadcastState();
                break;
            case 'SUBMIT_ANSWER':
                const existing = gameState.submissions.find(s => s.authorId === senderId);
                if (!existing) {
                    gameState.submissions.push({
                        authorId: senderId,
                        text: msg.payload.text,
                        source: msg.payload.source,
                        agent: msg.payload.agent,
                        votes: {}
                    });

                    // Auto-advance
                    if (gameState.submissions.length === gameState.players.length) {
                        if (currentTimerInterval) clearInterval(currentTimerInterval);
                        startVoting();
                    }
                }
                broadcastState();
                break;
            case 'LOCK_VOTES':
                if (!gameState.finishedVotingIDs.includes(senderId)) {
                    gameState.finishedVotingIDs.push(senderId);
                }
                // Auto-advance
                if (gameState.finishedVotingIDs.length === gameState.players.length) {
                    startReveal();
                }
                broadcastState();
                break;
            case 'SUBMIT_VOTE':
                console.log(`[HOST] Vote received from ${senderId} for ${msg.payload.targetAuthorId}: ${msg.payload.guess}`);
                const submission = gameState.submissions.find(s => s.authorId === msg.payload.targetAuthorId);
                if (submission) {
                    submission.votes[senderId] = msg.payload.guess;
                }
                broadcastState();
                broadcastState();
                break;
            case 'UPDATE_AVATAR':
                setPlayerAvatar(senderId, msg.payload.avatarId);
                break;
            case 'REQUEST_GHOST':
                // Host acts as proxy
                let systemPrompt = "";

                if (msg.payload.agentId === 'custom') {
                    systemPrompt = (msg.payload.systemPrompt || "You are a generic helper.") + " Keep it under 15 words.";
                } else {
                    const theme = THEMES[gameState.currentTheme];
                    const agentDef = theme ? theme.agents.find(a => a.id === msg.payload.agentId) : null;
                    if (agentDef) systemPrompt = agentDef.systemPrompt;
                }

                if (systemPrompt) {
                    // Add constraint here for safety if not trusted source? 
                    // Service layer puts instruction at end anyway.
                    fetchAI(gameState.settings.provider, gameState.settings.apiKey, msg.payload.prompt, systemPrompt)
                        .then(options => {
                            const conn = connMap.get(senderId);
                            if (conn) conn.send({ type: 'GHOST_OPTIONS', payload: { options } });
                        })
                        .catch(err => {
                            console.error("Ghost Gen Error", err);
                            const conn = connMap.get(senderId);
                            if (conn) conn.send({ type: 'GHOST_ERROR', payload: { message: err.message || "Failed to generate ghost" } });
                        });
                }
                break;
        }
    };

    const handleClientData = (msg) => {
        console.log(`[CLIENT] Received ${msg.type}`, msg.payload);
        if (msg.type === 'SYNC') {
            Object.assign(gameState, msg.payload);

            // Fix: Only clear pending if I am actually in the game now
            const amIInGame = gameState.players.some(p => p.id === myId.value);
            if (amIInGame) {
                isPending.value = false; // No longer pending
            }
        } else if (msg.type === 'GHOST_OPTIONS') {
            if (pendingGhostResolve) {
                pendingGhostResolve(msg.payload.options);
                pendingGhostResolve = null;
            }
        } else if (msg.type === 'AUTH_ERROR') {
            wasKicked = true; // Prevent "host disconnected" message
            connectionError.value = msg.payload.message || 'Incorrect password';
            // Close connection but don't reload - let user retry
            if (peer) {
                peer.destroy();
                peer = null;
            }
            hostConn = null;
        } else if (msg.type === 'PENDING') {
            console.log('Waiting for host approval...');
            isPending.value = true; // Set pending state
        } else if (msg.type === 'REJECTED') {
            wasKicked = true; // Mark as intentional disconnect

            if (msg.payload.message === 'Name already taken') {
                connectionError.value = msg.payload.message;
                if (peer) {
                    peer.destroy();
                    peer = null;
                }
                hostConn = null;
            } else {
                alert(msg.payload.message || 'Host denied entry');
                window.location.reload();
            }
        } else if (msg.type === 'KICKED') {
            wasKicked = true; // Mark as intentional disconnect
            alert(msg.payload.message || 'You have been removed from the game');
            window.location.reload();
        }
    };

    // --- ACTIONS (Host) ---
    const broadcastState = () => {
        if (!isHost.value) return;
        console.log("[HOST] Broadcasting State", gameState.phase);

        // Masking for fairness
        const stateToSend = JSON.parse(JSON.stringify(gameState));
        if (gameState.phase === 'VOTING') {
            stateToSend.submissions.forEach(s => {
                // Mask source and agent, but SHOW authorId per request
                s.source = 'HIDDEN';
                s.agent = 'HIDDEN';
            });
        }

        // Send everyone the masked state
        // Note: Host will see "true" state in local `gameState`, clients see masked
        // But wait, if Host is also a player (using same UI), Host UI might reveal info?
        // Yes, Host has god view. That's acceptable for this prototype.
        // Ideally Host UI would use the same masked logic for the "Player View".

        for (const conn of connMap.values()) {
            conn.send({ type: 'SYNC', payload: stateToSend });
        }
    };

    const addPlayer = (id, name, isHostPlayer) => {
        if (gameState.players.find(p => p.id === id)) return;
        const avatarId = getUniqueAvatarId();
        gameState.players.push({ id, name, score: 0, isHost: isHostPlayer, avatarId });
        broadcastState();
    };

    const removePlayer = (id) => {
        gameState.players = gameState.players.filter(p => p.id !== id);
        connMap.delete(id);
        broadcastState();
    };

    const generateNewPrompt = async () => {
        const theme = THEMES[gameState.currentTheme] || THEMES.viral;
        const prompts = theme.prompts;

        // Filter out already used prompts
        const availablePrompts = prompts.filter(p => !gameState.usedPrompts.includes(p));

        // If all prompts have been used, reset the used list
        if (availablePrompts.length === 0) {
            gameState.usedPrompts = [];
            gameState.prompt = prompts[Math.floor(Math.random() * prompts.length)];
        } else {
            gameState.prompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
        }

        // Track this prompt as used
        gameState.usedPrompts.push(gameState.prompt);
    };

    const startGame = () => {
        gameState.players.forEach(p => p.score = 0);
        gameState.round = 1;
        gameState.usedPrompts = []; // Reset used prompts for new game
        startRound();
    };

    const nextRound = () => {
        gameState.round++;
        startRound();
    };

    const startRound = () => {
        console.log("[HOST] Starting Round", gameState.round);
        gameState.phase = 'PROMPT';
        gameState.submissions = [];
        gameState.votes = {};
        gameState.finishedVotingIDs = [];
        gameState.revealedIndex = -1;
        gameState.revealStep = 0;
        generateNewPrompt();
        broadcastState();

        // 5s to read prompt, then INPUT
        setTimeout(() => {
            gameState.timer = gameState.settings.roundDuration;
            gameState.phase = 'INPUT';
            broadcastState();
            startTimer();
        }, 5000);
    };

    let currentTimerInterval = null;

    const startTimer = () => {
        if (!isHost.value) return;
        if (currentTimerInterval) clearInterval(currentTimerInterval);

        currentTimerInterval = setInterval(() => {
            if (gameState.phase !== 'INPUT') {
                clearInterval(currentTimerInterval);
                return;
            }
            if (gameState.timer > 0) {
                gameState.timer--;
                // Optimization: Don't broadcast every second if latency is high, but for LAN/WebRTC it's okay-ish
                // To save bandwidth, maybe every 5s? Users can track locally?
                // Let's broadcast every 1s for the "pressure" vibe.
                broadcastState();
            } else {
                clearInterval(currentTimerInterval);
                startVoting();
            }
        }, 1000);
    };

    const startVoting = () => {
        // 1. Check for missing submissions and auto-fill
        gameState.players.forEach(p => {
            // ... previous logic ok
            const hasSubmitted = gameState.submissions.find(s => s.authorId === p.id);
            if (!hasSubmitted) {
                const fallbacks = ["Time out!", "Glitch in the matrix...", "..."];
                const randomText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                gameState.submissions.push({
                    authorId: p.id,
                    text: randomText,
                    source: "AI",
                    agent: "autopilot",
                    votes: {}
                });
            }
        });

        // 2. Shuffle
        gameState.submissions = gameState.submissions.sort(() => Math.random() - 0.5);
        gameState.finishedVotingIDs = []; // Reset this

        gameState.phase = 'VOTING';
        broadcastState();
    };

    const startReveal = () => {
        gameState.phase = 'REVEAL';
        gameState.revealedIndex = -1;
        gameState.revealStep = 0;
        nextReveal();
    };

    const nextReveal = () => {
        if (revealTimer) clearInterval(revealTimer);

        if (gameState.revealedIndex < gameState.submissions.length - 1) {
            gameState.revealedIndex++;
            gameState.revealStep = 0; // Reset step for new card
            broadcastState(); // Client shows animation

            // Auto-advance sequence (Host only)
            if (isHost.value) {
                revealTimer = setInterval(() => {
                    if (gameState.revealStep < 4) {
                        gameState.revealStep++;
                        broadcastState();
                    } else {
                        clearInterval(revealTimer);
                    }
                }, 2000);
            }
        } else {
            endRound();
        }
    };

    const nextRevealStep = () => {
        if (!isHost.value) return;

        if (gameState.revealStep < 4) {
            gameState.revealStep++;
            broadcastState();
        } else {
            nextReveal();
        }
    };

    const endRound = () => {
        // Tally scores
        calculateScores();
        gameState.phase = 'FINISH';
        broadcastState();
    };

    const calculateScores = () => {
        // See Design Doc 3.3
        // We need the REAL submissions to score, which Host has.

        gameState.submissions.forEach(sub => {
            let humanVotes = 0;
            let botVotes = 0;
            Object.values(sub.votes).forEach(v => v === 'HUMAN' ? humanVotes++ : botVotes++);

            const majority = humanVotes >= botVotes ? 'HUMAN' : 'BOT';
            const author = gameState.players.find(p => p.id === sub.authorId);
            if (!author) return;

            let points = 0;
            const isAI = sub.source === 'AI'; // "Ghost Write It"

            if (isAI && majority === 'HUMAN') points += 3; // FOOLED
            else if (isAI && majority === 'BOT') points += 0; // CAUGHT
            else if (!isAI && majority === 'BOT') points += 2; // FAKED
            else if (!isAI && majority === 'HUMAN') points += 1; // SAFE

            author.score += points;
        });

        // Bonus pts for correct voting
        // Iterate all votes
        gameState.submissions.forEach(sub => {
            Object.entries(sub.votes).forEach(([voterId, guess]) => {
                const result = sub.source === 'AI' ? 'BOT' : 'HUMAN';
                if (guess === result) {
                    const voter = gameState.players.find(p => p.id === voterId);
                    if (voter) voter.score += 1;
                }
            });
        });
    };

    const getGhostOptions = (agentId, customSystemPrompt = null) => {
        if (isHost.value) {
            // Call directly
            let sys = "";
            if (agentId === 'custom') {
                sys = (customSystemPrompt || "You are a generic helper.") + " Keep it under 15 words.";
            } else {
                const theme = THEMES[gameState.currentTheme] || THEMES.viral;
                const agentDef = theme.agents.find(a => a.id === agentId);
                sys = agentDef ? agentDef.systemPrompt : "";
            }
            return fetchAI(gameState.settings.provider, gameState.settings.apiKey, gameState.prompt, sys);
        } else {
            // Ask Host
            return new Promise((resolve) => {
                pendingGhostResolve = resolve;
                hostConn.send({ type: 'REQUEST_GHOST', payload: { agentId, prompt: gameState.prompt, systemPrompt: customSystemPrompt } });
            });
        }
    };

    const resetGame = () => {
        if (revealTimer) clearInterval(revealTimer);
        // Reset all state to default
        gameState.phase = 'LOBBY';
        gameState.roomCode = '';
        gameState.hostId = '';
        gameState.round = 1;
        gameState.timer = 0;
        gameState.players = [];
        gameState.submissions = [];
        gameState.votes = {};
        gameState.revealedIndex = -1;
        gameState.prompt = '';

        // Cleanup Peer
        if (hostConn) {
            hostConn.close();
            hostConn = null;
        }
        if (peer) {
            peer.destroy();
            peer = null;
        }

        connMap.clear();
        isHost.value = false;
        myId.value = '';
        // We keep myName.value for convenience
    };

    const leaveGame = () => {
        if (isHost.value) {
            // If host leaves, maybe notify others?
            // PeerJS destroy() usually triggers 'close' on others, handled in client logic
            resetGame();
        } else {
            resetGame();
        }
    };

    return {
        isHost,
        myId,
        myName,
        gameState,
        isPending,
        connectionError,
        initHost,
        joinGame,
        startGame,
        startRound,
        nextRound, // Exposed
        nextReveal,
        nextRevealStep,
        leaveGame, // Exposed

        // Actions
        setTheme: (themeId) => {
            if (isHost.value && THEMES[themeId]) {
                gameState.currentTheme = themeId;
                broadcastState();
            }
        },
        updateAvatar: (avatarId) => {
            if (isHost.value) {
                setPlayerAvatar(myId.value, avatarId);
            } else {
                hostConn && hostConn.send({ type: 'UPDATE_AVATAR', payload: { id: myId.value, avatarId } });
            }
        },
        submitAnswer: (text, source, agent) => {
            if (isHost.value) {
                handleHostData({ type: 'SUBMIT_ANSWER', payload: { text, source, agent } }, myId.value);
            } else {
                hostConn.send({ type: 'SUBMIT_ANSWER', payload: { text, source, agent } });
            }
        },
        submitVote: (targetAuthorId, guess) => {
            if (isHost.value) {
                handleHostData({ type: 'SUBMIT_VOTE', payload: { targetAuthorId, guess } }, myId.value);
            } else {
                hostConn.send({ type: 'SUBMIT_VOTE', payload: { targetAuthorId, guess } });
            }
        },
        lockVotes: () => {
            if (isHost.value) {
                handleHostData({ type: 'LOCK_VOTES' }, myId.value);
            } else {
                hostConn.send({ type: 'LOCK_VOTES' });
            }
        },
        approvePendingPlayer: (playerId) => {
            if (!isHost.value) return;

            const pending = gameState.pendingPlayers.find(p => p.id === playerId);
            if (!pending) return;

            // Move to active players
            addPlayer(playerId, pending.name, false);

            // Remove from pending
            gameState.pendingPlayers = gameState.pendingPlayers.filter(p => p.id !== playerId);

            // Send welcome SYNC to the approved player
            const conn = connMap.get(playerId);
            if (conn) {
                conn.send({ type: 'SYNC', payload: gameState });
            }

            broadcastState();
        },
        rejectPendingPlayer: (playerId) => {
            if (!isHost.value) return;

            // Remove from pending
            gameState.pendingPlayers = gameState.pendingPlayers.filter(p => p.id !== playerId);

            // Close connection
            const conn = connMap.get(playerId);
            if (conn) {
                conn.send({ type: 'REJECTED', payload: { message: 'Host denied entry' } });
                conn.close();
            }
            connMap.delete(playerId);

            broadcastState();
        },
        kickPlayer: (playerId) => {
            if (!isHost.value) return;

            // Get connection BEFORE removing player so we can send the message
            const conn = connMap.get(playerId);
            if (conn) {
                conn.send({ type: 'KICKED', payload: { message: 'You have been removed from the game' } });

                // Wait for message to flush before closing
                setTimeout(() => {
                    conn.close();
                }, 500);
            }

            // Remove from active players (clears connMap and broadcasts)
            removePlayer(playerId);
        },
        returnToLobby: () => {
            if (!isHost.value) return;

            // Reset game state but keep connections and players
            gameState.phase = 'LOBBY';
            gameState.round = 1;
            gameState.timer = 0;
            gameState.submissions = [];
            gameState.finishedVotingIDs = [];
            gameState.revealedIndex = -1;
            gameState.revealStep = 0;
            gameState.usedPrompts = [];

            // Reset player scores
            gameState.players.forEach(p => p.score = 0);

            broadcastState();
        },
        getGhostOptions
    };
}
