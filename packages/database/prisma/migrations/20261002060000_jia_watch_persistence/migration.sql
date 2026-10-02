-- JOBLY — Lot B / Veille J’IA — B1
-- Persistance des abonnements, exécutions et états observés.
-- Cette migration appartient à la branche feat/jia-watch-persistence-20261002.
-- Elle n'est PAS exécutée sur JOBLY-PROD par cette étape.

create table if not exists public."JiaWatchSubscription" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "key" text not null,
  "query" text not null,
  "domain" text not null,
  "country" text,
  "frequencyMinutes" integer not null default 1440,
  "active" boolean not null default true,
  "notificationMode" text not null default 'DIGEST',
  "validationMode" text not null default 'ON_DEMAND',
  "lastCheckedAt" timestamptz,
  "nextCheckAt" timestamptz,
  "lastSignalHash" text,
  "lastConfidence" double precision,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "JiaWatchSubscription_userId_key_key" unique ("userId","key")
);

create index if not exists "JiaWatchSubscription_active_nextCheckAt_idx"
  on public."JiaWatchSubscription" ("active","nextCheckAt");

create index if not exists "JiaWatchSubscription_userId_active_idx"
  on public."JiaWatchSubscription" ("userId","active");

create table if not exists public."JiaWatchRun" (
  "id" text primary key,
  "subscriptionId" text not null references public."JiaWatchSubscription"("id") on delete cascade,
  "scheduledFor" timestamptz not null,
  "status" text not null default 'RUNNING',
  "startedAt" timestamptz not null default now(),
  "finishedAt" timestamptz,
  "signalHash" text,
  "changeCount" integer not null default 0,
  "confidence" double precision,
  "error" text,
  "createdAt" timestamptz not null default now(),
  constraint "JiaWatchRun_subscriptionId_scheduledFor_key" unique ("subscriptionId","scheduledFor")
);

create index if not exists "JiaWatchRun_status_scheduledFor_idx"
  on public."JiaWatchRun" ("status","scheduledFor");

create index if not exists "JiaWatchRun_subscriptionId_createdAt_idx"
  on public."JiaWatchRun" ("subscriptionId","createdAt");

create table if not exists public."JiaWatchSnapshot" (
  "id" text primary key,
  "subscriptionId" text not null references public."JiaWatchSubscription"("id") on delete cascade,
  "stateHash" text not null,
  "facts" jsonb not null default '[]'::jsonb,
  "sources" jsonb not null default '[]'::jsonb,
  "context" jsonb not null default '{}'::jsonb,
  "observedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  constraint "JiaWatchSnapshot_subscriptionId_stateHash_key" unique ("subscriptionId","stateHash")
);

create index if not exists "JiaWatchSnapshot_subscriptionId_observedAt_idx"
  on public."JiaWatchSnapshot" ("subscriptionId","observedAt");

alter table public."JiaWatchSubscription" enable row level security;
alter table public."JiaWatchRun" enable row level security;
alter table public."JiaWatchSnapshot" enable row level security;

create policy "JiaWatchSubscription_select_own"
on public."JiaWatchSubscription" for select to authenticated
using (
  exists (
    select 1 from public."User" u
    where u.id = "JiaWatchSubscription"."userId"
      and u."authUserId"::uuid = (select auth.uid())
  )
);

create policy "JiaWatchSubscription_insert_own"
on public."JiaWatchSubscription" for insert to authenticated
with check (
  exists (
    select 1 from public."User" u
    where u.id = "JiaWatchSubscription"."userId"
      and u."authUserId"::uuid = (select auth.uid())
  )
);

create policy "JiaWatchSubscription_update_own"
on public."JiaWatchSubscription" for update to authenticated
using (
  exists (
    select 1 from public."User" u
    where u.id = "JiaWatchSubscription"."userId"
      and u."authUserId"::uuid = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public."User" u
    where u.id = "JiaWatchSubscription"."userId"
      and u."authUserId"::uuid = (select auth.uid())
  )
);

create policy "JiaWatchSubscription_delete_own"
on public."JiaWatchSubscription" for delete to authenticated
using (
  exists (
    select 1 from public."User" u
    where u.id = "JiaWatchSubscription"."userId"
      and u."authUserId"::uuid = (select auth.uid())
  )
);

create policy "JiaWatchRun_select_own"
on public."JiaWatchRun" for select to authenticated
using (
  exists (
    select 1
    from public."JiaWatchSubscription" s
    join public."User" u on u.id = s."userId"
    where s.id = "JiaWatchRun"."subscriptionId"
      and u."authUserId"::uuid = (select auth.uid())
  )
);

create policy "JiaWatchSnapshot_select_own"
on public."JiaWatchSnapshot" for select to authenticated
using (
  exists (
    select 1
    from public."JiaWatchSubscription" s
    join public."User" u on u.id = s."userId"
    where s.id = "JiaWatchSnapshot"."subscriptionId"
      and u."authUserId"::uuid = (select auth.uid())
  )
);
