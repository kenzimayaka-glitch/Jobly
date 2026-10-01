-- Jobly Recruitment 360° v2 — Lot 2: Lancer
-- Versioned announcements, criteria, salary/deadline, publication, closure and extensions.

create table if not exists public."RecruitmentAnnouncementVersion" (
  id uuid primary key default gen_random_uuid(),
  "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
  "versionNumber" integer not null check ("versionNumber" > 0),
  title text not null,
  description text not null,
  "salaryMin" integer check ("salaryMin" is null or "salaryMin" >= 0),
  "salaryMax" integer check ("salaryMax" is null or "salaryMax" >= 0),
  "salaryCurrency" text not null default 'XAF',
  "salaryVisible" boolean not null default true,
  "deadlineAt" timestamptz,
  "publishedAt" timestamptz,
  "closedAt" timestamptz,
  "extensionReason" text,
  status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED','CLOSED','EXTENDED')),
  "createdByUserId" text not null references public."User"(id) on delete restrict,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("recruitmentId","versionNumber"),
  check ("salaryMax" is null or "salaryMin" is null or "salaryMax" >= "salaryMin"),
  check ("deadlineAt" is null or "deadlineAt" > "createdAt")
);

create table if not exists public."RecruitmentCriterion" (
  id uuid primary key default gen_random_uuid(),
  "versionId" uuid not null references public."RecruitmentAnnouncementVersion"(id) on delete cascade,
  criterion text not null,
  label text not null,
  required boolean not null default false,
  weight numeric(6,3) not null default 1 check (weight >= 0),
  "sortOrder" integer not null default 0 check ("sortOrder" >= 0),
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  unique ("versionId", criterion)
);

