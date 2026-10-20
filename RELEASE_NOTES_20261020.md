# BillMaster 20261020-1

The owner approved all four Financial Watch recommendations and requested one combined release including other pending fixes. This release preserves the three unpublished September stabilization commits and adds the following changes.

## New behavior

- Financial Watch tracks reward certificates by issuer, program and certificate year, with sources, dates, unknown values, redemption status, configurable reminder stages and deadline-safe snoozing.
- Upcoming obligations combine saved bill plans, autopay installments and subscriptions. Due dates remain distinct from expected payment dates. Users can attach schedule evidence, confirmed amounts and per-obligation reminder timing. Unverified and stale plans remain labeled.
- In-app heads-ups support 7/3/1-day defaults, occurrence-specific review/snooze state, completed-item suppression and later-cycle reminders. Source-based guidance flags trial deadlines, cancellation verification, unreconciled refunds and supported cash-pressure checks.
- Rewards, schedules and alert state use item-level cloud collections. Legacy nested reward lists migrate without losing separate certificate years; normal merge/tombstone rules apply.
- Cancellation requests remain in ongoing cost estimates until provider confirmation is recorded. Confirmation and expected/received refunds can be recorded with source evidence.

## Reliability and corrections

- Plaid transactions use a durable server journal. Each browser saves changes and its own item markers permanently before acknowledging a batch; only ACK atomically advances the provider cursor. Other devices replay their own missing history. Pagination mutation retries discard partial attempts.
- Failed permanent storage, temporary-tab recovery and failed ACKs remain retryable. Profile/user/environment guards prevent delayed bank responses from saving into another workspace. Account and transaction identities are scoped to item/environment; old replay cannot replace newer observed values.
- Successful complete account refreshes retire missing accounts while retaining history. Failed refreshes show stale warnings. Removed provider transactions no longer inflate expense reports.
- Conditional cloud writes detect concurrent changes, refetch/merge with bounded retry and preserve edits made while a request is in flight.
- Subscription payment UI records an existing payment with a date/reference, sends no money and does not change bank-reported balances. Removed the false Stripe claim.
- Missing weather is unverified rather than invented. Sample statement import is labeled as sample data and no longer reports a fabricated sync time.
- Backend CLI is locked to 2.117.0; dependency audit reported zero vulnerabilities. CI uses Node 24 for backend fixture tests.

## Validation and deployment evidence

- 19 application route checks and 66 behavioral tests passed before final release packaging.
- Phone-sized browser review at 390 × 844 and standard browser rendering completed.
- Additive migration `202610200001_plaid_delivery_journal.sql` applied to the existing project. Live rollback-only synthetic SQL verified journal grants, stage-before-ACK, atomic cursor advancement and idempotent ACK. Test rows were rolled back; existing bank rows were not changed by the fixture.
- `plaid-sync` version 23 deployed. Health returned delivery protocol 1 and all four database readiness checks true. Existing gateway JWT setting remained false; the function retains its own user/session authentication and scoped service-role calls for protected actions.
- Original cloud configuration and existing sign-in script were preserved. Personal reward notice details are browser data, not public source.

## Limits and next work

Alerts in this release appear in-app. Automatic mailbox/document ingestion and closed-app email/SMS/push delivery require an explicitly connected source/channel and are not enabled. No bank reconnect, payment, redemption, provider cancellation or credential expansion was performed. Real bank account transaction end-to-end verification was not exercised.

Old already-open app clients can still use their previous unconditional cloud-write behavior until reloaded. The new app's conditional writes protect participating clients; a server-enforced revision protocol would be a further hardening step.

The delivery journal starts at the existing provider cursor and cannot reconstruct historical data lost before the migration. It retains acknowledged history for other devices until unlink/user deletion; design durable snapshots and compaction before applying retention pruning. Avoiding unchanged no-op batches is a follow-up storage optimization.

Per-item user-confirmed schedules are estimates of future behavior, not guarantees of bank settlement. Cash-pressure guidance does not forecast deposits, transfers or available balances. Refresh sources before acting.
