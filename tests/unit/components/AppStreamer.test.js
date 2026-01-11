
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../../../src/App.vue';
import { useStreamerMode } from '../../../src/composables/useStreamerMode';
import { usePeer } from '../../../src/composables/usePeer';

// Mock dependencies
vi.mock('../../../src/composables/usePeer', () => {
    return {
        usePeer: () => ({
            gameState: {
                roomCode: 'ABCD',
                phase: 'LOBBY',
                players: [],
                currentTheme: 'viral'
            },
            isHost: { value: true },
            returnToLobby: vi.fn()
        })
    };
});

describe('App - Streamer Mode', () => {
    beforeEach(() => {
        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = false;
    });

    it('displays full room code by default', () => {
        const wrapper = mount(App);
        expect(wrapper.text()).toContain('ABCD');
        expect(wrapper.find('[data-testid="header-room-code"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="header-room-code-masked"]').exists()).toBe(false);
    });

    it('masks room code when streamer mode enabled', async () => {
        const wrapper = mount(App);
        const { isStreamerMode } = useStreamerMode();

        isStreamerMode.value = true;
        await wrapper.vm.$nextTick();

        // Should NOT see exact text in the specific span anymore OR checks for the masked icon
        expect(wrapper.find('[data-testid="header-room-code-masked"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="header-room-code"]').exists()).toBe(false);
    });
});
