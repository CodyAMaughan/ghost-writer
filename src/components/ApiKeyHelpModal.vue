<script setup>
import { X, ExternalLink, Copy, Check } from 'lucide-vue-next';
import { ref } from 'vue';

defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

const copied = ref(false);

const copyLink = async () => {
    try {
        await navigator.clipboard.writeText("https://aistudio.google.com/app/apikey");
        copied.value = true;
        setTimeout(() => copied.value = false, 2000);
    } catch(e) {
        console.error(e);
    }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] bg-black/90 backdrop-blur flex items-center justify-center p-4">
    <div class="bg-slate-800 border-2 border-slate-600 rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
         <h2 class="text-xl font-bold tracking-wider text-white flex items-center gap-2">
            GETTING AN API KEY
         </h2>
         <button @click="$emit('close')" class="text-slate-500 hover:text-white transition-colors"><X /></button>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-y-auto text-slate-300 space-y-6">
         
         <div class="bg-emerald-900/30 border border-emerald-500/50 p-4 rounded-lg">
             <h3 class="text-emerald-400 font-bold mb-1">RECOMMENDED: Google Gemini</h3>
             <p class="text-sm text-emerald-100/80">Fast, smart, and has a very generous free tier (no credit card usually required).</p>
         </div>

         <ol class="list-decimal list-inside space-y-4 text-sm marker:text-slate-500">
             <li class="pl-2">
                 <span class="font-bold text-white">Go to Google AI Studio</span>
                 <div class="mt-2 flex items-center gap-2">
                     <div class="flex-grow bg-black/50 p-2 rounded text-xs font-mono text-slate-400 truncate">
                         https://aistudio.google.com/app/apikey
                     </div>
                     <button @click="copyLink" class="p-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors" title="Copy Link">
                         <Check v-if="copied" class="w-4 h-4 text-green-400" />
                         <Copy v-else class="w-4 h-4" />
                     </button>
                     <a href="https://aistudio.google.com/app/apikey" target="_blank" class="p-2 bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors flex items-center gap-1">
                         OPEN <ExternalLink class="w-3 h-3" />
                     </a>
                 </div>
             </li>
             <li class="pl-2">
                 <span class="font-bold text-white">Sign in with Google</span>
             </li>
             <li class="pl-2">
                 <span class="font-bold text-white">Click "Create API Key"</span>
             </li>
             <li class="pl-2">
                 <span class="font-bold text-white">Copy the key and paste it here</span>
             </li>
         </ol>

         <div class="border-t border-slate-700 pt-4 mt-4">
             <h3 class="text-white font-bold mb-2 text-sm">Alternative: OpenAI</h3>
             <p class="text-xs text-slate-400">
                 You can also use an OpenAI API Key (GPT-4o/mini), but it requires a paid account with credit balance.
             </p>
         </div>

      </div>
      
      <div class="bg-slate-900 p-4 border-t border-slate-700 text-center">
          <button @click="$emit('close')" class="bg-white text-slate-900 hover:bg-slate-200 font-bold py-3 px-8 rounded transition-colors w-full">Got it!</button>
      </div>
    </div>
  </div>
</template>
