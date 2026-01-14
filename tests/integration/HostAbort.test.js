
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';

// --- Mocks ---
vi.mock('../../src/composables/peer/useIceServers', () => ({
    getIceServers: vi.fn().mockResolvedValue([])
}));

vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return {
        default: MockPeer
    };
});

// Mock window.location.reload and alert
const mockReload = vi.fn();
const mockAlert = vi.fn();

Object.defineProperty(window, 'location', {
    writable: true,
    value: { reload: mockReload }
});
window.alert = mockAlert;

// --- Helper to Reset Singleton State ---
const resetState = () => {
    const { gameState, leaveGame, isHost, myId, connectionError, isPending, remoteDisconnectReason } = usePeer();

    try {
        leaveGame();
    } catch { }

    // CRITICAL: leaveGame sets a timeout (if host) to resetGame. 
    // We must clear this timeout so it doesn't fire during the next test phase.
    vi.clearAllTimers();

    gameState.phase = 'LOBBY';
    gameState.players = [];
    gameState.submissions = [];
    gameState.votes = {};
    gameState.round = 1;

    isHost.value = false;
    myId.value = '';
    connectionError.value = '';
    isPending.value = false;
    if (remoteDisconnectReason) remoteDisconnectReason.value = '';

    MockPeer.reset();
    mockReload.mockClear();
    mockAlert.mockClear();
};

describe('Host Abort Logic Integration', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Host Abort: Broadcasts LOBBY_CLOSED and Client resets WITHOUT reload', async () => {
        // 1. Setup Host
        const hostPeer = usePeer();
        hostPeer.initHost('HostUser', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        // 2. Setup Client & Join
        // We simulate this by getting the Host's peer instance and simulating an incoming connection.
        // However, we want to test the CLIENT logic reacting to the Host. 
        // So we need to call `joinGame` in the test context?
        // `usePeer` is a singleton. We can only "be" the Host OR the Client in one process.
        // We cannot easily test Host AND Client logic simultaneously in the same `usePeer` singleton instance.

        // Strategy:
        // We will act as the CLIENT.
        // We will Mock the Host as a remote peer.

        resetState(); // Clear host state from step 1

        const { joinGame, gameState, connectionError, remoteDisconnectReason } = usePeer();

        // Join Game
        joinGame('TESTCODE', 'ClientUser');
        await vi.advanceTimersByTimeAsync(100);

        // Grab values
        expect(gameState.roomCode).toBe('TESTCODE');

        // Get our client peer instance (local)
        const clientPeerInstance = MockPeer.instances.find(p => p.id !== 'ghost-writer-TESTCODE'); // Actually ID depends on how MockPeer assigns it
        // The mock assigns random IDs usually, or we can check `myId` ref.

        // 3. Simulate "Host" sending LOBBY_CLOSED
        // We need to find the connection TO the host.
        // In `joinGame`, we connect to `ghost-writer-{code}`.
        const hostId = 'ghost-writer-TESTCODE';

        // In MockPeer, we need to simulate an incoming data message on the connection that the client opened.
        // Client: `hostConn = peer.connect(hostId)`
        // We need to access this `hostConn` or the underlying mock connection.

        // Inspect client peer
        const myClientPeer = MockPeer.instances[0]; // Assuming reset cleared others
        expect(myClientPeer).toBeDefined();

        const connToHost = myClientPeer.connections.find(c => c.peer === hostId);
        expect(connToHost).toBeDefined();

        // Make sure we are in a "joined" state (simulate receiving SYNC)
        connToHost.emit('data', {
            type: 'SYNC',
            payload: {
                phase: 'LOBBY',
                players: [{ id: 'host', name: 'Host' }, { id: myClientPeer.id, name: 'ClientUser' }]
            }
        });
        await vi.advanceTimersByTimeAsync(10);

        expect(gameState.players).toHaveLength(2);

        // 4. TRIGGER: Host Abort
        // Simulate receiving LOBBY_CLOSED
        connToHost.emit('data', { type: 'LOBBY_CLOSED' });
        await vi.advanceTimersByTimeAsync(10);

        // 5. Verification
        // Expectation:
        // - remoteDisconnectReason is set
        // - gameState is reset (players empty)
        // - Window reload is NOT called

        // CURRENT BEHAVIOR (Should Fail):
        // - LOBBY_CLOSED is not handled.
        // - Or if connection closes, it might trigger reload.

        // If we emit 'close' event on connection:
        connToHost.emit('close');
        await vi.advanceTimersByTimeAsync(10);

        // In current code, 'close' triggers reload.
        // In new code, it should NOT trigger reload if LOBBY_CLOSED was received.

        expect(mockReload).not.toHaveBeenCalled();
        expect(remoteDisconnectReason?.value).toBe('The host has closed the lobby.');
        expect(gameState.players).toHaveLength(0);
        expect(gameState.phase).toBe('LOBBY');
    });

    it('Regression: Zombie Timers do not fire after Host Abort', async () => {
        // Need to simulate HOST behavior here
        resetState();
        const { initHost, startGame, leaveGame, gameState } = usePeer();

        // 1. Host starts game
        // initHost is async
        await initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        startGame();
        await vi.advanceTimersByTimeAsync(10);

        expect(gameState.phase).toBe('PROMPT');

        // 2. Wait 2 seconds (mid-prompt phase)
        await vi.advanceTimersByTimeAsync(2000);

        // 3. Host Aborts
        leaveGame();
        await vi.advanceTimersByTimeAsync(100); // Allow reset to happen

        expect(gameState.phase).toBe('LOBBY');

        // 4. Wait enough time for the original 5s "Reading Prompt" timeout to fire
        await vi.advanceTimersByTimeAsync(4000); // 2s + 4s = 6s > 5s

        // 5. Assert we are STILL in Lobby and didn't jump to INPUT
        expect(gameState.phase).toBe('LOBBY');

        // 6. Also check if the interval fired and triggered Voting? 
        // (If timer was reset to 0, interval might trigger startVoting)
        expect(gameState.phase).not.toBe('VOTING');
    });

    it('Regression: Timers do not fire DURING the leaveGame 100ms grace period', async () => {
        resetState();
        const { initHost, startRound, leaveGame, gameState } = usePeer();

        // 1. Host in PROMPT phase
        await initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        startRound(); // Sets 5s timeout
        await vi.advanceTimersByTimeAsync(10);
        expect(gameState.phase).toBe('PROMPT');

        // 2. Advance time close to the edge (e.g. 4.95s)
        await vi.advanceTimersByTimeAsync(4950);

        // 3. Host Aborts (starts 100ms grace period)
        leaveGame();

        // 4. Advance time by 60ms (Total 5.01s from start - timer SHOULD have fired naturally)
        // But because we called leaveGame, the timer should have been killed immediately.
        await vi.advanceTimersByTimeAsync(60);

        // 5. Assert we did NOT switch to INPUT
        expect(gameState.phase).not.toBe('INPUT');
        // We are at 60ms post-leave. resetGame happens at 100ms.
        // So phase should still be PROMPT (or whatever it was before INPUT switch)

        // 6. Advance past the reset
        await vi.advanceTimersByTimeAsync(50);
        expect(gameState.phase).toBe('LOBBY');
    });
});
