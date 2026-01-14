import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import Peer from 'peerjs';

// Mock PeerJS
vi.mock('peerjs', () => {
    return {
        default: vi.fn().mockImplementation(function () {
            return {
                on: vi.fn(),
                destroy: vi.fn(),
            };
        }),
    };
});

describe('Network Configuration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset env vars
        vi.stubGlobal('import.meta', { env: { VITE_ICE_SERVERS: undefined } });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses default Google STUN server when no env var is provided', () => {
        const { initHost } = usePeer();
        initHost('TestHost', 'gemini', 'key');

        expect(Peer).toHaveBeenCalled();
        const configArg = Peer.mock.calls[0][1]; // 2nd argument is config

        expect(configArg).toBeDefined();
        expect(configArg.config.iceServers).toEqual([
            { urls: 'stun:stun.l.google.com:19302' }
        ]);
    });

    it('merges VITE_ICE_SERVERS with default STUN when provided', () => {
        const customServers = [
            { urls: 'turn:my-turn-server.com', username: 'user', credential: 'pass' }
        ];

        // Mock the environment variable
        vi.stubEnv('VITE_ICE_SERVERS', JSON.stringify(customServers));

        const { initHost } = usePeer();
        initHost('TestHost', 'gemini', 'key');

        const configArg = Peer.mock.calls[0][1];

        expect(configArg.config.iceServers).toHaveLength(2);
        expect(configArg.config.iceServers[0]).toEqual({ urls: 'stun:stun.l.google.com:19302' });
        expect(configArg.config.iceServers[1]).toEqual(customServers[0]);
    });
});
