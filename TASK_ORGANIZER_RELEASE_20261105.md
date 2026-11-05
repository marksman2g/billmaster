# Task organizer release checkpoint — 2026-11-05

Base: published BillMaster `main` at `6b0eb35`. This isolated release branch contains only the approved task organizer improvements from the private working tree. The separate financial automation branch and EGM review remain unpublished; no mailbox, database, delivery service, notification job, or user record is changed by this release.

## Changes

- Project recurring tasks into Today, Week, Calendar, and calendar export. Mark one occurrence done or undone while later dates remain active. Preserve completed or cancelled legacy series.
- Add functional task search and My Day groups for real deadlines, today's plan, missed plans, and completed work. Planned dates and optional deadlines remain separate. Repeating deadlines shift with their occurrence and the latest missed deadline per series is shown.
- Let Enter save a quick task. Merge per-occurrence completion state across cloud workspace copies. Keep reminder wording honest about app-open popups, sound attempts, and queued outbox entries.
- Version the app and CSS assets with the service worker shell for reliable publication.

## Verification and limits

`npm.cmd test` passed 78 behavioral tests and 19 route smoke checks in this release worktree. `node --check app.js` and `git diff --check` passed. The same organizer UI changes were exercised earlier in a separate, empty synthetic browser profile: quick entry, search, recurrence, deadlines, My Day, reload persistence, and a 390-pixel layout. The production-base release worktree has not been tested with Tony's saved profile or a physical phone.

Task popups and sound still require BillMaster to stay open. Outbox entries are records, not proof of delivered email or text. No closed-app task notification service is activated. The latest missed recurring deadline is drawn from up to 730 planned days per series; history is retained in saved data. Monthly tasks starting on day 31 appear only in months with that date.

Backup: `C:\Users\Black Excellence\Documents\Codex\2026-10-17\task\billmaster-release-backup-20261105` contains the private branch bundle, its organizer patch, and the original private checkpoint. Roll back a published release with a new revert commit after confirming the live head; do not reset user workspace data.
