-- Recruitment 360° Lot 7 — Reports & avis
create table if not exists public."RecruitmentReport"(
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid references public."Application"(id) on delete cascade,
 "reportType" text not null check("reportType" in('RECRUITMENT','CANDIDATE','DECISION','AUDIT')),
 title text not null,
 summary text not null,
 metrics jsonb not null default '{}'::jsonb,
 "generatedByUserId" text not null references public."User"(id) on delete restrict,
 "generatedAt" timestamptz not null default now(),
 "createdAt" timestamptz not null default now()
);
create index if not exists "RecruitmentReport_recruitmentId_idx" on public."RecruitmentReport"("recruitmentId","generatedAt" desc);
create index if not exists "RecruitmentReport_applicationId_idx" on public."RecruitmentReport"("applicationId","generatedAt" desc);

create table if not exists public."RecruitmentReview"(
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid references public."Application"(id) on delete cascade,
 "reviewerUserId" text not null references public."User"(id) on delete restrict,
 recommendation text not null check(recommendation in('STRONG_RECOMMEND','RECOMMEND','RESERVE','DO_NOT_RECOMMEND')),
 "reviewText" text not null check(length(trim("reviewText"))>=10),
 "visibleToCandidate" boolean not null default false,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now()
);
create index if not exists "RecruitmentReview_recruitmentId_idx" on public."RecruitmentReview"("recruitmentId","createdAt" desc);
create index if not exists "RecruitmentReview_applicationId_idx" on public."RecruitmentReview"("applicationId","createdAt" desc);

alter table public."RecruitmentReport" enable row level security;
alter table public."RecruitmentReview" enable row level security;
revoke all on public."RecruitmentReport",public."RecruitmentReview" from anon,authenticated;
grant select on public."RecruitmentReport",public."RecruitmentReview" to authenticated;

create policy "Recruitment members can read reports"
on public."RecruitmentReport" for select to authenticated using(
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentReport"."recruitmentId" and rr."authUserId"=(select auth.uid()))
 or exists(select 1 from public."Application" a join public."User" u on u.id::text=a."userId"::text where a.id="RecruitmentReport"."applicationId" and u."authUserId"=(select auth.uid()))
);

create policy "Recruitment members can read reviews"
on public."RecruitmentReview" for select to authenticated using(
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentReview"."recruitmentId" and rr."authUserId"=(select auth.uid()))
 or exists(select 1 from public."Application" a join public."User" u on u.id::text=a."userId"::text where a.id="RecruitmentReview"."applicationId" and u."authUserId"=(select auth.uid()) and "RecruitmentReview"."visibleToCandidate"=true)
);

