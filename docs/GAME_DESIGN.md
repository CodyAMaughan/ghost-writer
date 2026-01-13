# GHOST WRITER: Game Design Document & Implementation Spec

> **NOTE:** This document has been rewritten to reflect the actual state of the codebase as of Jan 2026. The original `design_doc.md` is considered deprecated in favor of this file.

## 1. Executive Summary
**Ghost Writer** is a multiplayer, browser-based social deduction game.
* **Core Loop:** Users answer prompts -> Others vote if it's Human or AI.
* **Architecture:** Peer-to-Peer (Serverless) using PeerJS.
* **Visuals:** Dynamic "Theme Engine" (Viral, Academia, Cyberpunk, Classic).
* **AI:** Pluggable Providers (Gemini, OpenAI, Custom).

## 2. Technical Stack
* **Framework:** **Vue 3** (Composition API) + **Vite**.
* **Styling:** **Tailwind CSS** (Driven by `src/config/themes.js`).
* **Icons:** `lucide-vue-next`.
* **Networking:** **PeerJS** (Host-as-Server).

## 3. Game Mechanics

### 3.1 Lobby & Setup
* **Host:** Creates room, selects AI Provider, configures settings (Round Timer, Password, Waiting Room).
* **Moderation:** Host can **Kick** players, which removes them and scrubs their messages from the chat.
* **Joiners:** Connect via 4-letter Room Code.
* **Avatars:** Players select from 12 preset avatars (`src/config/avatars.js`).

### 3.2 The Game Loop
**Phase A: Prompt**
* Host generates prompt based on current theme (`THEMES[id].prompts`).

**Phase B: Input**
* Players choose:
    1.  **Manual:** Type answer.
    2.  **Ghost Write:** Select an "Agent" persona or "Custom Agent".
        * *Agent:* Theme-specific (e.g., "Influencer" in Viral, "Professor" in Academia).
        * *Custom:* User defines Name + Persona Prompt.
* **Timer:** Auto-submits random AI answer if time expires.

**Phase C: Voting**
* Anonymized answers displayed.
* Players vote **HUMAN** (Left) or **BOT** (Right).
* Players *cannot* vote on their own submission.
* **Chat:** Players can discuss votes in real-time. Chat names update automatically if a player changes their name.

**Phase D: Reveal**
* "Drumroll" animation revealing answers one by one.
* Shows Author, Source (Human/AI), and Agent used.

**Phase E: Scoring**
* **+3 pts:** Used AI and fooled majority (Voted Human).
* **+2 pts:** Wrote Manual and fooled majority (Voted Bot).
* **+1 pt:** Wrote Manual and correctly identified (Safe).
* **+1 pt:** Per correct guess on others.

## 4. Theme Engine (`src/config/themes.js`)
The game features 4 distinct themes that completely overhaul the UI strings, colors, and available agents. 

1.  **Viral (Chronically Online):**
    *   *Vibe:* Gen-Z, Neon Cyan, Social Media.
    *   *Agents:* Influencer, Troll, Reply Guy, Spambot, Anon.
2.  **Academia (Dark Academia):**
    *   *Vibe:* Serif fonts, Amber/Stone, Occult Research.
    *   *Agents:* Professor, Poet, Occultist, Novelist, Critic.
3.  **Cyberpunk (Hacker):**
    *   *Vibe:* Monospace, Green/Black, Terminal.
    *   *Agents:* Netrunner, Corp Exec, Rogue AI, Fixer, Glitch.
4.  **Classic (Party Game) (Default):**
    *   *Vibe:* Emerald/Slate, clean.
    *   *Agents:* Minimalist, Devils Advocate, Hype Man, Wiki, Theorist.

## 5. Data & Networking

### 5.1 State (`usePeer.js`)
*   **Singleton State:** All game logic resides in the `gameState` reactive object.
*   **Host Authority:** Only Host mutates state. Clients send events.

### 5.2 Payloads
*   `SUBMIT_ANSWER`: `{ text, source, agent }`
*   `SUBMIT_VOTE`: `{ targetAuthorId, guess }`
*   `REQUEST_GHOST`: `{ agentId, customSystemPrompt }` -> Host fetches AI and returns options.

## 6. Social Integration
*   **Discord Community:** Direct invite link in the application header to foster community growth.
*   **Sharing:** "Share2" menu allows posting game invites/prompts to Twitter, Reddit, LinkedIn, and WhatsApp.

## 7. Streamer Mode
*   **Purpose:** Masks sensitive information (Room Code, QR Code) to prevent stream sniping.
*   **Features:**
    *   Room Code hidden in header and lobby.
    *   QR Code blurred in lobby.
    *   "Persistent Prompt" in Reveal Phase ensures viewers tuning in late can see context.
*   **Controls:** Toggleable via Settings Modal. State persisted in `localStorage`.
