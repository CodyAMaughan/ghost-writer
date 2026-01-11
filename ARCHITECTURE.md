# Architecture Documentation

## 1. Core Concept: "Host as Server"

Ghost Writer utilizes a **Serverless Peer-to-Peer (P2P)** architecture powered by `PeerJS`.

*   **The Host:** The browser instance that starts the game acts as the authoritative Server. It manages the `gameState`, processes logic, runs the timers, and broadcasts state updates to all connected peers.
*   **The Clients (Peers):** Dumb terminals that render the UI based on the `gameState` received from the Host and send `ACTIONS` (inputs, votes) back to the Host.
*   **Networking:** WebRTC via PeerJS. The Host's Peer ID is derived from the Room Code (e.g., `ghost-writer-ABCD`).

## 2. State Management

The Single Source of Truth is `src/composables/usePeer.js`.

*   **`gameState`**: A specific reactive object that contains the entire game world (players, phase, timer, submissions).
*   **Sync:** The Host periodically (or on event) broadcasts the *entire* `gameState` (or a masked version during Voting) to all clients via the `SYNC` message type.
*   **Modifications:** Only the Host may mutate `gameState` directly. Clients must send messages (`SUBMIT_ANSWER`, `SUBMIT_VOTE`) to request changes.

## 3. Theming Engine

Visuals are strictly controlled by `src/config/themes.js`.

*   **Structure:** Themes are objects containing color palettes (`bg`, `text`, `accent`), fonts, and copy/text strings.
*   **Usage:** Components must **never** hardcode colors (e.g., `bg-red-500`). Instead, they bind styles dynamically or use computed classes based on `gameState.currentTheme`.
    *   *Example:* `:class="theme.colors.button"`

## 4. Networking & Race Conditions

*   **Connection:** Clients connect to `ghost-writer-{CODE}`.
*   **Peer Unavailable:** If PeerJS cannot find the ID, it usually means the Host is offline or the code is wrong. The UI handles these errors by alerting the user.
*   **Race Conditions:** Since WebRTC is UDP-like (unreliable ordering sometimes), the Host is the final authority. If two players submit an answer at the exact same millisecond, the Host processes them in the order received in its event loop.

## 5. Directory Structure

*   `src/components/`: Vue components (GameScreen, Lobby).
*   `src/composables/`: Shared logic (`usePeer.js`, `useAudio.js`, `useStreamerMode.js`).
*   `src/config/`: Static configuration (`themes.js`, `avatars.js`).
*   `src/services/`: External API handlers (`ai.js`).
*   `tests/`: Integration and Unit tests (Vitest).
