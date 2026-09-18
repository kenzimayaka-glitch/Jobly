-- Idempotency records for mutation endpoints such as subscription checkout.
-- The unique constraint is the concurrency boundary: only one result can exist
-- for a given user + endpoint + key.
create table if not exists public."IdempotencyKey" (
  id text primary key,
  "userId" uuid not null,
  endpoint text not null,
  key text not null,
  "payloadHash" text not null,
  "statusCode" integer not null,
  response jsonb not null,
  "createdAt" timestamptz not null default now(),
  constraint "IdempotencyKey_user_endpoint_key_key" unique ("userId", endpoint, key)
);

create index if not exists "IdempotencyKey_userId_createdAt_idx"
  on public."IdempotencyKey" ("userId", "createdAt" desc);

alter table public."IdempotencyKey" enable row level security;

-- Server-side adminClient is the only application path intended to access this
-- table. No public/authenticated policies are created.
