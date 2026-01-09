import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeer } from '../src/composables/usePeer';
import { nextTick } from 'vue';

// Use hoisted mocks to capture internals
const { sharedMocks } = vi.hoisted(() => ({
    sharedMocks: {
        connOnLines: [],
        peerCallbacks: {},
        clientDataHandler: undefined
    }
}));

// Mock PeerJS
vi.mock('peerjs', () => {
    return {
        default: vi.fn(function () {
            return {
                on: (evt, cb) => {
                    sharedMocks.peerCallbacks[evt] = cb;
                    if (evt === 'open') cb('host-id-mock');
                },
                connect: vi.fn(() => ({
                    on: (evt, cb) => {
                        // For client side tests
                        if (evt === 'data') sharedMocks.clientDataHandler = cb;
                    },
                    send: vi.fn(),
                    close: vi.fn(),
                    open: true
                })),
                destroy: vi.fn()
            };
        })
    };
});

// Mock AI & Themes
vi.mock('../src/services/ai', () => ({ fetchAI: vi.fn() }));
vi.mock('../src/config/themes', () => ({ THEMES: {} }));

describe('usePeer Logic', () => {
    beforeEach(() => {
        // Reset mocks & Timers
        sharedMocks.peerCallbacks = {};
        sharedMocks.clientDataHandler = undefined;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('SYNC message should NOT clear isPending if player not in confirmed list', async () => {
        // This test simulates CLIENT side logic
        const client = usePeer();

        client.joinGame('CODE', 'MyName');
        await nextTick();

        const handler = sharedMocks.clientDataHandler;
        expect(handler).toBeDefined();

        client.isPending.value = true;

        handler({
            type: 'SYNC',
            payload: { players: [{ id: 'host', name: 'Host' }] }
        });

        expect(client.isPending.value).toBe(true);
    });

    it('kickPlayer sends KICKED message and closes connection after delay', async () => {
        // This test simulates HOST side logic
        const host = usePeer();

        // 1. Init Host
        host.initHost('HostName', 'provider', 'key');
        await nextTick();

        expect(host.isHost.value).toBe(true);
        expect(sharedMocks.peerCallbacks['connection']).toBeDefined();

        // 2. Simulate Player Connection
        const mockPlayerConn = {
            peer: 'player-1',
            on: vi.fn(),
            send: vi.fn(),
            close: vi.fn(),
            open: true
        };

        // Trigger connection event (calls connMap.set immediately)
        sharedMocks.peerCallbacks['connection'](mockPlayerConn);

        // 3. Receive JOIN data
        const dataHandlerCall = mockPlayerConn.on.mock.calls.find(c => c[0] === 'data');
        expect(dataHandlerCall).toBeDefined();
        const hostDataHandler = dataHandlerCall[1];

        // Simulate Join
        hostDataHandler({
            type: 'JOIN',
            payload: { name: 'Player1', password: '' }
        }, 'player-1');

        // Check player added
        expect(host.gameState.players.find(p => p.id === 'player-1')).toBeDefined();

        // 4. Kick Player
        host.kickPlayer('player-1');

        // 5. Verify KICKED message sent immediately
        expect(mockPlayerConn.send).toHaveBeenCalledWith({
            type: 'KICKED',
            payload: expect.objectContaining({ message: expect.any(String) })
        });

        // Verify Close NOT called immediately (waiting for flush, assuming we implemented the fix)
        expect(mockPlayerConn.close).not.toHaveBeenCalled();

        // Advance time 500ms
        vi.advanceTimersByTime(500);

        // Verify Close called now
        expect(mockPlayerConn.close).toHaveBeenCalled();

        // Verify removed from state
        expect(host.gameState.players.find(p => p.id === 'player-1')).toBeUndefined();
    });
});
