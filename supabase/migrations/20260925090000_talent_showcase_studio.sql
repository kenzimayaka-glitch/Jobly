-- Talent Showcase Studio: configuration + generated recruiter advertising asset
alter table public."User"
  add column if not exists "showcaseConfig" jsonb not null default '{}'::jsonb,
  add column if not exists "actionImages" jsonb not null default '[]'::jsonb,
  add column if not exists "portfolioBusiness" jsonb not null default '{}'::jsonb,
  add column if not exists "executiveSummary" text,
  add column if not exists "advertisingVideoUrl" text,
  add column if not exists "advertisingVideoStoragePath" text,
  add column if not exists "advertisingVideoDurationMs" integer,
  add column if not exists "advertisingVideoUpdatedAt" timestamp without time zone;

create index if not exists "User_advertisingVideoUpdatedAt_idx"
  on public."User" ("advertisingVideoUpdatedAt");
