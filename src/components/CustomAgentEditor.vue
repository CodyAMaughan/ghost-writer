<script setup>
import { ref, computed, onMounted } from 'vue';
import { UserCog, Sparkles, Save, X } from 'lucide-vue-next';

// Props
const props = defineProps({
  isOpen: Boolean,
  mode: {
    type: String,
    default: 'EDIT' // 'EDIT' or 'GENERATE'
  }
});

const emit = defineEmits(['close', 'generate', 'save']);

// Local State
const customAgent = ref({
    name: 'My Custom Valid', // Default
    prompt: 'You are a sarcastic robot.'
});

const MAX_PROMPT_LEN = 100;

// Load from LocalStorage
onMounted(() => {
    const stored = localStorage.getItem('gw_custom_agent');
    if (stored) {
        try {
            customAgent.value = JSON.parse(stored);
        } catch(e) {}
    }
});

const promptChars = computed(() => customAgent.value.prompt.length);

const saveAgent = () => {
    localStorage.setItem('gw_custom_agent', JSON.stringify(customAgent.value));
};

const handleGenerate = () => {
    if (!customAgent.value.name || !customAgent.value.prompt) return;
    saveAgent();
    // Append the constraint here or let the parent do it? 
    // The prompt says "don't require user to have this, always append it". 
    // We pass the raw prompt to parent, parent/service appends standard constraint.
    emit('generate', {
        name: customAgent.value.name,
        systemPrompt: customAgent.value.prompt
    });
};

const handleSave = () => {
    saveAgent();
    emit('save');
    emit('close');
};

</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center p-4">
      <div class="bg-slate-900 border-2 border-purple-500 rounded-xl w-full max-w-lg shadow-2xl relative">
          
          <button @click="$emit('close')" class="absolute top-4 right-4 text-slate-500 hover:text-white"><X /></button>
          
          <div class="p-6">
              <h2 class="text-xl font-bold text-purple-400 mb-1 flex items-center gap-2">
                  <UserCog class="w-6 h-6" /> CUSTOM GHOST PROTOCOL
              </h2>
              <p class="text-xs text-slate-500 mb-6 uppercase tracking-widest">Define your automated persona</p>

              <div class="space-y-4">
                  <!-- Name Input -->
                  <div>
                      <label class="block text-xs uppercase text-slate-400 mb-1">Agent Name</label>
                      <input v-model="customAgent.name" maxlength="15" data-testid="custom-agent-name" 
                             class="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none placeholder-slate-600"
                             placeholder="e.g. Sarcasto-Bot" />
                  </div>

                  <!-- Prompt Input -->
                  <div>
                      <label class="block text-xs uppercase text-slate-400 mb-1">Personality System Prompt</label>
                      <textarea v-model="customAgent.prompt" :maxlength="MAX_PROMPT_LEN" rows="4" data-testid="custom-agent-prompt"
                                class="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:border-purple-500 focus:outline-none placeholder-slate-600 resize-none"
                                placeholder="e.g. Answer like a pirate. Be rude but funny."></textarea>
                      <div class="flex justify-between mt-1 text-[10px] text-slate-500">
                          <span>* "Keep it under 15 words" will be appended automatically.</span>
                          <span :class="{'text-red-500': promptChars === MAX_PROMPT_LEN}">{{ promptChars }}/{{ MAX_PROMPT_LEN }}</span>
                      </div>
                  </div>
              </div>

              <!-- Actions -->
              <div class="mt-8 flex gap-3">
                  <button v-if="mode === 'GENERATE'" @click="handleGenerate" :disabled="!customAgent.name" data-testid="custom-agent-generate-btn"
                          class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded shadow-lg shadow-purple-900/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Sparkles class="w-4 h-4" /> GENERATE RESPONSE
                  </button>
                  <button @click="handleSave" data-testid="custom-agent-save-btn" 
                          class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded border border-slate-600 flex items-center justify-center gap-2">
                      <Save class="w-4 h-4" /> SAVE PROFILE
                  </button>
              </div>
          </div>
      </div>
  </div>
</template>
