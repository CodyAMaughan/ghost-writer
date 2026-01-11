import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Nameplate from '../../../src/components/Nameplate.vue';
import { usePeer } from '../../../src/composables/usePeer';

vi.mock('../../../src/composables/usePeer');

describe('Nameplate.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock default usePeer state
        usePeer.mockReturnValue({
            gameState: {
                players: [
                    { id: 'player1', name: 'Alice', avatarId: 0 },
                    { id: 'player2', name: 'Bob', avatarId: 1 }
                ]
            },
            myId: { value: 'player1' }
        });
    });

    it('renders player name and avatar by default', () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player1'
            }
        });

        expect(wrapper.text()).toContain('Alice');
        expect(wrapper.find('[data-testid="nameplate-avatar"]').exists()).toBe(true);
    });

    it('renders minimal variant without avatar', () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player1',
                variant: 'minimal'
            }
        });

        expect(wrapper.text()).toContain('Alice');
        expect(wrapper.find('[data-testid="nameplate-avatar"]').exists()).toBe(false);
    });

    it('emits click event when isInteractable and clicking own nameplate', async () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player1',
                isInteractable: true
            }
        });

        await wrapper.find('[data-testid="nameplate-container"]').trigger('click');
        expect(wrapper.emitted('click')).toBeTruthy();
    });

    it('does not emit click when clicking other player nameplate', async () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player2',
                isInteractable: true
            }
        });

        await wrapper.find('[data-testid="nameplate-container"]').trigger('click');
        expect(wrapper.emitted('click')).toBeFalsy();
    });

    it('applies correct theme styles based on avatar', () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player1'
            }
        });

        const nameElement = wrapper.find('[data-testid="nameplate-name"]');
        expect(nameElement.attributes('class')).toContain('text-');
    });

    it('handles missing player gracefully', () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'nonexistent'
            }
        });

        expect(wrapper.text()).toContain('Unknown');
    });
});
