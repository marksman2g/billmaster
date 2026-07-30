# Retention control deployment record — 2026-07-21

## Verified

- Supabase project: `hhmiyebcduegpoihbgrt` (BillMaster, active/healthy at verification time).
- `plaid-sync` Edge Function deployed successfully with the `delete_user_data` and `purge_expired_data` actions.
- Supabase Vault contains the three scheduler secrets by name: `billmaster_function_url`, `billmaster_function_auth_key`, and `billmaster_sync_secret`.
- The `billmaster-plaid-retention` cron job is active on schedule `30 2 * * *`.
- The database had one workspace, last updated 2026-07-14, and zero workspaces older than the 730-day cutoff at verification time.

## Still required

- Run and record a deletion test using an approved test account.
- Verify Supabase backup/PITR and log-retention settings against the approved schedule.
- Record the first quarterly policy review and any legal/privacy review.

This record proves deployment checks performed on 2026-07-21; it is not a substitute for the remaining evidence or legal review.
