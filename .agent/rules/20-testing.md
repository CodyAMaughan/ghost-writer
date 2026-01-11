---
trigger: model_decision
description: Writing or fixing tests
---

# Testing Guidelines
> **Activation:** Model Decision (Context: Writing or fixing tests)

## 1. Directory Structure & Philosophy
* **`tests/unit/`**:
    * **Goal:** Isolated UI testing. Does the button exist? Does the text render?
    * **Mocking:** Mock the **Module** (`vi.mock('@/composables/usePeer')`).
    * **Speed:** Fast. No complex logic setup required.
* **`tests/integration/`**:
    * **Goal:** Critical Path testing. Verifies business logic and state transitions.
    * **Scope:** Logic (`usePeer.js`) + Mocks (Network/AI).
    * **Mocking:** **DO NOT** mock `usePeer`. **DO** mock the Network Layer (`peerjs`) and Services (`src/services/ai`).
    * **Realism:** High. Tests the actual state machine and game loop.

## 2. Global Requirements
* **Runner:** `vitest`
* **Utils:** `@vue/test-utils` (`mount`, `flushPromises`), `vi.useFakeTimers` (for game loop).
* **State Reset:**
    * Since `usePeer` is a singleton, you **MUST** manually reset `gameState` and `MockPeer` in `beforeEach`.
    * Do not assume state is clean between tests.

## 3. How to Mock `peerjs` (For Integration Tests)
* **Do NOT** write inline mocks for PeerJS.
* **DO** use the shared mock: `tests/mocks/peerjs.js`.
* **Correct Mock Pattern:**
    ```javascript
    // Use async mock logic to correctly handle ES modules and default exports
    vi.mock('peerjs', async () => {
        const { MockPeer } = await import('../mocks/peerjs');
        return { default: MockPeer };
    });
    ```
* **Usage in Spec:**
    ```javascript
    import { MockPeer } from '../mocks/peerjs';
    
    describe('Game Flow', () => {
        beforeEach(() => {
            MockPeer.reset();
            vi.useFakeTimers();
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('handles incoming players', async () => {
             const { initHost, gameState } = usePeer();
             initHost('Host', 'gemini', '');
            
            // 1. Grab the peer instance
            const hostPeer = MockPeer.instances.find(p => p.id === usePeer().myId.value);
            
            // 2. Simulate Connection
            const conn = hostPeer.simulateIncomingConnection('p2', { label: 'Player 2' });
            await vi.advanceTimersByTimeAsync(100);
            
            // 3. Send Data
            conn.emit('data', { type: 'JOIN', payload: { name: 'Player 2' } });
            await vi.advanceTimersByTimeAsync(10);
            
            // 4. Assert App state updated
            expect(gameState.players).toHaveLength(2);
        });
    });
    ```

## 4. Async & Timers
* **ALWAYS** use `vi.useFakeTimers()` for game loop tests.
* **ALWAYS** use `await vi.advanceTimersByTimeAsync(ms)` (Async) to ensure promise microtasks resolve.

## 5. Selectors
* Use `data-testid` attributes (e.g., `[data-testid="submit-btn"]`) for robustness.
* Always `await nextTick()` after triggering events.
