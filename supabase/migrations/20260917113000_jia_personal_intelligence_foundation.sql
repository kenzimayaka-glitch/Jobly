create table if not exists public."JiaEvent" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"(id) on delete cascade,
  "eventType" text not null,
  "sessionId" text,
  path text,
  "durationMs" integer,
  metadata jsonb not null default '{}'::jsonb,
  "occurredAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);
create index if not exists jia_event_user_time_idx on public."JiaEvent" ("userId", "occurredAt" desc);
create index if not exists jia_event_type_idx on public."JiaEvent" ("eventType", "occurredAt" desc);
create table if not exists public."JiaMemory" (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"(id) on delete cascade,
  category text not null,
  key text not null,
  value jsonb not null,
  confidence numeric(5,4) not null default 0.5,
  source text not null default 'behavioral',
  "lastObservedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("userId", category, key)
);
create index if not exists jia_memory_user_idx on public."JiaMemory" ("userId", category);
alter table public."JiaEvent" enable row level security;
alter table public."JiaMemory" enable row level security;
