# Discord Invite & Sharing

## Context & Goals
**User Story:** As a player, I want to easily join the community Discord from the game so that I can find lobbies, report bugs, and chat with other players.
**Business Goal:** Increase community engagement and retention by funneling players to the Discord server.

## Architecture Changes
*   **State:** No new global state required in `usePeer.js`.
*   **Theme:** No changes to `themes.js` required (icons will inherit existing text/hover colors).
*   **Assets:** New Discord icon component required.

## Proposed Implementation
### 1. `src/components/icons/DiscordIcon.vue` [NEW]
*   **Purpose:** Vector asset for the Discord logo.
*   **Implementation:** SVG path for the Discord logo wrapped in a Vue functional component.

### 2. `src/App.vue` [MODIFY]
*   **Change:** Add `DiscordIcon` to the header.
*   **Details:**
    *   Place next to `Share2`, `UserCog`, `HelpCircle`.
    *   Pattern: `<a href="https://discord.gg/nVSSqR8gAJ" target="_blank"> <DiscordIcon /> </a>`.
    *   Using **Option A (Direct Link)** based on analysis: Lowest friction, user standard behavior.

### 3. `src/components/Lobby.vue` [NO CHANGE]
*   **Decision:** We will **NOT** add a specific "Share to Discord" button.
*   **Reasoning:** Discord lacks a web-intent API for sharing text. Opening the web app to the home screen provides no value over the existing "Copy Link" button functionality.

## Testing Strategy
1.  **Unit:** None required (stateless change).
2.  **Manual:**
    *   Click Discord icon -> Opens new tab -> Redirects to invite.
    *   Verify Hover states match strict theme colors (e.g. `hover:text-purple-400`).
    *   Mobile viewport check: Ensure header does not overflow.
