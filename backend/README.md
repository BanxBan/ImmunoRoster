# Backend (Vercel + Supabase)

## Local Development

- `npm --workspace backend run dev` runs a local Node server at `http://localhost:3000` without Vercel login.
- `npm --workspace backend run dev:vercel` runs Vercel local emulation (requires Vercel CLI auth).

## API Routes

- `POST /api/auth/admin-login`
- `POST /api/auth/refresh`
- `POST /api/auth/patient-register`
- `POST /api/auth/patient-login`
- `POST /api/auth/patient-refresh`
- `GET|POST|PATCH|DELETE /api/patients`
- `GET|POST|PATCH|DELETE /api/immunizations`
- `GET|POST|PATCH|DELETE /api/animal-bites`
- `GET|POST|PATCH|DELETE /api/medications`
- `GET /api/analytics`
- `GET|POST|PATCH|DELETE /api/providers`
- `GET /api/health`

`PATCH` and `DELETE` require `?id=<uuid>`.

All patient/provider/immunization/medication routes now require `Authorization: Bearer <admin_access_token>`.

## Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SUPABASE_ANON_KEY` (optional if validating user tokens)
- `DATABASE_URL` (optional for direct SQL/Prisma usage)
- `FRONTEND_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ISSUER` (optional, default `immunoroster-api`)
- `JWT_AUDIENCE` (optional, default `immunoroster-admin`)
- `JWT_PATIENT_AUDIENCE` (optional, default `immunoroster-patient`)
- `JWT_ACCESS_TTL` (optional, default `1h`)
- `JWT_REFRESH_TTL` (optional, default `7d`)
- `PATIENT_SELF_REGISTRATION` (optional, default `true`; set to `false` to require admin token for `/api/auth/patient-register`)

Generate secrets with:

```bash
npm --workspace backend run generate:jwt
```

## Supabase SQL

Run `supabase/schema.sql` in Supabase SQL editor to create tables + RLS policies for:

- patients
- immunizations
- animal bite cases
- medication tracking
- community population (for analytics/coverage)

The SQL includes a default admin user:

- `username`: `admin`
- `password`: `password`
- `email`: `admin@immunoroster.local`

Change this record immediately after first login.
