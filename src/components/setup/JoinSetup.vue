<script setup>
import { ref, watch } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { LogIn } from 'lucide-vue-next';
import ConnectingModal from '../modals/ConnectingModal.vue';

const props = defineProps({
    initialCode: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['back']);
const { joinGame, isPending, connectionError } = usePeer();

const form = ref({
  name: '',
  code: props.initialCode || new URLSearchParams(window.location.search).get('room') || '',
  password: ''
});

const isConnecting = ref(false);
let connectionTimer = null;

const handleJoin = () => {
  if(!form.value.name || !form.value.code) return alert("Name & Room Code required");
  if(isConnecting.value) return; 
  
  isConnecting.value = true;
  connectionError.value = ''; // Clear previous errors
  
  // Start 5s timeout
  connectionTimer = setTimeout(() => {
    if (isConnecting.value) {
        isConnecting.value = false;
        connectionError.value = "Connection timed out. Check room code.";
    }
  }, 5000);

  joinGame(form.value.code.toUpperCase(), form.value.name, form.value.password);
};

// Cleanup logic moved here
watch([connectionError, isPending], ([newError, newPending]) => {
    if (newError || newPending) {
        isConnecting.value = false;
        if(connectionTimer) {
            clearTimeout(connectionTimer);
            connectionTimer = null;
        }
    }
});
</script>

<template>
  <div
    class="w-full bg-slate-800 p-8 rounded-lg border border-slate-600 shadow-2xl max-w-lg mx-auto my-auto"
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
          @click="emit('back')"
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
    
  <ConnectingModal v-if="isConnecting" />
</template>