create or replace function public.recruitment360_lot7_generate_report(
 p_recruitment_id uuid,p_actor_user_id text,p_report_type text default 'RECRUITMENT',p_application_id uuid default null
) returns public."RecruitmentReport"
language plpgsql security definer set search_path='' as $$
declare v_report public."RecruitmentReport"; v_total int;v_decided int;v_hired int;v_rejected int;v_pool int;v_offer int;v_avg numeric;v_summary text;
begin
 if p_report_type not in('RECRUITMENT','CANDIDATE','DECISION','AUDIT') then raise exception 'INVALID_REPORT_TYPE';end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=p_recruitment_id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN';end if;
 if p_report_type='CANDIDATE' and p_application_id is null then raise exception 'APPLICATION_REQUIRED';end if;
 if p_application_id is not null and not exists(select 1 from public."Application" a join public."Recruitment360" r on r."recruiterJobId"=a."recruiterJobId" where a.id=p_application_id and r.id=p_recruitment_id) then raise exception 'APPLICATION_NOT_IN_RECRUITMENT';end if;

 select count(*) into v_total from public."Application" a join public."Recruitment360" r on r."recruiterJobId"=a."recruiterJobId" where r.id=p_recruitment_id;
 select count(*) into v_decided from public."RecruitmentDecision" d where d."recruitmentId"=p_recruitment_id;
 select count(*) into v_hired from public."RecruitmentDecision" d where d."recruitmentId"=p_recruitment_id and d.outcome='HIRED';
 select count(*) into v_rejected from public."RecruitmentDecision" d where d."recruitmentId"=p_recruitment_id and d.outcome='REJECTED';
 select count(*) into v_pool from public."RecruitmentDecision" d where d."recruitmentId"=p_recruitment_id and d.outcome='POOL';
 select count(*) into v_offer from public."RecruitmentDecision" d where d."recruitmentId"=p_recruitment_id and d.outcome='OFFER';
 select avg(d."scoreTotal") into v_avg from public."RecruitmentDecision" d where d."recruitmentId"=p_recruitment_id and d."scoreTotal" is not null;

 if p_report_type='CANDIDATE' then
   select 'Rapport de candidature : '||coalesce(d.outcome,'EN COURS')||'.' into v_summary from public."RecruitmentDecision" d where d."recruitmentId"=p_recruitment_id and d."applicationId"=p_application_id;
   v_summary:=coalesce(v_summary,'Rapport de candidature en cours de processus.');
 else
   v_summary:=format('Rapport %s : %s candidatures, %s décisions, %s recrutées, %s rejetées, %s en vivier, %s en offre.',p_report_type,v_total,v_decided,v_hired,v_rejected,v_pool,v_offer);
 end if;

 insert into public."RecruitmentReport"("recruitmentId","applicationId","reportType",title,summary,metrics,"generatedByUserId")
 values(p_recruitment_id,p_application_id,p_report_type,
   case p_report_type when 'CANDIDATE' then 'Rapport candidat' when 'DECISION' then 'Rapport de décision' when 'AUDIT' then 'Rapport d''audit' else 'Rapport du recrutement' end,
   v_summary,
   jsonb_build_object('totalApplications',v_total,'decided',v_decided,'hired',v_hired,'rejected',v_rejected,'pool',v_pool,'offer',v_offer,'averageScore',v_avg),
   p_actor_user_id)
 returning * into v_report;

 insert into public."RecruitmentAuditLog"("recruitmentId","applicationId","actorUserId",action,metadata)
 values(p_recruitment_id,p_application_id,p_actor_user_id,'REPORT_GENERATED',jsonb_build_object('reportId',v_report.id,'reportType',p_report_type));
 return v_report;
end;$$;
revoke execute on function public.recruitment360_lot7_generate_report(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.recruitment360_lot7_generate_report(uuid,text,text,uuid) to service_role;

create or replace function public.recruitment360_lot7_submit_review(
 p_recruitment_id uuid,p_application_id uuid,p_actor_user_id text,p_recommendation text,p_review_text text,p_visible_to_candidate boolean default false
) returns public."RecruitmentReview"
language plpgsql security definer set search_path='' as $$
declare v_review public."RecruitmentReview";
begin
 if p_recommendation not in('STRONG_RECOMMEND','RECOMMEND','RESERVE','DO_NOT_RECOMMEND') then raise exception 'INVALID_RECOMMENDATION';end if;
 if coalesce(length(trim(p_review_text)),0)<10 then raise exception 'REVIEW_TOO_SHORT';end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=p_recruitment_id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE','JURY')) then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from public."Application" a join public."Recruitment360" r on r."recruiterJobId"=a."recruiterJobId" where a.id=p_application_id and r.id=p_recruitment_id) then raise exception 'APPLICATION_NOT_IN_RECRUITMENT';end if;
 insert into public."RecruitmentReview"("recruitmentId","applicationId","reviewerUserId",recommendation,"reviewText","visibleToCandidate")
 values(p_recruitment_id,p_application_id,p_actor_user_id,p_recommendation,p_review_text,p_visible_to_candidate)
 returning * into v_review;
 insert into public."RecruitmentAuditLog"("recruitmentId","applicationId","actorUserId",action,metadata)
 values(p_recruitment_id,p_application_id,p_actor_user_id,'REVIEW_SUBMITTED',jsonb_build_object('reviewId',v_review.id,'recommendation',p_recommendation,'visibleToCandidate',p_visible_to_candidate));
 return v_review;
end;$$;
revoke execute on function public.recruitment360_lot7_submit_review(uuid,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.recruitment360_lot7_submit_review(uuid,uuid,text,text,text,boolean) to service_role;

create or replace function public.recruitment360_lot7_list_reports(p_recruitment_id uuid,p_actor_user_id text)
returns setof public."RecruitmentReport"
language sql security definer set search_path='' as $$
 select rp.* from public."RecruitmentReport" rp
 where rp."recruitmentId"=p_recruitment_id
 and exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=p_recruitment_id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE','JURY'))
 order by rp."generatedAt" desc;
$$;
revoke execute on function public.recruitment360_lot7_list_reports(uuid,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot7_list_reports(uuid,text) to service_role;
