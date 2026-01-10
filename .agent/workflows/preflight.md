# Preflight Workflow
> Description: Run this before committing code to ensure quality and safety.

## 1. Secret Scan (Smart)
1.  Check if `gitleaks` is available: `which gitleaks`
    *   **IF FOUND:**
        *   Run: `gitleaks detect --source . --report-path .agent/secret_report.json --no-git`
        *   **CRITICAL:** Read `.agent/secret_report.json`.
        *   If array is empty `[]`: Report "✅ No secrets found."
        *   If array has items: **STOP.** List the files and RuleIDs found.
    *   **IF NOT FOUND:**
        *   Warn: "⚠️ Gitleaks not found. Using fallback scanner."
        *   Run Fallback: `grep -rE "sk-[a-zA-Z0-9]{20}" src/`

## 2. Linting
1.  Check if `lint` script exists in `package.json`.
2.  Run: `npm run lint`
3.  Fix any auto-fixable errors.

## 3. Testing
1.  Run: `npx vitest run tests`
2.  If tests fail, **STOP** and fix them.

## 4. Documentation Check
1.  Ask: "Did we change any core logic, state, or features?"
2.  If YES: "Have we updated `ARCHITECTURE.md` or `docs/GAME_DESIGN.md`?"
3.  If NO: Update them before declaring the task complete.
