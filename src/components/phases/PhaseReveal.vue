<script setup>
import { usePeer } from '../../composables/usePeer';
import { AGENTS } from '../../constants/agents';
import { User, Zap, UserCircle } from 'lucide-vue-next';

const { gameState, isHost, myId, nextReveal } = usePeer();
</script>

<template>
    <div class="w-full flex-grow flex flex-col items-center justify-center">
       <div v-if="gameState.submissions[gameState.revealedIndex]" class="w-full max-w-2xl text-center space-y-8 animate-fade-in-up">
           
           <div class="relative p-8 md:p-12 bg-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl overflow-hidden">
               <!-- Result Ribbon -->
               <div v-if="gameState.submissions[gameState.revealedIndex].authorId !== myId" 
                    class="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
               
              <p class="text-2xl md:text-3xl font-serif italic text-white mb-8">
                 "{{ gameState.submissions[gameState.revealedIndex].text }}"
              </p>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-700 pt-8 text-left">
                  <!-- 1. Identity -->
                  <div>
                      <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">AUTHOR IDENTITY</p>
                      <div class="flex items-center gap-2">
                          <UserCircle class="w-5 h-5 text-slate-400" />
                          <p class="text-lg font-bold text-white">{{ gameState.players.find(p => p.id === gameState.submissions[gameState.revealedIndex].authorId)?.name || 'Unknown' }}</p>
                      </div>
                  </div>

                  <!-- 2. Source Truth -->
                  <div>
                      <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">TRUE SOURCE</p>
                      <div v-if="gameState.submissions[gameState.revealedIndex].source === 'AI'" class="flex items-center gap-2">
                          <Zap class="w-5 h-5 text-purple-400" />
                          <p class="text-lg font-bold text-purple-400 glitch-text">AI [{{ AGENTS.find(a => a.id === gameState.submissions[gameState.revealedIndex].agent)?.name || 'BOT' }}]</p>
                      </div>
                      <div v-else class="flex items-center gap-2">
                          <User class="w-5 h-5 text-blue-400" />
                          <p class="text-lg font-bold text-blue-400">HUMAN</p>
                      </div>
                  </div>

                  <!-- 3. Stats -->
                  <div>
                      <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">VOTE ANALYTICS</p>
                      <div class="flex gap-4 text-sm font-mono">
                          <span class="text-blue-400 font-bold">HUMAN: {{ Object.values(gameState.submissions[gameState.revealedIndex].votes).filter(v => v === 'HUMAN').length }}</span>
                          <span class="text-purple-400 font-bold">BOT: {{ Object.values(gameState.submissions[gameState.revealedIndex].votes).filter(v => v === 'BOT').length }}</span>
                      </div>
                  </div>
              </div>

              <!-- My Guess Result -->
              <div v-if="gameState.submissions[gameState.revealedIndex].authorId !== myId" class="mt-8 bg-black/30 p-4 rounded flex items-center justify-between border border-slate-700">
                  <span class="text-xs text-slate-400 uppercase">YOUR ASSESSMENT:</span>
                  <div class="flex items-center gap-2 font-bold">
                      <span :class="gameState.submissions[gameState.revealedIndex].votes[myId] === 'HUMAN' ? 'text-blue-400' : 'text-purple-400'">
                          {{ gameState.submissions[gameState.revealedIndex].votes[myId] || 'SKIPPED' }}
                      </span>
                      
                      <template v-if="gameState.submissions[gameState.revealedIndex].votes[myId]">
                        <span v-if="(gameState.submissions[gameState.revealedIndex].votes[myId] === 'HUMAN' && gameState.submissions[gameState.revealedIndex].source !== 'AI') || 
                                    (gameState.submissions[gameState.revealedIndex].votes[myId] === 'BOT' && gameState.submissions[gameState.revealedIndex].source === 'AI')" 
                                class="bg-green-500 text-black text-[10px] px-2 py-0.5 rounded font-bold">
                            CORRECT (+1)
                        </span>
                        <span v-else class="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                            WRONG
                        </span>
                      </template>
                  </div>
              </div>

              <!-- SCORING BREAKDOWN FOR ME -->
              <div v-if="gameState.submissions[gameState.revealedIndex].authorId === myId" class="mt-8 bg-green-900/20 p-4 rounded border border-green-500/50">
                  <span class="text-xs text-green-400 uppercase tracking-widest">MISSION REPORT</span>
                  <div class="flex justify-between items-center mt-2">
                      <div class="text-sm text-slate-300">
                          <span v-if="gameState.submissions[gameState.revealedIndex].source === 'AI'">
                              STRATEGY: <b class="text-purple-400">GHOST</b>
                          </span>
                          <span v-else>
                              STRATEGY: <b class="text-blue-400">MANUAL</b>
                          </span>
                      </div>
                      
                      <!-- Calculate Result -->
                      <div class="text-xl font-bold">
                          <!-- Logic: 
                               AI + Majority HUMAN = +3
                               AI + Majority BOT = 0
                               HUMAN + Majority BOT = +2
                               HUMAN + Majority HUMAN = +1
                          -->
                             <!-- We need to calculate majority locally for display -->
                             <span v-if="Object.values(gameState.submissions[gameState.revealedIndex].votes).filter(v => v === 'HUMAN').length >= Object.values(gameState.submissions[gameState.revealedIndex].votes).filter(v => v === 'BOT').length">
                                 <!-- Majority Human -->
                                 <span v-if="gameState.submissions[gameState.revealedIndex].source === 'AI'" class="text-green-400">FOOLED (+3)</span>
                                 <span v-else class="text-blue-300">SAFE (+1)</span>
                             </span>
                             <span v-else>
                                 <!-- Majority Bot -->
                                 <span v-if="gameState.submissions[gameState.revealedIndex].source === 'AI'" class="text-red-500">CAUGHT (0)</span>
                                 <span v-else class="text-green-400">FAKED (+2)</span>
                             </span>
                      </div>
                  </div>
              </div>

           </div>

           <!-- Host Control -->
           <div v-if="isHost" class="mt-8">
               <button @click="nextReveal" data-testid="next-reveal-btn" class="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-8 rounded shadow-lg">
                   NEXT >
               </button>
           </div>
       </div>
    </div>
</template>

<style scoped>
.glitch-text {
  text-shadow: 1px 1px 0px rgba(255, 0, 255, 0.3), -1px -1px 0px rgba(0, 255, 0, 0.3);
  animation: glitch 3s infinite;
}
</style>
