import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DiscordIcon from '../../../src/components/icons/DiscordIcon.vue';

describe('DiscordIcon.vue', () => {
    it('renders an SVG element', () => {
        const wrapper = mount(DiscordIcon);
        expect(wrapper.find('svg').exists()).toBe(true);
    });
});
