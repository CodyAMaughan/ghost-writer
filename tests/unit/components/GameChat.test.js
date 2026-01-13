import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import GameChat from '../../../src/components/GameChat.vue';
import { nextTick, ref } from 'vue';

// Mock usePeer
const mockSendChat = vi.fn();
const mockSendEmote = vi.fn();
const mockGameMessages = [];

vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: () => ({
        gameMessages: ref(mockGameMessages),
        sendChatMessage: mockSendChat,
        sendEmote: mockSendEmote,
        myName: { value: 'Me' },
        gameState: { currentTheme: 'viral' }
    })
}));

// Add this config to handle transitions
import { config } from '@vue/test-utils';
config.global.stubs = {
    transition: false
};

describe('GameChat.vue', () => {
    it('renders chat input and send button after opening', async () => {
        const wrapper = mount(GameChat);
        await wrapper.find('button[aria-label="Open Chat"]').trigger('click');
        expect(wrapper.find('input[type="text"]').exists()).toBe(true);
        expect(wrapper.find('button[aria-label="Send Message"]').exists()).toBe(true);
    });

    it('emits chat message on send', async () => {
        const wrapper = mount(GameChat);
        // Open chat first
        await wrapper.find('button[aria-label="Open Chat"]').trigger('click');

        const input = wrapper.find('input[type="text"]');
        await input.setValue('Hello Test');
        await wrapper.find('button[aria-label="Send Message"]').trigger('click');

        expect(mockSendChat).toHaveBeenCalledWith('Hello Test');
    });

    it('switches tabs between Chat and Emotes', async () => {
        const wrapper = mount(GameChat);
        // Open chat first
        await wrapper.find('button[aria-label="Open Chat"]').trigger('click');
        await nextTick();

        // Default is Chat
        // Default is Chat
        // Check for specific empty state div text
        const emptyState = wrapper.findAll('div').find(d => d.text().includes('No messages yet'));
        expect(emptyState).toBeDefined();
        expect(emptyState.exists()).toBe(true);

        // Click Emotes Tab (Make sure drawer is open, but tabs are inside drawer)
        // Chat is already open from previous steps

        const emotesTabBtn = wrapper.findAll('button').find(b => b.text() === 'EMOTES');
        expect(emotesTabBtn).toBeDefined();
        await emotesTabBtn.trigger('click');

        // Should see emotes grid
        expect(wrapper.find('.grid').exists()).toBe(true);

        // Switch back
        const chatTabBtn = wrapper.findAll('button').find(b => b.text() === 'CHAT');
        await chatTabBtn.trigger('click');
        expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    });

    it('sends emote on click', async () => {
        const wrapper = mount(GameChat);
        await wrapper.find('button[aria-label="Open Chat"]').trigger('click');
        await wrapper.findAll('button').find(b => b.text() === 'EMOTES').trigger('click');

        // Find a known standard emote (e.g. Heart)
        // Emote registry keys iterate.
        // Let's click the first button in the grid
        const emoteBtns = wrapper.findAll('.grid button');
        await emoteBtns[0].trigger('click');

        expect(mockSendEmote).toHaveBeenCalled();
    });

    it('does not send locked emotes', async () => {
        const wrapper = mount(GameChat);
        await wrapper.find('button[aria-label="Open Chat"]').trigger('click');
        await wrapper.findAll('button').find(b => b.text() === 'EMOTES').trigger('click');

        // Find locked emote (Human)
        // We can find by text char or by checking class
        // Standard registry has 'human' 👤 as locked
        const lockedBtn = wrapper.findAll('.grid button').find(b => b.text().includes('👤'));
        expect(lockedBtn).toBeDefined();

        await lockedBtn.trigger('click');

        // Should NOT call sendEmote with 'human'
        // Although mockSendEmote was called in previous test, we can check calls
        expect(mockSendEmote).not.toHaveBeenCalledWith('human');
    });
});
