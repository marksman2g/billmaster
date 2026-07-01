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
