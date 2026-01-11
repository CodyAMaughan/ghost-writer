import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';

// --- Mocks ---
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return { default: MockPeer };
});

vi.mock('../../src/services/ai', () => ({
    fetchAI: vi.fn(),
}));

vi.mock('../../src/config/themes', () => ({
    THEMES: {
        classic: {
            id: 'classic',
            prompts: ['Prompt A', 'Prompt B', 'Prompt C']
        },
        viral: {
            id: 'viral',
            prompts: ['Viral A', 'Viral B']
        }
    }
}));

// Mock window.alert and location
window.alert = vi.fn();
Object.defineProperty(window, 'location', {
    writable: true,
    value: { reload: vi.fn() }
});

// --- Helper to Reset State ---
const resetState = () => {
    const { gameState, leaveGame, isHost, myId } = usePeer();
    try { leaveGame(); } catch { }

    gameState.phase = 'LOBBY';
    gameState.players = [];
    gameState.submissions = [];
    gameState.votes = {};
    gameState.round = 1;
    gameState.timer = 0;
    gameState.usedPrompts = [];

    isHost.value = false;
    myId.value = '';
    MockPeer.reset();
};

describe('Game Flow Integration', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Timer Logic: startTimer counts down and triggers startVoting', async () => {
        const { initHost, gameState, startRound } = usePeer();
        initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        // startRound triggers 5s delay then startTimer
        startRound();

        // Advance past the 5s prompt reading phase
        await vi.advanceTimersByTimeAsync(5000);

        expect(gameState.phase).toBe('INPUT');
        // Default timer is 45s (settings default)
        expect(gameState.timer).toBe(45);

        // Tick 1s
        await vi.advanceTimersByTimeAsync(1000);
        expect(gameState.timer).toBe(44);

        // Fast forward to end
        // Timer starts at 45. We ticked 1s. Now 44.
        // We need to tick 44 more times to reach 0.
        // And THEN 1 more second to trigger 'else' block (startVoting).
        await vi.advanceTimersByTimeAsync(45000); // 45s total buffer
        expect(gameState.timer).toBe(0);

        // Timer should trigger startVoting -> Phase change
        // startVoting logic: checks submissions, auto-fills, shuffles, change phase
        expect(gameState.phase).toBe('VOTING');
    });

    it('Submission & Auto-Fill: Empty players get AI submissions', async () => {
        const { initHost, gameState, submitAnswer } = usePeer();
        initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        // Add 2nd player
        const peerInstance = MockPeer.instances.find(p => p.id === usePeer().myId.value);
        const p2Conn = peerInstance.simulateIncomingConnection('p2');
        await vi.advanceTimersByTimeAsync(100);
        p2Conn.emit('data', { type: 'JOIN', payload: { name: 'Player2' } });
        await vi.advanceTimersByTimeAsync(10);

        // Host submits answer
        submitAnswer('Host Answer', 'HUMAN', 'none');
        await vi.advanceTimersByTimeAsync(10); // Process msg

        expect(gameState.submissions).toHaveLength(1);

        // Force Timer End to trigger Auto-Fill
        // We can't call startTimer directly.
        // We can manually set timer to 1 and wait? No, interval needs to be running.
        // We must call startRound to start the interval.

        const { startRound } = usePeer();
        // Set short duration for test
        gameState.settings.roundDuration = 2;
        startRound();

        // Wait 5s (Prompt) + 2s (Input) + 1.1s (Buffer to trigger next tick)
        // Total 8100ms
        await vi.advanceTimersByTimeAsync(8100);

        expect(gameState.phase).toBe('VOTING');
        expect(gameState.submissions).toHaveLength(2);

        const p2Sub = gameState.submissions.find(s => s.authorId === 'p2');
        expect(p2Sub).toBeDefined();
        expect(p2Sub.source).toBe('AI'); // Auto-filled
        expect(p2Sub.text).toBeDefined();
    });

    it('Scoring Logic: Correct points calculation', async () => {
        // Setup scenarios manually in gameState to test calculateScores() indirectly via endRound
        // Note: calculateScores is internal. We trigger it by ending the round (Reveal finished).
        // Or we can invoke `nextReveal` until it calls `endRound`.

        const { initHost, gameState, nextReveal } = usePeer();
        initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        // Setup 3 Players
        // P1: Host (ID: host-id)
        // P2: Player2 (ID: p2)
        // P3: Player3 (ID: p3)
        const hostId = usePeer().myId.value;
        gameState.players = [
            { id: hostId, name: 'Host', isHost: true, score: 0, avatarId: 0 },
            { id: 'p2', name: 'Player2', isHost: false, score: 0, avatarId: 1 },
            { id: 'p3', name: 'Player3', isHost: false, score: 0, avatarId: 2 }
        ];

        // Setup Submissions & Votes
        gameState.submissions = [
            {
                authorId: hostId,
                text: 'Host Logic',
                source: 'HUMAN',
                votes: {
                    'p2': 'HUMAN', // Correct (+1 for p2)
                    'p3': 'BOT'    // Incorrect (Host FAKED p3 -> +2 for Host)
                }
                // Host State:
                // Majority: TIE (1 Human, 1 Bot) -> Tied logic? 
                // usePeer.js: `majority = humanVotes >= botVotes ? 'HUMAN' : 'BOT'`
                // 1 >= 1 => HUMAN.
                // Host is HUMAN. Result HUMAN.
                // P3 voted BOT (wrong). P2 voted HUMAN (right).
                // Host (HUMAN) detected as HUMAN. "SAFE" => +1 point for Host.
            },
            {
                authorId: 'p2',
                text: 'P2 Ghost',
                source: 'AI', // Ghost Write
                votes: {
                    [hostId]: 'HUMAN', // Incorrect (P2 FOOLED Host -> +3 for P2)
                    'p3': 'BOT'        // Correct (+1 for p3)
                }
                // P2 State:
                // Majority: 1 H, 1 B => HUMAN.
                // Source is AI. Result HUMAN.
                // P2 FOOLED the majority! (+3 for P2).
            },
            {
                authorId: 'p3',
                text: 'P3 Logic',
                source: 'HUMAN', // Human
                votes: {
                    [hostId]: 'HUMAN', // Correct (+1 for Host)
                    'p2': 'HUMAN'      // Correct (+1 for p2)
                }
                // P3 State:
                // Majority: HUMAN.
                // SAFE (+1 for P3).
            }
        ];

        // Trigger Scoring via Reveal Flow
        gameState.phase = 'REVEAL';
        gameState.revealedIndex = 2; // Last one

        // This call should trigger endRound() because revealedIndex == length-1 (actually logic checks current index)
        // logic: if (revealedIndex < length - 1) ... else endRound()

        // So calling nextReveal() when index is 2 (last) should trigger endRound?
        // Wait, if index IS 2 (max index), and we call nextReveal, it enters `else { endRound() }`? 
        // Let's verify logic: `if (index < length - 1)`
        // 2 < 2 is false. Correct.

        // However, we need to be careful about timer intervals in nextReveal.
        // We will manually trigger `nextReveal` once to finish.

        nextReveal();

        expect(gameState.phase).toBe('FINISH');

        // Verify Scores

        // Host:
        // - Submission 1 (Safe): +1
        // - Voted P2 (Ghost) as HUMAN (Wrong): 0
        // - Voted P3 (Human) as HUMAN (Right): +1
        // Total: 2

        // Player 2:
        // - Submission 2 (Fooled): +3
        // - Voted Host (Human) as HUMAN (Right): +1
        // - Voted P3 (Human) as HUMAN (Right): +1
        // Total: 5

        // Player 3:
        // - Submission 3 (Safe): +1
        // - Voted Host (Human) as BOT (Wrong): 0
        // - Voted P2 (Ghost) as BOT (Right): +1
        // Total: 2

        const p1 = gameState.players.find(p => p.id === hostId);
        const p2 = gameState.players.find(p => p.id === 'p2');
        const p3 = gameState.players.find(p => p.id === 'p3');

        expect(p1.score).toBe(2);
        expect(p2.score).toBe(5);
        expect(p3.score).toBe(2);
    });

    it('Round Accumulation: nextRound resets state but keeps scores', async () => {
        const { initHost, gameState, nextRound } = usePeer();
        initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        gameState.round = 1;
        gameState.players[0].score = 10;
        gameState.submissions = [1, 2, 3];

        nextRound();
        await vi.advanceTimersByTimeAsync(10); // nextRound calls startRound (sync) but setTimeout inside?

        // startRound sets phase PROMPT, clears submissions
        expect(gameState.round).toBe(2);
        expect(gameState.players[0].score).toBe(10);
        expect(gameState.submissions).toHaveLength(0);
        expect(gameState.phase).toBe('PROMPT');
    });

    it('Prompt Logic: Deduplication and Rotation', async () => {
        const { initHost, gameState } = usePeer();
        initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        // We rely on 'nextRound' calling 'startRound' calling 'generateNewPrompt'
        // We'll mock specific Prompts via THEMES mock if we could, but usePeer imports THEMES directly.
        // Since we can't easily mock imports *after* they are bound in usePeer (it's a static import),
        // we rely on the fact that `usePeer.js` modifies `gameState.usedPrompts`.

        // We will manually trigger `startRound` (via nextRound) multiple times and verify `usedPrompts` grows.
        const { nextRound } = usePeer();

        // Debug State
        console.log('DEBUG: Before nextRound', gameState.phase);
        nextRound();
        console.log('DEBUG: After nextRound', gameState.phase, gameState.prompt, gameState.usedPrompts);

        const p1 = gameState.prompt;
        expect(gameState.usedPrompts).toContain(p1);

        nextRound(); // Round 2
        const p2 = gameState.prompt;
        expect(p2).not.toBe(p1);
        expect(gameState.usedPrompts).toContain(p2);
        expect(gameState.usedPrompts).toHaveLength(2);
    });
});
