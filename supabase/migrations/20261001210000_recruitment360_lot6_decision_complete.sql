-- Jobly Recruitment 360° v2 — Lot 6: Decision, offer, negotiation and reserve
-- Server-authoritative. No client can execute these RPCs directly.
create table if not exists public."RecruitmentDecisionPolicy"(
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null unique references public."Recruitment360"(id) on delete cascade,
 "cvWeight" numeric(6,3) not null default 0.35 check("cvWeight" between 0 and 1),
 "testWeight" numeric(6,3) not null default 0.30 check("testWeight" between 0 and 1),
 "interviewWeight" numeric(6,3) not null default 0.35 check("interviewWeight" between 0 and 1),
 "requireTwoStepApproval" boolean not null default false,
 "requireReferences" boolean not null default false,
 "salaryMin" integer,
 "salaryMax" integer,
 "salaryCurrency" text not null default 'XAF',
 "updatedByUserId" text references public."User"(id) on delete set null,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now(),
 check("salaryMin" is null or "salaryMin">=0),
 check("salaryMax" is null or "salaryMax">=0),
 check("salaryMax" is null or "salaryMin" is null or "salaryMax">="salaryMin"),
 check(abs(("cvWeight"+"testWeight"+"interviewWeight")-1) < 0.0001)
);

create table if not exists public."RecruitmentDecisionApproval"(
 id uuid primary key default gen_random_uuid(),
 "decisionId" uuid not null references public."RecruitmentDecision"(id) on delete cascade,
 "approverUserId" text not null references public."User"(id) on delete cascade,
 role text not null check(role in('HR','DG')),
 status text not null default 'PENDING' check(status in('PENDING','APPROVED','REJECTED')),
 rationale text,
 "decidedAt" timestamptz,
 unique("decisionId",role)
);

create table if not exists public."RecruitmentDecisionReference"(
 id uuid primary key default gen_random_uuid(),
 "applicationId" uuid not null references public."Application"(id) on delete cascade,
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "contactName" text not null,
 "contactEmail" text,
 "contactPhone" text,
 status text not null default 'REQUESTED' check(status in('REQUESTED','VERIFIED','FAILED','DECLINED')),
 notes text,
 "checkedByUserId" text references public."User"(id) on delete set null,
 "checkedAt" timestamptz,
 "createdAt" timestamptz not null default now()
);

create table if not exists public."RecruitmentDecisionRecommendation"(
 id uuid primary key default gen_random_uuid(),
 "decisionId" uuid not null unique references public."RecruitmentDecision"(id) on delete cascade,
 recommendation text not null check(recommendation in('PROCEED','RESERVE','DO_NOT_PROCEED','INSUFFICIENT_DATA')),
 rationale text not null,
 evidence jsonb not null default '{}'::jsonb,
 provider text not null,
 confidence text not null check(confidence in('HIGH','MEDIUM','LOW','UNKNOWN')),
 "generatedAt" timestamptz not null default now()
);

create table if not exists public."RecruitmentOffer"(
 id uuid primary key default gen_random_uuid(),
 "decisionId" uuid not null unique references public."RecruitmentDecision"(id) on delete cascade,
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid not null unique references public."Application"(id) on delete cascade,
 status text not null default 'DRAFT' check(status in('DRAFT','SENT','COUNTERED','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN')),
 "salaryProposed" integer not null check("salaryProposed">=0),
 "salaryMin" integer,
 "salaryMax" integer,
 "salaryCurrency" text not null default 'XAF',
 "responseDeadline" timestamptz,
 "serviceDate" date,
 channel text check(channel is null or channel in('EMAIL','WHATSAPP','CALL','JOBLY')),
 message text,
 "versionNumber" integer not null default 1 check("versionNumber">0),
 "sentAt" timestamptz,
 "respondedAt" timestamptz,
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now(),
 check("salaryMax" is null or "salaryMin" is null or "salaryMax">="salaryMin"),
 check("salaryProposed">=coalesce("salaryMin",0)),
 check("salaryMax" is null or "salaryProposed"<="salaryMax")
);

