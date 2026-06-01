# BillMaster Friend Alpha Checklist

Use this before inviting trusted friends to test BillMaster.

## Current Goal

Let a small group of people open BillMaster online, create their own account, save data, leave, come back, and see that same data again.

## Go/No-Go Checks

1. Supabase project URL is in `billmaster-config.js`.
2. Supabase publishable key is in `billmaster-config.js`.
3. `supabase/schema.sql` has been run successfully.
4. Row Level Security is enabled on `billmaster_workspaces`.
5. A new BillMaster account can be created from the hosted app.
6. A user can push local data to cloud.
7. The same user can pull cloud data on a second device.
8. A second test user cannot see the first user's workspace.
9. Android browser test works.
10. iPad browser test works.

## First Friend Test Script

Ask each tester to do this:

1. Open `https://marksman2g.github.io/billmaster/`.
2. Go to Sync Center.
3. Create a BillMaster cloud account.
4. Add one task, one address, one note, and one loan.
5. Push local.
6. Close the browser.
7. Reopen BillMaster and sign in again.
8. Pull cloud.
9. Confirm the same items come back.
10. Tell us what felt confusing, slow, or too crowded.

## Do Not Invite Friends Until

- The hosted publishable key is present.
- Two separate test accounts have been checked.
- You are comfortable that the app is still a beta prototype.

## Known Limits

- Bill pay rails are staged, not real money movement.
- Bank/card sync is a prototype lane, not a live Plaid/MX/Finicity integration yet.
- Subscription cancellation is a guided workflow target, not direct provider cancellation yet.
- Pictures still need full Supabase Storage testing for multi-device use.
