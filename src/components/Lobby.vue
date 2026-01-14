<script setup>
import { computed, ref } from 'vue';
import { usePeer } from '../composables/usePeer';
import { useAudio } from '../composables/useAudio';
import { Check, Link, Share, Trash2, EyeOff } from 'lucide-vue-next';
import Nameplate from './Nameplate.vue';
import { THEMES } from '../config/themes';
import { useStreamerMode } from '../composables/useStreamerMode';
import ProfileModal from './modals/ProfileModal.vue';

const { gameState, myId, startGame, isHost, kickPlayer, setTheme, leaveGame } = usePeer();
const { isStreamerMode } = useStreamerMode();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const emit = defineEmits(['leave']);

const handleLeave = () => {
    if(confirm("Are you sure you want to disconnect?")) {
        leaveGame();
        emit('leave');
    }
};

const copyStatus = ref('IDLE'); // 'IDLE' | 'COPIED'

const copyCode = () => {
  navigator.clipboard.writeText(gameState.roomCode);
  copyStatus.value = 'COPIED';
  setTimeout(() => {
    copyStatus.value = 'IDLE';
  }, 1000);
};

const copyLink = async () => {
    const url = `${window.location.origin}?room=${gameState.roomCode}`;
    try {
        await navigator.clipboard.writeText(url);
        const btn = document.getElementById('copy-link-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }
    } catch (err) {
        console.error('Failed to copy', err);
    }
};

const shareLink = async () => {
    const url = `${window.location.origin}?room=${gameState.roomCode}`;
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Join my Ghost Writer Game!',
                text: 'Come play Ghost Writer with me! Can you fool the AI?',
                url: url
            });
        } catch (err) {
            console.error('Share failed', err);
        }
    } else {
        alert(`Share this link: ${url}`);
    }
};

const showProfileModal = ref(false);
const handleNameClick = (playerId) => {
    if (playerId === myId.value) {
        showProfileModal.value = true;
    }
};
</script>

