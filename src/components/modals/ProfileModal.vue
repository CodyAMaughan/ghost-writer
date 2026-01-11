<script setup>
import { ref, computed } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { X } from 'lucide-vue-next';
import AvatarGrid from '../AvatarGrid.vue';

const emit = defineEmits(['close']);

const { gameState, myId, updateAvatar, updatePlayerName } = usePeer();

const localName = ref('');
const localAvatarId = ref(0);

const myPlayer = computed(() => 
    gameState.players.find(p => p.id === myId.value)
);

// Initialize local state from current player
if (myPlayer.value) {
    localName.value = myPlayer.value.name;
    localAvatarId.value = myPlayer.value.avatarId;
}

const takenAvatarIds = computed(() => 
    gameState.players
        .filter(p => p.id !== myId.value)
        .map(p => p.avatarId)
);

const isNameValid = computed(() => {
    const trimmed = localName.value.trim();
    if (!trimmed || trimmed.length < 1) return false;
    
    // Check if name is taken by another player
    const nameTaken = gameState.players.some(p => 
        p.id !== myId.value && p.name === trimmed
    );
    
    return !nameTaken;
});

const handleAvatarSelect = (avatarId) => {
    localAvatarId.value = avatarId;
};

const handleSave = () => {
    if (!isNameValid.value) return;
    
    // Update avatar if changed
    if (localAvatarId.value !== myPlayer.value?.avatarId) {
        updateAvatar(localAvatarId.value);
    }
    
    // Update name if changed
    const trimmedName = localName.value.trim();
    if (trimmedName !== myPlayer.value?.name) {
        updatePlayerName(trimmedName);
    }
    
    emit('close');
};

const handleCancel = () => {
    emit('close');
};
</script>

<template>
  <div 
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
    @click.self="handleCancel"
  >
    <div class="bg-slate-800 rounded-xl border-2 border-slate-600 p-6 max-w-md w-full mx-4 relative">
      <!-- Close Button -->
      <button
        class="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        @click="handleCancel"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Title -->
      <h2 class="text-2xl font-bold text-white mb-6">
        Edit Profile
      </h2>

      <!-- Name Input -->
      <div class="mb-6">
        <label class="block text-xs uppercase text-slate-500 mb-2">
          Player Name
        </label>
        <input
          v-model="localName"
          type="text"
          class="w-full bg-slate-900 border border-slate-700 p-3 rounded focus:outline-none focus:border-cyan-500 text-white placeholder-slate-600"
          placeholder="Enter your name"
          maxlength="20"
        >
        <p 
          v-if="localName.trim() && !isNameValid" 
          class="text-red-400 text-xs mt-1"
        >
          This name is already taken
        </p>
      </div>

      <!-- Avatar Selection -->
      <div class="mb-6">
        <label class="block text-xs uppercase text-slate-500 mb-2">
          Choose Avatar
        </label>
        <AvatarGrid
          :current-avatar-id="localAvatarId"
          :taken-avatar-ids="takenAvatarIds"
          @select="handleAvatarSelect"
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded transition-colors"
          @click="handleCancel"
        >
          Cancel
        </button>
        <button
          class="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!isNameValid"
          @click="handleSave"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
