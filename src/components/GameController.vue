<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { usePeer } from '../composables/usePeer';
import GameScreen from './GameScreen.vue';
import Lobby from './Lobby.vue';
import LandingPage from './setup/LandingPage.vue';
import HostSetup from './setup/HostSetup.vue';
import JoinSetup from './setup/JoinSetup.vue';
import PendingScreen from './setup/PendingScreen.vue';

const { gameState, isPending, remoteDisconnectReason, isHost, myId } = usePeer();

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
</template>
