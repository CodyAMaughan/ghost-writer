
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PhaseVoting from '../../../src/components/phases/PhaseVoting.vue';
import { usePeer } from '../../../src/composables/usePeer';

const mockState = {
    gameState: {
        currentTheme: 'viral',
        prompt: 'Test Prompt',
        submissions: [],
        players: [],
        finishedVotingIDs: []
    },
    myId: { value: 'player1' },
    submitVote: vi.fn(),
    lockVotes: vi.fn()
};

vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: vi.fn(() => mockState)
}));

vi.mock('../../../src/config/themes', () => ({
    THEMES: {
        viral: {
            colors: { card: 'bg-card', border: 'border-card', button: 'bg-btn' },
            copy: { voteHuman: 'HUMAN', voteBot: 'BOT', submitVotesBtn: 'SUBMIT', waitingForPlayers: 'WAITING' }
        }
    }
}));

describe('PhaseVoting.vue', () => {
    let mockPeerState;

    beforeEach(() => {
        mockPeerState = {
            gameState: {
                currentTheme: 'viral',
                prompt: 'Test Prompt',
                submissions: [
                    { authorId: 'p1', text: 'Normal text' },
                    { authorId: 'p2', text: 'Supercalifragilisticexpialidocious' }
                ],
                players: [],
                finishedVotingIDs: []
            },
            myId: { value: 'player3' }, // I am player 3, voting on p1 and p2
            submitVote: vi.fn(),
            lockVotes: vi.fn()
        };
        usePeer.mockReturnValue(mockPeerState);
    });

    it('Ensures submission text wraps correctly for long words (break-all)', () => {
        const wrapper = mount(PhaseVoting);
        const submissionTexts = wrapper.findAll('.font-serif');

        // Check all submission texts for the break-all class
        submissionTexts.forEach(el => {
            expect(el.classes()).toContain('break-all');
        });
    });
});
