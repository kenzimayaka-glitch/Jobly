-- Two-stage Africa harvest: persist discovered offers before normalization/publication.
create table if not exists public."JobHarvestCapture" (
  "id" uuid primary key default gen_random_uuid(),
  "sourceKey" text not null,
  "externalId" text,
  "sourceUrl" text not null,
  "title" text,
  "company" text,
  "location" text,
  "contractType" text,
  "remoteMode" text,
  "description" text,
  "deadline" timestamptz,
  "publishedAt" timestamptz,
  "applicationProfile" jsonb not null default '{}'::jsonb,
  "contentHash" text,
  "rawHtml" text,
  "renderedHtml" text,
  "extractedText" text,
  "captureMode" text not null default 'unknown',
  "payload" jsonb not null default '{}'::jsonb,
  "status" text not null default 'PENDING',
  "attempts" integer not null default 0,
  "lastError" text,
  "jobId" text,
  "discoveredAt" timestamptz not null default now(),
  "processedAt" timestamptz,
  "updatedAt" timestamptz not null default now(),
  constraint "JobHarvestCapture_status_check"
    check ("status" in ('PENDING','PROCESSING','PROCESSED','QUARANTINED','EXPIRED','FAILED'))
);

create unique index if not exists "JobHarvestCapture_source_url_key"
  on public."JobHarvestCapture" ("sourceKey", "sourceUrl");

create index if not exists "JobHarvestCapture_status_discovered_idx"
  on public."JobHarvestCapture" ("status", "discoveredAt");

create index if not exists "JobHarvestCapture_source_published_idx"
  on public."JobHarvestCapture" ("sourceKey", "publishedAt");

alter table public."JobHarvestCapture" enable row level security;
