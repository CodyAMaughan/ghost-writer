
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PlayerManagerModal from '../../../../src/components/modals/PlayerManagerModal.vue';
import { usePeer } from '../../../../src/composables/usePeer';
import { MockPeer } from '../../../../tests/mocks/peerjs';

// 1. Mock PeerJS using the shared mock
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../../../../tests/mocks/peerjs');
    return {
        Peer: MockPeer,
        default: MockPeer // Fix: Ensure default export is present
    };
});

// 2. We mock global.confirm since the UI uses it
global.confirm = vi.fn(() => true);

vi.mock('../../../../src/composables/peer/useIceServers', () => ({
    getIceServers: vi.fn().mockResolvedValue([{ urls: 'stun:stun.l.google.com:19302' }])
}));

describe('PlayerManagerModal (Integration)', () => {

    // Helper to setup a game state with Host + 1 Player
    async function setupHostWithPlayer() {
        // ... same setup code ...
        const { initHost, myId } = usePeer();
        await initHost('HostPlayer', 'UNIT_TEST_HOST');

        // Wait for PeerJS open event
        await vi.advanceTimersByTimeAsync(100);

        const hostPeer = MockPeer.instances.find(p => p.id === myId.value);
        if (!hostPeer) throw new Error("Host Peer not created");

        // Connect a remote player
        const remoteConn = hostPeer.simulateIncomingConnection('peer-remote-123');
        await vi.advanceTimersByTimeAsync(100);

        // Send JOIN
        remoteConn.emit('data', {
            type: 'JOIN',
            payload: { name: 'RemotePlayer', playerUuid: 'remote-uuid-1' }
        });

        await vi.advanceTimersByTimeAsync(100);

        return { hostPeer, remoteConn };
    }

    beforeEach(async () => {
        MockPeer.reset();

        // Ensure clean state BEFORE fake timers
        const { leaveGame, gameState } = usePeer();

        // Ensure leaveGame is async and we use real timers for its cleanup if needed, 
        // but typically leaveGame() just cleans up state. 
        // However, if it uses setTimeout internally (which it does now for 100ms reset), 
        // we must not have fake timers on yet OR we must run them.
        // Best practice from Reconnection.test.js:
        await leaveGame();

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders connected players and allows kicking via game state updates', async () => {
        // A. Setup State
        const { remoteConn } = await setupHostWithPlayer();
        const { gameState, isHost } = usePeer();

        // Verify initial state
        expect(isHost.value).toBe(true);
        expect(gameState.players).toHaveLength(2); // Host + Remote
        expect(gameState.players.find(p => p.name === 'RemotePlayer')).toBeDefined();

        // B. Mount Component
        const wrapper = mount(PlayerManagerModal, {
            props: { isOpen: true }
        });

        // 1. Check Render
        expect(wrapper.text()).toContain('HostPlayer');
        expect(wrapper.text()).toContain('RemotePlayer');
        expect(wrapper.text()).toContain('CONNECTED');

        // 2. Perform Kick Action
        // Find kick button for RemotePlayer (Host doesn't have one)
        const kickButtons = wrapper.findAll('button[title="Kick & Ban Player"]');
        expect(kickButtons.length).toBe(1);

        // Spy on connection send to verify REJECTED message is sent
        const sendSpy = vi.spyOn(remoteConn, 'send');

        await kickButtons[0].trigger('click');

        // 3. Verify Confirm Dialog
        expect(global.confirm).toHaveBeenCalled();

        // 4. Verify Game State Updates (Blacklist & Removal)
        // Kick logic in usePeer: Adds to blacklist, sends REJECTED, closes connection.
        // It might take a tick or timeout
        await vi.advanceTimersByTimeAsync(100);

        expect(gameState.blacklist).toContain('remote-uuid-1');

        // Player should be removed from the list or marked disconnected?
        // Note: kickPlayer calls removePlayer(id). removePlayer removes them from gameState.players array for everyone.
        // Let's verify they are gone from the array.
        expect(gameState.players.find(p => p.id === 'peer-remote-123')).toBeUndefined();
        expect(gameState.players).toHaveLength(1); // Only Host remains

        // 5. Verify Network Signal
        expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'REJECTED',
            payload: expect.objectContaining({ message: 'You have been kicked by the host.' })
        }));

        // 6. Verify UI Update
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).not.toContain('RemotePlayer');
    });

    it('allows removing a player (without ban) via game state updates', async () => {
        // A. Setup State
        const { remoteConn } = await setupHostWithPlayer();
        const { gameState, isHost } = usePeer();

        // B. Mount Component
        const wrapper = mount(PlayerManagerModal, {
            props: { isOpen: true }
        });

        // 1. Find Remove Button
        const removeButtons = wrapper.findAll('button[title="Remove Player (Allow Rejoin)"]');
        expect(removeButtons.length).toBe(1);

        // Spy on connection send
        const sendSpy = vi.spyOn(remoteConn, 'send');

        // 2. Click Remove
        await removeButtons[0].trigger('click');

        // 3. Verify Confirm
        expect(global.confirm).toHaveBeenCalled();

        // 4. Verify Network Message (REMOVED)
        // Manual removal sends 'REMOVED' and closes connection
        expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'REMOVED',
            payload: expect.objectContaining({ message: 'You have been removed from the game.' })
        }));

        // 5. Verify State (Gone from players, NOT in blacklist)
        expect(gameState.players.find(p => p.id === 'peer-remote-123')).toBeUndefined();
        expect(gameState.blacklist).not.toContain('remote-uuid-1');
    });

    it('displays disconnected (zombie) players correctly', async () => {
        // A. Setup
        const { remoteConn } = await setupHostWithPlayer();
        const { gameState } = usePeer();

        // B. Simulate Disconnect
        remoteConn.close(); // Triggers 'close' event on host side
        await vi.advanceTimersByTimeAsync(100); // Allow handleDisconnect to run

        // DEBUG: Check players
        console.log('Players after disconnect:', JSON.stringify(gameState.players));

        expect(gameState.players).toHaveLength(2); // Should still be there (Zombie)
        const zombie = gameState.players.find(p => p.id === 'peer-remote-123');
        expect(zombie).toBeDefined();
        expect(zombie.connectionStatus).toBe('disconnected');

        // C. Mount
        const wrapper = mount(PlayerManagerModal, {
            props: { isOpen: true }
        });

        // D. Verify UI
        expect(wrapper.text()).toContain('RemotePlayer');
        expect(wrapper.text()).toContain('DISCONNECTED (ZOMBIE)');

        // Check for visual indicator (red dot)
        // We can verify by looking for the specific class in the rendered HTML
        const dots = wrapper.findAll('.bg-red-500');
        expect(dots.length).toBeGreaterThan(0);
    });

    it('allows force advance to be triggered', async () => {
        await setupHostWithPlayer();

        // Actually, since we are not mocking usePeer, we can check if it calls the internal logic.
        // forceAdvance logs to console and changes phase.

        // Spy on console.log or check phase change.
        const { gameState } = usePeer();
        gameState.phase = 'INPUT';

        const wrapper = mount(PlayerManagerModal, {
            props: { isOpen: true }
        });

        const forceBtn = wrapper.find('button.text-xs.uppercase');
        expect(forceBtn.exists()).toBe(true);

        await forceBtn.trigger('click');

        expect(global.confirm).toHaveBeenCalled();

        // Verify Phase Change (Force Advance on INPUT -> VOTING)
        expect(gameState.phase).toBe('VOTING');
    });

    it('successfully force advances from VOTING to REVEAL (Regression Test for lockVotes)', async () => {
        await setupHostWithPlayer();
        const { gameState } = usePeer();
        gameState.phase = 'VOTING';
        // Add a mock submission so REVEAL phase has something to show, preventing immediate jump to FINISH
        gameState.submissions = [{ authorId: 'p1', text: 'test', votes: {} }];

        const wrapper = mount(PlayerManagerModal, {
            props: { isOpen: true }
        });

        const forceBtn = wrapper.find('button.text-xs.uppercase');
        await forceBtn.trigger('click');

        // Since we explicitly call startReveal() in forceAdvance for VOTING phase:
        expect(gameState.phase).toBe('REVEAL');
    });
});
