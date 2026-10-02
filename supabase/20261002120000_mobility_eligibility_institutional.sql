-- Mobility F1/F2 foundation: employer convention, eligibility, programs and financing.
-- Additive and reversible: no existing Mobility rows are deleted or rewritten.

alter table public."MobilityRequest"
  add column if not exists "applicationId" uuid,
  add column if not exists "recruiterUserId" uuid,
  add column if not exists "salaryApproved" numeric,
  add column if not exists "salaryCurrency" text default 'XAF',
  add column if not exists "salarySource" text,
  add column if not exists "eligibilityThresholdPercent" numeric default 35,
  add column if not exists "eligibilityBurdenPercent" numeric,
  add column if not exists "eligibilityStatus" text,
  add column if not exists "eligibilityReason" text,
  add column if not exists "eligibilityCalculatedAt" timestamptz,
  add column if not exists "eligibilityVersion" text,
  add column if not exists "companyAgreementId" uuid,
  add column if not exists "recruiterGuaranteeId" uuid;

create index if not exists "MobilityRequest_applicationId_idx" on public."MobilityRequest" ("applicationId");
create index if not exists "MobilityRequest_recruiterUserId_idx" on public."MobilityRequest" ("recruiterUserId");
create index if not exists "MobilityRequest_eligibilityStatus_idx" on public."MobilityRequest" ("eligibilityStatus");

create table if not exists public."MobilityCompanyAgreement" (
  id uuid primary key default gen_random_uuid(),
  "recruiterUserId" uuid not null,
  "companyName" text not null,
  "accepted" boolean not null default false,
  "acceptedAt" timestamptz,
  "termsVersion" text not null,
  "repaymentGuaranteed" boolean not null default false,
  "terminationDoesNotRelease" boolean not null default true,
  "payrollDeductionMonths" integer not null default 3,
  "paymentProvider" text,
  "paymentAccountRef" text,
  "evidenceUrl" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MobilityCompanyAgreement_months_chk" check ("payrollDeductionMonths" between 1 and 3)
);

create index if not exists "MobilityCompanyAgreement_recruiter_idx"
  on public."MobilityCompanyAgreement" ("recruiterUserId", "accepted");

create table if not exists public."MobilityRecruiterGuarantee" (
  id uuid primary key default gen_random_uuid(),
  "mobilityRequestId" uuid,
  "recruiterUserId" uuid not null,
  "guaranteedAmount" numeric not null default 0,
  currency text not null default 'XAF',
  "repaymentMonths" integer not null default 3,
  "payrollDeductionPercent" numeric,
  "terminationStillDue" boolean not null default true,
  "accepted" boolean not null default false,
  "acceptedAt" timestamptz,
  "paymentProvider" text,
  "paymentDestinationRef" text,
  "consentEvidenceUrl" text,
  "status" text not null default 'PENDING',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MobilityRecruiterGuarantee_months_chk" check ("repaymentMonths" between 1 and 3),
  constraint "MobilityRecruiterGuarantee_amount_chk" check ("guaranteedAmount" >= 0)
);

create index if not exists "MobilityRecruiterGuarantee_recruiter_idx"
  on public."MobilityRecruiterGuarantee" ("recruiterUserId", "status");

create table if not exists public."MobilityCostItem" (
  id uuid primary key default gen_random_uuid(),
  "mobilityRequestId" uuid not null references public."MobilityRequest"(id) on delete cascade,
  category text not null,
  amount numeric not null,
  currency text not null default 'XAF',
  source text not null default 'SYSTEM_ESTIMATE',
  confidence numeric,
  "estimatedAt" timestamptz not null default now(),
  "verifiedAt" timestamptz,
  "eligibilityStatus" text not null default 'PENDING',
  "createdAt" timestamptz not null default now(),
  constraint "MobilityCostItem_amount_chk" check (amount >= 0),
  constraint "MobilityCostItem_category_chk" check (category in ('TRANSPORT','HOUSING','INSTALLATION','LOCAL_TRANSPORT','COST_OF_LIVING','OTHER'))
);

create index if not exists "MobilityCostItem_request_idx"
  on public."MobilityCostItem" ("mobilityRequestId");

