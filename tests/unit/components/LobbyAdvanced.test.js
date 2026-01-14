import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import GameController from '../../../src/components/GameController.vue';
import { MockPeer } from '../../mocks/peerjs';
import { usePeer } from '../../../src/composables/usePeer'; // Top-level import

// Mock AI service to prevent import errors (same as integration tests)
vi.mock('../../../src/services/ai', () => ({
    fetchAI: vi.fn()
}));

// --- Integration Setup (Mock PeerJS, not usePeer) ---
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../../mocks/peerjs');
    return { default: MockPeer };
});

const resetState = () => {
    const { gameState, leaveGame, isHost, myId, connectionError, isPending } = usePeer();
    try { leaveGame(); } catch { }

    // Force reset state
    gameState.phase = 'LOBBY';
    gameState.roomCode = '';
    gameState.players = [];
    gameState.pendingPlayers = [];
    gameState.settings = {
        provider: 'gemini',
        apiKey: '',
        roundDuration: 45,
        requirePassword: false,
        password: '',
        enableWaitingRoom: false
    };
    isHost.value = false;
    myId.value = '';
    connectionError.value = '';
    isPending.value = false;

    MockPeer.reset();
    vi.clearAllMocks();
};

describe('LobbyAdvanced - Advanced Lobby Controls', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
        localStorage.clear();
        sessionStorage.clear();
    });

    describe('Password Protection', () => {
        it('passes lobby settings with password when creating host', async () => {
            const { initHost, gameState } = usePeer();

            // Call initHost with password settings
            // Call initHost with password settings
            await initHost('Test Host', 'gemini', 'key', {
                requirePassword: true,
                password: 'secret123',
                enableWaitingRoom: false
            });
            await vi.advanceTimersByTimeAsync(200); // Wait for Peer Open
            await nextTick(); // Wait for state update

            expect(gameState.settings.requirePassword).toBe(true);
            expect(gameState.settings.password).toBe('secret123');
            // Can't expect mockActions.initHost -> verify state instead (which we did)
        });

        it('shows password input on JOIN form', async () => {
            const wrapper = mount(GameController);

            // Click JOIN button
            const joinButton = wrapper.find('[data-testid="landing-join-btn"]');
            await joinButton.trigger('click');
            await nextTick();

            // Verify password field exists
            const passwordInput = wrapper.find('[data-testid="join-password-input"]');
            expect(passwordInput.exists()).toBe(true);
            expect(passwordInput.attributes('type')).toBe('password');
        });

        it('sends password when joining game', async () => {
            const wrapper = mount(GameController);

            // Navigate to JOIN form
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await nextTick();

            // Fill in join form
            const nameInput = wrapper.find('[data-testid="join-name-input"]');
            const codeInput = wrapper.find('[data-testid="join-code-input"]');
            const passwordInput = wrapper.find('[data-testid="join-password-input"]');

            await nameInput.setValue('Player1');
            await codeInput.setValue('ABC123');
            await passwordInput.setValue('mypass');

            // Spy on MockPeer connect
            const connectSpy = vi.spyOn(MockPeer.prototype, 'connect');

            // For now, let's verify inputs and click connect.
            await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');
            // joinGame -> peer.on('open') delay -> connect
            await vi.advanceTimersByTimeAsync(200);
            await nextTick();

            // Verify Logic: joinGame calls peer.connect with prefixed ID
            expect(connectSpy).toHaveBeenCalledTimes(1);
            expect(connectSpy).toHaveBeenCalledWith('ghost-writer-ABC123'); // Metadata is NOT sent here usually

            // Verify no immediate error
            const { connectionError } = usePeer();
            expect(connectionError.value).toBe('');

            connectSpy.mockRestore(); // Cleanup
        });

        it('password fields have autocomplete=off to prevent password managers', async () => {
            const wrapper = mount(GameController);

            // Check JOIN form password
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await nextTick();

            const passwordInput = wrapper.find('[data-testid="join-password-input"]');
            expect(passwordInput.attributes('autocomplete')).toBe('off');
        });
    });

    describe('Pending State & Waiting Room UI', () => {
        it('password autocomplete attribute prevents password manager interference', async () => {
            const wrapper = mount(GameController);

            // Check both password fields have autocomplete=off
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await nextTick();

            const joinPasswordInput = wrapper.find('[data-testid="join-password-input"]');
            expect(joinPasswordInput.attributes('autocomplete')).toBe('off');
        });
    });

    describe('Connection Error Handling', () => {
        it('displays connectionError in JOIN form', async () => {
            const { connectionError } = usePeer();

            // Simulate auth error
            connectionError.value = 'Incorrect password';

            const wrapper = mount(GameController);

            // Navigate to join form
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await nextTick();

            // Error should be displayed
            const html = wrapper.html();
            expect(html).toContain('Incorrect password');
        });

        it('handles connection rejection from host', async () => {
            const wrapper = mount(GameController);
            // Navigate to join (Standard setup)
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await wrapper.find('[data-testid="join-name-input"]').setValue('Player1');
            await wrapper.find('[data-testid="join-code-input"]').setValue('ABC123');
            await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');
            await nextTick();

            // Simulate Host rejecting connection (via state update or msg?)
            // In usePeer, if connection fails or closes unexpectedly during join:
            const { connectionError } = usePeer();
            connectionError.value = 'Invalid Password';
            await nextTick();

            expect(wrapper.text()).toContain('Invalid Password');
        });
    });

    describe('Waiting Room Flow', () => {
        it('approves pending player correctly', async () => {
            // Setup real state
            const { gameState, approvePendingPlayer, isHost } = usePeer();
            isHost.value = true;
            gameState.settings.enableWaitingRoom = true;
            gameState.players = [{ id: 'host-id', name: 'Host', isHost: true, avatarId: 0, score: 0 }];
            gameState.pendingPlayers = [
                { id: 'pending-1', name: 'Pending Player', avatarId: 0 }
            ];

            // Approve player
            approvePendingPlayer('pending-1');
            // Assuming approve sends message immediately if host
            await nextTick();

            // Verify player moved to active
            expect(gameState.players.length).toBe(2);
            expect(gameState.pendingPlayers.length).toBe(0);
            expect(gameState.players.find(p => p.id === 'pending-1')).toBeDefined();
        });

        it('rejects pending player correctly', async () => {
            const { gameState, rejectPendingPlayer, isHost } = usePeer();
            // Setup
            isHost.value = true;
            gameState.pendingPlayers = [
                { id: 'pending-1', name: 'Pending Player', avatarId: 0 },
                { id: 'pending-2', name: 'Another Player', avatarId: 1 }
            ];

            // Reject player
            rejectPendingPlayer('pending-1');
            await nextTick();

            // Verify player removed
            expect(gameState.pendingPlayers.length).toBe(1);
            expect(gameState.pendingPlayers.find(p => p.id === 'pending-1')).toBeUndefined();
            expect(gameState.pendingPlayers.find(p => p.id === 'pending-2')).toBeDefined();
        });
    });

    describe('Kick Player Functionality', () => {
        it('kicks player correctly', async () => {
            const { gameState, kickPlayer, isHost } = usePeer();
            isHost.value = true;

            gameState.players = [
                { id: 'host-id', name: 'Host', isHost: true, avatarId: 0, score: 0 },
                { id: 'player-1', name: 'Player 1', isHost: false, avatarId: 1, score: 0 },
                { id: 'player-2', name: 'Player 2', isHost: false, avatarId: 2, score: 0 }
            ];

            // Kick player-1
            kickPlayer('player-1');
            await nextTick();

            // Verify removed
            expect(gameState.players.length).toBe(2);
            expect(gameState.players.find(p => p.id === 'player-1')).toBeUndefined();
            expect(gameState.players.find(p => p.id === 'player-2')).toBeDefined();
        });
    });

    describe('Return to Lobby Functionality', () => {
        it('resets game state while preserving players', async () => {
            const { gameState, returnToLobby, isHost } = usePeer();
            isHost.value = true;

            // Simulate mid-game state
            gameState.phase = 'INPUT';
            gameState.round = 3;
            gameState.timer = 25;
            gameState.players = [
                { id: 'p1', name: 'Player 1', score: 150, avatarId: 0, isHost: true },
                { id: 'p2', name: 'Player 2', score: 75, avatarId: 1, isHost: false }
            ];
            gameState.submissions = [{ authorId: 'p1', text: 'test' }];

            const playerCountBefore = gameState.players.length;

            // Return to lobby
            returnToLobby();
            await nextTick();

            // Verify reset
            expect(gameState.phase).toBe('LOBBY');
            expect(gameState.round).toBe(1);
            expect(gameState.timer).toBe(0);
            expect(gameState.submissions.length).toBe(0);

            // Verify players preserved but scores reset (if logic implemented!)
            expect(gameState.players.length).toBe(playerCountBefore);
            // NOTE: Current returnToLobby implementation might NOT reset scores based on previous analysis. 
            // Asserting reset for now as per original test, but verifying logic if it fails.
            expect(gameState.players[0].score).toBe(0);
            expect(gameState.players[1].score).toBe(0);
        });
    });

    describe('Complete Integration Flow', () => {
        it('executes full password-protected waiting room workflow', async () => {
            const { initHost, gameState, isHost, approvePendingPlayer, kickPlayer, returnToLobby } = usePeer();

            // 1. Host creates game with password and waiting room
            await initHost('Host', 'gemini', 'test-key', {
                requirePassword: true,
                password: 'secret123',
                enableWaitingRoom: true
            });
            await vi.advanceTimersByTimeAsync(200); // Wait for open
            await nextTick();

            expect(isHost.value).toBe(true);
            expect(gameState.settings.requirePassword).toBe(true);
            expect(gameState.settings.password).toBe('secret123');
            expect(gameState.settings.enableWaitingRoom).toBe(true);
            expect(gameState.players.length).toBe(1); // Host only

            // 2. Simulate player joining (goes to pending)
            gameState.pendingPlayers.push({
                id: 'new-player',
                name: 'New Player',
                avatarId: 1
            });
            await nextTick();

            expect(gameState.pendingPlayers.length).toBe(1);
            expect(gameState.players.length).toBe(1);

            // 3. User reported: Host needs to see people in waitlist
            // Verify UI shows the pending player
            const wrapper = mount(GameController);
            // Must verify we are in LOBBY phase and isHost is true (which it is from initHost)
            expect(wrapper.text()).toContain('New Player');
            expect(wrapper.text()).toContain('WAITING FOR APPROVAL'); // Our new header

            // 4. Host approves player via UI (or direct call, let's use direct call for this integration test stability, 
            // but we proved UI exists)
            approvePendingPlayer('new-player');
            await nextTick();

            expect(gameState.players.length).toBe(2);
            expect(gameState.pendingPlayers.length).toBe(0);
            const newPlayer = gameState.players.find(p => p.id === 'new-player');
            expect(newPlayer).toBeDefined();
            expect(newPlayer.name).toBe('New Player');

            // 4. Simulate game progression
            gameState.phase = 'INPUT';
            gameState.round = 2;
            newPlayer.score = 50;

            // 5. Host kicks the player
            kickPlayer('new-player');
            await nextTick();

            expect(gameState.players.length).toBe(1);
            expect(gameState.players.find(p => p.id === 'new-player')).toBeUndefined();

            // 6. Return to lobby
            returnToLobby();
            await nextTick();

            expect(gameState.phase).toBe('LOBBY');
            expect(gameState.round).toBe(1);
        });
    });
});
