-- Jobly Recruitment 360° v2 — Lot 7 review moderation
create or replace function public.recruitment360_lot7_moderate_review(p_review_id uuid,p_actor_user_id text,p_status text) returns public."RecruitmentReview" language plpgsql security definer set search_path='' as $$
declare v public."RecruitmentReview"; r public."Recruitment360";
begin
 if p_status not in('PUBLISHED','REJECTED') then raise exception 'INVALID_MODERATION_STATUS'; end if;
 select * into v from public."RecruitmentReview" where id=p_review_id for update;
 if not found then raise exception 'REVIEW_NOT_FOUND'; end if;
 select * into r from public."Recruitment360" where id=v."recruitmentId";
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 update public."RecruitmentReview" set status=p_status,"moderatedByUserId"=p_actor_user_id,"moderatedAt"=now(),"updatedAt"=now() where id=v.id returning * into v;
 return v;
end;
$$;
revoke execute on function public.recruitment360_lot7_moderate_review(uuid,text,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot7_moderate_review(uuid,text,text) to service_role;