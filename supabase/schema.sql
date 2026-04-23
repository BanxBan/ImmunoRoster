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

create table if not exists public.patient_accounts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique,
  username text not null unique,
  email text unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text not null unique default ('PAT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  full_name text not null,
  date_of_birth date not null,
  sex text,
  contact_number text,
  barangay text,
  municipality text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patients add column if not exists patient_code text;
alter table public.patients add column if not exists barangay text;
alter table public.patients add column if not exists municipality text;
update public.patients
set patient_code = ('PAT-' || upper(substr(replace(id::text, '-', ''), 1, 10)))
where patient_code is null;
alter table public.patients alter column patient_code set default ('PAT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));
alter table public.patients alter column patient_code set not null;
create unique index if not exists idx_patients_patient_code on public.patients(patient_code);

alter table public.patient_accounts
drop constraint if exists patient_accounts_patient_id_fkey;
alter table public.patient_accounts
add constraint patient_accounts_patient_id_fkey
foreign key (patient_id) references public.patients(id) on delete cascade;

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
  status text not null default 'pending' check (status in ('pending', 'due', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.immunizations
drop constraint if exists immunizations_status_check;
alter table public.immunizations
add constraint immunizations_status_check check (status in ('pending', 'due', 'completed'));

create table if not exists public.animal_bites (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  animal_type text not null,
  incident_date date not null,
  severity_category text,
  treatment_protocol text,
  total_required_doses int not null default 4,
  doses_administered int not null default 0,
  days_between_doses int not null default 3,
  last_dose_date date,
  next_visit_date date,
  treatment_status text not null default 'pending' check (treatment_status in ('pending', 'due', 'completed', 'missed')),
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
  adherence_status text not null default 'on_track' check (adherence_status in ('on_track', 'due', 'missed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.medications add column if not exists adherence_status text not null default 'on_track';
alter table public.medications
drop constraint if exists medications_adherence_status_check;
alter table public.medications
add constraint medications_adherence_status_check check (adherence_status in ('on_track', 'due', 'missed'));

create table if not exists public.community_population (
  id uuid primary key default gen_random_uuid(),
  barangay text not null,
  municipality text not null,
  total_population int not null check (total_population >= 0),
  reporting_year int not null default extract(year from now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barangay, municipality, reporting_year)
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

drop trigger if exists trg_animal_bites_updated_at on public.animal_bites;
create trigger trg_animal_bites_updated_at
before update on public.animal_bites
for each row execute function public.set_updated_at();

drop trigger if exists trg_medications_updated_at on public.medications;
create trigger trg_medications_updated_at
before update on public.medications
for each row execute function public.set_updated_at();

drop trigger if exists trg_community_population_updated_at on public.community_population;
create trigger trg_community_population_updated_at
before update on public.community_population
for each row execute function public.set_updated_at();

drop trigger if exists trg_patient_accounts_updated_at on public.patient_accounts;
create trigger trg_patient_accounts_updated_at
before update on public.patient_accounts
for each row execute function public.set_updated_at();

create index if not exists idx_patients_full_name on public.patients using gin (to_tsvector('simple', full_name));
create index if not exists idx_patients_location on public.patients (municipality, barangay);
create index if not exists idx_immunizations_patient_status on public.immunizations (patient_id, status);
create index if not exists idx_immunizations_due_dates on public.immunizations (scheduled_date, next_due_date);
create index if not exists idx_medications_patient_status on public.medications (patient_id, adherence_status);
create index if not exists idx_medications_next_refill_date on public.medications (next_refill_date);
create index if not exists idx_animal_bites_patient_status on public.animal_bites (patient_id, treatment_status);
create index if not exists idx_animal_bites_next_visit_date on public.animal_bites (next_visit_date);
create index if not exists idx_community_population_location on public.community_population (municipality, barangay, reporting_year);
create index if not exists idx_patient_accounts_username on public.patient_accounts (username);
create index if not exists idx_patient_accounts_email on public.patient_accounts (email);

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
  password_hash = '$2b$10$lXYVdYB9GPzWfXvfnfoRKO9tpaV9TcBQ.QSLpGxeVa0tL50kYx/gO',
  is_active = true
where email = 'admin@immunoroster.local';

alter table public.providers enable row level security;
alter table public.patients enable row level security;
alter table public.immunizations enable row level security;
alter table public.animal_bites enable row level security;
alter table public.medications enable row level security;
alter table public.community_population enable row level security;
alter table public.admin_users enable row level security;
alter table public.patient_accounts enable row level security;

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

drop policy if exists animal_bites_read on public.animal_bites;
create policy animal_bites_read on public.animal_bites
for select
to authenticated
using (true);

drop policy if exists animal_bites_write on public.animal_bites;
create policy animal_bites_write on public.animal_bites
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

drop policy if exists community_population_read on public.community_population;
create policy community_population_read on public.community_population
for select
to authenticated
using (true);

drop policy if exists community_population_write on public.community_population;
create policy community_population_write on public.community_population
for all
to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'))
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('admin', 'health_worker'));

drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users
for select
to authenticated
using ((auth.jwt() ->> 'email') = email);

drop policy if exists patient_accounts_self on public.patient_accounts;
create policy patient_accounts_self on public.patient_accounts
for select
to authenticated
using (
  coalesce((auth.jwt() ->> 'role'), '') = 'patient'
  and (
    coalesce((auth.jwt() ->> 'sub'), '') = id::text
    or coalesce((auth.jwt() ->> 'patient_id'), '') = patient_id::text
  )
);
