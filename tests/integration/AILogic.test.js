import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';
import * as aiService from '../../src/services/ai';

// --- Mocks ---
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return { default: MockPeer };
});

vi.mock('../../src/services/ai', () => ({
    fetchAI: vi.fn(),
    generatePrompt: vi.fn((style, topic) => `Prompt for ${style} about ${topic}`)
}));

vi.mock('../../src/config/themes', () => ({
    THEMES: {
        classic: {
            id: 'classic',
            prompts: ['Test Prompt'],
            agents: [{ id: 'Pirate', systemPrompt: 'You are a pirate.' }]
        }
    }
}));

// Mock window interactions
window.alert = vi.fn();
Object.defineProperty(window, 'location', {
    writable: true,
    value: { reload: vi.fn() }
});

const resetState = () => {
    const { gameState, leaveGame, isHost, myId } = usePeer();
    try { leaveGame(); } catch { }

    gameState.phase = 'LOBBY';
    gameState.players = [];
    gameState.round = 1;
    gameState.settings = { provider: 'gemini', apiKey: 'test-key' };

    isHost.value = false;
    myId.value = '';
    MockPeer.reset();
    vi.clearAllMocks();
};

describe('AI Logic Integration', () => {
    beforeEach(() => {
        resetState();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Host processing REQUEST_GHOST calls fetchAI and returns GHOST_RESPONSE', async () => {
        const { initHost, gameState } = usePeer();
        initHost('Host', 'gemini', 'sk-test');
        await vi.advanceTimersByTimeAsync(100);

        const hostId = usePeer().myId.value;
        const peerInstance = MockPeer.instances.find(p => p.id === hostId);

        // Client connects
        const clientConn = peerInstance.simulateIncomingConnection('client-id');
        await vi.advanceTimersByTimeAsync(100);

        // Mock client send to verify response
        clientConn.send = vi.fn();

        // Simulate JOIN first so player exists
        clientConn.emit('data', { type: 'JOIN', payload: { name: 'Requester' } });
        await vi.advanceTimersByTimeAsync(10);

        // Mock AI Response
        const mockAIResponse = JSON.stringify({
            response: "This is a ghost text",
            style: "funny"
        });
        aiService.fetchAI.mockResolvedValue(mockAIResponse);

        // Simulate REQUEST_GHOST
        clientConn.emit('data', {
            type: 'REQUEST_GHOST',
            payload: {
                prompt: 'Current Prompt',
                style: 'funny',
                agentId: 'Pirate',
                customAgent: 'Pirate' // Legacy?
            }
        });

        // Wait for async handler
        await vi.advanceTimersByTimeAsync(10);

        // Check API Call
        expect(aiService.fetchAI).toHaveBeenCalledWith(
            'gemini',
            'sk-test',
            'Current Prompt',
            expect.stringContaining('pirate')
        );

        // Check Response sent back to client
        expect(clientConn.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'GHOST_OPTIONS',
            payload: expect.objectContaining({
                options: expect.stringContaining("This is a ghost text")
            })
        }));
    });

    it('Handles AI Failure Gracefully', async () => {
        const { initHost } = usePeer();
        initHost('Host', 'openai', 'sk-test');
        await vi.advanceTimersByTimeAsync(100);

        const peerInstance = MockPeer.instances.find(p => p.id === usePeer().myId.value);
        const clientConn = peerInstance.simulateIncomingConnection('client-id');
        await vi.advanceTimersByTimeAsync(100);
        clientConn.send = vi.fn();

        // Mock AI Failure
        aiService.fetchAI.mockRejectedValue(new Error('AI Down'));

        // Simulate JOIN
        clientConn.emit('data', { type: 'JOIN', payload: { name: 'Requester' } });
        await vi.advanceTimersByTimeAsync(10);

        clientConn.emit('data', {
            type: 'REQUEST_GHOST',
            payload: { prompt: 'foo', agentId: 'custom' }
        });

        // Wait for async handler
        await vi.advanceTimersByTimeAsync(10);

        // Expect Error Response
        expect(clientConn.send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'GHOST_ERROR',
            payload: expect.objectContaining({
                message: expect.stringContaining('AI Down')
            })
        }));
    });
});
