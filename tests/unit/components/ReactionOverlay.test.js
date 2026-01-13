import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ReactionOverlay from '../../../src/components/ReactionOverlay.vue';
import { ref, nextTick } from 'vue';

// Mock usePeer
const mockLastReaction = ref(null);

vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: () => ({
        lastReaction: mockLastReaction
    })
}));

// Mock timer for cleanup
vi.useFakeTimers();

// Stub transition group
import { config } from '@vue/test-utils';
config.global.stubs = {
    transition: false,
    'transition-group': false // We need to inspect children
};

describe('ReactionOverlay.vue', () => {
    it('renders empty initially', () => {
        const wrapper = mount(ReactionOverlay);
        expect(wrapper.findAll('.reaction-emote').length).toBe(0);
    });

    it('adds reaction when lastReaction updates', async () => {
        const wrapper = mount(ReactionOverlay);

        // Simulate incoming reaction
        mockLastReaction.value = { emoteId: 'heart', senderId: 'user1', id: 'unique1' };
        await nextTick();

        const emotes = wrapper.findAll('.reaction-emote');
        expect(emotes.length).toBe(1);
        expect(emotes[0].text()).toContain('❤️'); // Heart char
    });

    it('removes reaction after timeout', async () => {
        const wrapper = mount(ReactionOverlay);

        mockLastReaction.value = { emoteId: 'fire', senderId: 'user2', id: 'unique2' };
        await nextTick();

        expect(wrapper.findAll('.reaction-emote').length).toBe(1);

        // Fast forward time (animation duration typically 2-3s)
        await vi.advanceTimersByTimeAsync(3000);
        await nextTick();

        expect(wrapper.findAll('.reaction-emote').length).toBe(0);
    });

    it('handles multiple concurrent reactions', async () => {
        const wrapper = mount(ReactionOverlay);

        mockLastReaction.value = { emoteId: 'cry', senderId: 'user1', id: 'r1' };
        await nextTick();

        mockLastReaction.value = { emoteId: 'laugh', senderId: 'user2', id: 'r2' };
        await nextTick();

        expect(wrapper.findAll('.reaction-emote').length).toBe(2);
    });
});
