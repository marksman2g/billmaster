# Checkpoint: BillMaster stabilization

Version: 20260908-2
Status: local stabilization complete; not published
Date: 2026-09-08
Baseline: main / c747c39

## Complete
- Current-date task filters, bill date calculations, and new transaction/loan/note defaults (historical seed and existing records preserved).
- Exact reported AI task-count question, time-window counts, this/next/last week and month ranges, and calendar-filter-independent task/habit lookup.
- Shared task filtering for rendering and bulk selection; reuse recurrence date ranges and group least-event counts in one pass.
- Toast timeout no longer rerenders the application, preventing form/focus loss on expiry.
- Missing/rejecting confirmations fail closed; task/note/habit-series/bulk-task deletion and sample-data replacement require confirmation.
- Notebook reset deletes its own contained notes, not standalone notes. Historical sync deletion markers survive full reset.
- Honest dashboard cash totals, freshness labels and due-today counts; removed invented planning predictions.
- Preserved dark-card contrast and active-button styling; account cards adapt to narrow panels without clipped balances.
- Versioned app-shell cache with warm cache reuse, exact offline asset versions, local development network-first, and cleanup limited to BillMaster caches.
- Preview binds to loopback by default; static allowlist blocks repository/secret paths and handles malformed requests safely.
- npm test command plus regression tests added to CI.

## Validation
- node --check app.js, service-worker.js, scripts/serve-billmaster.js: pass.
- 18-route smoke test: pass.
- 18 behavioral tests: pass, including current dates/DST, AI counts, monthly expense routing, destructive cancellation, notebook scope, cash totals, today bills, cache failures and preview server.
- npm audit --audit-level=high: 0 vulnerabilities reported.
- Browser: public app opened successfully; improved local dashboard inspected at desktop width; Tasks and Week Calendar inspected at 390×844. No live data was changed in these checks.
- Test fixtures reproduced 9 original failures before fixes. Full live Plaid, TTS, cloud conflict, and mobile-device end-to-end tests were not performed.

## Verified access
- Updated local preview: http://127.0.0.1:4180/index.html?cachebust=20260908-2#dashboard
- Published app (previous version): https://marksman2g.github.io/billmaster/index.html
- Repository remote: https://github.com/marksman2g/billmaster.git
- Local repository: C:\Users\Black Excellence\Documents\Codex\2026-07-15\billmaster-active-clean\work\billmaster
- Start preview in this directory: npm.cmd start (or npm start).

## Next priorities
1. Publish this verified checkpoint when GitHub synchronization is requested; verify Pages serves version 20260908-2 afterward.
2. Test and deploy the Plaid backend update-mode code separately. Audit account-removal reconciliation, swallowed refresh errors, transaction cursor durability, and sandbox/production separation with isolated fixtures before live verification.
3. Expand habit completion/streak, cloud save-conflict, and storage-full testing; reduce additional full-app renders incrementally.
4. Replace remaining sample weather/demo content with clearly labeled or verified sources before production onboarding.

Recovery: read PLAN.md and this file, inspect git status, run npm.cmd test. Local preview may need restarting after a reboot. Do not reset real user data to run QA.
