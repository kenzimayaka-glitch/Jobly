create or replace function public.recruitment360_lot5_candidate_confirm(
 p_interview_id uuid,
 p_actor_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
 i public."RecruitmentInterview";
 a public."Application";
 attendance public."RecruitmentInterviewAttendance";
begin
 select * into i
 from public."RecruitmentInterview"
 where id=p_interview_id
 for update;
 if not found then raise exception 'INTERVIEW_NOT_FOUND'; end if;

 select * into a
 from public."Application"
 where id=i."applicationId";
 if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
 if a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
 if i.status not in('SCHEDULED','CONFIRMED','STARTED') then
  raise exception 'INTERVIEW_NOT_ACTIVE';
 end if;

 update public."RecruitmentInterview"
 set "candidateConfirmedAt"=coalesce("candidateConfirmedAt",now()),
     "updatedAt"=now()
 where id=i.id
 returning * into i;

 update public."RecruitmentInterviewAttendance"
 set status='CONFIRMED'
 where "interviewId"=i.id
   and "participantRole"='CANDIDATE'
   and coalesce("participantUserId",'')=a."userId"::text
 returning * into attendance;

 if not found then
  insert into public."RecruitmentInterviewAttendance"(
   "interviewId","userId","participantUserId","participantRole",status,source
  ) values(
   i.id,a."userId",a."userId"::text,'CANDIDATE','CONFIRMED','SELF_SERVICE'
  ) returning * into attendance;
 end if;

 return jsonb_build_object(
  'interview',to_jsonb(i),
  'attendance',to_jsonb(attendance)
 );
end;
$function$;

revoke all on function public.recruitment360_lot5_candidate_confirm(uuid,text) from public, anon, authenticated;
grant execute on function public.recruitment360_lot5_candidate_confirm(uuid,text) to service_role;