create table if not exists public."MobilityEligibilityDecision" (
  id uuid primary key default gen_random_uuid(),
  "mobilityRequestId" uuid not null references public."MobilityRequest"(id) on delete cascade,
  version text not null,
  status text not null,
  "approvedSalary" numeric,
  "salaryCurrency" text not null default 'XAF',
  "totalMobilityCost" numeric not null default 0,
  "thresholdPercent" numeric not null default 35,
  "maximumEligibleCost" numeric,
  "burdenPercent" numeric,
  "companyMobilityAgreementAccepted" boolean not null default false,
  "recruiterGuaranteeAccepted" boolean not null default false,
  "repaymentMonths" integer not null default 3,
  "repaymentMonthlyAmount" numeric,
  reason text not null,
  "missingInformation" jsonb not null default '[]'::jsonb,
  "calculatedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

create index if not exists "MobilityEligibilityDecision_request_idx"
  on public."MobilityEligibilityDecision" ("mobilityRequestId", "calculatedAt" desc);

create table if not exists public."InstitutionMember" (
  id uuid primary key default gen_random_uuid(),
  "institutionId" uuid not null references public."Institution"(id) on delete cascade,
  "userId" text not null,
  role text not null default 'VIEWER',
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("institutionId","userId")
);

create index if not exists "InstitutionMember_user_idx"
  on public."InstitutionMember" ("userId", active);

create table if not exists public."MobilityProgram" (
  id uuid primary key default gen_random_uuid(),
  "institutionId" uuid not null references public."Institution"(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  status text not null default 'DRAFT',
  "populationRule" jsonb not null default '{}'::jsonb,
  "geographyRule" jsonb not null default '{}'::jsonb,
  "capacity" integer,
  "budgetTotal" numeric,
  "currency" text not null default 'XAF',
  "eligibleExpenses" jsonb not null default '[]'::jsonb,
  "eligibilityRule" jsonb not null default '{"mobilityThresholdPercent":35,"requiresEmployerAgreement":true,"requiresRecruiterGuarantee":true,"repaymentMonths":3}'::jsonb,
  "fundingModel" text not null default 'REPAYABLE_ADVANCE',
  "startsAt" timestamptz,
  "endsAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("institutionId", code)
);

create index if not exists "MobilityProgram_institution_status_idx"
  on public."MobilityProgram" ("institutionId", status);

create table if not exists public."MobilityFundingRule" (
  id uuid primary key default gen_random_uuid(),
  "programId" uuid not null references public."MobilityProgram"(id) on delete cascade,
  name text not null,
  "ruleType" text not null,
  configuration jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  "createdAt" timestamptz not null default now()
);

create index if not exists "MobilityFundingRule_program_idx"
  on public."MobilityFundingRule" ("programId", active);

create table if not exists public."MobilityFundingAllocation" (
  id uuid primary key default gen_random_uuid(),
  "programId" uuid not null references public."MobilityProgram"(id) on delete restrict,
  "mobilityRequestId" uuid not null references public."MobilityRequest"(id) on delete restrict,
  "approvedAmount" numeric not null default 0,
  currency text not null default 'XAF',
  status text not null default 'PENDING',
  "approvedAt" timestamptz,
  "approvedByUserId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("programId","mobilityRequestId"),
  constraint "MobilityFundingAllocation_amount_chk" check ("approvedAmount" >= 0)
);

create table if not exists public."MobilityFundingTransaction" (
  id uuid primary key default gen_random_uuid(),
  "allocationId" uuid not null references public."MobilityFundingAllocation"(id) on delete restrict,
  "transactionType" text not null,
  amount numeric not null,
  currency text not null default 'XAF',
  provider text,
  "externalReference" text,
  status text not null default 'PENDING',
  "executedAt" timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  constraint "MobilityFundingTransaction_amount_chk" check (amount >= 0)
);

create index if not exists "MobilityFundingTransaction_allocation_idx"
  on public."MobilityFundingTransaction" ("allocationId", "createdAt");

create table if not exists public."MobilityRepaymentPlan" (
  id uuid primary key default gen_random_uuid(),
  "allocationId" uuid not null references public."MobilityFundingAllocation"(id) on delete restrict,
  "guarantorRecruiterUserId" uuid not null,
  "totalAmount" numeric not null,
  currency text not null default 'XAF',
  "installmentCount" integer not null default 3,
  "installmentAmount" numeric not null,
  "deductionMethod" text not null default 'PAYROLL_API',
  "startAt" timestamptz,
  "endAt" timestamptz,
  status text not null default 'PENDING',
  "terminationStillDue" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MobilityRepaymentPlan_count_chk" check ("installmentCount" between 1 and 3),
  constraint "MobilityRepaymentPlan_amount_chk" check ("totalAmount" >= 0 and "installmentAmount" >= 0)
);

alter table public."MobilityRequest"
  drop constraint if exists "MobilityRequest_applicationId_fkey";
alter table public."MobilityRequest"
  add constraint "MobilityRequest_applicationId_fkey"
  foreign key ("applicationId") references public."Application"(id) on delete set null;

alter table public."MobilityRequest"
  drop constraint if exists "MobilityRequest_companyAgreementId_fkey";
alter table public."MobilityRequest"
  add constraint "MobilityRequest_companyAgreementId_fkey"
  foreign key ("companyAgreementId") references public."MobilityCompanyAgreement"(id) on delete set null;

alter table public."MobilityRequest"
  drop constraint if exists "MobilityRequest_recruiterGuaranteeId_fkey";
alter table public."MobilityRequest"
  add constraint "MobilityRequest_recruiterGuaranteeId_fkey"
  foreign key ("recruiterGuaranteeId") references public."MobilityRecruiterGuarantee"(id) on delete set null;

-- RLS: these are server-mediated institutional/financial records.
alter table public."MobilityCompanyAgreement" enable row level security;
alter table public."MobilityRecruiterGuarantee" enable row level security;
alter table public."MobilityCostItem" enable row level security;
alter table public."MobilityEligibilityDecision" enable row level security;
alter table public."InstitutionMember" enable row level security;
alter table public."MobilityProgram" enable row level security;
alter table public."MobilityFundingRule" enable row level security;
alter table public."MobilityFundingAllocation" enable row level security;
alter table public."MobilityFundingTransaction" enable row level security;
alter table public."MobilityRepaymentPlan" enable row level security;
