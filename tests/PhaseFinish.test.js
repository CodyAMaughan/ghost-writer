import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import PhaseFinish from '../src/components/phases/PhaseFinish.vue';

// Mock dependencies
const mockPeer = {
    gameState: {
        phase: 'FINISH',
        currentTheme: 'classic',
        maxRounds: 5,
        round: 1,
        players: []
    },
    isHost: false,
    myId: 'player1',
    nextRound: vi.fn(),
    startGame: vi.fn(),
    leaveGame: vi.fn()
};

vi.mock('../src/composables/usePeer', () => ({
    usePeer: () => mockPeer
}));

// Mock Audio
const mockPlaySfx = vi.fn();
const mockPlayMusic = vi.fn();
vi.mock('../src/composables/useAudio', () => ({
    useAudio: () => ({
        playSfx: mockPlaySfx,
        playMusic: mockPlayMusic
    })
}));

// Mock Confetti
vi.mock('canvas-confetti', () => ({
    default: vi.fn()
}));

describe('PhaseFinish.vue', () => {

    it('calculates ranks correctly with standard scores', () => {
        mockPeer.gameState.players = [
            { id: '1', name: 'A', score: 10 },
            { id: '2', name: 'B', score: 20 },
            { id: '3', name: 'C', score: 5 }
        ];

        const wrapper = mount(PhaseFinish);

        // B (20) -> Rank 1
        // A (10) -> Rank 2
        // C (5)  -> Rank 3
        const rows = wrapper.findAll('tr.border-b');
        expect(rows[0].text()).toContain('B');
        expect(rows[0].text()).toContain('🥇'); // Rank 1

        expect(rows[1].text()).toContain('A');
        expect(rows[1].text()).toContain('🥈'); // Rank 2

        expect(rows[2].text()).toContain('C');
        expect(rows[2].text()).toContain('🥉'); // Rank 3
    });

    it('handles ties correctly (shared medals)', () => {
        mockPeer.gameState.players = [
            { id: '1', name: 'Alice', score: 10 },
            { id: '2', name: 'Bob', score: 10 }, // Tie
            { id: '3', name: 'Charlie', score: 5 }
        ];

        const wrapper = mount(PhaseFinish);
        const rows = wrapper.findAll('tr.border-b');

        // Alice & Bob should both be Rank 1 (Gold)
        // Order depends on sort stability, but both get Gold
        const p1 = rows[0];
        const p2 = rows[1];

        expect(p1.text()).toContain('🥇');
        expect(p2.text()).toContain('🥇');

        // Charlie should be Rank 3 (Bronze)
        // Because 1, 1, 3
        const p3 = rows[2];
        expect(p3.text()).toContain('🥉');
        expect(p3.text()).not.toContain('🥈');
    });

    it('starts confetti and audio on mount', () => {
        mount(PhaseFinish);
        expect(mockPlaySfx).toHaveBeenCalledWith('WINNER');
        expect(mockPlayMusic).toHaveBeenCalledWith('BGM_LOBBY');
    });
});
