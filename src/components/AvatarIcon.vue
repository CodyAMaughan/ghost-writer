<script setup>
import { computed } from 'vue';
import { AVATARS } from '../config/avatars';

const props = defineProps({
    avatarId: { type: Number, default: 0 },
    size: { type: String, default: 'w-16 h-16' }, // Default size large
    showBorder: { type: Boolean, default: true }
});

const avatar = computed(() => AVATARS.find(a => a.id === props.avatarId) || AVATARS[0]);

const style = computed(() => ({
    backgroundImage: `url('/avatars.png')`,
    backgroundSize: '460% 345%', // Zoom in slightly to crop margins
    backgroundPosition: avatar.value.bgPos
}));
</script>

<template>
  <div
    :class="[
      size, 
      'rounded-full bg-white bg-no-repeat overflow-hidden relative shadow-lg transition-transform hover:scale-105', 
      showBorder ? `border-4 ${avatar.color.split(' ')[0]}` : '' 
    ]"
    :title="avatar.name"
  >
    <div
      class="w-full h-full"
      :style="style"
    />
  </div>
</template>
