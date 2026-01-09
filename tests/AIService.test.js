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
});
