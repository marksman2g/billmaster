-- BillMaster retention and deletion schedule.
-- Run only after deploying plaid-sync with the purge_expired_data action.
-- The default is 730 days (24 months) since the last workspace activity.
-- Keep provider backup/point-in-time retention aligned with the same policy.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('billmaster-plaid-retention')
where exists (
  select 1
  from cron.job
  where jobname = 'billmaster-plaid-retention'
);

select cron.schedule(
  'billmaster-plaid-retention',
  '30 2 * * *',
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
      'action', 'purge_expired_data',
      'retention_days', 730,
      'max_users', 25
    ),
    timeout_milliseconds := 30000
  );
  $$
);
