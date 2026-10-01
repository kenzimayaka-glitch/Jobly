-- Jobly Recruitment 360° v2 — Lot 7: reports, secure sharing, reviews and dashboard
create table if not exists public."RecruitmentReportShare"(
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid references public."Application"(id) on delete cascade,
 "tokenHash" text not null unique,
 scope text not null default 'RECRUITMENT_SUMMARY' check(scope in('RECRUITMENT_SUMMARY','APPLICATION_SUMMARY')),
 "expiresAt" timestamptz not null,
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "revokedAt" timestamptz,
 "lastAccessedAt" timestamptz,
 "accessCount" integer not null default 0 check("accessCount">=0),
 "createdAt" timestamptz not null default now()
);

create table if not exists public."RecruitmentReview"(
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid not null references public."Application"(id) on delete cascade,
 "reviewerUserId" text not null references public."User"(id) on delete cascade,
 "reviewerRole" text not null check("reviewerRole" in('TALENT','RECRUITER')),
 "processRating" integer not null check("processRating" between 1 and 5),
 "experienceRating" integer not null check("experienceRating" between 1 and 5),
 "joblyRating" integer not null check("joblyRating" between 1 and 5),
 recommendation boolean,
 comment text check(comment is null or length(comment)<=2000),
 status text not null default 'PENDING' check(status in('PENDING','PUBLISHED','REJECTED')),
 "moderatedByUserId" text references public."User"(id) on delete set null,
 "moderatedAt" timestamptz,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now(),
 unique("applicationId","reviewerUserId","reviewerRole")
);

alter table public."RecruitmentReportShare" enable row level security;
alter table public."RecruitmentReview" enable row level security;
revoke all on public."RecruitmentReportShare",public."RecruitmentReview" from anon,authenticated;
grant select on public."RecruitmentReportShare",public."RecruitmentReview" to authenticated;

