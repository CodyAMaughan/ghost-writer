<script setup>
import { computed, onMounted } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { useAudio } from '../../composables/useAudio';
import { THEMES } from '../../config/themes';
import confetti from 'canvas-confetti';

const { gameState, isHost, myId, nextRound, startGame, leaveGame } = usePeer();
const { playSfx, playMusic } = useAudio();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const leaderboard = computed(() => {
    const sorted = [...gameState.players].sort((a,b) => b.score - a.score);
    let currentRank = 1;
    return sorted.map((p, i) => {
        if (i > 0 && p.score < sorted[i-1].score) {
            currentRank = i + 1;
        }
        return { ...p, rank: currentRank };
    });
});

onMounted(() => {
    playSfx('WINNER');

    // Confetti only on final round
    if (gameState.round === gameState.maxRounds) {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 100
            });
            confetti({
                particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 100
            });

            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
});
</script>

<template>
    <div class="w-full flex-grow flex flex-col items-center justify-center">
         <h2 class="text-4xl font-bold mb-8" :class="theme.colors.accent">OPERATION COMPLETE</h2>
         
         <div class="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl overflow-hidden mb-8">
            <table class="w-full text-left">
               <thead class="bg-slate-900 border-b border-slate-700">
                  <tr>
                     <th class="p-4 text-xs text-slate-500">RANK</th>
                     <th class="p-4 text-xs text-slate-500">OPERATIVE</th>
                     <th class="p-4 text-xs text-slate-500 text-right">SCORE</th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="p in leaderboard" :key="p.id" 
                      class="border-b border-slate-700 last:border-0 hover:bg-slate-700/50 transition-colors"
                      :class="{'bg-gradient-to-r from-yellow-500/10 to-transparent': p.rank===1, 'bg-gradient-to-r from-slate-400/10 to-transparent': p.rank===2, 'bg-gradient-to-r from-amber-700/10 to-transparent': p.rank===3}">
                     <td class="p-4 font-bold text-white w-16 text-center">
                         <span v-if="p.rank===1" class="text-2xl">🥇</span>
                         <span v-else-if="p.rank===2" class="text-2xl">🥈</span>
                         <span v-else-if="p.rank===3" class="text-2xl">🥉</span>
                         <span v-else class="text-slate-500">#{{ p.rank }}</span>
                     </td>
                     <td class="p-4">
                        <div class="font-bold text-lg" :class="{'text-yellow-400': p.rank===1, 'text-slate-300': p.rank===2, 'text-amber-600': p.rank===3, 'text-slate-200': p.rank>3}">
                            {{ p.name }}
                        </div>
                        <div v-if="p.id === myId" class="text-[10px] text-slate-500 uppercase tracking-widest">YOU</div>
                     </td>
                     <td class="p-4 font-bold text-right text-xl font-mono" :class="{'text-yellow-400': p.rank===1, [theme.colors.accent]: p.rank>1}">
                         {{ p.score }} <span class="text-sm font-sans text-slate-500">pts</span>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
 
         <div v-if="isHost" class="flex gap-4">
            <button v-if="gameState.round < gameState.maxRounds" @click="nextRound" data-testid="next-round-btn" class="font-bold py-3 px-8 rounded text-white" :class="theme.colors.button">
               START ROUND {{ gameState.round + 1 }}
            </button>
            <div v-else class="flex gap-4">
                <button @click="startGame" data-testid="restart-game-btn" class="font-bold py-3 px-8 rounded text-white" :class="theme.colors.button">
                   PLAY AGAIN
                </button>
                 <button @click="leaveGame" class="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-700 font-bold py-3 px-8 rounded">
                   EXIT GAME
                </button>
            </div>
         </div>
         <div v-else class="text-slate-500">
             <span v-if="gameState.round < gameState.maxRounds">Waiting for Host to start next round...</span>
             <span v-else>Game Over. Waiting for Host...</span>
         </div>
     </div>
</template>
