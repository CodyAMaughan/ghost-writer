import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';
import { EMOTE_REGISTRY } from '../../src/config/emotes';

// Mock PeerJS
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return { default: MockPeer };
});

describe('Chat System Integration', () => {
    beforeEach(() => {
        MockPeer.reset();
        vi.useFakeTimers();
        const { leaveGame } = usePeer();
        leaveGame();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Chat Broadcast: Host relays message to all clients', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');

        // Wait for Peer open
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value); 3

        // Simulate Client A connection
        const connA = hostPeer.simulateIncomingConnection('clientA');
        await vi.advanceTimersByTimeAsync(100);

        // Host should have received connection
        // Now Host keeps track of connections in connMap

        // Simulate Client A sending CHAT_MESSAGE
        const chatPayload = {
            id: 'msg_1',
            senderId: 'clientA',
            senderName: 'Client A',
            text: 'Hello World',
            timestamp: Date.now()
        };

        // Spy on broadcast
        // We can spy on the connection's send method if we had access to the exact instance created in usePeer
        // But usePeer creates new MockConnections internally when broadcasting? 
        // No, Host keeps references to incoming connections.

        // Let's spy on the connection we created: connA.send
        const spySendA = vi.spyOn(connA, 'send');

        // Simulate another client B
        const connB = hostPeer.simulateIncomingConnection('clientB');
        await vi.advanceTimersByTimeAsync(100);
        const spySendB = vi.spyOn(connB, 'send');

        // Trigger Data on Host
        connA.emit('data', { type: 'CHAT_MESSAGE', payload: chatPayload });
        await vi.advanceTimersByTimeAsync(10);

        // Assert Host relayed to B (and A, depending on implementation, usually A handles own local echo or host rebroadcasts to all)
        // Design says "Relay to all connected clients (Broadcast)"
        expect(spySendB).toHaveBeenCalledWith(expect.objectContaining({
            type: 'CHAT_MESSAGE',
            payload: expect.objectContaining({ text: 'Hello World' })
        }));
    });

    it('Emote Security: Host rejects locked emotes', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value);
        const connA = hostPeer.simulateIncomingConnection('clientA');
        await vi.advanceTimersByTimeAsync(100);
        const spySendA = vi.spyOn(connA, 'send');

        // Send Locked Emote
        connA.emit('data', {
            type: 'REACTION_EMOTE',
            payload: { senderId: 'clientA', emoteId: 'human' }
        });
        await vi.advanceTimersByTimeAsync(10);

        // Should NOT broadcast
        expect(spySendA).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'REACTION_EMOTE' }));
    });

    it('Emote Validation: Host accepts valid emotes', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value);
        const connA = hostPeer.simulateIncomingConnection('clientA');
        await vi.advanceTimersByTimeAsync(100);
        const spySendA = vi.spyOn(connA, 'send');

        // Send Valid Emote
        connA.emit('data', {
            type: 'REACTION_EMOTE',
            payload: { senderId: 'clientA', emoteId: 'heart' }
        });
        await vi.advanceTimersByTimeAsync(10);

        // Should broadcast
        expect(spySendA).toHaveBeenCalledWith(expect.objectContaining({
            type: 'REACTION_EMOTE',
            payload: expect.objectContaining({ emoteId: 'heart' })
        }));
    });

    it('Client Logic: Updates gameMessages on receive', async () => {
        const Client = usePeer();
        // Reset state manually as per rules
        Client.leaveGame();

        // Init Client
        Client.joinGame('CODE', 'Client', '');
        await vi.advanceTimersByTimeAsync(100);

        // Find Client's Peer
        const clientPeer = MockPeer.instances.find(p => p.id === Client.myId.value);
        // Client connects to Host
        const hostConn = clientPeer.connections[0];

        // Simulate receiving CHAT_MESSAGE from Host
        hostConn.emit('data', {
            type: 'CHAT_MESSAGE',
            payload: { id: '1', senderName: 'Host', text: 'Hi', timestamp: 123 }
        });

        await vi.advanceTimersByTimeAsync(10);

        expect(Client.gameMessages.value).toHaveLength(1);
        expect(Client.gameMessages.value[0].text).toBe('Hi');
    });
});
