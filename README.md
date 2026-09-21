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

## Deploy on Cloudflare Pages

Connect the **frontend** GitHub repo. Settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (this repo is already the frontend) |
| Node version | `20` or higher |

Add these **build-time** environment variables in Pages → Settings → Environment variables. Vite bakes them into the JS bundle, so you must **rebuild** after changing them.

| Key | Live value |
|---|---|
| `VITE_SUPABASE_URL` | same as backend `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same as backend `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_API_URL` | public Render API URL, e.g. `https://career-os-back.onrender.com` (no trailing slash) |

SPA routes (`/login`, `/candidate/dashboard`, …) need [`public/_redirects`](public/_redirects). Vite copies that file into `dist/` on build.

Also set backend `FRONTEND_URL` (Render) to the Pages origin, e.g. `https://career-os-front.pages.dev`, or the site will hit CORS errors.

In Supabase: Authentication → URL Configuration, add:

```
https://<your-pages-domain>/auth/callback
https://<your-pages-domain>/auth/reset-password
```

Google Cloud must also allow Supabase’s callback (not the Pages origin).
`Error 400: redirect_uri_mismatch` is fixed on the OAuth **Web client** whose
Client ID is in Supabase → Authentication → Providers → Google:

```
https://tudwilxhzsxtvufhvbch.supabase.co/auth/v1/callback
```

Current client: `347864484607-ss8opc02n0j6mvkdgofouk1k8lm6uv76.apps.googleusercontent.com`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production Vite build |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
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
