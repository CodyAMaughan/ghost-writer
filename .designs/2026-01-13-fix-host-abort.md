# Feature: Graceful Host Disconnect & Lobby UI Fix

## Context & Goals
Currently, when a Host aborts a lobby (by clicking "Close Lobby"):
1.  **Visual Glitch:** The `Lobby.vue` component has a broken `v-if` / `v-else-if` chain, causing the "Lobby" UI (player list) to render simultaneously with the "Landing" or "Joining" UI if `gameState.players` is not cleared.
2.  **Hard Reload:** Clients rely on `window.location.reload()` when the peer connection closes. This is abrupt and seemingly unreliable in the current user environment, leading to the "zombie lobby" state.

**Goal:**
- Fix the `v-if` logic in `Lobby.vue`.
- Implement a graceful `LOBBY_CLOSED` message so clients can reset state without a full page reload.

## Architecture Changes

### `usePeer.js`
-   **New Message Type:** `LOBBY_CLOSED`.
-   **Host Logic:** In `leaveGame()`, if `isHost`, broadcast `LOBBY_CLOSED` before destroying the peer.
-   **Client Logic:**
    -   Handle `LOBBY_CLOSED`:
        -   Call `resetGame()`.
        -   Set a new reactive state `remoteDisconnectReason = 'Host closed the lobby'`.
    -   Update `hostConn.on('close')`:
        -   If `remoteDisconnectReason` is set, do NOT reload. Just show the reason.
        -   If no reason (unexpected crash), keep the reload behavior as a fallback? Or better, switch to soft reset.

### `Lobby.vue`
-   **Structure Fix:** Merge the broken `v-if` chains into a single cohesive block.
-   **State Watcher:** Watch `remoteDisconnectReason` (or reuse `connectionError`) to switch `mode` to `LANDING` or `JOINING` and clear the UI.

## Proposed Implementation

### 1. `src/components/Lobby.vue`
-   Refactor the template to ensure mutual exclusivity:
    ```html
    <div v-if="mode === 'LANDING'">...</div>
    <div v-else-if="mode === 'HOSTING'">...</div>
    <div v-else-if="isPending">...</div>
    <div v-else-if="mode === 'JOINING'">...</div> <!-- Note: Moved !isPending to implicit or explicit check -->
    <div v-else-if="mode === 'WAITING' || gameState.players.length > 0">...</div>
    ```
-   Import and watch `remoteDisconnectReason` from `usePeer`.
    -   If set: `alert(reason); mode.value = 'LANDING';`

### 2. `src/composables/usePeer.js`
-   Add `remoteDisconnectReason` ref.
-   Update `leaveGame`:
    ```javascript
    const leaveGame = () => {
        if (isHost.value) {
            broadcast({ type: 'LOBBY_CLOSED' });
            setTimeout(() => resetGame(), 100); // Give time to send
        } else {
            resetGame();
        }
    }
    ```
-   Update `handleClientData`:
    ```javascript
    case 'LOBBY_CLOSED':
        remoteDisconnectReason.value = 'The host has closed the lobby.';
        resetGame(); // Clears players, resets phase to LOBBY
        break;
    ```
-   Update `hostConn.on('close')`:
    ```javascript
    if (!wasKicked && !remoteDisconnectReason.value) {
        // Keeps existing fallback for unexpected network drops
        alert("Host disconnected");
        window.location.reload();
    }
    ```

## Verification Plan

### Manual Verification
1.  **Test Host Abort:**
    -   Open Host in Tab A.
    -   Open Client in Tab B. Join Game.
    -   Verify Client sees Lobby.
    -   Tab A: Click "Close Lobby".
    -   **Expected:** Tab B should show alert/toast "The host has closed the lobby", then show the LANDING screen (Host/Join buttons). The Player List (Lobby UI) must NOT be visible.
    -   **Expected:** Tab A should return to LANDING screen.

2.  **Test Dual Render Bug:**
    -   Temporarily force `gameState.players` to have items while `mode` is `LANDING` (can do via Vue DevTools or temp code).
    -   Verify strictly one section renders.

3.  **Test Kicking:**
    -   Host kicks Client.
    -   Client shoud see "You have been kicked" and reload (existing behavior).

### Automated Tests
-   Since this involves PeerJS networking and component state, unit tests for `Lobby.vue` can verify the `v-if` logic logic by mocking `gameState` and `mode`.
-   Create `tests/unit/LobbyLogic.test.js`.
