# Reactive Chat Names

## Context & Goals
The user requests that if a player changes their name, all historical chat messages should update to reflect the new name.
Currently, chat messages store the `senderName` at the time of sending, acting as a snapshot.

## Goals
1.  **Reactive Updates:** When a player changes their name in the lobby/game, their past messages should instantly update to show the new name.
2.  **Graceful Fallback:** If a player disconnects voluntarily, their messages should remain visible with their last known name.
3.  **Security/Moderation:** If a player is **KICKED** (removed by host), all their past messages should be deleted from the chat to remove potential toxicity/spam.
4.  **Minimal State Complexity:** Avoid creating complex "Historical Player Registries" if possible.

## Architecture Changes
### `src/components/GameChat.vue`
- **Current:** Directly matches `msg.senderName` from the message object.
- **Proposed:** Implement a dynamic lookup.
    - Check if `msg.senderId` exists in `gameState.players`.
    - **If Yes:** Use the `name` from `gameState.players` (which is reactive and updates on `UPDATE_NAME`).
    - **If No:** Fallback to `msg.senderName` (the snapshot stored when message was sent).

### `src/composables/usePeer.js`
- **No Changes Required:** The current data structure supports this hybrid approach perfectly. `gameMessages` already contains `{ senderId, senderName }`.
- `senderName` in the message object transitions from being the "Display Name" to being the "Fallback Name".

## Proposed Implementation
1.  **Modify `GameChat.vue`**:
    - Add a helper function `getDisplayName(msg)`.
    - Update template to use `{{ getDisplayName(msg) }}` instead of `{{ msg.senderName }}`.

## Logic Updates (`usePeer.js`)
1.  **Name Updates:**
    - In `handleHostData`, listener for `UPDATE_NAME`.
    - Iterate `gameMessages` and update `senderName` for matching `senderId`.
2.  **Kick Deletion:**
    - In `removePlayer(id, reason)`, if `reason === 'KICKED'` (or manually triggered by Host 'Kick' button):
    - Filter `gameMessages` to exclude messages where `senderId === kickedId`.
    - **Host needs to broadcast a sync or special 'CHAT_CLEAR_USER' event?**
    - Simpler: Host broadcasts `SYNC` or `CHAT_DELETE_USER`.
    - Since `gameMessages` is local state on clients (pushed via `CHAT_MESSAGE`), Host needs to tell clients to delete.
    - **Proposal:** Add `CHAT_DELETE_USER` message type.
        - Host sends `{ type: 'CHAT_DELETE_USER', payload: { userId } }`.
        - Clients receive and filter `gameMessages`.

## Testing Strategy
> **Requirement:** Start with tests (TDD).

1.  **Integration Test (`ChatSystem.test.js`)**:
    - **Test 1: Reactive Name Change**
        - User A joins as "Alice".
        - User A sends "Hello".
        - Verify `gameMessages` has "Alice".
        - User A updates name to "Bob".
        - Verify `gameMessages` now has "Bob" for the SAME message ID.
    
    - **Test 2: Persist Name After Leave**
        - User A (Bob) leaves (Disconnect).
        - Verify `gameMessages` still has "Bob".
        - (Contrast with previous logic where it might have reverted if we relied solely on lookup).

    - **Test 3: Delete on Kick**
        - User A joins.
        - User A sends "Bad Message".
        - Host Kicks User A.
        - Verify User A is removed from `gameState.players`.
        - **Verify User A's messages are removed from `gameMessages`.**
        - Verify other clients also remove the messages (spy on Client B).

## Refined Architecture
### `src/composables/usePeer.js`
- **Action:** Update `handleHostData` case `UPDATE_NAME`.
- **Logic:**
    - When updating `player.name`, also iterate `gameMessages.value`.
    - For each message where `msg.senderId === senderId`, update `msg.senderName = newName`.
    - This handles the "Persist after Leave" requirement.

### `src/components/GameChat.vue`
- **Action:** Use dynamic lookup OR just rely on the `usePeer` update?
- If `usePeer` updates the array item, Vue will react.
- So we *don't* even need the dynamic lookup helper if we update the source of truth!
- **Decision:** Updating the source of truth (`gameMessages`) is cleaner and persistent.

## Detailed Plan
1.  **Refactor `usePeer.js`**:
    - In `handleHostData` -> `UPDATE_NAME`:
        - Update `gameState.players` (existing).
        - **NEW:** Update `gameMessages` entries matching `senderId`.
    - **Refactor `usePeer.js` Core:**
        - Expose `kickPlayer(id)` function.
        - Logic: Call `removePlayer(id, 'KICKED')`.
    - In `removePlayer(id, reason)`:
        - If `reason === 'KICKED'`:
            - Browse `gameMessages`, remove items from kicked user.
            - Broadcast `CHAT_DELETE_USER` to clients.
2.  **Verify**:
    - Run `ChatSystem.test.js`.
