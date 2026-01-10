# Testing Guidelines
> **Activation:** Model Decision (Context: Writing or fixing tests)

## 1. Directory Structure & Philosophy
* **`tests/unit/`**:
    * **Goal:** Isolated UI testing. Does the button exist? Does the text render?
    * **Mocking:** Mock the **Module** (`vi.mock('@/composables/usePeer')`).
    * **Speed:** Fast. No complex logic setup required.
* **`tests/integration/`**:
    * **Goal:** Critical Path testing. Does clicking "Start" actually update the global state?
    * **Mocking:** **DO NOT** mock `usePeer`. **DO** mock the Network Layer (`vi.mock('peerjs')`).
    * **Realism:** High. Tests the interaction between Vue Components and the State Machine.

## 2. Global Requirements
* **Runner:** `vitest`
* **Utils:** `@vue/test-utils` (`mount`, `flushPromises`)
* **State Reset:**
    * Since `usePeer` is a singleton, you **MUST** manually reset `gameState` in `beforeEach`.
    * Do not assume state is clean between tests.

## 3. How to Mock `peerjs` (For Integration Tests)
* **Do NOT** write inline mocks for PeerJS.
* **DO** use the shared mock: `tests/mocks/peerjs.js`.
* **Usage in Spec:**
    ```javascript
    import { MockPeer } from '../mocks/peerjs';
    
    // 1. Point Vitest to the manual mock
    vi.mock('peerjs', () => import('../mocks/peerjs'));

    describe('Game Flow', () => {
        beforeEach(() => {
            MockPeer.reset(); // Clear history
        });

        it('handles incoming players', async () => {
            // ... mount app ...
            
            // 2. Grab the peer instance the App created
            const peer = MockPeer.instances[0];
            
            // 3. Trigger a network event
            peer.simulateIncomingConnection({ name: 'Player 2' });
            
            // 4. Assert App state updated
            expect(gameState.players.length).toBe(2);
        });
    });
    ```

## 4. Selectors
* Use `data-testid` attributes (e.g., `[data-testid="submit-btn"]`) for robustness.
* Always `await nextTick()` after triggering events.