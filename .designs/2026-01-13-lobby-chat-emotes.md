# Feature: Universal Chat & Reaction Emotes

## Context & Goals
Players interactions are currently limited to voting.
**Goal:** Increase engagement by adding a persistent social layer across **ALL** game phases (Lobby, Game, Reveal).
1.  **Universal Chat:** Ephemeral real-time messaging available at all times.
2.  **Reaction Emotes:** Visual particle effects (emojis) triggered by players.
3.  **Monetization Foundation:** A secure registry system supporting "Paid/Premium" emotes.

## Architecture Changes

### 1. New Emote Registry (`src/config/emotes.js`)
Centralized registry for security and commerce.
-   **Structure:** Map of `emote_id` -> `metadata` (char, cost, locked, type).
-   **Security:** Host validates incoming `emoteId` against this registry.

**Registry Content:**
*   **Standard (Free):**
    *   `heart` ❤️, `laugh` 😂, `fire` 🔥, `ghost` 👻 (Free per request)
    *   `ai` 🤖 (Free per request)
    *   `thumbs_up` 👍, `clap` 👏, `cry` 😭, `rage` 😡
    *   `surprise` 😮, `party` 🎉, `skull` 💀,
    *   `alien` 👽, `rocket` 🚀
*   **Premium (Locked - Future Use):**
    *   `human` 👤 (Cost: 100)
    *   `custom_gif` (Placeholder for GIF support)
*   **Avatars:**
    *   Mechanic: Players can "emote" their current avatar face.
    *    Implementation: `avatar_{id}` maps to dynamic rendering.

### 2. Network Protocol (`src/composables/usePeer.js`)
We will add two new message types:
-   `CHAT_MESSAGE`: Relay-only. Ephemeral (not stored in persistent `gameState`).
-   `REACTION_EMOTE`: Relay-only (after validation).

### 3. Component Architecture (Refactor)
-   **Current:** `Lobby.vue` handles its own UI.
-   **New:** `App.vue` will host the `GameChat` and `ReactionOverlay` components globally so they persist between `Lobby` and `GameScreen` phases without state loss.

## Proposed Implementation

### 1. `src/config/emotes.js` [NEW]
```javascript
export const EMOTE_REGISTRY = {
  // Standard (Free)
  heart: { id: 'heart', char: '❤️', type: 'standard', cost: 0, locked: false },
  laugh: { id: 'laugh', char: '😂', type: 'standard', cost: 0, locked: false },
  fire: { id: 'fire', char: '🔥', type: 'standard', cost: 0, locked: false },
  ghost: { id: 'ghost', char: '👻', type: 'standard', cost: 0, locked: false },
  ai: { id: 'ai', char: '🤖', type: 'standard', cost: 0, locked: false },
  // ... (Full list from Context & Goals)
  
  // Premium
  human: { id: 'human', char: '👤', type: 'premium', cost: 100, locked: true },
};
```

### 2. `src/composables/usePeer.js` [MODIFY]
-   **State:** Add `gameMessages` (reactive array) and `lastReaction` (reactive).
-   **Methods:** `sendChatMessage(text)`, `sendEmote(emoteId)`.
-   **Host Logic:** Validate `emoteId` against registry (is !locked). Rate limit (Token Bucket). Broadcast.

### 3. `src/components/GameChat.vue` [NEW]
**Responsibility:** Persistent UI for Chat and Emotes.
-   **Props:** None.
-   **State:**
    -   `isOpen`: Boolean (toggles drawer).
    -   `currentTab`: 'CHAT' | 'EMOTES'.
    -   `inputText`: String.
    -   `gameMessages`: read from `usePeer`.
-   **Layout (Junior Dev Spec):**
    -   Use a fixed container `fixed bottom-4 right-4 z-50`.
    -   **Mobile:** `fixed inset-x-0 bottom-0 h-[50vh]` (Sheet).
    -   **Header:** Toggle button (Icon: MessageCircle) if closed. If open, close button (X).
    -   **Chat Tab:**
        -   `ul` with list of messages. Use `v-for="msg in gameMessages"`.
        -   Format: `<span class="font-bold text-accent">{{ msg.senderName }}:</span> {{ msg.text }}`.
        -   Auto-scroll to bottom on new message.
    -   **Emotes Tab:**
        -   Grid layout `grid-cols-4 gap-2`.
        -   Buttons for each entry in `EMOTE_REGISTRY`.
        -   If `locked`, apply `opacity-50 grayscale cursor-not-allowed`.
        -   Clicking valid emote -> calls `usePeer().sendEmote(id)`.

### 4. `src/components/ReactionOverlay.vue` [NEW]
**Responsibility:** Renders the visual effects (particles) globally.
-   **Props:** None.
-   **Events:** None (Passive listener).
-   **State:**
    -   `particles`: Array of objects `{ id, x, y, char, type }`.
-   **Logic:**
    -   Watch `usePeer().lastReaction`.
    -   On change:
        1.  Determine Emoji char from `EMOTE_REGISTRY[id]`.
        2.  Calculate random X position (10% - 90% viewport width).
        3.  Push new particle to `particles` array. `id = Date.now()`.
        4.  `setTimeout(() => removeParticle(id), 3000)`.
-   **Template:**
    -   Root: `div class="fixed inset-0 pointer-events-none z-[100] overflow-hidden"`.
    -   Items: `<TransitionGroup name="float-up">`.
        -   Render `div` (or `AvatarIcon` if type=avatar) at `left: particle.x%`.
        -   Apply CSS class for animation.
-   **Animation (Tailwind/CSS):**
    -   Define a keyframe `float-up` in `index.css` or `<style>` block.
    -   Bottom: `100%`, Opacity: `1`.
    -   Top: `50%`, Opacity: `0`.
    -   Duration: `2s`.
    -   Timing: `ease-out`.

### 5. `src/App.vue` [MODIFY]
-   Mount `GameChat` and `ReactionOverlay`.
-   Positioning: Ensure `z-index` is high enough to overlap `GameScreen` content but not block critical modals (modals usually z-[100]+).

## Testing Strategy
> Follows `.agent/rules/20-testing.md`

### Unit Tests (`tests/unit/components/GameChat.test.js`)
-   **Mock:** `vi.mock('@/composables/usePeer')`.
-   **Test:**
    -   Renders input field.
    -   Clicking "Send" calls `sendChatMessage`.
    -   Clicking emote calls `sendEmote`.
    -   Locked emotes are disabled/unclickable.

### Integration Tests (`tests/integration/ChatSystem.test.js`)
-   **Setup:** Use `tests/mocks/peerjs.js`. **DO NOT** mock `usePeer` inline.
-   **Scenario 1: Chat Broadcast**
    -   Init Host + 1 Client.
    -   Client A `sendChatMessage('Hello')`.
    -   Host receives -> Broadcasts.
    -   Client B receives `CHAT_MESSAGE`.
    -   Assert `gameMessages` array updates.
-   **Scenario 2: Emote Security**
    -   Client sends `human` (Locked).
    -   Host `handleHostData` -> Checks Registry -> Sees `locked: true`.
    -   Host **DOES NOT** broadcast.
    -   Assert `lastReaction` does not update on clients.
-   **Scenario 3: Rate Limiting**
    -   Client sends 10 emotes instanly.
    -   Host relays valid amount only.

### Manual Verification
-   Open 3 tabs.
-   Verify Chat persists when Host clicks "Start Game" (Phase Lobby -> Game).
