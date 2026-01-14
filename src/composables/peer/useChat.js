
import { ref } from 'vue';

// Singleton State
const gameMessages = ref([]);
const lastReaction = ref(null);

export function useChat() {

    const handleChatData = (msg) => {
        if (msg.type === 'CHAT_MESSAGE') {
            gameMessages.value.push(msg.payload);
            // Limit history
            if (gameMessages.value.length > 50) gameMessages.value.shift();
        }
        else if (msg.type === 'REACTION_EMOTE') {
            lastReaction.value = msg.payload;
        }
        else if (msg.type === 'CHAT_DELETE_USER') {
            const userId = msg.payload.userId;
            gameMessages.value = gameMessages.value.filter(m => m.senderId !== userId);
        }
    };

    const updateHistoryName = (userId, newName) => {
        gameMessages.value.forEach(m => {
            if (m.senderId === userId) {
                m.senderName = newName;
            }
        });
    };

    const resetChat = () => {
        gameMessages.value = [];
        lastReaction.value = null;
    };

    return {
        gameMessages,
        lastReaction,
        handleChatData,
        updateHistoryName,
        resetChat
    };
}
