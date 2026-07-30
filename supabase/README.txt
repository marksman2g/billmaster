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
- `sync_liabilities`
- `sync_all_transactions` for protected scheduled pull-downs
- `sync_all_liabilities` for protected scheduled minimum-payment/APR pull-downs
- `delete_user_data` for authenticated Plaid revocation and user-data deletion
- `purge_expired_data` for the protected retention schedule

Run `supabase/schema.sql` first. It creates:

- `billmaster_plaid_connections`: user-visible metadata for linked Plaid items.
- `billmaster_plaid_liabilities`: user-visible minimum payment, due date, APR, and loan liability details.
- `billmaster_plaid_tokens`: service-role-only access tokens and sync cursors. Browser clients do not get grants or RLS policies for this table.

Set these Supabase function secrets before deploying:

```powershell
supabase secrets set PLAID_CLIENT_ID="your_client_id"
supabase secrets set PLAID_SECRET="your_sandbox_or_development_secret"
supabase secrets set PLAID_ENV="sandbox"
supabase secrets set PLAID_PRODUCTS="transactions,liabilities"
supabase secrets set PLAID_COUNTRY_CODES="US"
supabase secrets set PLAID_CLIENT_NAME="BillMaster"
supabase secrets set BILLMASTER_SYNC_SECRET="a-long-random-string"
```

In the Plaid dashboard, request the **Transactions** product for account balances and transaction history. Request **Liabilities** for credit-card and loan minimums, due dates, and APR. Auth/Balance alone are not enough for BillMaster's sync actions.

Before submitting Plaid's security questionnaire, gather verified answers for: the security contact; documented security policy; production access controls; consumer MFA; critical-system MFA; TLS in transit; encryption at rest; vulnerability scanning and patching; application privacy policy; consumer consent; and data-retention/deletion practices. Do not guess or select an answer just to advance onboarding. If a control is not in place, record the gap and remediation plan instead.

BillMaster's code-side security and privacy baseline is documented in [`SECURITY.md`](../SECURITY.md), with a prepared public-facing draft in [`PRIVACY.md`](../PRIVACY.md), a repository scan procedure in [`SECURITY_SCANS.md`](../SECURITY_SCANS.md), and a field-by-field answer key in [`PLAID_QUESTIONNAIRE_ANSWER_KEY.md`](../PLAID_QUESTIONNAIRE_ANSWER_KEY.md). The app displays the privacy notice and records confirmation before Plaid Link opens. Retention/deletion implementation and setup checklists are in [`RETENTION_AND_DELETION.md`](../RETENTION_AND_DELETION.md), [`CRITICAL_SYSTEM_MFA.md`](../CRITICAL_SYSTEM_MFA.md), and [`ENCRYPTION_AT_REST.md`](../ENCRYPTION_AT_REST.md). These documents, checks, and the consent gate support the questionnaire, but the owner still needs to adopt/review them, configure MFA, publish the privacy policy with a monitored contact, deploy the retention schedule, add endpoint/production-asset scanning, and operate the recurring review process.

Then deploy:

```powershell
supabase functions deploy plaid-sync
```

## Enhanced AI Voice

BillMaster now tries the `openai-tts` Edge Function for a more natural read-aloud voice when a user is signed in. The browser's built-in voice remains the automatic fallback when the function is unavailable, offline, or not yet deployed. Keep the OpenAI key server-side; never put it in `app.js` or `billmaster-config.js`.

Set the function secrets and deploy it after the Supabase project is linked:

```powershell
supabase secrets set OPENAI_API_KEY="your_openai_api_key"
supabase secrets set OPENAI_TTS_MODEL="gpt-4o-mini-tts"
supabase functions deploy openai-tts
```

The AI Assistant voice buttons continue to select the voice style. The warm female profile uses OpenAI's `coral` voice, and the clear female profile uses `shimmer`; the other profiles use `ash` and `verse`. If the function is not deployed yet, BillMaster still reads answers with the current device voice.

In BillMaster, go to `Accounts > Manage`:

1. Click `Check Backend`.
2. The check must confirm the Plaid credentials, Supabase public/service keys, requested products, and token, connection, and liability tables before Link is opened.
3. After it reports ready, click `Open Plaid Link`.
4. After linking, click `Sync Transactions` whenever you want to pull the latest Plaid transaction changes.
5. Click `Sync Minimums / APR` to pull credit-card and loan liability details for payment planning. Existing linked items may need to be relinked after `PLAID_PRODUCTS` includes `liabilities`.

For automatic transaction pull-downs, run `supabase/plaid-auto-sync.sql` after storing the required Vault secrets listed at the top of that file. The scheduled job calls `sync_all_transactions` with a server-only sync secret and keeps browser users away from Plaid access tokens.

For retention enforcement, deploy `plaid-sync` first, then run `supabase/plaid-retention.sql` after storing the same Vault URL, function key, and sync secret. The daily job calls `purge_expired_data` with the 730-day inactivity rule.

The browser should call the function with the signed-in Supabase user's `Authorization: Bearer <access_token>` header. Do not paste bank usernames, passwords, card numbers, or Plaid secrets into BillMaster.

## Time & Money Business Model

BillMaster's planning model uses three simple tiers:

- **Free - $0/month:** manual tracking; bank syncing stays limited.
- **Plus - $9.99/month:** bank sync plus Time & Money insights.
- **Pro - $19.99/month:** multiple accounts, forecasting, and automation.

Use these planning formulas before committing to a Plaid plan:

```text
MRR = paid customers x monthly price
Plaid variable cost = connected accounts x cost per connection
Contribution = MRR - Plaid variable cost - monthly commitment
```

With the default planning assumptions in BillMaster (100 customers, one connected account each, $0.50 per connection, and no current commitment), Plus produces $999.00 MRR and $949.00 before other operating costs. A $2,000 monthly commitment would add $20.00 per customer at 100 customers, so the modeled break-even floor is $20.50 per customer including the connection cost. These are planning inputs, not a Plaid invoice; update them with the actual agreement before launch.

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
