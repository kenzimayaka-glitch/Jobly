create table if not exists public."InstitutionKpiTarget" (
 id text primary key,
 "institutionId" uuid not null references public."Institution"(id) on delete cascade,
 "partnershipId" text not null references public."InstitutionPartnership"(id) on delete cascade,
 "projectId" text references public."InstitutionProject"(id) on delete cascade,
 key text not null,
 label text not null,
 target numeric(18,2) not null,
 unit text not null default 'COUNT',
 "periodStart" timestamptz not null,
 "periodEnd" timestamptz not null,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now()
);
create table if not exists public."InstitutionKpiSnapshot" (
 id text primary key,
 "institutionId" uuid not null references public."Institution"(id) on delete cascade,
 "partnershipId" text not null references public."InstitutionPartnership"(id) on delete cascade,
 "projectId" text references public."InstitutionProject"(id) on delete cascade,
 key text not null,
 label text not null,
 value numeric(18,2) not null,
 unit text not null default 'COUNT',
 "periodStart" timestamptz not null,
 "periodEnd" timestamptz not null,
 source text not null,
 "generatedAt" timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists "InstitutionKpiTarget_institution_period_idx" on public."InstitutionKpiTarget" ("institutionId","periodStart","periodEnd");
create index if not exists "InstitutionKpiSnapshot_institution_period_idx" on public."InstitutionKpiSnapshot" ("institutionId","periodEnd");
alter table public."InstitutionKpiTarget" enable row level security;
alter table public."InstitutionKpiSnapshot" enable row level security;
revoke all on public."InstitutionKpiTarget" from anon, authenticated;
revoke all on public."InstitutionKpiSnapshot" from anon, authenticated;