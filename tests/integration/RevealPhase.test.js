import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PhaseReveal from '../../src/components/phases/PhaseReveal.vue';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';

// --- Integration Setup (Mock PeerJS, NOT usePeer) ---
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return { default: MockPeer };
});

// Mock useAudio to avoid errors
vi.mock('../../src/composables/useAudio', () => ({
    useAudio: () => ({
        playSfx: vi.fn()
    })
}));

const resetState = () => {
    const { gameState, leaveGame, isHost, myId, connectionError, isPending } = usePeer();

    try { leaveGame(); } catch { }

    // Force reset state
    gameState.phase = 'REVEAL';
    gameState.revealedIndex = 0;
    gameState.submissions = [];
    gameState.players = [];
    gameState.prompt = 'Test Prompt';
    gameState.currentTheme = 'viral';
    gameState.revealStep = 0;

    isHost.value = false;
    myId.value = '';
    connectionError.value = '';
    isPending.value = false;

    MockPeer.reset();
    vi.clearAllMocks();
};

describe('PhaseReveal Integration', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Displays the real player name using Nameplate', async () => {
        const { gameState, myId } = usePeer();

        // Setup State
        myId.value = 'observer-1';
        gameState.players = [
            { id: 'human-1', name: 'RealPlayerName', avatarId: 1 },
            { id: 'observer-1', name: 'Observer', avatarId: 2 }
        ];
        gameState.submissions = [
            {
                authorId: 'human-1',
                text: 'Human submission',
                votes: {},
                source: 'HUMAN'
            }
        ];

        // Mount Component
        const wrapper = mount(PhaseReveal);

        // Find Nameplate
        const nameplate = wrapper.find('[data-testid="nameplate-name"]');

        expect(nameplate.exists()).toBe(true);
        expect(nameplate.text()).toBe('RealPlayerName');
        expect(nameplate.text()).not.toBe('human-1');
        expect(nameplate.text()).not.toContain('Ghost');
    });
});
