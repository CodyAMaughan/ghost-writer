# Streamer Mode

## Context & Goals
Streamers and content creators often want to play with their community but need to control who joins the game to prevent "stream sniping" or unauthorized access.  
**Goal:** Add a client-side "Streamer Mode" that masks sensitive information (Room Code) on the screen while still allowing the host to copy/share it privately. Additionally, improve the viewer experience by ensuring context (the prompt) is always visible.

## Architecture Changes

### New Composable: `useStreamerMode`
A lightweight, persisted state manager.

*   **State:** `isStreamerMode` (Boolean, default `false`).
*   **Persistence:** `localStorage.getItem('gw_streamer_mode')`.
*   **Exports:**
    *   `isStreamerMode`: Ref<Boolean>
    *   `toggleStreamerMode`: Function
    *   `maskedCode`: Computed Ref (Returns `****` or actual code based on state).

## Proposed Implementation

### 1. `src/composables/useStreamerMode.js` [NEW]
Create the shared state logic.

### 2. `src/components/SettingsModal.vue` [MODIFY]
Add a toggle switch for "Streamer Mode".

### 3. `src/App.vue` [MODIFY]
Update the Header to respect streamer mode.
*   **Logic:**
    *   If `isStreamerMode` is true: Show `<EyeOff />` icon instead of the text code.
    *   If `isStreamerMode` is false: Show code as normal.

### 4. `src/components/Lobby.vue` [MODIFY]
*   **Masking:** Hide the large room code if `isStreamerMode` is active.
*   **QR Code (New Feature):** Add a QR code (using `qrcode.vue`) for easy mobile joining.
    *   *Constraint:* This QR code **MUST** be blurred or hidden when Streamer Mode is active.
*   **Copy Button:** Always copies the real code, gives visual feedback "Copied (Hidden)".

### 5. `src/components/phases/PhaseReveal.vue` [MODIFY]
*   **Persistent Prompt:** Add the prompt display (similar to `PhaseVoting.vue`) to the top of the reveal screen. This ensures viewers who tune in late know what the answers are responding to.

## Testing Strategy

### Unit Tests (`tests/unit/composables/useStreamerMode.test.js`)
*   `it('persists state to localStorage')`
*   `it('toggles correctly')`

### Component Tests (`tests/unit/components/LobbyStreamer.test.js`) [NEW]
*   `it('masks room code text when streamer mode is enabled')`
*   `it('blurs/hides QR code when streamer mode is enabled')`
*   `it('reveals code when streamer mode is disabled')`
*   `it('copies actual code to clipboard even when masked')`

### End-to-End Verification
*   Manual check: Turn on mode, verify Navbar code is hidden.
*   Manual check: Verify Lobby code is hidden.
*   Manual check: Verify QR code is hidden.
*   Manual check: Verify Prompt is visible in Reveal phase.
