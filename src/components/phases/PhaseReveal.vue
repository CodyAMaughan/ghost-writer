<script setup>
import { computed, watch } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { useAudio } from '../../composables/useAudio';
import { THEMES } from '../../config/themes';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-vue-next';
import Nameplate from '../Nameplate.vue';

const { gameState, isHost, myId, nextRevealStep } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

const currentSubmission = computed(() => gameState.submissions[gameState.revealedIndex]);

// Use shared state for synchronization
const step = computed(() => gameState.revealStep || 0);

const getAgentName = (id) => {
    if (id === 'autopilot') return 'Autopilot';
    const agent = theme.value.agents.find(a => a.id === id);
    return agent ? agent.name : id;
};

// Calculate stats for display
const stats = computed(() => {
    if (!currentSubmission.value) return { human: 0, bot: 0, total: 1 };
    const votes = Object.values(currentSubmission.value.votes || {});
    const human = votes.filter(v => v === 'HUMAN').length;
    const bot = votes.filter(v => v === 'BOT').length;
    return {
        human,
        bot,
        total: human + bot || 1
    };
});

const myVote = computed(() => {
    if (!currentSubmission.value || !currentSubmission.value.votes) return null;
    return currentSubmission.value.votes[myId.value];
});

const isMySubmission = computed(() => currentSubmission.value?.authorId === myId.value);


// AUDIO TRIGGERS
const { playSfx } = useAudio();
watch(step, (val) => {
    if (val === 1) playSfx('REVEAL_STEP');
    if (val === 2) playSfx('STAMP');
    if (val === 3) playSfx('REVEAL_STEP');
    if (val === 4) playSfx('REVEAL_STEP');
});

const advanceStep = () => {
    nextRevealStep();
};

const verdict = computed(() => {
    if (!currentSubmission.value) return '';
    return currentSubmission.value.source === 'AI' 
        ? (theme.value.reveal?.verdictAi || 'AI')
        : (theme.value.reveal?.verdictHuman || 'HUMAN');
});

const textSizeClass = computed(() => {
    if (!currentSubmission.value?.text) return 'text-2xl md:text-4xl';
    const len = currentSubmission.value.text.length;
    if (len < 30) return 'text-2xl md:text-4xl';
    if (len < 60) return 'text-xl md:text-3xl';
    return 'text-lg md:text-2xl';
});
</script>

