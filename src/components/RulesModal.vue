<script setup>
import { X, Check, Award, EyeOff, Eye } from 'lucide-vue-next';

defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

import { computed } from 'vue';
import { usePeer } from '../composables/usePeer';
import { THEMES } from '../config/themes';

const { gameState } = usePeer();
const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur flex items-center justify-center p-4">
    <div class="bg-slate-800 border-2 border-slate-600 rounded-xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
         <h2 class="text-xl font-bold tracking-widest uppercase text-white">Game Rules</h2>
         <button @click="$emit('close')" class="text-slate-500 hover:text-white transition-colors"><X /></button>
      </div>
      
      <!-- Content -->
      <div class="p-6 overflow-y-auto space-y-6 text-slate-300">
         
         <section>
            <h3 class="text-white font-bold mb-2 flex items-center gap-2"><EyeOff class="w-4 h-4" /> OBJECTIVE</h3>
            <p class="text-sm">
               In each round, answer the prompt. You can write the answer yourself (HUMAN) or ask an AI Agent to write it for you (GHOST).
               Your goal is to <b>deceive</b> the other players.
            </p>
         </section>

         <section>
            <h3 class="text-white font-bold mb-2 flex items-center gap-2"><Award class="w-4 h-4"/> SCORING</h3>
            <div class="border border-slate-700 rounded overflow-hidden">
               <table class="w-full text-sm text-left">
                  <thead class="bg-slate-900 text-slate-500 uppercase text-xs">
                     <tr>
                        <th class="p-3">Your Action</th>
                        <th class="p-3">Majority Vote</th>
                        <th class="p-3">Result</th>
                        <th class="p-3 text-right">Points</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-700">
                     <tr class="bg-slate-800/50">
                        <td class="p-3 font-bold text-purple-400">Used AI</td>
                        <td class="p-3">"Human"</td>
                        <td class="p-3 text-green-400">SUCCESS (Fooled)</td>
                        <td class="p-3 text-right font-bold text-green-400">+3</td>
                     </tr>
                     <tr class="bg-slate-800/50">
                        <td class="p-3 font-bold text-purple-400">Used AI</td>
                        <td class="p-3">"Bot"</td>
                        <td class="p-3 text-red-500">CAUGHT</td>
                        <td class="p-3 text-right font-bold text-slate-500">0</td>
                     </tr>
                     <tr>
                        <td class="p-3 font-bold text-blue-400">Manual</td>
                        <td class="p-3">"Bot"</td>
                        <td class="p-3 text-green-400">SUCCESS (Faked)</td>
                        <td class="p-3 text-right font-bold text-green-400">+2</td>
                     </tr>
                     <tr>
                        <td class="p-3 font-bold text-blue-400">Manual</td>
                        <td class="p-3">"Human"</td>
                        <td class="p-3 text-blue-300">SAFE</td>
                        <td class="p-3 text-right font-bold text-blue-300">+1</td>
                     </tr>
                  </tbody>
               </table>
            </div>
            <p class="text-xs text-slate-500 mt-2">* Ties in voting are treated as "Caught" (worst case).</p>
         </section>
         
         <section>
             <h3 class="text-white font-bold mb-2 flex items-center gap-2"><Eye class="w-4 h-4"/> BONUS POINTS</h3>
             <p class="text-sm">
                 You also earn <b>+1 Point</b> for every correct guess you make about other players' submissions.
             </p>
         </section>

      </div>
      
      <div class="bg-slate-900 p-4 border-t border-slate-700 text-center">
          <button @click="$emit('close')" class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-8 rounded transition-colors">CLOSE</button>
      </div>
    </div>
  </div>
</template>
