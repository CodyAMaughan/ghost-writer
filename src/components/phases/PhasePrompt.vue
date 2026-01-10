<script setup>
import { computed } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { THEMES } from '../../config/themes';

const { gameState } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);
</script>

<template>
  <div class="flex-grow flex flex-col items-center justify-center text-center animate-fade-in">
    <span class="text-green-500 text-sm tracking-[0.3em] font-bold mb-4 uppercase">{{ theme.copy.promptHeader }}</span>
    <h1 class="text-3xl md:text-5xl font-bold text-white glitched px-4 leading-tight">
      "{{ gameState.prompt }}"
    </h1>
  </div>
</template>

<style scoped>
.glitched {
   animation: glitch 3s infinite alternate;
}
</style>
