<script setup>
import { computed } from 'vue';
import { AVATARS } from '../../config/avatars';
import { getAvatarStyle } from '../../utils/avatarStyles';

const props = defineProps({
    avatarId: { type: Number, default: 0 },
    size: { type: String, default: 'w-16 h-16' },
    showBorder: { type: Boolean, default: true },
    isClickable: { type: Boolean, default: false }
});

const avatar = computed(() => AVATARS.find(a => a.id === props.avatarId) || AVATARS[0]);
const avatarStyle = computed(() => getAvatarStyle(avatar.value.theme));

const style = computed(() => ({
    backgroundImage: `url('/avatars.png')`,
    backgroundSize: '460% 345%',
    backgroundPosition: avatar.value.bgPos
}));
</script>

<template>
  <div
    :class="[
      size, 
      'rounded-full bg-white bg-no-repeat overflow-hidden relative shadow-lg',
      isClickable ? 'transition-transform hover:scale-105 cursor-pointer' : '',
      showBorder ? `border-4 ${avatarStyle.border}` : '' 
    ]"
    :title="avatar.name"
  >
    <div
      class="w-full h-full"
      :style="style"
    />
  </div>
</template>
