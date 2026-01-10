# Core Governance Rules
> **Activation:** Always On

## 1. The "Map vs Terrain" Protocol
*   **Map = Documentation**. **Terrain = Code**.
*   **NEVER assume.** Before implementing anything, you must read the documentation to understand the intent, **AND** read the actual source code to verify the implementation.
*   If the Map and Terrain disagree, trust the Terrain (Code) but flag the discrepancy to the user immediately.

## 2. The "Documentation Debt" Law
*   Any change to logic, state, or features **REQUIRES** a corresponding update to `ARCHITECTURE.md` and/or `docs/GAME_DESIGN.md`, and/or some other documentation file if it doesn't fit in either of these core documents.
*   You are not done until the docs match the new code.

## 3. Architecture Constraints
*   **Host is the Server.** Clients are dumb terminals.
*   **State lives in `usePeer.js`.** Do not create local state for global logic.

## 4. Engineering Standards
*   **Quality > Speed:** Security, stability, and singular-purpose components are preferred over monolithic files.
*   **Refactoring:** If a file grows too large, refactor into reusable components.
*   **Pragmatism:** Functionality comes first. Do not overcomplicate dependencies or abstractions if not needed ("YAGNI").
