<script setup>
import { ref, watch, computed } from 'vue';
import { usePeer } from '../composables/usePeer';
import { EMOTE_REGISTRY } from '../config/emotes';

const { lastReaction } = usePeer();

const reactions = ref([]);

watch(lastReaction, (newReaction) => {
    if (!newReaction) return;
    
    const def = EMOTE_REGISTRY[newReaction.emoteId];
    if (!def) return;
    
    const reaction = {
        id: newReaction.id || Date.now() + Math.random(),
        char: def.char,
        x: Math.random() * 80 + 10, // 10% to 90% width
        y: Math.random() * 80 + 10 // 10% to 90% height
    };
    
    reactions.value.push(reaction);
    
    // Auto remove
    setTimeout(() => {
        reactions.value = reactions.value.filter(r => r.id !== reaction.id);
    }, 2000);
});
</script>

<template>
  <div class="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
    <transition-group name="emote-pop">
      <div 
        v-for="r in reactions" 
        :key="r.id"
        class="absolute text-6xl select-none reaction-emote"
        :style="{ left: r.x + '%', top: r.y + '%' }"
      >
        {{ r.char }}
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.emote-pop-enter-active {
  animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.emote-pop-leave-active {
  transition: all 1s ease-out;
}
.emote-pop-leave-to {
  opacity: 0;
  transform: translateY(-100px) scale(0.5);
}

@keyframes pop-in {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
