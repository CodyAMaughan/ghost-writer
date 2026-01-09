<script setup>
import { computed, ref, onMounted } from 'vue';
import { usePeer } from './composables/usePeer';
import Lobby from './components/Lobby.vue';
import GameScreen from './components/GameScreen.vue';
import RulesModal from './components/RulesModal.vue';
import CustomAgentEditor from './components/CustomAgentEditor.vue';
import SettingsModal from './components/SettingsModal.vue';
import { HelpCircle, UserCog, Share2, Settings } from 'lucide-vue-next';
import { THEMES } from './config/themes';
import { useAudio } from './composables/useAudio';

const { gameState, isHost, returnToLobby } = usePeer();
const { init: initAudio } = useAudio();
const showRules = ref(false);
const showCustom = ref(false);
const showSettings = ref(false);

const theme = computed(() => THEMES[gameState.currentTheme] || THEMES.viral);

// Convert tailwind class to using a style helper or just map theme accent to a hex for the grid if needed.
// actually, for the grid radial gradient, we need a hex.
const accentHex = computed(() => {
    // Map simplified colors to hex for the background grid
    if(gameState.currentTheme === 'academia') return '#78350f'; // amber-900 like
    if(gameState.currentTheme === 'cyberpunk') return '#4ade80'; // green-400
    if(gameState.currentTheme === 'classic') return '#10b981'; // emerald-500
    return '#3b82f6'; // blue-500 (viral)
});

const shareMenuOpen = ref(false);

const checkClickOutside = (e) => {
    // Simple directive logic would be better but keeping it simple for now
    // If we click anything that isn't the share button, close it.
    // Actually, let's just use v-if toggle.
};

const shareTo = (platform) => {
    const text = `I'm playing Ghost Writer! Can you tell which answer was written by AI? 👻✍️`;
    const url = window.location.href;
    let shareUrl = '';

    if (platform === 'twitter') {
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    } else if (platform === 'reddit') {
        shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    } else if (platform === 'linkedin') {
        shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text + ' ' + url)}`;
    } else if (platform === 'whatsapp') {
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    }
    
    if (shareUrl) window.open(shareUrl, '_blank');
    shareMenuOpen.value = false;
};

const confirmAbort = () => {
    if (confirm("Are you sure you want to abort the game and return to lobby? All progress will be lost.")) {
        returnToLobby();
    }
};

// Wake Lock to prevent sleep
let wakeLock = null;
const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock active');
        }
    } catch (err) {
        console.error('Wake Lock failed:', err);
    }
};

const handleVisibilityChange = () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
};

onMounted(() => {
    initAudio();
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
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
                         theme.colors.accent === 'text-emerald-400' ? 'from-emerald-400 to-teal-600' :
                         'from-blue-400 to-indigo-600']">
            GHOST WRITER
            </h1>
        </div>
        
        <div class="flex items-center gap-6">
            <div v-if="gameState.roomCode" class="text-xs uppercase tracking-widest text-slate-500">
              Game Lobby: <span class="font-bold" :class="theme.colors.accent">{{ gameState.roomCode }}</span>
            </div>
            
            <!-- Icons -->
            <div class="flex gap-3 relative">
                 <button @click="shareMenuOpen = !shareMenuOpen" class="text-slate-500 hover:text-white transition-colors" title="Share">
                     <Share2 class="w-6 h-6" />
                 </button>
                 
                 <!-- Dropdown -->
                 <div v-if="shareMenuOpen" class="absolute top-10 right-0 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
                     <button @click="shareTo('twitter')" class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700">Share on X</button>
                     <button @click="shareTo('reddit')" class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700">Share on Reddit</button>
                     <button @click="shareTo('linkedin')" class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700">Share on LinkedIn</button>
                     <button @click="shareTo('whatsapp')" class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white">Share on WhatsApp</button>
                 </div>

                 <button @click="showCustom = true" class="text-slate-500 hover:text-purple-400 transition-colors" title="Edit Custom Personality">
                     <UserCog class="w-6 h-6" />
                 </button>
                 <button 
                   v-if="isHost && gameState.phase !== 'LOBBY'" 
                   @click="confirmAbort"
                   class="text-slate-500 hover:text-red-400 transition-colors mr-2" 
                   title="Abort Game and Return to Lobby">
                   <span class="text-sm font-bold">ABORT GAME</span>
                 </button>
                 <button @click="showSettings = true" class="text-slate-500 hover:text-blue-400 transition-colors" title="Settings">
                     <Settings class="w-6 h-6" />
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
      <SettingsModal :isOpen="showSettings" @close="showSettings = false" />
      <CustomAgentEditor :isOpen="showCustom" mode="EDIT" @close="showCustom = false" />

      <footer class="mt-8 text-center text-xs text-slate-500">
         <p>&copy; 2026 Ghost Writer Game. <span class="hidden md:inline"> | Deceive your friends.</span></p>
      </footer>
    </div>
  </div>
</template>
