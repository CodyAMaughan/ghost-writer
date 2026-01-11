<script setup>
import { computed } from 'vue';
import { usePeer } from '../composables/usePeer';
import { AVATARS } from '../config/avatars';
import { getAvatarStyle } from '../utils/avatarStyles';
import AvatarIcon from './icons/AvatarIcon.vue';

const props = defineProps({
    playerId: { type: String, required: true },
    variant: { type: String, default: 'default' }, // 'default', 'minimal', 'vertical'
    isInteractable: { type: Boolean, default: false }
});

const emit = defineEmits(['click']);

const { gameState, myId } = usePeer();

const player = computed(() => {
    return gameState.players.find(p => p.id === props.playerId) || { 
        id: props.playerId, 
        name: 'Unknown', 
        avatarId: 0 
    };
});

const avatar = computed(() => 
    AVATARS.find(a => a.id === player.value.avatarId) || AVATARS[0]
);

const avatarStyle = computed(() => getAvatarStyle(avatar.value.theme));

const isOwnNameplate = computed(() => props.playerId === myId.value);
const isClickable = computed(() => props.isInteractable && isOwnNameplate.value);

const handleClick = () => {
    if (isClickable.value) {
        emit('click');
    }
};
</script>

<template>
  <div
    :class="[
      'nameplate inline-flex items-center gap-2',
      isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
      variant === 'vertical' ? 'flex-col' : 'flex-row'
    ]"
    :data-testid="'nameplate-container'"
    @click="handleClick"
  >
    <!-- Avatar (if not minimal variant) -->
    <AvatarIcon
      v-if="variant !== 'minimal'"
      :avatar-id="player.avatarId"
      :size="variant === 'vertical' ? 'w-12 h-12' : 'w-8 h-8'"
      :show-border="true"
      data-testid="nameplate-avatar"
    />

    <!-- Name with themed styling -->
    <span
      :class="[
        'font-bold',
        avatarStyle.text
      ]"
      :style="{
        textShadow: `0 0 8px ${avatarStyle.glow}`
      }"
      data-testid="nameplate-name"
    >
      {{ player.name }}
    </span>
  </div>
</template>