<template>
  <div class="w-full h-full overflow-y-auto flex flex-col items-center p-4 pb-32">
    <div
      v-if="currentSubmission"
      class="w-full max-w-2xl relative my-auto min-h-[500px] h-auto flex flex-col"
    >
      <!-- Persistent Prompt -->
      <div class="text-center mb-4 animate-fade-in-down">
        <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
          ORIGINAL PROMPT
        </p>
        <h2
          class="text-lg md:text-xl text-white font-bold opacity-90 line-clamp-2"
          title="Show full prompt"
        >
          "{{ gameState.prompt }}"
        </h2>
      </div>

      <!-- MAIN CARD CONTAINER -->
      <div
        class="flex-grow flex flex-col rounded-xl shadow-2xl overflow-hidden border-2 transition-all duration-500"
        :class="[theme.colors.card, theme.colors.border]"
      >
        <!-- TOP 2/3: Author, Quote, Votes, Verdict -->
        <div class="relative flex-[2] border-b border-white/10 p-8 flex flex-col gap-6 items-center text-center">
          <!-- Row 1: Author (Visible Step 0) -->
          <transition
            enter-active-class="transition-all duration-1000 delay-300 ease-out"
            enter-from-class="opacity-0 translate-y-8 scale-90"
            enter-to-class="opacity-100 translate-y-0 scale-100"
          >
            <div 
              v-if="step >= 0"
              class="flex flex-col items-center"
            >
              <Nameplate 
                :player-id="currentSubmission.authorId" 
                layout="vertical" 
                size="xl"
              >
                <template #label-top>
                  <span class="text-sm font-bold tracking-widest text-slate-500 mb-2 uppercase">Author</span>
                </template>
              </Nameplate>
            </div>
          </transition>

          <!-- Row 2: Quote (Visible Step 0) -->
          <div class="flex-grow flex items-center justify-center w-full py-4">
            <p 
              data-testid="reveal-text"
              class="font-serif italic text-white leading-relaxed animate-fade-in-up transition-all duration-300 break-all"
              :class="textSizeClass"
            >
              "{{ currentSubmission.text }}"
            </p>
          </div>

          <!-- Row 3: Votes (Visible Step 1) -->
          <transition name="fade-slide">
            <div
              v-if="step >= 1"
              class="w-full relative py-4"
            >
              <div class="flex justify-between text-xs uppercase font-bold mb-2">
                <span class="text-blue-400">{{ theme.copy.voteHuman }} ({{ stats.human }})</span>
                <span class="text-purple-400">{{ theme.copy.voteBot }} ({{ stats.bot }})</span>
              </div>
              <div class="h-4 bg-slate-900 rounded-full overflow-hidden flex relative shadow-inner">
                <div
                  class="bg-blue-500 h-full transition-all duration-1000 ease-out"
                  :style="{ width: `${(stats.human / stats.total) * 100}%` }"
                />
                <div
                  class="bg-purple-500 h-full transition-all duration-1000 ease-out"
                  :style="{ width: `${(stats.bot / stats.total) * 100}%` }"
                />
              </div>
                           
              <!-- STAMP (Visible Step 2) - Centered on Votes -->
              <transition name="stamp-in">
                <div
                  v-if="step >= 2"
                  class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                >
                  <div
                    class="border-8 px-6 py-3 rounded-lg transform -rotate-12 backdrop-blur-md bg-black/60 shadow-2xl"
                    :class="[theme.reveal?.stampBorder || 'border-white']"
                  >
                    <h1
                      class="text-4xl md:text-5xl font-black uppercase tracking-tighter whitespace-nowrap"
                      :class="[theme.reveal?.stampColor || 'text-white']"
                    >
                      {{ verdict }}
                    </h1>
                  </div>
                </div>
              </transition>

              <!-- My Vote -->
              <div
                v-if="myVote && !isMySubmission"
                class="mt-2 text-center text-[10px] font-bold flex items-center justify-center gap-2 opacity-70"
              >
                <span class="text-slate-400">YOU VOTED:</span>
                <span :class="myVote === 'HUMAN' ? 'text-blue-400' : 'text-purple-400'">{{ myVote }}</span>
              </div>
            </div>
          </transition>
        </div>

        <!-- BOTTOM 1/3: Strategy + Result -->
        <div class="flex-[1] grid grid-cols-2 bg-black/20">
          <!-- LEFT: Strategy (Visible Step 3) -->
          <div class="border-r border-white/10 p-6 flex flex-col items-center justify-center text-center">
            <transition name="fade-slide">
              <div
                v-if="step >= 3 && currentSubmission.source === 'AI'"
                class="w-full"
              >
                <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                  {{ theme.reveal?.strategyHeader || 'STRATEGY' }}
                </p>
                <p class="text-purple-400 font-bold glitch-text text-xl md:text-2xl break-words leading-tight">
                  {{ getAgentName(currentSubmission.agent) }}
                </p>
              </div>
              <!-- If Human, maybe show something else? Or just blank/Author Human? -->
              <div
                v-else-if="step >= 3"
                class="w-full opacity-50"
              >
                <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                  {{ theme.reveal?.strategyHeader || 'SOURCE' }}
                </p>
                <p class="text-white font-bold text-xl">
                  HUMAN
                </p>
              </div>
            </transition>
          </div>

          <!-- RIGHT: Score/Result (Visible Step 4) -->
          <div class="p-6 flex flex-col items-center justify-center text-center">
            <transition name="bounce-in">
              <div
                v-if="step >= 4"
                class="w-full"
              >
                <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                  {{ theme.reveal?.resultHeader || 'RESULT' }}
                </p>
                                 
                <!-- CASE A: MY SUBMISSION -->
                <div v-if="isMySubmission">
                  <div v-if="currentSubmission.source === 'AI'">
                    <div
                      v-if="stats.human >= stats.bot"
                      class="text-green-400 font-bold flex flex-col items-center gap-1"
                    >
                      <CheckCircle class="w-8 h-8" /> 
                      <span class="text-xs md:text-base whitespace-nowrap">FOOLED (+3)</span>
                    </div>
                    <div
                      v-else
                      class="text-red-500 font-bold flex flex-col items-center gap-1"
                    >
                      <XCircle class="w-8 h-8" /> 
                      <span class="text-xs md:text-base whitespace-nowrap">CAUGHT (0)</span>
                    </div>
                  </div>
                  <div v-else>
                    <div
                      v-if="stats.bot > stats.human"
                      class="text-green-400 font-bold flex flex-col items-center gap-1"
                    >
                      <CheckCircle class="w-8 h-8" /> 
                      <span class="text-xs md:text-base whitespace-nowrap">FAKED (+2)</span>
                    </div>
                    <div
                      v-else
                      class="text-blue-300 font-bold flex flex-col items-center gap-1"
                    >
                      <CheckCircle class="w-8 h-8" /> 
                      <span class="text-xs md:text-base whitespace-nowrap">SAFE (+1)</span>
                    </div>
                  </div>
                </div>

                <!-- CASE B: I VOTED -->
                <div v-else>
                  <div
                    v-if="!myVote"
                    class="text-slate-500 font-bold flex flex-col items-center gap-1"
                  >
                    <MinusCircle class="w-8 h-8" /> 
                    <span class="text-xs md:text-base whitespace-nowrap">SKIPPED (0)</span>
                  </div>
                  <div
                    v-else-if="(myVote === 'HUMAN' && currentSubmission.source !== 'AI') || (myVote === 'BOT' && currentSubmission.source === 'AI')"
                    class="text-green-500 font-bold flex flex-col items-center gap-1"
                  >
                    <CheckCircle class="w-8 h-8" /> 
                    <span class="text-xs md:text-base whitespace-nowrap">CORRECT (+1)</span>
                  </div>
                  <div
                    v-else
                    class="text-red-500 font-bold flex flex-col items-center gap-1"
                  >
                    <XCircle class="w-8 h-8" /> 
                    <span class="text-xs md:text-base whitespace-nowrap">WRONG (0)</span>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- HOST CONTROLS -->
      <div
        v-if="isHost"
        class="fixed bottom-8 left-0 right-0 flex justify-center z-50"
      >
        <button
          data-testid="reveal-advance-btn" 
          :class="theme.colors.button"
          class="font-bold py-4 px-12 rounded-full shadow-2xl text-xl transform hover:scale-105 transition-all flex items-center gap-2 border-2 border-white/20 active:scale-95"
          @click="advanceStep"
        >
          <span v-if="step < 4">NEXT STEP >></span>
          <span v-else>{{ theme.copy.revealNext }}</span>
        </button>
      </div>
           
      <div
        v-else
        class="fixed bottom-8 text-center w-full text-slate-500 animate-pulse"
      />
    </div>
  </div>
