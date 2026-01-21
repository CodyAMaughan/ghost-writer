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

describe('Network Stability & Heartbeats', () => {
    beforeEach(async () => {
        MockPeer.reset();
        if (usePeer().isHost.value) await usePeer().leaveGame?.() || usePeer().resetGame?.();

        vi.useFakeTimers();

        const { gameState, myId } = usePeer();
        myId.value = '';
        gameState.players = [];
        gameState.blacklist = [];
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Scenario: Heartbeat Timeout Detection', async () => {
        const { initHost, gameState } = usePeer();
        await initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        const hostPeer = MockPeer.instances.find(p => p.id === usePeer().myId.value);

        // Connect Player
        const conn = hostPeer.simulateIncomingConnection('peer-alive');
        await vi.advanceTimersByTimeAsync(100);
        conn.emit('data', { type: 'JOIN', payload: { name: 'AliveGuy', playerUuid: 'uuid-alive' } });
        await vi.advanceTimersByTimeAsync(100);

        const player = gameState.players.find(p => p.id === 'peer-alive');
        expect(player).toBeDefined();
        expect(player.connectionStatus).toBe('connected');

        // Verify Heartbeat Logic
        // 1. Advance time < 6s. Should still be connected.
        // Assuming client sends heartbeat every 2s, and we check every 1s.
        // We will simulate NO heartbeat from client.

        await vi.advanceTimersByTimeAsync(4000);
        expect(player.connectionStatus).toBe('connected');

        // 2. Advance time > 6s (Threshold).
        await vi.advanceTimersByTimeAsync(3000);
        // Total 7s without heartbeat
        expect(player.connectionStatus).toBe('disconnected');
    });

    it('Scenario: Heartbeat Recovery', async () => {
        const { initHost, gameState } = usePeer();
        await initHost('Host', 'gemini', '');

        const hostPeer = MockPeer.instances[0];
        const conn = hostPeer.simulateIncomingConnection('peer-recover');
        await vi.advanceTimersByTimeAsync(100);
        conn.emit('data', { type: 'JOIN', payload: { name: 'RecoverGuy', playerUuid: 'uuid-recover' } });
        await vi.advanceTimersByTimeAsync(100);

        const player = gameState.players.find(p => p.id === 'peer-recover');

        // Force timeout
        await vi.advanceTimersByTimeAsync(7000);
        expect(player.connectionStatus).toBe('disconnected');

        // Receive Heartbeat
        conn.emit('data', { type: 'HEARTBEAT', payload: {} });
        await vi.advanceTimersByTimeAsync(1100);

        // Should recover
        expect(player.connectionStatus).toBe('connected');
    });

    it('Scenario: Manual Removal (Not Kick)', async () => {
        const { initHost, gameState, removePlayer } = usePeer();
        await initHost('Host', 'gemini', '');

        const hostPeer = MockPeer.instances[0];
        const conn = hostPeer.simulateIncomingConnection('peer-remove');
        await vi.advanceTimersByTimeAsync(100);
        conn.emit('data', { type: 'JOIN', payload: { name: 'RemoveMe', playerUuid: 'uuid-remove' } });
        await vi.advanceTimersByTimeAsync(100);

        // Disconnect first (simulate zombie)
        const player = gameState.players.find(p => p.id === 'peer-remove');
        player.connectionStatus = 'disconnected';

        // Call Remove
        removePlayer('peer-remove'); // No reason provided implies generic removal

        // Verify gone
        expect(gameState.players.find(p => p.id === 'peer-remove')).toBeUndefined();

        // Verify NOT blacklisted
        expect(gameState.blacklist).not.toContain('uuid-remove');
    });

    it('Scenario: Notification Added on Disconnect', async () => {
        const { initHost, gameState, notifications } = usePeer();
        await initHost('Host', 'gemini', '');

        const hostPeer = MockPeer.instances[0];
        const conn = hostPeer.simulateIncomingConnection('peer-notify');
        await vi.advanceTimersByTimeAsync(100);
        conn.emit('data', { type: 'JOIN', payload: { name: 'NotifyGuy', playerUuid: 'uuid-notify' } });
        await vi.advanceTimersByTimeAsync(100);

        // Clear initial notifications if any
        if (notifications) notifications.length = 0;

        // Trigger timeout
        await vi.advanceTimersByTimeAsync(7000);

        // Check notification
        // We expect usePeer to have a 'notifications' array exposed now
        expect(notifications).toBeDefined();
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].message).toContain('NotifyGuy disconnected');
    });
});
