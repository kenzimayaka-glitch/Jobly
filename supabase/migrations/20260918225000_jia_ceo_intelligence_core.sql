create table if not exists public."CEOAuditLog" (
 id uuid primary key default gen_random_uuid(),
 "adminUserId" uuid not null references public."User"(id) on delete cascade,
 action text not null,
 endpoint text,
 metadata jsonb not null default '{}'::jsonb,
 "createdAt" timestamptz not null default now()
);
alter table public."CEOAuditLog" enable row level security;
revoke all on table public."CEOAuditLog" from anon,authenticated;
grant all on table public."CEOAuditLog" to service_role;
create index if not exists ceo_audit_admin_created_idx on public."CEOAuditLog" ("adminUserId","createdAt" desc);
