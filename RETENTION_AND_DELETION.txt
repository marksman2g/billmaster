# BillMaster retention and deletion procedure

**Status:** Enforcement deployed; evidence and owner/legal review still required
**Version:** 1.0
**Review cadence:** Quarterly, and whenever data types, providers, or legal obligations change

## Retention schedule

- Workspace and imported financial data: delete after 730 days (24 months) with no workspace activity.
- Plaid connection metadata, liabilities, and access tokens: delete when the workspace is deleted, the user requests deletion, or the same 730-day inactivity rule expires. The Edge Function calls Plaid `/item/remove` before deleting its server-side token.
- Application logs: keep for 90 days unless an active security or legal hold requires longer.
- Provider backups: use the configured Supabase backup/PITR retention and verify that it does not exceed the approved schedule without a documented exception.

## Enforcement

1. A signed-in user deletion request calls the `delete_user_data` action in `supabase/functions/plaid-sync`.
2. The action revokes each Plaid Item, deletes Plaid tokens, connection metadata, liabilities, workspace data, and private media, and reports any failed revocation instead of silently deleting only part of the record.
3. `supabase/plaid-retention.sql` schedules `purge_expired_data` daily. The production job is named `billmaster-plaid-retention`, runs at `30 2 * * *`, and finds inactive workspaces before running the same deletion path.
4. The owner keeps the scheduled-job result, deletion test result, and quarterly review note as evidence.

## User request and legal hold

Support contact: `computer.fieldtech@gmail.com`. A legal or security hold may pause deletion only when documented with the affected account, reason, approver, start date, and release date. Otherwise, deletion is the default response to a valid request.

## Evidence required before a questionnaire “Yes”

The production Edge Function and scheduled job are deployed. Before selecting the strongest retention answer, the owner must still:

- deploy the updated Edge Function;
- run `supabase/plaid-retention.sql` with the production Vault secrets;
- perform and record a test deletion, including Plaid Item revocation;
- verify provider backup/log retention settings;
- record the first quarterly review.
