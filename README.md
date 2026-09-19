# CareerOS Frontend

React 19 + TypeScript + Vite + Tailwind CSS client for CareerOS.

This folder is a **standalone GitHub repo**. It talks to the CareerOS backend API and Supabase Auth. Do not put `GEMINI_API_KEY` here.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- React Router v7
- Supabase JS (auth + session)

## Also in this repo

- [`design-system/careeros/MASTER.md`](design-system/careeros/MASTER.md) — CareerOS UI tokens (moved from the old workspace `design-system/` folder)

## Setup

```bash
npm install
copy .env.example .env.local
```

Fill [`.env.local`](.env.local) (gitignored):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
VITE_API_URL=http://localhost:5000
```

## Run

```bash
npm run dev
```

App: `http://localhost:5173`

Vite proxies `/api` to `VITE_API_URL` (default `http://localhost:5000`). Start the **backend repo** separately.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | oxlint |
| `npm run preview` | Preview the production build |

## Roles

- Candidate — `/candidate/*`
- Academy — `/academy/*`
- Recruiter — `/recruiter/*` (employer is merged here)
- Admin — `/admin/dashboard`

## Push to GitHub

From this folder (not the parent monorepo):

```bash
git init
git add .
git commit -m "Initial CareerOS frontend"
gh repo create careeros-frontend --private --source=. --remote=origin --push
```

Or create an empty GitHub repo, then:

```bash
git remote add origin https://github.com/<you>/careeros-frontend.git
git branch -M main
git push -u origin main
```

Never commit `.env.local`.
# career_os_front
