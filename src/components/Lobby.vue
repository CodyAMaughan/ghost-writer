<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { usePeer } from '../composables/usePeer';
import { useAudio } from '../composables/useAudio';
import { Users, Check, X, Link, Share, Server, LogIn, Key, Play, Trash2, EyeOff, Wifi } from 'lucide-vue-next';
import AvatarIcon from './icons/AvatarIcon.vue';
import Nameplate from './Nameplate.vue';
import { AVATARS } from '../config/avatars';
import { THEMES } from '../config/themes';
import ApiKeyHelpModal from './ApiKeyHelpModal.vue';
import ProfileModal from './modals/ProfileModal.vue';
import QrcodeVue from 'qrcode.vue';
import { useStreamerMode } from '../composables/useStreamerMode';

const { initHost, joinGame, gameState, myId, startGame, isHost, leaveGame, setTheme, updateAvatar, 
        approvePendingPlayer, rejectPendingPlayer, kickPlayer, connectionError, isPending } = usePeer();
const { isStreamerMode } = useStreamerMode();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);
const joinUrl = computed(() => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}?room=${gameState.roomCode}`;
    }
    return '';
});

const mode = ref('LANDING'); // LANDING, HOSTING, JOINING, WAITING
const isConnecting = ref(false); // Track connection status to prevent multiple clicks
const form = ref({
  name: '',
  code: '',
  provider: 'official-server',
  password: '' // For joining password-protected lobbies
});

const lobbySettings = ref({
  requirePassword: false,
  password: '',
  enableWaitingRoom: false
});

// AUDIO
const { playMusic, stopMusic } = useAudio();
onMounted(() => {
    playMusic('BGM_LOBBY');

    // Check for room param in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        form.value.code = roomCode;
        mode.value = 'JOINING';
    }
});
onUnmounted(() => {
    stopMusic();
});

// Watch for connection errors (e.g., wrong password)
watch(connectionError, (error) => {
    if (error) {
        form.value.password = '';
        isPending.value = false;
        isConnecting.value = false;
        mode.value = 'JOINING';
    }
});

// Watch for successful join to switch UI mode
watch(() => gameState.players, (newPlayers) => {
    const amIInGame = newPlayers.some(p => p.id === myId.value);
    if (amIInGame && mode.value === 'JOINING') {
        mode.value = 'WAITING';
        isConnecting.value = false;
    }
}, { deep: true });

const aiMode = ref('server'); // 'server' or 'custom'

const selectAiMode = (mode) => {
  aiMode.value = mode;
  if (mode === 'server') {
    form.value.provider = 'official-server';
  } else {
    form.value.provider = 'gemini';
  }
};

const showKeyHelp = ref(false);

const apiKeys = ref({
    gemini: '',
    openai: '',
    anthropic: '',
    accessCode: ''
});

const rememberKeys = ref(false);

// Load keys on mount
const loadKeys = () => {
    const storage = localStorage.getItem('gw_remember_keys') === 'true' ? localStorage : sessionStorage;
    
    if (localStorage.getItem('gw_remember_keys') === 'true') {
        rememberKeys.value = true;
    }

    apiKeys.value.gemini = storage.getItem('gw_api_key_gemini') || '';
    apiKeys.value.openai = storage.getItem('gw_api_key_openai') || '';
    apiKeys.value.anthropic = storage.getItem('gw_api_key_anthropic') || '';
    apiKeys.value.accessCode = storage.getItem('gw_access_code') || '';
};
loadKeys();

const saveKeys = () => {
    localStorage.removeItem('gw_api_key_gemini');
    localStorage.removeItem('gw_api_key_openai');
    localStorage.removeItem('gw_api_key_anthropic');
    localStorage.removeItem('gw_access_code');
    sessionStorage.removeItem('gw_api_key_gemini');
    sessionStorage.removeItem('gw_api_key_openai');
    sessionStorage.removeItem('gw_api_key_anthropic');
    sessionStorage.removeItem('gw_access_code');

    const storage = rememberKeys.value ? localStorage : sessionStorage;
    if (rememberKeys.value) localStorage.setItem('gw_remember_keys', 'true');
    else localStorage.removeItem('gw_remember_keys');

    if(apiKeys.value.gemini) storage.setItem('gw_api_key_gemini', apiKeys.value.gemini);
    if(apiKeys.value.openai) storage.setItem('gw_api_key_openai', apiKeys.value.openai);
    if(apiKeys.value.anthropic) storage.setItem('gw_api_key_anthropic', apiKeys.value.anthropic);
    if(apiKeys.value.accessCode) storage.setItem('gw_access_code', apiKeys.value.accessCode);
};

const handleHost = () => {
  const key = aiMode.value === 'server' ? 'server-mode' : apiKeys.value[form.value.provider];
  
  if(!form.value.name) return alert("Name required");
  if(aiMode.value === 'custom' && !key) return alert("API Key required");
  if(lobbySettings.value.requirePassword && !lobbySettings.value.password) {
    return alert("Password required when password protection is enabled");
  }
  
  saveKeys();
  initHost(form.value.name, form.value.provider, key, lobbySettings.value);
  mode.value = 'WAITING';
};

const showConnectingModal = ref(false);
let connectionTimer = null;

const handleJoin = () => {
  if(!form.value.name || !form.value.code) return alert("Name & Room Code required");
  if(isConnecting.value) return; 
  
  isConnecting.value = true;
  connectionError.value = ''; // Clear previous errors
  showConnectingModal.value = true;
  
  // Start 5s timeout
  connectionTimer = setTimeout(() => {
    if (showConnectingModal.value && mode.value === 'JOINING') {
        showConnectingModal.value = false;
        isConnecting.value = false;
        connectionError.value = "Connection timed out. Check room code.";
    }
  }, 5000);

  joinGame(form.value.code.toUpperCase(), form.value.name, form.value.password);
};

// Cleanup timer
watch(showConnectingModal, (val) => {
    if (!val && connectionTimer) {
        clearTimeout(connectionTimer);
        connectionTimer = null;
    }
});

// If we successfully join (mode changes to WAITING) or error occurs, or pending (Waiting Room), close modal
watch([mode, connectionError, isPending], ([newMode, newError, newPending]) => {
    if (newMode === 'WAITING' || newPending) {
        showConnectingModal.value = false;
    }
    if (newError) {
        showConnectingModal.value = false;
    }
});

const handleLeave = () => {
    if(confirm("Are you sure you want to disconnect?")) {
        leaveGame();
        mode.value = 'LANDING';
    }
};

const cancelPending = () => {
    leaveGame(); // This now clears isPending too
    mode.value = 'JOINING'; // Go back to Join Form
};

const copyStatus = ref('IDLE'); // 'IDLE' | 'COPIED'

const copyCode = () => {
  navigator.clipboard.writeText(gameState.roomCode);
  copyStatus.value = 'COPIED';
  setTimeout(() => {
    copyStatus.value = 'IDLE';
  }, 1000);
};

// Invite System
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
  <div
    class="flex flex-col items-center justify-center flex-grow mx-auto w-full transition-all duration-300"
    :class="[mode === 'WAITING' || gameState.players.length > 0 ? 'max-w-6xl' : 'max-w-lg']"
  >
    <!-- LANDING CHOICE -->
    <div
      v-if="mode === 'LANDING'"
      class="space-y-6 w-full animate-fade-in-up"
    >
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
            @click="mode = 'HOSTING'"
          >
            HOST GAME
          </button>
        </div>
      </div>

      <div class="p-8 border-2 border-slate-700 bg-slate-800/50 rounded-xl backdrop-blur-sm shadow-2xl hover:border-purple-500/50 transition-colors">
        <div class="text-center space-y-4">
          <LogIn class="w-16 h-16 mx-auto text-slate-400" />
          <p class="text-sm text-slate-400 uppercase tracking-widest">
            Join Existing Lobby
          </p>
          <button
            data-testid="landing-join-btn"
            class="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-4 rounded shadow-lg transition-all transform hover:scale-105" 
            @click="mode = 'JOINING'"
          >
            JOIN GAME
          </button>
        </div>
      </div>
    </div>

    <!-- HOST FORM -->
    <div
      v-else-if="mode === 'HOSTING'"
      class="w-full bg-slate-800 p-8 rounded-lg border shadow-2xl"
      :class="theme.colors.border"
    >
      <h2
        class="text-2xl font-bold mb-6 flex items-center gap-2"
        :class="theme.colors.accent"
      >
        <Server /> LOBBY SETUP
      </h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Player Name</label>
          <input
            v-model="form.name"
            data-testid="host-name-input"
            class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-opacity-100 text-white placeholder-slate-600"
            :class="`focus:${theme.colors.border}`"
            placeholder="Your Name"
          >
        </div>
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">AI Provider</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              :class="[aiMode === 'server' ? `bg-purple-500/20 border-purple-500 text-purple-400` : 'bg-slate-900 border-slate-700 text-slate-500']"
              class="p-3 border rounded transition-colors text-center text-sm flex flex-col justify-center items-center h-20"
              @click="selectAiMode('server')"
            >
              <span class="font-bold">Ghost Server</span>
              <span class="text-[10px] opacity-70">Use our AI (access code)</span>
            </button>
            <button
              :class="[aiMode === 'custom' ? `bg-blue-500/20 border-blue-500 text-blue-400` : 'bg-slate-900 border-slate-700 text-slate-500']"
              class="p-3 border rounded transition-colors text-center text-sm flex flex-col justify-center items-center h-20"
              @click="selectAiMode('custom')"
            >
              <span class="font-bold">Bring Your Own Key</span>
              <span class="text-[10px] opacity-70">Use your own AI credits</span>
            </button>
          </div>
        </div>
        
        <!-- Provider Selection (Only show if custom mode) -->
        <div v-if="aiMode === 'custom'">
          <label class="block text-xs uppercase text-slate-500 mb-1">Choose Provider</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              :class="[form.provider === 'gemini' ? `bg-blue-500/20 border-blue-500 text-blue-400` : 'bg-slate-900 border-slate-700 text-slate-500']"
              class="p-2 border rounded transition-colors text-center text-xs flex flex-col justify-center items-center h-14"
              @click="form.provider = 'gemini'"
            >
              <span class="font-bold">Gemini</span>
              <span class="text-[9px] opacity-70">Free</span>
            </button>
            <button
              :class="[form.provider === 'openai' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500']"
              class="p-2 border rounded transition-colors text-center text-xs flex flex-col justify-center items-center h-14"
              @click="form.provider = 'openai'"
            >
              <span class="font-bold">OpenAI</span>
              <span class="text-[9px] opacity-70">Paid</span>
            </button>
            <button
              :class="[form.provider === 'anthropic' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-500']"
              class="p-2 border rounded transition-colors text-center text-xs flex flex-col justify-center items-center h-14"
              @click="form.provider = 'anthropic'"
            >
              <span class="font-bold">Anthropic</span>
              <span class="text-[9px] opacity-70">Paid</span>
            </button>
          </div>
        </div>
        <div v-if="aiMode === 'server'">
          <p class="text-sm text-slate-400 text-center py-4">
            Using our AI server - no API key needed! 🎉
          </p>
        </div>
        <div v-if="aiMode === 'custom'">
          <label class="block text-xs uppercase text-slate-500 mb-1">API Access Key ({{ form.provider.toUpperCase() }})</label>
          <div class="relative">
            <input
              v-model="apiKeys[form.provider]"
              type="password"
              data-testid="host-api-input"
              class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-opacity-100 text-white placeholder-slate-600"
              :class="`focus:${theme.colors.border}`"
              placeholder="sk-..."
            >
            <Key class="absolute right-3 top-3.5 w-4 h-4 text-slate-500" />
          </div>
          <div class="flex justify-between items-center mt-2">
            <div class="flex items-center gap-2">
              <input
                id="remember"
                v-model="rememberKeys"
                type="checkbox"
                class="accent-slate-500"
              >
              <label
                for="remember"
                class="text-[10px] text-slate-400 cursor-pointer select-none"
              >Remember keys (Unsafe on public PC)</label>
            </div>
            <button
              class="text-[10px] text-blue-400 hover:text-blue-300 underline"
              @click="showKeyHelp = true"
            >
              Need a key?
            </button>
          </div>
          
          <div class="bg-yellow-900/20 border border-yellow-700/30 p-2 rounded mt-2">
            <p class="text-[10px] text-yellow-500/80">
              ⚠ Your API Key is stored locally in your browser. For maximum security, disable extensions or use Incognito mode.
            </p>
          </div>
        </div>
        
        <!-- LOBBY SETTINGS -->
        <div class="space-y-3 pt-4 border-t border-slate-600">
          <h3 class="text-xs uppercase text-slate-500 font-bold">
            Lobby Settings
          </h3>
          
          <!-- Password Protection -->
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="lobbySettings.requirePassword"
                type="checkbox"
                class="accent-blue-500"
              >
              <span class="text-sm">Require Password</span>
            </label>
            <input 
              v-if="lobbySettings.requirePassword"
              v-model="lobbySettings.password" 
              type="password"
              autocomplete="off"
              data-lpignore="true"
              data-form-type="other"
              placeholder="Set lobby password"
              class="mt-2 w-full bg-slate-900 border border-slate-700 p-2 rounded focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
            >
          </div>
          
          <!-- Waiting Room -->
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="lobbySettings.enableWaitingRoom"
                type="checkbox"
                class="accent-blue-500"
              >
              <span class="text-sm">Enable Waiting Room (Manual Approval)</span>
            </label>
            <p
              v-if="lobbySettings.enableWaitingRoom"
              class="text-xs text-slate-400 mt-1 ml-6"
            >
              New players will need your approval to join.
            </p>
          </div>
        </div>
        
        <div class="flex gap-2 pt-4">
          <button
            class="flex-1 py-3 text-slate-400 hover:text-white"
            @click="mode = 'LANDING'"
          >
            BACK
          </button>
          <button
            data-testid="host-init-btn"
            class="flex-[2] text-black font-bold py-3 rounded"
            :class="theme.colors.button"
            @click="handleHost"
          >
            Create Game
          </button>
        </div>
      </div>
    </div>

    <!-- PENDING APPROVAL SCREEN -->
    <div
      v-else-if="isPending"
      class="w-full max-w-md"
    >
      <div class="bg-black/50 border border-amber-700 rounded-xl p-12 backdrop-blur-md flex flex-col items-center gap-6">
        <!-- Animated Ghost Logo -->
        <div class="relative w-48 h-48 flex items-center justify-center">
          <img
            src="/ghost_writer_logo.png"
            alt="Ghost Writer"
            class="w-full h-full object-contain animate-bounce"
          >
        </div>
        
        <!-- Message -->
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-bold text-amber-400">
            Waiting for Approval
          </h2>
          <p class="text-slate-300">
            The host is reviewing your request to join...
          </p>
          <p class="text-xs text-slate-500 mt-4">
            Room Code: <span class="font-bold tracking-widest">{{ gameState.roomCode }}</span>
          </p>
        </div>
        
        <!-- Cancel Button -->
        <button
          class="mt-4 text-xs text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-500 px-4 py-2 rounded transition-colors"
          @click="cancelPending"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- JOIN FORM -->
    <div
      v-if="mode === 'JOINING' && !isPending"
      class="w-full bg-slate-800 p-8 rounded-lg border border-slate-600 shadow-2xl"
    >
      <h2 class="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <LogIn /> JOIN LOBBY
      </h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Player Name</label>
          <input
            v-model="form.name"
            data-testid="join-name-input"
            class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-slate-500 text-white placeholder-slate-600"
            placeholder="Your Name"
          >
        </div>
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Room Code</label>
          <input
            v-model="form.code"
            maxlength="6"
            data-testid="join-code-input"
            class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-slate-500 text-white placeholder-slate-600 uppercase tracking-widest text-xl font-bold text-center"
            placeholder="XXXXXX"
          >
        </div>
        <!-- Password (Optional) -->
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Password (if required)</label>
          <input 
            v-model="form.password" 
            type="password"
            autocomplete="off"
            data-lpignore="true"
            data-form-type="other"
            data-testid="join-password-input" 
            class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-slate-500 text-white placeholder-slate-600" 
            placeholder="Optional" 
          >
        </div>
        
        <!-- Error Message -->
        <div
          v-if="connectionError"
          class="bg-red-900/20 border border-red-700 rounded p-3 text-red-300 text-sm"
        >
          {{ connectionError }}
        </div>
        
        <div class="flex gap-2 pt-4">
          <button
            class="flex-1 py-3 text-slate-400 hover:text-white"
            :disabled="isConnecting || isPending"
            @click="mode = 'LANDING'"
          >
            BACK
          </button>
          <button
            data-testid="join-connect-btn"
            class="flex-[2] bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isConnecting || isPending"
            @click="handleJoin"
          >
            {{ isConnecting ? 'CONNECTING...' : 'CONNECT' }}
          </button>
        </div>
      </div>
    </div>

    <!-- WAITING ROOM -->
    <div
      v-else-if="(mode === 'WAITING' || gameState.players.length > 0) && !isPending"
      class="w-full max-w-6xl flex flex-col"
    >
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
            <!-- QR CODE: Commented out to declutter lobby, but kept for future use if needed.
            <div 
              v-if="joinUrl"
              class="bg-white p-2 rounded transition-all duration-500 shrink-0 hidden md:block"
              :class="{'blur-xl hover:blur-none opacity-20 hover:opacity-100': isStreamerMode}"
              title="Scan to Join"
              data-testid="lobby-qr-container"
            >
              <QrcodeVue
                :value="joinUrl"
                :size="70"
                level="H"
              />
            </div>
            -->

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
                class="bg-black border border-slate-600 rounded px-2 py-1 w-16 text-center focus:outline-none"
                :class="theme.colors.accent"
                min="1"
                max="20"
              >
            </div>
            <div class="flex justify-between items-center">
              <label class="text-xs uppercase text-slate-500">Timer (Sec)</label>
              <input
                v-model="gameState.settings.roundDuration"
                type="number"
                class="bg-black border border-slate-600 rounded px-2 py-1 w-16 text-center focus:outline-none"
                :class="theme.colors.accent"
                min="10"
                max="300"
                step="5"
              >
            </div>
          </div>

          <button
            data-testid="start-game-btn" 
            :disabled="gameState.players.length < 2"
            :class="[gameState.players.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105', theme.colors.button]"
            class="font-bold text-xl py-4 w-full rounded-full shadow-lg transition-all flex items-center justify-center gap-3 text-white"
            @click="startGame"
          >
            <Play class="fill-current" /> {{ theme.copy.startGameBtn }}
          </button>
          
          <button
            class="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 px-4 py-2 rounded transition-colors"
            @click="handleLeave"
          >
            Close Lobby
          </button>
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

        <p
          v-if="isHost && gameState.players.length < 2"
          class="text-center text-slate-500 mt-4 animate-pulse"
        >
          {{ theme.copy.waiting }}
        </p>
        
        <!-- PENDING PLAYERS SECTION (Waiting Room) -->
        <div
          v-if="isHost && gameState.settings.enableWaitingRoom && gameState.pendingPlayers.length > 0" 
          class="mt-6 bg-amber-900/10 border-2 border-amber-700/40 rounded-lg p-4"
        >
          <h3 class="text-sm font-bold text-amber-400 uppercase mb-3 flex items-center gap-2">
            <Users class="w-4 h-4" />
            Waiting List ({{ gameState.pendingPlayers.length }})
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="pending in gameState.pendingPlayers"
              :key="pending.id"
              class="bg-slate-800/50 border-2 border-dashed border-amber-600/50 rounded p-3 flex items-center justify-between"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <AvatarIcon
                  :avatar-id="pending.avatarId || 0"
                  size="w-10 h-10"
                  :show-border="true"
                />
                <span class="font-semibold text-amber-200 truncate">{{ pending.name }}</span>
              </div>
              
              <div class="flex gap-2 ml-2">
                <button 
                  class="p-1.5 bg-green-900/50 hover:bg-green-900 rounded border border-green-700 transition-colors"
                  title="Approve"
                  @click="approvePendingPlayer(pending.id)"
                >
                  <Check class="w-4 h-4 text-green-300" />
                </button>
                <button 
                  class="p-1.5 bg-red-900/50 hover:bg-red-900 rounded border border-red-700 transition-colors"
                  title="Reject"
                  @click="rejectPendingPlayer(pending.id)"
                >
                  <X class="w-4 h-4 text-red-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Profile Edit Modal -->
    <ProfileModal
      v-if="showProfileModal"
      @close="showProfileModal = false"
    />

    <!-- API Key Modal -->
    <ApiKeyHelpModal
      v-if="showKeyHelp"
      @close="showKeyHelp = false"
    />
    

  </div>

  <!-- CONNECTING MODAL -->
  <div
    v-if="showConnectingModal"
    class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  >
    <div class="bg-slate-800 border border-slate-600 rounded-xl p-8 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300 w-full max-w-sm">
      <div class="relative">
        <Wifi class="w-16 h-16 text-blue-400 animate-pulse" />
        <div class="absolute inset-0 bg-blue-400 blur-xl opacity-20 animate-pulse" />
      </div>
        
      <div class="text-center">
        <h3 class="text-xl font-bold text-white tracking-widest mb-1 flex items-center justify-center gap-1">
          CONNECTING<span class="loading-dots" />
        </h3>
        <p class="text-xs text-slate-400">
          Locating Lobby...
        </p>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes loading-dots {
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
  100% { content: '.'; }
}

.loading-dots:after {
  content: '.';
  animation: loading-dots 1.5s steps(1) infinite;
  display: inline-block;
  width: 1rem;
  text-align: left;
}
</style>
