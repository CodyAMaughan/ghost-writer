
import { describe, it, expect, beforeEach } from 'vitest';
import { useChat } from '../../../src/composables/peer/useChat';

describe('useChat', () => {
    beforeEach(() => {
        const { resetChat } = useChat();
        resetChat();
    });

    it('initializes with empty messages', () => {
        const chat = useChat();
        expect(chat.gameMessages.value).toEqual([]);
    });

    it('adds a message on receive', () => {
        const chat = useChat();
        const msg = { id: '1', text: 'Hello', senderId: 'u1' };

        chat.handleChatData({ type: 'CHAT_MESSAGE', payload: msg });

        expect(chat.gameMessages.value).toHaveLength(1);
        expect(chat.gameMessages.value[0]).toEqual(msg);
    });

    it('limits message history to 50', () => {
        const chat = useChat();
        for (let i = 0; i < 60; i++) {
            chat.handleChatData({
                type: 'CHAT_MESSAGE',
                payload: { id: i, text: 'msg' + i, senderId: 'u1' }
            });
        }
        expect(chat.gameMessages.value).toHaveLength(50);
        // Should have shifted, so last one is 59
        expect(chat.gameMessages.value[49].id).toBe(59);
    });

    it('removes messages from a specific user', () => {
        const chat = useChat();
        chat.gameMessages.value = [
            { id: '1', senderId: 'bad_guy' },
            { id: '2', senderId: 'good_guy' },
            { id: '3', senderId: 'bad_guy' }
        ];

        chat.handleChatData({
            type: 'CHAT_DELETE_USER',
            payload: { userId: 'bad_guy' }
        });

        expect(chat.gameMessages.value).toHaveLength(1);
        expect(chat.gameMessages.value[0].senderId).toBe('good_guy');
    });
});
