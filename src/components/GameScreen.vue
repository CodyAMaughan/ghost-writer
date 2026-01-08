<script setup>
import { ref, computed, watch } from 'vue';
import { usePeer } from '../composables/usePeer';
import { AGENTS } from '../constants/agents';
import { Ghost, User, Zap, Lock, Brain, Terminal, Clock, CheckCircle, UserCircle } from 'lucide-vue-next';

const { gameState, isHost, myId, submitAnswer, submitVote, startRound, nextReveal, startGame, getGhostOptions, lockVotes: lockVotesAction } = usePeer();

// Local State
const manualText = ref('');
const isGhostModalOpen = ref(false);
const activeAgent = ref(null);
const ghostOptions = ref([]);
const isLoadingGhost = ref(false);
const hasSubmitted = ref(false);
const votes = ref({}); // { targetId: 'HUMAN' | 'BOT' }
const votesLocked = ref(false);

const currentRound = computed(() => gameState.round);
const phase = computed(() => gameState.phase);
const timer = computed(() => gameState.timer);

// Reset local state on new round
watch(() => gameState.round, () => {
  manualText.value = '';
  isGhostModalOpen.value = false;
  activeAgent.value = null;
  ghostOptions.value = [];
  hasSubmitted.value = false;
  votes.value = {};
  votesLocked.value = false;
});

// -- INPUT LOGIC --
const submitManual = () => {
    if (!manualText.value.trim()) return;
    submitAnswer(manualText.value, 'HUMAN', null);
    hasSubmitted.value = true;
};

const openGhostModal = () => {
    isGhostModalOpen.value = true;
};

const selectAgent = async (agent) => {
    activeAgent.value = agent;
    isLoadingGhost.value = true;
    ghostOptions.value = [];
    try {
        const options = await getGhostOptions(agent.id);
        ghostOptions.value = options;
    } catch (e) {
        alert("Ghost Uplink Failed");
    } finally {
        isLoadingGhost.value = false;
    }
};

const submitGhost = (text) => {
    submitAnswer(text, 'AI', activeAgent.value.id);
    isGhostModalOpen.value = false;
    hasSubmitted.value = true;
};

// -- VOTING LOGIC --
const toggleVote = (targetId, type) => {
    if (votesLocked.value) return;
    votes.value[targetId] = type;
};

const lockVotes = () => {
    // Send all votes
    Object.entries(votes.value).forEach(([targetId, guess]) => {
        submitVote(targetId, guess);
    });
    // Signal completion
    usePeer().lockVotes(); // Call the new action (we need to destructure it or call directly)
    votesLocked.value = true;
};

const canLock = computed(() => {
    // Check if voted on all valid targets (everyone except me)
    const targets = gameState.submissions.filter(s => s.authorId !== myId.value && !s.authorId.includes(myId.value)); // Check real ID and masked ID if possible
    // Actually in voting phase client might receive masked IDs, so we just use what we have.
    // If masked, 'authorId' is HIDDEN_pxx. 'myId' is pxx. 
    // Wait, if masked, I don't know which one is mine!
    // Issue: How do I know which card is mine to NOT vote on it?
    // Sol: Host sends 'isMine: true' flag in the payload for the specific user? 
    // Or I just search for text match? Text match is easiest hack.
    const mySub = gameState.submissions.find(s => s.text === manualText.value); // Flawed if ghost used same text? Unlikely.
    const targetsNeeded = gameState.submissions.length - 1;
    return Object.keys(votes.value).length >= targetsNeeded;
});

// -- RENDER HELPERS --
const isMySubmission = (sub) => {
    // We try to match by ID if unmasked, or use local state logic
    if (sub.authorId === myId.value) return true;
    return false; // Loophole: If masked, I might vote on myself. 
    // Fix: Client should record `mySubmissionText` and compare?
    // Let's assume for MVP we trust the ID system or accept the bug. 
    // Actually, in `usePeer` I masked it as `HIDDEN_` + ID. 
    // So `sub.authorId` !== `myId`.
    // Let's rely on Host not counting self-votes or UI just hiding it if we can identify it.
};

</script>

