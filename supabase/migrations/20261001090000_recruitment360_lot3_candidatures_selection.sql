-- Jobly Recruitment 360° v2 — Lot 3: candidatures & sélection
create table if not exists public."RecruitmentApplicationAssessment" (
 id uuid primary key default gen_random_uuid(),
 "applicationId" uuid not null unique references public."Application"(id) on delete cascade,
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "atsScore" numeric(5,2) not null default 0 check ("atsScore" between 0 and 100),
 "profileCompleteness" numeric(5,2) not null default 0 check ("profileCompleteness" between 0 and 100),
 "matchedCriteria" jsonb not null default '[]'::jsonb,
 "missingCriteria" jsonb not null default '[]'::jsonb,
 "missingDocuments" jsonb not null default '[]'::jsonb,
 "computedAt" timestamptz not null default now(),
 "computedByUserId" text references public."User"(id) on delete set null
);
create table if not exists public."RecruitmentApplicationDocument" (
 id uuid primary key default gen_random_uuid(),
 "applicationId" uuid not null references public."Application"(id) on delete cascade,
 kind text not null check(kind in ('CV','COVER_LETTER','DIPLOMA','CERTIFICATE','IDENTITY','PORTFOLIO','OTHER')),
 url text not null,
 "fileName" text,
 "mimeType" text,
 "fileSize" bigint check ("fileSize" is null or "fileSize" >= 0),
 status text not null default 'SUBMITTED' check(status in ('SUBMITTED','VERIFIED','REJECTED')),
 "verifiedByUserId" text references public."User"(id) on delete set null,
 "verifiedAt" timestamptz,
 "createdAt" timestamptz not null default now()
);
create table if not exists public."RecruitmentShortlist" (
 id uuid primary key default gen_random_uuid(),
 "applicationId" uuid not null unique references public."Application"(id) on delete cascade,
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 status text not null default 'PENDING' check(status in ('PENDING','SHORTLISTED','RESERVE','DEFERRED','REJECTED')),
 rank integer check(rank is null or rank > 0),
 score numeric(5,2) check(score is null or score between 0 and 100),
 reason text,
 "deferUntil" timestamptz,
 "decidedByUserId" text references public."User"(id) on delete set null,
 "decidedAt" timestamptz,
 "updatedAt" timestamptz not null default now()
);
create index if not exists "RecruitmentApplicationAssessment_recruitmentId_idx" on public."RecruitmentApplicationAssessment"("recruitmentId");
create index if not exists "RecruitmentApplicationDocument_applicationId_idx" on public."RecruitmentApplicationDocument"("applicationId");
create index if not exists "RecruitmentShortlist_recruitmentId_status_score_idx" on public."RecruitmentShortlist"("recruitmentId",status,score desc);
alter table public."RecruitmentApplicationAssessment" enable row level security;
alter table public."RecruitmentApplicationDocument" enable row level security;
alter table public."RecruitmentShortlist" enable row level security;
revoke all on public."RecruitmentApplicationAssessment",public."RecruitmentApplicationDocument",public."RecruitmentShortlist" from anon,authenticated;
grant select on public."RecruitmentApplicationAssessment",public."RecruitmentApplicationDocument",public."RecruitmentShortlist" to authenticated;
create policy "360 assessment members or candidate" on public."RecruitmentApplicationAssessment" for select to authenticated using (
 exists(select 1 from public."Application" a where a.id="applicationId" and a."userId"::text=(select u.id::text from public."User" u where u."authUserId"=(select auth.uid())::text limit 1))
 or exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="recruitmentId" and rr."authUserId"=(select auth.uid()))
);
create policy "360 documents owner or recruiter" on public."RecruitmentApplicationDocument" for select to authenticated using (
 exists(select 1 from public."Application" a where a.id="applicationId" and a."userId"::text=(select u.id::text from public."User" u where u."authUserId"=(select auth.uid())::text limit 1))
 or exists(select 1 from public."Recruitment360" r join public."RecruitmentRole" rr on rr."recruitmentId"=r.id join public."Application" a on a."recruiterJobId"=r."recruiterJobId" where a.id="applicationId" and rr."authUserId"=(select auth.uid()))
);
create policy "360 shortlist members" on public."RecruitmentShortlist" for select to authenticated using (
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="recruitmentId" and rr."authUserId"=(select auth.uid()))
);
create or replace function public.recruitment360_lot3_score_application(p_application_id uuid,p_actor_user_id text)
returns public."RecruitmentApplicationAssessment" language plpgsql security definer set search_path=''
as $$
declare a public."Application"; r public."Recruitment360"; v public."RecruitmentAnnouncementVersion"; c record; score numeric:=0; total numeric:=0; matched jsonb:='[]'::jsonb; missing jsonb:='[]'::jsonb; docs jsonb:='[]'::jsonb; completeness numeric:=0; outrow public."RecruitmentApplicationAssessment";
begin
 select * into a from public."Application" where id=p_application_id;
 if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
 select * into r from public."Recruitment360" where "recruiterJobId"=a."recruiterJobId";
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 select * into v from public."RecruitmentAnnouncementVersion" where "recruitmentId"=r.id and status in('PUBLISHED','EXTENDED') order by "versionNumber" desc limit 1;
 for c in select * from public."RecruitmentCriterion" where "versionId"=v.id order by "sortOrder" loop
   total:=total+greatest(coalesce(c.weight,1),0);
   if lower(coalesce(a."letterText",'')) like '%'||lower(c.criterion)||'%' or lower(coalesce(a."cvUrl",'')) like '%'||lower(c.criterion)||'%' then
     score:=score+greatest(coalesce(c.weight,1),0);
     matched:=matched||jsonb_build_object('criterion',c.criterion,'label',c.label,'weight',c.weight);
   else missing:=missing||jsonb_build_object('criterion',c.criterion,'label',c.label,'required',c.required);
   end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('kind',kind)), '[]'::jsonb) into docs from public."RecruitmentApplicationDocument" where "applicationId"=a.id and status='VERIFIED';
 completeness:=least(100, round((case when a."cvUrl" is not null then 50 else 0 end)+(case when coalesce(length(a."letterText"),0)>=20 then 25 else 0 end)+(case when jsonb_array_length(docs)>0 then 25 else 0 end),2));
 score:=case when total>0 then round(score/total*100,2) else completeness end;
 insert into public."RecruitmentApplicationAssessment"("applicationId","recruitmentId","atsScore","profileCompleteness","matchedCriteria","missingCriteria","missingDocuments","computedByUserId")
 values(a.id,r.id,score,completeness,matched,missing,case when a."cvUrl" is null then '[{"kind":"CV"}]'::jsonb else '[]'::jsonb end,p_actor_user_id)
 on conflict("applicationId") do update set "atsScore"=excluded."atsScore","profileCompleteness"=excluded."profileCompleteness","matchedCriteria"=excluded."matchedCriteria","missingCriteria"=excluded."missingCriteria","missingDocuments"=excluded."missingDocuments","computedAt"=now(),"computedByUserId"=excluded."computedByUserId"
 returning * into outrow;
 return outrow;
