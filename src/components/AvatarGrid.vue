<script setup>
import { AVATARS } from '../config/avatars';
import { getAvatarStyle } from '../utils/avatarStyles';
import AvatarIcon from './icons/AvatarIcon.vue';

const props = defineProps({
    currentAvatarId: { type: Number, required: true },
    takenAvatarIds: { type: Array, default: () => [] }
});

const emit = defineEmits(['select']);

const isTaken = (avatarId) => {
    return props.takenAvatarIds.includes(avatarId) && avatarId !== props.currentAvatarId;
};

const handleSelect = (avatarId) => {
    if (!isTaken(avatarId)) {
        emit('select', avatarId);
    }
};

const isSelected = (avatarId) => avatarId === props.currentAvatarId;

const getContainerClasses = (avatarId) => {
    const style = getAvatarStyle(AVATARS.find(a => a.id === avatarId)?.theme || 'cyan');
    return [
        'inline-flex rounded-full transition-all',
        isTaken(avatarId) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105',
        isSelected(avatarId) ? `ring-4 ring-offset-2 ring-offset-slate-800 ${style.border.replace('border-', 'ring-')}` : ''
    ];
};
</script>

<template>
  <div class="grid grid-cols-4 gap-4 justify-items-center">
    <div
      v-for="avatar in AVATARS"
      :key="avatar.id"
      :class="getContainerClasses(avatar.id)"
      :title="isTaken(avatar.id) ? `${avatar.name} (Taken)` : avatar.name"
      @click="handleSelect(avatar.id)"
    >
      <AvatarIcon
        :avatar-id="avatar.id"
        :show-border="true"
        size="w-14 h-14"
      />
    </div>
  </div>
</template>
