-- Recruitment 360° Lot 6 — Decision
create table if not exists public."RecruitmentDecision"(
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid not null unique references public."Application"(id) on delete cascade,
 outcome text not null check(outcome in('OFFER','HIRED','REJECTED','POOL')),
 "decisionAt" timestamptz not null default now(),
 "decidedByUserId" text not null references public."User"(id) on delete restrict,
 rationale text not null check(length(trim(rationale))>=5),
 "scoreTotal" numeric(8,3) check("scoreTotal" is null or ("scoreTotal">=0 and "scoreTotal"<=100)),
 "scoreBreakdown" jsonb not null default '{}'::jsonb,
 "nextAction" text check("nextAction" is null or "nextAction" in('PREPARE_OFFER','NOTIFY_REJECTION','KEEP_POOL','CLOSE_RECRUITMENT')),
 "createdAt" timestamptz not null default now(),"updatedAt" timestamptz not null default now()
);
create table if not exists public."RecruitmentDecisionVote"(
 id uuid primary key default gen_random_uuid(),
 "decisionId" uuid not null references public."RecruitmentDecision"(id) on delete cascade,
 "interviewId" uuid references public."RecruitmentInterview"(id) on delete set null,
 "juryUserId" text not null references public."User"(id) on delete cascade,
 recommendation text not null check(recommendation in('STRONG_YES','YES','RESERVE','NO','STRONG_NO')),
 score numeric(8,3) check(score is null or(score>=0 and score<=100)),
 rationale text,"submittedAt" timestamptz not null default now(),
 unique("decisionId","juryUserId")
);
create index if not exists "RecruitmentDecision_recruitmentId_idx" on public."RecruitmentDecision"("recruitmentId","decisionAt" desc);
create index if not exists "RecruitmentDecisionVote_decisionId_idx" on public."RecruitmentDecisionVote"("decisionId");
alter table public."RecruitmentDecision" enable row level security;
alter table public."RecruitmentDecisionVote" enable row level security;
revoke all on public."RecruitmentDecision",public."RecruitmentDecisionVote" from anon,authenticated;
grant select on public."RecruitmentDecision",public."RecruitmentDecisionVote" to authenticated;
create policy "Recruitment members can read decisions" on public."RecruitmentDecision" for select to authenticated using(
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentDecision"."recruitmentId" and rr."authUserId"=(select auth.uid()))
 or exists(select 1 from public."Application" a where a.id="RecruitmentDecision"."applicationId" and a."userId"::text=(select u.id::text from public."User" u where u."authUserId"=(select auth.uid())::text limit 1))
);
create policy "Recruitment members can read decision votes" on public."RecruitmentDecisionVote" for select to authenticated using(
 exists(select 1 from public."RecruitmentDecision" d join public."RecruitmentRole" rr on rr."recruitmentId"=d."recruitmentId" where d.id="RecruitmentDecisionVote"."decisionId" and rr."authUserId"=(select auth.uid()))
 or "juryUserId"=(select u.id::text from public."User" u where u."authUserId"=(select auth.uid())::text limit 1)
);

create or replace function public.recruitment360_lot6_submit_vote(p_application_id uuid,p_actor_user_id text,p_recommendation text,p_score numeric default null,p_rationale text default null,p_interview_id uuid default null)
returns public."RecruitmentDecision" language plpgsql security definer set search_path='' as $$
declare v_rid uuid;v_did uuid;v_d public."RecruitmentDecision";
begin
 if p_recommendation not in('STRONG_YES','YES','RESERVE','NO','STRONG_NO') then raise exception 'INVALID_RECOMMENDATION';end if;
 if p_score is not null and(p_score<0 or p_score>100) then raise exception 'INVALID_SCORE';end if;
 select r.id into v_rid from public."Recruitment360" r join public."Application" a on a."recruiterJobId"=r."recruiterJobId" where a.id=p_application_id;
 if v_rid is null then raise exception 'APPLICATION_360_NOT_FOUND';end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_rid and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','JURY','DELEGATE')) then raise exception 'FORBIDDEN';end if;
 select id into v_did from public."RecruitmentDecision" where "applicationId"=p_application_id;
 if v_did is null then
  insert into public."RecruitmentDecision"("recruitmentId","applicationId",outcome,"decidedByUserId",rationale,"nextAction") values(v_rid,p_application_id,'POOL',p_actor_user_id,'Decision en préparation.','KEEP_POOL') returning id into v_did;
 end if;
 insert into public."RecruitmentDecisionVote"("decisionId","interviewId","juryUserId",recommendation,score,rationale)
 values(v_did,p_interview_id,p_actor_user_id,p_recommendation,p_score,p_rationale)
 on conflict("decisionId","juryUserId") do update set "interviewId"=excluded."interviewId",recommendation=excluded.recommendation,score=excluded.score,rationale=excluded.rationale,"submittedAt"=now();
 select * into v_d from public."RecruitmentDecision" where id=v_did;
 return v_d;
