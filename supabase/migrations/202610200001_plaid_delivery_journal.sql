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
