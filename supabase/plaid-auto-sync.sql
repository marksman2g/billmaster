-- BillMaster Plaid automatic transaction pull-downs.
-- Run this after supabase/schema.sql, after deploying plaid-sync, and after setting function secrets.
--
-- Required Edge Function secrets:
--   PLAID_CLIENT_ID
--   PLAID_SECRET
--   PLAID_ENV
--   SUPABASE_SERVICE_ROLE_KEY
--   BILLMASTER_SYNC_SECRET
--
-- Required Vault secrets for this scheduled SQL job:
--   billmaster_function_url        https://YOUR_PROJECT_REF.supabase.co/functions/v1/plaid-sync
--   billmaster_function_auth_key   Your Supabase anon/publishable key for Edge Function JWT verification
--   billmaster_sync_secret         Same value as BILLMASTER_SYNC_SECRET

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Put the real values in Supabase Dashboard > Project Settings / Edge Functions / Vault.
-- If you use the SQL editor, run these with your real values, then delete the visible values from the editor history if desired:
--
-- select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co/functions/v1/plaid-sync', 'billmaster_function_url');
-- select vault.create_secret('YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY', 'billmaster_function_auth_key');
-- select vault.create_secret('A_LONG_RANDOM_SYNC_SECRET', 'billmaster_sync_secret');

select cron.unschedule('billmaster-plaid-auto-sync')
where exists (
  select 1
  from cron.job
  where jobname = 'billmaster-plaid-auto-sync'
);

select cron.schedule(
  'billmaster-plaid-auto-sync',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'billmaster_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'billmaster_function_auth_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'billmaster_function_auth_key'),
      'x-billmaster-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'billmaster_sync_secret')
    ),
    body := jsonb_build_object(
      'action', 'sync_all_transactions',
      'max_items', 25
    ),
    timeout_milliseconds := 30000
  );
  $$
);
