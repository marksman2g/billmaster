# BillMaster development work order

Status updates use part number, step number, and the verification result.

## Part 1. Install on a phone
1. Verify the branch, install manifest, icons, offline shell and baseline on Animal.
2. Add an install action and browser-specific instructions in Sync Center.
3. Verify the mobile install path and offline launch. Track a physical phone separately.

## Part 2. Reminders and texts
1. Present reminders and record acknowledgment per task occurrence.
2. Add Focus Mode and a daily reminder summary.
3. Connect closed-app push and a 15-minute, opt-in fallback for important alerts.
4. Enforce SMS balances, spending caps and verified delivery accounting before enabling paid sends.

## Part 3. Plan time and money
1. Show bills and scheduled task time for the week, month, quarter and year.
2. Include recurring work and make missing time estimates visible.
3. Reconcile the existing private Gmail intake with the Review Inbox for daily bill and task scanning.
4. Verify behavior with synthetic records and record remaining activation steps.

## Verified checkpoint on Animal

Part 1, steps 1-3 passed on a 412 by 915 Chromium viewport. The manifest and installability checks reported zero errors, and the dashboard loaded offline. Physical handset installation is open.

Part 2, steps 1-2 passed occurrence acknowledgment and Focus Mode tests. Daily summary is available in Review Inbox. Next is step 3, closed-app push and timed SMS fallback. SMS consent, provider delivery, balances and billing are outstanding.

Part 3, steps 1-2 have a tested Budget Analytics view for upcoming saved bills and task occurrences. The private Gmail adapter was located on Animal. Daily scanning and the live inbox connection are outstanding. All 81 behavioral tests passed on Animal.

## Current development checkpoint - November 13, 2026

Part 2, step 3 is complete in development. The focused command `node --test tests/push-enrollment.test.js tests/push-backend.test.js` passes 15/15 after an initial 0/12 RED checkpoint and later atomic-claim and input-hardening regressions. `npm.cmd test` passes 97/97, all five new Edge Function TypeScript files pass the local parser check, and `npm.cmd audit --audit-level=high` reports zero vulnerabilities.

No production migration, Edge Function deployment, VAPID secret, sender token, phone enrollment, live inbox access, real SMS adapter, phone number, send or charge was performed. Live activation remains blocked on those separately authorized steps plus durable SMS consent and destination storage, failed-acknowledgment retry, provider-grade idempotency, concurrent spend reservation and live billing validation. A physical phone check remains separate and does not block development. Implementation commit `497049d` was pushed to the tracked feature branch with matching local and remote SHAs. Next action, only after separate approval: apply the migration and deploy the two Edge Functions in a non-production environment, configure VAPID and sender secrets, then enroll an explicit test device.

## Step receipts and handoff

Before switching topics, record the part, step, command or test, outcome, and exact next action here. A dispatched command stays in progress until its result is read back. Record failed checks beside later successful checks. A saved next action is queued work.

| Step | Outcome | Evidence or next action |
| --- | --- | --- |
| 1.1 | Passed | Correct development branch on Animal; 78 baseline tests passed. |
| 1.2 | Passed in development | Install action and fallback instructions added to Sync Center. |
| 1.3 | Passed in desktop browser QA | 412 x 915 Chromium reported zero installability errors and reopened the dashboard offline. A physical phone installation is unverified. |
| 2.1 | Passed in development | Acknowledging one occurrence stops its later alerts; next recurrence remains open. |
| 2.2 | Passed in development | Focus Mode suppresses a due alert without consuming it; daily reminder list shows acknowledgment. |
| 2.3 | Development complete; live activation open | Added explicit PushManager opt-in/reuse/rollback/revoke, device-local enrollment state, authenticated user-derived storage and acknowledgment, service-only generic Web Push sender, hard-delete revocation, dead-subscription cleanup, and service-only atomic duplicate suppression. Focused RED was 0/12; final focused GREEN is 15/15. Full suite is 97/97; five Edge files parse; dependency audit reports zero vulnerabilities. Implementation commit `497049d` is pushed. VAPID keys, sender token, migration application, Edge Function deployment and test-device enrollment remain unconfigured by design. Next: separately authorize a non-production activation check. |
| 2.4 | Development controls passed; paid delivery disabled | Synthetic tests cover an opt-in flag for important alerts only, an exact 15-minute wait, acknowledgment stop, sequential duplicate suppression, successful accounting, per-message/monthly caps, provider balance and provider failure. No durable SMS consent or destination, real provider, number, send or charge exists. Next activation requires separate approval for those items plus failed-acknowledgment retry, provider idempotency, concurrent spend reservation and live billing verification. |
| 3.1 | Passed in development | Period view totals unpaid scheduled bills and planned time. |
| 3.2 | Passed in development | Monthly recurrence fixture totals four 90-minute tasks as six hours; untimed items reported separately. |
| 3.3 | In progress | Private Gmail intake located on Animal; daily scanning and live inbox connection pending. |
| 3.4 | Partial | Synthetic planning checks passed. Live delivery and inbox integration are outstanding. |
