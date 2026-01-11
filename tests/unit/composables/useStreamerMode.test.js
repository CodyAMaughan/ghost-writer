
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStreamerMode } from '../../../src/composables/useStreamerMode';
import { nextTick } from 'vue';

describe('useStreamerMode', () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset state if possible or assume fresh start due to module loading
        // Since it's a singleton default state might persist, so we should toggle it to false if true
        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = false;
    });

    it('defaults to false when localStorage is empty', () => {
        const { isStreamerMode } = useStreamerMode();
        expect(isStreamerMode.value).toBe(false);
    });

    it('toggles state correctly', () => {
        const { isStreamerMode, toggleStreamerMode } = useStreamerMode();
        toggleStreamerMode();
        expect(isStreamerMode.value).toBe(true);
        toggleStreamerMode();
        expect(isStreamerMode.value).toBe(false);
    });

    it('persists to localStorage', async () => {
        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = true;
        await nextTick();
        expect(String(localStorage.getItem('gw_streamer_mode'))).toBe('true');
    });

    it('masks code correctly', () => {
        const { isStreamerMode, maskedCode } = useStreamerMode();

        isStreamerMode.value = false;
        expect(maskedCode('ABCD')).toBe('ABCD');

        isStreamerMode.value = true;
        expect(maskedCode('ABCD')).toBe('****');
    });
});
