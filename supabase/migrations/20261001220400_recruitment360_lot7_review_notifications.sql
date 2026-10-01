-- Jobly Recruitment 360° v2 — Lot 7 review request notification
create or replace function public.recruitment360_lot7_notify_review_request() returns trigger language plpgsql security definer set search_path='' as $$
declare a public."Application"; r public."Recruitment360";
begin
 if new."currentState" is distinct from old."currentState" and new."currentState" in('REJECTED','HIRED','OFFER_DECLINED','WITHDRAWN') then
  select * into a from public."Application" where id=new."applicationId";
  if a."userId" is not null and not exists(select 1 from public."Notification" n where n."applicationId"=a.id and n.type='RECRUITMENT_REVIEW_REQUEST') then
   select * into r from public."Recruitment360" where "recruiterJobId"=a."recruiterJobId";
   insert into public."Notification"("userId",type,title,body,link,"entityId","recruitmentId","applicationId","actionType","actionPayload",locale,channels)
   values(a."userId",'RECRUITMENT_REVIEW_REQUEST','Votre avis compte','Votre candidature est terminée. Donnez votre avis sur le processus, votre expérience et Jobly.','/career/recruitment360/'||a.id||'/review',a.id,r.id,a.id,'REVIEW_PROCESS',jsonb_build_object('applicationId',a.id),coalesce(a.locale,'fr'),jsonb_build_object('email',true,'push',true,'inApp',true));
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists recruitment360_lot7_review_request on public."RecruitmentApplicationState";
create trigger recruitment360_lot7_review_request after update of "currentState" on public."RecruitmentApplicationState" for each row execute function public.recruitment360_lot7_notify_review_request();
revoke execute on function public.recruitment360_lot7_notify_review_request() from public,anon,authenticated;
grant execute on function public.recruitment360_lot7_notify_review_request() to service_role;