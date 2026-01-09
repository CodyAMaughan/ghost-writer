<script setup>
import { ref } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { AGENTS } from '../../constants/agents';
import { Ghost, Brain, CheckCircle, UserCog } from 'lucide-vue-next';
import CustomAgentEditor from '../CustomAgentEditor.vue';

const { gameState, submitAnswer, getGhostOptions } = usePeer();

// Local State
const manualText = ref('');
const isGhostModalOpen = ref(false);
const isCustomEditorOpen = ref(false); // For generating
const activeAgent = ref(null);
const ghostOptions = ref([]);
const isLoadingGhost = ref(false);
const hasSubmitted = ref(false);

// Logic
const submitManual = () => {
    if (!manualText.value.trim()) return;
    submitAnswer(manualText.value, 'HUMAN', null);
    hasSubmitted.value = true;
};

const openGhostModal = () => {
    isGhostModalOpen.value = true;
};

const selectAgent = async (agent) => {
    if (agent.id === 'custom') {
        isCustomEditorOpen.value = true;
        return;
    }
    
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

const handleCustomGenerate = async (customData) => {
    activeAgent.value = { id: 'custom', name: customData.name, description: 'Custom Protocol' };
    isCustomEditorOpen.value = false; 
    
    isLoadingGhost.value = true;
    ghostOptions.value = [];
    
    try {
        const options = await getGhostOptions('custom', customData.systemPrompt);
        ghostOptions.value = options;
    } catch(e) {
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
</script>

<template>
    <div class="w-full flex-grow flex flex-col relative">
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
             <textarea v-model="manualText" maxlength="100" data-testid="manual-input"
                       class="w-full h-32 bg-slate-900 border border-slate-600 rounded p-4 text-white focus:outline-none focus:border-blue-500 resize-none font-mono"
                       placeholder="Type your answer here..."></textarea>
             <div class="flex justify-between mt-4">
                <span class="text-xs text-slate-500">{{ manualText.length }}/100</span>
                <button @click="submitManual" :disabled="!manualText" data-testid="submit-manual-btn" class="bg-blue-600 px-6 py-2 rounded text-white font-bold disabled:opacity-50 hover:bg-blue-500">SUBMIT</button>
             </div>
          </div>

          <!-- GHOST -->
          <div @click="openGhostModal" data-testid="open-ghost-modal-btn" class="cursor-pointer bg-slate-800/50 border border-slate-700 hover:border-purple-500 p-6 rounded-xl transition-all flex flex-col items-center justify-center group relative overflow-hidden">
             <div class="absolute inset-0 bg-purple-900/10 group-hover:bg-purple-900/20 transition-all"></div>
             <Ghost class="w-16 h-16 text-slate-600 group-hover:text-purple-400 mb-4 transition-colors" />
             <h3 class="font-bold tracking-widest text-purple-400 text-xl">ENGAGE GHOST_WRITER</h3>
             <p class="text-xs text-slate-500 mt-2 uppercase">AI Assisted Deception</p>
          </div>
       </div>

       <div v-else class="flex-grow flex flex-col items-center justify-center" data-testid="data-uploaded-msg">
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
                     :data-testid="'agent-select-btn-' + agent.id"
                     class="p-4 border border-slate-700 rounded hover:bg-purple-900/20 hover:border-purple-400 cursor-pointer transition-all">
                   <div class="font-bold text-white mb-1">{{ agent.name }}</div>
                   <div class="text-xs text-slate-400">{{ agent.description }}</div>
                </div>
                <!-- Custom Button -->
                <div @click="selectAgent({id:'custom'})"
                     data-testid="agent-custom-btn"
                     class="p-4 border border-dashed border-purple-600/50 rounded hover:bg-purple-900/20 hover:border-purple-400 cursor-pointer transition-all flex flex-col items-center justify-center gap-2">
                   <UserCog class="w-6 h-6 text-purple-400" />
                   <div class="font-bold text-purple-400 uppercase tracking-wider text-xs">Custom Protocol</div>
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
                           :data-testid="'ghost-option-btn-' + idx"
                           class="text-left p-4 bg-slate-800 border border-slate-600 rounded hover:bg-purple-600 hover:text-white hover:border-purple-400 transition-all text-sm md:text-base">
                      "{{ opt }}"
                   </button>
                </div>
             </div>
          </div>
       </div>

       <CustomAgentEditor :isOpen="isCustomEditorOpen" mode="GENERATE" 
                       @close="isCustomEditorOpen = false" 
                       @generate="handleCustomGenerate" />
    </div>
</template>
