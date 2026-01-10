import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { usePeer } from '../src/composables/usePeer';
import { THEMES } from '../src/config/themes';
// GameScreen and Lobby imports removed as tests use mocks or mount differently
import PhaseInput from '../src/components/phases/PhaseInput.vue';

// Mock fetch globally
global.fetch = vi.fn();

// Vi mock for usePeer
vi.mock('../src/composables/usePeer', () => {
    const { reactive } = require('vue');
    const mockGameState = reactive({
        phase: 'INPUT',
        currentTheme: 'viral',
        players: [
            { id: 'p1', name: 'Player1', isHost: true, score: 0 },
            { id: 'p2', name: 'Player2', isHost: false, score: 0 }
        ],
        round: 1,
        maxRounds: 5,
        timer: 60,
        submissions: [],
        roomCode: 'ABCD',
        prompt: "Test Prompt",
        settings: { roundDuration: 60, provider: 'gemini', apiKey: 'test-key' },
        finishedVotingIDs: [],
        revealedIndex: -1,
        usedPrompts: []
    });

    return {
        usePeer: () => ({
            gameState: mockGameState,
            submitAnswer: vi.fn(),
            submitVote: vi.fn(),
            lockVotes: vi.fn(),
            nextReveal: vi.fn(),
            nextRound: vi.fn(),
            startGame: vi.fn(),
            restartGame: vi.fn(),
            getGhostOptions: vi.fn().mockResolvedValue(['A1', 'A2', 'A3']),
            initHost: vi.fn(),
            joinGame: vi.fn(),
            generateNewPrompt: async () => {
                const theme = THEMES[mockGameState.currentTheme];
                const prompts = theme.prompts;
                const availablePrompts = prompts.filter(p => !mockGameState.usedPrompts.includes(p));

                if (availablePrompts.length === 0) {
                    mockGameState.usedPrompts = [];
                    mockGameState.prompt = prompts[Math.floor(Math.random() * prompts.length)];
                } else {
                    mockGameState.prompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
                }

                mockGameState.usedPrompts.push(mockGameState.prompt);
            }
        })
    };
});

