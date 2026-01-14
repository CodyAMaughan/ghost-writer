
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGhostAI } from '../../../src/composables/peer/useGhostAI';
import { fetchAI } from '../../../src/services/ai';

// Mock the AI service
vi.mock('../../../src/services/ai', () => ({
    fetchAI: vi.fn()
}));

// Mock Themes
vi.mock('../../../src/config/themes', () => ({
    THEMES: {
        classic: {
            agents: [{ id: 'expert', systemPrompt: 'Be wise.' }]
        }
    }
}));

describe('useGhostAI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generateOptions calls fetchAI with correct prompts', async () => {
        const { generateOptions } = useGhostAI();
        vi.mocked(fetchAI).mockResolvedValue(['Opt1', 'Opt2']);

        const settings = { provider: 'gemini', apiKey: 'key' };
        const result = await generateOptions(settings, 'My Prompt', 'classic', 'expert', null);

        expect(fetchAI).toHaveBeenCalledWith('gemini', 'key', 'My Prompt', 'Be wise.');
        expect(result).toEqual(['Opt1', 'Opt2']);
    });

    it('generateOptions uses custom prompt if provided', async () => {
        const { generateOptions } = useGhostAI();
        vi.mocked(fetchAI).mockResolvedValue([]);

        const settings = { provider: 'ollama' };
        await generateOptions(settings, 'Prompt', 'classic', 'custom', 'Be funny');

        expect(fetchAI).toHaveBeenCalledWith('ollama', undefined, 'Prompt', expect.stringContaining('Be funny'));
    });

    it('manages pending request resolution', async () => {
        const { createGhostRequest, resolveGhostRequest } = useGhostAI();

        // Simulate client waiting
        const promise = createGhostRequest();

        // Simulate receiving response
        resolveGhostRequest(['Res']);

        const result = await promise;
        expect(result).toEqual(['Res']);
    });
});
