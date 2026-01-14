
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../../../src/App.vue';
import { useStreamerMode } from '../../../src/composables/useStreamerMode';
import { MockPeer } from '../../mocks/peerjs';
import { usePeer } from '../../../src/composables/usePeer';
import { reactive, ref } from 'vue';

// --- Integration Setup (Mock PeerJS, not usePeer) ---
vi.mock('peerjs', async () => {
    // Correct relative path to the shared mock
    const { MockPeer } = await import('../../mocks/peerjs');
    return { default: MockPeer };
});


const resetState = () => {
    const { gameState, leaveGame, isHost, myId, connectionError, isPending } = usePeer();
    try { leaveGame(); } catch { }

    // Force reset state
    gameState.phase = 'LOBBY';
    gameState.roomCode = 'ABCD'; // Default code for this test file
    gameState.players = [];
    isHost.value = true;
    myId.value = 'host';
    connectionError.value = '';
    isPending.value = false;

    MockPeer.reset();
    vi.clearAllMocks();
};

describe('App - Streamer Mode', () => {
    beforeEach(() => {
        resetState();
        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = false;
    });

    it('displays full room code by default', () => {
        const wrapper = mount(App);
        expect(wrapper.text()).toContain('ABCD');
        expect(wrapper.find('[data-testid="header-room-code"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="header-room-code-masked"]').exists()).toBe(false);
    });

    it('masks room code when streamer mode enabled', async () => {
        const wrapper = mount(App);
        const { isStreamerMode } = useStreamerMode();

        isStreamerMode.value = true;
        await wrapper.vm.$nextTick();

        // Should NOT see exact text in the specific span anymore OR checks for the masked icon
        expect(wrapper.find('[data-testid="header-room-code-masked"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="header-room-code"]').exists()).toBe(false);
    });
});
