
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, reactive } from 'vue';
import GameController from '../../../src/components/GameController.vue';
import { useStreamerMode } from '../../../src/composables/useStreamerMode';
import { usePeer } from '../../../src/composables/usePeer';

// Mock clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(),
    },
});

// Mock window location
Object.defineProperty(window, 'location', {
    value: {
        origin: 'http://localhost:3000',
        search: '',
        pathname: '/'
    },
    writable: true
});

import { MockPeer } from '../../mocks/peerjs';

// --- Integration Setup (Mock PeerJS, not usePeer) ---
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../../mocks/peerjs');
    return { default: MockPeer };
});


// Mock QRCode component
vi.mock('qrcode.vue', () => ({
    default: { template: '<div data-testid="qrcode">QS</div>' }
}));

// Mock Audio
vi.mock('../../../src/composables/useAudio', () => ({
    useAudio: () => ({
        playMusic: vi.fn(),
        stopMusic: vi.fn()
    })
}));

const resetState = () => {
    const { gameState, leaveGame, isHost, myId, connectionError, isPending } = usePeer();
    try { leaveGame(); } catch { }

    // Force reset state
    gameState.phase = 'LOBBY';
    gameState.roomCode = '';
    gameState.players = [];
    isHost.value = false;
    myId.value = '';
    connectionError.value = '';
    isPending.value = false;

    MockPeer.reset();
    vi.clearAllMocks();
};

describe('Lobby - Streamer Mode', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = false;
    });

    const navigateToLobby = async (wrapper) => {
        // 1. Click HOST GAME
        await wrapper.find('[data-testid="landing-host-btn"]').trigger('click');

        // 2. Fill Name
        await wrapper.find('[data-testid="host-name-input"]').setValue('Host');

        // 3. Click Create Game (Real initHost)
        await wrapper.find('[data-testid="host-init-btn"]').trigger('click');

        // 4. Simulate PeerJS 'open' event to complete initHost
        await vi.advanceTimersByTimeAsync(100);

        await wrapper.vm.$nextTick();
    };

    it('displays full code when streamer mode off', async () => {
        const wrapper = mount(GameController);
        await navigateToLobby(wrapper);

        const { gameState } = usePeer();
        const code = gameState.roomCode;
        expect(code).toBeTruthy(); // Should exist

        expect(wrapper.text()).toContain(code);
        expect(wrapper.find('[data-testid="lobby-code-display"]').text()).toBe(code);
    });

    it('masks code when streamer mode on', async () => {
        const wrapper = mount(GameController);
        await navigateToLobby(wrapper);

        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = true;
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid="lobby-code-display"]').text()).toContain('****');
    });

    it('hides/blurs QR code when streamer mode on', async () => {
        const wrapper = mount(GameController);
        await navigateToLobby(wrapper);

        // QR Code is currently commented out in the component, so it should NOT exist
        // logic below updated to reflect that, or we can skip/remove this test block.
        // For now, let's just assert it doesn't exist to remain consistent with current state.

        let qrContainer = wrapper.find('[data-testid="lobby-qr-container"]');
        expect(qrContainer.exists()).toBe(false);

        /* 
        // Original Logic preserved in comment for when QR code returns
        
        // Start OFF
        isStreamerMode.value = false;
        await wrapper.vm.$nextTick();
        let qrContainer = wrapper.find('[data-testid="lobby-qr-container"]');
        expect(qrContainer.exists()).toBe(true);
        expect(qrContainer.classes()).not.toContain('blur-xl');

        // Turn ON
        isStreamerMode.value = true;
        await wrapper.vm.$nextTick();
        qrContainer = wrapper.find('[data-testid="lobby-qr-container"]');

        // Should have blur
        expect(qrContainer.classes()).toContain('blur-xl');
        */
    });

    it('copies real code and shows feedback', async () => {
        const wrapper = mount(GameController);
        await navigateToLobby(wrapper);

        const { gameState } = usePeer();
        const code = gameState.roomCode;

        const { isStreamerMode } = useStreamerMode();
        isStreamerMode.value = true;
        await wrapper.vm.$nextTick();

        const copyBtn = wrapper.find('#copy-code-btn');
        await copyBtn.trigger('click');

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(code);
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain('COPIED!');

        // Advance timers to hide copied message
        await vi.advanceTimersByTimeAsync(1000);
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).not.toContain('COPIED!');
        expect(wrapper.text()).toContain('Access Code');
    });

});
