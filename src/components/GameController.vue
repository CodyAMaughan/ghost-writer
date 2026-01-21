<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { usePeer } from '../composables/usePeer';
import { useAudio } from '../composables/useAudio';
import GameScreen from './GameScreen.vue';
import Lobby from './Lobby.vue';
import LandingPage from './setup/LandingPage.vue';
import HostSetup from './setup/HostSetup.vue';
import JoinSetup from './setup/JoinSetup.vue';
import PendingScreen from './setup/PendingScreen.vue';
import PlayerManagerModal from './modals/PlayerManagerModal.vue';
import GlobalNotification from './common/GlobalNotification.vue';
import { Users } from 'lucide-vue-next';

const showPlayerManager = ref(false);

const { gameState, isPending, remoteDisconnectReason, isHost, myId } = usePeer();
const { playMusic, validateMusic } = useAudio();

// Centralized Music Orchestration
const updateMusic = () => {
    if (gameState.phase === 'LOBBY') {
        playMusic('BGM_LOBBY');
    } else {
        // In Game
        const key = 'BGM_' + (gameState.currentTheme || 'viral').toUpperCase();
        playMusic(key);
    }
};

// Watch Phase Changes
watch(() => gameState.phase, (newPhase) => {
    updateMusic();
    // Ensure audio context is valid if we just started
    if (newPhase !== 'LOBBY') {
        validateMusic(newPhase, gameState.currentTheme);
    }
}, { immediate: true });

// Watch Theme Changes (e.g., Host changes theme mid-game or lobby)
watch(() => gameState.currentTheme, () => {
    // Only update if we are NOT in lobby (Lobby always uses BGM_LOBBY regardless of theme selection)
    // Wait, actually if they change theme in lobby, does it play that theme? 
    // The previous logic was "Lobby always BGM_LOBBY".
    // Let's keep that simple. 
    if (gameState.phase !== 'LOBBY') {
        updateMusic();
    }
});

// Local UI Mode (replaces the mode inside Lobby.vue)
const mode = ref('LANDING'); // LANDING, HOSTING, JOINING

// Derived view state
const currentView = computed(() => {
    // 1. If Game is Active (Not LOBBY), show GameScreen
    if (gameState.phase !== 'LOBBY') {
        return GameScreen;
    }

    // 2. If Pending (Waiting Room), show Pending
    if (isPending.value) {
        return PendingScreen;
    }

    // 3. If I am in the player list (Joined/Hosted), show Lobby Waiting Room
    const amIInGame = gameState.players.some(p => p.id === myId.value);
    if (amIInGame) {
        return Lobby;
    }

    // 4. Setup Flows
    if (mode.value === 'HOSTING') return HostSetup;
    if (mode.value === 'JOINING') return JoinSetup;

    // 5. Default
    return LandingPage;
});

// Watchers to auto-switch modes
watch(remoteDisconnectReason, (reason) => {
    if (reason) {
        mode.value = 'LANDING';
    }
});

// Initial URL Check
const initialRoomCode = ref('');

onMounted(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    if (room) {
        mode.value = 'JOINING';
        initialRoomCode.value = room;

        // Clean URL
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }
});
</script>

<template>
  <component 
    :is="currentView"
    :initial-code="initialRoomCode"
    @navigate="(newMode) => mode = newMode"
    @back="mode = 'LANDING'"
    @leave="mode = 'LANDING'"
  />

  <GlobalNotification />

  <button
    v-if="isHost"
    class="fixed top-4 left-4 z-40 bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full border border-slate-600 shadow-xl backdrop-blur transition-all hover:scale-110"
    title="Host Controls"
    @click="showPlayerManager = true"
  >
    <Users class="w-6 h-6" />
  </button>

  <PlayerManagerModal 
    :is-open="showPlayerManager" 
    @close="showPlayerManager = false" 
  />
</template>
