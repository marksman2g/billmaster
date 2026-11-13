-- BillMaster Phase 1 starter schema
-- Run this in the Supabase SQL editor before using Sync Center cloud push/pull.

create table if not exists public.billmaster_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id text,
  profile_name text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.billmaster_workspaces enable row level security;

-- Supabase projects with "Automatically expose new tables" disabled need explicit API grants.
-- RLS policies below still decide which rows are actually visible or writable.
grant usage on schema public to anon, authenticated;
grant select on table public.billmaster_workspaces to anon;
grant select, insert, update, delete on table public.billmaster_workspaces to authenticated;

-- Ask PostgREST to refresh after grants/policies when this script is rerun.
notify pgrst, 'reload schema';

drop policy if exists "Users can read their own BillMaster workspace" on public.billmaster_workspaces;
create policy "Users can read their own BillMaster workspace"
on public.billmaster_workspaces
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own BillMaster workspace" on public.billmaster_workspaces;
create policy "Users can insert their own BillMaster workspace"
on public.billmaster_workspaces
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own BillMaster workspace" on public.billmaster_workspaces;
create policy "Users can update their own BillMaster workspace"
on public.billmaster_workspaces
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own BillMaster workspace" on public.billmaster_workspaces;
create policy "Users can delete their own BillMaster workspace"
on public.billmaster_workspaces
for delete
to authenticated
using (auth.uid() = user_id);

-- Picture storage comes next. This bucket keeps one user-owned folder per account.
insert into storage.buckets (id, name, public)
values ('billmaster-media', 'billmaster-media', false)
on conflict (id) do nothing;

drop policy if exists "Users can read their own BillMaster media" on storage.objects;
create policy "Users can read their own BillMaster media"
on storage.objects
for select
to authenticated
using (bucket_id = 'billmaster-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can upload their own BillMaster media" on storage.objects;
create policy "Users can upload their own BillMaster media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'billmaster-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own BillMaster media" on storage.objects;
create policy "Users can update their own BillMaster media"
on storage.objects
for update
to authenticated
using (bucket_id = 'billmaster-media' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'billmaster-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own BillMaster media" on storage.objects;
create policy "Users can delete their own BillMaster media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'billmaster-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- Plaid connection metadata is readable by the signed-in BillMaster user.
-- Access tokens stay in billmaster_plaid_tokens below, which has no client grants or RLS policies.
create table if not exists public.billmaster_plaid_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  institution_id text,
  institution_name text,
  status text not null default 'linked',
  accounts jsonb not null default '[]'::jsonb,
  link_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.billmaster_plaid_connections enable row level security;

grant select, insert, update, delete on table public.billmaster_plaid_connections to authenticated;
grant select, insert, update, delete on table public.billmaster_plaid_connections to service_role;

drop policy if exists "Users can read their own Plaid connection metadata" on public.billmaster_plaid_connections;
create policy "Users can read their own Plaid connection metadata"
on public.billmaster_plaid_connections
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Plaid connection metadata" on public.billmaster_plaid_connections;
create policy "Users can insert their own Plaid connection metadata"
on public.billmaster_plaid_connections
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Plaid connection metadata" on public.billmaster_plaid_connections;
create policy "Users can update their own Plaid connection metadata"
on public.billmaster_plaid_connections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own Plaid connection metadata" on public.billmaster_plaid_connections;
create policy "Users can delete their own Plaid connection metadata"
on public.billmaster_plaid_connections
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.billmaster_plaid_liabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  account_id text not null,
  account_name text,
  account_type text,
  account_subtype text,
  liability_type text not null,
  current_balance numeric,
  credit_limit numeric,
  minimum_payment_amount numeric,
  next_payment_due_date date,
  next_monthly_payment numeric,
  last_statement_balance numeric,
  last_statement_issue_date date,
  last_payment_amount numeric,
  last_payment_date date,
  apr_percentage numeric,
  apr_type text,
  interest_rate_percentage numeric,
  origination_principal_amount numeric,
  outstanding_interest_amount numeric,
  is_overdue boolean,
  raw jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, account_id)
);

alter table public.billmaster_plaid_liabilities enable row level security;

grant select on table public.billmaster_plaid_liabilities to authenticated;
grant select, insert, update, delete on table public.billmaster_plaid_liabilities to service_role;

