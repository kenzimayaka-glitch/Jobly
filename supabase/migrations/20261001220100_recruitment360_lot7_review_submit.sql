-- Jobly Recruitment 360° v2 — Lot 7 review submission
create or replace function public.recruitment360_lot7_submit_review(p_application_id uuid,p_actor_user_id text,p_reviewer_role text,p_process_rating integer,p_experience_rating integer,p_jobly_rating integer,p_recommendation boolean default null,p_comment text default null) returns public."RecruitmentReview" language plpgsql security definer set search_path='' as $$
declare a public."Application"; r public."Recruitment360"; v public."RecruitmentReview";
begin
 if p_reviewer_role not in('TALENT','RECRUITER') then raise exception 'INVALID_REVIEW_ROLE'; end if;
 if p_process_rating < 1 or p_process_rating > 5 or p_experience_rating < 1 or p_experience_rating > 5 or p_jobly_rating < 1 or p_jobly_rating > 5 then raise exception 'INVALID_RATING'; end if;
 if p_comment is not null and length(p_comment)>2000 then raise exception 'COMMENT_TOO_LONG'; end if;
 select * into a from public."Application" where id=p_application_id;
 if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
 select * into r from public."Recruitment360" where "recruiterJobId"=a."recruiterJobId";
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if p_reviewer_role='TALENT' then
  if a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
  if coalesce(a."recruitment360Status",'') not in('REJECTED','HIRED','OFFER_DECLINED','WITHDRAWN') then raise exception 'REVIEW_NOT_OPEN'; end if;
 else
  if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
  if coalesce(r.currentState,'') not in('COMPLETED','CANCELLED','CLOSED') then raise exception 'REVIEW_NOT_OPEN'; end if;
 end if;
 insert into public."RecruitmentReview"("recruitmentId","applicationId","reviewerUserId","reviewerRole","processRating","experienceRating","joblyRating",recommendation,comment,status)
 values(r.id,a.id,p_actor_user_id,p_reviewer_role,p_process_rating,p_experience_rating,p_jobly_rating,p_recommendation,trim(p_comment),'PENDING')
 on conflict("applicationId","reviewerUserId","reviewerRole") do update set "processRating"=excluded."processRating","experienceRating"=excluded."experienceRating","joblyRating"=excluded."joblyRating",recommendation=excluded.recommendation,comment=excluded.comment,status='PENDING',"updatedAt"=now()
 returning * into v;
 return v;
end;
$$;
revoke execute on function public.recruitment360_lot7_submit_review(uuid,text,text,integer,integer,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot7_submit_review(uuid,text,text,integer,integer,integer,boolean,text) to service_role;