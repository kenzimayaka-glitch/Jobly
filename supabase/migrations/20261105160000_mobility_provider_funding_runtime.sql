-- Mobility provider registry and controlled funding runtime.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mobility-provider-documents',
  'mobility-provider-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png'];

-- Additive only. This migration is committed for controlled rollout; do not apply to production before
-- validating provider agreements, funding evidence and the deployment window.

alter table public."MobilityProgram"
  add column if not exists "commitmentReference" text,
  add column if not exists "commitmentEvidenceUrl" text,
  add column if not exists "commitmentVerifiedByUserId" text,
  add column if not exists "commitmentVerifiedAt" timestamptz;

alter table public."MobilityCompanyAgreement"
  add column if not exists "acceptedByUserId" text,
  add column if not exists "acceptanceIp" text,
  add column if not exists "acceptanceUserAgent" text;

alter table public."MobilityFundingTransaction"
  add column if not exists "providerId" uuid,
  add column if not exists "evidenceUrl" text,
  add column if not exists "verifiedByUserId" text,
  add column if not exists "verifiedAt" timestamptz,
  add column if not exists "idempotencyKey" text;

create unique index if not exists "MobilityFundingTransaction_idempotency_idx"
  on public."MobilityFundingTransaction" ("idempotencyKey")
  where "idempotencyKey" is not null;

create unique index if not exists "MobilityFundingTransaction_provider_reference_idx"
  on public."MobilityFundingTransaction" ("providerId", "externalReference")
  where "providerId" is not null and "externalReference" is not null;

create table if not exists public."MobilityServiceProvider" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"(id) on delete restrict,
  "providerType" text not null,
  "legalName" text not null,
  "displayName" text not null,
  "registrationNumber" text,
  "countryCode" text not null default 'CM',
  city text not null,
  "contactEmail" text,
  "contactPhone" text,
  "kycStatus" text not null default 'PENDING',
  "kycEvidenceStoragePath" text,
  "kycReviewedByUserId" text,
  "kycReviewedAt" timestamptz,
  "contractVersion" text not null,
  "contractAcceptedAt" timestamptz not null,
  "contractAcceptedByUserId" text not null,
  status text not null default 'PENDING_REVIEW',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MobilityServiceProvider_type_chk"
    check ("providerType" in ('FINANCE','HOUSING','TRANSPORT')),
  constraint "MobilityServiceProvider_kyc_chk"
    check ("kycStatus" in ('PENDING','IN_REVIEW','VERIFIED','REJECTED','EXPIRED')),
  constraint "MobilityServiceProvider_status_chk"
    check (status in ('PENDING_REVIEW','ACTIVE','REJECTED','SUSPENDED')),
  unique ("userId","providerType")
);

create index if not exists "MobilityServiceProvider_type_status_idx"
  on public."MobilityServiceProvider" ("providerType", status, "kycStatus");

create table if not exists public."MobilityProviderService" (
  id uuid primary key default gen_random_uuid(),
  "providerId" uuid not null references public."MobilityServiceProvider"(id) on delete cascade,
  "serviceType" text not null,
  title text not null,
  description text,
  city text not null,
  "priceAmount" numeric,
  currency text not null default 'XAF',
  "serviceCapacity" integer,
  status text not null default 'DRAFT',
  "termsVersion" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MobilityProviderService_type_chk"
    check ("serviceType" in ('FINANCING','HOUSING','TRANSPORT')),
  constraint "MobilityProviderService_price_chk"
    check ("priceAmount" is null or "priceAmount" >= 0),
  constraint "MobilityProviderService_capacity_chk"
    check ("serviceCapacity" is null or "serviceCapacity" >= 0),
  constraint "MobilityProviderService_status_chk"
    check (status in ('DRAFT','ACTIVE','PAUSED','ARCHIVED'))
);

create index if not exists "MobilityProviderService_provider_status_idx"
  on public."MobilityProviderService" ("providerId", status);

