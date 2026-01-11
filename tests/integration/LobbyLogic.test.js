import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';

// --- Mocks ---
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return {
        default: MockPeer
    };
});

// Mock window.location.reload and alert to prevent test crashes
const mockReload = vi.fn();
const mockAlert = vi.fn();

Object.defineProperty(window, 'location', {
    writable: true,
    value: { reload: mockReload }
});
window.alert = mockAlert;

// --- Helper to Reset Singleton State ---
const resetState = () => {
    const { gameState, leaveGame, isHost, myId, connectionError, isPending } = usePeer();

    // Attempt to close existing connections cleanly
    try {
        leaveGame();
    } catch {
        // Ignore errors during cleanup
    }

    // Manually force reset reactive state in case leaveGame didn't cover everything
    gameState.phase = 'LOBBY';
    gameState.currentTheme = 'classic';
    gameState.roomCode = '';
    gameState.hostId = '';
    gameState.round = 1;
    gameState.timer = 0;
    gameState.players = [];
    gameState.pendingPlayers = [];
    gameState.submissions = [];
    gameState.settings = {
        provider: 'gemini',
        apiKey: '',
        roundDuration: 45,
        requirePassword: false,
        password: '',
        enableWaitingRoom: false
    };

    // Reset Refs
    isHost.value = false;
    myId.value = '';
    connectionError.value = '';
    isPending.value = false;

    MockPeer.reset();
    mockReload.mockClear();
    mockAlert.mockClear();
};

