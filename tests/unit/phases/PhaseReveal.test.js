import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PhaseReveal from '../../../src/components/phases/PhaseReveal.vue';
import { usePeer } from '../../../src/composables/usePeer';

// Mock usePeer
vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: vi.fn()
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
                revealStep: 0
            },
            isHost: { value: false },
            myId: { value: 'player1' },
            nextRevealStep: vi.fn()
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
});
