-- JOBLY INTELLIGENCE 360
-- Historical aggregates are derived only from source timestamps that actually exist.
-- No synthetic status history or guessed records are created.

create table if not exists public."JoblyAnalyticsDailySnapshot" (
  id uuid primary key default gen_random_uuid(),
  "metricKey" text not null,
  "snapshotDate" date not null,
  "dimensionKey" text not null default 'ALL',
  value numeric,
  status text not null default 'observed' check (status in ('observed','unavailable','estimated')),
  source text not null default 'created_at_backfill',
  confidence numeric,
  metadata jsonb not null default '{}'::jsonb,
  "capturedAt" timestamptz not null default now(),
  unique ("metricKey", "snapshotDate", "dimensionKey", source)
);
create index if not exists jobly_analytics_daily_metric_date_idx
  on public."JoblyAnalyticsDailySnapshot" ("metricKey", "snapshotDate" desc);
create index if not exists jobly_analytics_daily_dimension_idx
  on public."JoblyAnalyticsDailySnapshot" ("dimensionKey", "snapshotDate" desc);

create table if not exists public."JoblyAnalyticsEvent" (
  id uuid primary key default gen_random_uuid(),
  "eventKey" text not null,
  module text not null,
  "eventAt" timestamptz not null default now(),
  "countryCode" text,
  "entityType" text,
  "entityId" text,
  value numeric,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);
create index if not exists jobly_analytics_event_module_date_idx
  on public."JoblyAnalyticsEvent" (module, "eventAt" desc);
create index if not exists jobly_analytics_event_key_date_idx
  on public."JoblyAnalyticsEvent" ("eventKey", "eventAt" desc);

create table if not exists public."JoblyAnalyticsGoal" (
  id uuid primary key default gen_random_uuid(),
  "metricKey" text not null,
  module text not null,
  title text not null,
  "targetValue" numeric not null check ("targetValue" >= 0),
  unit text not null default 'count',
  "dimensionKey" text not null default 'ALL',
  "startsOn" date not null,
  "endsOn" date not null,
  "ownerUserId" text,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  check ("endsOn" >= "startsOn")
);
create index if not exists jobly_analytics_goal_active_idx
  on public."JoblyAnalyticsGoal" (active, "startsOn", "endsOn");

create table if not exists public."JoblyAnalyticsReport" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  "reportType" text not null default 'executive',
  "fileFormat" text not null check ("fileFormat" in ('pdf','xlsx','csv')),
  parameters jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  "createdByUserId" text not null,
  "shareTokenHash" text,
  "shareExpiresAt" timestamptz,
  "sharedAt" timestamptz,
  "sharedByUserId" text,
  "createdAt" timestamptz not null default now()
);
create index if not exists jobly_analytics_report_owner_date_idx
  on public."JoblyAnalyticsReport" ("createdByUserId", "createdAt" desc);
create unique index if not exists jobly_analytics_report_share_hash_idx
  on public."JoblyAnalyticsReport" ("shareTokenHash") where "shareTokenHash" is not null;

