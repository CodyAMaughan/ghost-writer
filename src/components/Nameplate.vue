<script setup>
import { computed } from 'vue';
import { usePeer } from '../composables/usePeer';
import { AVATARS } from '../config/avatars';
import { getAvatarStyle } from '../utils/avatarStyles';
import AvatarIcon from './icons/AvatarIcon.vue';

const props = defineProps({
    playerId: { type: String, required: true },
    displayName: { type: String, default: null }, // Override name (e.g. for AI)
    displayAvatarId: { type: [String, Number], default: null }, // Override avatar
    layout: { type: String, default: 'horizontal' }, // 'horizontal', 'vertical'
    size: { type: String, default: 'sm' }, // 'sm', 'md', 'lg', 'xl', '2xl'
    isInteractable: { type: Boolean, default: false },
    showYouBadge: { type: Boolean, default: false },
    showYouBadge: { type: Boolean, default: false },
    showAvatar: { type: Boolean, default: true },
    showName: { type: Boolean, default: true }
});

const emit = defineEmits(['click', 'click-avatar', 'click-name']);

const { gameState, myId } = usePeer();

const player = computed(() => {
    // If overrides are provided, use them
    if (props.displayName) {
        return {
            id: props.playerId,
            name: props.displayName,
            avatarId: props.displayAvatarId !== null ? props.displayAvatarId : 0
        };
    }
    
    // Otherwise try to find real player
    return gameState.players.find(p => p.id === props.playerId) || { 
        id: props.playerId, 
        name: 'Unknown', 
        avatarId: props.displayAvatarId !== null ? props.displayAvatarId : 0
    };
});

const avatar = computed(() => 
    AVATARS.find(a => a.id === player.value.avatarId) || AVATARS[0]
);

const avatarStyle = computed(() => getAvatarStyle(avatar.value.theme));

const isOwnNameplate = computed(() => props.playerId === myId.value);
const isClickable = computed(() => props.isInteractable && isOwnNameplate.value);

const sizeClasses = computed(() => {
    switch (props.size) {
        case '2xl': return { icon: 'w-20 h-20', text: 'text-2xl' }; // Lobby size
        case 'xl': return { icon: 'w-[60px] h-[60px]', text: 'text-2xl' };
        case 'lg': return { icon: 'w-12 h-12', text: 'text-xl' };
        case 'md': return { icon: 'w-10 h-10', text: 'text-lg' };
        case 'sm': 
        default: return { icon: 'w-8 h-8', text: 'text-base' };
    }
});

const handleAvatarClick = (e) => {
    if (isOwnNameplate.value) {
        e.stopPropagation();
        emit('click-avatar');
    }
};

const handleNameClick = (e) => {
    if (isOwnNameplate.value) {
        e.stopPropagation();
        emit('click-name');
    }
};

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
      layout === 'vertical' ? 'flex-col text-center' : 'flex-row'
    ]"
    :data-testid="'nameplate-container'"
    @click="handleClick"
  >
    <!-- Avatar -->
    <div @click="handleAvatarClick" :class="isOwnNameplate ? 'cursor-pointer' : ''">
        <AvatarIcon
        v-if="showAvatar"
        :avatar-id="player.avatarId"
        :size="sizeClasses.icon"
        :show-border="true"
        data-testid="nameplate-avatar"
        />
    </div>

    <!-- Text Container -->
    <div :class="['flex flex-col', layout === 'vertical' ? 'items-center' : 'items-start']">
      <!-- Top Label Slot (e.g. AUTHOR) -->
      <slot name="label-top" />

      <!-- Name with themed styling -->
      <div 
        v-if="showName"
        class="flex items-center gap-2"
        @click="handleNameClick"
        :class="isOwnNameplate ? 'cursor-pointer' : ''"
      >
        <span
          :class="[
            'font-bold leading-none',
            avatarStyle.text,
            sizeClasses.text
          ]"
          :style="{
            textShadow: `-1px -1px 0 ${avatarStyle.outline}, 1px -1px 0 ${avatarStyle.outline}, -1px 1px 0 ${avatarStyle.outline}, 1px 1px 0 ${avatarStyle.outline}`
          }"
          data-testid="nameplate-name"
        >
          {{ player.name }}
        </span>
        
        <!-- Inline Badge Slot or built-in YOU badge -->
        <span
          v-if="showYouBadge && isOwnNameplate"
          class="text-[10px] bg-slate-700 px-2 rounded-full text-white leading-normal"
        >YOU</span>
        <slot name="badge" />
      </div>

      <!-- Bottom Label Slot (e.g. Click to edit) -->
      <slot name="label-bottom" />
    </div>
  </div>
</template>
