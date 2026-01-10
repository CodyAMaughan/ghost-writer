# Integration Tests for Game Logic

## Context & Goals
The project currently relies on Unit Tests that mock the core logic provider (`usePeer.js`), which leaves the actual game logic (state transitions, scoring, networking handling) largely untested.
We aim to fix this by implementing Integration Tests that use the **real** `usePeer` logic but mock the external PeerJS network and AI services.

> **NOTE:** This document is a DESIGN SPECIFICATION only. The implementation is not part of this task.
> **Scope:** Prioritizing "Main Logic" (Lobby, Game Flow, AI, System Robustness).

## Architecture Changes
No changes to `src/`.
New files in `tests/integration/`:
- `LobbyLogic.test.js`: Covers Host/Client handshake, passwords, waiting room.
- `GameFlow.test.js`: Covers game loop, prompts, scoring, timers.
- `AILogic.test.js`: Covers AI service integration.
- `SystemRobustness.test.js`: Covers edge cases, audio, settings, and full system interactions.

## Proposed Implementation & Test Mapping

### 1. `tests/integration/LobbyLogic.test.js`
*Covers scenarios from `LobbyAdvanced.test.js` and `LobbyAuth.test.js`.*

| Logic Scenario | Existing Unit Test | Integration Test Case |
| :--- | :--- | :--- |
| **Host Init** | `LobbyAuth.test.js` | `initHost` sets correct settings (password, waiting room). |
| **Password Auth** | `LobbyAuth.test.js` | `joinGame` with correct password succeeds; incorrect password triggers `AUTH_ERROR`. |
| **Waiting Room** | `LobbyAdvanced.test.js` | `joinGame` -> Host sees `pendingPlayers` -> `approvePendingPlayer` -> `SYNC` received. |
| **Kick Player** | `LobbyAdvanced.test.js` | `kickPlayer` removes from `gameState` and sends `KICKED` message. |
| **Name Collision** | `LobbyAuth.test.js` | `joinGame` with existing name triggers `REJECTED` state. |
| **Reconnection** | `LobbyAuth.test.js` | `joinGame` after disconnect clears error states. |
| **Abort Game** | `LobbyAdvanced.test.js` | `returnToLobby` (called by App "Abort" or End Game) resets state but keeps IDs. |

### 2. `tests/integration/GameFlow.test.js`
*Covers scenarios from `FeatureIntegration.test.js` and `LobbyAndGameScreen.test.js`.*

| Logic Scenario | Existing Unit Test | Integration Test Case |
| :--- | :--- | :--- |
| **Prompt Dedup** | `FeatureIntegration.test.js` | `generateNewPrompt` iterates through array and resets `usedPrompts` only when full. |
| **Timer Logic** | `FeatureIntegration.test.js` | `startTimer` decrements correct state; triggers `startVoting` at 0. |
| **Auto-Submit** | `LobbyAndGameScreen.test.js` | Timer hitting 0 forces random AI submission for missing players. |
| **Submission** | `LobbyAndGameScreen.test.js` | `submitAnswer` adds to `submissions` array. |
| **Self-Voting** | `LobbyAndGameScreen.test.js` | (Validated via GameState) `submitVote` prevents voting for own `authorId` or verifies correct scoring exclusion if allowed. |
| **Scoring Rules** | `UsePeerLogic.test.js` | Verify +3 (Fool), +2 (Fake), +1 (Safe) logic explicitly. |
| **Round Accum** | `FeatureIntegration.test.js` | `nextRound` increments round number and preserves score. |
| **Ranking** | `PhaseFinish.test.js` | Verify `gameState.players` scores are correct (UI sorting validation is secondary). |
| **Theme Phase** | `FeatureIntegration.test.js` | `setTheme` updates current theme; `generateNewPrompt` respects new theme. |

### 3. `tests/integration/AILogic.test.js`
*Covers scenarios from `FeatureIntegration.test.js` (Ghost parts) and `AIService.test.js`.*

| Logic Scenario | Existing Unit Test | Integration Test Case |
| :--- | :--- | :--- |
| **Ghost Gen** | `FeatureIntegration.test.js` | `getGhostOptions` calls mocked `fetchAI` and returns array. |
| **Custom Agent** | `FeatureIntegration.test.js` | `getGhostOptions('custom', prompt)` passes correct system prompt. |
| **JSON Repair** | `AIService.test.js` | Mock broken JSON response from `fetch` and assert `fetchAI` repairs it. |
| **Provider Switch** | `FeatureIntegration.test.js` | `initHost` with different providers sets `gameState.settings.provider`. |
| **Proxy Call** | `AIService.test.js` | `official-server` provider calls Netlify proxy URL. |

### 4. `tests/integration/SystemRobustness.test.js`
*New robust test scenarios for Application-level logic.*

| Logic Scenario | Component Origin | Integration Test Case |
| :--- | :--- | :--- |
| **"Zombie" Player** | `Lobby.vue` | `joinGame` (fail) -> `kickPlayer` (cleanup) -> `joinGame` (success). Verify recovery. |
| **Audio Persist** | `App.vue` / `useAudio` | Mock `localStorage`, call `useAudio.init()`, verify `masterVolume` is restored. |
| **Audio Logic** | `Lobby`/`GameScreen` | Verify transitions: `playMusic('BGM_LOBBY')` -> `playMusic('BGM_VIRAL')` works and fades old track. |
| **Theme Logic** | `Navbar`/`App.vue` | `setTheme` updates `currentTheme` and logic (e.g., prompt list) follows suit. |
| **Settings Effect** | `SettingsModal.vue` | `initHost` with `roundDuration: 10` -> `startRound` uses 10s timer. |

## Verification Plan

### Automated Tests
Run the new integration tests:
```bash
npx vitest run tests/integration
```

### Exclusions
- **Sharing Links (`App.vue`):** Logic is primarily browser API (`window.location`, `navigator`). Best covered by E2E or Component Unit Tests if needed.
- **Custom Agent Persistence (`CustomAgentEditor.vue`):** Logic is local to the component (`localStorage` access internal to mount).
