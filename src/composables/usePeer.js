import { ref, reactive } from 'vue';
import Peer from 'peerjs';
import { fetchAI } from '../services/ai';
import { AGENTS } from '../constants/agents';

// Singleton State
const gameState = reactive({
    phase: 'LOBBY',
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
    settings: {
        provider: 'gemini',
        apiKey: '',
        roundDuration: 45
    }
});

const myId = ref('');
const myName = ref('');
const isHost = ref(false);
const connMap = new Map();
let peer = null;
let hostConn = null;
let pendingGhostResolve = null;

export function usePeer() {

    // --- HOST LOGIC ---
    const initHost = (name, provider, apiKey) => {
        isHost.value = true;
        myName.value = name;
        gameState.settings.provider = provider;
        gameState.settings.apiKey = apiKey;

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
            conn.on('close', () => removePlayer(conn.peer));
            conn.send({ type: 'SYNC', payload: gameState });
        });
    };

    const GAME_ID_PREFIX = 'ghost-writer-';

    // --- CLIENT LOGIC ---
    const joinGame = (code, name) => {
        isHost.value = false;
        myName.value = name;
        gameState.roomCode = code;

        peer = new Peer();

        peer.on('open', (id) => {
            myId.value = id;
            const hostId = `${GAME_ID_PREFIX}${code}`;

            hostConn = peer.connect(hostId);

            hostConn.on('open', () => {
                hostConn.send({ type: 'JOIN', payload: { name } });
            });

            hostConn.on('data', (data) => handleClientData(data));

            hostConn.on('close', () => {
                alert("Host disconnected");
                window.location.reload();
            });
        });
    };

    // --- DATA HANDLERS ---

    const handleHostData = (msg, senderId) => {
        console.log(`[HOST] Received ${msg.type} from ${senderId}`, msg.payload);
        switch (msg.type) {
            case 'JOIN':
                addPlayer(senderId, msg.payload.name, false);
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
                break;
            case 'REQUEST_GHOST':
                // Host acts as proxy
                let systemPrompt = "";

                if (msg.payload.agentId === 'custom') {
                    systemPrompt = msg.payload.systemPrompt || "You are a generic helper.";
                } else {
                    const agentDef = AGENTS.find(a => a.id === msg.payload.agentId);
                    if (agentDef) systemPrompt = agentDef.systemPrompt;
                }

                if (systemPrompt) {
                    // Add constraint here for safety if not trusted source? 
                    // Service layer puts instruction at end anyway.
                    fetchAI(gameState.settings.provider, gameState.settings.apiKey, msg.payload.prompt, systemPrompt)
                        .then(options => {
                            const conn = connMap.get(senderId);
                            if (conn) conn.send({ type: 'GHOST_OPTIONS', payload: { options } });
                        });
                }
                break;
        }
    };

    const handleClientData = (msg) => {
        console.log(`[CLIENT] Received ${msg.type}`, msg.payload);
        if (msg.type === 'SYNC') {
            Object.assign(gameState, msg.payload);
        } else if (msg.type === 'GHOST_OPTIONS') {
            if (pendingGhostResolve) {
                pendingGhostResolve(msg.payload.options);
                pendingGhostResolve = null;
            }
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
        gameState.players.push({ id, name, score: 0, isHost: isHostPlayer });
        broadcastState();
    };

    const removePlayer = (id) => {
        gameState.players = gameState.players.filter(p => p.id !== id);
        connMap.delete(id);
        broadcastState();
    };

    const generateNewPrompt = async () => {
        // Hardcoded prompts for MVP fallback
        const prompts = [
            "What is the worst thing to bring to a funeral?",
            "Explain the internet to a medieval peasant.",
            "What's a bad tagline for a dating app?",
            "Describe the smell of failure.",
            "What is the meaning of life (wrong answers only)?",
            "A rejected flavor of ice cream.",
            "The worst excuse for being late to work."
        ];
        gameState.prompt = prompts[Math.floor(Math.random() * prompts.length)];

        // If Host has AI, try to generate one?
        // For speed, let's stick to local or simple generic.
        // If we want AI prompt:
        // fetchAI(..., "Generate a funny fill-in-the-blank or open-ended game prompt...", "You are a game host.")
        // But let's keep it robust with local list for now.
    };

    const startGame = () => {
        gameState.players.forEach(p => p.score = 0);
        gameState.round = 1;
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
        nextReveal();
    };

    const nextReveal = () => {
        if (gameState.revealedIndex < gameState.submissions.length - 1) {
            gameState.revealedIndex++;
            // Scoring happens here? Or at end?
            // Let's score as we reveal
            broadcastState(); // Client shows animation
        } else {
            endRound();
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
        const votes = gameState.submissions.map(s => s.votes);

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
                sys = customSystemPrompt;
            } else {
                const agentDef = AGENTS.find(a => a.id === agentId);
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
        initHost,
        joinGame,
        startGame,
        startRound,
        nextRound, // Exposed
        nextReveal,
        leaveGame, // Exposed

        // Actions
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
        getGhostOptions
    };
}
