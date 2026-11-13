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

create index if not exists billmaster_push_subscriptions_user_active
on public.billmaster_push_subscriptions(user_id);

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

create index if not exists billmaster_reminder_fallback_due
on public.billmaster_reminder_deliveries(fallback_eligible_at)
where sms_status = 'pending';

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
