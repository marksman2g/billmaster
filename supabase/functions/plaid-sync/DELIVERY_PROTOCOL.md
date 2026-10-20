# Durable transaction delivery v1

Apply `supabase/migrations/202610200001_plaid_delivery_journal.sql` before deploying this function. `supabase/schema.sql` includes the same idempotent objects for fresh setup.

## Browser contract

Call `sync_transactions` with `last_applied_batch_ids: { [item_id]: batch_id }`. Each response `items[n]` contains `batch_id`, `batch_sequence`, `item_id`, `environment`, `synced_at`, `accounts_complete`, `accounts_refreshed_at`, `accounts_refresh_error`, `accounts`, `added`, `modified`, `removed`, and `has_more`.

Persist each item's imported changes **and its batch marker in the same durable browser save**. Temporary-tab fallback is not durable acknowledgement. Only after confirming permanent save, call `ack_transactions` with `{ item_id, batch_id }`. Retry failed acknowledgements. Reapplying an item must upsert by stable provider transaction identity, process removal tombstones, and reconcile accounts only when `accounts_complete` is true. An empty successful account list is authoritative.

Each device's marker determines replay, including batches another device has acknowledged. Missing marker starts at the oldest retained journal row. Unknown markers fail with 409 instead of silently skipping history; clear only that item's marker to replay it. Acknowledgements are idempotent. Apply matching stable identifiers again safely if an acknowledgement or browser save retry returns the same batch.

`has_more` includes more journal rows after a replay, so continue catching up with the newly persisted marker. A fresh provider pull completes all pages before staging one durable batch; a guarded 50-page limit fails without saving partial deltas. Mutation errors restart the whole loop from its original cursor, up to three attempts.

## Authority and retention

The Edge Function authenticates the user, restricts every journal query to that user/item/environment, and calls service-role-only SQL functions. Staging locks the token row, checks its cursor and environment, returns an existing pending batch in a race, and journals new deltas without advancing the cursor. ACK locks the same row and atomically advances the cursor with acknowledgement. Acknowledged payloads remain for other-device catch-up. Removing the token or user cascades journal deletion.

Scheduled pulls skip already acknowledged journal rows and retain at most one outstanding batch per item until a browser durably saves and acknowledges it. This is a delivery journal, not an unattended bank ledger. Do not auto-ACK scheduled data that no durable consumer has saved.

The journal starts at the existing provider cursor. It cannot reconstruct transaction history that was lost before this migration. Preserve existing browser/cloud history; use a separate explicit backfill plan if needed. No cursor reset, forced bank refresh or bank reconnection is performed.

## Account freshness

`list_connections` returns `accounts_complete`, `accounts_stale`, `accounts_refresh_error`, and `accounts_refreshed_at` per connection. A failed `/accounts/get` retains saved accounts with a visible warning; it must not remove accounts. Only that successful authoritative endpoint establishes membership; `/transactions/sync` and liabilities subsets do not imply a full account snapshot.

## Deployment order and checks

1. Run the migration in the existing project's database. Verify both RPCs are executable only by `service_role`; user/anon roles cannot access the journal. Use isolated fixtures with transaction rollback to verify stage/ACK locking before production reliance.
2. Deploy `plaid-sync` from this checkout to the verified project ref. Existing CLI form: `supabase functions deploy plaid-sync --project-ref hhmiyebcduegpoihbgrt`. Preserve existing secrets and JWT verification configuration.
3. Check `health` returns `delivery_protocol: 1`, `database.plaid_delivery_ready: true`, and advertises `ack_transactions`. This read does not call Plaid.
4. Release the matched browser code. Validate with isolated data and sandbox provider credentials before live financial correctness claims.

Local CLI was found in the earlier source workspace's `node_modules/.bin/supabase.cmd`. In the restricted shell even `--version` failed because the CLI attempts to write the user's `.supabase/telemetry.json.tmp`. No authenticated management/deployment state was established in this subtask. No migration, function deployment, secret change or live provider call was made.

## Validation and sources

Run `node --test tests/plaid-backend.test.js` on Node 24. Eleven offline tests execute the actual TypeScript orchestration through native type stripping with mocked database/provider boundaries. They cover durable ordering, replay, cross-device catch-up, ACK scope/races, removed transactions, page mutation restarts, incomplete paging, stale/empty account lists, missing migrations and metadata failures. SQL privileges and locking receive static assertions; these do not replace PostgreSQL integration tests.

Primary Plaid references verified October 20, 2026:

- [Transactions API](https://plaid.com/docs/api/products/transactions/)
- [Transactions errors](https://plaid.com/docs/errors/transactions/)
- [Sync migration guidance](https://plaid.com/docs/transactions/sync-migration/)

These require full pagination before committing updates and a whole-loop restart after pagination mutation. Removed transactions are explicit deltas and must be applied as removals. This implementation does not call chargeable forced-refresh or reconnect endpoints.
