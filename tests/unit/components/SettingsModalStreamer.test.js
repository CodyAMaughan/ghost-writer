
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsModal from '../../../src/components/SettingsModal.vue';
import { useStreamerMode } from '../../../src/composables/useStreamerMode';

describe('SettingsModal - Streamer Mode', () => {
    beforeEach(() => {
        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = false;
    });

    it('displays streamer mode toggle', () => {
        const wrapper = mount(SettingsModal, {
            props: { isOpen: true }
        });
        expect(wrapper.text()).toContain('Streamer Mode');
    });

    it('toggles streamer mode when clicked', async () => {
        const wrapper = mount(SettingsModal, {
            props: { isOpen: true }
        });
        const { isStreamerMode } = useStreamerMode();

        // Find the toggle
        const toggle = wrapper.find('input[data-testid="streamer-mode-toggle"]');
        expect(toggle.exists()).toBe(true);

        await toggle.setValue(true);
        expect(isStreamerMode.value).toBe(true);

        await toggle.setValue(false);
        expect(isStreamerMode.value).toBe(false);
    });
});
