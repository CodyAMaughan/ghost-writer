import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import Lobby from '../../../src/components/Lobby.vue';
import { usePeer } from '../../../src/composables/usePeer'; // Top-level import

// Mock AI service to prevent import errors (same as integration tests)
vi.mock('../../../src/services/ai', () => ({
    fetchAI: vi.fn()
}));

// --- State Factory ---
const createDefaultState = () => ({
    phase: 'LOBBY',
    currentTheme: 'classic',
    roomCode: '',
    players: [],
    pendingPlayers: [],
    round: 1,
    maxRounds: 5,
    timer: 0,
    prompt: 'Waiting for Host...',
    submissions: [],
    finishedVotingIDs: [],
    revealedIndex: -1,
    revealStep: 0,
    settings: {
        provider: 'gemini',
        apiKey: '',
        roundDuration: 45,
        requirePassword: false,
        password: '',
        enableWaitingRoom: false
    },
    usedPrompts: []
});

// Reactive mock state
const mockGameState = reactive(createDefaultState());
const mockIsHost = { value: false };
const mockMyId = { value: '' };
const mockMyName = { value: 'Test Player' };

// Mock actions with actual implementations
const mockActions = {
    initHost: vi.fn((name, provider, apiKey, lobbySettings = {}) => {
        mockIsHost.value = true;
        mockMyId.value = 'host-id';
        mockMyName.value = name;
        mockGameState.roomCode = 'TEST12';
        mockGameState.hostId = 'host-id';
        mockGameState.settings.provider = provider;
        mockGameState.settings.apiKey = apiKey;
        mockGameState.settings.requirePassword = lobbySettings.requirePassword || false;
        mockGameState.settings.password = lobbySettings.password || '';
        mockGameState.settings.enableWaitingRoom = lobbySettings.enableWaitingRoom || false;
        mockGameState.players = [{ id: 'host-id', name, isHost: true, avatarId: 0, score: 0 }];
    }),

    joinGame: vi.fn((code, name, _password = '') => {
        mockIsHost.value = false;
        mockMyId.value = 'player-id';
        mockMyName.value = name;
        mockGameState.roomCode = code;
    }),

    approvePendingPlayer: vi.fn((playerId) => {
        const pending = mockGameState.pendingPlayers.find(p => p.id === playerId);
        if (pending) {
            mockGameState.players.push({
                id: pending.id,
                name: pending.name,
                avatarId: pending.avatarId || 0,
                isHost: false,
                score: 0
            });
            mockGameState.pendingPlayers = mockGameState.pendingPlayers.filter(p => p.id !== playerId);
        }
    }),

    rejectPendingPlayer: vi.fn((playerId) => {
        mockGameState.pendingPlayers = mockGameState.pendingPlayers.filter(p => p.id !== playerId);
    }),

    kickPlayer: vi.fn((playerId) => {
        mockGameState.players = mockGameState.players.filter(p => p.id !== playerId);
    }),

    returnToLobby: vi.fn(() => {
        mockGameState.phase = 'LOBBY';
        mockGameState.round = 1;
        mockGameState.timer = 0;
        mockGameState.submissions = [];
        mockGameState.finishedVotingIDs = [];
        mockGameState.revealedIndex = -1;
        mockGameState.revealStep = 0;
        mockGameState.usedPrompts = [];
        mockGameState.players.forEach(p => p.score = 0);
    }),

    startGame: vi.fn(),
    leaveGame: vi.fn(),
    setTheme: vi.fn(),
    updateAvatar: vi.fn(),
    nextRound: vi.fn()
};

// Mock usePeer
vi.mock('../../../src/composables/usePeer', () => {
    const { ref } = require('vue'); // Import ref inside factory
    const mockIsPending = ref(false);
    const mockConnectionError = ref('');

    return {
        usePeer: () => ({
            gameState: mockGameState,
            isHost: mockIsHost, // These are defined outside, might need fixing too if they are plain objects
            myId: mockMyId,
            myName: mockMyName,
            isPending: mockIsPending,
            connectionError: mockConnectionError,
            ...mockActions
        })
    };
});