create table if not exists public."RecruitmentOfferNegotiation"(
 id uuid primary key default gen_random_uuid(),
 "offerId" uuid not null references public."RecruitmentOffer"(id) on delete cascade,
 "actorUserId" text not null references public."User"(id) on delete cascade,
 actorRole text not null check(actorRole in('RECRUITER','TALENT')),
 action text not null check(action in('SEND','COUNTER','ACCEPT','DECLINE','NOTE')),
 "proposedSalary" integer check("proposedSalary" is null or "proposedSalary">=0),
 channel text not null check(channel in('EMAIL','WHATSAPP','CALL','JOBLY')),
 message text not null check(length(trim(message))>=2),
 "createdAt" timestamptz not null default now()
);

alter table public."Application"
  add column if not exists "salaryExpectation" integer,
  add column if not exists "salaryCurrency" text default 'XAF';

create index if not exists "RecruitmentDecisionPolicy_recruitmentId_idx" on public."RecruitmentDecisionPolicy"("recruitmentId");
create index if not exists "RecruitmentDecisionApproval_decisionId_idx" on public."RecruitmentDecisionApproval"("decisionId");
create index if not exists "RecruitmentDecisionReference_applicationId_idx" on public."RecruitmentDecisionReference"("applicationId");
create index if not exists "RecruitmentOffer_recruitmentId_status_idx" on public."RecruitmentOffer"("recruitmentId","status");
create index if not exists "RecruitmentOfferNegotiation_offerId_createdAt_idx" on public."RecruitmentOfferNegotiation"("offerId","createdAt" desc);

alter table public."RecruitmentDecisionPolicy" enable row level security;
alter table public."RecruitmentDecisionApproval" enable row level security;
alter table public."RecruitmentDecisionReference" enable row level security;
alter table public."RecruitmentDecisionRecommendation" enable row level security;
alter table public."RecruitmentOffer" enable row level security;
alter table public."RecruitmentOfferNegotiation" enable row level security;

revoke all on public."RecruitmentDecisionPolicy",public."RecruitmentDecisionApproval",public."RecruitmentDecisionReference",public."RecruitmentDecisionRecommendation",public."RecruitmentOffer",public."RecruitmentOfferNegotiation" from anon,authenticated;
grant select on public."RecruitmentDecisionPolicy",public."RecruitmentDecisionApproval",public."RecruitmentDecisionReference",public."RecruitmentDecisionRecommendation",public."RecruitmentOffer",public."RecruitmentOfferNegotiation" to authenticated;

create or replace function public.recruitment360_lot6_user_id()
returns text language sql stable security definer set search_path='' as $$
 select u.id::text from public."User" u where u."authUserId"=(select auth.uid())::text limit 1
$$;
revoke execute on function public.recruitment360_lot6_user_id() from public,anon,authenticated;
grant execute on function public.recruitment360_lot6_user_id() to service_role;

