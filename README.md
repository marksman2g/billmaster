# BillMaster Web Prototype

BillMaster is a responsive, dependency-free web prototype for the personal finance and productivity app described in the product context. It runs directly from `index.html` and stores demo changes in `localStorage`.

## What Is Built

- Dashboard with balance, quick actions, alerts, accounts, monitored items, goals, predictions, recent activity, and weekly bills.
- Today Briefing command center with weather, today's events, bills due, route count, and Review Inbox count.
- Income and expense tracking with actual, projected, and variance values.
- Budget analytics with 3, 6, and 12 month projections plus canvas pie/bar charts.
- Bill management with add/edit, AI scan simulation, auto-detect simulation, payment logging, and transaction creation.
- Review Inbox for imported/detected bill and subscription signals before they become real records.
- One Subscription Hub with amount editing, projected editing, status changes, pay-now flow, import simulation, and transaction history.
- Financial calendar with month, week, day, and block views.
- Tasks with due dates, time blocks, recurrence fields, project/bill/goal/address links, and hour totals.
- Projects, goals, notebooks, notes, contacts, address database, lending tracker, and AI assistant screens.
- Local data backup/reset tools from the dashboard header.
- Deep links for every major screen, such as `index.html#calendar` or `index.html#subscriptions`.

## Run

Open `index.html` in a browser.

No build step is required.

## Cloud / Deployment

Current live prototype:

```text
https://marksman2g.github.io/billmaster/
```

Phase 0 cloud-readiness files:

- `CLOUD_FOUNDATION.md` - the practical setup checklist for hosting, Supabase, cloud access, and picture storage.
- `.nojekyll` - keeps GitHub Pages serving the static files directly.
- `service-worker.js` - adds a small PWA shell cache for hosted installs and reload resilience.
- `netlify.toml` - static publish config for Netlify.
- `vercel.json` - static publish config for Vercel.
- `supabase/schema.sql` - first private workspace sync table and media bucket policies.
- `billmaster-config.js` - optional hosted runtime config for the Supabase project URL and publishable key.

GitHub Pages is enough for a public prototype link. Vercel or Netlify is the better next host for private beta previews, especially once Supabase environment values are added.

## Test

If Node.js is installed:

```bash
node --check app.js
node smoke-test.js
```

## Data

The app seeds demo data on first load and then persists edits in browser `localStorage` under:

```text
billmaster-web-data-v1
```

Use the dashboard data tools button to download a JSON backup or reset the demo workspace.

## Mobile Today

You can use this prototype on Android, iPad, and desktop through a browser if the files are hosted or served from the computer. Until Supabase is connected, each browser/device saves its own local data. To use the same personal data across phone, iPad, and Windows, the next step is real cloud auth and database storage.

When hosted over `https`, the app can be installed from supported mobile browsers as a PWA-style shortcut. True cross-device sync still requires Supabase Auth, database tables, storage, and Row Level Security.

## Supabase Phase 1 Starter

The Sync Center now has a Supabase Cloud Workspace panel. After running `supabase/schema.sql` in Supabase, BillMaster can use either browser-saved setup values or the hosted `billmaster-config.js` file. The Project URL is already staged there; paste the full public publishable key into `anonKey` before inviting friends so they do not have to touch setup.

After the Project URL plus publishable/anon key are available, you can:

- create or sign into a Supabase account,
- push the current local workspace to Supabase,
- pull that workspace on another device.
- turn on auto sync after the first successful push or pull so future saves are pushed automatically.

This is the fastest path to real cross-device testing. It stores the full prototype workspace as one private JSON payload first; later migrations can split the data into dedicated relational tables.
