
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Lobby from '../../../src/components/Lobby.vue';
import { usePeer } from '../../../src/composables/usePeer';
import { useStreamerMode } from '../../../src/composables/useStreamerMode';

// Mock Composables
vi.mock('../../../src/composables/usePeer');
vi.mock('../../../src/composables/useStreamerMode');
vi.mock('../../../src/composables/useAudio', () => ({
    useAudio: () => ({ playSound: vi.fn() })
}));

describe('Lobby Actions (Remove vs Kick)', () => {
    let mockKickPlayer;
    let mockRemovePlayer;
    let mockGameState;

    beforeEach(() => {
        mockKickPlayer = vi.fn();
        mockRemovePlayer = vi.fn();
        mockGameState = {
            roomCode: 'TEST01',
            currentTheme: 'viral',
            players: [
                { id: 'host-id', name: 'Host', isHost: true },
                { id: 'p1', name: 'Player One', isHost: false },
                { id: 'p2', name: 'Player Two', isHost: false }
            ],
            pendingPlayers: [],
            settings: {}
        };

        usePeer.mockReturnValue({
            gameState: mockGameState,
            myId: ref('host-id'),
            isHost: ref(true),
            kickPlayer: mockKickPlayer,
            removePlayer: mockRemovePlayer,
            startGame: vi.fn(),
            setTheme: vi.fn(),
            leaveGame: vi.fn(),
            approvePendingPlayer: vi.fn(), // Added to prevent crash
            rejectPendingPlayer: vi.fn()   // Added to prevent crash
        });

        useStreamerMode.mockReturnValue({
            isStreamerMode: ref(false)
        });

        // Mock window.confirm
        global.confirm = vi.fn(() => true);
    });

    it('renders Remove and Kick buttons for the host', () => {
        const wrapper = mount(Lobby);

        // Find player card for p1 (should have actions)
        // We look for button titles
        const removeBtns = wrapper.findAll('button[title="Remove Player (Allow Rejoin)"]');
        const kickBtns = wrapper.findAll('button[title="Kick & Ban Player"]');

        expect(removeBtns.length).toBe(2); // p1 and p2 have buttons
        expect(kickBtns.length).toBe(2);
    });

    it('does NOT render actions for non-host', () => {
        // Mock as non-host
        usePeer.mockReturnValue({
            gameState: mockGameState,
            myId: ref('p1'),
            isHost: ref(false), // Not host
            kickPlayer: mockKickPlayer,
            removePlayer: mockRemovePlayer,
            startGame: vi.fn(),
            setTheme: vi.fn(),
            leaveGame: vi.fn(),
            approvePendingPlayer: vi.fn(),
            rejectPendingPlayer: vi.fn()
        });

        const wrapper = mount(Lobby);
        const removeBtns = wrapper.findAll('button[title="Remove Player (Allow Rejoin)"]');
        expect(removeBtns.length).toBe(0);
    });

    it('triggers removePlayer with MANUAL reason when Remove button clicked', async () => {
        const wrapper = mount(Lobby);
        const removeBtn = wrapper.findAll('button[title="Remove Player (Allow Rejoin)"]')[0];

        await removeBtn.trigger('click');

        expect(global.confirm).toHaveBeenCalled();
        expect(mockRemovePlayer).toHaveBeenCalledWith('p1', 'MANUAL');
    });

    it('triggers kickPlayer when Kick button clicked', async () => {
        const wrapper = mount(Lobby);
        const kickBtn = wrapper.findAll('button[title="Kick & Ban Player"]')[0];

        await kickBtn.trigger('click');

        expect(mockKickPlayer).toHaveBeenCalledWith('p1');
    });
});
