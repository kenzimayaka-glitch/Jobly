-- Jobly Security Core: shared rate limiting and Data API isolation for offer tables.
-- Apply after review, before deploying code that calls consume_jobly_rate_limit().

create table if not exists public."JoblyRateLimitBucket" (
  "scope" text not null,
  "keyHash" text not null,
  "windowStart" timestamptz not null,
  "requestCount" integer not null default 0,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  constraint "JoblyRateLimitBucket_pkey" primary key ("scope", "keyHash", "windowStart"),
  constraint "JoblyRateLimitBucket_scope_check" check ("scope" ~ '^[a-zA-Z0-9:_-]{1,100}$'),
  constraint "JoblyRateLimitBucket_hash_check" check ("keyHash" ~ '^[0-9a-f]{64}$'),
  constraint "JoblyRateLimitBucket_count_check" check ("requestCount" >= 0)
);
create index if not exists "JoblyRateLimitBucket_expires_idx" on public."JoblyRateLimitBucket" ("expiresAt");
alter table public."JoblyRateLimitBucket" enable row level security;
revoke all privileges on table public."JoblyRateLimitBucket" from public, anon, authenticated;
grant all privileges on table public."JoblyRateLimitBucket" to service_role;

create or replace function public.consume_jobly_rate_limit(p_scope text, p_key_hash text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_scope is null or p_scope !~ '^[a-zA-Z0-9:_-]{1,100}$'
     or p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit is null or p_limit < 1 or p_limit > 100000
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;
  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  insert into public."JoblyRateLimitBucket" as existing_bucket
    ("scope", "keyHash", "windowStart", "requestCount", "expiresAt")
  values (p_scope, p_key_hash, v_window_start, 1, v_window_start + make_interval(secs => p_window_seconds * 2))
  on conflict ("scope", "keyHash", "windowStart")
  do update set "requestCount" = existing_bucket."requestCount" + 1, "expiresAt" = excluded."expiresAt"
  returning existing_bucket."requestCount" into v_request_count;

  allowed := v_request_count <= p_limit;
  remaining := greatest(0, p_limit - v_request_count);
  retry_after_seconds := greatest(1, ceil(extract(epoch from (
    v_window_start + make_interval(secs => p_window_seconds) - v_now
  )))::integer);
  return next;

  if mod(v_request_count, 100) = 0 then
    delete from public."JoblyRateLimitBucket"
    where ctid in (select ctid from public."JoblyRateLimitBucket" where "expiresAt" < v_now limit 250);
  end if;
end;
$function$;

revoke all on function public.consume_jobly_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_jobly_rate_limit(text, text, integer, integer) to service_role;

alter table public."Job" enable row level security;
alter table public."RecruiterJob" enable row level security;
alter table public."Company" enable row level security;
alter table public."JobHarvestCapture" enable row level security;
alter table public."JobOfferPipeline" enable row level security;
alter table public."JobSource" enable row level security;

revoke all privileges on table public."Job" from public, anon, authenticated;
revoke all privileges on table public."RecruiterJob" from public, anon, authenticated;
revoke all privileges on table public."Company" from public, anon, authenticated;
revoke all privileges on table public."JobHarvestCapture" from public, anon, authenticated;
revoke all privileges on table public."JobOfferPipeline" from public, anon, authenticated;
revoke all privileges on table public."JobSource" from public, anon, authenticated;
grant all privileges on table public."Job" to service_role;
grant all privileges on table public."RecruiterJob" to service_role;
grant all privileges on table public."Company" to service_role;
grant all privileges on table public."JobHarvestCapture" to service_role;
grant all privileges on table public."JobOfferPipeline" to service_role;
grant all privileges on table public."JobSource" to service_role;

drop policy if exists "Job_active_select" on public."Job";
drop policy if exists "Company_public_select" on public."Company";
drop policy if exists "p2_recruiter_job_select" on public."RecruiterJob";
drop policy if exists "jobly_security_core_deny_client_select" on public."Job";
create policy "jobly_security_core_deny_client_select" on public."Job" for select to anon, authenticated using (false);
drop policy if exists "jobly_security_core_deny_client_select" on public."RecruiterJob";
create policy "jobly_security_core_deny_client_select" on public."RecruiterJob" for select to anon, authenticated using (false);
drop policy if exists "jobly_security_core_deny_client_select" on public."Company";
create policy "jobly_security_core_deny_client_select" on public."Company" for select to anon, authenticated using (false);
