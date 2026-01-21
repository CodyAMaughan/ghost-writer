import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';

// Mock PeerJS
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return { default: MockPeer };
});

vi.mock('../../src/composables/peer/useIceServers', () => ({
    getIceServers: vi.fn().mockResolvedValue([{ urls: 'stun:stun.l.google.com:19302' }])
}));

describe('Reconnection & Zombie Protocol', () => {
    beforeEach(async () => {
        MockPeer.reset();

        // Reset singleton state. useRealTimers() is active from afterEach or default.
        // We must await this using real timers to avoid deadlock (since leaveGame uses setTimeout).
        if (usePeer().isHost.value) await usePeer().leaveGame();

        vi.useFakeTimers();

        // Manually reset critical tokens for the test
        const { gameState } = usePeer();
        gameState.players = [];
        gameState.blacklist = [];
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Scenario: Valid Zombie Creation (Grace Period)', async () => {
        const { initHost, gameState } = usePeer();
        await initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        // 1. Get Host Peer
        const hostPeer = MockPeer.instances.find(p => p.id === usePeer().myId.value);
        expect(hostPeer).toBeDefined();

        // 2. Connect Player A
        const playerUuid = 'uuid-player-a';
        const connA = hostPeer.simulateIncomingConnection('peer-a');
        await vi.advanceTimersByTimeAsync(100);
        connA.emit('data', { type: 'JOIN', payload: { name: 'Player A', playerUuid } });
        await vi.advanceTimersByTimeAsync(50);

        expect(gameState.players).toHaveLength(2); // Host + Player A
        const playerA = gameState.players.find(p => p.name === 'Player A');
        expect(playerA).toBeDefined();
        expect(playerA.connectionStatus).toBe('connected'); // Expectation 1

        // 3. Disconnect Player A (Simulate socket close)
        connA.close();

        // 4. Verify Zombie State
        // Should NOT be removed immediately
        expect(gameState.players).toHaveLength(2);
        const zombie = gameState.players.find(p => p.name === 'Player A');
        expect(zombie.connectionStatus).toBe('disconnected'); // Expectation 2

        // 5. Advance Time (Grace Period)
        await vi.advanceTimersByTimeAsync(30000); // 30s
        expect(gameState.players).toHaveLength(2); // Still there
    });

    it('Scenario: Zombie Death (Timeout)', async () => {
        const { initHost, gameState } = usePeer();
        await initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        const hostPeer = MockPeer.instances.find(p => p.id === usePeer().myId.value);
        const playerUuid = 'uuid-player-b';
        const connB = hostPeer.simulateIncomingConnection('peer-b');
        await vi.advanceTimersByTimeAsync(100);
        connB.emit('data', { type: 'JOIN', payload: { name: 'Player B', playerUuid } });
        await vi.advanceTimersByTimeAsync(50);

        // Disconnect
        connB.close();
        const playerB = gameState.players.find(p => p.name === 'Player B');
        expect(playerB.connectionStatus).toBe('disconnected');

        // Advance past 60s
        await vi.advanceTimersByTimeAsync(61000);

        // Verify Removal
        // UPDATED LOGIC: We no longer auto-remove. We expect them to persist as Disconnected.
        expect(gameState.players).toHaveLength(2);
        const zombie = gameState.players.find(p => p.name === 'Player B');
        expect(zombie.connectionStatus).toBe('disconnected');
    });

    it('Scenario: The Resurrection (Reconnection)', async () => {
        const { initHost, gameState } = usePeer();
        await initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === usePeer().myId.value);

        // 1. Initial Connection
        const uuid = 'shared-uuid';
        const connOld = hostPeer.simulateIncomingConnection('peer-old');
        await vi.advanceTimersByTimeAsync(100);
        connOld.emit('data', { type: 'JOIN', payload: { name: 'Phoenix', playerUuid: uuid } });
        await vi.advanceTimersByTimeAsync(50);

        // Give them some score to prove it's the same player
        // Give them some score to prove it's the same player
        const player = gameState.players.find(p => p.name === 'Phoenix');
        player.score = 100;

        // 2. Disconnect
        connOld.close();
        const phoenixAfterDisconnect = gameState.players.find(p => p.name === 'Phoenix');
        expect(phoenixAfterDisconnect.connectionStatus).toBe('disconnected');

        // 3. Reconnect with NEW PeerID but SAME UUID
        const connNew = hostPeer.simulateIncomingConnection('peer-new');
        await vi.advanceTimersByTimeAsync(100);
        // User sends JOIN again with same UUID
        connNew.emit('data', { type: 'JOIN', payload: { name: 'Phoenix', playerUuid: uuid } });
        await vi.advanceTimersByTimeAsync(50);

        // 4. Verification
        expect(gameState.players).toHaveLength(2); // Host + Phoenix
        const phoenix = gameState.players.find(p => p.name === 'Phoenix');
        expect(phoenix.connectionStatus).toBe('connected');
        expect(phoenix.score).toBe(100); // Persistence check
        expect(phoenix.id).toBe('peer-new'); // ID updated to new socket
    });

    it('Scenario: Blacklist (Banned Player)', async () => {
        const { initHost, kickPlayer, gameState } = usePeer();
        await initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === usePeer().myId.value);

        // Connect
        const uuid = 'bad-actor-uuid';
        const conn = hostPeer.simulateIncomingConnection('peer-bad');
        await vi.advanceTimersByTimeAsync(100);
        conn.emit('data', { type: 'JOIN', payload: { name: 'Troll', playerUuid: uuid } });
        await vi.advanceTimersByTimeAsync(50);

        // Kick
        kickPlayer('peer-bad');
        expect(gameState.players).toHaveLength(1); // Host remains
        expect(gameState.blacklist).toContain(uuid);

        // Try Rejoin
        const conn2 = hostPeer.simulateIncomingConnection('peer-bad-2');

        // Spy on kick message
        const sendSpy = vi.spyOn(conn2, 'send');

        await vi.advanceTimersByTimeAsync(100);
        conn2.emit('data', { type: 'JOIN', payload: { name: 'Troll', playerUuid: uuid } });
        await vi.advanceTimersByTimeAsync(50);

        expect(gameState.players).toHaveLength(1); // Still blocked
        expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'REJECTED' // Or whatever error type we decide
        }));
    });
});
