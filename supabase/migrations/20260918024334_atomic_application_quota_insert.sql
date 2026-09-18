create or replace function public.create_application_with_quota(
  p_user_id uuid,
  p_weekly_limit integer,
  p_application jsonb
)
returns public."Application"
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_used integer;
  v_app public."Application";
begin
  if p_weekly_limit < 0 then
    raise exception 'INVALID_QUOTA_LIMIT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select count(*)::integer
    into v_used
  from public."Application"
  where "userId" = p_user_id
    and status <> 'DISCOVERED'
    and "createdAt" >= now() - interval '7 days';

  if v_used >= p_weekly_limit then
    raise exception using
      errcode = 'P0001',
      message = 'APPLICATION_QUOTA_EXCEEDED';
  end if;

  insert into public."Application"
  select *
  from jsonb_populate_record(null::public."Application", p_application)
  returning * into v_app;

  return v_app;
end;
$$;

revoke all on function public.create_application_with_quota(uuid, integer, jsonb) from public;
grant execute on function public.create_application_with_quota(uuid, integer, jsonb) to service_role;
