# Reddit Poster

Manage multiple OnlyFans creator profiles (models), each with their own list of subreddits to post to, title/body templates, and a last-posted tracker. Everything is stored in a shared online database, so the whole team sees the same data on any browser or device.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/acetarantino2/reddit-poster)

---

## Features

- **Shared team workspace** — data lives in an Upstash Redis database; changes sync between everyone within seconds
- **Team password login** — one password (`APP_PASSWORD`) for you and your staff
- **Overview** — every model with subs ready to post, posts this week, removal rate and account problems, plus the latest posts
- **Standard subreddit list** — new models start with it; push new additions to existing models with one click
- **Subreddits per model** — sorted ready-first; notes and a verified-only flag per sub; search and filters
- **Reddit accounts per model** — main, persona (with whose photos it uses) and verified accounts, each with a status (active / shadowbanned / suspended / retired) and stats
- **Posting** — Post picks the right account (verified account for verified subs), opens the Reddit submit page and logs the post; undo if you didn't post
- **Results** — paste the post link and the app checks upvotes, comments and removed status from Reddit; or enter it by hand
- **Import from old version** — data saved in a browser by the old version can be imported with one click
- **Dark / light mode**, works on phones

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Persistence | Upstash Redis (via Vercel Storage) |
| Auth | Shared password, signed HTTP-only cookie |
| Dates | `date-fns` |
| IDs | `uuid` |
| Toasts | `react-hot-toast` |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Locally, with no database configured, the app uses a temporary in-memory store and the password is `dev`.

## Deploying to Vercel

Click the button at the top of this README, or run:

```bash
npx vercel
```

### One-time setup

1. **Database** — in the Vercel project open **Storage → Create Database → Upstash for Redis** (free plan is fine) and connect it to the project. This adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically.
2. **Password** — in **Settings → Environment Variables** add `APP_PASSWORD` (the password your team will use). Changing it later logs everyone out.
3. **Redeploy** the latest deployment.

Until both are set, the live site shows a setup screen with these steps.

## Project structure

```
app/
  page.tsx          — setup / login / app switch (server)
  api/              — data, ops, login, logout routes
  layout.tsx        — HTML shell, fonts, metadata
  globals.css       — Tailwind imports + dark-mode variant
components/
  App.tsx           — main app & state
  LoginScreen.tsx   — team password screen
  ImportBanner.tsx  — import data from the old per-browser version
  Topbar.tsx        — header with dark/light toggle
  Sidebar.tsx       — model list + Add Model button
  MainPanel.tsx     — subreddit grid & empty states
  SubredditCard.tsx — individual subreddit card
  AddModelModal.tsx — create-model dialog
  ModelDrawer.tsx   — edit model settings + bulk-add subreddits
hooks/
  useWorkspace.ts   — syncs with the server (optimistic updates + polling)
lib/
  store.ts          — database layout & operations (server)
  auth.ts           — password + session cookie (server)
  ops.ts            — change operations shared by client & server
  types.ts          — TypeScript interfaces
  constants.ts      — colour palette & default templates
```
