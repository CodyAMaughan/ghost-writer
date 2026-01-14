import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import GameController from '../../../src/components/GameController.vue';
import JoinSetup from '../../../src/components/setup/JoinSetup.vue'; // Needed for findComponent search by name/def

// Mock usePeer
vi.mock('../../../src/composables/usePeer', () => {
    const gameState = {
        currentTheme: 'classic',
        phase: 'LOBBY', // Fix: Controller needs this to know we aren't in game
        players: [],
        roomCode: 'TESTCODE',
        settings: { enableWaitingRoom: false }
    };
    return {
        usePeer: () => ({
            gameState,
            myId: ref('test-id'),
            myName: ref('Test User'),
            initHost: vi.fn(),
            joinGame: vi.fn(),
            isHost: ref(false),
            isPending: ref(false),
            connectionError: ref(''),
            remoteDisconnectReason: ref(''), // Added missing ref
            playMusic: vi.fn(),
            stopMusic: vi.fn(),
            kickPlayer: vi.fn(),
            approvePendingPlayer: vi.fn(),
            rejectPendingPlayer: vi.fn(),
            leaveGame: vi.fn(),
            setTheme: vi.fn(),
            updateAvatar: vi.fn(),
            startGame: vi.fn()
        })
    };
});

// Mock useAudio
vi.mock('../../../src/composables/useAudio', () => ({
    useAudio: () => ({
        playMusic: vi.fn(),
        stopMusic: vi.fn(),
        init: vi.fn()
    })
}));

describe('Invite Link Logic', () => {

    it('Should parse ?room=CODE from URL and switch to JOINING mode', async () => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: {
                search: '?room=INVITE123',
                origin: 'http://localhost:3000'
            },
            writable: true
        });

        // Spy on history.replaceState
        vi.spyOn(window.history, 'replaceState');

        // We mount GameController because it handles the initial routing logic
        const wrapper = mount(GameController, {
            global: {
                stubs: {
                    // Stub children to verify which one renders
                    LandingPage: true,
                    HostSetup: true,
                    // We don't stub JoinSetup so we can check its internal state (the form code)
                    // But wait, if we shallow mount or stub others, we can check wrapper.findComponent(JoinSetup)
                    GameScreen: true,
                    Lobby: true,
                    ConnectingModal: true,
                    LogIn: true
                }
            }
        });

        // Wait for onMounted in GameController and JoinSetup
        await wrapper.vm.$nextTick();

        // 1. Verify GameController switched mode to 'JOINING'
        // Accessing component internal state 'mode' via vm (exposed by <script setup> if not defineExpose? No, <script setup> is closed by default)
        // Actually, assertions on rendered component are better.
        // It should render JoinSetup
        const joinSetup = wrapper.findComponent(JoinSetup);
        expect(joinSetup.exists()).toBe(true);

        // 2. Verify JoinSetup grabbed the code
        // Since JoinSetup is not stubbed (or even if it was, we check props if passed, but here it reads URL itself)
        // Note: JoinSetup auto-reads URL on ref initialization.

        // Check local state of JoinSetup
        const codeInput = joinSetup.find('[data-testid="join-code-input"]');
        expect(codeInput.exists()).toBe(true);
        expect(codeInput.element.value).toBe('INVITE123');

        // 3. Verify URL was cleaned
        expect(window.history.replaceState).toHaveBeenCalled();
        const callArgs = window.history.replaceState.mock.calls[0];
        // Expect the new URL to NOT contain ?room=
        expect(callArgs[2]).not.toContain('?room=');
    });

    it('Should remain in LANDING mode if no room param', async () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                origin: 'http://localhost:3000'
            },
            writable: true
        });

        const wrapper = mount(GameController, {
            global: {
                stubs: {
                    LandingPage: true,
                    HostSetup: true,
                    JoinSetup: true, // Stub this too for the failing test to see if it renders
                    GameScreen: true,
                    Lobby: true
                }
            }
        });

        await wrapper.vm.$nextTick();

        // Should render LandingPage
        // Use imported component definition if possible, but finding by stub name also works if stubbed correctly
        expect(wrapper.findComponent({ name: 'LandingPage' }).exists()).toBe(true);
        expect(wrapper.findComponent({ name: 'JoinSetup' }).exists()).toBe(false);
    });
});