create table if not exists public."RecruitmentPublicationEvent" (
  id uuid primary key default gen_random_uuid(),
  "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
  "versionId" uuid references public."RecruitmentAnnouncementVersion"(id) on delete set null,
  action text not null check (action in ('CREATE_VERSION','PUBLISH','EXTEND','CLOSE','REOPEN')),
  "fromState" text,
  "toState" text,
  reason text,
  "actorUserId" text not null references public."User"(id) on delete restrict,
  "effectiveAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

create index if not exists "RecruitmentAnnouncementVersion_recruitmentId_status_idx"
 on public."RecruitmentAnnouncementVersion" ("recruitmentId", status);
create index if not exists "RecruitmentAnnouncementVersion_deadlineAt_idx"
 on public."RecruitmentAnnouncementVersion" ("deadlineAt");
create index if not exists "RecruitmentCriterion_versionId_sortOrder_idx"
 on public."RecruitmentCriterion" ("versionId","sortOrder");
create index if not exists "RecruitmentPublicationEvent_recruitmentId_effectiveAt_idx"
 on public."RecruitmentPublicationEvent" ("recruitmentId","effectiveAt" desc);

alter table public."RecruitmentAnnouncementVersion" enable row level security;
alter table public."RecruitmentCriterion" enable row level security;
alter table public."RecruitmentPublicationEvent" enable row level security;
revoke all on public."RecruitmentAnnouncementVersion" from anon, authenticated;
revoke all on public."RecruitmentCriterion" from anon, authenticated;
revoke all on public."RecruitmentPublicationEvent" from anon, authenticated;
grant select on public."RecruitmentAnnouncementVersion" to authenticated;
grant select on public."RecruitmentCriterion" to authenticated;
grant select on public."RecruitmentPublicationEvent" to authenticated;

drop policy if exists "Recruitment announcement visible to assigned roles" on public."RecruitmentAnnouncementVersion";
create policy "Recruitment announcement visible to assigned roles" on public."RecruitmentAnnouncementVersion"
for select to authenticated using (
 exists (select 1 from public."RecruitmentRole" rr
 where rr."recruitmentId"="RecruitmentAnnouncementVersion"."recruitmentId"
 and rr."authUserId"=(select auth.uid()))
);

drop policy if exists "Recruitment criteria visible to assigned roles" on public."RecruitmentCriterion";
create policy "Recruitment criteria visible to assigned roles" on public."RecruitmentCriterion"
for select to authenticated using (
 exists (select 1 from public."RecruitmentAnnouncementVersion" v
 join public."RecruitmentRole" rr on rr."recruitmentId"=v."recruitmentId"
 where v.id="RecruitmentCriterion"."versionId" and rr."authUserId"=(select auth.uid()))
);

drop policy if exists "Recruitment publication events visible to assigned roles" on public."RecruitmentPublicationEvent";
create policy "Recruitment publication events visible to assigned roles" on public."RecruitmentPublicationEvent"
for select to authenticated using (
 exists (select 1 from public."RecruitmentRole" rr
 where rr."recruitmentId"="RecruitmentPublicationEvent"."recruitmentId"
 and rr."authUserId"=(select auth.uid()))
);

-- Server-authoritative Lot 2 RPCs are deliberately service_role-only.
-- The Next.js route authenticates the Supabase user first, maps it to User.id,
-- then passes that internal actor id to these functions.

create or replace function public.recruitment360_lot2_create_version(
 p_recruiter_job_id uuid, p_actor_user_id text, p_title text, p_description text,
 p_salary_min integer default null, p_salary_max integer default null,
 p_salary_currency text default 'XAF', p_salary_visible boolean default true,
 p_deadline_at timestamptz default null, p_criteria jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_recruitment public."Recruitment360"; v_version_id uuid; v_next integer; v_item jsonb;
begin
 select r.* into v_recruitment from public."Recruitment360" r where r."recruiterJobId"=p_recruiter_job_id for update;
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_recruitment.id and rr."userId"=p_actor_user_id and rr.role in ('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_title,'')))=0 or length(trim(coalesce(p_description,'')))=0 then raise exception 'TITLE_AND_DESCRIPTION_REQUIRED'; end if;
 if p_salary_min is not null and p_salary_min<0 then raise exception 'INVALID_SALARY'; end if;
 if p_salary_max is not null and p_salary_max<0 then raise exception 'INVALID_SALARY'; end if;
 if p_salary_min is not null and p_salary_max is not null and p_salary_max<p_salary_min then raise exception 'INVALID_SALARY_RANGE'; end if;
 if p_deadline_at is not null and p_deadline_at<=now() then raise exception 'DEADLINE_MUST_BE_FUTURE'; end if;
 select coalesce(max("versionNumber"),0)+1 into v_next from public."RecruitmentAnnouncementVersion" where "recruitmentId"=v_recruitment.id;
 insert into public."RecruitmentAnnouncementVersion"("recruitmentId","versionNumber",title,description,"salaryMin","salaryMax","salaryCurrency","salaryVisible","deadlineAt",status,"createdByUserId")
 values(v_recruitment.id,v_next,trim(p_title),trim(p_description),p_salary_min,p_salary_max,coalesce(nullif(trim(p_salary_currency),''),'XAF'),p_salary_visible,p_deadline_at,'DRAFT',p_actor_user_id)
 returning id into v_version_id;
 for v_item in select * from jsonb_array_elements(case when jsonb_typeof(p_criteria)='array' then p_criteria else '[]'::jsonb end)
 loop
   if length(trim(coalesce(v_item->>'criterion',''))) > 0 then
     insert into public."RecruitmentCriterion"("versionId",criterion,label,required,weight,"sortOrder",metadata)
     values(v_version_id,trim(v_item->>'criterion'),coalesce(nullif(trim(v_item->>'label'),''),trim(v_item->>'criterion')),coalesce((v_item->>'required')::boolean,false),coalesce(nullif(v_item->>'weight','')::numeric,1),coalesce(nullif(v_item->>'sortOrder','')::integer,0),coalesce(v_item->'metadata','{}'::jsonb'))
     on conflict ("versionId",criterion) do update set label=excluded.label,required=excluded.required,weight=excluded.weight,"sortOrder"=excluded."sortOrder",metadata=excluded.metadata;
   end if;
 end loop;
 insert into public."RecruitmentPublicationEvent"("recruitmentId","versionId",action,"fromState","toState","actorUserId",reason)
 values(v_recruitment.id,v_version_id,'CREATE_VERSION',v_recruitment."currentState",v_recruitment."currentState",p_actor_user_id,'Nouvelle version');
 return v_version_id;
end; $$;

create or replace function public.recruitment360_lot2_publish(p_recruiter_job_id uuid,p_actor_user_id text,p_version_id uuid)
returns public."Recruitment360" language plpgsql security definer set search_path=''
as $$
declare v_r public."Recruitment360"; v_v public."RecruitmentAnnouncementVersion"; v_from text;
begin
 select r.* into v_r from public."Recruitment360" r where r."recruiterJobId"=p_recruiter_job_id for update;
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_r.id and rr."userId"=p_actor_user_id and rr.role in ('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 v_from:=v_r."currentState";
 select v.* into v_v from public."RecruitmentAnnouncementVersion" v where v.id=p_version_id and v."recruitmentId"=v_r.id for update;
 if not found then raise exception 'VERSION_NOT_FOUND'; end if;
 if length(trim(v_v.title))=0 or length(trim(v_v.description))=0 then raise exception 'ANNOUNCEMENT_INCOMPLETE'; end if;
 if v_v."deadlineAt" is not null and v_v."deadlineAt"<=now() then raise exception 'DEADLINE_EXPIRED'; end if;
 update public."RecruitmentAnnouncementVersion" set status='PUBLISHED',"publishedAt"=coalesce("publishedAt",now()),"closedAt"=null,"updatedAt"=now() where id=p_version_id;
 update public."Recruitment360" set "currentState"='PUBLISHED',"version"="version"+1,"updatedAt"=now(),"closedAt"=null where id=v_r.id returning * into v_r;
 update public."RecruiterJob" set status='published',"updatedAt"=now() where id=p_recruiter_job_id;
 insert into public."RecruitmentPublicationEvent"("recruitmentId","versionId",action,"fromState","toState","actorUserId")
 values(v_r.id,p_version_id,'PUBLISH',v_from,'PUBLISHED',p_actor_user_id);
 return v_r;
end; $$;

create or replace function public.recruitment360_lot2_close(p_recruiter_job_id uuid,p_actor_user_id text,p_reason text default null)
returns public."Recruitment360" language plpgsql security definer set search_path=''
as $$
declare v_r public."Recruitment360"; v_v_id uuid; v_from text;
begin
 select r.* into v_r from public."Recruitment360" r where r."recruiterJobId"=p_recruiter_job_id for update;
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_r.id and rr."userId"=p_actor_user_id and rr.role in ('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 if v_r."currentState" in ('CANCELLED','COMPLETED') then raise exception 'RECRUITMENT_LOCKED'; end if;
 v_from:=v_r."currentState";
 select id into v_v_id from public."RecruitmentAnnouncementVersion" where "recruitmentId"=v_r.id and status in ('PUBLISHED','EXTENDED') order by "versionNumber" desc limit 1 for update;
 if not found then raise exception 'PUBLISHED_VERSION_REQUIRED'; end if;
 update public."RecruitmentAnnouncementVersion" set status='CLOSED',"closedAt"=now(),"updatedAt"=now() where id=v_v_id;
 update public."Recruitment360" set "currentState"='APPLICATIONS_CLOSED',"closedAt"=now(),"lockedAt"=now(),"version"="version"+1,"updatedAt"=now() where id=v_r.id returning * into v_r;
 update public."RecruiterJob" set status='closed',"updatedAt"=now() where id=v_r."recruiterJobId";
 insert into public."RecruitmentPublicationEvent"("recruitmentId","versionId",action,"fromState","toState","actorUserId",reason)
 values(v_r.id,v_v_id,'CLOSE',v_from,'APPLICATIONS_CLOSED',p_actor_user_id,p_reason);
 return v_r;
end; $$;

create or replace function public.recruitment360_lot2_extend(p_recruiter_job_id uuid,p_actor_user_id text,p_new_deadline timestamptz,p_reason text)
returns public."Recruitment360" language plpgsql security definer set search_path=''
as $$
declare v_r public."Recruitment360"; v_v public."RecruitmentAnnouncementVersion"; v_from text;
begin
 if p_new_deadline is null or p_new_deadline<=now() then raise exception 'DEADLINE_MUST_BE_FUTURE'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'EXTENSION_REASON_REQUIRED'; end if;
 select r.* into v_r from public."Recruitment360" r where r."recruiterJobId"=p_recruiter_job_id for update;
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_r.id and rr."userId"=p_actor_user_id and rr.role in ('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 v_from:=v_r."currentState";
 select v.* into v_v from public."RecruitmentAnnouncementVersion" v where "recruitmentId"=v_r.id and status in ('PUBLISHED','EXTENDED') order by "versionNumber" desc limit 1 for update;
 if not found then raise exception 'PUBLISHED_VERSION_REQUIRED'; end if;
 update public."RecruitmentAnnouncementVersion" set status='EXTENDED',"deadlineAt"=p_new_deadline,"extensionReason"=trim(p_reason),"updatedAt"=now() where id=v_v.id;
 update public."Recruitment360" set "currentState"='EXTENDED',"version"="version"+1,"updatedAt"=now(),"closedAt"=null where id=v_r.id returning * into v_r;
 update public."RecruiterJob" set status='published',"updatedAt"=now() where id=v_r."recruiterJobId";
 insert into public."RecruitmentPublicationEvent"("recruitmentId","versionId",action,"fromState","toState","actorUserId",reason)
 values(v_r.id,v_v.id,'EXTEND',v_from,'EXTENDED',p_actor_user_id,trim(p_reason));
 return v_r;
end; $$;

revoke all on function public.recruitment360_lot2_create_version(uuid,text,text,text,integer,integer,text,boolean,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function public.recruitment360_lot2_publish(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.recruitment360_lot2_close(uuid,text,text) from public,anon,authenticated;
revoke all on function public.recruitment360_lot2_extend(uuid,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot2_create_version(uuid,text,text,text,integer,integer,text,boolean,timestamptz,jsonb) to service_role;
grant execute on function public.recruitment360_lot2_publish(uuid,text,uuid) to service_role;
grant execute on function public.recruitment360_lot2_close(uuid,text,text) to service_role;
grant execute on function public.recruitment360_lot2_extend(uuid,text,timestamptz,text) to service_role;

insert into public."RecruitmentAnnouncementVersion"("recruitmentId","versionNumber",title,description,"salaryCurrency","salaryVisible",status,"createdByUserId")
select r.id,1,j.title,j.description,'XAF',true,
case when j.status='published' then 'PUBLISHED' when j.status='closed' then 'CLOSED' else 'DRAFT' end,j."recruiterUserId"::text
from public."Recruitment360" r join public."RecruiterJob" j on j.id=r."recruiterJobId"
where not exists(select 1 from public."RecruitmentAnnouncementVersion" v where v."recruitmentId"=r.id);

insert into public."RecruitmentCriterion"("versionId",criterion,label,required,weight,"sortOrder")
select v.id,'TITLE','Intitulé du poste',true,1,0
from public."RecruitmentAnnouncementVersion" v
where not exists(select 1 from public."RecruitmentCriterion" c where c."versionId"=v.id and c.criterion='TITLE');
