<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
  phaseName: String
});

const emit = defineEmits(['finish']);

const visible = ref(false);

onMounted(() => {
    // Fade In
    setTimeout(() => visible.value = true, 100);
    // Wait then Fade Out logic handled by parent or self?
    // Let's make it self-contained for the "Exit"
    setTimeout(() => {
        visible.value = false;
        setTimeout(() => emit('finish'), 500); // Wait for fade out
    }, 2000); 
});

const getPhaseTitle = (p) => {
    switch(p) {
        case 'PROMPT': return 'INCOMING TRANSMISSION';
        case 'INPUT': return 'ESTABLISHING UPLINK';
        case 'VOTING': return 'CONSENSUS REQUIRED';
        case 'REVEAL': return 'DECRYPTING RESULTS';
        case 'FINISH': return 'MISSION DEBRIEF';
        default: return 'LOADING...';
    }
};
</script>

<template>
  <div class="fixed inset-0 z-[90] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out"
       :class="visible ? 'opacity-100' : 'opacity-0 pointer-events-none'">
      
      <div class="text-green-500 font-mono text-4xl md:text-6xl font-bold tracking-tighter animate-pulse mb-4">
          {{ getPhaseTitle(phaseName) }}
      </div>
      
      <div class="w-64 h-2 bg-slate-800 rounded overflow-hidden">
          <div class="h-full bg-green-500 animate-progress-bar"></div>
      </div>
      
      <div class="mt-4 text-slate-500 font-mono text-sm uppercase tracking-widest">
          System State: <span class="text-white">TRANSITIONING</span>
      </div>
  </div>
</template>

<style scoped>
@keyframes progress {
    0% { width: 0%; }
    100% { width: 100%; }
}
.animate-progress-bar {
    animation: progress 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
</style>