</template>

<style scoped>
/* Stamp Animation */
.stamp-in-enter-active {
  animation: stamp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.stamp-in-leave-active {
  transition: opacity 0.2s;
}
.stamp-in-leave-to {
  opacity: 0;
}

@keyframes stamp {
  0% { transform: scale(3) rotate(0deg); opacity: 0; }
  50% { transform: scale(0.9) rotate(-12deg); opacity: 1; }
  75% { transform: scale(1.05) rotate(-12deg); }
  100% { transform: scale(1) rotate(-12deg); }
}

/* Fade Slide Animation */
.fade-slide-enter-active {
  transition: all 0.5s ease-out;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.animate-fade-in-down {
    animation: fade-in-down 0.5s ease-out;
}
@keyframes fade-in-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out;
}
@keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Bounce In Animation */
.bounce-in-enter-active {
  animation: bounce-in 0.5s;
}
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

/* Subtle Glitch */
.glitch-text {
  text-shadow: 1px 0 rgba(255,0,255,0.3), -1px 0 rgba(0,255,255,0.3);
  animation: glitch 3s infinite alternate; /* Slower, subtle */
}
@keyframes glitch {
    0% { opacity: 0.9; }
    20% { opacity: 1; transform: translateX(0); }
    22% { opacity: 0.9; transform: translateX(-1px); }
    24% { opacity: 1; transform: translateX(1px); }
    100% { opacity: 1; transform: translateX(0); }
}
</style>