<template>
  <div class="w-full max-w-6xl flex flex-col mx-auto my-auto justify-center flex-grow">
    <div class="bg-black/50 border border-slate-700 rounded-xl p-8 backdrop-blur-md w-full">
      <div class="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-white/10 gap-6">
        <div class="text-center md:text-left">
          <h2 class="text-3xl font-bold text-white tracking-widest">
            Lobby
          </h2>
          <p
            v-if="isHost"
            class="text-sm mt-1"
            :class="theme.colors.accent"
          >
            YOU ARE HOST
          </p>
          <p
            v-else
            class="text-slate-400 text-sm mt-1"
          >
            {{ theme.copy.waitingForHost }}
          </p>
        </div>
           
        <!-- ROOM CODE & INVITE -->
        <div class="flex gap-4 items-stretch">
          <div class="flex gap-2 items-stretch">
            <div
              id="copy-code-btn"
              class="cursor-pointer bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded border border-slate-600 flex flex-col items-center justify-center group min-w-[140px]"
              @click="copyCode"
            >
              <div
                v-if="copyStatus === 'IDLE'"
                class="flex flex-col items-center"
              >
                <span class="text-xs text-slate-500 group-hover:text-slate-300 uppercase font-bold">Access Code</span>
                    
                <span
                  v-if="!isStreamerMode"
                  class="text-2xl font-bold tracking-[0.2em]"
                  :class="theme.colors.accent"
                  data-testid="lobby-code-display"
                >{{ gameState.roomCode }}</span>
                    
                <span
                  v-else
                  class="text-xl font-bold flex items-center gap-2 mt-1"
                  :class="theme.colors.accent"
                  data-testid="lobby-code-display"
                >
                  <EyeOff class="w-5 h-5" /> ****
                </span>
                    
                <span
                  v-if="isStreamerMode"
                  class="text-[10px] text-slate-500 mt-0.5"
                >Hidden</span>
              </div>
              <div
                v-else
                class="flex flex-col items-center animate-bounce"
              >
                <Check class="w-8 h-8 text-green-500 mb-1" />
                <span class="text-green-500 font-bold tracking-widest">COPIED!</span>
              </div>
            </div>

            <!-- Invite Buttons -->
            <div class="flex flex-col gap-1">
              <button
                id="copy-link-btn"
                class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 rounded text-slate-400 hover:text-white transition-colors"
                title="Copy Invite Link"
                @click="copyLink"
              >
                <Link class="w-4 h-4" />
              </button>
              <button
                class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 rounded text-slate-400 hover:text-white transition-colors"
                title="Share Invite"
                @click="shareLink"
              >
                <Share class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- WAITING ROOM / PENDING PLAYERS -->
      <div
        v-if="isHost && gameState.pendingPlayers.length > 0"
        class="mb-8"
      >
        <h3 class="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          WAITING FOR APPROVAL ({{ gameState.pendingPlayers.length }})
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="pending in gameState.pendingPlayers" 
            :key="pending.id"
            class="bg-slate-900/80 border border-yellow-500/50 rounded flex items-center justify-between p-3"
          >
            <span class="text-white font-bold truncate px-2">{{ pending.name }}</span>
            <div class="flex gap-2">
              <button 
                class="p-2 bg-green-900/50 hover:bg-green-700 text-green-400 hover:text-white rounded border border-green-800 transition-colors"
                title="Approve"
                @click="usePeer().approvePendingPlayer(pending.id)"
              >
                <Check class="w-4 h-4" />
              </button>
              <button 
                class="p-2 bg-red-900/50 hover:bg-red-700 text-red-400 hover:text-white rounded border border-red-800 transition-colors"
                title="Reject"
                @click="usePeer().rejectPendingPlayer(pending.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div
          v-for="player in gameState.players"
          :key="player.id" 
          class="bg-slate-800/80 p-4 rounded flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden group"
        >
          <div
            v-if="player.id === myId"
            class="absolute top-1 right-2 text-[10px] text-yellow-400 font-bold z-10"
          >
            YOU
          </div>
          <div
            v-if="player.isHost"
            class="absolute top-1 left-2 text-[10px] font-bold z-10"
            :class="theme.colors.accent"
          >
            HOST
          </div>
             
          <!-- Kick Button -->
          <button 
            v-if="isHost && player.id !== myId && !player.isHost" 
            class="absolute top-1 right-1 p-1 bg-red-900/50 hover:bg-red-900 rounded border border-red-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Kick player"
            @click="kickPlayer(player.id)"
          >
            <Trash2 class="w-3 h-3 text-red-300" />
          </button>
             
          <!-- Nameplate Component -->
          <Nameplate
            :player-id="player.id"
            layout="vertical"
            size="2xl"
            :is-interactable="true"
            @click-name="handleNameClick(player.id)"
          />
        </div>
        <!-- Slots -->
        <div
          v-for="i in (8 - gameState.players.length)"
          :key="i"
          class="bg-slate-900/30 border border-slate-800 border-dashed rounded p-4 flex items-center justify-center text-slate-700"
        >
          {{ theme.copy.waitingForHost }}
        </div>
      </div>

      <!-- HOST SETTINGS (Theme/Rounds) -->
      <div
        v-if="isHost"
        class="flex flex-col gap-4 justify-center items-center w-full max-w-sm mx-auto"
      >
        <!-- CONFIG -->
        <div class="w-full bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
          <!-- THEME SELECTOR -->
          <div class="flex justify-between items-center">
            <label class="text-xs uppercase text-slate-500">Theme</label>
            <select
              :value="gameState.currentTheme"
              class="bg-black border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none"
              :class="theme.colors.accent"
              @change="setTheme($event.target.value)"
            >
              <option
                v-for="t in THEMES"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name }}
              </option>
            </select>
          </div>
          <div class="flex justify-between items-center">
            <label class="text-xs uppercase text-slate-500">Rounds</label>
            <input
              v-model="gameState.maxRounds"
              type="number"
              min="1"
              max="10"
              class="bg-black border border-slate-600 rounded px-2 py-1 text-sm w-16 text-center focus:outline-none"
              :class="theme.colors.accent"
            >
          </div>
          <div class="flex justify-between items-center">
            <label class="text-xs uppercase text-slate-500">Timer (s)</label>
            <input
              v-model="gameState.settings.roundDuration"
              type="number"
              min="30"
              step="10"
              class="bg-black border border-slate-600 rounded px-2 py-1 text-sm w-16 text-center focus:outline-none"
              :class="theme.colors.accent"
            >
          </div>
        </div>

        <div class="space-y-4 w-full">
          <button
            data-testid="start-game-btn"
            class="w-full text-black font-bold py-4 rounded shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform"
            :class="theme.colors.button"
            :disabled="gameState.players.length < 2"
            @click="startGame"
          >
            {{ theme.copy.startGameBtn || 'Start Game' }}
          </button>
          <p
            v-if="gameState.players.length < 2"
            class="text-xs text-slate-500 animate-pulse text-center"
          >
            Need at least 2 players
          </p>
            
          <button
            class="w-full text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 px-4 py-2 rounded transition-colors"
            @click="handleLeave"
          >
            Close Lobby
          </button>
        </div>
      </div>
        
      <div
        v-else
        class="flex justify-center mt-6"
      >
        <button
          class="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 px-4 py-2 rounded transition-colors"
          @click="handleLeave"
        >
          Leave Lobby
        </button>
      </div>
    </div>
    
    <ProfileModal
      v-if="showProfileModal"
      @close="showProfileModal = false"
    />
  </div>
</template>
