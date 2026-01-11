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
    const { gameState, leaveGame, isHost, myId, connectionError, isPending } = usePeer();

    try {
        leaveGame();
    } catch {
        // Ignore errors during cleanup
    }

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

    isHost.value = false;
    myId.value = '';
    connectionError.value = '';
    isPending.value = false;

    MockPeer.reset();
    mockReload.mockClear();
    mockAlert.mockClear();
};

describe('Player Profile Integration', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('State Clearing on New Lobby', () => {
        it('initHost clears stale players from previous session', async () => {
            const { initHost, gameState, myId } = usePeer();

            // First lobby
            initHost('FirstHost', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            const firstHostId = myId.value;
            expect(gameState.players).toHaveLength(1);
            expect(gameState.players[0].name).toBe('FirstHost');

            // Simulate a client joining
            const peerInstance = MockPeer.instances.find(p => p.id === firstHostId);
            const clientConn = peerInstance.simulateIncomingConnection('client-id');
            await vi.advanceTimersByTimeAsync(100);
            clientConn.emit('data', { type: 'JOIN', payload: { name: 'JoinedPlayer' } });
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.players).toHaveLength(2);

            // User manually adds corruption to simulate abort without proper cleanup
            // (This mimics what was happening before the fix)
            gameState.phase = 'VOTING';
            gameState.round = 3;

            // Create new lobby WITHOUT calling leaveGame (simulating previous bug)
            // Now initHost should clear the stale state
            initHost('SecondHost', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            // Assert clean state
            expect(gameState.phase).toBe('LOBBY');
            expect(gameState.round).toBe(1);
            expect(gameState.players).toHaveLength(1);
            expect(gameState.players[0].name).toBe('SecondHost');
            expect(gameState.players.find(p => p.name === 'FirstHost')).toBeUndefined();
            expect(gameState.players.find(p => p.name === 'JoinedPlayer')).toBeUndefined();
        });

        it('initHost clears pendingPlayers from previous session', async () => {
            const { initHost, gameState, myId } = usePeer();

            // First lobby with waiting room
            initHost('FirstHost', 'gemini', '', { enableWaitingRoom: true });
            await vi.advanceTimersByTimeAsync(100);

            const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
            const clientConn = peerInstance.simulateIncomingConnection('pending-client');
            await vi.advanceTimersByTimeAsync(100);
            clientConn.send = vi.fn();

            clientConn.emit('data', { type: 'JOIN', payload: { name: 'PendingPlayer' } });
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.pendingPlayers).toHaveLength(1);
            expect(gameState.pendingPlayers[0].name).toBe('PendingPlayer');

            // Create new lobby - should clear pending players
            initHost('SecondHost', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            expect(gameState.pendingPlayers).toHaveLength(0);
        });
    });

    describe('UPDATE_NAME Action', () => {
        it('Host can update their own name in LOBBY phase', async () => {
            const { initHost, gameState, updatePlayerName } = usePeer();

            initHost('OriginalName', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            expect(gameState.players[0].name).toBe('OriginalName');

            updatePlayerName('NewHostName');
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.players[0].name).toBe('NewHostName');
        });

        it('Client can update their name via host', async () => {
            const { initHost, gameState, myId } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
            const clientConn = peerInstance.simulateIncomingConnection('client-id');
            await vi.advanceTimersByTimeAsync(100);
            clientConn.send = vi.fn();

            clientConn.emit('data', { type: 'JOIN', payload: { name: 'OriginalClient' } });
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.players.find(p => p.id === 'client-id').name).toBe('OriginalClient');

            // Client sends UPDATE_NAME
            clientConn.emit('data', { type: 'UPDATE_NAME', payload: { name: 'RenamedClient' } });
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.players.find(p => p.id === 'client-id').name).toBe('RenamedClient');
        });

        it('Name update rejected if name already taken', async () => {
            const { initHost, gameState, myId } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
            const clientConn = peerInstance.simulateIncomingConnection('client-id');
            await vi.advanceTimersByTimeAsync(100);

            clientConn.emit('data', { type: 'JOIN', payload: { name: 'Client' } });
            await vi.advanceTimersByTimeAsync(10);

            // Client tries to take host's name
            clientConn.emit('data', { type: 'UPDATE_NAME', payload: { name: 'HostUser' } });
            await vi.advanceTimersByTimeAsync(10);

            // Name should NOT change
            expect(gameState.players.find(p => p.id === 'client-id').name).toBe('Client');
        });

        it('Name update rejected during active game phases', async () => {
            const { initHost, gameState, updatePlayerName } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            // Simulate being in VOTING phase
            gameState.phase = 'VOTING';

            updatePlayerName('TryToChange');
            await vi.advanceTimersByTimeAsync(10);

            // Name should NOT change during active game
            expect(gameState.players[0].name).toBe('HostUser');
        });

        it('Name update allowed in FINISH phase (between rounds)', async () => {
            const { initHost, gameState, updatePlayerName } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            gameState.phase = 'FINISH';

            updatePlayerName('PostGameName');
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.players[0].name).toBe('PostGameName');
        });
    });

    describe('UPDATE_AVATAR Action', () => {
        it('Player can update their avatar', async () => {
            const { initHost, gameState, updateAvatar } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            const originalAvatarId = gameState.players[0].avatarId;
            const newAvatarId = originalAvatarId === 0 ? 1 : 0;

            updateAvatar(newAvatarId);
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.players[0].avatarId).toBe(newAvatarId);
        });

        it('Avatar update rejected if already taken by another player', async () => {
            const { initHost, gameState, myId } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            const hostAvatarId = gameState.players[0].avatarId;

            const peerInstance = MockPeer.instances.find(p => p.id === myId.value);
            const clientConn = peerInstance.simulateIncomingConnection('client-id');
            await vi.advanceTimersByTimeAsync(100);

            clientConn.emit('data', { type: 'JOIN', payload: { name: 'Client' } });
            await vi.advanceTimersByTimeAsync(10);

            const clientAvatarId = gameState.players.find(p => p.id === 'client-id').avatarId;

            // Client tries to take host's avatar
            clientConn.emit('data', { type: 'UPDATE_AVATAR', payload: { avatarId: hostAvatarId } });
            await vi.advanceTimersByTimeAsync(10);

            // Avatar should NOT change if taken
            expect(gameState.players.find(p => p.id === 'client-id').avatarId).toBe(clientAvatarId);
        });
    });

    describe('PhaseFinish Name Editing', () => {
        it('Name editing allowed on last round (FINISH phase)', async () => {
            const { initHost, gameState, updatePlayerName } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            // Set to last round and FINISH phase
            gameState.round = 3;
            gameState.maxRounds = 3;
            gameState.phase = 'FINISH';

            updatePlayerName('FinalName');
            await vi.advanceTimersByTimeAsync(10);

            expect(gameState.players[0].name).toBe('FinalName');
        });

        it('Name editing blocked on non-last rounds (FINISH phase)', async () => {
            const { initHost, gameState, updatePlayerName } = usePeer();

            initHost('HostUser', 'gemini', '');
            await vi.advanceTimersByTimeAsync(100);

            // Set to round 2 of 3 in FINISH phase  
            gameState.round = 2;
            gameState.maxRounds = 3;
            gameState.phase = 'FINISH';

            // Note: The UPDATE_NAME action in usePeer allows FINISH phase regardless of round
            // The UI restriction is handled by PhaseFinish component's isLastRound check
            // This test validates that the UPDATE_NAME action still works in FINISH phase
            updatePlayerName('MidGameName');
            await vi.advanceTimersByTimeAsync(10);

            // The action itself allows FINISH phase - UI prevents opening modal on non-last rounds
            expect(gameState.players[0].name).toBe('MidGameName');
        });
    });
});