drop policy if exists "Users can read their own Plaid liabilities" on public.billmaster_plaid_liabilities;
create policy "Users can read their own Plaid liabilities"
on public.billmaster_plaid_liabilities
for select
to authenticated
using (auth.uid() = user_id);

create table if not exists public.billmaster_plaid_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  access_token text not null,
  cursor text,
  environment text not null default 'sandbox',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.billmaster_plaid_tokens enable row level security;

-- Intentionally no client grants or policies for token rows.
-- Edge Functions use the Supabase service role key, which bypasses RLS.
revoke all on table public.billmaster_plaid_tokens from anon, authenticated;
grant select, insert, update, delete on table public.billmaster_plaid_tokens to service_role;

notify pgrst, 'reload schema';

-- Durable, replayable transaction delivery. Apply before deploying plaid-sync.
-- Only the service role can read journal payloads or execute these functions.
create table if not exists public.billmaster_plaid_sync_batches (
  batch_id uuid primary key default gen_random_uuid(),
  batch_sequence bigint generated always as identity unique,
  user_id uuid not null,
  item_id text not null,
  environment text not null check (environment in ('sandbox','development','production')),
  base_cursor text,
  next_cursor text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  foreign key (user_id, item_id) references public.billmaster_plaid_tokens(user_id, item_id) on delete cascade
);
create index if not exists billmaster_plaid_batch_replay on public.billmaster_plaid_sync_batches(user_id,item_id,batch_sequence);
create unique index if not exists billmaster_plaid_one_pending_batch on public.billmaster_plaid_sync_batches(user_id,item_id) where acknowledged_at is null;
alter table public.billmaster_plaid_sync_batches enable row level security;
revoke all on table public.billmaster_plaid_sync_batches from public, anon, authenticated;
grant select,insert,update,delete on table public.billmaster_plaid_sync_batches to service_role;
grant usage,select on sequence public.billmaster_plaid_sync_batches_batch_sequence_seq to service_role;

