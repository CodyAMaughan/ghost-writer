<script setup>
import { usePeer } from '../../composables/usePeer';

const emit = defineEmits(['cancel']);
const { gameState, leaveGame } = usePeer();

const cancelPending = () => {
    leaveGame(); // Clears peer state
    emit('cancel'); // Hints parent to move back to JOINING
};
</script>

<template>
    <div class="w-full max-w-md mx-auto my-auto h-full flex flex-col justify-center">
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
</template>