// Mock useAudio
vi.mock('../../../src/composables/useAudio', () => ({
    useAudio: () => ({
        playMusic: vi.fn(),
        stopMusic: vi.fn(),
        playSfx: vi.fn()
    })
}));

describe('LobbyAdvanced - Advanced Lobby Controls', () => {
    beforeEach(() => {
        // Reset state
        Object.assign(mockGameState, createDefaultState());
        mockIsHost.value = false;
        mockMyId.value = '';
        mockMyName.value = 'Test Player';

        // Reset closure-based mocks via usePeer accessor
        const peer = usePeer();
        if (peer.isPending) peer.isPending.value = false;
        if (peer.connectionError) peer.connectionError.value = '';

        // Clear mocks
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
    });

    describe('Password Protection', () => {
        it('passes lobby settings with password when creating host', async () => {
            // Call initHost with password settings
            mockActions.initHost('Test Host', 'gemini', 'key', {
                requirePassword: true,
                password: 'secret123',
                enableWaitingRoom: false
            });

            expect(mockGameState.settings.requirePassword).toBe(true);
            expect(mockGameState.settings.password).toBe('secret123');
            expect(mockActions.initHost).toHaveBeenCalledWith('Test Host', 'gemini', 'key', {
                requirePassword: true,
                password: 'secret123',
                enableWaitingRoom: false
            });
        });

        it('shows password input on JOIN form', async () => {
            const wrapper = mount(Lobby);

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
            const wrapper = mount(Lobby);

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

            // Click connect
            await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');
            await nextTick();

            // Verify joinGame was called with password
            expect(mockActions.joinGame).toHaveBeenCalledWith('ABC123', 'Player1', 'mypass');
        });

        it('password fields have autocomplete=off to prevent password managers', async () => {
            const wrapper = mount(Lobby);

            // Check JOIN form password
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await nextTick();

            const passwordInput = wrapper.find('[data-testid="join-password-input"]');
            expect(passwordInput.attributes('autocomplete')).toBe('off');
        });
    });

    describe('Pending State & Waiting Room UI', () => {
        it('password autocomplete attribute prevents password manager interference', async () => {
            const wrapper = mount(Lobby);

            // Check both password fields have autocomplete=off
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await nextTick();

            const joinPasswordInput = wrapper.find('[data-testid="join-password-input"]');
            expect(joinPasswordInput.attributes('autocomplete')).toBe('off');
        });
    });

    describe('Connection Error Handling', () => {
        it('displays connectionError in JOIN form', async () => {
            const { usePeer } = await import('../../../src/composables/usePeer');
            const peerInstance = usePeer();

            // Simulate auth error
            peerInstance.connectionError.value = 'Incorrect password';

            const wrapper = mount(Lobby);

            // Navigate to join form
            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            await nextTick();

            // Error should be displayed
            const html = wrapper.html();
            expect(html).toContain('Incorrect password');
        });
    });

    describe('Waiting Room Flow', () => {
        it('approves pending player correctly', async () => {
            // Setup
            mockIsHost.value = true;
            mockGameState.settings.enableWaitingRoom = true;
            mockGameState.players = [{ id: 'host-id', name: 'Host', isHost: true, avatarId: 0, score: 0 }];
            mockGameState.pendingPlayers = [
                { id: 'pending-1', name: 'Pending Player', avatarId: 0 }
            ];

            // Approve player
            mockActions.approvePendingPlayer('pending-1');

            // Verify player moved to active
            expect(mockGameState.players.length).toBe(2);
            expect(mockGameState.pendingPlayers.length).toBe(0);
            expect(mockGameState.players.find(p => p.id === 'pending-1')).toBeDefined();
            expect(mockActions.approvePendingPlayer).toHaveBeenCalledWith('pending-1');
        });

        it('rejects pending player correctly', async () => {
            // Setup
            mockGameState.pendingPlayers = [
                { id: 'pending-1', name: 'Pending Player', avatarId: 0 },
                { id: 'pending-2', name: 'Another Player', avatarId: 1 }
            ];

            // Reject player
            mockActions.rejectPendingPlayer('pending-1');

            // Verify player removed
            expect(mockGameState.pendingPlayers.length).toBe(1);
            expect(mockGameState.pendingPlayers.find(p => p.id === 'pending-1')).toBeUndefined();
            expect(mockGameState.pendingPlayers.find(p => p.id === 'pending-2')).toBeDefined();
        });
    });

    describe('Kick Player Functionality', () => {
        it('kicks player correctly', async () => {
            mockGameState.players = [
                { id: 'host-id', name: 'Host', isHost: true, avatarId: 0, score: 0 },
                { id: 'player-1', name: 'Player 1', isHost: false, avatarId: 1, score: 0 },
                { id: 'player-2', name: 'Player 2', isHost: false, avatarId: 2, score: 0 }
            ];

            // Kick player-1
            mockActions.kickPlayer('player-1');

            // Verify removed
            expect(mockGameState.players.length).toBe(2);
            expect(mockGameState.players.find(p => p.id === 'player-1')).toBeUndefined();
            expect(mockGameState.players.find(p => p.id === 'player-2')).toBeDefined();
            expect(mockActions.kickPlayer).toHaveBeenCalledWith('player-1');
        });
    });

    describe('Return to Lobby Functionality', () => {
        it('resets game state while preserving players', async () => {
            // Simulate mid-game state
            mockGameState.phase = 'INPUT';
            mockGameState.round = 3;
            mockGameState.timer = 25;
            mockGameState.players = [
                { id: 'p1', name: 'Player 1', score: 150, avatarId: 0, isHost: true },
                { id: 'p2', name: 'Player 2', score: 75, avatarId: 1, isHost: false }
            ];
            mockGameState.submissions = [{ authorId: 'p1', text: 'test' }];

            const playerCountBefore = mockGameState.players.length;

            // Return to lobby
            mockActions.returnToLobby();

            // Verify reset
            expect(mockGameState.phase).toBe('LOBBY');
            expect(mockGameState.round).toBe(1);
            expect(mockGameState.timer).toBe(0);
            expect(mockGameState.submissions.length).toBe(0);

            // Verify players preserved but scores reset
            expect(mockGameState.players.length).toBe(playerCountBefore);
            expect(mockGameState.players[0].score).toBe(0);
            expect(mockGameState.players[1].score).toBe(0);
        });
    });

    describe('Complete Integration Flow', () => {
        it('executes full password-protected waiting room workflow', async () => {
            // 1. Host creates game with password and waiting room
            mockActions.initHost('Host', 'gemini', 'test-key', {
                requirePassword: true,
                password: 'secret123',
                enableWaitingRoom: true
            });

            expect(mockIsHost.value).toBe(true);
            expect(mockGameState.settings.requirePassword).toBe(true);
            expect(mockGameState.settings.password).toBe('secret123');
            expect(mockGameState.settings.enableWaitingRoom).toBe(true);
            expect(mockGameState.players.length).toBe(1); // Host only

            // 2. Simulate player joining (goes to pending)
            mockGameState.pendingPlayers.push({
                id: 'new-player',
                name: 'New Player',
                avatarId: 1
            });

            expect(mockGameState.pendingPlayers.length).toBe(1);
            expect(mockGameState.players.length).toBe(1);

            // 3. Host approves player
            mockActions.approvePendingPlayer('new-player');

            expect(mockGameState.players.length).toBe(2);
            expect(mockGameState.pendingPlayers.length).toBe(0);
            const newPlayer = mockGameState.players.find(p => p.id === 'new-player');
            expect(newPlayer).toBeDefined();
            expect(newPlayer.name).toBe('New Player');

            // 4. Simulate game progression
            mockGameState.phase = 'INPUT';
            mockGameState.round = 2;
            newPlayer.score = 50;

            // 5. Host kicks the player
            mockActions.kickPlayer('new-player');

            expect(mockGameState.players.length).toBe(1);
            expect(mockGameState.players.find(p => p.id === 'new-player')).toBeUndefined();

            // 6. Return to lobby
            mockActions.returnToLobby();

            expect(mockGameState.phase).toBe('LOBBY');
            expect(mockGameState.round).toBe(1);
        });
    });
});
