-- Generic Institution ↔ Jobly ecosystem communication bridge.
create table if not exists public."InstitutionCommunication"(
 id uuid primary key default gen_random_uuid(),
 "institutionId" uuid not null references public."Institution"(id) on delete cascade,
 "programId" uuid references public."MobilityProgram"(id) on delete set null,
 "sourceEcosystem" text not null,
 "targetEcosystem" text not null,
 "eventType" text not null,
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'QUEUED',
 "createdAt" timestamptz not null default now(),
 "deliveredAt" timestamptz
);
create index if not exists "InstitutionCommunication_institution_idx" on public."InstitutionCommunication"("institutionId","createdAt" desc);
alter table public."InstitutionCommunication" enable row level security;