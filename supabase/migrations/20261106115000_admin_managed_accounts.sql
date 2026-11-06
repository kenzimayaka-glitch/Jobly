-- Managed Jobly accounts provisioned by the root ADMIN.
-- Institutional partners keep their own Supabase Auth identity; internal workspaces remain on AdminIdentity.
create table if not exists public."AdminManagedAccount" (
  "id" text primary key default ('managed_' || replace(gen_random_uuid()::text, '-', '')),
  "ownerAdminUserId" text not null references public."User"("id") on delete cascade,
  "userId" text not null unique references public."User"("id") on delete cascade,
  "accountType" text not null check ("accountType" in ('TALENT', 'RECRUITER', 'PARTNER')),
  "organizationType" text,
  "organizationName" text,
  "website" text,
  "city" text,
  "country" text,
  "status" text not null default 'INVITED' check ("status" in ('INVITED', 'ACTIVE', 'SUSPENDED')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "AdminManagedAccount_owner_user_key" unique ("ownerAdminUserId", "userId")
);

create index if not exists "AdminManagedAccount_owner_status_created_idx"
  on public."AdminManagedAccount" ("ownerAdminUserId", "status", "createdAt" desc);

alter table public."AdminManagedAccount" enable row level security;
revoke all on table public."AdminManagedAccount" from public, anon, authenticated;
grant all on table public."AdminManagedAccount" to service_role;
