import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import Lobby from '../src/components/Lobby.vue';
import { usePeer } from '../src/composables/usePeer';

// Mock usePeer
vi.mock('../src/composables/usePeer', () => {
    const gameState = {
        currentTheme: 'classic',
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
vi.mock('../src/composables/useAudio', () => ({
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

        const wrapper = mount(Lobby, {
            global: {
                stubs: {
                    Server: true,
                    LogIn: true,
                    User: true,
                    Key: true,
                    Users: true,
                    Play: true,
                    Ban: true,
                    Trash2: true,
                    Check: true,
                    X: true,
                    Link: true,
                    Share: true,
                    AvatarIcon: true,
                    ApiKeyHelpModal: true
                }
            }
        });

        // Check VM state
        expect(wrapper.vm.mode).toBe('JOINING');
        expect(wrapper.vm.form.code).toBe('INVITE123');

        // Wait for render
        await wrapper.vm.$nextTick();

        // Check if Join Form is visible
        const joinHeader = wrapper.find('h2');
        expect(joinHeader.text()).toContain('JOIN LOBBY');
    });

    it('Should remain in LANDING mode if no room param', async () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                origin: 'http://localhost:3000'
            },
            writable: true
        });

        const wrapper = mount(Lobby, {
            global: { stubs: { Server: true, LogIn: true, Link: true, Share: true, AvatarIcon: true, ApiKeyHelpModal: true } }
        });

        expect(wrapper.vm.mode).toBe('LANDING');
    });
});
