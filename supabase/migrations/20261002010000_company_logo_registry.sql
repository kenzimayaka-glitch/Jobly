-- Jobly company logo registry + optional self-hosted cache.
-- Self-hosting must only be enabled when the active Logo.dev plan/terms permit it.

create table if not exists public.company_logo_registry (
  domain text primary key,
  company_name text,
  source_logo_url text,
  hosted_logo_url text,
  storage_path text,
  content_type text,
  content_hash text,
  status text not null default 'resolved'
    check (status in ('resolved','hosted','missing','error')),
  fetched_at timestamptz,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_logo_registry_status_idx
  on public.company_logo_registry(status);

alter table public.company_logo_registry enable row level security;

revoke all on public.company_logo_registry from anon, authenticated;
grant all on public.company_logo_registry to service_role;

