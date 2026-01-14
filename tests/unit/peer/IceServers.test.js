
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// We will import the function we haven't written yet
import { getIceServers } from '../../../src/composables/peer/useIceServers';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('useIceServers', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Reset env vars
        vi.unstubAllEnvs();
    });

    it('returns default STUN server when fetch fails', async () => {
        // Mock fetch failure
        fetchMock.mockRejectedValue(new Error('Network error'));

        const servers = await getIceServers();

        expect(servers).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
        expect(fetchMock).toHaveBeenCalledWith('/.netlify/functions/get-turn-credentials', expect.any(Object));
    });

    it('returns default STUN + fetched TURN servers on success', async () => {
        const mockTurnServers = [
            { urls: 'turn:example.com', username: 'foo', credential: 'bar' }
        ];

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ iceServers: mockTurnServers })
        });

        const servers = await getIceServers();

        expect(servers).toHaveLength(2);
        expect(servers[0]).toEqual({ urls: 'stun:stun.l.google.com:19302' });
        expect(servers[1]).toEqual(mockTurnServers[0]);
    });

    it('includes VITE_ICE_SERVERS if present', async () => {
        const customServers = [{ urls: 'stun:custom.com' }];
        vi.stubEnv('VITE_ICE_SERVERS', JSON.stringify(customServers));

        // Mock fetch fail so we just test the env var addition
        fetchMock.mockRejectedValue(new Error('Fail'));

        const servers = await getIceServers();

        expect(servers).toContainEqual(customServers[0]);
    });
});