create or replace function public.billmaster_stage_plaid_batch(
  p_user_id uuid, p_item_id text, p_environment text,
  p_expected_cursor text, p_next_cursor text, p_payload jsonb
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  token_row public.billmaster_plaid_tokens%rowtype;
  batch_row public.billmaster_plaid_sync_batches%rowtype;
begin
  select * into token_row from public.billmaster_plaid_tokens
    where user_id=p_user_id and item_id=p_item_id for update;
  if not found or token_row.environment is distinct from p_environment then
    raise exception 'Plaid item or environment changed' using errcode='40001';
  end if;
  -- A concurrent caller may have staged the same cursor while this one fetched pages.
  select * into batch_row from public.billmaster_plaid_sync_batches
    where user_id=p_user_id and item_id=p_item_id and acknowledged_at is null;
  if found then return to_jsonb(batch_row); end if;
  if token_row.cursor is distinct from p_expected_cursor then
    raise exception 'Plaid cursor changed; retry delivery' using errcode='40001';
  end if;
  insert into public.billmaster_plaid_sync_batches(user_id,item_id,environment,base_cursor,next_cursor,payload)
    values(p_user_id,p_item_id,p_environment,p_expected_cursor,p_next_cursor,p_payload)
    returning * into batch_row;
  -- Deliberately do not advance cursor here. The durable batch must be saved by a client first.
  return to_jsonb(batch_row);
end $$;

create or replace function public.billmaster_ack_plaid_batch(
  p_user_id uuid, p_item_id text, p_environment text, p_batch_id uuid
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  token_row public.billmaster_plaid_tokens%rowtype;
  batch_row public.billmaster_plaid_sync_batches%rowtype;
begin
  select * into token_row from public.billmaster_plaid_tokens
    where user_id=p_user_id and item_id=p_item_id for update;
  if not found or token_row.environment is distinct from p_environment then
    raise exception 'Plaid item or environment changed' using errcode='40001';
  end if;
  select * into batch_row from public.billmaster_plaid_sync_batches
    where user_id=p_user_id and item_id=p_item_id and batch_id=p_batch_id and environment=p_environment for update;
  if not found then raise exception 'Unknown delivery batch' using errcode='P0002'; end if;
  if batch_row.acknowledged_at is not null then
    return jsonb_build_object('acknowledged',true,'already_acknowledged',true,'batch_id',batch_row.batch_id);
  end if;
  if token_row.cursor is distinct from batch_row.base_cursor then
    raise exception 'Plaid cursor conflict; delivery not acknowledged' using errcode='40001';
  end if;
  -- Cursor update and acknowledgement commit together under the token-row lock.
  update public.billmaster_plaid_tokens set cursor=batch_row.next_cursor,
    last_synced_at=now(),updated_at=now() where user_id=p_user_id and item_id=p_item_id;
  update public.billmaster_plaid_sync_batches set acknowledged_at=now() where batch_id=batch_row.batch_id;
  -- Keep acknowledged payloads so another device can catch up by its own batch marker.
  return jsonb_build_object('acknowledged',true,'already_acknowledged',false,'batch_id',batch_row.batch_id);
end $$;
revoke all on function public.billmaster_stage_plaid_batch(uuid,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.billmaster_ack_plaid_batch(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.billmaster_stage_plaid_batch(uuid,text,text,text,text,jsonb) to service_role;
grant execute on function public.billmaster_ack_plaid_batch(uuid,text,text,uuid) to service_role;
notify pgrst,'reload schema';

create table if not exists public.billmaster_push_subscriptions (
  subscription_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  expiration_time bigint,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists billmaster_push_subscriptions_user_active on public.billmaster_push_subscriptions(user_id);
alter table public.billmaster_push_subscriptions enable row level security;
revoke all on table public.billmaster_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.billmaster_push_subscriptions to service_role;

create table if not exists public.billmaster_reminder_acknowledgments (
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_key text not null,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, occurrence_key)
);
alter table public.billmaster_reminder_acknowledgments enable row level security;
revoke all on table public.billmaster_reminder_acknowledgments from public, anon, authenticated;
grant select, insert, update, delete on table public.billmaster_reminder_acknowledgments to service_role;

create table if not exists public.billmaster_reminder_deliveries (
  delivery_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_key text not null,
  importance text not null check (importance in ('normal', 'important')),
  push_enabled boolean not null default false,
  sms_fallback_enabled boolean not null default false,
  push_status text not null default 'pending' check (push_status in ('pending', 'sent', 'disabled', 'failed')),
  push_attempts integer not null default 0 check (push_attempts >= 0),
  push_sent_at timestamptz,
  fallback_eligible_at timestamptz,
  sms_status text not null default 'disabled' check (sms_status in ('disabled', 'pending', 'sent', 'acknowledged', 'not_due', 'spending_blocked', 'failed')),
  sms_cost_cents integer check (sms_cost_cents is null or sms_cost_cents >= 0),
  sms_provider_delivery_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, occurrence_key)
);
create index if not exists billmaster_reminder_fallback_due on public.billmaster_reminder_deliveries(fallback_eligible_at) where sms_status = 'pending';
alter table public.billmaster_reminder_deliveries enable row level security;
revoke all on table public.billmaster_reminder_deliveries from public, anon, authenticated;
grant select, insert, update, delete on table public.billmaster_reminder_deliveries to service_role;

create or replace function public.billmaster_claim_push_reminder(
  p_user_id uuid,
  p_occurrence_key text,
  p_importance text,
  p_push_enabled boolean,
  p_sms_fallback_enabled boolean,
  p_fallback_eligible_at timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  delivery_row public.billmaster_reminder_deliveries%rowtype;
begin
  if p_user_id is null or nullif(btrim(p_occurrence_key), '') is null then
    raise exception 'Reminder user and occurrence are required.';
  end if;

  insert into public.billmaster_reminder_deliveries (
    user_id, occurrence_key, importance, push_enabled, sms_fallback_enabled,
    push_status, fallback_eligible_at, sms_status
  ) values (
    p_user_id, p_occurrence_key, p_importance, p_push_enabled, p_sms_fallback_enabled,
    'pending', p_fallback_eligible_at,
    case when p_fallback_eligible_at is null then 'disabled' else 'pending' end
  )
  on conflict (user_id, occurrence_key) do nothing
  returning * into delivery_row;

  if found then
    return jsonb_build_object('claimed', true, 'delivery', to_jsonb(delivery_row));
  end if;

  select * into delivery_row
  from public.billmaster_reminder_deliveries
  where user_id = p_user_id and occurrence_key = p_occurrence_key;

  return jsonb_build_object('claimed', false, 'delivery', to_jsonb(delivery_row));
end;
$$;

revoke all on function public.billmaster_claim_push_reminder(uuid, text, text, boolean, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.billmaster_claim_push_reminder(uuid, text, text, boolean, boolean, timestamptz) to service_role;
notify pgrst, 'reload schema';
