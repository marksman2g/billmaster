-- Synthetic fixture only. No real bank connection is read or modified; all test rows roll back.
begin;
do $$
declare
  probe_user uuid;
  probe_item text := 'billmaster_release_probe_' || gen_random_uuid()::text;
  staged jsonb;
  repeated jsonb;
  ack jsonb;
  observed text;
begin
  if has_table_privilege('anon','public.billmaster_plaid_sync_batches','select')
    or has_table_privilege('authenticated','public.billmaster_plaid_sync_batches','select')
    or has_function_privilege('authenticated','public.billmaster_ack_plaid_batch(uuid,text,text,uuid)','execute') then
    raise exception 'Client role unexpectedly has journal access';
  end if;
  if not has_function_privilege('service_role','public.billmaster_ack_plaid_batch(uuid,text,text,uuid)','execute') then
    raise exception 'Service acknowledgement grant missing';
  end if;
  select id into probe_user from auth.users limit 1;
  if probe_user is null then raise exception 'No owner exists for rollback-only fixture'; end if;
  insert into public.billmaster_plaid_tokens(user_id,item_id,access_token,cursor,environment)
    values(probe_user,probe_item,'synthetic_test_not_a_provider_token',null,'sandbox');
  staged := public.billmaster_stage_plaid_batch(probe_user,probe_item,'sandbox',null,'probe-next','{}'::jsonb);
  select cursor into observed from public.billmaster_plaid_tokens where user_id=probe_user and item_id=probe_item;
  if observed is not null then raise exception 'Stage advanced cursor before ACK'; end if;
  repeated := public.billmaster_stage_plaid_batch(probe_user,probe_item,'sandbox',null,'probe-next','{}'::jsonb);
  if repeated->>'batch_id' <> staged->>'batch_id' then raise exception 'Pending retry was not idempotent'; end if;
  ack := public.billmaster_ack_plaid_batch(probe_user,probe_item,'sandbox',(staged->>'batch_id')::uuid);
  select cursor into observed from public.billmaster_plaid_tokens where user_id=probe_user and item_id=probe_item;
  if observed <> 'probe-next' or ack->>'acknowledged' <> 'true' then raise exception 'ACK did not atomically advance cursor'; end if;
  ack := public.billmaster_ack_plaid_batch(probe_user,probe_item,'sandbox',(staged->>'batch_id')::uuid);
  if ack->>'already_acknowledged' <> 'true' then raise exception 'Repeated ACK is not idempotent'; end if;
end $$;
rollback;
select 'PASS: journal grants, stage-before-ACK, atomic ACK and idempotent replay; fixtures rolled back' as result;
