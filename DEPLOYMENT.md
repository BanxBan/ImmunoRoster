# ImmunoRoster Deployment Guide

## 1. Supabase Setup

1. Create a new Supabase project.
2. In SQL Editor, run `supabase/schema.sql`.
3. For an existing production database, also run `supabase/production_patch.sql` so Vercel APIs can save the latest Animal Bite and EPI fields.
4. In Authentication:
- Create RHU users.
- Add `app_metadata.role` values: `admin` or `health_worker`.
5. In Project Settings > API, copy:
- `SUPABASE_URL`
- `anon` key
- `service_role` key

## 2. Environment Variables

Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Optional local/frontend variables:

- `VITE_API_BASE_URL` (leave blank for a single Vercel project that serves both frontend and `/api`)

## 3. Vercel Project

Create one Vercel project from this repo:
- Root Directory: project root
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework Preset: `Vite`
- Functions from `api/*.js` are auto-deployed by Vercel

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