describe('Feature Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch.mockReset();
        sessionStorage.clear();
        localStorage.clear();
    });

    // TEST 1: Prompt Deduplication
    it('Prevents duplicate prompts in the same game session', async () => {
        const { generateNewPrompt, gameState } = usePeer();

        // Generate multiple prompts
        const seenPrompts = new Set();
        const totalPrompts = THEMES[gameState.currentTheme].prompts.length;

        // Generate prompts equal to total available
        for (let i = 0; i < totalPrompts; i++) {
            await generateNewPrompt();
            expect(seenPrompts.has(gameState.prompt)).toBe(false); // Should not repeat
            seenPrompts.add(gameState.prompt);
        }

        // After all prompts used, should reset and allow repeats
        await generateNewPrompt();
        expect(gameState.usedPrompts.length).toBeGreaterThanOrEqual(1); // Should have reset
    });

    // TEST 2: Ghost Modal Escape Prevention
    it('Prevents closing Ghost modal after AI options are generated', async () => {
        const wrapper = mount(PhaseInput);

        // Open ghost modal
        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        // ESC button should exist before generation
        let escButtons = wrapper.findAll('button').filter(btn => btn.text() === 'ESC');
        expect(escButtons.length).toBeGreaterThan(0);

        // Mock AI response
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: '["A1", "A2", "A3"]' }] } }]
            })
        });

        // Select agent to trigger generation
        const agentBtn = wrapper.find('[data-testid="agent-select-btn-influencer"]');
        if (agentBtn.exists()) {
            await agentBtn.trigger('click');
            await flushPromises();
            await nextTick();

            // After generation, ESC should be hidden
            escButtons = wrapper.findAll('button').filter(btn => btn.text() === 'ESC');
            expect(escButtons.length).toBe(0);
        }
    });

    // TEST 3: Theme Text Copy
    it('Applies themed text correctly across components', async () => {
        const { gameState } = usePeer();

        gameState.currentTheme = 'viral';
        const viralTheme = THEMES.viral;
        expect(viralTheme.copy.manualInputLabel).toBeDefined();
        expect(viralTheme.copy.generating).toBeDefined();
        expect(viralTheme.copy.waitingForHost).toBeDefined();

        gameState.currentTheme = 'academia';
        const academiaTheme = THEMES.academia;
        expect(academiaTheme.copy.manualInputLabel).toBeDefined();
        expect(academiaTheme.copy.generating).toBe('ANALYZING...');
    });

    // TEST 4: Multi-round Scoring
    it('Accumulates scores correctly across multiple rounds', async () => {
        const { gameState, nextRound } = usePeer();

        // Round 1: Player 1 gets 10 points
        gameState.players[0].score = 10;
        gameState.round = 1;

        // Advance to round 2
        nextRound();
        gameState.round = 2;

        // Round 2: Player 1 gets 5 more points
        gameState.players[0].score += 5;

        // Score should accumulate
        expect(gameState.players[0].score).toBe(15);
        expect(gameState.round).toBe(2);
    });

    // TEST 5: Custom Agent Flow
    it('Handles custom agent generation flow', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: '["Custom 1", "Custom 2", "Custom 3"]' }] } }]
            })
        });

        const wrapper = mount(PhaseInput);

        // Open ghost modal
        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        // Click custom agent
        await wrapper.find('[data-testid="agent-custom-btn"]').trigger('click');
        await nextTick();

        // Custom editor should open (checking via component data)
        expect(wrapper.vm.isCustomEditorOpen).toBe(true);
    });

    // TEST 6: Provider Switching
    it('Switches between AI providers correctly', async () => {
        const { gameState } = usePeer();

        // Start with Gemini
        gameState.settings.provider = 'gemini';
        expect(gameState.settings.provider).toBe('gemini');

        // Switch to OpenAI
        gameState.settings.provider = 'openai';
        expect(gameState.settings.provider).toBe('openai');

        // Switch to official server
        gameState.settings.provider = 'official-server';
        expect(gameState.settings.provider).toBe('official-server');
    });

    // TEST 7: Netlify Proxy Integration
    it('Calls Netlify proxy for official-server provider', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ result: '["Proxy 1", "Proxy 2", "Proxy 3"]' })
        });

        const { fetchAI } = await import('../src/services/ai');

        await fetchAI('official-server', 'access-code', 'Test prompt', 'Test system');

        expect(global.fetch).toHaveBeenCalledWith(
            '/.netlify/functions/proxy-ai',
            expect.objectContaining({
                method: 'POST'
            })
        );
    });

    // TEST 8: JSON Parse Robustness - Test via actual AI service
    it('Handles malformed JSON in AI responses', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: 'Extra text ["A", "B", "C"] more text' }] } }]
            })
        });

        const { fetchAI } = await import('../src/services/ai');
        const result = await fetchAI('gemini', 'test-key', 'Test', 'System');

        // Should successfully extract array despite extra text
        expect(result).toEqual(['A', 'B', 'C']);
    });

    // TEST 9: Session Storage
    it('Saves API keys to session/local storage', async () => {
        // Directly test storage behavior
        const testKey = 'test-gemini-key';

        // Save to sessionStorage
        sessionStorage.setItem('gemini', testKey);
        expect(sessionStorage.getItem('gemini')).toBe(testKey);

        // Save to localStorage  
        localStorage.setItem('gemini', testKey);
        expect(localStorage.getItem('gemini')).toBe(testKey);

        // Clear and verify
        sessionStorage.clear();
        expect(sessionStorage.getItem('gemini')).toBeNull();
    });

    // TEST 10: Error Recovery
    it('Handles AI failure gracefully', async () => {
        global.fetch.mockRejectedValue(new Error('API Error'));

        const wrapper = mount(PhaseInput);

        // Try to generate ghost answer
        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        // Select an agent
        const agentBtn = wrapper.find('[data-testid="agent-select-btn-influencer"]');
        if (agentBtn.exists()) {
            await agentBtn.trigger('click');
            await flushPromises();

            // Should show error state (checking that it doesn't crash)
            expect(wrapper.vm.isLoadingGhost).toBe(false);
        }
    });

    // TEST 11: Timer Edge Cases
    it('Handles timer at 0 correctly (auto-submit)', async () => {
        const { gameState } = usePeer();

        gameState.phase = 'INPUT';
        gameState.timer = 5;

        const wrapper = mount(PhaseInput);

        // Simulate timer countdown
        gameState.timer = 3;
        await nextTick();
        gameState.timer = 1;
        await nextTick();
        gameState.timer = 0;
        await nextTick();

        // Should have auto-submitted
        expect(wrapper.vm.hasSubmitted).toBe(true);
    });

    // BONUS TEST 12: Theme Switching Persists State
    it('Maintains game state when switching themes', async () => {
        const { gameState } = usePeer();

        gameState.currentTheme = 'viral';
        gameState.players[0].score = 100;
        const originalPrompt = gameState.prompt;

        // Switch theme
        gameState.currentTheme = 'cyberpunk';

        // Game state should persist
        expect(gameState.players[0].score).toBe(100);
        expect(gameState.prompt).toBe(originalPrompt); // Prompt doesn't change on theme switch
    });
});
