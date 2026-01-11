---
description: Design and Architect the details of implementing a new feature or change in the codebase.
---

# Architect Workflow
> **Goal:** Produce a comprehensive spec file in `.designs/` for the implementation agent.
> **Trigger:** `/architect [description]`

## Step 1: The "Map & Terrain" Research
1.  **Read Docs:** Read `README.md`, `ARCHITECTURE.md`, and `docs/GAME_DESIGN.md`.
2.  **Scan Code:** Based on the feature idea, run `grep` or read relevant source files to understand the current implementation.
    * *Constraint:* Do not assume files exist. Verify them.
3.  **Gap Analysis:** Identify what is missing or what needs to change.

## Step 2: Interactive Design
1.  **Brainstorm:** Propose a high-level approach to the user.
2.  **Ask Questions:** Identify edge cases or ambiguity. Ask the user for clarification.
3.  **Iterate:** Refine the idea based on user feedback.

## Step 3: Spec Generation
1.  **Create File:** Create `.designs/<date>-<feature-kebab>.md`.
2.  **Content Structure (Strict):**
    * **# Feature Title**
    * **## Context & Goals:** Why are we doing this?
    * **## Architecture Changes:** Any new state in `usePeer`? New Themes?
    * **## Proposed Implementation:** List of files to create/modify.
    * **## Testing Strategy:** specific test cases to write.
3.  **Review:** Ask user to confirm the Spec is ready for implementation.

## Step 4: User Feedback
1.  Ask the user for feedback on the spec file and iterate as needed

## CRITICAL

* You will not be implementing the feature at this stage, just iterating on the design and architecture