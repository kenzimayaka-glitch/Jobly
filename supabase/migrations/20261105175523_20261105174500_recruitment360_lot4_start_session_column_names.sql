-- Fix PostgreSQL column identifiers in the Recruitment360 candidate test starter.
-- The table migration created these names unquoted, so PostgreSQL folded
-- durationSeconds/maxAttempts to durationseconds/maxattempts.
CREATE OR REPLACE FUNCTION public.recruitment360_lot4_start_session(
  p_test_id uuid,
  p_application_id uuid,
  p_actor_user_id text
)
RETURNS public."RecruitmentTestSession"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  d public."RecruitmentTestDefinition";
  a public."Application";
  s public."RecruitmentTestSession";
  attempt_no integer;
begin
  select * into d from public."RecruitmentTestDefinition"
  where id=p_test_id and status='PUBLISHED';
  if not found then raise exception 'TEST_NOT_FOUND'; end if;

  select * into a from public."Application" where id=p_application_id;
  if not found or a."recruiterJobId" is null then raise exception 'APPLICATION_NOT_FOUND'; end if;

  if not exists (
    select 1 from public."Recruitment360" r
    where r."recruiterJobId"=a."recruiterJobId"
      and exists (
        select 1 from public."RecruitmentRole" rr
        where rr."recruitmentId"=r.id
          and rr."userId"=p_actor_user_id
          and rr.role in ('OWNER','HR','MANAGER','DELEGATE')
      )
  ) and a."userId"::text<>p_actor_user_id then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce(max(attempt),0)+1 into attempt_no
  from public."RecruitmentTestSession"
  where "testId"=p_test_id and "applicationId"=p_application_id;

  if attempt_no>d.maxattempts then raise exception 'MAX_ATTEMPTS_REACHED'; end if;

  insert into public."RecruitmentTestSession"(
    "testId","applicationId",attempt,status,"startedAt","expiresAt","lastHeartbeatAt"
  ) values (
    p_test_id,p_application_id,attempt_no,'RUNNING',now(),
    now()+make_interval(secs=>d.durationseconds),now()
  ) returning * into s;

  insert into public."RecruitmentTestEvent"("sessionId",event,metadata)
  values(s.id,'START',jsonb_build_object('serverStartedAt',s."startedAt",'serverExpiresAt',s."expiresAt"));

  return s;
end;
$function$;
