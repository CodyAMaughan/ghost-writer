import { ref, reactive } from 'vue';
import Peer from 'peerjs';
import { THEMES } from '../config/themes';
import { EMOTE_REGISTRY } from '../config/emotes';
import { getIceServers } from './peer/useIceServers';
import { useChat } from './peer/useChat';
import { useGhostAI } from './peer/useGhostAI';

// Singleton State
let revealTimer = null;
let promptTimeout = null;
let currentTimerInterval = null;

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
    pendingPlayers: [], // Players awaiting approval (if waiting room enabled)
    blacklist: [] // Store UUIDs of banned players
});

// Reconnection Timers (Host Side)
const reconnectTimers = new Map(); // playerUuid -> timeoutId

const myId = ref('');
const myName = ref(
    typeof localStorage !== 'undefined'
        ? localStorage.getItem('ghost_writer_name') || ''
        : ''
);
const isHost = ref(false);
const isPending = ref(false); // Track if waiting for host approval
const connectionError = ref(''); // Error message for connection issues
const remoteDisconnectReason = ref(''); // Reason for remote disconnect (e.g. host closed lobby)
const connMap = new Map();
let peer = null;
let hostConn = null;
let wasKicked = false; // Track if we were intentionally disconnected


// Chat & Emote State - MOVED to useChat.js


