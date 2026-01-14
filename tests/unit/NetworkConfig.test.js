
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import Peer from 'peerjs';
import * as iceModule from '../../src/composables/peer/useIceServers';

// Mock PeerJS
vi.mock('peerjs', () => {
    return {
        default: vi.fn().mockImplementation(function () {
            return {
                on: vi.fn(),
                destroy: vi.fn(),
                connect: vi.fn().mockReturnValue({
                    on: vi.fn(),
                    send: vi.fn()
                })
            };
        }),
    };
});

// Mock the ICE module
vi.mock('../../src/composables/peer/useIceServers', () => ({
    getIceServers: vi.fn()
}));

describe('usePeer Integration Check', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initHost uses getIceServers result', async () => {
        const mockServers = [{ urls: 'stun:mock-server.com' }];
        vi.mocked(iceModule.getIceServers).mockResolvedValue(mockServers);

        const { initHost } = usePeer();
        await initHost('HostUser', 'gemini', 'key');

        expect(iceModule.getIceServers).toHaveBeenCalled();
        expect(Peer).toHaveBeenCalledWith(
            expect.stringContaining('ghost-writer-'),
            expect.objectContaining({
                config: { iceServers: mockServers }
            })
        );
    });

    it('joinGame uses getIceServers result', async () => {
        const mockServers = [{ urls: 'turn:mock-turn.com' }];
        vi.mocked(iceModule.getIceServers).mockResolvedValue(mockServers);

        const { joinGame } = usePeer();
        await joinGame('ABCD', 'ClientUser');

        expect(iceModule.getIceServers).toHaveBeenCalled();
        expect(Peer).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({
                config: { iceServers: mockServers }
            })
        );
    });
});
