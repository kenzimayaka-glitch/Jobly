create table if not exists public."MobilityRequest" (
 id uuid primary key,
 "userId" text not null references public."User"(id) on delete cascade,
 "departCity" text not null, "arriveeCity" text not null,
 "departLat" double precision, "departLng" double precision,
 "arriveeLat" double precision, "arriveeLng" double precision,
 "distanceKm" double precision not null default 0,
 "housingType" text not null, salary numeric not null default 0,
 "costTotal" numeric not null default 0, "costMonthly" numeric not null default 0,
 "mobilityFit" integer not null default 0, status text not null default 'DRAFT',
 "currentStep" integer not null default 1, "subventionPercent" numeric not null default 0,
 "cniWatermarked" boolean not null default false,
 "createdAt" timestamptz not null default now(), "updatedAt" timestamptz not null default now()
);
create index if not exists mobility_request_user_idx on public."MobilityRequest"("userId");
create index if not exists mobility_request_created_idx on public."MobilityRequest"("createdAt" desc);
alter table public."MobilityRequest" enable row level security;