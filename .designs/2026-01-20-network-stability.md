# Network Stability & Notification System

## Context & Goals
The current application relies on passive WebRTC timeouts (~60s) to detect player disconnects, which causes "ghost" players to remain active in the lobby. Additionally, the host lacks visibility into these events without checking the Player Manager.

**Goals:**
1.  **Fast Disconnect Detection**: Implement an active "Heartbeat" system to detect disconnected clients within ~6-10 seconds.
2.  **Host Control**: Disable auto-removal of disconnected players. Allow the Host to decide whether to "Remove" (free up slot) or "Ban" (Kick) a player.
3.  **Visibility**: Implement a global "Toast" notification system to alert the Host/Players of connection events (Join, Leave, Reconnect) without blocking the UI.

## Architecture Changes

### 1. Heartbeat System (`usePeer.js`)
*   **Protocol**:
    *   **Client**: Sends `HEARTBEAT` message every 2 seconds.
    *   **Host**: Maintains `lastHeartbeat` map for all connected peers.
    *   **Host Loop**: Runs every 1 second. Checks if `Date.now() - lastHeartbeat > 6000ms`.
    *   **Detection**: If timeout exceeded -> Mark as `disconnected`.
*   **Auto-Removal**:
    *   **REMOVE** the existing 60s `setTimeout` in `handleDisconnect`.
    *   Players remain in `disconnected` state indefinitely until reconnected or manually removed.

### 2. Player Management Logic
*   **Remove vs Kick**:
    *   `kickPlayer(id)`: Adds UUID to Blacklist + Closes Connection + Removes from list (Existing).
    *   `removePlayer(id)`: Closes Connection + Removes from list (Does NOT Blacklist). Allows rejoining.

### 3. Notification System
*   **State**: accessible via `usePeer()` or a new `useNotifications()` composable?
    *   *Decision*: Keep it simple. Add `notificationQueue` to `usePeer` singleton state (or a separate small composable if it gets complex, but `usePeer` owns the events).
    *   **Events**: `addNotification({ type: 'info|error|success', message: '...' })`.
*   **UI**:
    *   `GlobalNotification.vue`: Custom non-blocking overlay at the **top** of the screen.
    *   **Behavior**:
        *   Auto-dismiss after 3-5 seconds.
        *   Non-interactive (clicks pass through, except for close button).
        *   "X" button to close early.
        *   Stacks vertically if multiple events occur.

## Proposed Implementation

### Files to Modify
1.  **`src/composables/usePeer.js`**:
    *   Add `startHeartbeat()` / `stopHeartbeat()`.
    *   Add `HEARTBEAT` message handler.
    *   Update `handleDisconnect` to remove auto-kick timer.
    *   Expose `removePlayer` (ghost removal).
    *   Add `notifications` reactive state and `addNotification` function.
2.  **`src/components/modals/PlayerManagerModal.vue`**:
    *   Add "Remove" button (Trash icon?) for disconnected players.
    *   Distinct from "Kick" (Ban).
3.  **`src/components/GameController.vue`**:
    *   Mount `GlobalNotification` component.

### Files to Create
1.  **`src/components/common/GlobalNotification.vue`**:
    *   Displays stack of temporary toast messages.
    *   Animations (Slide in/out).
2.  **`tests/integration/NetworkStability.test.js`**:
    *   Logic tests for Heartbeat timeout and Reconnection.

## Testing Strategy

### Integration Tests (`tests/integration/NetworkStability.test.js`)
1.  **Heartbeat Timeout**:
    *   Mock time.
    *   Connect p2.
    *   Advance time > 6s without heartbeat.
    *   Expect p2 status to be 'disconnected'.
    *   Notification added: "p2 disconnected".
2.  **Heartbeat Recovery**:
    *   p2 sends `HEARTBEAT`.
    *   Expect status 'connected'.
3.  **Manual Removal**:
    *   Trigger `removePlayer`.
    *   Expect p2 gone from `gameState.players`.
    *   Expect p2 NOT in `gameState.blacklist`.

### UI Tests
*   Verify Notification component renders messages.
*   Verify "Remove" button calls correct function.
