-- ADMIN 360: operational Support tickets and Community moderation reports.
create table if not exists public."AdminSupportTicket" (
  "id" uuid primary key default gen_random_uuid(),
  "requesterUserId" text not null references public."User"("id") on delete restrict,
  "subject" text not null,
  "category" text not null default 'GENERAL',
  "priority" text not null default 'NORMAL' check ("priority" in ('LOW','NORMAL','HIGH','URGENT')),
  "status" text not null default 'OPEN' check ("status" in ('OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED')),
  "source" text not null default 'IN_APP',
  "assignedToUserId" text references public."User"("id") on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "lastMessageAt" timestamptz not null default now(),
  "resolvedAt" timestamptz
);

create index if not exists "AdminSupportTicket_status_priority_lastMessage_idx"
  on public."AdminSupportTicket" ("status","priority","lastMessageAt" desc);
create index if not exists "AdminSupportTicket_requester_created_idx"
  on public."AdminSupportTicket" ("requesterUserId","createdAt" desc);

create table if not exists public."AdminSupportTicketMessage" (
  "id" uuid primary key default gen_random_uuid(),
  "ticketId" uuid not null references public."AdminSupportTicket"("id") on delete cascade,
  "authorUserId" text references public."User"("id") on delete set null,
  "authorRole" text not null,
  "body" text not null,
  "isInternal" boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create index if not exists "AdminSupportTicketMessage_ticket_created_idx"
  on public."AdminSupportTicketMessage" ("ticketId","createdAt");

-- Reports raised by signed-in Community members; moderation decisions remain auditable.
create table if not exists public."AdminCommunityReport" (
  "id" uuid primary key default gen_random_uuid(),
  "postId" text not null,
  "communityId" text not null,
  "reporterUserId" text not null references public."User"("id") on delete restrict,
  "reason" text not null,
  "details" text,
  "status" text not null default 'OPEN' check ("status" in ('OPEN','RESOLVED','DISMISSED')),
  "reviewAction" text,
  "reviewedByUserId" text references public."User"("id") on delete set null,
  "reviewedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "AdminCommunityReport_post_reporter_key" unique ("postId","reporterUserId")
);

create index if not exists "AdminCommunityReport_status_created_idx"
  on public."AdminCommunityReport" ("status","createdAt" desc);
create index if not exists "AdminCommunityReport_post_status_idx"
  on public."AdminCommunityReport" ("postId","status");

alter table public."AdminSupportTicket" enable row level security;
alter table public."AdminSupportTicketMessage" enable row level security;
alter table public."AdminCommunityReport" enable row level security;

revoke all on table public."AdminSupportTicket" from public, anon, authenticated;
revoke all on table public."AdminSupportTicketMessage" from public, anon, authenticated;
revoke all on table public."AdminCommunityReport" from public, anon, authenticated;
grant all on table public."AdminSupportTicket" to service_role;
grant all on table public."AdminSupportTicketMessage" to service_role;
grant all on table public."AdminCommunityReport" to service_role;
