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
