<script setup>
import { onMounted, ref, computed } from 'vue';
import { usePeer } from '../composables/usePeer';
import { THEMES } from '../config/themes';

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

const { gameState } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const getPhaseTitle = (p) => {
    return theme.value.copy.transitions[p] || 'LOADING...';
};
</script>

<template>
  <div
    class="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out"
    :class="visible ? 'opacity-100' : 'opacity-0'"
  >
    <div
      class="font-mono text-4xl md:text-6xl font-bold tracking-tighter animate-pulse mb-4 text-center"
      :class="theme.colors.accent"
    >
      {{ getPhaseTitle(phaseName) }}
    </div>
      
    <div class="w-64 h-2 bg-slate-800 rounded overflow-hidden">
      <div
        class="h-full animate-progress-bar"
        :class="theme.colors.button.split(' ')[0]"
      />
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
