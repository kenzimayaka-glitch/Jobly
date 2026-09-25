alter table public."User"
  add column if not exists "showcaseConfig" jsonb not null default '{}'::jsonb,
  add column if not exists "actionImages" jsonb not null default '[]'::jsonb,
  add column if not exists "portfolioBusiness" jsonb not null default '{}'::jsonb,
  add column if not exists "executiveSummary" text,
  add column if not exists "advertisingVideoUrl" text,
  add column if not exists "advertisingVideoStoragePath" text,
  add column if not exists "advertisingVideoDurationMs" integer,
  add column if not exists "advertisingVideoUpdatedAt" timestamp without time zone;
alter table public."Profile" add column if not exists "publicDiscoverable" boolean not null default false;
create index if not exists "User_advertisingVideoUpdatedAt_idx" on public."User" ("advertisingVideoUpdatedAt");
create index if not exists "Profile_publicDiscoverable_idx" on public."Profile" ("publicDiscoverable");
