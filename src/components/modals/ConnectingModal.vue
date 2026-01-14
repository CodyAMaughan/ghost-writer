<script setup>
import { Wifi } from 'lucide-vue-next';
</script>

<template>
  <div
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

<style scoped>
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
