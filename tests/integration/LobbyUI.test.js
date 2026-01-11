import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Lobby from '../../src/components/Lobby.vue';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';

// --- Integration Setup (Mock PeerJS, not usePeer) ---
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return { default: MockPeer };
});

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
    writable: true,
    value: { reload: mockReload }
});

const resetState = () => {
    const { gameState, leaveGame, isHost, myId, connectionError, isPending } = usePeer();

    try { leaveGame(); } catch (e) { }

    // Force reset just in case
    gameState.phase = 'LOBBY';
    gameState.roomCode = '';
    isHost.value = false;
    myId.value = '';
    connectionError.value = '';
    isPending.value = false;

    MockPeer.reset();
    vi.clearAllMocks();
};

describe('Lobby UI Integration (Mock Network)', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Connection Timeout: Shows error if no response after 5s', async () => {
        const wrapper = mount(Lobby);

        // 1. Enter Join Details
        await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
        await wrapper.find('[data-testid="join-name-input"]').setValue('TimeoutUser');
        await wrapper.find('[data-testid="join-code-input"]').setValue('TOUT12');

        // 2. Click Connect
        await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');

        // 3. Verify Connecting Modal appears
        expect(wrapper.text()).toContain('CONNECTING');

        // 4. Advance time past 5s (Lobby.vue has a 5000ms timeout)
        await vi.advanceTimersByTimeAsync(5100);

        // 5. Verify Timeout Error
        expect(wrapper.text()).not.toContain('CONNECTING');
        expect(wrapper.text()).toContain('Connection timed out');
    });

    it('Waiting Room: Enters Pending state and closes modal', async () => {
        const wrapper = mount(Lobby);

        // 1. Join
        await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
        await wrapper.find('[data-testid="join-name-input"]').setValue('PendingUser');
        await wrapper.find('[data-testid="join-code-input"]').setValue('WAIT12');
        await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');

        expect(wrapper.text()).toContain('CONNECTING');

        // 2. Simulate Network: Host sends PENDING
        // At this point, usePeer/peerjs should have created a connection
        expect(MockPeer.instances.length).toBeGreaterThan(0);
        const clientPeer = MockPeer.instances[MockPeer.instances.length - 1];

        // wait for 'open'
        await vi.advanceTimersByTimeAsync(100);

        // Find the outgoing connection to host
        expect(clientPeer.connections.length).toBeGreaterThan(0);
        const conn = clientPeer.connections[0];

        // 3. Emit DATA from Host
        conn.emit('data', { type: 'PENDING' });
        await vi.advanceTimersByTimeAsync(10); // Process events

        // 4. Verify UI state
        // Modal should be gone
        expect(wrapper.text()).not.toContain('CONNECTING');
        // Pending screen visible
        expect(wrapper.text()).toContain('Waiting for Approval');
    });

    it('Connection Error: Shows error from Host (e.g. Auth Fail)', async () => {
        const wrapper = mount(Lobby);

        await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
        await wrapper.find('[data-testid="join-name-input"]').setValue('ErrorUser');
        await wrapper.find('[data-testid="join-code-input"]').setValue('ERR123');
        await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');

        // Simulate Network
        await vi.advanceTimersByTimeAsync(100);
        const clientPeer = MockPeer.instances[MockPeer.instances.length - 1];
        const conn = clientPeer.connections[0];

        // Emit Error
        conn.emit('data', {
            type: 'AUTH_ERROR',
            payload: { message: 'Lobby full' }
        });
        await vi.advanceTimersByTimeAsync(10);

        expect(wrapper.text()).not.toContain('CONNECTING');
        expect(wrapper.text()).toContain('Lobby full');
    });

    it('Cancel Pending: Resets state to Join Form', async () => {
        const wrapper = mount(Lobby);

        // 1. Get into Pending State
        await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
        await wrapper.find('[data-testid="join-name-input"]').setValue('CancelUser');
        await wrapper.find('[data-testid="join-code-input"]').setValue('CNCL12');
        await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');

        await vi.advanceTimersByTimeAsync(100);
        const clientPeer = MockPeer.instances[MockPeer.instances.length - 1];
        const conn = clientPeer.connections[0];
        conn.emit('data', { type: 'PENDING' });
        await vi.advanceTimersByTimeAsync(10);

        expect(wrapper.text()).toContain('Waiting for Approval');

        // 2. Click Cancel
        const cancelBtn = wrapper.findAll('button').find(b => b.text() === 'Cancel');
        await cancelBtn.trigger('click');
        await vi.advanceTimersByTimeAsync(10); // Process click and leaveGame cleanup

        // 3. Verify Reset
        expect(wrapper.text()).toContain('JOIN LOBBY');
        expect(wrapper.text()).not.toContain('Waiting for Approval');

        // Verify internal state (optional, but good for confidence)
        const { isPending } = usePeer();
        expect(isPending.value).toBe(false);
    });
});
