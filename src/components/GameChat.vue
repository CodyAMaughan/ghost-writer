<script setup>
import { ref, computed, nextTick } from 'vue';
import { usePeer } from '../composables/usePeer';
import { EMOTE_REGISTRY } from '../config/emotes';
import { THEMES } from '../config/themes';
import { MessageCircle, X, Lock } from 'lucide-vue-next';

const { gameMessages, sendChatMessage, sendEmote, gameState } = usePeer();

const isOpen = ref(false);
const currentTab = ref('CHAT');
const inputText = ref('');
const chatContainer = ref(null);

const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const toggleChat = () => {
    isOpen.value = !isOpen.value;
    if (isOpen.value && currentTab.value === 'CHAT') {
        scrollToBottom();
    }
};

const scrollToBottom = () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
    });
};

const sendMessage = () => {
    if (!inputText.value.trim()) return;
    sendChatMessage(inputText.value);
    inputText.value = '';
    scrollToBottom();
};

const handleEmoteClick = (emote) => {
    if (emote.locked) return;
    sendEmote(emote.id);
    // Optional: Visual feedback or close on select? User didn't specify. Keeping open.
};

// Scroll on new messages if already at bottom or robustly
// For MVP, just scroll if open
import { watch } from 'vue';
watch(() => gameMessages.value.length, () => {
    if (isOpen.value && currentTab.value === 'CHAT') {
        scrollToBottom();
    }
});

</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
    <!-- Toggle Button (When Closed) -->
    <button 
      v-if="!isOpen"
      class="p-3 rounded-full shadow-lg transition-transform hover:scale-110"
      :class="[theme.colors.button, 'text-white']"
      aria-label="Open Chat"
      @click="toggleChat"
    >
      <MessageCircle class="w-6 h-6" />
    </button>

    <!-- Chat Window -->
    <div 
      v-else
      class="w-full max-w-sm h-[500px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
      role="dialog"
      aria-label="Game Chat"
    >
      <!-- Header -->
      <div class="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <div class="flex gap-2">
          <button 
            class="px-3 py-1 text-xs font-bold rounded transition-colors"
            :class="currentTab === 'CHAT' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'"
            @click="currentTab = 'CHAT'"
          >
            CHAT
          </button>
          <button 
            class="px-3 py-1 text-xs font-bold rounded transition-colors"
            :class="currentTab === 'EMOTES' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'"
            @click="currentTab = 'EMOTES'"
          >
            EMOTES
          </button>
        </div>
        <button
          class="text-slate-400 hover:text-white transition-colors"
          aria-label="Close Chat"
          @click="toggleChat"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content: Chat -->
      <div 
        v-if="currentTab === 'CHAT'" 
        class="flex-1 flex flex-col min-h-0"
      >
        <div 
          ref="chatContainer"
          class="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
          <div 
            v-for="msg in gameMessages" 
            :key="msg.id"
            class="text-sm break-words"
          >
            <span
              class="font-bold opacity-75"
              :class="theme.colors.accent"
            >{{ msg.senderName }}:</span>
            <span class="text-slate-200 ml-1">{{ msg.text }}</span>
          </div>
          <div
            v-if="gameMessages.length === 0"
            class="text-center text-slate-500 text-xs italic mt-10"
          >
            No messages yet... break the silence!
          </div>
        </div>

        <div class="p-2 border-t border-slate-700 bg-slate-800 flex gap-2">
          <input 
            v-model="inputText"
            type="text"
            placeholder="Type a message..."
            class="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            @keyup.enter="sendMessage"
          >
          <button 
            class="px-3 py-2 rounded text-white font-bold text-sm transition-colors hover:opacity-90 disabled:opacity-50"
            :class="theme.colors.button"
            :disabled="!inputText.trim()"
            aria-label="Send Message"
            @click="sendMessage"
          >
            SEND
          </button>
        </div>
      </div>

      <!-- Content: Emotes -->
      <div 
        v-else
        class="flex-1 overflow-y-auto p-4"
      >
        <div class="grid grid-cols-4 gap-3">
          <button 
            v-for="emote in EMOTE_REGISTRY" 
            :key="emote.id"
            class="aspect-square flex items-center justify-center text-2xl bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors relative group"
            :class="{ 'opacity-50 cursor-not-allowed': emote.locked }"
            :title="emote.locked ? 'Locked' : ''"
            @click="handleEmoteClick(emote)"
          >
            {{ emote.char }}
                       
            <div 
              v-if="emote.locked" 
              class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg"
            >
              <Lock class="w-4 h-4 text-white/70" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: #334155;
  border-radius: 20px;
}
</style>
