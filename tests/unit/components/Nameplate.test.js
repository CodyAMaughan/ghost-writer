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

    it('renders vertical variant', () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'host-id',
                layout: 'vertical'
            }
        });

        expect(wrapper.find('[data-testid="nameplate-container"]').classes()).toContain('flex-col');
        expect(wrapper.find('[data-testid="nameplate-avatar"]').classes()).toContain('w-8'); // Default size is sm (w-8) unless changed
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
    it('opens avatar picker when clicking own avatar if interactable', async () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player1',
                isInteractable: true
            },
            global: {
                stubs: {
                    AvatarPickerModal: true
                }
            }
        });

        await wrapper.find('[data-testid="nameplate-avatar"]').trigger('click');
        // Check if the component would show the picker (state change)
        // Since we stubbed it, we check if the stub exists or if we can access the component state/props
        // But Nameplate manages the state internally. We can check if the stub is rendered if v-if allows it.
        // Actually, the v-if="showAvatarPicker" means it won't be in DOM initially.
        // After click, it should appear.

        expect(wrapper.findComponent({ name: 'AvatarPickerModal' }).exists()).toBe(true);
    });

    it('does not open avatar picker if not interactable', async () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player1',
                isInteractable: false
            },
            global: {
                stubs: {
                    AvatarPickerModal: true
                }
            }
        });

        await wrapper.find('[data-testid="nameplate-avatar"]').trigger('click');
        expect(wrapper.findComponent({ name: 'AvatarPickerModal' }).exists()).toBe(false);
    });

    it('does not open avatar picker if not own nameplate', async () => {
        const wrapper = mount(Nameplate, {
            props: {
                playerId: 'player2',
                isInteractable: true
            },
            global: {
                stubs: {
                    AvatarPickerModal: true
                }
            }
        });

        await wrapper.find('[data-testid="nameplate-avatar"]').trigger('click');
        expect(wrapper.findComponent({ name: 'AvatarPickerModal' }).exists()).toBe(false);
    });
});
