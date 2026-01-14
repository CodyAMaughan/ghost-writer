# Refactoring Lobby Architecture

## Context & Goals
The current `Lobby.vue` component has become a "God Component," handling landing logic, hosting forms, joining forms, waiting room logic, and disconnect handling. This makes it difficult to maintain and debug (e.g., disconnection alerts getting lost in `v-if` spaghetti). 

The goal is to separate these distinct UI states into focused components, controlled by a high-level `GameController`.

## Architecture Changes

### 1. The Controller
**`GameController.vue`** (Refactor of `LobbyAndGameScreen.vue`)
This component will own the high-level UI "Mode" state. Instead of just switching `Lobby` vs `Game`, it will route between:
1.  **`LANDING`**: The start screen.
2.  **`SETUP_HOST`**: The hosting form.
3.  **`SETUP_JOIN`**: The joining form.
4.  **`PENDING`**: Waiting for host approval.
5.  **`LOBBY`**: The actual "Waiting Room" where players gather.
6.  **`GAME`**: The active gameplay loops (`PROMPT`, `VOTING`, `REVEAL`, etc., handled by `GameScreen.vue`).

### 2. The Components
We will extract logic from `Lobby.vue` into:
*   **`LandingPage.vue`**: 
    *   Contains the "Host Game" and "Join Game" big buttons.
    *   **Owns the Disconnect Banner**. This ensures disconnect messages are always visible at the entry point.
*   **`HostSetup.vue`**: 
    *   Form for Name, AI Provider, API keys, Room Settings (Password/Waiting Room).
*   **`JoinSetup.vue`**: 
    *   Form for Name, Room Code, Password.
    *   Handles connection loading state.
*   **`PendingScreen.vue`**:
    *   The "Waiting for Approval" animation/message.
*   **`Lobby.vue`** (Refactored):
    *   **Strictly the Waiting Room.**
    *   Displays Player List (`Nameplate` grid).
    *   Displays Room Code / Invite Links.
    *   "Start Game" button (Host only).
    *   Chat/Emotes (already in `Lobby` but good to keep here).

## Proposed Implementation Plan

1.  **Create Components**:
    *   `src/components/setup/LandingPage.vue`
    *   `src/components/setup/HostSetup.vue`
    *   `src/components/setup/JoinSetup.vue`
    *   `src/components/setup/PendingScreen.vue`
2.  **Refactor `Lobby.vue`**:
    *   Strip out all forms and landing logic.
    *   Keep only the Player Grid and Game Start logic.
3.  **Update `LobbyAndGameScreen.vue` -> `GameController.vue`**:
    *   Lift the `mode` state (Landing/Host/Join) from the old `Lobby.vue` up to this controller.
    *   Implement the switch logic.
4.  **Update Tests**:
    *   Update `LobbyAndGameScreen.test.js` to reflect the new hierarchy.
    *   Ensure `HostAbort` tests still pass (disconnect banner visibility).

## Testing Strategy
*   **Disconnect Visibility**: Verify that stripping `Lobby.vue` doesn't break the disconnect banner. It must be prominently verified in `LandingPage.vue`.
*   **Navigation**: Verify "Back" buttons in forms correctly return to `LandingPage`.
*   **Game Start**: Verify transitioning from `Lobby` to `Game` works seamlessly.