end; $$;
create or replace function public.recruitment360_lot3_set_shortlist(p_application_id uuid,p_actor_user_id text,p_status text,p_reason text default null,p_defer_until timestamptz default null,p_rank integer default null)
returns public."RecruitmentShortlist" language plpgsql security definer set search_path=''
as $$
declare a public."Application"; r public."Recruitment360"; s public."RecruitmentShortlist"; score numeric;
begin
 select * into a from public."Application" where id=p_application_id;
 select * into r from public."Recruitment360" where "recruiterJobId"=a."recruiterJobId";
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 if p_status not in('SHORTLISTED','RESERVE','DEFERRED','REJECTED','PENDING') then raise exception 'INVALID_SHORTLIST_STATUS'; end if;
 if p_status='DEFERRED' and (p_defer_until is null or p_defer_until<=now()) then raise exception 'DEFER_DATE_REQUIRED'; end if;
 if p_status='REJECTED' and length(trim(coalesce(p_reason,'')))<5 then raise exception 'REJECTION_REASON_REQUIRED'; end if;
 select "atsScore" into score from public."RecruitmentApplicationAssessment" where "applicationId"=a.id;
 insert into public."RecruitmentShortlist"("applicationId","recruitmentId",status,rank,score,reason,"deferUntil","decidedByUserId","decidedAt")
 values(a.id,r.id,p_status,p_rank,score,trim(p_reason),p_defer_until,p_actor_user_id,now())
 on conflict("applicationId") do update set status=excluded.status,rank=excluded.rank,score=excluded.score,reason=excluded.reason,"deferUntil"=excluded."deferUntil","decidedByUserId"=excluded."decidedByUserId","decidedAt"=excluded."decidedAt","updatedAt"=now()
 returning * into s;
 if p_status='SHORTLISTED' then perform public.recruitment360_transition_application(a.id,'SELECTED',null); end if;
 if p_status='REJECTED' then perform public.recruitment360_transition_application(a.id,'REJECTED',p_reason); end if;
 return s;
end; $$;
revoke all on function public.recruitment360_lot3_score_application(uuid,text) from public,anon,authenticated;
revoke all on function public.recruitment360_lot3_set_shortlist(uuid,text,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.recruitment360_lot3_score_application(uuid,text) to service_role;
grant execute on function public.recruitment360_lot3_set_shortlist(uuid,text,text,text,timestamptz,integer) to service_role;