end;$$;
revoke execute on function public.recruitment360_lot6_submit_vote(uuid,text,text,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.recruitment360_lot6_submit_vote(uuid,text,text,numeric,text,uuid) to service_role;

create or replace function public.recruitment360_lot6_finalize_decision(p_application_id uuid,p_actor_user_id text,p_outcome text,p_rationale text,p_next_action text default null,p_score_total numeric default null,p_score_breakdown jsonb default '{}'::jsonb)
returns public."RecruitmentDecision" language plpgsql security definer set search_path='' as $$
declare v_rid uuid;v_d public."RecruitmentDecision";v_state text;v_old text;
begin
 if p_outcome not in('OFFER','HIRED','REJECTED','POOL') then raise exception 'INVALID_OUTCOME';end if;
 if coalesce(length(trim(p_rationale)),0)<5 then raise exception 'DECISION_RATIONALE_REQUIRED';end if;
 if p_score_total is not null and(p_score_total<0 or p_score_total>100) then raise exception 'INVALID_SCORE';end if;
 select r.id into v_rid from public."Recruitment360" r join public."Application" a on a."recruiterJobId"=r."recruiterJobId" where a.id=p_application_id for update;
 if v_rid is null then raise exception 'APPLICATION_360_NOT_FOUND';end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=v_rid and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN';end if;
 select "currentState" into v_state from public."RecruitmentApplicationState" where "applicationId"=p_application_id for update;
 if v_state not in('TEST','SELECTED','INTERVIEW','FINALIST','OFFER','POOL') then raise exception 'INVALID_DECISION_STAGE';end if;
 select outcome into v_old from public."RecruitmentDecision" where "applicationId"=p_application_id for update;
 if v_old in('REJECTED','HIRED') and v_old<>p_outcome then raise exception 'DECISION_LOCKED';end if;
 insert into public."RecruitmentDecision"("recruitmentId","applicationId",outcome,"decidedByUserId",rationale,"nextAction","scoreTotal","scoreBreakdown")
 values(v_rid,p_application_id,p_outcome,p_actor_user_id,p_rationale,p_next_action,p_score_total,coalesce(p_score_breakdown,'{}'::jsonb))
 on conflict("applicationId") do update set outcome=excluded.outcome,"decidedByUserId"=excluded."decidedByUserId",rationale=excluded.rationale,"nextAction"=excluded."nextAction","scoreTotal"=excluded."scoreTotal","scoreBreakdown"=excluded."scoreBreakdown","decisionAt"=now(),"updatedAt"=now()
 returning * into v_d;
 update public."RecruitmentApplicationState" set "currentState"=p_outcome,"stepNumber"=case p_outcome when 'OFFER' then 7 when 'HIRED' then 8 else 9 end,"lockedAt"=case when p_outcome in('REJECTED','HIRED') then now() else "lockedAt" end,"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=p_application_id;
 update public."Application" set "recruitment360Status"=p_outcome,"updatedAt"=now() where id=p_application_id;
 insert into public."RecruitmentAuditLog"("recruitmentId","applicationId","actorUserId",action,"fromState","toState",metadata) values(v_rid,p_application_id,p_actor_user_id,'DECISION_FINALIZED',v_state,p_outcome,jsonb_build_object('outcome',p_outcome,'nextAction',p_next_action,'scoreTotal',p_score_total));
 return v_d;
end;$$;
revoke execute on function public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb) to service_role;

create or replace function public.recruitment360_lot6_list_candidates(p_recruitment_id uuid,p_actor_user_id text)
returns table(application_id uuid,candidate_state text,decision_outcome text,decision_at timestamptz,score_total numeric,rationale text)
language sql security definer set search_path='' as $$
 select a.id,ras."currentState",d.outcome,d."decisionAt",d."scoreTotal",d.rationale
 from public."Application" a
 join public."Recruitment360" r on r."recruiterJobId"=a."recruiterJobId"
 join public."RecruitmentApplicationState" ras on ras."applicationId"=a.id
 left join public."RecruitmentDecision" d on d."applicationId"=a.id
 where r.id=p_recruitment_id
 and exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=p_recruitment_id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE','JURY'))
 and ras."currentState" in('TEST','SELECTED','INTERVIEW','FINALIST','OFFER','POOL','REJECTED','HIRED')
 order by coalesce(d."decisionAt",'infinity'::timestamptz),a.id;
$$;
revoke execute on function public.recruitment360_lot6_list_candidates(uuid,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot6_list_candidates(uuid,text) to service_role;
