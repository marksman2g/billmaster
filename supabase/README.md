# BillMaster Supabase Starter

This folder is the first practical move toward cross-device sync.

## What This Enables

- Supabase Auth sign up and sign in from the Sync Center.
- Push this device's current BillMaster workspace to Supabase.
- Pull the same workspace from another device after signing in.
- Private Row Level Security so each user can only read and write their own workspace row.
- A private `billmaster-media` storage bucket for the next picture-upload step.
- A Plaid Edge Function scaffold for safe bank/card linking, token exchange, and transaction sync.

## Setup

1. Open Supabase.
2. Create or open the BillMaster project.
3. Go to SQL Editor.
4. Run `supabase/schema.sql`.
5. Copy the Project URL and public anon key.
6. In BillMaster, open Sync Center.
7. Click Supabase Cloud Workspace > Setup.
8. Paste the URL and anon key, then test and save.
9. Sign up or sign in.
10. Click Push local.

After that, open BillMaster on another device, use the same setup values, sign in, and click Pull cloud.
After the first successful push or pull, BillMaster enables auto sync on that device so later saved changes push to Supabase automatically.

If the setup test says the Data API grants are missing, run `supabase/schema.sql` again. It is safe to rerun because the table, bucket, and policies are written with `if not exists` / `drop policy if exists`.

## Plaid Bank/Card Sync Phase

The next sync step lives in `supabase/functions/plaid-sync/index.ts`. It keeps Plaid secrets off the browser and exposes these POST actions:

- `health`
- `create_link_token`
- `exchange_public_token`
- `sync_transactions`

Run `supabase/schema.sql` first. It creates:

- `billmaster_plaid_connections`: user-visible metadata for linked Plaid items.
- `billmaster_plaid_tokens`: service-role-only access tokens and sync cursors. Browser clients do not get grants or RLS policies for this table.

Set these Supabase function secrets before deploying:

```powershell
supabase secrets set PLAID_CLIENT_ID="your_client_id"
supabase secrets set PLAID_SECRET="your_sandbox_or_development_secret"
supabase secrets set PLAID_ENV="sandbox"
supabase secrets set PLAID_PRODUCTS="transactions"
supabase secrets set PLAID_COUNTRY_CODES="US"
supabase secrets set PLAID_CLIENT_NAME="BillMaster"
```

Then deploy:

```powershell
supabase functions deploy plaid-sync
```

The browser should call the function with the signed-in Supabase user's `Authorization: Bearer <access_token>` header. Do not paste bank usernames, passwords, card numbers, or Plaid secrets into BillMaster.

## Why One Workspace Table First

BillMaster is currently a large local prototype. A single `billmaster_workspaces` JSON payload gives us the fastest useful cross-device sync without risking weeks of relational migration work up front.

After the login and sync loop is proven, split this into dedicated tables:

- profiles
- tasks
- habits
- contacts
- addresses
- loans
- notebooks
- notes
- projects
- goals
- bills
- subscriptions
- files
