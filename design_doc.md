# GHOST WRITER: Game Design Document & Implementation Spec

## 1. Executive Summary
**Ghost Writer** is a multiplayer, browser-based social deduction game where players answer prompts and try to fool others into thinking they are AI (or thinking the AI is human).
* **Theme:** Cyberpunk / Glitch / Terminal.
* **Platform:** Web (Mobile Responsive).
* **Architecture:** Peer-to-Peer (Serverless) using PeerJS.
* **Key Constraint:** Zero assets (no images). All visuals are CSS/Tailwind.
* **Target Audience:** Casual teams (optimized for 10-15 minute sessions).

---

## 2. Technical Stack
* **Framework:** **Vue 3** (Composition API) + **Vite**.
* **Styling:** **Tailwind CSS**.
    * *Constraint:* Use slate/zinc dark mode colors, bright neon accents (green/purple), and monospace fonts for a "terminal" vibe.
* **Networking:** **PeerJS** (WebRTC wrapper).
    * *Host:* Acts as the Game Server and API Gateway.
    * *Peers:* Clients that send inputs to Host.
* **AI Integration:** Multi-Provider Support.
    * **Google Gemini:** Recommended for "Free Tier" play (User provides own free API Key).
    * **OpenAI:** Supported for users with paid keys.
    * *Implementation:* The Host enters the key in the Lobby. All "Ghost" requests from peers are routed through the Host's machine to the AI provider.

---

## 3. Game Mechanics & Flow

### 3.1 Lobby Phase
1.  **Landing Page:**
    * Two buttons: **[ HOST GAME ]** and **[ JOIN GAME ]**.
    * **Host:**
        * Enters Name.
        * Selects AI Provider: [Gemini (Free) | OpenAI].
        * Enters API Key (persisted in `localStorage`).
        * Generates a 4-letter Room Code.
    * **Joiner:** Enters Name + Room Code.
2.  **Lobby Screen:**
    * List of connected players.
    * **Settings (Host Only):**
        * *Rounds:* (Default: 5).
        * *Round Timer:* (Default: 45s).

### 3.2 The Game Loop (Repeats per Round)

**Phase A: The Prompt (System)**
* Host's AI generates a witty/open-ended prompt (e.g., *"What is the worst thing to bring to a funeral?"*).
* Prompt is broadcast to all players.

**Phase B: The Choice (Action)**
* Players see two large buttons:
    1.  **[ ⌨️ WRITE IT YOURSELF ]**: Opens a text input (Max 100 chars).
    2.  **[ 👻 GHOST WRITE IT ]**: Opens "Agent Selector" modal.
        * Player picks 1 of 5 "Ghost Agents" (see Section 6.2).
        * AI returns 3 distinct options based on that agent's persona.
        * Player *must* click one. **NO EDITING ALLOWED.**
* *Timer:* Visual countdown bar at the top. If timer hits 0, a random AI answer is submitted (auto-ghost).

**Phase C: The Voting (Deduction)**
* All submissions are shuffled and displayed anonymously.
* Next to each answer is a toggle switch:
    * **Left:** 👤 HUMAN
    * **Right:** 🤖 BOT
* Players toggle their guess for *every* answer (except their own).
* Submit Votes.

**Phase D: The Reveal & Score**
* One by one, answers are revealed.
* Visual effect: Glitch effect reveals the author's name and the source (Human or AI).
* Points are tallied immediately (see 3.3).

**Phase E: Final Scoreboard**
* After X rounds, display winner.
* "Play Again" button (keeps same lobby/peers connected).

### 3.3 Scoring Matrix (Risk vs Reward)
The scoring is designed to make "Faking AI" high risk/high reward.

| Player Source | The Majority Voted... | Result | Points |
| :--- | :--- | :--- | :--- |
| **Used AI** | "Human" | **SUCCESS** (Fooled them) | **+3 pts** |
| **Used AI** | "Bot" | **FAIL** (Caught lazy) | **0 pts** |
| **Wrote Manual** | "Bot" | **SUCCESS** (Faked being AI) | **+2 pts** |
| **Wrote Manual** | "Human" | **SAFE** (Just honest) | **+1 pt** |

* *Bonus:* **+1 pt** for every correct guess you make about other players.

---

## 4. UI/UX Specifications

