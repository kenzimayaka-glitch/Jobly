-- Applied to JOBLY-PROD as 20261106074143 / jobly_offline_first_device_sessions.
-- Device metadata and offline mutation receipts are service-role-only.
-- No client privileges are granted: RLS with no public policies is intentional.

create table if not exists public."UserDeviceSession" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"("id") on delete cascade,
  "authSessionId" uuid not null unique,
  "deviceId" text not null,
  "deviceLabel" text not null default 'Appareil',
  "userAgent" text,
  "createdAt" timestamptz not null default now(),
  "lastSeenAt" timestamptz not null default now(),
  "revokedAt" timestamptz,
  constraint "UserDeviceSession_device_id_length" check (length("deviceId") between 1 and 160),
  constraint "UserDeviceSession_label_length" check (length("deviceLabel") between 1 and 100),
  constraint "UserDeviceSession_user_device_key" unique ("userId", "deviceId")
);

create index if not exists "UserDeviceSession_user_active_idx"
  on public."UserDeviceSession" ("userId", "revokedAt", "createdAt" desc);

create table if not exists public."OfflineSyncReceipt" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"("id") on delete cascade,
  "operationId" text not null,
  "status" text not null default 'PROCESSING',
  "appliedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  constraint "OfflineSyncReceipt_status_check" check ("status" in ('PROCESSING', 'APPLIED', 'ERROR')),
  constraint "OfflineSyncReceipt_user_operation_key" unique ("userId", "operationId")
);

create index if not exists "OfflineSyncReceipt_user_created_idx"
  on public."OfflineSyncReceipt" ("userId", "createdAt" desc);

alter table public."UserDeviceSession" enable row level security;
alter table public."OfflineSyncReceipt" enable row level security;

revoke all on table public."UserDeviceSession" from public, anon, authenticated;
revoke all on table public."OfflineSyncReceipt" from public, anon, authenticated;
grant all on table public."UserDeviceSession" to service_role;
grant all on table public."OfflineSyncReceipt" to service_role;

create or replace function public.register_jobly_device_session(
  p_auth_user_id text,
  p_auth_session_id uuid,
  p_device_id text,
  p_device_label text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id text;
  v_existing public."UserDeviceSession"%rowtype;
  v_revoked text[];
  v_current_revoked timestamptz;
begin
  if p_auth_user_id is null or p_auth_session_id is null
     or p_device_id is null or length(p_device_id) < 1 or length(p_device_id) > 160 then
    return jsonb_build_object('registered', false, 'allowed', false, 'reason', 'INVALID_DEVICE');
  end if;

  select "id" into v_user_id
  from public."User"
  where "authUserId" = p_auth_user_id
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('registered', false, 'allowed', true, 'reason', 'USER_NOT_PROVISIONED');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id, 0));

  select * into v_existing
  from public."UserDeviceSession"
  where "userId" = v_user_id and "deviceId" = p_device_id
  for update;

  if found then
    if v_existing."authSessionId" = p_auth_session_id then
      if v_existing."revokedAt" is not null then
        return jsonb_build_object('registered', true, 'allowed', false, 'reason', 'DEVICE_REVOKED');
      end if;
      update public."UserDeviceSession"
        set "lastSeenAt" = now(),
            "deviceLabel" = left(coalesce(nullif(trim(p_device_label), ''), "deviceLabel"), 100),
            "userAgent" = left(coalesce(p_user_agent, "userAgent"), 1000)
      where "id" = v_existing."id";
    else
      if exists (select 1 from auth.sessions where id = v_existing."authSessionId") then
        return jsonb_build_object('registered', true, 'allowed', false, 'reason', 'DEVICE_SESSION_REPLACED');
      end if;

      update public."UserDeviceSession"
        set "authSessionId" = p_auth_session_id,
            "deviceLabel" = left(coalesce(nullif(trim(p_device_label), ''), 'Appareil'), 100),
            "userAgent" = left(coalesce(p_user_agent, ''), 1000),
            "createdAt" = now(),
            "lastSeenAt" = now(),
            "revokedAt" = null
      where "id" = v_existing."id";
    end if;
  else
    insert into public."UserDeviceSession"
      ("userId", "authSessionId", "deviceId", "deviceLabel", "userAgent")
    values
      (v_user_id, p_auth_session_id, p_device_id,
       left(coalesce(nullif(trim(p_device_label), ''), 'Appareil'), 100),
       left(coalesce(p_user_agent, ''), 1000));
  end if;

  with ranked as (
    select "id",
           row_number() over (order by "createdAt" desc, "lastSeenAt" desc, "id" desc) as position
    from public."UserDeviceSession"
    where "userId" = v_user_id and "revokedAt" is null
  )
  update public."UserDeviceSession" as sessions
    set "revokedAt" = now()
  from ranked
  where sessions."id" = ranked."id" and ranked.position > 3;

  select "revokedAt" into v_current_revoked
  from public."UserDeviceSession"
  where "userId" = v_user_id
    and "deviceId" = p_device_id
    and "authSessionId" = p_auth_session_id;

  select coalesce(array_agg("deviceId"), array[]::text[]) into v_revoked
  from public."UserDeviceSession"
  where "userId" = v_user_id
    and "revokedAt" is not null
    and "revokedAt" > now() - interval '2 minutes';

  return jsonb_build_object(
    'registered', true,
    'allowed', v_current_revoked is null,
    'activeDeviceLimit', 3,
    'revokedDeviceIds', v_revoked
  );
end;
$$;

create or replace function public.revoke_jobly_device_session(
  p_auth_user_id text,
  p_current_session_id uuid,
  p_target_device_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id text;
  v_updated integer;
begin
  select "id" into v_user_id
  from public."User"
  where "authUserId" = p_auth_user_id
  limit 1;

  if v_user_id is null or p_current_session_id is null or p_target_device_id is null then
    return false;
  end if;

  update public."UserDeviceSession"
  set "revokedAt" = coalesce("revokedAt", now())
  where "userId" = v_user_id
    and "deviceId" = p_target_device_id
    and "authSessionId" <> p_current_session_id
    and "revokedAt" is null;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.register_jobly_device_session(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.revoke_jobly_device_session(text, uuid, text) from public, anon, authenticated;
grant execute on function public.register_jobly_device_session(text, uuid, text, text, text) to service_role;
grant execute on function public.revoke_jobly_device_session(text, uuid, text) to service_role;