create policy "Lot6 policy recruiter members" on public."RecruitmentDecisionPolicy" for select to authenticated
using(exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentDecisionPolicy"."recruitmentId" and rr."authUserId"=(select auth.uid())));
create policy "Lot6 approvals recruiter members" on public."RecruitmentDecisionApproval" for select to authenticated
using(exists(select 1 from public."RecruitmentDecision" d join public."RecruitmentRole" rr on rr."recruitmentId"=d."recruitmentId" where d.id="RecruitmentDecisionApproval"."decisionId" and rr."authUserId"=(select auth.uid())));
create policy "Lot6 references recruiter members" on public."RecruitmentDecisionReference" for select to authenticated
using(exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentDecisionReference"."recruitmentId" and rr."authUserId"=(select auth.uid())));
create policy "Lot6 recommendation recruiter members" on public."RecruitmentDecisionRecommendation" for select to authenticated
using(exists(select 1 from public."RecruitmentDecision" d join public."RecruitmentRole" rr on rr."recruitmentId"=d."recruitmentId" where d.id="RecruitmentDecisionRecommendation"."decisionId" and rr."authUserId"=(select auth.uid())));
create policy "Lot6 offer recruiter or candidate" on public."RecruitmentOffer" for select to authenticated
using(
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentOffer"."recruitmentId" and rr."authUserId"=(select auth.uid()))
 or exists(select 1 from public."Application" a where a.id="RecruitmentOffer"."applicationId" and a."userId"::text=public.recruitment360_lot6_user_id())
);
create policy "Lot6 negotiation recruiter or candidate" on public."RecruitmentOfferNegotiation" for select to authenticated
using(
 exists(select 1 from public."RecruitmentOffer" o join public."RecruitmentRole" rr on rr."recruitmentId"=o."recruitmentId" where o.id="RecruitmentOfferNegotiation"."offerId" and rr."authUserId"=(select auth.uid()))
 or exists(select 1 from public."RecruitmentOffer" o join public."Application" a on a.id=o."applicationId" where o.id="RecruitmentOfferNegotiation"."offerId" and a."userId"::text=public.recruitment360_lot6_user_id())
);

create or replace function public.recruitment360_lot6_set_policy(
 p_recruitment_id uuid,p_actor_user_id text,p_cv_weight numeric,p_test_weight numeric,p_interview_weight numeric,
 p_two_step boolean,p_require_references boolean,p_salary_min integer,p_salary_max integer,p_currency text default 'XAF'
) returns public."RecruitmentDecisionPolicy" language plpgsql security definer set search_path='' as $$
declare v public."RecruitmentDecisionPolicy";
begin
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=p_recruitment_id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 if abs(coalesce(p_cv_weight,0)+coalesce(p_test_weight,0)+coalesce(p_interview_weight,0)-1)>0.0001 then raise exception 'WEIGHTS_MUST_SUM_1'; end if;
 if p_salary_min is not null and p_salary_min<0 then raise exception 'INVALID_SALARY_RANGE'; end if;
 if p_salary_max is not null and p_salary_max<0 then raise exception 'INVALID_SALARY_RANGE'; end if;
 if p_salary_min is not null and p_salary_max is not null and p_salary_max<p_salary_min then raise exception 'INVALID_SALARY_RANGE'; end if;
 insert into public."RecruitmentDecisionPolicy"("recruitmentId","cvWeight","testWeight","interviewWeight","requireTwoStepApproval","requireReferences","salaryMin","salaryMax","salaryCurrency","updatedByUserId")
 values(p_recruitment_id,p_cv_weight,p_test_weight,p_interview_weight,coalesce(p_two_step,false),coalesce(p_require_references,false),p_salary_min,p_salary_max,coalesce(nullif(trim(p_currency),''),'XAF'),p_actor_user_id)
 on conflict("recruitmentId") do update set "cvWeight"=excluded."cvWeight","testWeight"=excluded."testWeight","interviewWeight"=excluded."interviewWeight","requireTwoStepApproval"=excluded."requireTwoStepApproval","requireReferences"=excluded."requireReferences","salaryMin"=excluded."salaryMin","salaryMax"=excluded."salaryMax","salaryCurrency"=excluded."salaryCurrency","updatedByUserId"=excluded."updatedByUserId","updatedAt"=now()
 returning * into v;
 return v;
end; $$;

create or replace function public.recruitment360_lot6_submit_vote(
 p_application_id uuid,p_actor_user_id text,p_recommendation text,p_score numeric default null,p_rationale text default null,p_interview_id uuid default null
) returns public."RecruitmentDecision" language plpgsql security definer set search_path='' as $$
declare v_rid uuid;v_did uuid;v_d public."RecruitmentDecision";
begin
 if p_recommendation not in('STRONG_YES','YES','RESERVE','NO','STRONG_NO') then raise exception 'INVALID_RECOMMENDATION'; end if;
 if p_score is not null and(p_score<0 or p_score>100) then raise exception 'INVALID_SCORE'; end if;
 select r.id into v_rid from public."Recruitment360" r join public."Application" a on a."recruiterJobId"=r."recruiterJobId" where a.id=p_application_id;
 if v_rid is null then raise exception 'APPLICATION_360_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_rid and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','JURY','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 select id into v_did from public."RecruitmentDecision" where "applicationId"=p_application_id;
 if v_did is null then
   insert into public."RecruitmentDecision"("recruitmentId","applicationId",outcome,"decidedByUserId",rationale,"nextAction")
   values(v_rid,p_application_id,'POOL',p_actor_user_id,'Decision en préparation.','KEEP_POOL') returning id into v_did;
 end if;
 insert into public."RecruitmentDecisionVote"("decisionId","interviewId","juryUserId",recommendation,score,rationale)
 values(v_did,p_interview_id,p_actor_user_id,p_recommendation,p_score,p_rationale)
 on conflict("decisionId","juryUserId") do update set "interviewId"=excluded."interviewId",recommendation=excluded.recommendation,score=excluded.score,rationale=excluded.rationale,"submittedAt"=now();
 select * into v_d from public."RecruitmentDecision" where id=v_did;
 return v_d;
end; $$;

create or replace function public.recruitment360_lot6_submit_approval(
 p_application_id uuid,p_actor_user_id text,p_role text,p_status text,p_rationale text default null
) returns public."RecruitmentDecisionApproval" language plpgsql security definer set search_path='' as $$
declare v_did uuid;v_rid uuid;v_r public."RecruitmentDecisionApproval";
begin
 if p_role not in('HR','DG') or p_status not in('APPROVED','REJECTED') then raise exception 'INVALID_APPROVAL'; end if;
 if p_status='REJECTED' and coalesce(length(trim(p_rationale)),0)<5 then raise exception 'APPROVAL_RATIONALE_REQUIRED'; end if;
 select d.id,d."recruitmentId" into v_did,v_rid from public."RecruitmentDecision" d where d."applicationId"=p_application_id;
 if v_did is null then raise exception 'DECISION_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_rid and rr."userId"=p_actor_user_id and rr.role=p_role) then raise exception 'FORBIDDEN'; end if;
 insert into public."RecruitmentDecisionApproval"("decisionId","approverUserId",role,status,rationale,"decidedAt")
 values(v_did,p_actor_user_id,p_role,p_status,p_rationale,now())
 on conflict("decisionId",role) do update set "approverUserId"=excluded."approverUserId",status=excluded.status,rationale=excluded.rationale,"decidedAt"=now()
 returning * into v_r;
 return v_r;
end; $$;

create or replace function public.recruitment360_lot6_finalize_decision(
 p_application_id uuid,p_actor_user_id text,p_outcome text,p_rationale text,p_next_action text default null,
 p_score_total numeric default null,p_score_breakdown jsonb default '{}'::jsonb
) returns public."RecruitmentDecision" language plpgsql security definer set search_path='' as $$
declare v_r public."Recruitment360";v_d public."RecruitmentDecision";v_state text;v_old text;v_policy public."RecruitmentDecisionPolicy";
begin
 if p_outcome not in('OFFER','REJECTED','POOL') then raise exception 'INVALID_OUTCOME'; end if;
 if coalesce(length(trim(p_rationale)),0)<5 then raise exception 'DECISION_RATIONALE_REQUIRED'; end if;
 if p_score_total is not null and(p_score_total<0 or p_score_total>100) then raise exception 'INVALID_SCORE'; end if;
 select r.* into v_r from public."Recruitment360" r join public."Application" a on a."recruiterJobId"=r."recruiterJobId" where a.id=p_application_id for update;
 if not found then raise exception 'APPLICATION_360_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 select "currentState" into v_state from public."RecruitmentApplicationState" where "applicationId"=p_application_id for update;
 if v_state not in('SELECTED','TEST','INTERVIEW','FINALIST','OFFER','POOL') then raise exception 'INVALID_DECISION_STAGE'; end if;
 select * into v_policy from public."RecruitmentDecisionPolicy" where "recruitmentId"=v_r.id;
 if p_outcome='OFFER' and coalesce(v_policy."requireReferences",false) and exists(select 1 from public."RecruitmentDecisionReference" ref where ref."applicationId"=p_application_id and ref.status not in('VERIFIED')) then raise exception 'REFERENCES_REQUIRED'; end if;
 if p_outcome='OFFER' and coalesce(v_policy."requireTwoStepApproval",false) and exists(select 1 from public."RecruitmentDecisionApproval" ap where ap."decisionId"=(select d.id from public."RecruitmentDecision" d where d."applicationId"=p_application_id) and ap.role='HR' and ap.status='REJECTED') then raise exception 'HR_APPROVAL_REJECTED'; end if;
 if p_outcome='OFFER' and coalesce(v_policy."requireTwoStepApproval",false) and not exists(select 1 from public."RecruitmentDecisionApproval" ap where ap."decisionId"=(select d.id from public."RecruitmentDecision" d where d."applicationId"=p_application_id) and ap.role='HR' and ap.status='APPROVED') then raise exception 'HR_APPROVAL_REQUIRED'; end if;
 select outcome into v_old from public."RecruitmentDecision" where "applicationId"=p_application_id for update;
 if v_old='HIRED' or (v_old='REJECTED' and p_outcome<>'REJECTED') then raise exception 'DECISION_LOCKED'; end if;
 insert into public."RecruitmentDecision"("recruitmentId","applicationId",outcome,"decidedByUserId",rationale,"nextAction","scoreTotal","scoreBreakdown")
 values(v_r.id,p_application_id,p_outcome,p_actor_user_id,p_rationale,p_next_action,p_score_total,coalesce(p_score_breakdown,'{}'::jsonb))
 on conflict("applicationId") do update set outcome=excluded.outcome,"decidedByUserId"=excluded."decidedByUserId",rationale=excluded.rationale,"nextAction"=excluded."nextAction","scoreTotal"=excluded."scoreTotal","scoreBreakdown"=excluded."scoreBreakdown","decisionAt"=now(),"updatedAt"=now()
 returning * into v_d;
 if p_outcome='OFFER' then
   update public."RecruitmentApplicationState" set "currentState"='OFFER',"stepNumber"=7,"lockedAt"=null,"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=p_application_id;
   update public."Application" set "recruitment360Status"='OFFER',"updatedAt"=now() where id=p_application_id;
   update public."Recruitment360" set "currentState"='OFFER',"updatedAt"=now() where id=v_r.id;
   insert into public."RecruitmentOffer"("decisionId","recruitmentId","applicationId","salaryProposed","salaryMin","salaryMax","salaryCurrency","createdByUserId")
   values(v_d.id,v_r.id,p_application_id,coalesce((select "salaryExpectation" from public."Application" where id=p_application_id),coalesce(v_policy."salaryMin",0)),v_policy."salaryMin",v_policy."salaryMax",coalesce(v_policy."salaryCurrency",'XAF'),p_actor_user_id)
   on conflict("decisionId") do nothing;
   update public."RecruitmentApplicationState" set "currentState"='POOL',"stepNumber"=6,"lastTransitionAt"=now(),"updatedAt"=now()
   where "applicationId"<>p_application_id and "applicationId" in(select a2.id from public."Application" a2 join public."Recruitment360" r2 on r2."recruiterJobId"=a2."recruiterJobId" where r2.id=v_r.id)
   and "currentState" in('FINALIST','INTERVIEW','SELECTED');
   update public."Application" set "recruitment360Status"='POOL',"updatedAt"=now()
   where id<>p_application_id and "recruiterJobId"=v_r."recruiterJobId"
   and id in(select "applicationId" from public."RecruitmentApplicationState" where "currentState"='POOL');
 elsif p_outcome='POOL' then
   update public."RecruitmentApplicationState" set "currentState"='POOL',"stepNumber"=6,"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=p_application_id;
   update public."Application" set "recruitment360Status"='POOL',"updatedAt"=now() where id=p_application_id;
 else
   update public."RecruitmentApplicationState" set "currentState"='REJECTED',"stepNumber"=9,"lockedAt"=now(),"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=p_application_id;
   update public."Application" set "recruitment360Status"='REJECTED',"updatedAt"=now() where id=p_application_id;
 end if;
 insert into public."RecruitmentAuditLog"("recruitmentId","applicationId","actorUserId",action,"fromState","toState",metadata)
 values(v_r.id,p_application_id,p_actor_user_id,'DECISION_FINALIZED',v_state,p_outcome,jsonb_build_object('outcome',p_outcome,'nextAction',p_next_action,'scoreTotal',p_score_total));
 return v_d;
end; $$;

create or replace function public.recruitment360_lot6_send_offer(
 p_offer_id uuid,p_actor_user_id text,p_salary integer,p_deadline timestamptz,p_channel text,p_message text
) returns public."RecruitmentOffer" language plpgsql security definer set search_path='' as $$
declare o public."RecruitmentOffer";r public."Recruitment360";p public."RecruitmentDecisionPolicy";
begin
 select * into o from public."RecruitmentOffer" where id=p_offer_id for update;
 if not found then raise exception 'OFFER_NOT_FOUND'; end if;
 select * into r from public."Recruitment360" where id=o."recruitmentId";
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 select * into p from public."RecruitmentDecisionPolicy" where "recruitmentId"=r.id;
 if p_salary<coalesce(p."salaryMin",o."salaryMin",0) or (coalesce(p."salaryMax",o."salaryMax") is not null and p_salary>coalesce(p."salaryMax",o."salaryMax")) then raise exception 'SALARY_OUT_OF_BOUNDS'; end if;
 if p_deadline is null or p_deadline<=now() then raise exception 'OFFER_DEADLINE_REQUIRED'; end if;
 if p_channel not in('EMAIL','WHATSAPP','CALL','JOBLY') then raise exception 'INVALID_CHANNEL'; end if;
 update public."RecruitmentOffer" set status='SENT',"salaryProposed"=p_salary,"salaryMin"=coalesce(p."salaryMin",o."salaryMin"),"salaryMax"=coalesce(p."salaryMax",o."salaryMax"),"salaryCurrency"=coalesce(p."salaryCurrency",o."salaryCurrency"),responseDeadline=p_deadline,channel=p_channel,message=trim(p_message),"sentAt"=now(),versionNumber="versionNumber"+1,"updatedAt"=now() where id=o.id returning * into o;
 insert into public."RecruitmentOfferNegotiation"("offerId","actorUserId","actorRole",action,"proposedSalary",channel,message)
 values(o.id,p_actor_user_id,'RECRUITER','SEND',p_salary,p_channel,coalesce(nullif(trim(p_message),''),'Offre envoyée.'));
 insert into public."Notification"("userId",type,title,body,link,"entityId","recruitmentId","applicationId","actionType","actionPayload",locale,channels)
 select a."userId",'RECRUITMENT_OFFER','Nouvelle offre','Une offre formelle est disponible pour votre candidature.','/career/recruitment360/'||a.id,o.id,r.id,a.id,'RESPOND_OFFER',jsonb_build_object('offerId',o.id,'deadline',o."responseDeadline",'salary',o."salaryProposed",'currency',o."salaryCurrency"),coalesce(a.locale,'fr'),jsonb_build_object('email',true,'push',true,'inApp',true)
 from public."Application" a where a.id=o."applicationId";
 return o;
end; $$;

create or replace function public.recruitment360_lot6_respond_offer(
 p_offer_id uuid,p_actor_user_id text,p_action text,p_salary integer default null,p_channel text default 'JOBLY',p_message text default null,p_service_date date default null
) returns public."RecruitmentOffer" language plpgsql security definer set search_path='' as $$
declare o public."RecruitmentOffer";a public."Application";r public."Recruitment360";
begin
 select * into o from public."RecruitmentOffer" where id=p_offer_id for update;
 if not found then raise exception 'OFFER_NOT_FOUND'; end if;
 select * into a from public."Application" where id=o."applicationId";
 if a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
 if o.status not in('SENT','COUNTERED') then raise exception 'OFFER_NOT_OPEN'; end if;
 if o."responseDeadline" is not null and o."responseDeadline"<now() then update public."RecruitmentOffer" set status='EXPIRED',"updatedAt"=now() where id=o.id; raise exception 'OFFER_EXPIRED'; end if;
 if p_action not in('COUNTER','ACCEPT','DECLINE') then raise exception 'INVALID_OFFER_ACTION'; end if;
 if p_channel not in('EMAIL','WHATSAPP','CALL','JOBLY') then raise exception 'INVALID_CHANNEL'; end if;
 if p_action='COUNTER' then
   if p_salary is null then raise exception 'COUNTER_SALARY_REQUIRED'; end if;
   if p_salary<coalesce(o."salaryMin",0) or (o."salaryMax" is not null and p_salary>o."salaryMax") then raise exception 'SALARY_OUT_OF_BOUNDS'; end if;
   update public."RecruitmentOffer" set status='COUNTERED',"salaryProposed"=p_salary,"respondedAt"=now(),versionNumber="versionNumber"+1,"updatedAt"=now() where id=o.id returning * into o;
 elsif p_action='DECLINE' then
   update public."RecruitmentOffer" set status='DECLINED',"respondedAt"=now(),"updatedAt"=now() where id=o.id returning * into o;
   update public."RecruitmentApplicationState" set "currentState"='OFFER_DECLINED',"stepNumber"=9,"lockedAt"=now(),"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=o."applicationId";
   update public."Application" set "recruitment360Status"='OFFER_DECLINED',"updatedAt"=now() where id=o."applicationId";
 elsif p_action='ACCEPT' then
   if p_service_date is null then raise exception 'SERVICE_DATE_REQUIRED'; end if;
   update public."RecruitmentOffer" set status='ACCEPTED',"respondedAt"=now(),"serviceDate"=p_service_date,"updatedAt"=now() where id=o.id returning * into o;
   update public."RecruitmentApplicationState" set "currentState"='HIRED',"stepNumber"=8,"lockedAt"=now(),"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=o."applicationId";
   update public."Application" set "recruitment360Status"='HIRED',"updatedAt"=now() where id=o."applicationId";
   select * into r from public."Recruitment360" where id=o."recruitmentId" for update;
   update public."Recruitment360" set "currentState"='COMPLETED',"completedAt"=now(),"updatedAt"=now() where id=r.id;
   update public."RecruitmentApplicationState" set "currentState"='REJECTED',"stepNumber"=9,"lockedAt"=now(),"lastTransitionAt"=now(),"updatedAt"=now()
   where "applicationId"<>o."applicationId" and "applicationId" in(select a2.id from public."Application" a2 where a2."recruiterJobId"=r."recruiterJobId") and "currentState"='POOL';
   update public."Application" set "recruitment360Status"='REJECTED',"updatedAt"=now()
   where "recruiterJobId"=r."recruiterJobId" and id<>o."applicationId" and "recruitment360Status"='POOL';
   insert into public."Notification"("userId",type,title,body,link,"entityId","recruitmentId","applicationId","actionType","actionPayload",locale,channels)
   select a2."userId",'RECRUITMENT_DECISION','Candidature clôturée','Le recrutement est terminé. Merci pour votre participation.','/career/recruitment360/'||a2.id,o.id,r.id,a2.id,'OPEN_DECISION',jsonb_build_object('outcome','REJECTED'),coalesce(a2.locale,'fr'),jsonb_build_object('email',true,'push',true,'inApp',true)
   from public."Application" a2 where a2."recruiterJobId"=r."recruiterJobId" and a2.id<>o."applicationId" and a2."userId" is not null and a2."recruitment360Status"='REJECTED';
 end if;
 insert into public."RecruitmentOfferNegotiation"("offerId","actorUserId","actorRole",action,"proposedSalary",channel,message)
 values(o.id,p_actor_user_id,'TALENT',p_action,p_salary,p_channel,coalesce(nullif(trim(p_message),''),case p_action when 'ACCEPT' then 'Offre acceptée.' when 'DECLINE' then 'Offre déclinée.' else 'Contre-proposition envoyée.' end));
 return o;
end; $$;

create or replace function public.recruitment360_lot6_get_workspace(p_application_id uuid,p_actor_user_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public."Application";r public."Recruitment360";d public."RecruitmentDecision";o public."RecruitmentOffer";p public."RecruitmentDecisionPolicy";rec jsonb;neg jsonb;
begin
 select * into a from public."Application" where id=p_application_id;
 if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
 select * into r from public."Recruitment360" where "recruiterJobId"=a."recruiterJobId";
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DG_READONLY','JURY','DELEGATE')) and a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
 select * into d from public."RecruitmentDecision" where "applicationId"=a.id;
 select * into o from public."RecruitmentOffer" where "applicationId"=a.id;
 select * into p from public."RecruitmentDecisionPolicy" where "recruitmentId"=r.id;
 select coalesce(jsonb_agg(n order by n."createdAt"),'[]'::jsonb) into neg from public."RecruitmentOfferNegotiation" n where n."offerId"=o.id;
 select jsonb_build_object(
  'application',to_jsonb(a),
  'recruitment',to_jsonb(r),
  'decision',to_jsonb(d),
  'offer',to_jsonb(o),
  'policy',to_jsonb(p),
  'votes',coalesce((select jsonb_agg(v order by v."submittedAt") from public."RecruitmentDecisionVote" v where v."decisionId"=d.id),'[]'::jsonb),
  'approvals',coalesce((select jsonb_agg(ap order by ap.role) from public."RecruitmentDecisionApproval" ap where ap."decisionId"=d.id),'[]'::jsonb),
  'references',coalesce((select jsonb_agg(ref order by ref."createdAt") from public."RecruitmentDecisionReference" ref where ref."applicationId"=a.id),'[]'::jsonb),
  'recommendation',(select to_jsonb(j) from public."RecruitmentDecisionRecommendation" j where j."decisionId"=d.id),
  'negotiations',neg
 ) into rec;
 return rec;
end; $$;

revoke execute on function public.recruitment360_lot6_set_policy(uuid,text,numeric,numeric,numeric,boolean,boolean,integer,integer,text) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot6_submit_vote(uuid,text,text,numeric,text,uuid) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot6_submit_approval(uuid,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot6_send_offer(uuid,text,integer,timestamptz,text,text) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot6_respond_offer(uuid,text,text,integer,text,text,date) from public,anon,authenticated;
revoke execute on function public.recruitment360_lot6_get_workspace(uuid,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot6_set_policy(uuid,text,numeric,numeric,numeric,boolean,boolean,integer,integer,text) to service_role;
grant execute on function public.recruitment360_lot6_submit_vote(uuid,text,text,numeric,text,uuid) to service_role;
grant execute on function public.recruitment360_lot6_submit_approval(uuid,text,text,text,text) to service_role;
grant execute on function public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb) to service_role;
grant execute on function public.recruitment360_lot6_send_offer(uuid,text,integer,timestamptz,text,text) to service_role;
grant execute on function public.recruitment360_lot6_respond_offer(uuid,text,text,integer,text,text,date) to service_role;
grant execute on function public.recruitment360_lot6_get_workspace(uuid,text) to service_role;

insert into public."RecruitmentDecisionPolicy"("recruitmentId")
select r.id from public."Recruitment360" r
where not exists(select 1 from public."RecruitmentDecisionPolicy" p where p."recruitmentId"=r.id);