create table if not exists public."JoblyAnalyticsDecision" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  module text not null,
  "hypothesis" text,
  recommendation text not null,
  status text not null default 'backlog' check (status in ('backlog','planned','in_progress','done','dismissed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  "ownerUserId" text,
  "dueAt" timestamptz,
  outcome text,
  "createdByUserId" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists jobly_analytics_decision_board_idx
  on public."JoblyAnalyticsDecision" (status, priority, "dueAt");

create table if not exists public."JoblyAnalyticsAlert" (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  "metricKey" text,
  module text not null,
  severity text not null check (severity in ('info','warning','critical')),
  title text not null,
  detail text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  "firstSeenAt" timestamptz not null default now(),
  "lastSeenAt" timestamptz not null default now(),
  "resolvedAt" timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists jobly_analytics_alert_queue_idx
  on public."JoblyAnalyticsAlert" (status, severity, "lastSeenAt" desc);

-- Backfill the last 365 days from genuine timestamps in source tables.
-- The country dimension is emitted only when the source has a country column.
create or replace function public.jobly_analytics_refresh_created_history(
  p_from date default null,
  p_to date default null
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_from date := coalesce(p_from, (now() at time zone 'Africa/Douala')::date - 364);
  v_to date := coalesce(p_to, (now() at time zone 'Africa/Douala')::date);
  r record;
  v_time_col text;
  v_has_country boolean;
  v_rows integer := 0;
  v_row_count integer := 0;
  v_payment_rows integer := 0;
begin
  if v_to < v_from or (v_to - v_from) > 730 then
    raise exception 'Invalid analytics date range';
  end if;

  for r in
    select * from (values
      ('User','users','createdAt'),
      ('Job','jobs','createdAt'),
      ('RecruiterJob','recruiter_jobs','createdAt'),
      ('Application','applications','createdAt'),
      ('Company','companies','createdAt'),
      ('Partner','partners','createdAt'),
      ('Event','events','createdAt'),
      ('Subscription','subscriptions','createdAt'),
      ('Payment','payments','createdAt'),
      ('Community','communities','createdAt'),
      ('CommunityPost','community_posts','createdAt'),
      ('CommunityMembership','community_members','createdAt'),
      ('MobilityRequest','mobility_requests','createdAt'),
      ('JobSource','job_sources','createdAt'),
      ('JobHarvestCapture','harvest_captures','discoveredAt'),
      ('AuditLog','audit_events','createdAt')
    ) as sources(table_name, metric_key, time_column)
  loop
    if to_regclass(format('public.%I', r.table_name)) is null then
      continue;
    end if;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.table_name and column_name = r.time_column
    ) into v_has_country;
    if not v_has_country then
      continue;
    end if;

    execute format(
      'insert into public."JoblyAnalyticsDailySnapshot"
        ("metricKey","snapshotDate","dimensionKey",value,status,source,"capturedAt")
       select %L, calendar.day::date,
         ''ALL'', coalesce(daily.total, 0)::numeric, ''observed'', ''created_at_backfill'', now()
       from generate_series($1::date, $2::date, interval ''1 day'') as calendar(day)
       left join (
         select date_trunc(''day'', (%I::timestamptz at time zone ''Africa/Douala''))::date as snapshot_day,
           count(*)::numeric as total
         from public.%I
         where %I is not null
           and %I >= (($1::timestamp at time zone ''Africa/Douala''))
           and %I < ((($2 + 1)::timestamp at time zone ''Africa/Douala''))
         group by 1
       ) daily on daily.snapshot_day = calendar.day::date
       on conflict ("metricKey","snapshotDate","dimensionKey",source)
       do update set value = excluded.value, status = excluded.status, "capturedAt" = now()',
      r.metric_key, r.time_column, r.table_name, r.time_column, r.time_column, r.time_column
    ) using v_from, v_to;
    get diagnostics v_row_count = row_count;
    v_rows := v_rows + v_row_count;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.table_name and column_name = 'country'
    ) into v_has_country;
    if v_has_country then
      execute format(
        'insert into public."JoblyAnalyticsDailySnapshot"
          ("metricKey","snapshotDate","dimensionKey",value,status,source,"capturedAt")
         select %L,
           date_trunc(''day'', (%I::timestamptz at time zone ''Africa/Douala''))::date,
           coalesce(nullif(upper(trim(country::text)), ''''), ''UNKNOWN''),
           count(*)::numeric, ''observed'', ''created_at_backfill_country'', now()
         from public.%I
         where %I is not null
           and %I >= (($1::timestamp at time zone ''Africa/Douala''))
           and %I < ((($2 + 1)::timestamp at time zone ''Africa/Douala''))
         group by 2, 3
         on conflict ("metricKey","snapshotDate","dimensionKey",source)
         do update set value = excluded.value, status = excluded.status, "capturedAt" = now()',
        r.metric_key, r.time_column, r.table_name, r.time_column, r.time_column, r.time_column
      ) using v_from, v_to;
      get diagnostics v_row_count = row_count;
      v_rows := v_rows + v_row_count;
    end if;
  end loop;

  -- Revenue is recorded only when paidAt, XAF currency, amount, and an
  -- explicitly successful terminal status exist. Available days with no
  -- successful payments are persisted as observed zeroes.
  if to_regclass('public."Payment"') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='Payment' and column_name='paidAt')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='Payment' and column_name='amount')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='Payment' and column_name='currency')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='Payment' and column_name='status') then
    execute $revenue$
      insert into public."JoblyAnalyticsDailySnapshot"
        ("metricKey","snapshotDate","dimensionKey",value,status,source,"capturedAt")
      select 'revenue_confirmed_xaf', calendar.day::date,
        'ALL', coalesce(daily.total, 0)::numeric, 'observed', 'confirmed_paid_xaf', now()
      from generate_series($1::date, $2::date, interval '1 day') as calendar(day)
      left join (
        select date_trunc('day', ("paidAt"::timestamptz at time zone 'Africa/Douala'))::date as snapshot_day,
          sum(amount)::numeric as total
        from public."Payment"
        where "paidAt" is not null
          and upper(trim(coalesce(currency, ''))) = 'XAF'
          and upper(coalesce(status, '')) in ('SUCCESS','SUCCEEDED','PAID','COMPLETED')
          and "paidAt" >= ($1::timestamp at time zone 'Africa/Douala')
          and "paidAt" < (($2 + 1)::timestamp at time zone 'Africa/Douala')
        group by 1
      ) daily on daily.snapshot_day = calendar.day::date
      on conflict ("metricKey","snapshotDate","dimensionKey",source)
      do update set value = excluded.value, status = excluded.status, "capturedAt" = now()
    $revenue$ using v_from, v_to;
    get diagnostics v_payment_rows = row_count;
    v_rows := v_rows + v_payment_rows;
  end if;

  return jsonb_build_object(
    'from', v_from, 'to', v_to, 'upsertedRows', v_rows,
    'basis', 'source-created-at-and-paid-at', 'timezone', 'Africa/Douala'
  );
end;
$$;

alter table public."JoblyAnalyticsDailySnapshot" enable row level security;
alter table public."JoblyAnalyticsEvent" enable row level security;
alter table public."JoblyAnalyticsGoal" enable row level security;
alter table public."JoblyAnalyticsReport" enable row level security;
alter table public."JoblyAnalyticsDecision" enable row level security;
alter table public."JoblyAnalyticsAlert" enable row level security;

revoke all on table public."JoblyAnalyticsDailySnapshot" from anon, authenticated, public;
revoke all on table public."JoblyAnalyticsEvent" from anon, authenticated, public;
revoke all on table public."JoblyAnalyticsGoal" from anon, authenticated, public;
revoke all on table public."JoblyAnalyticsReport" from anon, authenticated, public;
revoke all on table public."JoblyAnalyticsDecision" from anon, authenticated, public;
revoke all on table public."JoblyAnalyticsAlert" from anon, authenticated, public;
grant all on table public."JoblyAnalyticsDailySnapshot" to service_role;
grant all on table public."JoblyAnalyticsEvent" to service_role;
grant all on table public."JoblyAnalyticsGoal" to service_role;
grant all on table public."JoblyAnalyticsReport" to service_role;
grant all on table public."JoblyAnalyticsDecision" to service_role;
grant all on table public."JoblyAnalyticsAlert" to service_role;

revoke all on function public.jobly_analytics_refresh_created_history(date,date) from public, anon, authenticated;
grant execute on function public.jobly_analytics_refresh_created_history(date,date) to service_role;
