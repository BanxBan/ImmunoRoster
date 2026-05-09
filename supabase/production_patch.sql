-- Run this in Supabase SQL Editor before/after deploying to Vercel.
-- It brings existing production databases up to date with the current app fields.

alter table public.immunizations add column if not exists is_minor_patient boolean;
alter table public.immunizations add column if not exists guardian_name text;
alter table public.immunizations add column if not exists guardian_email text;
alter table public.immunizations add column if not exists guardian_contact_number text;
alter table public.immunizations add column if not exists consent_given boolean;
alter table public.immunizations add column if not exists consent_given_by text;
alter table public.immunizations add column if not exists consent_statement text;
alter table public.immunizations add column if not exists created_by uuid references public.admin_users(id) on delete set null;

alter table public.animal_bites add column if not exists site_of_exposure text;
alter table public.animal_bites add column if not exists schedule_d14 date;
alter table public.animal_bites add column if not exists schedule_d21 date;
alter table public.animal_bites add column if not exists created_by uuid references public.admin_users(id) on delete set null;
