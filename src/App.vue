<script setup>
import { computed, ref, onMounted } from 'vue';
import { usePeer } from './composables/usePeer';
import Lobby from './components/Lobby.vue';
import GameScreen from './components/GameScreen.vue';
import RulesModal from './components/RulesModal.vue';
import CustomAgentEditor from './components/CustomAgentEditor.vue';
import SettingsModal from './components/SettingsModal.vue';
import { HelpCircle, UserCog, Share2, Settings, EyeOff } from 'lucide-vue-next';
import DiscordIcon from './components/icons/DiscordIcon.vue';
import { THEMES } from './config/themes';
import { useAudio } from './composables/useAudio';
import { useStreamerMode } from './composables/useStreamerMode';

const { gameState, isHost, returnToLobby } = usePeer();
const { isStreamerMode } = useStreamerMode();
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
  <div
    :class="[theme.font, theme.colors.bg, theme.colors.text]"
    class="min-h-screen transition-colors duration-500 relative"
  >
    <!-- Grid Background -->
    <div
      class="absolute inset-0 z-0 opacity-10 pointer-events-none" 
      :style="{ backgroundImage: `radial-gradient(${accentHex} 1px, transparent 1px)`, backgroundSize: '30px 30px' }"
    />
    
    <div class="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">
      <header class="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4 gap-4">
        <div class="flex items-center gap-4">
          <img
            src="/ghost_writer_logo.png"
            alt="Ghost Writer Logo"
            class="w-12 h-12 object-contain hover:rotate-12 transition-transform"
          >
          <h1
            class="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r animate-pulse"
            :class="[theme.colors.accent === 'text-amber-500' ? 'from-amber-400 to-orange-600' : 
              theme.colors.accent === 'text-green-400' ? 'from-green-400 to-emerald-600' : 
              theme.colors.accent === 'text-emerald-400' ? 'from-emerald-400 to-teal-600' :
              'from-blue-400 to-indigo-600']"
          >
            GHOST WRITER
          </h1>
        </div>
        
        <div class="flex items-center gap-6">
          <div
            v-if="gameState.roomCode"
            class="text-xs uppercase tracking-widest text-slate-500"
          >
            Game Lobby: 
            <span
              v-if="!isStreamerMode"
              class="font-bold"
              :class="theme.colors.accent"
              data-testid="header-room-code"
            >{{ gameState.roomCode }}</span>
            <span
              v-else
              class="font-bold flex items-center gap-1"
              :class="theme.colors.accent"
              data-testid="header-room-code-masked"
            >
              <EyeOff class="w-3 h-3" />
              HIDDEN
            </span>
          </div>
            
          <!-- Icons -->
          <div class="flex gap-3 relative z-50">
            <!-- Backdrop for click outside -->
            <div
              v-if="shareMenuOpen"
              class="fixed inset-0 z-40 cursor-default"
              @click="shareMenuOpen = false"
            />

            <button
              class="text-slate-500 hover:text-white transition-colors relative z-50"
              title="Share"
              @click="shareMenuOpen = !shareMenuOpen"
            >
              <Share2 class="w-6 h-6" />
            </button>
                 
            <!-- Dropdown -->
            <div
              v-if="shareMenuOpen"
              class="absolute top-12 right-0 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-fade-in-down"
            >
              <button
                class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700 flex items-center gap-3"
                @click="shareTo('twitter')"
              >
                <img
                  src="https://www.google.com/s2/favicons?domain=x.com&sz=64"
                  alt="X"
                  class="w-4 h-4 rounded-sm"
                > Share on X
              </button>
              <button
                class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700 flex items-center gap-3"
                @click="shareTo('reddit')"
              >
                <img
                  src="https://www.google.com/s2/favicons?domain=reddit.com&sz=64"
                  alt="Reddit"
                  class="w-4 h-4"
                > Share on Reddit
              </button>
              <button
                class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700 flex items-center gap-3"
                @click="shareTo('linkedin')"
              >
                <img
                  src="https://www.google.com/s2/favicons?domain=linkedin.com&sz=64"
                  alt="LinkedIn"
                  class="w-4 h-4"
                > Share on LinkedIn
              </button>
              <button
                class="px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-3"
                @click="shareTo('whatsapp')"
              >
                <img
                  src="https://www.google.com/s2/favicons?domain=whatsapp.com&sz=64"
                  alt="WhatsApp"
                  class="w-4 h-4"
                > Share on WhatsApp
              </button>
            </div>

            <!-- Discord Invite -->
            <a
              href="https://discord.gg/nVSSqR8gAJ"
              target="_blank"
              class="text-slate-500 hover:text-[#5865F2] transition-colors relative z-50 flex items-center"
              title="Join us on Discord"
            >
              <DiscordIcon class="w-6 h-6" />
            </a>

            <button
              class="text-slate-500 hover:text-purple-400 transition-colors"
              title="Edit Custom Personality"
              @click="showCustom = true"
            >
              <UserCog class="w-6 h-6" />
            </button>
            <button
              class="text-slate-500 hover:text-blue-400 transition-colors"
              title="Settings"
              @click="showSettings = true"
            >
              <Settings class="w-6 h-6" />
            </button>
            <button
              class="text-slate-500 hover:text-yellow-400 transition-colors"
              title="Game Rules"
              @click="showRules = true"
            >
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
      
      <RulesModal
        :is-open="showRules"
        @close="showRules = false"
      />
      <SettingsModal
        :is-open="showSettings"
        @close="showSettings = false"
      />
      <CustomAgentEditor
        :is-open="showCustom"
        mode="EDIT"
        @close="showCustom = false"
      />

      <footer class="mt-8 text-center text-xs text-slate-500">
        <p>&copy; 2026 Ghost Writer Game. <span class="hidden md:inline"> | Deceive your friends.</span></p>
      </footer>
    </div>
  </div>
</template>