describe('Lobby Logic Integration', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Host Initialization: sets up correct game state', async () => {
        const { initHost, gameState, isHost, myId } = usePeer();

        initHost('HostUser', 'openai', 'sk-test', {
            requirePassword: true,
            password: 'securepass',
            enableWaitingRoom: true
        });

        // Wait for Peer 'open' event
        await vi.advanceTimersByTimeAsync(100);

        // Assert Local State
        expect(isHost.value).toBe(true);
        expect(myId.value).toBeDefined();
        // expect(gameState.hostId).toBe(myId.value); // Check hostId sync

        expect(gameState.settings.provider).toBe('openai');
        expect(gameState.settings.requirePassword).toBe(true);
        expect(gameState.settings.password).toBe('securepass');
        expect(gameState.settings.enableWaitingRoom).toBe(true);

        expect(gameState.players).toHaveLength(1);
        expect(gameState.players[0].name).toBe('HostUser');
        expect(gameState.players[0].isHost).toBe(true);

        // Assert Peer Creation
        expect(MockPeer.instances.length).toBeGreaterThan(0);
        const peerInstance = MockPeer.instances[MockPeer.instances.length - 1];
        expect(peerInstance.id).toContain('ghost-writer-');
    });

    it('Password Auth: Client joins successfully with correct password', async () => {
        const hostPeer = usePeer();
        hostPeer.initHost('HostUser', 'gemini', '', { requirePassword: true, password: 'coolpassword' });
        await vi.advanceTimersByTimeAsync(100); // Wait for host init

        const hostId = hostPeer.myId.value;

        const peerInstance = MockPeer.instances.find(p => p.id === hostId);
        expect(peerInstance).toBeDefined();

        const clientConn = peerInstance.simulateIncomingConnection('client-id', { label: 'client' });
        await vi.advanceTimersByTimeAsync(100); // Wait for conn open

        clientConn.emit('data', {
            type: 'JOIN',
            payload: { name: 'Joiner', password: 'coolpassword' }
        });

        // Wait for data processing (immediate sync in mock but good to tick)
        await vi.advanceTimersByTimeAsync(10);

        expect(hostPeer.gameState.players).toHaveLength(2);
        expect(hostPeer.gameState.players.find(p => p.name === 'Joiner')).toBeDefined();
    });

    it('Password Auth: Client rejected with incorrect password', async () => {
        const { initHost, gameState, myId } = usePeer();
        initHost('HostUser', 'gemini', '', { requirePassword: true, password: 'coolpassword' });
        await vi.advanceTimersByTimeAsync(100);

        const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
        expect(peerInstance).toBeDefined();

        const clientConn = peerInstance.simulateIncomingConnection();
        await vi.advanceTimersByTimeAsync(100);

        clientConn.send = vi.fn();

        clientConn.emit('data', {
            type: 'JOIN',
            payload: { name: 'Hacker', password: 'wrong' }
        });
        await vi.advanceTimersByTimeAsync(10);

        expect(gameState.players).toHaveLength(1);
        expect(clientConn.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'AUTH_ERROR',
            payload: expect.objectContaining({ message: 'Incorrect password' })
        }));
        expect(clientConn.open).toBe(false);
    });

    it('Waiting Room: Pending players require approval', async () => {
        const { initHost, gameState, approvePendingPlayer, myId } = usePeer();
        initHost('HostUser', 'gemini', '', { enableWaitingRoom: true });
        await vi.advanceTimersByTimeAsync(100);

        const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
        const clientConn = peerInstance.simulateIncomingConnection('client-id');
        // clientConn.peer = 'client-id'; // Set ID - No longer needed manually
        await vi.advanceTimersByTimeAsync(100);
        clientConn.send = vi.fn();

        clientConn.emit('data', {
            type: 'JOIN',
            payload: { name: 'Waiter' }
        });
        await vi.advanceTimersByTimeAsync(10);

        expect(gameState.players).toHaveLength(1);
        expect(gameState.pendingPlayers).toHaveLength(1);
        expect(gameState.pendingPlayers[0].name).toBe('Waiter');
        expect(clientConn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'PENDING' }));

        approvePendingPlayer('client-id');
        await vi.advanceTimersByTimeAsync(10);

        expect(gameState.pendingPlayers).toHaveLength(0);
        expect(gameState.players).toHaveLength(2);
        expect(clientConn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'SYNC' }));
    });

    it('Kick Player: Removes from state and notifies', async () => {
        const { initHost, gameState, kickPlayer, myId } = usePeer();
        initHost('HostUser', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
        const clientConn = peerInstance.simulateIncomingConnection('kicked-id');
        // clientConn.peer = 'kicked-id';
        await vi.advanceTimersByTimeAsync(100);
        clientConn.send = vi.fn();

        clientConn.emit('data', { type: 'JOIN', payload: { name: 'Victim' } });
        await vi.advanceTimersByTimeAsync(10);
        expect(gameState.players).toHaveLength(2);

        kickPlayer('kicked-id');
        await vi.advanceTimersByTimeAsync(10); // Wait for close timeout

        expect(gameState.players).toHaveLength(1);
        expect(clientConn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'KICKED' }));
    });

    it('Abort Game (Return to Lobby): Resets state but keeps players', async () => {
        const { initHost, gameState, returnToLobby, myId } = usePeer();
        initHost('HostUser', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
        const clientConn = peerInstance.simulateIncomingConnection('p2');
        // clientConn.peer = 'p2';
        await vi.advanceTimersByTimeAsync(100);

        clientConn.emit('data', { type: 'JOIN', payload: { name: 'P2' } });
        await vi.advanceTimersByTimeAsync(10);

        gameState.phase = 'VOTING';
        gameState.round = 3;
        gameState.submissions = [{ text: 'foo' }];
        gameState.players[1].score = 50;

        returnToLobby();

        expect(gameState.phase).toBe('LOBBY');
        expect(gameState.round).toBe(1);
        expect(gameState.submissions).toHaveLength(0);
        expect(gameState.players).toHaveLength(2);
        expect(gameState.players[1].score).toBe(0);
    });

    it('Client Logic: Join Game sets local state', async () => {
        resetState();
        const { joinGame, gameState, myName } = usePeer();

        const hostId = 'ghost-writer-TESTCODE';

        joinGame('TESTCODE', 'ClientUser', 'pass');
        // Wait for Peer Open
        await vi.advanceTimersByTimeAsync(100);

        expect(gameState.roomCode).toBe('TESTCODE');
        expect(myName.value).toBe('ClientUser');

        const clientPeer = MockPeer.instances[MockPeer.instances.length - 1];
        expect(clientPeer).toBeDefined();

        // MockPeer.connect() happens in 'open' handler
        const connections = clientPeer.connections;
        expect(connections).toHaveLength(1);
        expect(connections[0].peer).toBe(hostId);
    });

});
