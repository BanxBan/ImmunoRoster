# ImmunoRoster Deployment Guide

## 1. Supabase Setup

1. Create a new Supabase project.
2. In SQL Editor, run `backend/supabase/schema.sql`.
3. In Authentication:
- Create RHU users.
- Add `app_metadata.role` values: `admin` or `health_worker`.
4. In Project Settings > API, copy:
- `SUPABASE_URL`
- `anon` key
- `service_role` key

## 2. Environment Variables

Backend (`backend/.env` / Vercel backend project):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `FRONTEND_URL`
- `CRON_SECRET`

Frontend (`frontend/.env` / Vercel frontend project):

- `VITE_API_BASE_URL` (backend Vercel URL)
- `VITE_SUPABASE_URL` (optional if client auth is added)
- `VITE_SUPABASE_ANON_KEY` (optional if client auth is added)

## 3. Vercel Projects

Create two projects from one repo:

1. Frontend
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

2. Backend
- Root Directory: `backend`
- Framework Preset: `Other`
- Functions from `api/*.js` are auto-deployed

## 4. API Endpoints

- `GET|POST|PATCH|DELETE /api/patients`
- `GET|POST|PATCH|DELETE /api/immunizations`
- `GET|POST|PATCH|DELETE /api/medications`
- `GET|POST|PATCH|DELETE /api/providers`
- `GET /api/health`
- `GET /api/cron/daily-reminders` (daily due-check cron)

## 5. Validation Checklist

1. Open frontend Vercel app and create a patient.
2. Confirm row appears in Supabase `patients` table.
3. Call backend routes and verify CRUD works.
4. Seed an overdue immunization and medication, then call:
- `/api/immunizations?dueOnly=true`
- `/api/medications?dueOnly=true`
5. Confirm no secret keys are present in frontend env or bundle.