create table if not exists public."MobilityProviderAssignment" (
  id uuid primary key default gen_random_uuid(),
  "mobilityRequestId" uuid not null references public."MobilityRequest"(id) on delete restrict,
  "providerId" uuid not null references public."MobilityServiceProvider"(id) on delete restrict,
  "serviceId" uuid not null references public."MobilityProviderService"(id) on delete restrict,
  "assignedByUserId" text not null,
  status text not null default 'PROPOSED',
  "agreedAmount" numeric,
  currency text not null default 'XAF',
  notes text,
  "acceptedAt" timestamptz,
  "completedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MobilityProviderAssignment_status_chk"
    check (status in ('PROPOSED','ACCEPTED','DECLINED','IN_PROGRESS','COMPLETED','CANCELLED')),
  constraint "MobilityProviderAssignment_amount_chk"
    check ("agreedAmount" is null or "agreedAmount" >= 0),
  unique ("mobilityRequestId","serviceId")
);

create index if not exists "MobilityProviderAssignment_provider_status_idx"
  on public."MobilityProviderAssignment" ("providerId", status, "createdAt" desc);
create index if not exists "MobilityProviderAssignment_request_idx"
  on public."MobilityProviderAssignment" ("mobilityRequestId");

alter table public."MobilityFundingTransaction"
  drop constraint if exists "MobilityFundingTransaction_providerId_fkey";
alter table public."MobilityFundingTransaction"
  add constraint "MobilityFundingTransaction_providerId_fkey"
  foreign key ("providerId") references public."MobilityServiceProvider"(id) on delete restrict;

alter table public."MobilityServiceProvider" enable row level security;
alter table public."MobilityProviderService" enable row level security;
alter table public."MobilityProviderAssignment" enable row level security;

revoke all on public."MobilityServiceProvider" from anon, authenticated;
revoke all on public."MobilityProviderService" from anon, authenticated;
revoke all on public."MobilityProviderAssignment" from anon, authenticated;
grant all on public."MobilityServiceProvider" to service_role;
grant all on public."MobilityProviderService" to service_role;
grant all on public."MobilityProviderAssignment" to service_role;

create table if not exists public."MobilityProgramApplication" (
  id uuid primary key default gen_random_uuid(),
  "programId" uuid not null references public."MobilityProgram"(id) on delete restrict,
  "mobilityRequestId" uuid not null references public."MobilityRequest"(id) on delete restrict,
  "applicantUserId" text not null references public."User"(id) on delete restrict,
  status text not null default 'PENDING',
  "submittedAt" timestamptz not null default now(),
  "decidedAt" timestamptz,
  "decidedByUserId" text,
  "decisionReason" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MobilityProgramApplication_status_chk"
    check (status in ('PENDING','APPROVED','REJECTED','WITHDRAWN')),
  unique ("programId","mobilityRequestId")
);

create index if not exists "MobilityProgramApplication_program_status_idx"
  on public."MobilityProgramApplication" ("programId", status, "submittedAt" desc);
create index if not exists "MobilityProgramApplication_request_idx"
  on public."MobilityProgramApplication" ("mobilityRequestId");

alter table public."MobilityProgramApplication" enable row level security;
revoke all on public."MobilityProgramApplication" from anon, authenticated;
grant all on public."MobilityProgramApplication" to service_role;

