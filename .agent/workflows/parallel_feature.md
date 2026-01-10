---
description: A workflow for implementing features with agents in a safe, parallel fashion (don't work on same code files, uses git worktrees and locking, with reusable worktree spaces).
---

# Parallel Feature Workflow
> **Description:** Atomic slot allocation for concurrent agent work.
> **Trigger:** `/parallel [description]`

## Step 1: Atomic Slot Allocation
1.  **Find a Free Slot:**
    * Loop through `slot-1` to `slot-5`.
    * **Atomic Check:** Try to run `mkdir .worktrees/<slot_name>.lock`.
    * **If Success:** You have acquired the lock. Proceed to setup.
    * **If Failure (File exists):** Slot is busy. Try next slot.
    * *Fallback:* If all 5 are busy, create a new temp slot `temp-<timestamp>` (and lock it).
2.  **Initialize Slot:**
    * Check if `.worktrees/<slot_name>` directory exists.
    * **If No:** `git worktree add .worktrees/<slot_name>`
    * **If Yes:**
        * `cd .worktrees/<slot_name>`
        * `git fetch origin main`
        * `git checkout main`
        * `git reset --hard origin/main` (Clear any debris from previous agents)
        * `git clean -fd` (Remove untracked files)
3.  **Dependencies:**
    * `npm install` (Uses existing cache if slot was used recently).
4.  **Branching:**
    * Create a branch based on user description: `git checkout -b feature/<kebab-name>`

## Step 2: Implementation (Terrain)
1.  **Context:** You are now operating strictly inside `.worktrees/<slot_name>/`.
2.  **Execute:** Implement the feature logic.

## Step 3: Preflight Verification
> **Constraint:** Do not proceed to Documentation until this passes.
1.  **Execute Preflight:** Run the commands defined in `/preflight` *inside this worktree context*.
    * **Secret Scan:** `gitleaks detect --source . --no-git`
    * **Lint:** `npm run lint`
    * **Test:** `npm test`
2.  **Failure Logic:** If any step fails, fix the code and re-run Step 3.

## Step 4: Documentation Sync (Map)
1.  **Review:** Now that code is frozen and verified, compare it against `ARCHITECTURE.md` and `docs/GAME_DESIGN.md`.
2.  **Update:** Update the markdown files *inside the worktree* to reflect any new architecture, state, or features.

## Step 5: Pull Request
1.  **Commit:** `git add .` && `git commit -m "feat: [description]"`
2.  **Push:** `git push origin feature/<kebab-name> --force`
3.  **PR:** Create PR via `gh` or generate URL.

## Step 6: Unlock
1.  **Release Lock:** `rmdir ../<slot_name>.lock` (Do this from the parent or by path).
2.  **Report:** "Feature [name] is ready in PR. Slot [name] has been released."