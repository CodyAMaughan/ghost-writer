<script setup>
import { } from 'vue';
import { usePeer } from '../../composables/usePeer';
import { AVATARS } from '../../config/avatars';
import AvatarIcon from '../icons/AvatarIcon.vue';
import { Ban } from 'lucide-vue-next';

defineProps({
    modelValue: { type: Boolean, required: true }
});

const emit = defineEmits(['update:modelValue']);

const { gameState, myId, updateAvatar } = usePeer();

const isTaken = (id) => {
    return gameState.players.some(p => p.avatarId === id && p.id !== myId.value);
};

const selectAvatar = (avatarId) => {
    updateAvatar(avatarId);
    emit('update:modelValue', false);
};

const close = () => {
    emit('update:modelValue', false);
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black z-[100] flex items-center justify-center p-4"
      @click.self="close"
    >
      <div class="bg-slate-900 p-6 rounded-xl border border-slate-600 max-w-lg w-full shadow-2xl animate-fade-in-up">
        <h3 class="text-white font-bold text-xl mb-6 text-center tracking-widest uppercase">
          Select Identity
        </h3>
        <div class="grid grid-cols-4 gap-4 justify-items-center max-h-[60vh] overflow-y-auto p-4">
          <button
            v-for="av in AVATARS"
            :key="av.id" 
            :disabled="isTaken(av.id)" 
            class="relative group transition-all disabled:opacity-30 disabled:cursor-not-allowed transform hover:scale-110 active:scale-95"
            @click="selectAvatar(av.id)"
          >
            <AvatarIcon
              :avatar-id="av.id"
              size="w-16 h-16"
            />
            <div
              v-if="isTaken(av.id)"
              class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
            >
              <Ban class="text-red-500 w-8 h-8" />
            </div>
          </button>
        </div>
        <button
          class="mt-8 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold uppercase tracking-widest"
          @click="close"
        >
          CANCEL
        </button>
      </div>
    </div>
  </Teleport>
</template>
