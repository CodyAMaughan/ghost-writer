<script setup>
import { computed } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { X, UserX, SkipForward, WifiOff, Users, AlertTriangle } from 'lucide-vue-next';
import AvatarIcon from '../icons/AvatarIcon.vue';
import { THEMES } from '../../config/themes';

defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
});

defineEmits(['close']);

const { gameState, kickPlayer, forceAdvance } = usePeer();

const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const activePlayers = computed(() => {
    return gameState.players || [];
});

const handleKick = (playerId, playerName) => {
    if (confirm(`Are you sure you want to kick ${playerName}? They will be banned from rejoining.`)) {
        kickPlayer(playerId);
    }
};

const handleForceAdvance = () => {
    if (confirm("Force advance the game phase? Use this only if the game is stuck.")) {
        forceAdvance();
    }
};

const getStatusColor = (player) => {
    if (player.connectionStatus === 'disconnected') return 'text-red-500';
    return 'text-green-400';
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
  >
    <div class="bg-slate-800 w-full max-w-md rounded-xl border border-slate-600 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
      <!-- Header -->
      <div class="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
        <h2 class="text-white font-bold flex items-center gap-2">
          <Users class="w-5 h-5 text-slate-400" />
          MANAGE PLAYERS
        </h2>
        <button
          class="text-slate-400 hover:text-white transition-colors"
          @click="$emit('close')"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Player List -->
      <div class="p-4 space-y-3 overflow-y-auto flex-1">
        <div v-if="activePlayers.length === 0" class="text-center text-slate-500 py-8">
            No players connected.
        </div>
        
        <div 
            v-for="player in activePlayers" 
            :key="player.id"
            class="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-slate-600/50"
        >
            <div class="flex items-center gap-3">
                <div class="relative">
                    <AvatarIcon :avatar-id="player.avatarId || 0" size="w-10 h-10" :show-border="false" />
                    <!-- Status Indicator -->
                    <div 
                        class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-700"
                        :class="player.connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-green-500'"
                    ></div>
                </div>
                <div>
                    <div class="text-white font-bold text-sm flex items-center gap-2">
                        {{ player.name }}
                        <span v-if="player.isHost" class="text-[10px] bg-yellow-500/20 text-yellow-500 px-1 rounded">HOST</span>
                    </div>
                    <div class="text-[10px] font-mono" :class="getStatusColor(player)">
                        {{ player.connectionStatus === 'disconnected' ? 'DISCONNECTED (ZOMBIE)' : 'CONNECTED' }}
                    </div>
                </div>
            </div>

            <button 
                v-if="!player.isHost"
                @click="handleKick(player.id, player.name)"
                class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                title="Kick & Ban Player"
            >
                <UserX class="w-4 h-4" />
            </button>
        </div>
      </div>
            
      <!-- Footer: Global Actions -->
      <div class="p-4 bg-black/20 border-t border-slate-700 shrink-0 space-y-3">
        <p class="text-[10px] text-slate-500 mb-2 flex items-start gap-1">
            <AlertTriangle class="w-3 h-3 shrink-0 mt-0.5" />
            <span>Use "Force Advance" if the game stalls due to a disconnected player not submitting/voting.</span>
        </p>
        <button
            @click="handleForceAdvance"
            class="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-red-900/50 hover:text-red-200 text-slate-300 font-bold py-3 rounded transition-colors text-xs uppercase"
        >
            <SkipForward class="w-4 h-4" />
            Force Advance Phase
        </button>
      </div>
    </div>
  </div>
</template>
