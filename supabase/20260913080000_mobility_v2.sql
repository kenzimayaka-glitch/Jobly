-- JOBLY MOBILITY V2 — context navigation, GPS, requests, partners and passes
create extension if not exists pgcrypto;

create table if not exists "MobilityRequest" (
  id text primary key,
  "userId" text not null references "User"(id) on delete cascade,
  "departCity" text not null,
  "arriveeCity" text not null,
  "departLat" numeric not null,
  "departLng" numeric not null,
  "arriveeLat" numeric not null,
  "arriveeLng" numeric not null,
  "companyLat" numeric,
  "companyLng" numeric,
  "distanceKm" integer not null default 0,
  "housingType" text not null default 'CHAMBRE',
  salary integer not null default 0,
  "costTotal" integer not null default 0,
  "costMonthly" integer not null default 0,
  "mobilityFit" integer not null default 20,
  "subventionPercent" integer not null default 0,
  status text not null default 'DRAFT',
  "currentStep" integer not null default 1,
  "recruiterGuaranteed" boolean not null default false,
  "passCode" text unique,
  "passUsages" integer not null default 0,
  "cniWatermarked" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists mobility_request_user_idx on "MobilityRequest"("userId","updatedAt" desc);
create index if not exists mobility_request_status_idx on "MobilityRequest"(status);

create table if not exists "PartnerExtended" (
  id text primary key,
  "partnerUserId" text references "User"(id) on delete cascade,
  type text not null check(type in ('FINANCE','HOUSING','TRANSPORT')),
  code text not null unique,
  lat numeric,
  lng numeric,
  "createdAt" timestamptz not null default now()
);
create index if not exists partner_extended_type_idx on "PartnerExtended"(type);

create table if not exists "PartnerHousing" (
  id text primary key,
  "partnerExtendedId" text not null references "PartnerExtended"(id) on delete cascade,
  name text not null,
  address text,
  lat numeric not null,
  lng numeric not null,
  "monthlyCost" integer not null default 0,
  available boolean not null default true,
  "distanceToCompanyKm" numeric,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table "MobilityRequest" enable row level security;
drop policy if exists "mobility_owner_select" on "MobilityRequest";
create policy "mobility_owner_select" on "MobilityRequest" for select using ("userId" = (select id from "User" where "authUserId" = auth.uid() limit 1));
drop policy if exists "mobility_owner_insert" on "MobilityRequest";
create policy "mobility_owner_insert" on "MobilityRequest" for insert with check ("userId" = (select id from "User" where "authUserId" = auth.uid() limit 1));
drop policy if exists "mobility_owner_update" on "MobilityRequest";
create policy "mobility_owner_update" on "MobilityRequest" for update using ("userId" = (select id from "User" where "authUserId" = auth.uid() limit 1));
