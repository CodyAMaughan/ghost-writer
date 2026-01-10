<script setup>
import { useAudio } from '../composables/useAudio';
import { X, Volume2, VolumeX, Music, Speaker, Settings } from 'lucide-vue-next';

defineProps(['isOpen']);
defineEmits(['close']);

const { masterVolume, musicVolume, sfxVolume, isMuted, syncVolumes, playSfx } = useAudio();

const update = () => {
    syncVolumes();
};

const toggleMute = () => {
    isMuted.value = !isMuted.value;
    syncVolumes();
};

const testSfx = () => {
    playSfx('CLICK');
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
  >
    <div class="bg-slate-800 w-full max-w-md rounded-xl border border-slate-600 shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 class="text-white font-bold flex items-center gap-2">
          <Settings class="w-5 h-5 text-slate-400" />
          SETTINGS
        </h2>
        <button
          class="text-slate-400 hover:text-white transition-colors"
          @click="$emit('close')"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-8">
        <!-- Master -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-xs uppercase text-slate-500 font-bold">Master Volume</label>
            <button
              class="text-slate-400 hover:text-white"
              @click="toggleMute"
            >
              <VolumeX
                v-if="isMuted"
                class="w-5 h-5 text-red-500"
              />
              <Volume2
                v-else
                class="w-5 h-5"
              />
            </button>
          </div>
          <input
            v-model.number="masterVolume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            :disabled="isMuted" 
            :class="{ 'opacity-50': isMuted }"
            @input="update"
          >
        </div>

        <!-- Channels -->
        <div class="space-y-4 pt-4 border-t border-slate-700/50">
          <!-- Music -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs uppercase text-slate-400">
              <span class="flex items-center gap-2"><Music class="w-4 h-4" /> Music</span>
              <span>{{ Math.round(musicVolume * 100) }}%</span>
            </div>
            <input
              v-model.number="musicVolume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              @input="update"
            >
          </div>

          <!-- SFX -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs uppercase text-slate-400">
              <span class="flex items-center gap-2"><Speaker class="w-4 h-4" /> Sound FX</span>
              <span>{{ Math.round(sfxVolume * 100) }}%</span>
            </div>
            <div class="flex items-center gap-4">
              <input
                v-model.number="sfxVolume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="w-full accent-green-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                @input="update"
              >
              <button
                class="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-white"
                @click="testSfx"
              >
                TEST
              </button>
            </div>
          </div>
        </div>
      </div>
            
      <!-- Footer -->
      <div class="p-4 bg-black/20 text-center">
        <p class="text-[10px] text-slate-600">
          Audio engine powered by Howler.js
        </p>
      </div>
    </div>
  </div>
</template>