create policy "Lot7 shares recruiter members" on public."RecruitmentReportShare"
for select to authenticated
using(exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentReportShare"."recruitmentId" and rr."authUserId"=(select auth.uid())));

create policy "Lot7 reviews participant or recruiter" on public."RecruitmentReview"
for select to authenticated
using(
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentReview"."recruitmentId" and rr."authUserId"=(select auth.uid()))
 or exists(select 1 from public."Application" a join public."User" u on u.id::text=a."userId"::text where a.id="RecruitmentReview"."applicationId" and u."authUserId"=(select auth.uid())::text)
);

create index if not exists "RecruitmentReportShare_recruitmentId_expiresAt_idx" on public."RecruitmentReportShare"("recruitmentId","expiresAt");
create index if not exists "RecruitmentReportShare_applicationId_idx" on public."RecruitmentReportShare"("applicationId");
create index if not exists "RecruitmentReview_recruitmentId_status_idx" on public."RecruitmentReview"("recruitmentId",status);
create index if not exists "RecruitmentReview_applicationId_idx" on public."RecruitmentReview"("applicationId");
create index if not exists "RecruitmentReview_reviewerUserId_idx" on public."RecruitmentReview"("reviewerUserId");

create or replace function public.recruitment360_lot7_submit_review(
 p_application_id uuid,
 p_actor_user_id text,
 p_reviewer_role text,
 p_process_rating integer,
 p_experience_rating integer,
 p_jobly_rating integer,
 p_recommendation boolean default null,
 p_comment text default null
) returns public."RecruitmentReview"
language plpgsql security definer set search_path='' as $$
declare
 a public."Application";
 r public."Recruitment360";
 v public."RecruitmentReview";
begin
 if p_reviewer_role not in('TALENT','RECRUITER') then raise exception 'INVALID_REVIEW_ROLE'; end if;
 if p_process_rating not between 1 and 5 or p_experience_rating not between 1 and 5 or p_jobly_rating not between 1 and 5 then raise exception 'INVALID_RATING'; end if;
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
end; $$;

create or replace function public.recruitment360_lot7_moderate_review(
 p_review_id uuid,p_actor_user_id text,p_status text
) returns public."RecruitmentReview"
language plpgsql security definer set search_path='' as $$
declare v public."RecruitmentReview"; r public."Recruitment360";
begin
 if p_status not in('PUBLISHED','REJECTED') then raise exception 'INVALID_MODERATION_STATUS'; end if;
 select * into v from public."RecruitmentReview" where id=p_review_id for update;
 if not found then raise exception 'REVIEW_NOT_FOUND'; end if;
 select * into r from public."Recruitment360" where id=v."recruitmentId";
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 update public."RecruitmentReview" set status=p_status,"moderatedByUserId"=p_actor_user_id,"moderatedAt"=now(),"updatedAt"=now() where id=v.id returning * into v;
 return v;
end; $$;

create or replace function public.recruitment360_lot7_get_report(
 p_recruitment_id uuid,p_actor_user_id text
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 r public."Recruitment360";
 j public."RecruiterJob";
 apps jsonb;
 funnel jsonb;
 metrics jsonb;
 reviews jsonb;
begin
 select * into r from public."Recruitment360" where id=p_recruitment_id;
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DG_READONLY','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 select * into j from public."RecruiterJob" where id=r."recruiterJobId";
 select coalesce(jsonb_agg(jsonb_build_object(
   'applicationId',a.id,
   'candidateName',coalesce(nullif(trim(u."displayName"),''),nullif(trim(concat_ws(' ',u."firstName",u."lastName")),''),'Candidat'),
   'state',coalesce(s."currentState",a."recruitment360Status",'SENT'),
   'submittedAt',a."submittedAt",
   'updatedAt',a."updatedAt",
   'atsScore',a."atsScore",
   'decisionOutcome',d.outcome,
   'decisionAt',d."decisionAt",
   'scoreTotal',d."scoreTotal"
 ) order by coalesce(s."stepNumber",0),a."createdAt"),'[]'::jsonb) into apps
 from public."Application" a
 left join public."User" u on u.id::text=a."userId"::text
 left join public."RecruitmentApplicationState" s on s."applicationId"=a.id
 left join public."RecruitmentDecision" d on d."applicationId"=a.id
 where a."recruiterJobId"=r."recruiterJobId";
 select jsonb_object_agg(x.state,x.cnt) into funnel from(
   select coalesce(s."currentState",a."recruitment360Status",'SENT') state,count(*) cnt
   from public."Application" a
   left join public."RecruitmentApplicationState" s on s."applicationId"=a.id
   where a."recruiterJobId"=r."recruiterJobId"
   group by 1
 ) x;
 select jsonb_build_object(
   'applicationCount',(select count(*) from public."Application" a where a."recruiterJobId"=r."recruiterJobId"),
   'completedCount',(select count(*) from public."Application" a where a."recruiterJobId"=r."recruiterJobId" and a."recruitment360Status"='HIRED'),
   'rejectedCount',(select count(*) from public."Application" a where a."recruiterJobId"=r."recruiterJobId" and a."recruitment360Status"='REJECTED'),
   'poolCount',(select count(*) from public."Application" a where a."recruiterJobId"=r."recruiterJobId" and a."recruitment360Status"='POOL'),
   'withdrawnCount',(select count(*) from public."Application" a where a."recruiterJobId"=r."recruiterJobId" and a."recruitment360Status"='WITHDRAWN'),
   'timeToHireDays',case when r."completedAt" is not null then round(extract(epoch from(r."completedAt"-(select min(a."submittedAt") from public."Application" a where a."recruiterJobId"=r."recruiterJobId" and a."submittedAt" is not null)))/86400.0,2) else null end
 ) into metrics;
 select jsonb_build_object(
   'count',(select count(*) from public."RecruitmentReview" rv where rv."recruitmentId"=r.id and rv.status='PUBLISHED'),
   'processAverage',(select round(avg(rv."processRating")::numeric,2) from public."RecruitmentReview" rv where rv."recruitmentId"=r.id and rv.status='PUBLISHED'),
   'experienceAverage',(select round(avg(rv."experienceRating")::numeric,2) from public."RecruitmentReview" rv where rv."recruitmentId"=r.id and rv.status='PUBLISHED'),
   'joblyAverage',(select round(avg(rv."joblyRating")::numeric,2) from public."RecruitmentReview" rv where rv."recruitmentId"=r.id and rv.status='PUBLISHED')
 ) into reviews;
 return jsonb_build_object('recruitment',to_jsonb(r),'job',to_jsonb(j),'funnel',coalesce(funnel,'{}'::jsonb),'metrics',metrics,'reviews',reviews,'applications',apps);
end; $$;

revoke execute on function public.recruitment360_lot7_submit_review(uuid,text,text,integer,integer,integer,boolean,text) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot7_moderate_review(uuid,text,text) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot7_get_report(uuid,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot7_submit_review(uuid,text,text,integer,integer,integer,boolean,text) to service_role;
grant execute on function public.recruitment360_lot7_moderate_review(uuid,text,text) to service_role;
grant execute on function public.recruitment360_lot7_get_report(uuid,text) to service_role;

-- Existing completed recruitments can be reviewed by their real participants; no synthetic rows are created.
