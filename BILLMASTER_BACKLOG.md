# BillMaster Backlog

This file keeps the running product requests in one place so ideas do not get lost while the prototype keeps moving.

## Current Focus

- Phase 0 cloud foundation: hosting config, PWA shell, cloud setup documentation, and Supabase migration preparation. Started.
- First-class habit tracker that ties into Month, Week, Day, and Block calendar views. Done in prototype.
- Project detail workflow fixes: project back behavior, project picture editing, project-scoped task creation, task checklist items, image positioning. Done in prototype.
- User/profile separation so friends can eventually use their own private data. Local prototype done; real Supabase Auth remains.
- Product structure pass: Today Briefing, grouped command center actions, Review Inbox naming, one Subscription Hub, and visible launch roadmap. Done in prototype.
- Phase 1 cloud starter: Supabase setup modal, Auth sign-in/sign-up hooks, private workspace push/pull flow, starter SQL schema, post-push/pull auto sync, and hosted runtime config. Started.
- Phone/tablet development path: Codespaces config, static preview server, and mobile Codex access guide. Started.

## Recently Completed

- Save buttons lock briefly to prevent duplicate saves.
- Lending tracker repayment, partial forgiveness, forgiven/outstanding math, editing, search, and summary cards.
- Address duplicate prevention, maps links, multi-address route copying/opening.
- Calendar Month/Week/Day/Block navigation.
- Block View drag, resize, horizontal duplication, multi-select, block actions, handle styles, category colors, and time totals.
- Day View multi-select actions, route copying/opening, compact cards, quick priority/status editing, project names, address preview, and checklist-ready task cards.
- Image attachments for projects, tasks, notebooks, notes, subscriptions, lending, goals, and bills.
- Project tiles with picture covers.
- Denser two-column goal cards, larger project list pictures, clickable task image previews, updated calendar date shortcuts, block status chooser from the bottom handle, and combined side handles for duplicate-plus-time-shift gestures.
- Block View zoom controls and quick time-window focus controls, including a 3 AM-9 AM zoomed working range for short habit blocks.
- Habit/task day events now support tap-to-edit, press-and-hold event actions, quick time edits, one-event duplication, selected duplication, and drag-to-swap times.
- Habit editor location dropdown can now add a brand-new address directly to the shared address table and link it to the habit.
- Global picture controls now support Fit whole image vs Fill frame, plus persisted zoom and pan across habits, tasks, projects, notes, notebooks, goals, bills, lending, and subscriptions.
- Habit quick templates: five reusable habit setup slots, template picker inside Add Habit, and a save-to-template prompt after saving a habit.
- Notebook pictures, note subjects, unassigned note filtering, and image zoom controls.
- Prism-style bill inbox/sync center direction with import/detection staging.
- Subscription cards with actual/projected/variance and denser responsive layout.
- Local profile switching with separate saved workspaces per username.

## Product Decisions

- Keep one dedicated Subscriptions area. Bill import and recurring-charge detection should feed into that single hub instead of creating a second subscription system.
- Review Inbox is the single intake lane for detected bills, subscriptions, imports, screenshots, PDFs, email forwards, and cancellation prompts.
- Today should be the daily command center: date/weather, tasks, habits, money impact, route needs, reviews, and fast calendar jumps.
- Keep Simple Mode and Power Mode as a way to protect new users from overload while preserving advanced controls for heavy users.
- The current web app is a local prototype. Real multi-user privacy requires backend auth and per-user database ownership rules.
- Mobile is the primary design target. Desktop and tablet should adapt from that layout rather than driving the product shape.

## Next Architecture Steps

- Choose first production-style host: keep GitHub Pages for the public demo, then connect Vercel or Netlify for beta previews.
- Paste the full Supabase publishable key into `billmaster-config.js` so hosted users can sign in without manual setup.
- Collect storage bucket name and migration access.
- Run `supabase/schema.sql`, then test Sync Center push/pull from two devices.
- Move from localStorage prototype data to Supabase tables.
- Add Supabase Auth for real usernames/passwords.
- Add row-level security policies so users only see their own data.
- Add backup/export/import for user data.

## Working Timeline

- Prototype checkpoint: `checkpoints/before-product-shaping-20260513-182329`.
- 1-2 weeks: Cloud login beta with Supabase Auth, user-owned tables, and saved tasks, habits, addresses, and calendar data.
- 3-5 weeks: Private beta for friends with notes, projects, lending, subscriptions, backups, storage, and safer error handling.
- 8-12+ weeks: Production track with bank/card sync, Google Calendar sync, reminders, notification delivery, bill-pay/cancellation partners, and app-store packaging.

## Open Feature Requests

- Full Google Calendar OAuth sync, then two-way sync.
- Real card/bank transaction sync through a Plaid-style provider.
- Biller network bill pay and cancellation workflows.
- AI assistant actions that can create tasks, alerts, budgets, and subscription recommendations.
- Notifications via email, email-to-text, and eventually push.
- Route optimization and multi-stop Maps workflows.
- Richer habit stats: streak calendar, missed-day grace, category charts, and daily activity score.
