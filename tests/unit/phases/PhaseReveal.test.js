import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PhaseReveal from '../../../src/components/phases/PhaseReveal.vue';
import { usePeer } from '../../../src/composables/usePeer';

// Mock usePeer
const mockState = {
    gameState: {
        currentTheme: 'viral',
        prompt: 'Test Prompt',
        submissions: [],
        revealedIndex: 0,
        revealStep: 0,
        players: []
    },
    isHost: { value: false },
    myId: { value: 'player1' },
    nextRevealStep: vi.fn(),
    gameMessages: { value: [] },
    lastReaction: { value: null }
};

vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: vi.fn(() => mockState)
}));

// Mock useAudio
vi.mock('../../../src/composables/useAudio', () => ({
    useAudio: vi.fn(() => ({ playSfx: vi.fn() }))
}));

// Mock THEMES
vi.mock('../../../src/config/themes', () => ({
    THEMES: {
        viral: {
            colors: { card: 'bg-card', border: 'border-card', button: 'bg-btn' },
            reveal: { strategyHeader: 'STRATEGY', resultHeader: 'RESULT' }
        }
    }
}));

describe('PhaseReveal.vue', () => {
    let mockPeerState;

    beforeEach(() => {
        mockPeerState = {
            gameState: {
                currentTheme: 'viral',
                prompt: 'Test Prompt',
                submissions: [],
                revealedIndex: 0,
                revealStep: 0,
                players: [],
                usedPrompts: []
            },
            isHost: { value: false },
            myId: { value: 'player1' },
            nextRevealStep: vi.fn(),
            gameMessages: { value: [] },
            lastReaction: { value: null }
        };
        usePeer.mockReturnValue(mockPeerState);
    });

    it('Does NOT show "Revealing..." text for non-host players', async () => {
        mockPeerState.isHost.value = false;
        const wrapper = mount(PhaseReveal);

        // Check for the text "Revealing..."
        expect(wrapper.text()).not.toContain('Revealing...');
        expect(wrapper.text()).not.toContain('Waiting for next response...');
    });

    it('Shows "NEXT STEP" button for host', async () => {
        mockPeerState.isHost.value = true;

        // Add a mock submission so the component renders the main container
        mockPeerState.gameState.submissions = [
            { authorId: 'player1', text: 'Test Sub', votes: {} }
        ];

        const wrapper = mount(PhaseReveal);
        expect(wrapper.find('[data-testid="reveal-advance-btn"]').exists()).toBe(true);
    });

    it('Scales text size based on length', async () => {
        // Short text
        mockPeerState.gameState.submissions = [{ authorId: 'p1', text: 'Short text', votes: {} }];
        let wrapper = mount(PhaseReveal);
        let textElement = wrapper.find('[data-testid="reveal-text"]');
        // Currently hardcoded to 'text-2xl md:text-4xl' in the original file, so this "test" might pass or fail depending on if we check exact classes
        // But we want to enforce the NEW classes.
        // Once implemented, we expect:
        // Short (<30): 'text-2xl md:text-4xl'
        expect(textElement.classes()).toContain('text-2xl');

        // Medium text (30-60)
        mockPeerState.gameState.submissions = [{ authorId: 'p1', text: 'A medium length text that is between thirty and sixty chars', votes: {} }];
        wrapper = mount(PhaseReveal);
        textElement = wrapper.find('[data-testid="reveal-text"]');
        expect(textElement.classes()).toContain('text-xl'); // The new class we want

        // Long text (60+)
        mockPeerState.gameState.submissions = [{ authorId: 'p1', text: 'A very long text that goes on and on and determines that we need a smaller font size to fit everything comfortably on the screen.', votes: {} }];
        wrapper = mount(PhaseReveal);
        textElement = wrapper.find('[data-testid="reveal-text"]');
        expect(textElement.classes()).toContain('text-lg'); // The smallest class
    });
});
