# ImmunoRoster

Monorepo setup for production deployment:

- frontend: React + Vite app (deploy to Vercel)
- backend: API routes compatible with Vercel deployment, plus local Node dev server

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

- Copy `frontend/.env.example` to `frontend/.env`
- Copy `backend/.env.example` to `backend/.env`
- Generate JWT secrets with `npm --workspace backend run generate:jwt` and paste into `backend/.env`

3. Run locally:

```bash
npm run dev
```

Frontend runs on http://localhost:5173, backend runs on http://localhost:3000.

Optional: run Vercel local emulation for backend with `npm --workspace backend run dev:vercel`.

## Deploy

This repo includes a root `vercel.json` guard that intentionally fails root deployment.
Create separate Vercel projects using subdirectory roots.

1. Push this repository to GitHub.
2. Create two Vercel projects from the same repo:
- immunoroster-frontend with root directory `frontend`
- immunoroster-backend with root directory `backend`
3. Add each app's environment variables in Vercel.
4. Set `VITE_API_BASE_URL` in frontend Vercel project to backend Vercel URL.
5. Run SQL from `backend/supabase/schema.sql` in Supabase SQL editor.
6. Sign in with default admin credentials from `backend/README.md` and rotate them immediately.
