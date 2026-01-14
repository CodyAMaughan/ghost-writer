<script setup>
import { computed } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { Server, LogIn, Wifi, X } from 'lucide-vue-next';
import { THEMES } from '../../config/themes';

const { gameState, remoteDisconnectReason } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const emit = defineEmits(['navigate']);
</script>

<template>
  <div class="space-y-6 w-full animate-fade-in-up max-w-lg mx-auto flex flex-col justify-center flex-grow">
    <!-- Disconnected Banner -->
    <div 
      v-if="remoteDisconnectReason" 
      class="bg-red-900/50 border border-red-500 text-red-100 p-4 rounded flex justify-between items-center shadow-lg"
    >
      <div class="flex items-center gap-3">
        <Wifi class="w-5 h-5 text-red-400" />
        <span>{{ remoteDisconnectReason }}</span>
      </div>
      <button 
        @click="remoteDisconnectReason = ''" 
        class="bg-red-950/50 hover:bg-red-800 p-1 rounded transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- HOST GAME -->
    <div
      class="p-8 border-2 border-slate-700 bg-slate-800/50 rounded-xl backdrop-blur-sm shadow-2xl transition-colors"
      :class="`hover:${theme.colors.border}`"
    >
      <div class="text-center space-y-4">
        <Server
          class="w-16 h-16 mx-auto"
          :class="theme.colors.accent"
        />
        <p class="text-sm text-slate-400 uppercase tracking-widest">
          Create New Lobby
        </p>
        <button
          data-testid="landing-host-btn"
          class="w-full text-slate-900 font-bold py-4 rounded shadow-lg transition-all transform hover:scale-105" 
          :class="theme.colors.button"
          @click="emit('navigate', 'HOSTING')"
        >
          HOST GAME
        </button>
      </div>
    </div>

    <!-- JOIN GAME -->
    <div class="p-8 border-2 border-slate-700 bg-slate-800/50 rounded-xl backdrop-blur-sm shadow-2xl hover:border-purple-500/50 transition-colors">
      <div class="text-center space-y-4">
        <LogIn class="w-16 h-16 mx-auto text-slate-400" />
        <p class="text-sm text-slate-400 uppercase tracking-widest">
          Join Existing Lobby
        </p>
        <button
          data-testid="landing-join-btn"
          class="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-4 rounded shadow-lg transition-all transform hover:scale-105" 
          @click="emit('navigate', 'JOINING')"
        >
          JOIN GAME
        </button>
      </div>
    </div>
  </div>
</template>
