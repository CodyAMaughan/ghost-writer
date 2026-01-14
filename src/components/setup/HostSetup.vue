<script setup>
import { ref, computed } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { Server, Key } from 'lucide-vue-next';
import { THEMES } from '../../config/themes';
import ApiKeyHelpModal from '../ApiKeyHelpModal.vue';

const { initHost, gameState } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const emit = defineEmits(['back', 'connect']);

const form = ref({
  name: '',
  provider: 'official-server', // default
});

const lobbySettings = ref({
  requirePassword: false,
  password: '',
  enableWaitingRoom: false
});

const aiMode = ref('server'); // 'server' or 'custom'
const showKeyHelp = ref(false);
const rememberKeys = ref(false);

const apiKeys = ref({
    gemini: '',
    openai: '',
    anthropic: '',
    accessCode: ''
});

// Load keys (Condensed logic from original)
const loadKeys = () => {
    const storage = localStorage.getItem('gw_remember_keys') === 'true' ? localStorage : sessionStorage;
    if (localStorage.getItem('gw_remember_keys') === 'true') rememberKeys.value = true;
    apiKeys.value.gemini = storage.getItem('gw_api_key_gemini') || '';
    apiKeys.value.openai = storage.getItem('gw_api_key_openai') || '';
    apiKeys.value.anthropic = storage.getItem('gw_api_key_anthropic') || '';
    apiKeys.value.accessCode = storage.getItem('gw_access_code') || '';
};
loadKeys();

const saveKeys = () => {
    localStorage.removeItem('gw_api_key_gemini');
    // ... (rest of cleanup similar to original)
    const storage = rememberKeys.value ? localStorage : sessionStorage;
    if (rememberKeys.value) localStorage.setItem('gw_remember_keys', 'true');
    else localStorage.removeItem('gw_remember_keys');

    if(apiKeys.value.gemini) storage.setItem('gw_api_key_gemini', apiKeys.value.gemini);
    if(apiKeys.value.openai) storage.setItem('gw_api_key_openai', apiKeys.value.openai);
    if(apiKeys.value.anthropic) storage.setItem('gw_api_key_anthropic', apiKeys.value.anthropic);
    if(apiKeys.value.accessCode) storage.setItem('gw_access_code', apiKeys.value.accessCode);
};

const selectAiMode = (mode) => {
  aiMode.value = mode;
  if (mode === 'server') {
    form.value.provider = 'official-server';
  } else {
    form.value.provider = 'gemini';
  }
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
  // No need to set mode here, controller handles state change via usePeer reactivity (or we emit done)
  // Actually, wait. initHost is async potentially? 
  // In the original, mode.value = 'WAITING' was set manually. 
  // But usage of 'isHost' state in Controller should switch the view.
  // HOWEVER, the Controller might rely on 'gameState.players.length > 0' AND 'isHost'.
  // Let's assume the Controller will switch view when it detects we are the host.
};
</script>

<template>
  <div
    class="w-full bg-slate-800 p-8 rounded-lg border shadow-2xl max-w-lg mx-auto my-auto"
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
            >Remember keys</label>
          </div>
          <button
            class="text-[10px] text-blue-400 hover:text-blue-300 underline"
            @click="showKeyHelp = true"
          >
            Need a key?
          </button>
        </div>
      </div>
        
      <!-- LOBBY SETTINGS -->
      <div class="space-y-3 pt-4 border-t border-slate-600">
        <h3 class="text-xs uppercase text-slate-500 font-bold">
          Lobby Settings
        </h3>
          
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
            placeholder="Set lobby password"
            class="mt-2 w-full bg-slate-900 border border-slate-700 p-2 rounded focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          >
        </div>
          
        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="lobbySettings.enableWaitingRoom"
              type="checkbox"
              class="accent-blue-500"
            >
            <span class="text-sm">Enable Waiting Room</span>
          </label>
        </div>
      </div>
        
      <div class="flex gap-2 pt-4">
        <button
          class="flex-1 py-3 text-slate-400 hover:text-white"
          @click="emit('back')"
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
      
    <ApiKeyHelpModal 
      v-if="showKeyHelp"
      :is-open="showKeyHelp"
      @close="showKeyHelp = false"
    />
  </div>
</template>
