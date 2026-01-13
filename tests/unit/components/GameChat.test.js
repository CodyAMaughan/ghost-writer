import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref, reactive } from 'vue';
import GameChat from '../../../src/components/GameChat.vue';

// Mock dependencies
const mockSendChat = vi.fn();
const mockSendEmote = vi.fn();
const mockGameMessages = ref([]);
const mockMyId = ref('me');
const mockGameState = reactive({
    currentTheme: 'viral',
    roomCode: 'ABCD',
    players: [{ id: 'me', name: 'Me' }]
});
const mockIsPending = ref(false);

vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: () => ({
        myId: mockMyId,
        gameMessages: mockGameMessages,
        sendChatMessage: mockSendChat,
        sendEmote: mockSendEmote,
        gameState: mockGameState,
        isPending: mockIsPending
    })
}));

vi.mock('../../../src/config/emotes', () => ({
    EMOTE_REGISTRY: {
        human: { id: 'human', char: '👤', locked: false },
        lock: { id: 'lock', char: '🔒', locked: true }
    }
}));

// Stub Transition to avoid timing issues in test environment
const TransitionStub = {
    template: '<div><slot /></div>',
};

describe('GameChat.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGameMessages.value = [];
        mockGameState.roomCode = 'ABCD';
    });

    it('renders closed state initially', () => {
        const wrapper = mount(GameChat);
        expect(wrapper.find('div[aria-label="Game Chat"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="toggle-chat"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="toggle-emotes"]').exists()).toBe(true);
    });

    it('opens chat and hides toggles', async () => {
        const wrapper = mount(GameChat, {
            global: { stubs: { transition: TransitionStub } }
        });
        await wrapper.find('[data-testid="toggle-chat"]').trigger('click');

        expect(wrapper.find('div[aria-label="Game Chat"]').exists()).toBe(true);
        // Toggles should be hidden
        expect(wrapper.find('[data-testid="toggle-chat"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="toggle-emotes"]').exists()).toBe(false);
    });

    it('opens emotes directly and hides toggles', async () => {
        const wrapper = mount(GameChat, {
            global: { stubs: { transition: TransitionStub } }
        });
        await wrapper.find('[data-testid="toggle-emotes"]').trigger('click');

        expect(wrapper.find('div[aria-label="Game Chat"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('EMOTES');

        expect(wrapper.find('[data-testid="toggle-chat"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="toggle-emotes"]').exists()).toBe(false);
    });

    it('emits chat message on send', async () => {
        const wrapper = mount(GameChat, {
            global: { stubs: { transition: TransitionStub } }
        });
        await wrapper.find('[data-testid="toggle-chat"]').trigger('click');

        const input = wrapper.find('input[type="text"]');
        await input.setValue('Hello Test');
        await wrapper.find('button[aria-label="Send Message"]').trigger('click');

        expect(mockSendChat).toHaveBeenCalledWith('Hello Test');
    });

    it('switches tabs between Chat and Emotes', async () => {
        const wrapper = mount(GameChat, {
            global: { stubs: { transition: TransitionStub } }
        });
        await wrapper.find('[data-testid="toggle-chat"]').trigger('click');
        await nextTick();

        // Should start on CHAT
        expect(wrapper.find('input[type="text"]').exists()).toBe(true);

        // Switch to EMOTES via internal tab
        const buttons = wrapper.findAll('button');
        const emotesTab = buttons.find(b => b.text() === 'EMOTES');
        await emotesTab.trigger('click');

        expect(wrapper.find('input[type="text"]').exists()).toBe(false);
        // Check for an emote button existence
        expect(wrapper.find('button[title="Locked"]').exists()).toBe(true); // lock is locked
    });

    it('sends emote on click', async () => {
        const wrapper = mount(GameChat, {
            global: { stubs: { transition: TransitionStub } }
        });
        await wrapper.find('[data-testid="toggle-emotes"]').trigger('click');

        const buttons = wrapper.findAll('button');
        const humanBtn = buttons.filter(b => b.text().includes('👤')).at(0); // human char

        await humanBtn.trigger('click');
        expect(mockSendEmote).toHaveBeenCalledWith('human');
    });

    it('does not send locked emote', async () => {
        const wrapper = mount(GameChat, {
            global: { stubs: { transition: TransitionStub } }
        });
        await wrapper.find('[data-testid="toggle-emotes"]').trigger('click');

        const buttons = wrapper.findAll('button');
        const lockBtn = buttons.filter(b => b.text().includes('🔒')).at(0); // lock char

        await lockBtn.trigger('click');
        expect(mockSendEmote).not.toHaveBeenCalledWith('lock');
    });

    it('is hidden when roomCode is empty', async () => {
        mockGameState.roomCode = '';
        const wrapper = mount(GameChat);
        await nextTick();
        expect(wrapper.find('[data-testid="toggle-chat"]').exists()).toBe(false);
    });

    it('X button closes chat regardless of tab', async () => {
        const wrapper = mount(GameChat, {
            global: { stubs: { transition: TransitionStub } }
        });
        // Open Emotes
        await wrapper.find('[data-testid="toggle-emotes"]').trigger('click');
        expect(wrapper.find('div[aria-label="Game Chat"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('EMOTES');

        // Click X
        await wrapper.find('button[aria-label="Close Chat"]').trigger('click');

        expect(wrapper.find('div[aria-label="Game Chat"]').exists()).toBe(false);
    });

    it('Chat is hidden if player is not admitted (waiting room)', async () => {
        // Case 1: isPending is true
        mockGameState.roomCode = 'ABCD';
        mockGameState.players = [{ id: 'me' }];
        mockIsPending.value = true;

        let wrapper = mount(GameChat);
        await nextTick();
        expect(wrapper.find('[data-testid="toggle-chat"]').exists()).toBe(false);

        // Case 2: Not in players list
        mockIsPending.value = false;
        mockGameState.players = [{ id: 'other' }]; // 'me' is missing
        wrapper = mount(GameChat);
        await nextTick();
        expect(wrapper.find('[data-testid="toggle-chat"]').exists()).toBe(false);

        // Case 3: Confirmed (Visible)
        mockIsPending.value = false;
        mockGameState.players = [{ id: 'me' }];
        wrapper = mount(GameChat);
        await nextTick();
        expect(wrapper.find('[data-testid="toggle-chat"]').exists()).toBe(true);
    });
});
