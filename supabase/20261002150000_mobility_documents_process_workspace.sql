create table if not exists public."MobilityDocument" (
 id uuid primary key default gen_random_uuid(),
 "mobilityRequestId" uuid not null references public."MobilityRequest"(id) on delete cascade,
 "documentType" text not null,
 "side" text,
 "fileName" text not null,
 "storagePath" text not null,
 "mimeType" text,
 "fileSize" bigint,
 "validUntil" date,
 "status" text not null default 'PENDING',
 "uploadedByUserId" text not null,
 "verifiedByUserId" text,
 "verifiedAt" timestamptz,
 "rejectionReason" text,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now(),
 constraint mobility_document_type_chk check ("documentType" in ('CNI','PASSPORT','LOCATION_PLAN','HONOR_COMMITMENT')),
 constraint mobility_document_side_chk check ("side" is null or "side" in ('FRONT','BACK')),
 constraint mobility_document_status_chk check ("status" in ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED','EXPIRED'))
);
create index if not exists "MobilityDocument_request_idx" on public."MobilityDocument"("mobilityRequestId","documentType","status");

create table if not exists public."MobilityProcessEvent" (
 id uuid primary key default gen_random_uuid(),
 "mobilityRequestId" uuid not null references public."MobilityRequest"(id) on delete cascade,
 "actorUserId" text,
 "actorRole" text,
 "eventType" text not null,
 "fromStatus" text,
 "toStatus" text,
 title text not null,
 description text,
 metadata jsonb not null default '{}'::jsonb,
 "visibleToTalent" boolean not null default true,
 "visibleToRecruiter" boolean not null default false,
 "visibleToInstitution" boolean not null default true,
 "createdAt" timestamptz not null default now()
);
create index if not exists "MobilityProcessEvent_request_idx" on public."MobilityProcessEvent"("mobilityRequestId","createdAt");

alter table public."MobilityDocument" enable row level security;
alter table public."MobilityProcessEvent" enable row level security;