### 4.1 Visual Language ("Vibe")
* **Background:** `bg-slate-900`
* **Text:** `text-slate-200` for body, `text-green-400` (terminal green) for system messages.
* **Fonts:** `font-mono` (Courier/Consolas) for everything.
* **Components:**
    * **Cards:** `border border-slate-700 bg-slate-800 rounded-lg shadow-lg`.
    * **Buttons:** `hover:bg-green-500 hover:text-black transition-all uppercase tracking-widest`.
    * **Ghost Mode:** When viewing AI options, the border glows purple (`border-purple-500`).

### 4.2 Key Screens
1.  **"Agent Selection" Modal:**
    * A grid of 5 icons/names. Hovering shows the description.
    * Clicking triggers the API call.
2.  **Voting Screen:**
    * List of cards. Each card has the text in large font.
    * Below text: A segmented control `[ HUMAN | BOT ]`.

---

## 5. Data & Networking (The Protocol)

### 5.1 PeerJS Architecture
* **Host Strategy:** The Host is the "Source of Truth."
* **State:** The game state lives in a reactive object on the Host.
* **Sync:** Host broadcasts `GAME_STATE_UPDATE` payload on change.

### 5.2 Message Payloads (JSON)

**1. Player -> Host:**
```json
{
  "type": "SUBMIT_ANSWER",
  "payload": {
    "playerId": "p_123",
    "text": "Pizza with pineapple",
    "source": "AI", // or "HUMAN"
    "agentUsed": "CHAOS_BOT" // Optional, for stats
  }
}
```

---

## 6. AI Integration Strategy

### 6.1 Service Layer
* The Host implements a `fetchAI(prompt, systemPrompt)` function.
* **Gemini (Default):** Uses `gemini-2.5-flash-lite`.
    * Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`
* **OpenAI:** Uses `gpt-5-mini`.
    * Endpoint: `https://api.openai.com/v1/chat/completions`
* *Constraint:* Latency must be < 3s.

### 6.2 Ghost Agents (The 5 Personas)
When a player clicks "Ghost Write", they choose one of these agents. The UI shows the **Name** and **Description**. The **System Prompt** is hidden.

**1. The Intern**
* *Description:* Trying way too hard to sound professional.
* *System Prompt:* "You are an unpaid corporate intern. Answer the user's prompt using excessive corporate buzzwords, polite filler, and generic enthusiasm. Keep it under 15 words."

**2. The Gen-Z**
* *Description:* Lowercase, indifferent, maybe a typo.
* *System Prompt:* "You are a bored Gen-Z teenager. Answer the prompt using all lowercase, slang (like 'no cap', 'bet', 'mid'), and minimal punctuation. Act like you don't care. Keep it under 10 words."

**3. The Boomer**
* *Description:* ALL CAPS, confused, lots of ellipses...
* *System Prompt:* "You are an elderly person typing on Facebook. Use RANDOM ALL CAPS for emphasis, lots of ellipses..., and maybe sign your name at the end. Keep it under 15 words."

**4. The Caveman**
* *Description:* Simple words. Me like.
* *System Prompt:* "You are a caveman. Use broken grammar. Only one or two syllable words. Aggressive but simple. Keep it under 10 words."

**5. The Philosopher**
* *Description:* Deep, abstract, and completely unhelpful.
* *System Prompt:* "You are a pretentious philosopher. Answer the prompt with an abstract metaphor or a rhetorical question. Sound deep but say nothing of substance. Keep it under 15 words."

### 6.3 Standard Output Format
For all agents, append this instruction:
> "Provide 3 distinct variations of this persona answering the prompt. Return ONLY a JSON array of strings: ['ans1', 'ans2', 'ans3']."

---

## 7. Implementation Roadmap for Agent

1.  **Scaffold:** Create Vue 3 + Vite project with Tailwind.
2.  **Networking Core:** Implement `usePeerHost` and `usePeerClient` composables. Verify connection with a "Ping" button.
3.  **Lobby UI:** Build the Host/Join screens and Player List.
4.  **Game State Machine:** Build the Host's logic to switch phases (Lobby -> Prompt -> Input -> Voting).
5.  **API Handler:** Implement the OpenAI/Gemini fetch wrapper on the Host side.
6.  **Game UI:** Build the "Split Choice" screen, "Agent Selection" Modal, and "Voting" toggle list.
7.  **Scoring Logic:** Implement the "Risk vs Reward" Scoring Matrix.
8.  **Polish:** Add "Glitch" CSS animations and mobile responsiveness.