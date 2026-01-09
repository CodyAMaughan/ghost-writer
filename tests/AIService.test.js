import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAI } from '../src/services/ai';

global.fetch = vi.fn();

describe('AI Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should call Anthropic API with correct parameters', async () => {
        const mockResponse = {
            content: [{ text: JSON.stringify(["Answer 1", "Answer 2", "Answer 3"]) }]
        };

        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const result = await fetchAI('anthropic', 'test-key', 'Test Prompt', 'System Prompt');

        expect(fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                'x-api-key': 'test-key',
                'anthropic-version': '2023-06-01'
            }),
            body: expect.stringContaining('"model":"claude-3-5-haiku-20241022"')
        }));

        expect(result).toEqual(["Answer 1", "Answer 2", "Answer 3"]);
    });

    it('should call OpenAI API correctly', async () => {
        const mockResponse = {
            choices: [{ message: { content: JSON.stringify(["A", "B", "C"]) } }]
        };
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        await fetchAI('openai', 'sk-test', 'Prompt', 'Sys');
        expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.anything());
    });

    it('should call Gemini API correctly', async () => {
        const mockResponse = {
            candidates: [{ content: { parts: [{ text: JSON.stringify(["G1", "G2"]) }] } }]
        };
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        await fetchAI('gemini', 'gem-key', 'Prompt', 'Sys');
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('generativelanguage.googleapis.com'), expect.anything());
    });

    it('should call Netlify Proxy for official-server', async () => {
        const mockResponse = { result: JSON.stringify(["S1", "S2"]) };
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const result = await fetchAI('official-server', 'SECRET-CODE', 'Prompt', 'Sys');

        expect(fetch).toHaveBeenCalledWith('/.netlify/functions/proxy-ai', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"systemPrompt":"Sys"')
        }));
        expect(result).toEqual(["S1", "S2"]);
    });

    it('should parse response with unescaped nested quotes using fallback', async () => {
        // Malformed JSON: "This "question" is a psyop"
        const malformedJson = `["This "question" is a psyop", "Another "quoted" part", "Normal part"]`;

        const mockResponse = {
            candidates: [{ content: { parts: [{ text: malformedJson }] } }]
        };
        fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const result = await fetchAI('gemini', 'key', 'prompt', 'sys');
        expect(result).toEqual([
            'This "question" is a psyop',
            'Another "quoted" part',
            'Normal part'
        ]);
    });
});
