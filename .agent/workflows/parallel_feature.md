---
description: A workflow for implementing features with agents in a safe, parallel fashion (don't work on same code files, uses git worktrees and locking, with reusable worktree spaces).
---

# Parallel Feature Workflow
> **Description:** Atomic slot allocation for concurrent agent work.
> **Trigger:** `/parallel_feature [description]`

## Step 1: Atomic Slot Allocation
1.  **Find a Free Slot:**
    * Loop through `slot-1` to `slot-5`.
    * **Atomic Check:** Try to run `mkdir .worktrees/<slot_name>.lock`.
    * **If Success:** You have acquired the lock. Proceed to setup.
    * **If Failure (File exists):** Slot is busy. Try next slot.
    * *Fallback:* If all 5 are busy, create a new temp slot `temp-<timestamp>` (and lock it).
2.  **Initialize Slot (Safety Mode):**
    * Check if `.worktrees/<slot_name>` directory exists.
    * **If No (New Worktree):**
        * `git worktree add .worktrees/<slot_name> origin/main --detach`
        * *Note: Using `--detach` prevents "branch is already checked out" errors if the main repo is also on `main`.*
    * **If Yes (Reuse Worktree):**
        * `git -C .worktrees/<slot_name> fetch origin main`
        * `git -C .worktrees/<slot_name> checkout --detach origin/main`
        * `git -C .worktrees/<slot_name> reset --hard origin/main`
        * `git -C .worktrees/<slot_name> clean -fd`
        * *Note: Using `git -C` guarantees these commands run inside the slot, never the root.*
3.  **Dependencies:**
    * `cd .worktrees/<slot_name> && npm install`
    * *Note: Always chain the `cd` with `&&` to ensure `npm install` runs in the correct location.*
4.  **Branching:**
    * Create a branch based on user description: `git -C .worktrees/<slot_name> checkout -b feature/<kebab-name>`

## Step 2: Spec Ingestion
1.  **Analyze Input:**
    * If input is a file path (e.g., `.designs/feat.md`): Read it immediately.
    * If input is text: Parse requirements.
2.  **Branching:** Create `feature/<name>` branch.

## Step 3: TDD Cycle (The Builder Loop)
1.  **Write Tests FIRST:**
    * Based on the Spec/Requirements, create the test file (e.g., `tests/unit/NewFeature.spec.js`).
    * **Run Test (Red):** `npx vitest run tests/unit/NewFeature.spec.js`
    * *Assert:* It MUST fail. If it passes, the test is broken or feature exists.
2.  **Implement Code:**
    * Write the minimal code in `src/` to satisfy the test.
3.  **Run Test (Green):**
    * `npx vitest run tests/unit/NewFeature.spec.js`
    * *Assert:* It MUST pass.
    * *Optimization:* Only run this specific test file to save tokens/time.
4.  **Repeat:** Iterate until all requirements in the Spec are met.

## Step 4: Preflight Verification
> **Constraint:** Do not proceed to Documentation until this passes.
1.  **Execute Preflight:** Run the commands defined in `/preflight` *inside this worktree context*.
    * **Secret Scan:** `gitleaks detect --source . --no-git`
    * **Lint:** `npm run lint`
    * **Test:** `npx vitest run tests`
2.  **Failure Logic:** If any step fails, fix the code and re-run Step 3.

## Step 5: Documentation Sync (Map)
1.  **Review:** Now that code is frozen and verified, compare it against `ARCHITECTURE.md` and `docs/GAME_DESIGN.md`.
2.  **Update:** Update the markdown files *inside the worktree* to reflect any new architecture, state, or features.

## Step 6: Pull Request
1.  **Commit:** `git add .` && `git commit -m "feat: [description]"`
2.  **Push:** `git push origin feature/<kebab-name> --force`
3.  **PR:** Create PR via `gh` or generate URL.

## Step 7: Unlock
1.  **Release Lock:** `rmdir ../<slot_name>.lock` (Do this from the parent or by path).
2.  **Report:** "Feature [name] is ready in PR. Slot [name] has been released."