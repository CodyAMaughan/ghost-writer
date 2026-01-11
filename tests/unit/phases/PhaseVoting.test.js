import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PhaseVoting from '../../../src/components/phases/PhaseVoting.vue';
import { usePeer } from '../../../src/composables/usePeer';

// Mock usePeer
vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: vi.fn()
}));

// Mock THEMES
vi.mock('../../../src/config/themes', () => ({
    THEMES: {
        viral: {
            colors: { card: 'bg-card', border: 'border-card', button: 'bg-btn' },
            font: 'font-sans',
            copy: {
                voteHuman: 'Vote Human',
                voteBot: 'Vote Bot',
                submitVotesBtn: 'Submit Deductions',
                waitingForPlayers: 'Waiting...'
            }
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
                    { authorId: 'player1', text: 'Sub 1' },
                    { authorId: 'player2', text: 'Sub 2' }
                ],
                players: ['player1', 'player2'],
                finishedVotingIDs: []
            },
            myId: { value: 'player1' },
            submitVote: vi.fn(),
            lockVotes: vi.fn()
        };
        usePeer.mockReturnValue(mockPeerState);
    });

    it('Submit button is disabled and shows prompt text when not all votes are cast', async () => {
        const wrapper = mount(PhaseVoting, {
            global: {
                stubs: {
                    Nameplate: true,
                    User: true,
                    Zap: true,
                    Lock: true,
                    CheckCircle: true
                }
            }
        });

        // Find submit button
        const submitBtn = wrapper.find('[data-testid="submit-votes-btn"]');
        expect(submitBtn.exists()).toBe(true);

        // Should be disabled initially (player2 needs a vote)
        expect(submitBtn.element.disabled).toBe(true);
        expect(submitBtn.classes()).toContain('cursor-not-allowed');
        expect(submitBtn.classes()).toContain('bg-slate-700/50');

        // Text should indicate need to vote
        expect(submitBtn.text()).toContain('MAKE SELECTIONS');
    });

    it('Submit button is enabled and shows correct text when all votes are cast', async () => {
        const wrapper = mount(PhaseVoting, {
            global: {
                stubs: {
                    Nameplate: true,
                    User: true,
                    Zap: true,
                    Lock: true,
                    CheckCircle: true
                }
            }
        });

        // Vote for player2 (player1 is "me", so no vote needed usually, or handled by logic)
        // In the component logic, we vote on everyone else. 
        // Submissions: player1 (me), player2 (other).
        // I need to vote for player2.

        const voteBtn = wrapper.find('[data-testid="vote-human-btn-player2"]');
        await voteBtn.trigger('click');

        const submitBtn = wrapper.find('[data-testid="submit-votes-btn"]');

        // Should be enabled now
        expect(submitBtn.element.disabled).toBe(false);
        expect(submitBtn.classes()).not.toContain('opacity-50');

        // Text should be standard submit text
        expect(submitBtn.text()).toContain('Submit Deductions');
    });

    it('Clicking submit locked sends votes', async () => {
        const wrapper = mount(PhaseVoting, {
            global: {
                stubs: {
                    Nameplate: true,
                    User: true,
                    Zap: true,
                    Lock: true,
                    CheckCircle: true
                }
            }
        });

        // Vote for player2
        await wrapper.find('[data-testid="vote-human-btn-player2"]').trigger('click');

        // Click submit
        await wrapper.find('[data-testid="submit-votes-btn"]').trigger('click');

        expect(mockPeerState.lockVotes).toHaveBeenCalled();
        expect(mockPeerState.submitVote).toHaveBeenCalledWith('player2', 'HUMAN');
    });
});