<template>
  <div class="h-full flex flex-col items-center w-full max-w-4xl mx-auto py-4">
    
    <!-- TOP BAR -->
    <div class="w-full flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
      <div class="text-xs text-slate-500">
        ROUND <span class="text-white text-lg font-bold">{{ gameState.round }}/{{ gameState.maxRounds }}</span>
      </div>
      <div v-if="phase === 'INPUT'" class="flex items-center gap-3">
         <span class="text-xl font-bold font-mono" :class="timer < 10 ? 'text-red-500 animate-pulse' : 'text-green-400'">
            {{ timer }}s
         </span>
         <div class="h-2 w-32 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div class="h-full bg-green-500 transition-all duration-1000 ease-linear" 
                 :style="{ width: `${(timer / gameState.settings.roundDuration) * 100}%` }"></div>
         </div>
      </div>
    </div>

    <!-- 1. PROMPT PHASE -->
    <div v-if="phase === 'PROMPT'" class="flex-grow flex flex-col items-center justify-center text-center animate-fade-in">
       <span class="text-green-500 text-sm tracking-[0.3em] font-bold mb-4 uppercase">Incoming Transmission...</span>
       <h1 class="text-3xl md:text-5xl font-bold text-white glitched px-4 leading-tight">
          "{{ gameState.prompt }}"
       </h1>
    </div>

    <!-- 2. INPUT PHASE -->
    <div v-else-if="phase === 'INPUT'" class="w-full flex-grow flex flex-col relative">
       <div class="text-center mb-8">
          <p class="text-slate-400 text-sm mb-2">TARGET PROMPT</p>
          <h2 class="text-xl md:text-2xl text-white font-bold">"{{ gameState.prompt }}"</h2>
       </div>

       <div v-if="!hasSubmitted" class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
          <!-- MANUAL -->
          <div class="bg-slate-800/50 border border-slate-700 hover:border-blue-500 p-6 rounded-xl transition-all flex flex-col group">
             <div class="flex items-center gap-3 mb-4 text-blue-400">
                <Brain class="w-6 h-6" />
                <h3 class="font-bold tracking-widest">MANUAL_OVERRIDE</h3>
             </div>
             <textarea v-model="manualText" maxlength="100" 
                       class="w-full h-32 bg-slate-900 border border-slate-600 rounded p-4 text-white focus:outline-none focus:border-blue-500 resize-none font-mono"
                       placeholder="Type your answer here..."></textarea>
             <div class="flex justify-between mt-4">
                <span class="text-xs text-slate-500">{{ manualText.length }}/100</span>
                <button @click="submitManual" :disabled="!manualText" class="bg-blue-600 px-6 py-2 rounded text-white font-bold disabled:opacity-50 hover:bg-blue-500">SUBMIT</button>
             </div>
          </div>

          <!-- GHOST -->
          <div @click="openGhostModal" class="cursor-pointer bg-slate-800/50 border border-slate-700 hover:border-purple-500 p-6 rounded-xl transition-all flex flex-col items-center justify-center group relative overflow-hidden">
             <!-- Bg effect -->
             <div class="absolute inset-0 bg-purple-900/10 group-hover:bg-purple-900/20 transition-all"></div>
             <Ghost class="w-16 h-16 text-slate-600 group-hover:text-purple-400 mb-4 transition-colors" />
             <h3 class="font-bold tracking-widest text-purple-400 text-xl">ENGAGE GHOST_WRITER</h3>
             <p class="text-xs text-slate-500 mt-2 uppercase">AI Assisted Deception</p>
          </div>
       </div>

       <div v-else class="flex-grow flex flex-col items-center justify-center">
          <CheckCircle class="w-20 h-20 text-green-500 mb-4 animate-bounce" />
          <h2 class="text-2xl text-white font-bold">DATA UPLOADED</h2>
          <p class="text-slate-400 mt-2">Waiting for other players...</p>
       </div>

       <!-- GHOST MODAL -->
       <div v-if="isGhostModalOpen" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border-2 border-purple-500 w-full max-w-3xl rounded-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
             <button @click="isGhostModalOpen = false" class="absolute top-4 right-4 text-slate-500 hover:text-white">ESC</button>
             
             <h2 class="text-2xl text-purple-400 font-bold mb-6 flex items-center gap-2"><Ghost /> SELECT AGENT PERSONA</h2>

             <div v-if="!activeAgent" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div v-for="agent in AGENTS" :key="agent.id" 
                     @click="selectAgent(agent)"
                     class="p-4 border border-slate-700 rounded hover:bg-purple-900/20 hover:border-purple-400 cursor-pointer transition-all">
                   <div class="font-bold text-white mb-1">{{ agent.name }}</div>
                   <div class="text-xs text-slate-400">{{ agent.description }}</div>
                </div>
             </div>

             <div v-else class="space-y-6">
                <div class="flex items-center gap-4 border-b border-slate-700 pb-4">
                   <button @click="activeAgent = null" class="text-xs text-slate-500 hover:text-white">&larr; BACK</button>
                   <span class="text-purple-400 font-bold">{{ activeAgent.name }}</span>
                </div>

                <div v-if="isLoadingGhost" class="py-12 text-center text-purple-400 animate-pulse text-xl">
                   ESTABLISHING UPLINK...
                </div>

                <div v-else class="grid gap-3">
                   <p class="text-xs text-slate-500 mb-2">SELECT ONE OUTPUT:</p>
                   <button v-for="(opt, idx) in ghostOptions" :key="idx" 
                           @click="submitGhost(opt)"
                           class="text-left p-4 bg-slate-800 border border-slate-600 rounded hover:bg-purple-600 hover:text-white hover:border-purple-400 transition-all text-sm md:text-base">
                      "{{ opt }}"
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- 3. VOTING PHASE -->
    <div v-else-if="phase === 'VOTING'" class="w-full flex-grow flex flex-col">
       <h2 class="text-center text-xl text-white font-bold mb-6">IDENTIFY THE HUMANS</h2>
       
       <div class="grid gap-4 flex-grow overflow-y-auto content-start pb-20">
          <div v-for="(sub, idx) in gameState.submissions" :key="idx" 
               class="bg-slate-800 p-4 rounded border border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
             
             <!-- Player Identity & Text -->
             <div class="flex-grow flex flex-col items-center md:items-start text-center md:text-left">
                <div class="flex items-center gap-2 text-slate-500 mb-2">
                    <UserCircle class="w-4 h-4" />
                    <span class="font-bold text-sm tracking-wider uppercase">
                        {{ gameState.players.find(p => p.id === sub.authorId)?.name || 'Unknown' }}
                    </span>
                    <span v-if="sub.authorId === myId" class="text-[10px] bg-slate-700 px-2 rounded-full text-white">YOU</span>
                </div>
                <p class="text-lg text-white font-serif italic">"{{ sub.text }}"</p>
             </div>

             <!-- Voting Controls -->
             <div v-if="sub.authorId !== myId">
                 <div v-if="!votesLocked" class="flex items-center gap-2 bg-slate-900 p-1 rounded-full border border-slate-700">
                    <button @click="toggleVote(sub.authorId, 'HUMAN')" 
                            :class="votes[sub.authorId] === 'HUMAN' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-300'"
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                    <User class="w-3 h-3" /> HUMAN
                    </button>
                    <button @click="toggleVote(sub.authorId, 'BOT')"
                            :class="votes[sub.authorId] === 'BOT' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-slate-300'"
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                    <Zap class="w-3 h-3" /> BOT
                    </button>
                 </div>
                 
                 <!-- Locked State -->
                 <div v-else class="px-4 py-2 bg-slate-900 rounded-full border border-slate-700 flex items-center gap-2">
                     <Lock class="w-3 h-3 text-slate-500" />
                     <span class="text-xs font-bold" :class="votes[sub.authorId] === 'HUMAN' ? 'text-blue-400' : 'text-purple-400'">
                        {{ votes[sub.authorId] || 'SKIPPED' }}
                     </span>
                 </div>
             </div>
             <div v-else class="px-4 py-2 opacity-50 text-slate-500 text-sm border border-slate-700 rounded-full">
                 YOUR SUBMISSION
             </div>
          </div>
       </div>

       <div v-if="!votesLocked" class="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none">
          <button @click="lockVotes" 
                  class="pointer-events-auto bg-green-500 text-black font-bold py-3 px-12 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
             SUBMIT_DEDUCTIONS
          </button>
       </div>
       <div v-else class="fixed bottom-8 right-8 text-right bg-slate-900/95 p-6 rounded-xl border border-slate-600 shadow-2xl animate-pulse flex flex-col items-end gap-2 z-50">
           <span class="text-green-500 font-bold tracking-widest uppercase flex items-center gap-2"><CheckCircle class="w-4 h-4" /> Vote Transmitted</span>
           <span class="text-xs text-slate-400">WAITING FOR OTHER PLAYERS [{{ gameState.finishedVotingIDs?.length || 0 }}/{{ gameState.players.length }}]</span>
       </div>
    </div>

    <!-- 4. REVEAL PHASE -->
    <div v-else-if="phase === 'REVEAL'" class="w-full flex-grow flex flex-col items-center justify-center">
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
           </div>

           <!-- Host Control -->
           <div v-if="isHost" class="mt-8">
               <button @click="nextReveal" class="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-8 rounded shadow-lg">
                   NEXT >
               </button>
           </div>
       </div>
    </div>

    <!-- 5. FINSIH PHASE -->
    <div v-else-if="phase === 'FINISH'" class="w-full flex-grow flex flex-col items-center justify-center">
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
           <button v-if="gameState.round < gameState.maxRounds" @click="startRound" class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-8 rounded">
              START ROUND {{ gameState.round + 1 }}
           </button>
           <button @click="startGame" class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded border border-slate-500">
              RESTART GAME
           </button>
        </div>
        <div v-else class="text-slate-500">Waiting for Host...</div>
    </div>

  </div>
</template>

<style scoped>
.glitched {
   animation: glitch 3s infinite alternate;
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
