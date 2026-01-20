import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive, ref, nextTick } from 'vue';
import LandingPage from '../../../../src/components/setup/LandingPage.vue';
import HostSetup from '../../../../src/components/setup/HostSetup.vue';
import JoinSetup from '../../../../src/components/setup/JoinSetup.vue';
import PendingScreen from '../../../../src/components/setup/PendingScreen.vue';

// --- State Mocks ---
// --- Mutable State for Tests ---
const mockGameState = reactive({
    currentTheme: 'viral',
    roomCode: 'ABCD'
});
const mockIsPending = ref(false);
const mockConnectionError = ref('');
const mockRemoteDisconnectReason = ref('');
const mockMyName = ref('');

const mockActions = {
    initHost: vi.fn(),
    joinGame: vi.fn(),
    leaveGame: vi.fn(),
    resetDisconnectReason: vi.fn(),
    setTheme: vi.fn()
};

// Mock usePeer to return our controllable refs
vi.mock('../../../../src/composables/usePeer', () => ({
    usePeer: () => ({
        gameState: mockGameState,
        isPending: mockIsPending,
        connectionError: mockConnectionError,
        remoteDisconnectReason: mockRemoteDisconnectReason,
        myName: mockMyName,
        ...mockActions
    })
}));

// Mock Themes
vi.mock('../../../../src/config/themes', () => ({
    THEMES: {
        viral: {
            id: 'viral',
            name: 'Viral',
            colors: {
                bg: 'bg-black',
                text: 'text-white',
                accent: 'text-blue-500',
                border: 'border-blue-500',
                button: 'bg-blue-500'
            },
            copy: { waitingForHost: "Waiting for connection..." }
        },
        academia: {
            id: 'academia',
            name: 'Academia',
            colors: {
                bg: 'bg-stone-900',
                text: 'text-stone-100',
                accent: 'text-amber-500',
                border: 'border-amber-500',
                button: 'bg-amber-500'
            },
            copy: { waitingForHost: "Awaiting Professor..." }
        }
    }
}));

describe('Connection Setup Components', () => {

    // --- LandingPage ---
    describe('LandingPage.vue', () => {
        beforeEach(() => {
            mockRemoteDisconnectReason.value = '';
        });

        it('Emits navigation events for Host/Join', async () => {
            const wrapper = mount(LandingPage);

            await wrapper.find('[data-testid="landing-host-btn"]').trigger('click');
            expect(wrapper.emitted('navigate')[0]).toEqual(['HOSTING']);

            await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
            expect(wrapper.emitted('navigate')[1]).toEqual(['JOINING']);
        });

        it('Displays Disconnect Banner when reason is present', async () => {
            const wrapper = mount(LandingPage);
            expect(wrapper.text()).not.toContain('Host disconnected');

            // Simulate disconnect
            mockRemoteDisconnectReason.value = 'Host disconnected';
            await nextTick();

            expect(wrapper.text()).toContain('Host disconnected');

            // Test Dismiss
            await wrapper.find('button.bg-red-950\\/50').trigger('click');
            expect(mockRemoteDisconnectReason.value).toBe('');
        });
    });

    // --- HostSetup ---
    describe('HostSetup.vue', () => {
        beforeEach(() => {
            mockActions.initHost.mockClear();
        });

        it('Validates form and calls initHost', async () => {
            const wrapper = mount(HostSetup);

            // Name is required
            await wrapper.find('[data-testid="host-init-btn"]').trigger('click');
            expect(mockActions.initHost).not.toHaveBeenCalled(); // Alert would trigger

            // Fill Name
            await wrapper.find('[data-testid="host-name-input"]').setValue('HostUser');

            // Should succeed now
            await wrapper.find('[data-testid="host-init-btn"]').trigger('click');
            expect(mockActions.initHost).toHaveBeenCalledWith('HostUser', 'official-server', 'server-mode', expect.any(Object));
        });

        it('Emits back event', async () => {
            const wrapper = mount(HostSetup);
            await wrapper.find('button.text-slate-400').trigger('click'); // Back button
            expect(wrapper.emitted('back')).toBeTruthy();
        });
    });

    // --- JoinSetup ---
    describe('JoinSetup.vue', () => {
        beforeEach(() => {
            mockActions.joinGame.mockClear();
            mockConnectionError.value = '';
            mockIsPending.value = false;
        });

        it('Validates input and calls joinGame', async () => {
            const wrapper = mount(JoinSetup);

            await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');
            expect(mockActions.joinGame).not.toHaveBeenCalled();

            await wrapper.find('[data-testid="join-name-input"]').setValue('Player1');
            await wrapper.find('[data-testid="join-code-input"]').setValue('CODE');

            await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');
            expect(mockActions.joinGame).toHaveBeenCalledWith('CODE', 'Player1', '');
        });

        it('Shows error message from connectionError', async () => {
            const wrapper = mount(JoinSetup);
            expect(wrapper.text()).not.toContain('Room not found');

            // Simulate Error
            mockConnectionError.value = 'Room not found';
            await nextTick();

            expect(wrapper.text()).toContain('Room not found');
        });

        it('Disables button while pending/connecting', async () => {
            const wrapper = mount(JoinSetup);
            const btn = wrapper.find('[data-testid="join-connect-btn"]');

            expect(btn.attributes('disabled')).toBeUndefined();

            mockIsPending.value = true;
            await nextTick();
            expect(btn.attributes('disabled')).toBeDefined();
        });
    });

    // --- PendingScreen ---
    describe('PendingScreen.vue', () => {
        beforeEach(() => {
            mockActions.leaveGame.mockClear();
        });

        it('Displays room code and cancels properly', async () => {
            const wrapper = mount(PendingScreen);

            expect(wrapper.text()).toContain('ABCD'); // Room code

            await wrapper.find('button').trigger('click'); // Cancel
            expect(mockActions.leaveGame).toHaveBeenCalled();
            expect(wrapper.emitted('cancel')).toBeTruthy();
        });
    });
});
