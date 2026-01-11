import { ref, watch } from 'vue';

const isStreamerMode = ref(localStorage.getItem('gw_streamer_mode') === 'true');

watch(isStreamerMode, (val) => {
    localStorage.setItem('gw_streamer_mode', val);
});

export function useStreamerMode() {
    const toggleStreamerMode = () => isStreamerMode.value = !isStreamerMode.value;

    const maskedCode = (code) => {
        if (!code) return '';
        return isStreamerMode.value ? '****' : code;
    };

    return {
        isStreamerMode,
        toggleStreamerMode,
        maskedCode
    };
}