-- The allocation function is only callable by the server service role; application code checks
-- the authenticated institution membership before calling it. Budget checks and allocation insert
-- are serialized by locking the programme row.
create or replace function public.mobility_approve_funding_allocation(
  p_program_id uuid,
  p_request_id uuid,
  p_actor_user_id text,
  p_amount numeric,
  p_currency text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_program public."MobilityProgram"%rowtype;
  v_request public."MobilityRequest"%rowtype;
  v_reserved numeric;
  v_allocation public."MobilityFundingAllocation"%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'MOBILITY_FUNDING_AMOUNT_INVALID';
  end if;

  select * into v_program
  from public."MobilityProgram"
  where id = p_program_id
  for update;

  if not found then raise exception 'MOBILITY_PROGRAM_NOT_FOUND'; end if;
  if v_program.status <> 'ACTIVE'
    or v_program."commitmentVerifiedAt" is null
    or coalesce(v_program."commitmentReference",'') = ''
    or coalesce(v_program."commitmentEvidenceUrl",'') not like 'https://%'
    or upper(coalesce(v_program.code,'') || ' ' || coalesce(v_program.name,'')) like '%DEMO%'
  then
    raise exception 'MOBILITY_PROGRAM_NOT_FUNDING_READY';
  end if;

  if not exists (
    select 1 from public."InstitutionMember" im
    where im."institutionId" = v_program."institutionId"
      and im."userId" = p_actor_user_id
      and im.active = true
      and upper(im.role) = 'INSTITUTION_ADMIN'
  ) then
    raise exception 'MOBILITY_INSTITUTION_ADMIN_REQUIRED';
  end if;

  select * into v_request
  from public."MobilityRequest"
  where id = p_request_id
  for update;

  if not found then raise exception 'MOBILITY_REQUEST_NOT_FOUND'; end if;
  if v_request."eligibilityStatus" <> 'ELIGIBLE'
    or coalesce(v_request."eligibilityThresholdPercent",0) <> 50
    or v_request."recruiterGuaranteed" is not true
    or v_request."recruiterGuaranteeId" is null
  then
    raise exception 'MOBILITY_REQUEST_NOT_FUNDING_ELIGIBLE';
  end if;

  if not exists (
    select 1 from public."MobilityProgramApplication" pa
    where pa."programId" = p_program_id
      and pa."mobilityRequestId" = p_request_id
      and pa.status = 'APPROVED'
  ) then
    raise exception 'MOBILITY_PROGRAM_APPLICATION_NOT_APPROVED';
  end if;
  if upper(coalesce(p_currency,'')) <> upper(coalesce(v_program.currency,'XAF'))
     or upper(coalesce(p_currency,'')) <> upper(coalesce(v_request."salaryCurrency",'XAF'))
  then
    raise exception 'MOBILITY_FUNDING_CURRENCY_MISMATCH';
  end if;
  if p_amount > coalesce(v_request."costTotal",0) then
    raise exception 'MOBILITY_FUNDING_EXCEEDS_MOBILITY_COST';
  end if;
  if exists (
    select 1 from public."MobilityFundingAllocation" a
    where a."programId" = p_program_id
      and a."mobilityRequestId" = p_request_id
      and a.status not in ('REJECTED','CANCELLED')
  ) then
    raise exception 'MOBILITY_ALLOCATION_ALREADY_EXISTS';
  end if;

  select coalesce(sum(a."approvedAmount"),0) into v_reserved
  from public."MobilityFundingAllocation" a
  where a."programId" = p_program_id
    and a.status not in ('REJECTED','CANCELLED');

  if v_program."budgetTotal" is null or v_program."budgetTotal" <= 0
     or v_reserved + p_amount > v_program."budgetTotal"
  then
    raise exception 'MOBILITY_PROGRAM_BUDGET_EXCEEDED';
  end if;

  insert into public."MobilityFundingAllocation" (
    "programId","mobilityRequestId","approvedAmount",currency,status,"approvedAt","approvedByUserId"
  ) values (
    p_program_id,p_request_id,p_amount,upper(p_currency),'APPROVED',now(),p_actor_user_id
  ) returning * into v_allocation;

  insert into public."MobilityProcessEvent" (
    "mobilityRequestId","actorUserId","actorRole","eventType","fromStatus","toStatus",
    title,description,metadata,"visibleToTalent","visibleToRecruiter","visibleToInstitution"
  ) values (
    p_request_id,p_actor_user_id,'INSTITUTION_ADMIN','FUNDING_APPROVED',
    v_request.status,v_request.status,'Financement approuvé',
    'Une allocation a été approuvée dans le cadre d’un programme dont le budget engagé a été vérifié.',
    jsonb_build_object('allocationId',v_allocation.id,'programId',p_program_id,'approvedAmount',p_amount,'currency',upper(p_currency)),
    true,true,true
  );

  return to_jsonb(v_allocation);
end;
$function$;

revoke all on function public.mobility_approve_funding_allocation(uuid,uuid,text,numeric,text) from public, anon, authenticated;
grant execute on function public.mobility_approve_funding_allocation(uuid,uuid,text,numeric,text) to service_role;

create or replace function public.mobility_record_funding_disbursement(
  p_allocation_id uuid,
  p_provider_id uuid,
  p_actor_user_id text,
  p_amount numeric,
  p_external_reference text,
  p_evidence_url text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_allocation public."MobilityFundingAllocation"%rowtype;
  v_program public."MobilityProgram"%rowtype;
  v_provider public."MobilityServiceProvider"%rowtype;
  v_transaction public."MobilityFundingTransaction"%rowtype;
  v_disbursed numeric;
begin
  if p_amount is null or p_amount <= 0
    or coalesce(trim(p_external_reference),'') = ''
    or coalesce(p_evidence_url,'') not like 'https://%'
    or coalesce(trim(p_idempotency_key),'') = ''
  then
    raise exception 'MOBILITY_DISBURSEMENT_EVIDENCE_REQUIRED';
  end if;

  select * into v_allocation
  from public."MobilityFundingAllocation"
  where id = p_allocation_id
  for update;
  if not found then raise exception 'MOBILITY_ALLOCATION_NOT_FOUND'; end if;
  if v_allocation.status not in ('APPROVED','PARTIALLY_DISBURSED','DISBURSEMENT_PENDING') then
    raise exception 'MOBILITY_ALLOCATION_NOT_DISBURSABLE';
  end if;

  select * into v_program from public."MobilityProgram"
  where id = v_allocation."programId" for update;
  if not found then raise exception 'MOBILITY_PROGRAM_NOT_FOUND'; end if;

  if not exists (
    select 1 from public."InstitutionMember" im
    where im."institutionId" = v_program."institutionId"
      and im."userId" = p_actor_user_id
      and im.active = true
      and upper(im.role) = 'INSTITUTION_ADMIN'
  ) then
    raise exception 'MOBILITY_INSTITUTION_ADMIN_REQUIRED';
  end if;

  select * into v_provider
  from public."MobilityServiceProvider"
  where id = p_provider_id
    and "providerType" = 'FINANCE'
    and status = 'ACTIVE'
    and "kycStatus" = 'VERIFIED';
  if not found then raise exception 'MOBILITY_VERIFIED_FINANCE_PROVIDER_REQUIRED'; end if;

  if upper(v_allocation.currency) <> 'XAF' then
    raise exception 'MOBILITY_DISBURSEMENT_CURRENCY_NOT_SUPPORTED';
  end if;

  select coalesce(sum(t.amount),0) into v_disbursed
  from public."MobilityFundingTransaction" t
  where t."allocationId" = p_allocation_id
    and t."transactionType" = 'DISBURSEMENT'
    and t.status in ('PENDING_VERIFICATION','EXECUTED');

  if v_disbursed + p_amount > v_allocation."approvedAmount" then
    raise exception 'MOBILITY_DISBURSEMENT_EXCEEDS_ALLOCATION';
  end if;

  insert into public."MobilityFundingTransaction" (
    "allocationId","transactionType",amount,currency,provider,"providerId",
    "externalReference",status,"evidenceUrl","idempotencyKey",metadata
  ) values (
    p_allocation_id,'DISBURSEMENT',p_amount,v_allocation.currency,
    v_provider."displayName",p_provider_id,p_external_reference,
    'PENDING_VERIFICATION',p_evidence_url,p_idempotency_key,
    jsonb_build_object('verificationMode','MANUAL_EXTERNAL_EVIDENCE')
  ) returning * into v_transaction;

  update public."MobilityFundingAllocation"
    set status = 'DISBURSEMENT_PENDING',"updatedAt" = now()
    where id = p_allocation_id;

  insert into public."MobilityProcessEvent" (
    "mobilityRequestId","actorUserId","actorRole","eventType","fromStatus","toStatus",
    title,description,metadata,"visibleToTalent","visibleToRecruiter","visibleToInstitution"
  ) values (
    v_allocation."mobilityRequestId",p_actor_user_id,'INSTITUTION_ADMIN','FUNDING_DISBURSEMENT_SUBMITTED',
    'APPROVED','DISBURSEMENT_PENDING','Preuve de décaissement déposée',
    'Une référence et une preuve de transfert externe ont été soumises pour vérification indépendante.',
    jsonb_build_object('transactionId',v_transaction.id,'providerId',p_provider_id,'amount',p_amount,'currency',v_allocation.currency),
    true,true,true
  );

  return to_jsonb(v_transaction);
end;
$function$;

revoke all on function public.mobility_record_funding_disbursement(uuid,uuid,text,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.mobility_record_funding_disbursement(uuid,uuid,text,numeric,text,text,text) to service_role;

create or replace function public.mobility_verify_funding_disbursement(
  p_transaction_id uuid,
  p_admin_user_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user public."User"%rowtype;
  v_transaction public."MobilityFundingTransaction"%rowtype;
  v_allocation public."MobilityFundingAllocation"%rowtype;
  v_disbursed numeric;
begin
  select * into v_user from public."User" where id = p_admin_user_id;
  if not found or upper(v_user.role::text) <> 'ADMIN' then
    raise exception 'MOBILITY_ADMIN_REQUIRED';
  end if;

  select * into v_transaction
  from public."MobilityFundingTransaction"
  where id = p_transaction_id
  for update;
  if not found then raise exception 'MOBILITY_TRANSACTION_NOT_FOUND'; end if;
  if v_transaction.status <> 'PENDING_VERIFICATION'
    or coalesce(v_transaction."externalReference",'') = ''
    or coalesce(v_transaction."evidenceUrl",'') not like 'https://%'
  then
    raise exception 'MOBILITY_TRANSACTION_NOT_VERIFIABLE';
  end if;

  update public."MobilityFundingTransaction"
    set status = 'EXECUTED',
        "verifiedByUserId" = p_admin_user_id,
        "verifiedAt" = now(),
        "executedAt" = now()
    where id = p_transaction_id
    returning * into v_transaction;

  select * into v_allocation
  from public."MobilityFundingAllocation"
  where id = v_transaction."allocationId"
  for update;

  select coalesce(sum(t.amount),0) into v_disbursed
  from public."MobilityFundingTransaction" t
  where t."allocationId" = v_allocation.id
    and t."transactionType" = 'DISBURSEMENT'
    and t.status = 'EXECUTED';

  update public."MobilityFundingAllocation"
    set status = case
      when v_disbursed >= v_allocation."approvedAmount" then 'DISBURSED'
      else 'PARTIALLY_DISBURSED'
    end,
    "updatedAt" = now()
    where id = v_allocation.id;

  insert into public."MobilityProcessEvent" (
    "mobilityRequestId","actorUserId","actorRole","eventType","fromStatus","toStatus",
    title,description,metadata,"visibleToTalent","visibleToRecruiter","visibleToInstitution"
  ) values (
    v_allocation."mobilityRequestId",p_admin_user_id,'ADMIN','FUNDING_DISBURSEMENT_VERIFIED',
    'DISBURSEMENT_PENDING',
    case when v_disbursed >= v_allocation."approvedAmount" then 'DISBURSED' else 'PARTIALLY_DISBURSED' end,
    'Décaissement vérifié',
    'La preuve de transfert externe a été contrôlée et confirmée par un administrateur Jobly.',
    jsonb_build_object('transactionId',v_transaction.id,'allocationId',v_allocation.id,'verifiedAmount',v_transaction.amount,'totalDisbursed',v_disbursed),
    true,true,true
  );

  return to_jsonb(v_transaction);
end;
$function$;

revoke all on function public.mobility_verify_funding_disbursement(uuid,text) from public, anon, authenticated;
grant execute on function public.mobility_verify_funding_disbursement(uuid,text) to service_role;
