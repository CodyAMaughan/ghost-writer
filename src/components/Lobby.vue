<script setup>
import { ref } from 'vue';
import { usePeer } from '../composables/usePeer';
import { User, Server, Key, LogIn, Users, Play } from 'lucide-vue-next';

const { initHost, joinGame, gameState, myId, myName, startGame, isHost, leaveGame } = usePeer();

const mode = ref('LANDING'); // LANDING, HOSTING, JOINING, WAITING
const form = ref({
  name: '',
  code: '',
  provider: 'gemini',
  apiKey: localStorage.getItem('gw_api_key') || ''
});

const handleHost = () => {
  if(!form.value.name || !form.value.apiKey) return alert("Name & API Key required");
  localStorage.setItem('gw_api_key', form.value.apiKey);
  initHost(form.value.name, form.value.provider, form.value.apiKey);
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
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-grow max-w-lg mx-auto w-full">
    
    <!-- LANDING CHOICE -->
    <div v-if="mode === 'LANDING'" class="space-y-6 w-full animate-fade-in-up">
      <div class="p-8 border-2 border-slate-700 bg-slate-800/50 rounded-xl backdrop-blur-sm shadow-2xl hover:border-green-500/50 transition-colors">
        <div class="text-center space-y-4">
          <Server class="w-16 h-16 mx-auto text-green-400" />
          <p class="text-sm text-slate-400 uppercase tracking-widest">Construct New Reality</p>
          <button @click="mode = 'HOSTING'" 
                  class="w-full bg-green-500 hover:bg-green-400 text-slate-900 font-bold py-4 rounded shadow-lg shadow-green-900/20 transition-all transform hover:scale-105">
            HOST GAME
          </button>
        </div>
      </div>

      <div class="p-8 border-2 border-slate-700 bg-slate-800/50 rounded-xl backdrop-blur-sm shadow-2xl hover:border-purple-500/50 transition-colors">
        <div class="text-center space-y-4">
          <LogIn class="w-16 h-16 mx-auto text-purple-400" />
          <p class="text-sm text-slate-400 uppercase tracking-widest">Infiltrate Server</p>
          <button @click="mode = 'JOINING'" 
                  class="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-4 rounded shadow-lg transition-all transform hover:scale-105">
            JOIN GAME
          </button>
        </div>
      </div>
    </div>

    <!-- HOST FORM -->
    <div v-else-if="mode === 'HOSTING'" class="w-full bg-slate-800 p-8 rounded-lg border border-green-500/30 shadow-2xl">
      <h2 class="text-2xl font-bold mb-6 text-green-400 flex items-center gap-2">
        <Server /> HOST_CONFIG
      </h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Codename</label>
          <input v-model="form.name" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-green-500 text-white placeholder-slate-600" placeholder="ENTER_NAME" />
        </div>
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">AI Provider</label>
          <div class="flex gap-4">
            <button @click="form.provider = 'gemini'" :class="form.provider === 'gemini' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500'" class="flex-1 p-3 border rounded transition-colors text-center font-bold text-sm">Gemini (Free)</button>
            <button @click="form.provider = 'openai'" :class="form.provider === 'openai' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-700 text-slate-500'" class="flex-1 p-3 border rounded transition-colors text-center font-bold text-sm">OpenAI ($)</button>
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">API Access Key</label>
          <div class="relative">
            <input v-model="form.apiKey" type="password" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-green-500 text-white placeholder-slate-600" placeholder="sk-..." />
            <Key class="absolute right-3 top-3.5 w-4 h-4 text-slate-500" />
          </div>
          <p class="text-[10px] text-slate-500 mt-1">Key is stored locally. Never sent to our servers.</p>
        </div>
        <div class="flex gap-2 pt-4">
          <button @click="mode = 'LANDING'" class="flex-1 py-3 text-slate-400 hover:text-white">BACK</button>
          <button @click="handleHost" class="flex-[2] bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded">INITIALIZE</button>
        </div>
      </div>
    </div>

    <!-- JOIN FORM -->
    <div v-else-if="mode === 'JOINING'" class="w-full bg-slate-800 p-8 rounded-lg border border-purple-500/30 shadow-2xl">
      <h2 class="text-2xl font-bold mb-6 text-purple-400 flex items-center gap-2">
        <LogIn /> JOIN_UPLINK
      </h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Codename</label>
          <input v-model="form.name" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-purple-500 text-white placeholder-slate-600" placeholder="ENTER_NAME" />
        </div>
        <div>
          <label class="block text-xs uppercase text-slate-500 mb-1">Target Room Code</label>
          <input v-model="form.code" maxlength="6" class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-purple-500 text-white placeholder-slate-600 uppercase tracking-widest text-xl font-bold text-center" placeholder="XXXXXX" />
        </div>
        <div class="flex gap-2 pt-4">
          <button @click="mode = 'LANDING'" class="flex-1 py-3 text-slate-400 hover:text-white">BACK</button>
          <button @click="handleJoin" class="flex-[2] bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded">CONNECT</button>
        </div>
      </div>
    </div>

    <!-- WAITING ROOM -->
    <div v-else-if="mode === 'WAITING' || gameState.players.length > 0" class="w-full max-w-4xl">
      <div class="bg-black/50 border border-slate-700 rounded-xl p-8 backdrop-blur-md">
        <div class="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
          <div>
             <h2 class="text-3xl font-bold text-white tracking-widest">LOBBY_STATUS</h2>
             <p v-if="isHost" class="text-green-400 text-sm mt-1">YOU ARE HOST</p>
             <p v-else class="text-slate-400 text-sm mt-1">WAITING FOR HOST...</p>
          </div>
          <div @click="copyCode" class="cursor-pointer bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded border border-slate-600 flex flex-col items-center group">
            <span class="text-xs text-slate-500 group-hover:text-slate-300">ACCESS CODE</span>
            <span class="text-2xl font-bold text-green-400 tracking-[0.2em]">{{ gameState.roomCode }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div v-for="player in gameState.players" :key="player.id" 
               class="bg-slate-800/80 p-4 rounded flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden">
             <div v-if="player.id === myId" class="absolute top-1 right-2 text-[10px] text-yellow-400">YOU</div>
             <div v-if="player.isHost" class="absolute top-1 left-2 text-[10px] text-green-400">HOST</div>
             <User class="w-8 h-8 text-slate-400 mb-2" />
             <span class="font-bold truncate w-full text-center">{{ player.name }}</span>
          </div>
          <!-- Slots -->
          <div v-for="i in (8 - gameState.players.length)" :key="i" class="bg-slate-900/30 border border-slate-800 border-dashed rounded p-4 flex items-center justify-center text-slate-700">
             WAITING...
          </div>
        </div>

        <div v-if="isHost" class="flex flex-col gap-4 justify-center items-center w-full max-w-sm mx-auto">
          
          <!-- CONFIG -->
          <div class="w-full bg-slate-900/50 p-4 rounded border border-slate-700 space-y-3">
             <div class="flex justify-between items-center">
                 <label class="text-xs uppercase text-slate-500">Rounds</label>
                 <input type="number" v-model="gameState.maxRounds" class="bg-black border border-slate-600 rounded px-2 py-1 w-16 text-center focus:border-green-500 outline-none" min="1" max="20" />
             </div>
             <div class="flex justify-between items-center">
                 <label class="text-xs uppercase text-slate-500">Timer (Sec)</label>
                 <input type="number" v-model="gameState.settings.roundDuration" class="bg-black border border-slate-600 rounded px-2 py-1 w-16 text-center focus:border-green-500 outline-none" min="10" max="300" step="5" />
             </div>
          </div>

          <button @click="startGame" 
                  :disabled="gameState.players.length < 2"
                  :class="gameState.players.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'"
                  class="bg-green-500 text-black font-bold text-xl py-4 w-full rounded-full shadow-[0_0_20px_rgba(74,222,128,0.5)] transition-all flex items-center justify-center gap-3">
            <Play class="fill-current" /> INITIATE_GAME
          </button>
          
          <button @click="handleLeave" class="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 px-4 py-2 rounded transition-colors">
              ABORT OPERATION (CLOSE LOBBY)
          </button>
        </div>
        
        <div v-else class="flex justify-center mt-6">
             <button @click="handleLeave" class="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 px-4 py-2 rounded transition-colors">
                DISCONNECT FROM UPLINK
             </button>
        </div>

        <p v-if="isHost && gameState.players.length < 2" class="text-center text-slate-500 mt-4 animate-pulse">Waiting for peers to connect...</p>
      </div>
    </div>

  </div>
</template>
