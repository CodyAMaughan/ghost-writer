// tests/mocks/peerjs.js

export class MockPeer {
    static instances = []; // Keeps track of peers created by the app

    constructor(id) {
        this.id = id || 'MOCK_PEER_ID';
        this.handlers = {};
        this.connections = [];
        this.destroyed = false;

        // Auto-register this instance so tests can find it
        MockPeer.instances.push(this);

        // Simulate successful open connection immediately (async to mimic real life)
        setTimeout(() => {
            this.emit('open', this.id);
        }, 10);
    }

    // --- Standard PeerJS API ---
    on(event, callback) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(callback);
    }

    connect(remoteId) {
        const mockConn = new MockConnection(remoteId);
        this.connections.push(mockConn);
        return mockConn;
    }

    destroy() {
        this.destroyed = true;
    }

    // --- Test Helper Methods (The "God Mode" controls) ---
    emit(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(cb => cb(data));
        }
    }

    // Call this from your test to simulate an incoming player!
    simulateIncomingConnection(peerId = 'REMOTE_PLAYER', metadata = {}) {
        const conn = new MockConnection(peerId);
        conn.metadata = metadata;
        this.emit('connection', conn);
        // Simulate the connection opening instantly
        setTimeout(() => conn.emit('open'), 10);
        return conn;
    }

    static reset() {
        MockPeer.instances = [];
    }
}

class MockConnection {
    constructor(peerId) {
        this.peer = peerId;
        this.metadata = {};
        this.handlers = {};
        this.open = true;
    }

    on(event, callback) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(callback);
    }


    send(_data) {
        // We can spy on this in tests to see if the app sent a message
    }

    close() {
        this.open = false;
        this.emit('close');
    }

    // Helper to trigger data arriving from the network
    emit(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(cb => cb(data));
        }
    }
}

// Default export to make vi.mock happy
export default { Peer: MockPeer };