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

    it('fetches TURN credentials from backend function', async () => {
        const mockCredentials = {
            iceServers: [
                { urls: 'turn:backend-example.com', username: 'u', credential: 'p' }
            ]
        };

        // Mock global fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockCredentials
        });

        const { initHost } = usePeer();
        await initHost('TestHost', 'gemini', 'key');

        const configArg = Peer.mock.calls[0][1];

        expect(configArg.config.iceServers).toHaveLength(2);
        // Index 1 should be the TURN server
        expect(configArg.config.iceServers[1]).toEqual(mockCredentials.iceServers[0]);
    });

    it('adds simple TURN config from individual env vars', () => {
        vi.stubEnv('VITE_TURN_URL', 'turn:example.com');
        vi.stubEnv('VITE_TURN_USERNAME', 'user');
        vi.stubEnv('VITE_TURN_PASSWORD', 'pass');

        const { initHost } = usePeer();
        initHost('TestHost', 'gemini', 'key');

        const configArg = Peer.mock.calls[0][1];

        expect(configArg.config.iceServers).toHaveLength(2);
        // Index 1 should be the TURN server
        expect(configArg.config.iceServers[1]).toEqual({
            urls: 'turn:example.com',
            username: 'user',
            credential: 'pass'
        });
    });
});
