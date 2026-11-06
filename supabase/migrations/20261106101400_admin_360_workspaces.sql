-- JOBLY Admin 360: a single root identity owns all internal functional workspaces.
-- No separate Auth identities are created for SUPPORT, FINANCE, MODERATOR or ANALYST.
create table if not exists public."AdminIdentity" (
  "id" text primary key default ('admin_' || replace(gen_random_uuid()::text, '-', '')),
  "ownerUserId" text not null references public."User"("id") on delete cascade,
  "authUserId" uuid not null unique references auth.users(id) on delete cascade,
  "active" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "AdminIdentity_ownerUserId_key" unique ("ownerUserId")
);

create table if not exists public."AdminWorkspace" (
  "id" text primary key default ('workspace_' || replace(gen_random_uuid()::text, '-', '')),
  "ownerUserId" text not null references public."User"("id") on delete cascade,
  "code" text not null check ("code" in ('SUPPORT', 'FINANCE', 'MODERATOR', 'ANALYST')),
  "label" text not null,
  "enabled" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "AdminWorkspace_ownerUserId_code_key" unique ("ownerUserId", "code")
);

create index if not exists "AdminWorkspace_owner_enabled_idx"
  on public."AdminWorkspace" ("ownerUserId", "enabled");

alter table public."AdminIdentity" enable row level security;
alter table public."AdminWorkspace" enable row level security;

revoke all on table public."AdminIdentity" from public, anon, authenticated;
revoke all on table public."AdminWorkspace" from public, anon, authenticated;
grant all on table public."AdminIdentity" to service_role;
grant all on table public."AdminWorkspace" to service_role;
