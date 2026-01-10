
import { describe, it, expect, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import App from '../../src/App.vue';

// Mock usePeer
const mockGameState = {
    phase: 'LOBBY',
    currentTheme: 'viral',
    roomCode: 'ABCD',
    settings: {}
};

vi.mock('../../src/composables/usePeer', () => ({
    usePeer: () => ({
        gameState: mockGameState,
        // Add other necessary exports if App uses them
    })
}));

describe('App.vue', () => {
    it('compiles and mounts without error', () => {
        const wrapper = shallowMount(App);
        expect(wrapper.exists()).toBe(true);
    });
});
