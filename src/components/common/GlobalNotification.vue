<script setup>
import { usePeer } from '../../composables/usePeer';
import { X, Info, AlertTriangle, CheckCircle, WifiOff } from 'lucide-vue-next';

const { notifications } = usePeer();

const removeNotification = (id) => {
    const idx = notifications.findIndex(n => n.id === id);
    if (idx !== -1) notifications.splice(idx, 1);
};

const getIcon = (type) => {
    switch (type) {
        case 'error': return WifiOff;
        case 'success': return CheckCircle;
        case 'warning': return AlertTriangle;
        default: return Info;
    }
};

const getColor = (type) => {
    switch (type) {
        case 'error': return 'bg-red-500 text-white';
        case 'success': return 'bg-green-500 text-white';
        case 'warning': return 'bg-yellow-500 text-black';
        default: return 'bg-slate-700 text-white border border-slate-500';
    }
};
</script>

<template>
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[150] flex flex-col gap-2 w-full max-w-sm pointer-events-none p-4">
        <TransitionGroup name="toast">
            <div 
                v-for="note in notifications" 
                :key="note.id"
                class="pointer-events-auto flex items-center gap-3 p-3 rounded-lg shadow-lg backdrop-blur-md animate-fade-in transition-all"
                :class="getColor(note.type)"
            >
                <component :is="getIcon(note.type)" class="w-5 h-5 shrink-0" />
                <span class="text-sm font-medium flex-1">{{ note.message }}</span>
                <button @click="removeNotification(note.id)" class="hover:opacity-75">
                    <X class="w-4 h-4" />
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
