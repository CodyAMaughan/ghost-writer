# Feature: Player Identity & Nameplates

## 1. Context & Goals
**Problem:** 
1. Player identity (Name + Avatar) logic is duplicated across `Lobby.vue`, `PhaseReveal.vue`, etc.
2. Avatar colors are hardcoded classes (e.g., `text-black`), which causes visibility issues on dark backgrounds.
3. User wants to change Name/Avatar easily in the lobby or inter-game screens.

**Goal:** 
Refactor player identity into a standard `Nameplate` component system, decouple colors from implementation details, and add a "Profile Editor" for easy customization.

## 2. Architecture Changes

### 2.1 Configuration (`src/config/avatars.js`)
*   **Change:** Remove Tailwind utility classes from `color` property.
*   **New Structure:**
    ```javascript
    export const AVATARS = [
        // BEFORE: color: 'border-blue-500 text-blue-500'
        // AFTER:  theme: 'blue' (or hex/HSL)
        { id: 0, name: 'Beats', theme: 'cyan', bgPos: '3% 0%' },
        { id: 4, name: 'Cool',  theme: 'monochrome', bgPos: '3% 50%' },
    ];
    ```
*   **Reason:** Allows components to decide *how* to use the color (e.g., Text Shadow for dark mode vs Border color).

### 2.2 State (`src/composables/usePeer.js`)
*   **Verify/Add Action:** `updatePlayerName(newName)`
    *   Previously `handleHostData` had `JOIN` logic, but we need an explicit `UPDATE_NAME` event for mid-lobby changes.
    *   **Constraint:** Updates only allowed in `Lobby` or `Finish` phases (not during active gameplay to prevent confusion).

## 3. New Components

### 3.1 `Nameplate.vue`
The universal way to display a player.
*   **Props:**
    *   `playerId`: String (Required) - connects to `gameState` to find user.
    *   `variant`: String - `'default'` (Avatar+Name), `'minimal'` (Name Only), `'vertical'` (Stacked).
    *   `isInteractable`: Boolean - If true and `playerId === myId`, clicking opens ProfileModal.
*   **Visuals:**
    *   Uses `AVATARS[id].theme` to generate a "Glowing Text" effect or "colored border" that guarantees contrast on dark backgrounds.

### 3.2 `ProfileModal.vue`
Replacing the ad-hoc input fields in the Lobby.
*   **Features:**
    *   Name Input (with validation).
    *   Avatar Grid (replaces `AvatarSelector`).
    *   "Save" button.

### 3.3 `AvatarGrid.vue` (Refactor)
*   Extract the avatar grid logic from `Lobby.vue` into a reusable component for use in the Modal.

## 4. Proposed Implementation Plan

### Step 1: Config & Utils
1.  Refactor `src/config/avatars.js` to use abstract color names.
2.  Create `src/utils/avatarStyles.js` to map abstract names to Tailwind classes (e.g., `cyan` -> `text-cyan-400 shadow-cyan-500/50`).

### Step 2: Core Components
3.  Create `src/components/AvatarIcon.vue` (Upgrade existing).
4.  Create `src/components/Nameplate.vue`.
5.  Create `src/components/modals/ProfileModal.vue`.

### Step 3: State Updates
6.  Update `usePeer.js` to handle `UPDATE_NAME` events.

### Step 4: Integration
7.  Refactor `Lobby.vue` to use `<Nameplate isInteractable />`.
8.  Refactor `GameScreen.vue` and child phases to use `<Nameplate />`.

## 5. Testing Strategy
*   **Unit Test `Nameplate.vue`:**
    *   Verify efficient rendering (computed properties).
    *   Verify "My Player" interaction triggers event.
*   **Integration Test:**
    *   Open Lobby -> Click Name -> Change Name -> Verify Sync to other clients.
