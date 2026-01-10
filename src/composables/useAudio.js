import { ref } from 'vue';
import { Howl, Howler } from 'howler';
import { SOUNDS } from '../config/sounds';

// Singleton State (Shared across components)
const masterVolume = ref(parseFloat(localStorage.getItem('gw_vol_master') ?? 1));
const musicVolume = ref(parseFloat(localStorage.getItem('gw_vol_music') ?? 0.5));
const sfxVolume = ref(parseFloat(localStorage.getItem('gw_vol_sfx') ?? 0.8));
const isMuted = ref(localStorage.getItem('gw_muted') === 'true');

// Cache
const soundCache = {};
let currentMusic = null;
let currentMusicKey = null;

// Initial Sync
Howler.volume(masterVolume.value);
Howler.mute(isMuted.value);

export function useAudio() {

    const syncVolumes = () => {
        Howler.volume(masterVolume.value);
        Howler.mute(isMuted.value);

        // Update active music volume
        if (currentMusic && currentMusicKey) {
            const def = SOUNDS[currentMusicKey];
            currentMusic.volume(def.volume * musicVolume.value);
        }

        // Persist
        localStorage.setItem('gw_vol_master', masterVolume.value);
        localStorage.setItem('gw_vol_music', musicVolume.value);
        localStorage.setItem('gw_vol_sfx', sfxVolume.value);
        localStorage.setItem('gw_muted', isMuted.value);
    };

    // We expose a watcher setup helper or just let the UI call sync?
    // I'll expose usage of watch in the component that modifies values (SettingsModal).

    const playSfx = (key) => {
        if (isMuted.value) return;
        const def = SOUNDS[key];
        if (!def) return;

        let sound = soundCache[key];
        if (!sound) {
            sound = new Howl({ src: [def.src] });
            soundCache[key] = sound;
        }

        // Calculate Volume: Def * SFX Setting
        // (Master is handled globally by Howler)
        const vol = (def.volume || 1) * sfxVolume.value;
        sound.volume(vol);

        // Variance (Pitch/Rate)
        if (def.variance) {
            // e.g. 0.1 variance => 0.9 to 1.1
            // Math.random() is 0..1. 
            // (0.5 * 0.2) = 0.1.
            // Let's do: 1.0 + (random() * var * 2 - var)
            const rate = 1.0 + (Math.random() * def.variance * 2 - def.variance);
            sound.rate(rate);
        } else {
            sound.rate(1.0);
        }

        sound.play();
    };

    const playMusic = (key) => {
        if (currentMusicKey === key && currentMusic?.playing()) return;

        // Fade out old
        if (currentMusic) {
            currentMusic.fade(currentMusic.volume(), 0, 1000);
            const old = currentMusic;
            setTimeout(() => old.stop(), 1000);
        }

        const def = SOUNDS[key];
        if (!def) return;

        let sound = soundCache[key];
        if (!sound) {
            sound = new Howl({ src: [def.src], loop: def.loop ?? true });
            soundCache[key] = sound;
        }

        currentMusic = sound;
        currentMusicKey = key;

        // Fade In
        const targetVol = (def.volume || 1) * musicVolume.value;
        sound.volume(0);
        sound.play();
        sound.fade(0, targetVol, 1000);
    };

    const stopMusic = () => {
        if (currentMusic) {
            currentMusic.fade(currentMusic.volume(), 0, 1000);
            setTimeout(() => {
                currentMusic.stop();
                currentMusic = null;
                currentMusicKey = null;
            }, 1000);
        }
    };

    const init = () => {
        // Preload UI basics
        ['CLICK', 'HOVER'].forEach(k => {
            if (SOUNDS[k]) new Howl({ src: [SOUNDS[k].src] });
        });

        // PASSIVE UNLOCK: Resume AudioContext on first interaction
        const unlock = () => {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => {
                    // Remove listeners once unlocked
                    ['click', 'touchstart', 'keydown'].forEach(e =>
                        document.removeEventListener(e, unlock)
                    );
                });
            }
        };
        ['click', 'touchstart', 'keydown'].forEach(e =>
            document.addEventListener(e, unlock)
        );

        // Global Click Listener for UI SFX
        if (typeof window !== 'undefined') {
            window.addEventListener('click', (e) => {
                let target = e.target;
                while (target && target !== document.body) {
                    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button') {
                        if (target.disabled) return;
                        playSfx('CLICK');
                        return;
                    }
                    target = target.parentElement;
                }
            });
        }
    };

    return {
        masterVolume,
        musicVolume,
        sfxVolume,
        isMuted,
        playSfx,
        playMusic,
        stopMusic,
        syncVolumes,
        init
    };
}
