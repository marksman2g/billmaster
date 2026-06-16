# BillMaster Friend Alpha Checklist

Use this before inviting trusted friends to test BillMaster.

## Current Goal

Let a small group of people open BillMaster online, create their own account, save data, leave, come back, and see that same data again.

## Current Friend-Ready Status

- Personal cross-device use is the first priority: one signed-in user should be able to save on desktop, Android, iPad, and iPhone.
- Friend alpha is next: invite only 1-3 trusted testers after the checks below are green.
- Friend data must stay private per account. A new tester should start with a clean workspace.
- Keep this as a beta: no real bank passwords, no real bill pay, no live subscription cancellation, and no private financial secrets yet.

## Live Link To Send

Use this link after the go/no-go checks pass:

```text
https://marksman2g.github.io/billmaster/?v=20260616-1
```

## Go/No-Go Checks

1. Supabase project URL is in `billmaster-config.js`.
2. Supabase publishable key is in `billmaster-config.js`.
3. `supabase/schema.sql` has been run successfully.
4. Row Level Security is enabled on `billmaster_workspaces`.
5. A new BillMaster account can be created from the hosted app.
6. A first-time user starts with a clean private cloud workspace by default.
7. A user can save data and see auto-sync report that the workspace is saved.
8. If a device goes offline, local data still saves and queues for the next online sync.
9. The same user can sign in on a second device and retrieve cloud data.
10. A change made on one device appears on another device after auto-sync catches up.
11. A second test user cannot see the first user's workspace.
12. Android browser test works.
13. iPad browser test works.

## What Friends Can Safely Test Now

- Create their own BillMaster account.
- Add tasks, notes, habits, loans, contacts, addresses, projects, and goals.
- Upload or link pictures for visual testing.
- Test auto-sync across their own devices.
- Give feedback on what felt fast, confusing, crowded, or useful.

## First Friend Test Script

Ask each tester to do this:

1. Open `https://marksman2g.github.io/billmaster/?v=20260616-1`.
2. Go to Sync Center.
3. Create a BillMaster cloud account. Leave "clean private workspace" on.
4. Confirm email if Supabase asks, then sign in again from Sync Center.
5. Add one task, one address, one note, and one loan.
6. Wait for Auto Sync to show saved. Use Smart Merge only if the browser is slow or the device was offline.
7. Close the browser.
8. Reopen BillMaster and sign in again.
9. Confirm the same items come back automatically.
10. Repeat on a second device with the same account.
11. Edit one item on phone, then return to computer and confirm it appears without manually pushing.
12. Create a second test account and confirm it starts with its own empty/private workspace.
13. Tell us what felt confusing, slow, or too crowded.

## Do Not Invite Friends Until

- The hosted publishable key is present.
- Two separate test accounts have been checked.
- You are comfortable that the app is still a beta prototype.

## Fast Key Install

Run this from the repo when the publishable key is ready:

```bash
node scripts/set-supabase-key.js
```

Then run the tests, commit, and push.

## Known Limits

- Bill pay rails are staged, not real money movement.
- Bank/card sync is a prototype lane, not a live Plaid/MX/Finicity integration yet.
- Subscription cancellation is a guided workflow target, not direct provider cancellation yet.
- Pictures still need full Supabase Storage testing for multi-device use.
