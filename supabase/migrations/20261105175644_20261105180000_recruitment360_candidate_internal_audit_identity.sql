-- Resolve auth UIDs to internal User.id values before writing FK-backed audit and review rows.
CREATE OR REPLACE FUNCTION public.recruitment360_lot4_submit_session(
  p_session_id uuid,
  p_actor_user_id text
)
RETURNS public."RecruitmentTestSession"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  s public."RecruitmentTestSession";
  a public."Application";
  q record;
  ans jsonb;
  earned numeric:=0;
  total numeric:=0;
  submitted public."RecruitmentTestSession";
  v_actor_internal_user_id text;
begin
  select * into s from public."RecruitmentTestSession" where id=p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;

  select * into a from public."Application" where id=s."applicationId";
  if not found or a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;

  select u.id into v_actor_internal_user_id
  from public."User" u
  where u."authUserId"=p_actor_user_id or u.id=p_actor_user_id
  order by case when u.id=p_actor_user_id then 0 else 1 end
  limit 1;

  if s.status<>'RUNNING' then return s; end if;

  for q in select * from public."RecruitmentTestQuestion" where "testId"=s."testId" loop
    total:=total+q.points;
    select answer into ans
    from public."RecruitmentTestAnswer"
    where "sessionId"=s.id and "questionId"=q.id;
    if q.type in('SINGLE_CHOICE','NUMBER') and ans is not null and ans->>'value'=q.options->>'correct' then
      earned:=earned+q.points;
    end if;
  end loop;

  update public."RecruitmentTestSession"
  set status=case when "expiresAt"<=now() then 'EXPIRED' else 'SUBMITTED' end,
      "submittedAt"=now(),
      score=case when total>0 then round(earned/total*100,2) else null end,
      "lastHeartbeatAt"=now()
  where id=s.id returning * into submitted;

  insert into public."RecruitmentTestEvent"("sessionId",event,metadata)
  values(s.id,case when submitted.status='EXPIRED' then 'AUTO_EXPIRE' else 'SUBMIT' end,
    jsonb_build_object('score',submitted.score));

  if submitted.status='SUBMITTED' then
    update public."RecruitmentApplicationState"
    set "currentState"='TEST',"stepNumber"=4,"lastTransitionAt"=now(),"updatedAt"=now()
    where "applicationId"=a.id;

    update public."Application" set "recruitment360Status"='TEST',"updatedAt"=now() where id=a.id;

    insert into public."RecruitmentAuditLog"("applicationId","actorUserId",action,"toState")
    values(a.id,v_actor_internal_user_id,'TEST_SUBMITTED','TEST');
  end if;

  return submitted;
end;
$function$;

CREATE OR REPLACE FUNCTION public.recruitment360_lot7_submit_review(
  p_application_id uuid,
  p_actor_user_id text,
  p_reviewer_role text,
  p_process_rating integer,
  p_experience_rating integer,
  p_jobly_rating integer,
  p_recommendation boolean DEFAULT NULL,
  p_comment text DEFAULT NULL
)
RETURNS public."RecruitmentReview"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  a public."Application";
  r public."Recruitment360";
  v public."RecruitmentReview";
  v_reviewer_internal_user_id text;
begin
  if p_reviewer_role not in('TALENT','RECRUITER') then raise exception 'INVALID_REVIEW_ROLE'; end if;
  if p_process_rating<1 or p_process_rating>5
    or p_experience_rating<1 or p_experience_rating>5
    or p_jobly_rating<1 or p_jobly_rating>5 then raise exception 'INVALID_RATING'; end if;
  if p_comment is not null and length(p_comment)>2000 then raise exception 'COMMENT_TOO_LONG'; end if;

  select * into a from public."Application" where id=p_application_id;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select * into r from public."Recruitment360" where "recruiterJobId"=a."recruiterJobId";
  if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;

  if p_reviewer_role='TALENT' then
    if a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
    if coalesce(a."recruitment360Status",'') not in('REJECTED','HIRED','OFFER_DECLINED','WITHDRAWN') then
      raise exception 'REVIEW_NOT_OPEN';
    end if;
  else
    if not exists(
      select 1 from public."RecruitmentRole" rr
      where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id
        and rr.role in('OWNER','HR','MANAGER','DELEGATE')
    ) then raise exception 'FORBIDDEN'; end if;
    if coalesce(r.currentState,'') not in('COMPLETED','CANCELLED','CLOSED') then
      raise exception 'REVIEW_NOT_OPEN';
    end if;
  end if;

  select u.id into v_reviewer_internal_user_id
  from public."User" u
  where u."authUserId"=p_actor_user_id or u.id=p_actor_user_id
  order by case when u.id=p_actor_user_id then 0 else 1 end
  limit 1;
  if v_reviewer_internal_user_id is null then raise exception 'REVIEWER_USER_NOT_FOUND'; end if;

  insert into public."RecruitmentReview"(
    "recruitmentId","applicationId","reviewerUserId","reviewerRole",
    "processRating","experienceRating","joblyRating",recommendation,comment,status
  )
  values(r.id,a.id,v_reviewer_internal_user_id,p_reviewer_role,
    p_process_rating,p_experience_rating,p_jobly_rating,p_recommendation,trim(p_comment),'PENDING')
  on conflict("applicationId","reviewerUserId","reviewerRole")
  do update set "processRating"=excluded."processRating",
    "experienceRating"=excluded."experienceRating","joblyRating"=excluded."joblyRating",
    recommendation=excluded.recommendation,comment=excluded.comment,status='PENDING',"updatedAt"=now()
  returning * into v;

  return v;
end;
$function$;
