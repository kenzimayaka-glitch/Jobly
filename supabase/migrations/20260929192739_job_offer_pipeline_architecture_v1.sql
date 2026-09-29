-- Jobly offer pipeline architecture v1
-- Internal, server-only capture and canonicalization ledger for source-backed offers.
-- RLS is enabled intentionally with no public policies; application access uses the
-- server-side Supabase admin client.

create table if not exists public."JobOfferPipeline" (
  id uuid primary key default gen_random_uuid(),
  "jobId" uuid not null unique references public."Job"(id) on delete cascade,
  "sourceKey" text,
  "sourceUrl" text,
  "captureMode" text not null default 'unknown'
    check ("captureMode" in ('browser','http','api','rss','unknown')),
  "rawPayload" jsonb not null default '{}'::jsonb,
  "renderedHtml" text,
  "extractedText" text,
  "canonicalContent" jsonb not null default '{}'::jsonb,
  "qualityScore" integer,
  "confidence" jsonb not null default '{}'::jsonb,
  "status" text not null default 'PENDING'
    check ("status" in ('PENDING','READY','QUARANTINED','FAILED')),
  "sourceVersion" text not null default 'source-v1',
  "renderVersion" text not null default 'render-v1',
  "extractionVersion" text not null default 'extract-v1',
  "structureVersion" text not null default 'structure-v1',
  "validationVersion" text not null default 'validation-v1',
  "canonicalVersion" text not null default 'jobly-offer-v3',
  "lastError" text,
  "processedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "JobOfferPipeline_status_idx"
  on public."JobOfferPipeline" ("status");

create index if not exists "JobOfferPipeline_sourceKey_idx"
  on public."JobOfferPipeline" ("sourceKey");

create index if not exists "JobOfferPipeline_processedAt_idx"
  on public."JobOfferPipeline" ("processedAt");

alter table public."JobOfferPipeline" enable row level security;
