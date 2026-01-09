<script setup>
import { computed, ref } from 'vue';
import { usePeer } from './composables/usePeer';
import Lobby from './components/Lobby.vue';
import GameScreen from './components/GameScreen.vue';
import RulesModal from './components/RulesModal.vue';
import CustomAgentEditor from './components/CustomAgentEditor.vue';
import { HelpCircle, UserCog } from 'lucide-vue-next';
import { THEMES } from './config/themes';

const { gameState } = usePeer();
const showRules = ref(false);
const showCustom = ref(false);

const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

// Convert tailwind class to using a style helper or just map theme accent to a hex for the grid if needed.
// actually, for the grid radial gradient, we need a hex.
const accentHex = computed(() => {
    // Map simplified colors to hex for the background grid
    if(gameState.currentTheme === 'academia') return '#78350f'; // amber-900 like
    if(gameState.currentTheme === 'cyberpunk') return '#4ade80'; // green-400
    return '#3b82f6'; // blue-500 (viral)
});
</script>

<template>
  <div :class="[theme.font, theme.colors.bg, theme.colors.text]" class="min-h-screen transition-colors duration-500 relative">
    <!-- Grid Background -->
    <div class="absolute inset-0 z-0 opacity-10 pointer-events-none" 
         :style="{ backgroundImage: `radial-gradient(${accentHex} 1px, transparent 1px)`, backgroundSize: '30px 30px' }">
    </div>
    
    <div class="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">
      <header class="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4 gap-4">
        <div class="flex items-center gap-4">
            <img src="/ghost_writer_logo.png" alt="Ghost Writer Logo" class="w-12 h-12 object-contain hover:rotate-12 transition-transform" />
            <h1 class="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r animate-pulse"
                :class="[theme.colors.accent === 'text-amber-500' ? 'from-amber-400 to-orange-600' : 
                         theme.colors.accent === 'text-green-400' ? 'from-green-400 to-emerald-600' : 
                         'from-blue-400 to-indigo-600']">
            GHOST_WRITER_v1.0
            </h1>
        </div>
        
        <div class="flex items-center gap-6">
            <div v-if="gameState.roomCode" class="text-xs uppercase tracking-widest text-slate-500">
              Game Lobby: <span class="font-bold" :class="theme.colors.accent">{{ gameState.roomCode }}</span>
            </div>
            
            <!-- Icons -->
            <div class="flex gap-3">
                 <button @click="showCustom = true" class="text-slate-500 hover:text-purple-400 transition-colors" title="Edit Custom Personality">
                     <UserCog class="w-6 h-6" />
                 </button>
                 <button @click="showRules = true" class="text-slate-500 hover:text-yellow-400 transition-colors" title="Game Rules">
                     <HelpCircle class="w-6 h-6" />
                 </button>
            </div>
        </div>
      </header>

      <main class="flex-grow flex flex-col">
        <component 
          :is="gameState.phase === 'LOBBY' ? Lobby : GameScreen" 
        />
      </main>
      
      <RulesModal :isOpen="showRules" @close="showRules = false" />
      <CustomAgentEditor :isOpen="showCustom" mode="EDIT" @close="showCustom = false" />

      <footer class="mt-8 text-center text-xs text-slate-600 font-mono">
        SYSTEMSTATUS: <span :class="theme.colors.accent">ONLINE</span>
      </footer>
    </div>
  </div>
</template>
