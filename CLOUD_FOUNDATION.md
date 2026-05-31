# BillMaster Cloud Foundation

Start date: Saturday, May 30, 2026

This is the Phase 0 checklist for moving BillMaster from a local prototype toward a real online app that can be used from Windows, Android, iPad, and eventually by trusted beta users.

## Current Starting Point

- Source of truth: `https://github.com/marksman2g/billmaster`
- Current public page: `https://marksman2g.github.io/billmaster/`
- Current app type: static web app with no build step.
- Current storage: browser `localStorage`, which means each device keeps its own copy until Supabase is connected.
- Current readiness: good for product testing and UI feedback; not yet ready for private multi-user data.

## Phase 0 Goal

BillMaster should be cleanly hosted, documented, installable as a PWA shell, and ready for the Supabase migration.

The expected focused setup time is about 3-5 hours total.

## Phase 0 Checklist

| Step | Estimate | Status | Outcome |
| --- | ---: | --- | --- |
| Confirm GitHub repo is the source of truth | 20-30 min | Started | All work lands in the BillMaster repo before cloud deployment. |
| Clean deployment files | 45-75 min | Started | Static hosting config exists for GitHub Pages, Netlify, and Vercel. |
| Choose hosting provider | 20-30 min | Open | GitHub Pages works now; Vercel or Netlify is better for production preview links. |
| Connect hosting to GitHub | 30-60 min | Open | Every push can publish a live version. |
| Prepare Supabase project | 45-90 min | Open | Auth, database, storage, and environment keys are ready. |
| Document access from another computer | 20-30 min | Started | GitHub plus cloud editor path makes the app reachable away from the main PC. |
| Prepare phone/iPad testing path | 30-45 min | Started | Hosted app can be opened and installed from a browser. |

## Recommended Hosting Order

1. GitHub Pages
   - Already close to working.
   - Good for sharing a live prototype link.
   - Best for quick feedback, not private production data by itself.

2. Vercel or Netlify
   - Better preview deployments.
   - Easier environment variables when Supabase is connected.
   - Better fit for a real beta.

3. Supabase
   - Not a website host for this static shell, but it becomes the real backend.
   - Needed for login, private user data, database sync, file uploads, and storage.

## Cloud Coding Path

Use GitHub as the anchor. From there, BillMaster can be worked on from more than one machine by using:

- GitHub Codespaces for a browser-based development workspace.
- A cloud VM or hosted dev box later if the app grows beyond static hosting.
- Codex on the machine where development is active, with GitHub keeping the work portable.

The practical next target is: open the repo from a cloud workspace, edit a file, commit it, and confirm the hosted app updates.

## Supabase Setup Targets

Before multi-device sync can be real, collect these four Supabase values:

- Project URL
- Public anon key
- Service role key, stored server-side only later
- Storage bucket name for pictures and graphics

Then build the first cloud-backed tables:

- `profiles`
- `tasks`
- `addresses`
- `contacts`
- `habits`
- `loans`
- `notebooks`
- `notes`
- `files`

Every table must include `user_id` and Row Level Security policies before friends are invited.

## Picture Upload Direction

Pictures should move from browser-only URLs into Supabase Storage.

The app should store:

- Original uploaded file.
- Public or signed URL.
- Zoom value.
- X/Y image position.
- Opacity.
- Fit mode: whole image or fill frame.

This keeps the picture behavior consistent across projects, tasks, notes, notebooks, habits, goals, bills, lending, and subscriptions.

## What Can Be Done Without More Credentials

- Keep improving the static app.
- Add deployment and PWA files.
- Add Supabase-ready data model notes.
- Keep committing and pushing to GitHub.
- Prepare hosting for Vercel or Netlify.

## What Needs Your Credentials Later

- Supabase URL and anon key.
- Supabase database password if we run migrations directly.
- Hosting provider login or deployment permission.
- Google OAuth credentials for Google Calendar or Google Contacts.
- Plaid/Finicity/other financial aggregation credentials.
- Stripe credentials for paid subscriptions.

## Immediate Next Step

Finish Phase 0 by choosing the first production-style host:

- Fastest path: keep GitHub Pages and add Supabase next.
- Better beta path: connect Vercel or Netlify to GitHub, then add Supabase.

My recommendation is Vercel or Netlify for the beta, with GitHub Pages still available as a simple public demo.
