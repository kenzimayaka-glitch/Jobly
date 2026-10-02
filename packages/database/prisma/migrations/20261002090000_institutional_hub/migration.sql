-- Lot C+D — Institutional Hub / private B2B cockpit
-- Institution is a pre-existing production table. Do not recreate it.

create table if not exists public."InstitutionAccess" (
  id text primary key,
  "institutionId" uuid not null references public."Institution"(id) on delete cascade,
  login text not null unique,
  "passwordHash" text not null,
  "passwordSalt" text not null,
  active boolean not null default true,
  "lastLoginAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."InstitutionSession" (
  id text primary key,
  "accessId" text not null references public."InstitutionAccess"(id) on delete cascade,
  "tokenHash" text not null unique,
  "expiresAt" timestamptz not null,
  "revokedAt" timestamptz,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."InstitutionPartnership" (
  id text primary key,
  "institutionId" uuid not null references public."Institution"(id) on delete cascade,
  name text not null,
  status text not null default 'ACTIVE',
  "startedAt" timestamptz not null default now(),
  "endedAt" timestamptz,
  configuration jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."InstitutionProject" (
  id text primary key,
  "institutionId" uuid not null references public."Institution"(id) on delete cascade,
  "partnershipId" text not null references public."InstitutionPartnership"(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'ACTIVE',
  "startsAt" timestamptz,
  "endsAt" timestamptz,
  "dataScope" jsonb not null default '{}'::jsonb,
  "dashboardConfig" jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."InstitutionReport" (
  id text primary key,
  "institutionId" uuid not null references public."Institution"(id) on delete cascade,
  "partnershipId" text not null references public."InstitutionPartnership"(id) on delete cascade,
  "projectId" text references public."InstitutionProject"(id) on delete cascade,
  title text not null,
  "periodStart" timestamptz,
  "periodEnd" timestamptz,
  status text not null default 'READY',
  payload jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "InstitutionAccess_institutionId_active_idx" on public."InstitutionAccess" ("institutionId", active);
create index if not exists "InstitutionSession_accessId_expiresAt_idx" on public."InstitutionSession" ("accessId", "expiresAt");
create index if not exists "InstitutionPartnership_institutionId_status_idx" on public."InstitutionPartnership" ("institutionId", status);
create index if not exists "InstitutionProject_institutionId_status_idx" on public."InstitutionProject" ("institutionId", status);
create index if not exists "InstitutionProject_partnershipId_status_idx" on public."InstitutionProject" ("partnershipId", status);
create index if not exists "InstitutionReport_institutionId_createdAt_idx" on public."InstitutionReport" ("institutionId", "createdAt");
create index if not exists "InstitutionReport_projectId_createdAt_idx" on public."InstitutionReport" ("projectId", "createdAt");

alter table public."InstitutionAccess" enable row level security;
alter table public."InstitutionSession" enable row level security;
alter table public."InstitutionPartnership" enable row level security;
alter table public."InstitutionProject" enable row level security;
alter table public."InstitutionReport" enable row level security;

-- Private B2B data: no anon/authenticated policies. Server routes use service_role.
revoke all on public."InstitutionAccess" from anon, authenticated;
revoke all on public."InstitutionSession" from anon, authenticated;
revoke all on public."InstitutionPartnership" from anon, authenticated;
revoke all on public."InstitutionProject" from anon, authenticated;
revoke all on public."InstitutionReport" from anon, authenticated;

create or replace function public.set_institution_hub_updated_at()
returns trigger language plpgsql as $$
begin
  new."updatedAt" = now();
  return new;
end $$;

drop trigger if exists institution_access_updated_at on public."InstitutionAccess";
create trigger institution_access_updated_at before update on public."InstitutionAccess"
for each row execute function public.set_institution_hub_updated_at();

drop trigger if exists institution_partnership_updated_at on public."InstitutionPartnership";
create trigger institution_partnership_updated_at before update on public."InstitutionPartnership"
for each row execute function public.set_institution_hub_updated_at();

drop trigger if exists institution_project_updated_at on public."InstitutionProject";
create trigger institution_project_updated_at before update on public."InstitutionProject"
for each row execute function public.set_institution_hub_updated_at();

drop trigger if exists institution_report_updated_at on public."InstitutionReport";
create trigger institution_report_updated_at before update on public."InstitutionReport"
for each row execute function public.set_institution_hub_updated_at();
