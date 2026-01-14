# Refactor: Modularize usePeer.js

## Context & Goals
The `usePeer.js` composable has grown to ~950 lines, becoming a "God Object" that manages networking, game state, chat, business logic, and UI state simultaneously.
**Problems:**
1.  **Maintainability:** Hard to read and navigate.
2.  **Fragility:** Recent edits caused syntax errors due to deep nesting (e.g., `initHost` containing `joinGame`).
3.  **Security Integration:** Adding secure TURN fetching logic introduced async complexity that broke the existing structure.

**Goal:**
Refactor `usePeer.js` into smaller, single-responsibility composables without changing the external API consumed by components.

## Architecture Changes
We will adopt a "Composition Root" pattern where `usePeer.js` coordinates specialized sub-composables.

### New Config/State Structure
`usePeer.js` will remain the source of truth for `gameState` (reactive object) to ensure playing/hosting uses the same shared state memory.

### New Module Breakdown
We will extract logic into `src/composables/peer/`:

1.  **`useIceServers.js`**
    *   **Responsibility:** Networking Configuration.
    *   **Logic:** Fetching credentials from Netlify Functions, STUN/TURN array construction.
    *   **Exports:** `getIceServers()`.

2.  **`useChat.js`**
    *   **Responsibility:** Messaging & Emotes.
    *   **Logic:** `gameMessages` array, `lastReaction`, sending/receiving 'CHAT_MESSAGE' and 'REACTION_EMOTE'.
    *   **Exports:** `gameMessages`, `lastReaction`, `sendChatMessage`, `sendEmote`, `handleChatData`.

3.  **`useHostLogic.js`**
    *   **Responsibility:** The Game Master "Brain".
    *   **Logic:** `startGame`, `startRound`, `startTimer`, `startVoting`, `calculateScores`.
    *   **Exports:** Host actions (`start...`), `handleHostData` (Server-side switch statement).

4.  **`useGhostAI.js`**
    *   **Responsibility:** AI Proxy.
    *   **Logic:** `getGhostOptions`, routing requests to Host if client, Host calling `fetchAI`.
    *   **Exports:** `getGhostOptions`, `handleGhostRequest`.

5.  **`usePlayerList.js`**
    *   **Responsibility:** Lobby Management.
    *   **Logic:** `players` array, `pendingPlayers`, `addPlayer`, `removePlayer` (kick/leave), `setAvatar`.
    *   **Exports:** `addPlayer`, `removePlayer`, `kickPlayer`, `handlePlayerAction`.

## Proposed Implementation Steps

### Phase 1: Infrastructure (Critical)
1.  Create `src/composables/peer/` directory.
2.  Implement `useIceServers.js` (Solves the current "Secure TURN" blocker).
3.  Modify `usePeer.js` to import and use `getIceServers()`.

### Phase 2: Cleanup (High Value)
4.  Implement `useChat.js`. Moves ~200 lines.
5.  Implement `useGhostAI.js`. Isolates external dependencies.

### Phase 3: Core Logic (Complex)
6.  Implement `usePlayerList.js`.
7.  Implement `useHostLogic.js`.

## Testing Strategy
1.  **Unit Tests:**
    *   Create `tests/unit/peer/IceServers.test.js` to verify the fetch logic in isolation.
    *   Update `tests/unit/NetworkConfig.test.js` to test the integrated flow.
2.  **Integration Tests:**
    *   Run `tests/integration/ChatSystem.test.js` after Phase 2 to ensure no regression in chat.
    *   Run `tests/integration/LobbyLogic.test.js` after Phase 3.
3.  **Manual:**
    *   Verify mobile connection (TURN usage).
