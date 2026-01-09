<script setup>
import { ref } from 'vue';
import { usePeer } from '../composables/usePeer';
import { User, Server, Key, LogIn, Users, Play, Ban } from 'lucide-vue-next';
import AvatarIcon from './AvatarIcon.vue';
import { AVATARS } from '../config/avatars';

import { THEMES } from '../config/themes';
import { computed } from 'vue';
import ApiKeyHelpModal from './ApiKeyHelpModal.vue';

const { initHost, joinGame, gameState, myId, myName, startGame, isHost, leaveGame, setTheme, updateAvatar } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const mode = ref('LANDING'); // LANDING, HOSTING, JOINING, WAITING
const form = ref({
  name: '',
  code: '',
  provider: 'official-server'
});

const aiMode = ref('server'); // 'server' or 'custom'

const selectAiMode = (mode) => {
  aiMode.value = mode;
  if (mode === 'server') {
    form.value.provider = 'official-server';
  } else {
    form.value.provider = 'gemini'; // Default to gemini when switching to custom
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
    // Check local storage availability
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
    // Clear old locations first to avoid duplicates/confusion if toggling
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
  
  saveKeys();
  initHost(form.value.name, form.value.provider, key);
  mode.value = 'WAITING';
};

const handleJoin = () => {
  if(!form.value.name || !form.value.code) return alert("Name & Room Code required");
  joinGame(form.value.code.toUpperCase(), form.value.name);
  mode.value = 'WAITING'; // Actually waits for connection
};

const handleLeave = () => {
    if(confirm("Are you sure you want to disconnect?")) {
        leaveGame();
        mode.value = 'LANDING';
    }
};

const copyCode = () => {
  navigator.clipboard.writeText(gameState.roomCode);
  alert("Code Copied!");
}

const showAvatarPicker = ref(false);

const selectAvatar = (id) => {
    updateAvatar(id);
    showAvatarPicker.value = false;
};

const isTaken = (id) => {
    return gameState.players.some(p => p.avatarId === id && p.id !== myId.value);
};
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-grow mx-auto w-full transition-all duration-300"
       :class="[mode === 'WAITING' || gameState.players.length > 0 ? 'max-w-6xl' : 'max-w-lg']">
    
    <!-- LANDING CHOICE -->
    <div v-if="mode === 'LANDING'" class="space-y-6 w-full animate-fade-in-up">
      <div class="p-8 border-2 border-slate-700 bg-slate-800/50 rounded-xl backdrop-blur-sm shadow-2xl transition-colors" :class="`hover:${theme.colors.border}`">
        <div class="text-center space-y-4">
          <Server class="w-16 h-16 mx-auto" :class="theme.colors.accent" />
          <p class="text-sm text-slate-400 uppercase tracking-widest">Create New Lobby</p>
          <button @click="mode = 'HOSTING'" data-testid="landing-host-btn" 
                  class="w-full text-slate-900 font-bold py-4 rounded shadow-lg transition-all transform hover:scale-105"
                  :class="theme.colors.button">
            HOST GAME
          </button>
        </div>
      </div>

      <div class="p-8 border-2 border-slate-700 bg-slate-800/50 rounded-xl backdrop-blur-sm shadow-2xl hover:border-purple-500/50 transition-colors">
        <div class="text-center space-y-4">
          <LogIn class="w-16 h-16 mx-auto text-slate-400" />
          <p class="text-sm text-slate-400 uppercase tracking-widest">Join Existing Lobby</p>
          <button @click="mode = 'JOINING'" data-testid="landing-join-btn" 
                  class="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-4 rounded shadow-lg transition-all transform hover:scale-105">
            JOIN GAME
          </button>
        </div>
      </div>
    </div>

    <!-- HOST FORM -->
    <div v-else-if="mode === 'HOSTING'" class="w-full bg-slate-800 p-8 rounded-lg border shadow-2xl" :class="theme.colors.border">
      <h2 class="text-2xl font-bold mb-6 flex items-center gap-2" :class="theme.colors.accent">
        <Server /> LOBBY SETUP
      </h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Player Name</label>
          <input v-model="form.name" data-testid="host-name-input" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-opacity-100 text-white placeholder-slate-600" :class="`focus:${theme.colors.border}`" placeholder="Your Name" />
        </div>
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">AI Provider</label>
          <div class="grid grid-cols-2 gap-3">
            <button @click="selectAiMode('server')" :class="[aiMode === 'server' ? `bg-purple-500/20 border-purple-500 text-purple-400` : 'bg-slate-900 border-slate-700 text-slate-500']" class="p-3 border rounded transition-colors text-center text-sm flex flex-col justify-center items-center h-20">
                <span class="font-bold">Ghost Server</span>
                <span class="text-[10px] opacity-70">Use our AI (access code)</span>
            </button>
            <button @click="selectAiMode('custom')" :class="[aiMode === 'custom' ? `bg-blue-500/20 border-blue-500 text-blue-400` : 'bg-slate-900 border-slate-700 text-slate-500']" class="p-3 border rounded transition-colors text-center text-sm flex flex-col justify-center items-center h-20">
                <span class="font-bold">Bring Your Own Key</span>
                <span class="text-[10px] opacity-70">Use your own AI credits</span>
            </button>
          </div>
        </div>
        
        <!-- Provider Selection (Only show if custom mode) -->
        <div v-if="aiMode === 'custom'">
          <label class="block text-xs uppercase text-slate-500 mb-1">Choose Provider</label>
          <div class="grid grid-cols-3 gap-2">
            <button @click="form.provider = 'gemini'" :class="[form.provider === 'gemini' ? `bg-blue-500/20 border-blue-500 text-blue-400` : 'bg-slate-900 border-slate-700 text-slate-500']" class="p-2 border rounded transition-colors text-center text-xs flex flex-col justify-center items-center h-14">
                <span class="font-bold">Gemini</span>
                <span class="text-[9px] opacity-70">Free</span>
            </button>
            <button @click="form.provider = 'openai'" :class="[form.provider === 'openai' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500']" class="p-2 border rounded transition-colors text-center text-xs flex flex-col justify-center items-center h-14">
                <span class="font-bold">OpenAI</span>
                <span class="text-[9px] opacity-70">Paid</span>
            </button>
             <button @click="form.provider = 'anthropic'" :class="[form.provider === 'anthropic' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-500']" class="p-2 border rounded transition-colors text-center text-xs flex flex-col justify-center items-center h-14">
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
            <input v-model="apiKeys[form.provider]" type="password" data-testid="host-api-input" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-opacity-100 text-white placeholder-slate-600" :class="`focus:${theme.colors.border}`" placeholder="sk-..." />
            <Key class="absolute right-3 top-3.5 w-4 h-4 text-slate-500" />
          </div>
          <div class="flex justify-between items-center mt-2">
             <div class="flex items-center gap-2">
                 <input type="checkbox" v-model="rememberKeys" id="remember" class="accent-slate-500" />
                 <label for="remember" class="text-[10px] text-slate-400 cursor-pointer select-none">Remember keys (Unsafe on public PC)</label>
             </div>
             <button @click="showKeyHelp = true" class="text-[10px] text-blue-400 hover:text-blue-300 underline">Need a key?</button>
          </div>
          
          <div class="bg-yellow-900/20 border border-yellow-700/30 p-2 rounded mt-2">
               <p class="text-[10px] text-yellow-500/80">
                   ⚠ Your API Key is stored locally in your browser. For maximum security, disable extensions or use Incognito mode.
               </p>
          </div>
        </div>
        <div class="flex gap-2 pt-4">
          <button @click="mode = 'LANDING'" class="flex-1 py-3 text-slate-400 hover:text-white">BACK</button>
          <button @click="handleHost" data-testid="host-init-btn" class="flex-[2] text-black font-bold py-3 rounded" :class="theme.colors.button">Create Game</button>
        </div>
      </div>
    </div>

    <!-- JOIN FORM -->
    <div v-else-if="mode === 'JOINING'" class="w-full bg-slate-800 p-8 rounded-lg border border-slate-600 shadow-2xl">
      <h2 class="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <LogIn /> JOIN LOBBY
      </h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Player Name</label>
          <input v-model="form.name" data-testid="join-name-input" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-slate-500 text-white placeholder-slate-600" placeholder="Your Name" />
        </div>
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Room Code</label>
          <input v-model="form.code" maxlength="6" data-testid="join-code-input" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-slate-500 text-white placeholder-slate-600 uppercase tracking-widest text-xl font-bold text-center" placeholder="XXXXXX" />
        </div>
        <div class="flex gap-2 pt-4">
          <button @click="mode = 'LANDING'" class="flex-1 py-3 text-slate-400 hover:text-white">BACK</button>
          <button @click="handleJoin" data-testid="join-connect-btn" class="flex-[2] bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded">CONNECT</button>
        </div>
      </div>
    </div>

    <!-- WAITING ROOM -->
    <div v-else-if="mode === 'WAITING' || gameState.players.length > 0" class="w-full max-w-6xl flex flex-col">
      <div class="bg-black/50 border border-slate-700 rounded-xl p-8 backdrop-blur-md w-full">
        <div class="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-white/10 gap-6">
          <div class="text-center md:text-left">
             <h2 class="text-3xl font-bold text-white tracking-widest">Lobby</h2>
             <p v-if="isHost" class="text-sm mt-1" :class="theme.colors.accent">YOU ARE HOST</p>
             <p v-else class="text-slate-400 text-sm mt-1">{{ theme.copy.waitingForHost }}</p>
          </div>
          <div @click="copyCode" class="cursor-pointer bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded border border-slate-600 flex flex-col items-center group">
            <span class="text-xs text-slate-500 group-hover:text-slate-300">ACCESS CODE</span>
            <span class="text-2xl font-bold tracking-[0.2em]" :class="theme.colors.accent">{{ gameState.roomCode }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div v-for="player in gameState.players" :key="player.id" 
               class="bg-slate-800/80 p-4 rounded flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden group">
             <div v-if="player.id === myId" class="absolute top-1 right-2 text-[10px] text-yellow-400 font-bold z-10">YOU</div>
             <div v-if="player.isHost" class="absolute top-1 left-2 text-[10px] font-bold z-10" :class="theme.colors.accent">HOST</div>
             
             <!-- Avatar -->
             <div @click="player.id === myId ? showAvatarPicker = true : null" 
                  :class="player.id === myId ? 'cursor-pointer transition-transform hover:scale-110 active:scale-95' : ''">
                  <AvatarIcon :avatarId="player.avatarId" size="w-20 h-20" :showBorder="true" />
             </div>

             <span class="font-bold truncate w-full text-center mt-3" :class="theme.colors.text">{{ player.name }}</span>
          </div>
          <!-- Slots -->
          <div v-for="i in (8 - gameState.players.length)" :key="i" class="bg-slate-900/30 border border-slate-800 border-dashed rounded p-4 flex items-center justify-center text-slate-700">
             {{ theme.copy.waitingForHost }}
          </div>
        </div>

        <div v-if="isHost" class="flex flex-col gap-4 justify-center items-center w-full max-w-sm mx-auto">
          
          <!-- CONFIG -->
          <div class="w-full bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
             <!-- THEME SELECTOR -->
             <div class="flex justify-between items-center">
                 <label class="text-xs uppercase text-slate-500">Theme</label>
                 <select :value="gameState.currentTheme" @change="setTheme($event.target.value)" class="bg-black border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none" :class="theme.colors.accent">
                     <option v-for="t in THEMES" :key="t.id" :value="t.id">{{ t.name }}</option>
                 </select>
             </div>
             <div class="flex justify-between items-center">
                 <label class="text-xs uppercase text-slate-500">Rounds</label>
                 <input type="number" v-model="gameState.maxRounds" class="bg-black border border-slate-600 rounded px-2 py-1 w-16 text-center focus:outline-none" :class="theme.colors.accent" min="1" max="20" />
             </div>
             <div class="flex justify-between items-center">
                 <label class="text-xs uppercase text-slate-500">Timer (Sec)</label>
                 <input type="number" v-model="gameState.settings.roundDuration" class="bg-black border border-slate-600 rounded px-2 py-1 w-16 text-center focus:outline-none" :class="theme.colors.accent" min="10" max="300" step="5" />
             </div>
          </div>

          <button @click="startGame" 
                  data-testid="start-game-btn"
                  :disabled="gameState.players.length < 2"
                  :class="[gameState.players.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105', theme.colors.button]"
                  class="font-bold text-xl py-4 w-full rounded-full shadow-lg transition-all flex items-center justify-center gap-3 text-white">
            <Play class="fill-current" /> {{ theme.copy.startGameBtn }}
          </button>
          
          <button @click="handleLeave" class="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 px-4 py-2 rounded transition-colors">
              Close Lobby
          </button>
        </div>
        
        <div v-else class="flex justify-center mt-6">
             <button @click="handleLeave" class="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 px-4 py-2 rounded transition-colors">
                Leave Lobby
             </button>
        </div>

        <p v-if="isHost && gameState.players.length < 2" class="text-center text-slate-500 mt-4 animate-pulse">{{ theme.copy.waiting }}</p>
      </div>
    </div>

    <ApiKeyHelpModal :isOpen="showKeyHelp" @close="showKeyHelp = false" />
    
    <!-- AVATAR PICKER MODAL -->
    <div v-if="showAvatarPicker" class="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-600 max-w-lg w-full shadow-2xl animate-fade-in-up">
            <h3 class="text-white font-bold text-xl mb-6 text-center tracking-widest uppercase">Select Identity</h3>
            <div class="grid grid-cols-4 gap-4 justify-items-center">
                 <button v-for="av in AVATARS" :key="av.id" 
                         @click="selectAvatar(av.id)" 
                         :disabled="isTaken(av.id)"
                         class="relative group transition-all disabled:opacity-30 disabled:cursor-not-allowed transform hover:scale-110 active:scale-95">
                     <AvatarIcon :avatarId="av.id" size="w-16 h-16" />
                     <div v-if="isTaken(av.id)" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                         <Ban class="text-red-500 w-8 h-8" />
                     </div>
                 </button>
            </div>
            <button @click="showAvatarPicker = false" class="mt-8 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold uppercase tracking-widest">CANCEL</button>
        </div>
    </div>

  </div>
</template>
