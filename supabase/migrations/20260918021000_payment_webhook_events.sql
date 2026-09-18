-- Keep the payment webhook event ledger server-side and idempotent.
create table if not exists public."PaymentWebhookEvent" (
  id text primary key,
  "provider" text not null,
  "externalEventId" text not null,
  "eventType" text not null,
  "payloadHash" text not null,
  "payload" jsonb not null,
  "receivedAt" timestamptz not null default now(),
  "processedAt" timestamptz,
  "status" text not null default 'RECEIVED',
  "error" text,
  constraint "PaymentWebhookEvent_provider_externalEventId_key" unique ("provider","externalEventId")
);

create index if not exists "PaymentWebhookEvent_provider_receivedAt_idx"
  on public."PaymentWebhookEvent" ("provider","receivedAt");

alter table public."PaymentWebhookEvent" enable row level security;
revoke all on table public."PaymentWebhookEvent" from anon, authenticated;
