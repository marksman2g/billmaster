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
