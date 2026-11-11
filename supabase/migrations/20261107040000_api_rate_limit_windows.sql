-- Shared, atomic API rate-limit buckets for server-side routes.
create table if not exists public.api_rate_limit_buckets (
  scope text not null check (length(scope) between 1 and 80),
  identity_hash text not null check (identity_hash ~ '^[a-f0-9]{64}$'),
  window_seconds integer not null check (window_seconds between 1 and 604800),
  bucket_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  expires_at timestamptz not null,
  primary key (scope, identity_hash, window_seconds, bucket_start)
);
create index if not exists api_rate_limit_buckets_expiry_idx on public.api_rate_limit_buckets (expires_at);
alter table public.api_rate_limit_buckets enable row level security;
revoke all on table public.api_rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limit_buckets to service_role;

create or replace function public.consume_api_rate_limit(
  p_scope text, p_identity_hash text, p_window_seconds integer, p_max_requests integer
)
returns table (allowed boolean, retry_after_seconds integer, current_count integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_bucket_start timestamptz;
  v_expires_at timestamptz;
  v_request_count integer;
begin
  if p_scope is null or length(p_scope) < 1 or length(p_scope) > 80 then raise exception 'INVALID_RATE_LIMIT_SCOPE'; end if;
  if p_identity_hash is null or p_identity_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_RATE_LIMIT_IDENTITY'; end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 604800 then raise exception 'INVALID_RATE_LIMIT_WINDOW'; end if;
  if p_max_requests is null or p_max_requests < 1 then raise exception 'INVALID_RATE_LIMIT_MAXIMUM'; end if;

  v_bucket_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  v_expires_at := v_bucket_start + make_interval(secs => p_window_seconds);
  insert into public.api_rate_limit_buckets (scope, identity_hash, window_seconds, bucket_start, request_count, expires_at)
  values (p_scope, p_identity_hash, p_window_seconds, v_bucket_start, 1, v_expires_at)
  on conflict (scope, identity_hash, window_seconds, bucket_start)
  do update set request_count = public.api_rate_limit_buckets.request_count + 1
  returning request_count into v_request_count;

  if mod(extract(epoch from clock_timestamp())::bigint, 100) = 0 then
    delete from public.api_rate_limit_buckets where expires_at < clock_timestamp() - interval '1 day';
  end if;

  return query select
    v_request_count <= p_max_requests,
    greatest(1, ceil(extract(epoch from (v_expires_at - clock_timestamp())))::integer),
    v_request_count;
end;
$$;
revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;
