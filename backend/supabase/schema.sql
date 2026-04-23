create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique,
  email text not null unique,
  full_name text,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users
add column if not exists username text unique;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  license_number text,
  facility_name text,
  contact_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date not null,
  sex text,
  contact_number text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.immunizations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  vaccine_name text not null,
  dose_number int not null default 1,
  scheduled_date date,
  administered_date date,
  booster_interval_days int not null default 365,
  next_due_date date,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'overdue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  medication_name text not null,
  dosage text,
  frequency text,
  refill_interval_days int not null default 30,
  last_refill_date date,
  next_refill_date date,
  stock_count int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists trg_providers_updated_at on public.providers;
create trigger trg_providers_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

drop trigger if exists trg_immunizations_updated_at on public.immunizations;
create trigger trg_immunizations_updated_at
before update on public.immunizations
for each row execute function public.set_updated_at();

drop trigger if exists trg_medications_updated_at on public.medications;
create trigger trg_medications_updated_at
before update on public.medications
for each row execute function public.set_updated_at();

-- Seed one admin user (change email/password hash before running in production).
insert into public.admin_users (username, email, full_name, password_hash)
values (
  'admin',
  'admin@immunoroster.local',
  'Default Admin',
  '$2b$10$lXYVdYB9GPzWfXvfnfoRKO9tpaV9TcBQ.QSLpGxeVa0tL50kYx/gO'
)
on conflict (email) do nothing;

update public.admin_users
set
  username = 'admin',
  password_hash = '$2b$10$lXYVdYB9GPzWfXvfnfoRKO9tpaV9TcBQ.QSLpGxeVa0tL50kYx/gO'
where email = 'admin@immunoroster.local';

alter table public.providers enable row level security;
alter table public.patients enable row level security;
alter table public.immunizations enable row level security;
alter table public.medications enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists providers_read on public.providers;
create policy providers_read on public.providers
for select
to authenticated
using (true);

drop policy if exists providers_write on public.providers;
create policy providers_write on public.providers
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'))
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'));

drop policy if exists patients_read on public.patients;
create policy patients_read on public.patients
for select
to authenticated
using (true);

drop policy if exists patients_write on public.patients;
create policy patients_write on public.patients
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'))
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'));

drop policy if exists immunizations_read on public.immunizations;
create policy immunizations_read on public.immunizations
for select
to authenticated
using (true);

drop policy if exists immunizations_write on public.immunizations;
create policy immunizations_write on public.immunizations
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'))
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'));

drop policy if exists medications_read on public.medications;
create policy medications_read on public.medications
for select
to authenticated
using (true);

drop policy if exists medications_write on public.medications;
create policy medications_write on public.medications
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'))
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'));

drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users
for select
to authenticated
using ((auth.jwt() ->> 'email') = email);
