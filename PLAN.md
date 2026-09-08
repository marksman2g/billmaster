# BillMaster stabilization — 2026-09-08

Objective: improve verified accuracy, reliability, responsiveness, and preview safety without changing or deleting the owner's saved data.

Baseline: main at c747c39; clean working tree; JavaScript syntax and 18-route smoke checks pass. No deployment is implied by local changes.

Completed: all four checkpoints. See PROJECT_STATE.md for verified results and follow-up risks.

## Follow-up hardening — 20260908-3
- Reproduced three storage/undo/notification failures with isolated fixtures; corrected them and retained temporary-tab recovery.
- Failed writes do not create phantom undo history. Failed undo saves keep their recovery point available for retry.
- Storage warnings and the Backup action reappear when a toast expires, without replacing active forms.
- Route smoke checks now reject logged render errors and recovery screens. Syntax checks cover the app, worker, and preview server.
- Verified all 18 route checks and 22 behavioral tests. Updated local build only; public deployment remains separate.

## Checkpoints
1. Reproduce current-date and AI count failures with isolated fixtures.
2. Fix date handling, AI range/count behavior, unnecessary rendering, and destructive-action safeguards.
3. Protect semantic card contrast; improve static-asset caching and preview-server safety.
4. Run behavioral tests, route smoke tests, and browser checks; verify external/public and local links.

## Decisions
- PR / 2026-09-08: “Today” means the device's current local date, not a demo date or calendar selection. Historical saved records remain unchanged.
- PR / 2026-09-08: AI counts use saved tasks and recurring habits independent of temporary calendar visibility filters. Bills and subscriptions remain separate scopes.
- PD / 2026-09-08: Test with isolated data; do not call paid APIs, reconnect banks, or erase the user's workspace during QA.
- PD / 2026-09-08: Keep the existing visual design; correct shared style regressions rather than redesign all screens.
- PR / 2026-09-08: Dashboard cash balances sum selected checking/savings/cash/money-market/CD/depository balances in cents. They exclude debt/investment accounts and do not add transaction history again. They are saved balances, not a guarantee of current bank funds.
- PD / 2026-09-08: Remove fixed “Last synced 2m ago,” unverified “Comfortable/on track,” and invented savings predictions. Today briefing counts unpaid bills due on that date, not the truncated next-week list.
- PD / 2026-09-08: Keep public deployment separate from local verification. No bank reconnect, chargeable API calls, or user-data reset was performed.

## Remaining risks
Backend bank-sync deployment, live provider billing, and real-account correctness require a separate end-to-end checkpoint. A successful route render alone is not proof of those workflows.

Recovery: inspect git diff and PROJECT_STATE.md, run npm.cmd test, then continue from the latest verified step.
