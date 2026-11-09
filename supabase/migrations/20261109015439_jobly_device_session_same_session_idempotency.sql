-- Make device registration idempotent by immutable Supabase Auth session ID.
-- The same access-token session can reach the server through requests carrying
-- different device IDs; preserve its canonical device row instead of inserting
-- a duplicate authSessionId and failing the protected API with SQLSTATE 23505.

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
  v_by_session public."UserDeviceSession"%rowtype;
  v_registered_device_id text := p_device_id;
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

  -- Serialize registrations both by user and by Auth session. A single verified
  -- Auth session must never be represented by two device rows, even if two
  -- requests race while sending different client device identifiers.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_auth_session_id::text, 0));

  -- Idempotency is keyed first by the immutable Auth session ID. Keep its
  -- original device identity if a later request supplies a different ID.
  select * into v_by_session
  from public."UserDeviceSession"
  where "authSessionId" = p_auth_session_id
  for update;

  if found then
    if v_by_session."userId" <> v_user_id then
      return jsonb_build_object('registered', false, 'allowed', false, 'reason', 'SESSION_OWNER_MISMATCH');
    end if;

    if v_by_session."revokedAt" is not null then
      return jsonb_build_object('registered', true, 'allowed', false, 'reason', 'DEVICE_REVOKED');
    end if;

    v_registered_device_id := v_by_session."deviceId";
    update public."UserDeviceSession"
      set "lastSeenAt" = case
            when "lastSeenAt" < now() - interval '5 minutes' then now()
            else "lastSeenAt"
          end,
          "deviceLabel" = left(coalesce(nullif(trim(p_device_label), ''), "deviceLabel"), 100),
          "userAgent" = left(coalesce(p_user_agent, "userAgent"), 1000)
    where "id" = v_by_session."id";
  else
    select * into v_existing
    from public."UserDeviceSession"
    where "userId" = v_user_id and "deviceId" = p_device_id
    for update;

    if found then
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
    else
      insert into public."UserDeviceSession"
        ("userId", "authSessionId", "deviceId", "deviceLabel", "userAgent")
      values (v_user_id, p_auth_session_id, p_device_id,
              left(coalesce(nullif(trim(p_device_label), ''), 'Appareil'), 100),
              left(coalesce(p_user_agent, ''), 1000));
    end if;
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
    and "deviceId" = v_registered_device_id
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

-- Keep the registration endpoint private to the server-side service role.
revoke all on function public.register_jobly_device_session(text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.register_jobly_device_session(text, uuid, text, text, text) to service_role;
