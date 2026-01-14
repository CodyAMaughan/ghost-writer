import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { nextTick } from 'vue';
import { MockPeer } from '../mocks/peerjs';

// Mock PeerJS using the shared factory
vi.mock('peerjs', async () => {
    const actual = await vi.importActual('../mocks/peerjs');
    return {
        default: actual.MockPeer
    };
});

// Mock AI & Themes
vi.mock('../../src/services/ai', () => ({ fetchAI: vi.fn() }));
vi.mock('../../src/config/themes', () => ({ THEMES: {} }));

describe('usePeer Logic', () => {
    beforeEach(() => {
        MockPeer.reset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('SYNC message should NOT clear isPending if player not in confirmed list', async () => {
        const client = usePeer();
        await client.joinGame('CODE', 'MyName');

        // Wait for Peer 'open' (mock delay)
        vi.advanceTimersByTime(50);
        await nextTick();

        const clientPeer = MockPeer.instances[0];
        expect(clientPeer).toBeDefined();

        const clientConn = clientPeer.connections[0];
        expect(clientConn).toBeDefined();

        client.isPending.value = true;

        // Trigger 'data' event on the connection
        clientConn.emit('data', {
            type: 'SYNC',
            payload: { players: [{ id: 'host', name: 'Host' }] }
        });

        expect(client.isPending.value).toBe(true);
    });

    it('kickPlayer sends KICKED message and closes connection after delay', async () => {
        const host = usePeer();
        await host.initHost('HostName', 'provider', 'key');

        // Wait for Peer 'open'
        vi.advanceTimersByTime(50);
        await nextTick();

        expect(host.isHost.value).toBe(true);

        const hostPeer = MockPeer.instances[0];
        expect(hostPeer).toBeDefined();

        const mockPlayerConn = {
            peer: 'player-1',
            on: vi.fn(),
            send: vi.fn(),
            close: vi.fn(),
            open: true,
            metadata: {}
        };

        hostPeer.emit('connection', mockPlayerConn);

        const dataHandlerCall = mockPlayerConn.on.mock.calls.find(c => c[0] === 'data');
        expect(dataHandlerCall).toBeDefined();
        const hostDataHandler = dataHandlerCall[1];

        hostDataHandler({
            type: 'JOIN',
            payload: { name: 'Player1', password: '' }
        }, 'player-1');

        expect(host.gameState.players.find(p => p.id === 'player-1')).toBeDefined();

        host.kickPlayer('player-1');

        expect(mockPlayerConn.send).toHaveBeenCalledWith({
            type: 'REJECTED',
            payload: expect.objectContaining({ message: expect.stringContaining('kicked') })
        });

        expect(mockPlayerConn.close).not.toHaveBeenCalled();

        vi.advanceTimersByTime(500);

        expect(mockPlayerConn.close).toHaveBeenCalled();
        expect(host.gameState.players.find(p => p.id === 'player-1')).toBeUndefined();
    });
});
