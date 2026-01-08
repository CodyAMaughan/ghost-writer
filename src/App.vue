<script setup>
import { usePeer } from './composables/usePeer';
import Lobby from './components/Lobby.vue';
import GameScreen from './components/GameScreen.vue';

const { gameState } = usePeer();
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-200 font-mono overflow-hidden relative">
    <!-- Grid Background -->
    <div class="absolute inset-0 z-0 opacity-10 pointer-events-none" 
         style="background-image: radial-gradient(#4ade80 1px, transparent 1px); background-size: 30px 30px;">
    </div>
    
    <div class="relative z-10 container mx-auto px-4 py-8 h-screen flex flex-col">
      <header class="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <h1 class="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 animate-pulse">
          GHOST_WRITER_v1.0
        </h1>
        <div v-if="gameState.roomCode" class="text-xs uppercase tracking-widest text-slate-500">
          SECURE_uplink: <span class="text-green-400 font-bold">{{ gameState.roomCode }}</span>
        </div>
      </header>

      <main class="flex-grow flex flex-col">
        <component 
          :is="gameState.phase === 'LOBBY' ? Lobby : GameScreen" 
        />
      </main>

      <footer class="mt-8 text-center text-xs text-slate-600 font-mono">
        SYSTEMSTATUS: <span class="text-green-500">ONLINE</span> | LATENCY: <span class="text-green-500">12ms</span>
      </footer>
    </div>
  </div>
</template>
