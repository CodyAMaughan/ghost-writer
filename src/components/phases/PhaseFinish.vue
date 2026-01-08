<script setup>
import { usePeer } from '../../composables/usePeer';
const { gameState, isHost, myId, nextRound, startGame } = usePeer();
</script>

<template>
    <div class="w-full flex-grow flex flex-col items-center justify-center">
         <h2 class="text-4xl text-green-400 font-bold mb-8">OPERATION COMPLETE</h2>
         
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
                  <tr v-for="(p, i) in gameState.players.sort((a,b) => b.score - a.score)" :key="p.id" 
                      class="border-b border-slate-700 last:border-0 hover:bg-slate-700/50 transition-colors"
                      :class="{'bg-gradient-to-r from-yellow-500/10 to-transparent': i===0, 'bg-gradient-to-r from-slate-400/10 to-transparent': i===1, 'bg-gradient-to-r from-amber-700/10 to-transparent': i===2}">
                     <td class="p-4 font-bold text-white w-16 text-center">
                         <span v-if="i===0" class="text-2xl">🥇</span>
                         <span v-else-if="i===1" class="text-2xl">🥈</span>
                         <span v-else-if="i===2" class="text-2xl">🥉</span>
                         <span v-else class="text-slate-500">#{{ i + 1 }}</span>
                     </td>
                     <td class="p-4">
                        <div class="font-bold text-lg" :class="{'text-yellow-400': i===0, 'text-slate-300': i===1, 'text-amber-600': i===2, 'text-slate-200': i>2}">
                            {{ p.name }}
                        </div>
                        <div v-if="p.id === myId" class="text-[10px] text-slate-500 uppercase tracking-widest">YOU</div>
                     </td>
                     <td class="p-4 font-bold text-right text-xl font-mono" :class="{'text-yellow-400': i===0, 'text-green-400': i>0}">
                         {{ p.score }} <span class="text-sm font-sans text-slate-500">pts</span>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
 
         <div v-if="isHost" class="flex gap-4">
            <button v-if="gameState.round < gameState.maxRounds" @click="nextRound" class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-8 rounded">
               START ROUND {{ gameState.round + 1 }}
            </button>
            <button @click="startGame" class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded border border-slate-500">
               RESTART GAME
            </button>
         </div>
         <div v-else class="text-slate-500">Waiting for Host...</div>
     </div>
</template>
