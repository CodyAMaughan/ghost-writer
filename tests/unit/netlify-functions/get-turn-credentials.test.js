import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import getTurnCredentials from '../../../netlify/functions/get-turn-credentials.js';

describe('get-turn-credentials', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        global.fetch = vi.fn();
        global.Response = class Response {
            constructor(body, init) {
                this.body = body;
                this.status = init?.status || 200;
                this.headers = init?.headers;
            }
            json() { return JSON.parse(this.body); }
            text() { return this.body; }
            get ok() { return this.status >= 200 && this.status < 300; }
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    it('returns 500 if API Key is missing', async () => {
        process.env.METERED_API_KEY = '';
        process.env.METERED_SECRET_KEY = '';

        const request = { method: 'GET' };
        const response = await getTurnCredentials(request);

        expect(response.status).toBe(500);
        expect(response.body).toBe('Server Configuration Error');
    });

    it('returns 405 if method is not GET', async () => {
        const request = { method: 'POST' };
        const response = await getTurnCredentials(request);

        expect(response.status).toBe(405);
    });

    it('calls Metered API with correct apiKey parameter', async () => {
        process.env.METERED_API_KEY = 'test-api-key';
        process.env.METERED_DOMAIN = 'test.metered.live';

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => (['stun:google.com'])
        });

        const request = { method: 'GET' };
        const response = await getTurnCredentials(request);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://test.metered.live/api/v1/turn/credentials?apiKey=test-api-key'),
            expect.objectContaining({ method: 'GET' })
        );
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.iceServers).toEqual(['stun:google.com']);
    });

    it('falls back to METERED_SECRET_KEY if METERED_API_KEY is missing', async () => {
        delete process.env.METERED_API_KEY;
        process.env.METERED_SECRET_KEY = 'fallback-secret-key';
        process.env.METERED_DOMAIN = 'test.metered.live';

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ iceServers: [] })
        });

        const request = { method: 'GET' };
        await getTurnCredentials(request);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('apiKey=fallback-secret-key'),
            expect.any(Object)
        );
    });

    it('returns 502 if upstream fails', async () => {
        process.env.METERED_API_KEY = 'key';

        global.fetch.mockResolvedValue({
            ok: false,
            text: async () => 'Upstream Error'
        });

        const request = { method: 'GET' };
        const response = await getTurnCredentials(request);

        expect(response.status).toBe(502);
    });
});
