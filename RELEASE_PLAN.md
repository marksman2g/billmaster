# Combined BillMaster release — 2026-10-20

Owner approved all four Financial Watch recommendations and requested a review of other pending fixes before one combined push. This authorizes implementing, validating and publishing the combined intended changes; no extra feature-approval loop is required.

Baseline: original local main `509a4e6`; three unpublished stabilization commits above freshly fetched remote main `c747c39`. The isolated release branch preserves those commits. Fetch reported a forced change only because clone initially tracked local source main; no remote history was rewritten by this task.

## Execution

1. Reconcile pending code and identify high-impact existing defects. Complete.
2. Implement durable/replayable Plaid batches and acknowledgement; stale/removal handling in the browser. In progress.
3. Integrate Financial Watch as syncable collections, configurable per-obligation reminders and verified schedules, cancellation/refund evidence, evidence-based guidance. In progress.
4. Correct payment, subscription totals, simulated weather/import claims and concurrent cloud writes. In progress.
5. Validate behavioral tests, backend fixtures, dependency audit, desktop/narrow-screen rendering and source/secret diff. Pending.
6. Commit, safely reconcile remote, push without force, verify public assets and backend deployment state. Pending. GitHub CLI's stored credential is currently invalid; defer owner action until the combined result is ready.

## Scope boundaries

No real payments, redemptions, provider cancellations, bank reconnects or credential expansion. Initial alerts are in-app. Mailbox ingestion and email/SMS/push need a separately configured connection/channel; no automatic delivery is claimed without verification. Financial evidence must be attributed and stale/unknown values explicit. Keep personal Citi notice details in local browser data, not public source.

## Recovery

Read this file, PROJECT_STATE.md and git status. Continue current branch; preserve original repository and newer remote work. Agents own backend and standalone cloud CAS snippet/tests; primary owns application integration and release validation.
