import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePeer } from '../../src/composables/usePeer';
import { MockPeer } from '../mocks/peerjs';


// Mock PeerJS
vi.mock('peerjs', async () => {
    const { MockPeer } = await import('../mocks/peerjs');
    return { default: MockPeer };
});

describe('Chat System Integration', () => {
    beforeEach(async () => {
        MockPeer.reset();
        vi.useFakeTimers();
        const { leaveGame } = usePeer();
        leaveGame();
        // Ensure any pending resetGame timeout from leaveGame is processed or cleared
        await vi.advanceTimersByTimeAsync(200);
        vi.clearAllTimers();
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

        // Simulate Client A sending JOIN
        connA.emit('data', { type: 'JOIN', payload: { name: 'Client A' } });
        await vi.advanceTimersByTimeAsync(10);

        // Spy on broadcast
        // Spy on broadcast
        vi.spyOn(connA, 'send');

        // Simulate another client B
        const connB = hostPeer.simulateIncomingConnection('clientB');
        await vi.advanceTimersByTimeAsync(100);
        connB.emit('data', { type: 'JOIN', payload: { name: 'Client B' } });
        await vi.advanceTimersByTimeAsync(10);

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
        connA.emit('data', { type: 'JOIN', payload: { name: 'Client A' } });
        await vi.advanceTimersByTimeAsync(10);
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
    it('Host Logic: Host sees client messages', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value);
        const connA = hostPeer.simulateIncomingConnection('clientA');
        await vi.advanceTimersByTimeAsync(100);

        // Client sends CHAT_MESSAGE
        connA.emit('data', {
            type: 'CHAT_MESSAGE',
            payload: {
                id: 'msg_2',
                senderId: 'clientA',
                senderName: 'Client A',
                text: 'Hello Host',
                timestamp: Date.now()
            }
        });
        await vi.advanceTimersByTimeAsync(10);

        // Assertion: Host's gameMessages should contain it
        // Current Bug: Host relays but forgets to add to own list?
        expect(Host.gameMessages.value).toHaveLength(1);
        expect(Host.gameMessages.value[0].text).toBe('Hello Host');
    });

    it('State Reset: Clears messages on leaveGame', async () => {
        const Peer = usePeer();
        Peer.gameMessages.value = [{ id: '1', text: 'Persistent?' }];
        expect(Peer.gameMessages.value).toHaveLength(1);

        Peer.leaveGame();
        await vi.advanceTimersByTimeAsync(200); // Wait for host timeout if applicable

        expect(Peer.gameMessages.value).toHaveLength(0);
    });
    it('Regression: Host does not duplicate own messages', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);

        // Host sends a message
        Host.sendChatMessage('My Message');
        await vi.advanceTimersByTimeAsync(10);

        // Should appear EXACTLY once
        expect(Host.gameMessages.value).toHaveLength(1);
        expect(Host.gameMessages.value[0].text).toBe('My Message');
    });

    it('Security: Host does not broadcast state/chat to Pending players', async () => {
        const Host = usePeer();
        // Enable Waiting Room
        Host.initHost('Host', 'gemini', '', { enableWaitingRoom: true });
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value);

        // Client connects
        const connA = hostPeer.simulateIncomingConnection('clientPending');
        await vi.advanceTimersByTimeAsync(100);

        // Client sends JOIN
        const spySendA = vi.spyOn(connA, 'send');
        connA.emit('data', { type: 'JOIN', payload: { name: 'PendingGuy' } });
        await vi.advanceTimersByTimeAsync(10);

        // Verify Client got PENDING message
        expect(spySendA).toHaveBeenCalledWith(expect.objectContaining({ type: 'PENDING' }));
        spySendA.mockClear();

        // Host sends Chat
        Host.sendChatMessage('Secret Info');
        await vi.advanceTimersByTimeAsync(10);

        // Client should NOT receive it
        expect(spySendA).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'CHAT_MESSAGE' }));

        // Host triggers Broadcast
        Host.startGame(); // Triggers broadcast
        await vi.advanceTimersByTimeAsync(10);

        // Client should NOT receive SYNC
        expect(spySendA).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SYNC' }));
    });


    it('Reactive Name Change: Updates name in message history', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value);

        // Client A Connects & Joins
        const connA = hostPeer.simulateIncomingConnection('clientA');
        await vi.advanceTimersByTimeAsync(100);
        connA.emit('data', { type: 'JOIN', payload: { name: 'Alice' } });
        await vi.advanceTimersByTimeAsync(10);

        // Client sends Message
        const chatPayload = {
            id: 'msg_alice',
            senderId: 'clientA',
            senderName: 'Alice',
            text: 'I am Alice',
            timestamp: Date.now()
        };
        connA.emit('data', { type: 'CHAT_MESSAGE', payload: chatPayload });
        await vi.advanceTimersByTimeAsync(10);

        // Verify initial state
        expect(Host.gameMessages.value.find(m => m.id === 'msg_alice').senderName).toBe('Alice');

        // Client A updates name to "Bob"
        connA.emit('data', { type: 'UPDATE_NAME', payload: { name: 'Bob' } });
        await vi.advanceTimersByTimeAsync(10);

        // Verify history updated
        expect(Host.gameMessages.value.find(m => m.id === 'msg_alice').senderName).toBe('Bob');
    });

    it('Persist Name After Leave: Updates persist even after disconnect', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value);

        // Client A Connects, Joins, Chats
        const connA = hostPeer.simulateIncomingConnection('clientA');
        await vi.advanceTimersByTimeAsync(100);
        connA.emit('data', { type: 'JOIN', payload: { name: 'Alice' } });
        await vi.advanceTimersByTimeAsync(10);

        connA.emit('data', {
            type: 'CHAT_MESSAGE', payload: {
                id: 'msg_persist', senderId: 'clientA', senderName: 'Alice', text: 'Hi', timestamp: Date.now()
            }
        });
        await vi.advanceTimersByTimeAsync(10);

        // Change name to Bob
        connA.emit('data', { type: 'UPDATE_NAME', payload: { name: 'Bob' } });
        await vi.advanceTimersByTimeAsync(10);
        expect(Host.gameMessages.value[0].senderName).toBe('Bob');

        // Client A Disconnects
        connA.close();
        await vi.advanceTimersByTimeAsync(10);

        // Should STILL be "Bob" (Not revert to Alice, nor disappear)
        expect(Host.gameMessages.value).toHaveLength(1);
        expect(Host.gameMessages.value[0].senderName).toBe('Bob');
    });

    it('Message Deletion on Kick: Removes messages from kicked player', async () => {
        const Host = usePeer();
        Host.initHost('Host', 'gemini', '');
        await vi.advanceTimersByTimeAsync(100);
        const hostPeer = MockPeer.instances.find(p => p.id === Host.myId.value);

        // Client A Connects
        const connA = hostPeer.simulateIncomingConnection('clientA');
        await vi.advanceTimersByTimeAsync(100);
        connA.emit('data', { type: 'JOIN', payload: { name: 'BadGuy' } });
        await vi.advanceTimersByTimeAsync(10);

        // Client A Chats
        connA.emit('data', {
            type: 'CHAT_MESSAGE', payload: {
                id: 'msg_bad', senderId: 'clientA', senderName: 'BadGuy', text: 'Spam', timestamp: Date.now()
            }
        });
        await vi.advanceTimersByTimeAsync(10);
        expect(Host.gameMessages.value).toHaveLength(1);

        // Spy on another client to ensure they get DELETE command
        const connB = hostPeer.simulateIncomingConnection('clientB');
        await vi.advanceTimersByTimeAsync(100);
        connB.emit('data', { type: 'JOIN', payload: { name: 'ClientB' } });
        await vi.advanceTimersByTimeAsync(10);
        const spySendB = vi.spyOn(connB, 'send');

        // Host Kicks Client A
        // We simulate the Host calling the new exposed 'kickPlayer' method.
        // This method should trigger the internal removePlayer with reason='KICKED'.

        // Asserting error for now as `kickPlayer` doesn't exist.
        if (Host.kickPlayer) {
            Host.kickPlayer('clientA');
        } else {
            throw new Error("kickPlayer not implemented yet");
        }

        await vi.advanceTimersByTimeAsync(10);

        // 1. Messages removed locally
        expect(Host.gameMessages.value).toHaveLength(0);

        // 2. Broadcast CHAT_DELETE_USER
        expect(spySendB).toHaveBeenCalledWith(expect.objectContaining({
            type: 'CHAT_DELETE_USER',
            payload: { userId: 'clientA' }
        }));
    });
});
