<script setup>
import { ref, computed } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { THEMES } from '../../config/themes';
import { User, Zap, Lock, CheckCircle, UserCircle } from 'lucide-vue-next';

const { gameState, isHost, myId, submitVote, lockVotes: lockVotesAction } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const votes = ref({});
const votesLocked = ref(false);

const toggleVote = (targetId, type) => {
    if (votesLocked.value) return;
    votes.value[targetId] = type;
};

const lockVotes = () => {
    // Send all votes
    Object.entries(votes.value).forEach(([targetId, guess]) => {
        submitVote(targetId, guess);
    });
    usePeer().lockVotes(); 
    votesLocked.value = true;
};
</script>

<template>
    <div class="w-full flex-grow flex flex-col">
       
       <!-- NEW: Display Prompt at top -->
       <div class="text-center mb-6">
          <p class="text-slate-500 text-xs mb-1 uppercase tracking-widest">ORIGINAL PROMPT</p>
          <h2 class="text-lg md:text-xl text-white font-bold">"{{ gameState.prompt }}"</h2>
       </div>

       <h2 class="text-center text-xl text-white font-bold mb-6">IDENTIFY THE HUMANS</h2>
       
       <div class="grid gap-4 flex-grow overflow-y-auto content-start pb-20">
          <div v-for="(sub, idx) in gameState.submissions" :key="idx" 
               class="p-4 rounded border flex flex-col md:flex-row gap-4 items-center justify-between"
               :class="[theme.colors.card, theme.colors.border]">
             
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
                 <div v-if="!votesLocked" class="flex items-center gap-2 p-1 rounded-full border border-slate-700 bg-black/30">
                    <button @click="toggleVote(sub.authorId, 'HUMAN')" 
                            :data-testid="'vote-human-btn-' + sub.authorId"
                            :class="votes[sub.authorId] === 'HUMAN' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-300'"
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                    <User class="w-3 h-3" /> {{ theme.copy.voteHuman }}
                    </button>
                    <button @click="toggleVote(sub.authorId, 'BOT')"
                            :data-testid="'vote-bot-btn-' + sub.authorId"
                            :class="votes[sub.authorId] === 'BOT' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-slate-300'"
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                    <Zap class="w-3 h-3" /> {{ theme.copy.voteBot }}
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
          <button @click="lockVotes" data-testid="submit-votes-btn"
                  class="pointer-events-auto text-black font-bold py-3 px-12 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
                  :class="theme.colors.button">
             {{ theme.copy.submitVotesBtn }}
          </button>
       </div>
       <div v-else class="fixed bottom-8 right-8 text-right bg-slate-900/95 p-6 rounded-xl border border-slate-600 shadow-2xl animate-pulse flex flex-col items-end gap-2 z-50">
           <span class="text-green-500 font-bold tracking-widest uppercase flex items-center gap-2"><CheckCircle class="w-4 h-4" /> Vote Transmitted</span>
           <span class="text-xs text-slate-400">WAITING FOR OTHER PLAYERS [{{ gameState.finishedVotingIDs?.length || 0 }}/{{ gameState.players.length }}]</span>
       </div>
    </div>
</template>