export function usePeer() {
    const { gameMessages, lastReaction, handleChatData, updateHistoryName, resetChat } = useChat();
    const { generateOptions, createGhostRequest, resolveGhostRequest } = useGhostAI();

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

    const initHost = async (name, provider, apiKey, lobbySettings = {}) => {
        // CRITICAL: Clear any stale state from previous sessions
        resetGame();

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

        const iceServers = await getIceServers();

        const peerConfig = {
            config: { iceServers }
        };
        peer = new Peer(`ghost-writer-${code}`, peerConfig);

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
                handleDisconnect(conn.peer);
            });
            // Don't send SYNC yet - wait for JOIN with password if needed
        });
    };

    const GAME_ID_PREFIX = 'ghost-writer-';

    // --- CLIENT LOGIC ---
    const joinGame = async (code, name, password = '') => {
        isHost.value = false;
        myName.value = name;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ghost_writer_name', name);
        }
        gameState.roomCode = code;
        connectionError.value = ''; // Clear any previous errors
        isPending.value = false; // Reset pending state

        // Cleanup existing peer if any to efficiently handle re-attempts
        if (peer) {
            peer.destroy();
            peer = null;
        }

        const iceServers = await getIceServers();

        const peerConfig = {
            config: { iceServers }
        };

        peer = new Peer(undefined, peerConfig);

        peer.on('open', (id) => {
            myId.value = id;
            const hostId = `${GAME_ID_PREFIX}${code}`;

            hostConn = peer.connect(hostId);

            hostConn.on('open', () => {
                const playerUuid = getPersistentId();
                hostConn.send({ type: 'JOIN', payload: { name, password, playerUuid } });
            });

            hostConn.on('data', (data) => handleClientData(data));

            hostConn.on('close', () => {
                // Only show "Host disconnected" if it wasn't an intentional kick/reject
                // AND if we didn't receive a specific reason (like LOBBY_CLOSED)
                if (!wasKicked && !remoteDisconnectReason.value) {
                    alert("Host disconnected");
                    window.location.reload();
                }
            });
        });
    };

    // --- DATA HANDLERS ---

    const handleDisconnect = (peerId) => {
        const player = gameState.players.find(p => p.id === peerId);
        if (!player) return;

        console.log(`[HOST] Player disconnected: ${player.name} (${peerId})`);

        // 1. Mark as Disconnected (Zombie Mode)
        player.connectionStatus = 'disconnected';
        broadcastState();

        // 2. Start Death Timer (60s)
        // If they have a persistent UUID, use it to track timer. Otherwise just peerId (less reliable but fallback)
        const key = player.playerUuid || peerId;

        if (reconnectTimers.has(key)) clearTimeout(reconnectTimers.get(key));

        const timerId = setTimeout(() => {
            console.log(`[HOST] Player timed out: ${player.name}`);
            removePlayer(player.id, 'TIMEOUT');
            reconnectTimers.delete(key);
        }, 60000); // 60s Grace Period

        reconnectTimers.set(key, timerId);
    };

    const migratePlayerId = (oldId, newId) => {
        // 1. Update Submissions
        gameState.submissions.forEach(sub => {
            if (sub.authorId === oldId) sub.authorId = newId;
            // Update votes inside submission
            if (sub.votes[oldId]) {
                sub.votes[newId] = sub.votes[oldId];
                delete sub.votes[oldId];
            }
        });

        // 2. Update Pending Votes (if any)
        // (gameState.votes is legacy? Voting happens inside submissions)

        // 3. Update Finished Lists
        const finishedIndex = gameState.finishedVotingIDs.indexOf(oldId);
        if (finishedIndex !== -1) {
            gameState.finishedVotingIDs[finishedIndex] = newId;
        }

        // 4. Update Chat History?
        // Chat is local but we might want to broadcast a 'MIGRATE_USER' event?
        // checks useChat.js... it uses senderId for display. 
        // We should tell clients to update their chat history mapping.
        // Implementation: Send a special system message or just let it be?
        // 'UPDATE_NAME' event updates historyName. Maybe we need 'UPDATE_ID'?
        // For now, let's just accept chat might be split.
    };

    const handleHostData = (msg, senderId) => {
        console.log(`[HOST] Received ${msg.type} from ${senderId}`, msg.payload);
        switch (msg.type) {
            case 'JOIN':
                // 1. Check Blacklist
                if (gameState.blacklist.includes(msg.payload.playerUuid)) {
                    const conn = connMap.get(senderId);
                    if (conn) {
                        conn.send({ type: 'REJECTED', payload: { message: 'You are banned from this lobby.' } });
                        setTimeout(() => conn.close(), 100);
                    }
                    connMap.delete(senderId);
                    return;
                }

                // 2. Check for Reconnection (Resurrection)
                const existingPlayer = gameState.players.find(p => p.playerUuid && p.playerUuid === msg.payload.playerUuid);

                if (existingPlayer) {
                    console.log(`[HOST] Resurrecting player ${existingPlayer.name} (${senderId})`);

                    // Cancel Death Timer
                    const timerId = reconnectTimers.get(existingPlayer.playerUuid);
                    if (timerId) {
                        clearTimeout(timerId);
                        reconnectTimers.delete(existingPlayer.playerUuid);
                    }

                    // Update Identity
                    // The old peer ID is dead. We must replace it.
                    // But wait, other players might know them by old ID? 
                    // No, `gameState.players` has the ID. We must update it.
                    const oldId = existingPlayer.id;
                    existingPlayer.id = senderId;
                    existingPlayer.connectionStatus = 'connected';

                    // Update submissions/votes authorship?
                    // Submissions use authorId. We need to migrate them?
                    // YES. If ID changes, we must migrate all references to the ID.
                    migratePlayerId(oldId, senderId);

                    // Standard Welcome
                    const conn = connMap.get(senderId);
                    if (conn) {
                        conn.send({ type: 'SYNC', payload: gameState });
                    }
                    broadcastState();
                    return;
                }

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
                        avatarId: null,
                        playerUuid: msg.payload.playerUuid // Store UUID
                    });
                    // Send pending status (not full SYNC)
                    const conn = connMap.get(senderId);
                    if (conn) {
                        conn.send({ type: 'PENDING', payload: { message: 'Waiting for host approval' } });
                    }
                } else {
                    // Direct entry
                    addPlayer(senderId, msg.payload.name, false, msg.payload.playerUuid);
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
            case 'UPDATE_NAME':
                // Only allow name updates in LOBBY or FINISH phases
                if (gameState.phase === 'LOBBY' || gameState.phase === 'FINISH') {
                    const player = gameState.players.find(p => p.id === senderId);
                    if (player) {
                        // Check name isn't taken
                        const nameTaken = gameState.players.some(p =>
                            p.id !== senderId && p.name === msg.payload.name
                        );
                        if (!nameTaken && msg.payload.name.trim()) {
                            const newName = msg.payload.name.trim();
                            player.name = newName;

                            // Retroactive Update: Update history for this user
                            // Retroactive Update: Update history for this user
                            updateHistoryName(senderId, newName);

                            broadcastState();
                        }
                    }
                }
                break;
            case 'REQUEST_GHOST':
                // Host acts as proxy
                generateOptions(
                    gameState.settings,
                    msg.payload.prompt,
                    gameState.currentTheme,
                    msg.payload.agentId,
                    msg.payload.systemPrompt
                )
                    .then(options => {
                        const conn = connMap.get(senderId);
                        if (conn) conn.send({ type: 'GHOST_OPTIONS', payload: { options } });
                    })
                    .catch(err => {
                        console.error("Ghost Gen Error", err);
                        const conn = connMap.get(senderId);
                        if (conn) conn.send({ type: 'GHOST_ERROR', payload: { message: err.message || "Failed to generate ghost" } });
                    });
                break;
            case 'CHAT_MESSAGE':
                // Host sees it too
                handleChatData(msg);

                // Host relays to ADMITTED clients only
                gameState.players.forEach(p => {
                    const conn = connMap.get(p.id);
                    if (conn) {
                        conn.send({ type: 'CHAT_MESSAGE', payload: msg.payload });
                    }
                });
                break;
            case 'REACTION_EMOTE':
                // 1. Validate against Registry
                const emoteDef = EMOTE_REGISTRY[msg.payload.emoteId];
                if (!emoteDef) return; // Invalid ID
                if (emoteDef.locked) return; // Security check

                // 2. Relay logic remains the same (throttling etc)

                // Host sees it (via Store)
                handleChatData(msg);

                // 3. Relay to ADMITTED clients only
                gameState.players.forEach(p => {
                    const conn = connMap.get(p.id);
                    if (conn) {
                        conn.send({ type: 'REACTION_EMOTE', payload: msg.payload });
                    }
                });
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
            resolveGhostRequest(msg.payload.options);
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
                wasKicked = true; // Mark as intentional disconnect
                alert(msg.payload.message || 'Host denied entry');
                window.location.reload();
            }
        } else if (msg.type === 'CHAT_MESSAGE') {
            handleChatData(msg);
        } else if (msg.type === 'REACTION_EMOTE') {
            handleChatData(msg);
        } else if (msg.type === 'CHAT_DELETE_USER') {
            handleChatData(msg);
        } else if (msg.type === 'LOBBY_CLOSED') {
            remoteDisconnectReason.value = 'The host has closed the lobby.';
            resetGame(); // Clears players, resets phase to LOBBY
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

        // Only send to ADMITTED players (in gameState.players)
        // This prevents Waiting Room candidates from seeing game state
        gameState.players.forEach(p => {
            const conn = connMap.get(p.id);
            if (conn) {
                conn.send({ type: 'SYNC', payload: stateToSend });
            }
        });
    };

    const addPlayer = (id, name, isHostPlayer, playerUuid = null) => {
        if (gameState.players.find(p => p.id === id)) return;
        const avatarId = getUniqueAvatarId();
        gameState.players.push({
            id,
            name,
            score: 0,
            isHost: isHostPlayer,
            avatarId,
            playerUuid,
            connectionStatus: 'connected'
        });
        broadcastState();
    };

    const removePlayer = (id, reason = '') => {
        const p = gameState.players.find(x => x.id === id);
        if (p) console.log(`Removing player ${id}:`, p.name);

        gameState.players = gameState.players.filter(p => p.id !== id);

        // If KICKED, clean up chat history and notify others to do the same
        if (reason === 'KICKED') {
            handleChatData({ type: 'CHAT_DELETE_USER', payload: { userId: id } });

            // Broadcast deletion command to all ADMITTED players
            gameState.players.forEach(p => {
                const conn = connMap.get(p.id);
                if (conn) {
                    conn.send({ type: 'CHAT_DELETE_USER', payload: { userId: id } });
                }
            });

            // Close connection with specific reason if possible
            const conn = connMap.get(id);
            if (conn) {
                conn.send({ type: 'REJECTED', payload: { message: 'You have been kicked by the host.' } });
                setTimeout(() => conn.close(), 100); // Give time to flush
            }
        }

        connMap.delete(id);

        // Also remove from pending if applicable
        gameState.pendingPlayers = gameState.pendingPlayers.filter(p => p.id !== id);

        // If in active game, we might need to perform checks
        if (gameState.phase !== 'LOBBY' && gameState.phase !== 'FINISH') {
            broadcastState();
            // Check if this unblocks the round
            if (gameState.phase === 'VOTING') {
                // Check if all remaining players have voted
                if (gameState.players.every(p => gameState.finishedVotingIDs.includes(p.id))) {
                    startReveal();
                }
            } else if (gameState.phase === 'INPUT') {
                // Check if all remaining players have submitted
                if (gameState.players.every(p => gameState.submissions.some(s => s.authorId === p.id))) {
                    if (currentTimerInterval) clearInterval(currentTimerInterval);
                    startVoting();
                }
            }
        } else {
            broadcastState();
        }
    };

    const kickPlayer = (id) => {
        if (isHost.value) {
            const player = gameState.players.find(p => p.id === id);
            if (player && player.playerUuid) {
                gameState.blacklist.push(player.playerUuid);

                // Clear any reconnect timer if they were a zombie
                if (reconnectTimers.has(player.playerUuid)) {
                    clearTimeout(reconnectTimers.get(player.playerUuid));
                    reconnectTimers.delete(player.playerUuid);
                }
            }
            removePlayer(id, 'KICKED');
        }
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
        if (promptTimeout) {
            console.log('[TIMER DEBUG] startRound: Clearing existing promptTimeout', promptTimeout);
            clearTimeout(promptTimeout);
        }

        promptTimeout = setTimeout(() => {
            console.log('[TIMER DEBUG] promptTimeout FIRED. Current Phase:', gameState.phase, 'Timer ID was:', promptTimeout);

            // Defensive Check: If we are not in PROMPT phase anymore (e.g. LOBBY), DO NOT proceed.
            if (gameState.phase !== 'PROMPT') {
                console.log('[TIMER DEBUG] Phase mismatch (expected PROMPT, got ' + gameState.phase + '), checking logic aborted.');
                return;
            }

            gameState.timer = gameState.settings.roundDuration;
            gameState.phase = 'INPUT';
            broadcastState();
            startTimer();
        }, 5000);
        console.log('[TIMER DEBUG] startRound: Set new promptTimeout', promptTimeout);
    };

    // Singleton State (Moved to line 11)

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
            // Call directly handled by generateOptions
            return generateOptions(
                gameState.settings,
                gameState.prompt,
                gameState.currentTheme,
                agentId,
                customSystemPrompt
            );
        } else {
            // Ask Host
            const promise = createGhostRequest();
            hostConn && hostConn.send({ type: 'REQUEST_GHOST', payload: { agentId, prompt: gameState.prompt, systemPrompt: customSystemPrompt } });
            return promise;
        }
    };

    const sendChatMessage = (text) => {
        if (!text.trim()) return;
        const msg = {
            id: Date.now().toString(),
            senderId: myId.value,
            senderName: myName.value,
            text: text.trim(),
            timestamp: Date.now()
        };

        if (isHost.value) {
            // Host creates message, adds to local, broadcasts
            handleHostData({ type: 'CHAT_MESSAGE', payload: msg }, myId.value);
            // Also add locally because handleHostData just relays -- NO, handleHostData now ingests!
        } else {
            hostConn && hostConn.send({ type: 'CHAT_MESSAGE', payload: msg });
        }
    };

    const sendEmote = (emoteId) => {
        const payload = {
            emoteId,
            senderId: myId.value
        };
        if (isHost.value) {
            // Validate locally? 
            handleHostData({ type: 'REACTION_EMOTE', payload }, myId.value);
            // handleHostData checks registry. If valid, it relays.
            // Does host need to see it? Yes, relay sends to connMap. Host isn't in connMap.
            // We need to locally trigger it if valid.
            const def = EMOTE_REGISTRY[emoteId];
            if (def && !def.locked) {
                lastReaction.value = payload;
            }
        } else {
            hostConn && hostConn.send({ type: 'REACTION_EMOTE', payload });
        }
    };

    const clearTimers = () => {
        if (revealTimer) clearInterval(revealTimer);
        if (currentTimerInterval) clearInterval(currentTimerInterval);
        if (promptTimeout) clearTimeout(promptTimeout);

        // Clear all zombie reconnection timers
        reconnectTimers.forEach((timerId) => clearTimeout(timerId));
        reconnectTimers.clear();
    };

    const resetGame = () => {
        resetChat(); // Reset chat state
        clearTimers();
        // Reset all state to default
        gameState.phase = 'LOBBY';
        gameState.roomCode = '';
        gameState.hostId = '';
        gameState.round = 1;
        gameState.timer = 0;
        gameState.players = [];
        gameState.pendingPlayers = [];
        gameState.blacklist = []; // Clear blacklist so kicked players can rejoin in new games (or tests)
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

        isPending.value = false;
        // gameMessages & lastReaction cleared by resetGame -> resetChat

        // We keep myName.value for convenience
    };

    const getPersistentId = () => {
        const STORAGE_KEY = 'ghost_writer_auth';
        const TTL = 24 * 60 * 60 * 1000; // 24 hours

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                const age = Date.now() - data.timestamp;
                if (age < TTL) {
                    return data.uuid;
                }
            }
        } catch (e) {
            console.warn("Auth storage read error", e);
        }

        // Generate new
        const newUuid = crypto.randomUUID();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                uuid: newUuid,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("Auth storage write error", e);
        }
        return newUuid;
    };

    const forceAdvance = () => {
        if (!isHost.value) return;

        console.log('[HOST] Force Advance triggered from phase:', gameState.phase);

        if (gameState.phase === 'INPUT') {
            // Force end timer and start voting
            if (currentTimerInterval) clearInterval(currentTimerInterval);
            startVoting();
        } else if (gameState.phase === 'VOTING') {
            // Force lock votes (even if some missing)
            lockVotes();
        } else if (gameState.phase === 'REVEAL') {
            // Force next round
            if (gameState.round >= gameState.settings.totalRounds) {
                returnToLobby();
            } else {
                gameState.round++;
                startRound();
            }
        }
    };

    const leaveGame = () => {
        console.log('[TIMER DEBUG] leaveGame called. isHost:', isHost.value);
        return new Promise((resolve) => {
            if (isHost.value) {
                // Notify all players that the lobby is closing
                // Better: loop through map
                connMap.forEach((conn) => {
                    if (conn && conn.open) {
                        conn.send({ type: 'LOBBY_CLOSED' });
                    }
                });

                // CRITICAL: Stop all game logic/timers IMMEDIATELY so no new states 
                // (like INPUT) are broadcast while we are waiting to close.
                clearTimers();

                // Give a tiny delay for messages to flush before destroying peer?
                setTimeout(() => {
                    resetGame();
                    resolve();
                }, 100);
            } else {
                resetGame();
                resolve();
            }
        });
    };

    return {
        isHost,
        myId,
        myName,
        gameState,
        isPending,
        connectionError,
        remoteDisconnectReason,
        initHost,
        joinGame,
        startGame,
        startRound,
        nextRound, // Exposed
        kickPlayer, // Exposed for Host logic
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
        updatePlayerName: (newName) => {
            if (!newName.trim()) return;

            // Persist name
            localStorage.setItem('ghost_writer_name', newName.trim());
            myName.value = newName.trim();

            if (isHost.value) {
                handleHostData({ type: 'UPDATE_NAME', payload: { name: newName } }, myId.value);
            } else {
                hostConn && hostConn.send({ type: 'UPDATE_NAME', payload: { name: newName } });
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
        getGhostOptions,
        sendChatMessage,
        sendEmote,
        forceAdvance,
        gameMessages, // Reactive
        lastReaction // Reactive
    };
}
