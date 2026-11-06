-- J’IA 360 — Canonical conversations and durable message state.
-- Committed to the feature branch only. Not applied to JOBLY-PROD in this task.

create table if not exists public."JiaConversation" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "ecosystem" text not null default 'TALENT'
    check ("ecosystem" in ('TALENT','RECRUITER','PARTNER','ADMIN')),
  "title" text,
  "lastMessageAt" timestamptz not null default now(),
  "archivedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists "JiaConversation_userId_ecosystem_lastMessageAt_idx"
  on public."JiaConversation" ("userId","ecosystem","archivedAt","lastMessageAt" desc);

create table if not exists public."JiaConversationMessage" (
  "id" text primary key,
  "conversationId" text not null references public."JiaConversation"("id") on delete cascade,
  "role" text not null check ("role" in ('user','assistant')),
  "content" text not null,
  "sources" jsonb not null default '[]'::jsonb,
  "workspace" jsonb,
  "payloadVersion" integer not null default 1,
  "clientMessageId" text,
  "createdAt" timestamptz not null default now(),
  constraint "JiaConversationMessage_conversationId_clientMessageId_key"
    unique ("conversationId","clientMessageId")
);
create index if not exists "JiaConversationMessage_conversationId_createdAt_idx"
  on public."JiaConversationMessage" ("conversationId","createdAt" desc);

alter table public."JiaConversation" enable row level security;
alter table public."JiaConversationMessage" enable row level security;
revoke all on table public."JiaConversation" from public, anon, authenticated;
revoke all on table public."JiaConversationMessage" from public, anon, authenticated;
grant select, insert, update, delete on table public."JiaConversation" to service_role;
grant select, insert, update, delete on table public."JiaConversationMessage" to service_role;
