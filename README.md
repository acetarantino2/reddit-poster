# Reddit Poster

Manage multiple OnlyFans creator profiles (models), each with their own list of subreddits to post to, title/body templates, and a last-posted tracker — all stored in `localStorage`, no backend required.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/acetarantino2/reddit-poster)

---

## Features

- **Model management** — add, edit (name, colour, title/body template), and delete creator profiles
- **Subreddit cards** — sorted by oldest `lastPosted` first; status dots (green / amber / red) show posting health
- **One-click post** — opens `reddit.com/r/{subreddit}` in a new tab and stamps the timestamp instantly
- **Copy title** — copies the rendered title template to your clipboard in one click
- **Bulk add subreddits** — paste a list (one per line, with or without `r/`) and they're all added and deduplicated
- **Dark / light mode** — class-based, persisted across sessions
- **Fully responsive** — slide-in sidebar on mobile

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Persistence | `localStorage` via custom hook |
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

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

Click the button at the top of this README, or run:

```bash
npx vercel
```

No environment variables are required — the app is entirely client-side.

## Project structure

```
app/
  page.tsx          — root page & global state
  layout.tsx        — HTML shell, fonts, metadata
  globals.css       — Tailwind imports + dark-mode variant
components/
  Topbar.tsx        — header with dark/light toggle
  Sidebar.tsx       — model list + Add Model button
  MainPanel.tsx     — subreddit grid & empty states
  SubredditCard.tsx — individual subreddit card
  AddModelModal.tsx — create-model dialog
  ModelDrawer.tsx   — edit model settings + bulk-add subreddits
hooks/
  useLocalStorage.ts — SSR-safe localStorage hook
lib/
  types.ts          — TypeScript interfaces
  constants.ts      — colour palette & default templates
```
