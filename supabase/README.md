# BillMaster Supabase Starter

This folder is the first practical move toward cross-device sync.

## What This Enables

- Supabase Auth sign up and sign in from the Sync Center.
- Push this device's current BillMaster workspace to Supabase.
- Pull the same workspace from another device after signing in.
- Private Row Level Security so each user can only read and write their own workspace row.
- A private `billmaster-media` storage bucket for the next picture-upload step.

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

If the setup test says the Data API grants are missing, run `supabase/schema.sql` again. It is safe to rerun because the table, bucket, and policies are written with `if not exists` / `drop policy if exists`.

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
