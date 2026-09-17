begin;

alter table public."Subscription" add column if not exists "productType" text not null default 'TALENT';
alter table public."Subscription" drop constraint if exists "Subscription_productType_check";
alter table public."Subscription" add constraint "Subscription_productType_check" check ("productType" in ('TALENT','RECRUITER'));

alter table public."Partner"
  add column if not exists "partnerType" text not null default 'BRAND_AMBASSADOR',
  add column if not exists "locationText" text,
  add column if not exists "locationLat" double precision,
  add column if not exists "locationLng" double precision,
  add column if not exists "locationConsent" boolean not null default false,
  add column if not exists "locationUpdatedAt" timestamp with time zone,
  add column if not exists "kycCompletedAt" timestamp with time zone,
  add column if not exists "agreementId" uuid;
alter table public."Partner" drop constraint if exists "Partner_partnerType_check";
alter table public."Partner" add constraint "Partner_partnerType_check" check ("partnerType" in ('BRAND_AMBASSADOR','DISTRIBUTOR','SUPER_AGENT'));

create table if not exists public."PartnerKyc" (
  "id" uuid primary key default gen_random_uuid(), "partnerId" uuid not null unique references public."Partner"("id") on delete cascade,
  "locationText" text, "locationLat" double precision, "locationLng" double precision, "locationConsent" boolean not null default false,
  "idFrontPath" text, "idBackPath" text, "consentProgramme" boolean not null default false, "consentPrivacy" boolean not null default false,
  "consentSecurity" boolean not null default false, "consentAntiFraud" boolean not null default false, "termsVersion" text,
  "acceptedAt" timestamp with time zone, "status" text not null default 'DRAFT', "createdAt" timestamp with time zone not null default now(), "updatedAt" timestamp with time zone not null default now(),
  constraint "PartnerKyc_status_check" check ("status" in ('DRAFT','SUBMITTED','VERIFIED','REJECTED'))
);

create table if not exists public."PartnerAgreement" (
  "id" uuid primary key default gen_random_uuid(), "partnerId" uuid not null references public."Partner"("id") on delete cascade,
  "version" text not null, "agreementType" text not null default 'BRAND_AMBASSADOR_FREELANCE', "partnerName" text not null, "partnerUsername" text,
  "partnerEmail" text, "partnerPhone" text, "adminSignerName" text not null, "adminSignerRole" text not null, "adminSignaturePath" text,
  "documentPath" text, "acceptedAt" timestamp with time zone, "status" text not null default 'GENERATED', "createdAt" timestamp with time zone not null default now(),
  constraint "PartnerAgreement_status_check" check ("status" in ('GENERATED','ACCEPTED','VOID'))
);

create table if not exists public."PartnerReferral" (
  "id" uuid primary key default gen_random_uuid(), "partnerId" uuid not null references public."Partner"("id") on delete cascade,
  "referredUserId" text not null references public."User"("id") on delete cascade, "accountType" text not null, "source" text not null default 'REFERRAL_LINK',
  "createdAt" timestamp with time zone not null default now(), constraint "PartnerReferral_accountType_check" check ("accountType" in ('TALENT','RECRUITER','PARTNER')),
  unique ("partnerId","referredUserId")
);

alter table public."Commission"
  add column if not exists "sourceType" text not null default 'ACQUISITION', add column if not exists "accountType" text, add column if not exists "planCode" text,
  add column if not exists "billingInterval" text, add column if not exists "subscriptionId" text, add column if not exists "referredUserId" text,
  add column if not exists "missionId" uuid, add column if not exists "periodKey" text;
alter table public."Commission" drop constraint if exists "Commission_sourceType_check";
alter table public."Commission" add constraint "Commission_sourceType_check" check ("sourceType" in ('ACQUISITION','MISSION','OBJECTIVE_BONUS','GROWTH_BONUS','RECRUITER_MONTHLY_BONUS','CHAMPION_BONUS','CAMPAIGN_BONUS'));

create table if not exists public."PartnerMission" (
  "id" uuid primary key default gen_random_uuid(), "partnerId" uuid not null references public."Partner"("id") on delete cascade, "missionDate" date not null,
  "title" text not null, "description" text, "missionType" text not null, "targetValue" integer, "completedValue" integer not null default 0, "rewardXaf" integer not null default 0,
  "status" text not null default 'ASSIGNED', "createdAt" timestamp with time zone not null default now(), "completedAt" timestamp with time zone,
  constraint "PartnerMission_status_check" check ("status" in ('ASSIGNED','IN_PROGRESS','COMPLETED','EXPIRED','REJECTED'))
);

create table if not exists public."PartnerPerformanceDaily" (
  "id" uuid primary key default gen_random_uuid(), "partnerId" uuid not null references public."Partner"("id") on delete cascade, "performanceDate" date not null,
  "targetAccounts" integer not null default 0, "paidRecruiters" integer not null default 0, "paidTalents" integer not null default 0, "usersRegistered" integer not null default 0,
  "missionsCompleted" integer not null default 0, "commissionGeneratedXaf" integer not null default 0, "objectivePercent" numeric(7,2) not null default 0, "daysAhead" numeric(8,2) not null default 0,
  "createdAt" timestamp with time zone not null default now(), unique ("partnerId","performanceDate")
);

create table if not exists public."PartnerMonthlyPerformance" (
  "id" uuid primary key default gen_random_uuid(), "partnerId" uuid not null references public."Partner"("id") on delete cascade, "periodKey" text not null,
  "targetPaidRecruiters" integer not null default 80, "paidRecruiters" integer not null default 0, "startCount" integer not null default 0, "premiumCount" integer not null default 0, "proCount" integer not null default 0,
  "objectivePercent" numeric(7,2) not null default 0, "commissionGeneratedXaf" integer not null default 0, "growthPercentVsPrevious" numeric(8,2) not null default 0,
  "performanceIndex" numeric(10,2) not null default 0, "rank" integer, "recruiterBonusXaf" integer not null default 0, "championBonusXaf" integer not null default 0,
  "createdAt" timestamp with time zone not null default now(), "updatedAt" timestamp with time zone not null default now(), unique ("partnerId","periodKey")
);

create index if not exists "PartnerReferral_referredUserId_idx" on public."PartnerReferral"("referredUserId");
create index if not exists "PartnerReferral_accountType_idx" on public."PartnerReferral"("accountType");
create index if not exists "Commission_partnerId_createdAt_idx" on public."Commission"("partnerId","createdAt");
create index if not exists "Commission_sourceType_periodKey_idx" on public."Commission"("sourceType","periodKey");
create index if not exists "PartnerMission_partnerId_date_idx" on public."PartnerMission"("partnerId","missionDate");
create index if not exists "PartnerPerformanceDaily_date_idx" on public."PartnerPerformanceDaily"("performanceDate");
create index if not exists "PartnerMonthlyPerformance_period_idx" on public."PartnerMonthlyPerformance"("periodKey");

alter table public."PartnerKyc" enable row level security;
alter table public."PartnerAgreement" enable row level security;
alter table public."PartnerReferral" enable row level security;
alter table public."PartnerMission" enable row level security;
alter table public."PartnerPerformanceDaily" enable row level security;
alter table public."PartnerMonthlyPerformance" enable row level security;

commit;
