<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { usePeer } from '../composables/usePeer';
import { THEMES } from '../config/themes';
import PhasePrompt from './phases/PhasePrompt.vue';
import PhaseInput from './phases/PhaseInput.vue';
import PhaseVoting from './phases/PhaseVoting.vue';
import PhaseReveal from './phases/PhaseReveal.vue';
import PhaseFinish from './phases/PhaseFinish.vue';
import PhaseTransition from './PhaseTransition.vue';

const { gameState } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const activePhase = ref(gameState.phase);
const showTransition = ref(false);
const nextPhaseName = ref('');

// Watch for phase changes to trigger transition
watch(() => gameState.phase, (newVal) => {
    if (newVal === activePhase.value) return;
    
    // Trigger Transition
    nextPhaseName.value = newVal;
    showTransition.value = true;
});

// Callback when the transition component has finished its "in" animation and is covering the screen
// Actually, PhaseTransition emits 'finish' at the very end.
// We need to swap the view in the middle.
// Let's rely on a timer here since we control the Transition component logic or we can just update the component slightly to emit 'readyToSwap'.

const handleTransitionFinish = () => {
    showTransition.value = false;
};

// We will use a timeout to swap the content halfway through the transition visibility
watch(showTransition, (val) => {
    if (val) {
        // Wait 1.2s (Transition is covering screen) then swap content
        setTimeout(() => {
            activePhase.value = nextPhaseName.value;
        }, 1200);
    }
});

const currentRound = computed(() => gameState.round);
const timer = computed(() => gameState.timer);

</script>

<template>
  <div :class="theme.font" class="h-full flex flex-col items-center w-full max-w-4xl mx-auto py-4 relative">
    
    <!-- TOP BAR -->
    <div class="w-full flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
      <div class="text-xs text-slate-500">
        ROUND <span class="text-white text-lg font-bold">{{ gameState.round }}/{{ gameState.maxRounds }}</span>
      </div>
      <div v-if="activePhase === 'INPUT'" class="flex items-center gap-3">
         <span class="text-xl font-bold font-mono" :class="timer < 10 ? 'text-red-500 animate-pulse' : 'text-green-400'">
            {{ timer }}s
         </span>
         <div class="h-2 w-32 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div class="h-full bg-green-500 transition-all duration-1000 ease-linear" 
                 :style="{ width: `${(timer / gameState.settings.roundDuration) * 100}%` }"></div>
         </div>
      </div>
    </div>

    <!-- DYNAMIC PHASE COMPONENT -->
    <component :is="activePhase === 'PROMPT' ? PhasePrompt : 
                    activePhase === 'INPUT' ? PhaseInput :
                    activePhase === 'VOTING' ? PhaseVoting :
                    activePhase === 'REVEAL' ? PhaseReveal :
                    activePhase === 'FINISH' ? PhaseFinish : null" 
               class="w-full flex-grow flex flex-col" />

    <!-- TRANSITION OVERLAY -->
    <PhaseTransition v-if="showTransition" :phaseName="nextPhaseName" @finish="handleTransitionFinish" />

  </div>
</template>
