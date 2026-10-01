-- Jobly Recruitment 360° v2 — Lot 4: tests
create table if not exists public."RecruitmentTestDefinition" (
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 title text not null,
 instructions text not null default '',
 durationSeconds integer not null check(durationSeconds between 60 and 86400),
 maxAttempts integer not null default 1 check(maxAttempts between 1 and 5),
 status text not null default 'DRAFT' check(status in('DRAFT','PUBLISHED','CLOSED')),
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now()
);
create table if not exists public."RecruitmentTestQuestion" (
 id uuid primary key default gen_random_uuid(),
 "testId" uuid not null references public."RecruitmentTestDefinition"(id) on delete cascade,
 position integer not null check(position>0),
 prompt text not null,
 type text not null check(type in('SINGLE_CHOICE','MULTIPLE_CHOICE','TEXT','NUMBER')),
 options jsonb not null default '[]'::jsonb,
 points numeric(8,2) not null default 1 check(points>0),
 metadata jsonb not null default '{}'::jsonb,
 unique("testId",position)
);
create table if not exists public."RecruitmentTestSession" (
 id uuid primary key default gen_random_uuid(),
 "testId" uuid not null references public."RecruitmentTestDefinition"(id) on delete cascade,
 "applicationId" uuid not null references public."Application"(id) on delete cascade,
 attempt integer not null check(attempt>0),
 status text not null default 'CREATED' check(status in('CREATED','RUNNING','SUBMITTED','EXPIRED','ABANDONED')),
 "startedAt" timestamptz,
 "expiresAt" timestamptz,
 "submittedAt" timestamptz,
 "lastHeartbeatAt" timestamptz,
 score numeric(8,2),
 "createdAt" timestamptz not null default now(),
 unique("testId","applicationId",attempt)
);
create table if not exists public."RecruitmentTestAnswer" (
 id uuid primary key default gen_random_uuid(),
 "sessionId" uuid not null references public."RecruitmentTestSession"(id) on delete cascade,
 "questionId" uuid not null references public."RecruitmentTestQuestion"(id) on delete cascade,
 answer jsonb not null default 'null'::jsonb,
 "answeredAt" timestamptz not null default now(),
 unique("sessionId","questionId")
);
create table if not exists public."RecruitmentTestEvent" (
 id uuid primary key default gen_random_uuid(),
 "sessionId" uuid not null references public."RecruitmentTestSession"(id) on delete cascade,
 event text not null,
 metadata jsonb not null default '{}'::jsonb,
 "createdAt" timestamptz not null default now()
);
create index if not exists "RecruitmentTestSession_applicationId_idx" on public."RecruitmentTestSession"("applicationId");
create index if not exists "RecruitmentTestSession_expiresAt_idx" on public."RecruitmentTestSession"("expiresAt");
create index if not exists "RecruitmentTestEvent_sessionId_createdAt_idx" on public."RecruitmentTestEvent"("sessionId","createdAt");
alter table public."RecruitmentTestDefinition" enable row level security;
alter table public."RecruitmentTestQuestion" enable row level security;
alter table public."RecruitmentTestSession" enable row level security;
alter table public."RecruitmentTestAnswer" enable row level security;
alter table public."RecruitmentTestEvent" enable row level security;
revoke all on public."RecruitmentTestDefinition",public."RecruitmentTestQuestion",public."RecruitmentTestSession",public."RecruitmentTestAnswer",public."RecruitmentTestEvent" from anon,authenticated;
grant select on public."RecruitmentTestDefinition",public."RecruitmentTestQuestion",public."RecruitmentTestSession",public."RecruitmentTestAnswer" to authenticated;
create policy "360 test definitions recruiters" on public."RecruitmentTestDefinition" for select to authenticated using(exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="recruitmentId" and rr."authUserId"=(select auth.uid())));
create policy "360 test questions recruiters" on public."RecruitmentTestQuestion" for select to authenticated using(exists(select 1 from public."RecruitmentTestDefinition" d join public."RecruitmentRole" rr on rr."recruitmentId"=d."recruitmentId" where d.id="testId" and rr."authUserId"=(select auth.uid())));
create policy "360 test session candidate or recruiter" on public."RecruitmentTestSession" for select to authenticated using(
 exists(select 1 from public."Application" a where a.id="applicationId" and a."userId"::text=(select u.id::text from public."User" u where u."authUserId"=(select auth.uid())::text limit 1))
 or exists(select 1 from public."RecruitmentTestDefinition" d join public."RecruitmentRole" rr on rr."recruitmentId"=d."recruitmentId" where d.id="testId" and rr."authUserId"=(select auth.uid()))
);
create policy "360 test answers candidate or recruiter" on public."RecruitmentTestAnswer" for select to authenticated using(
 exists(select 1 from public."RecruitmentTestSession" s join public."Application" a on a.id=s."applicationId" where s.id="sessionId" and a."userId"::text=(select u.id::text from public."User" u where u."authUserId"=(select auth.uid())::text limit 1))
);
create or replace function public.recruitment360_lot4_start_session(p_test_id uuid,p_application_id uuid,p_actor_user_id text)
returns public."RecruitmentTestSession" language plpgsql security definer set search_path=''
as $$
declare d public."RecruitmentTestDefinition"; a public."Application"; s public."RecruitmentTestSession"; attempt_no integer;
begin
 select * into d from public."RecruitmentTestDefinition" where id=p_test_id and status='PUBLISHED';
 if not found then raise exception 'TEST_NOT_FOUND'; end if;
 select * into a from public."Application" where id=p_application_id;
 if not found or a."recruiterJobId" is null then raise exception 'APPLICATION_NOT_FOUND'; end if;
 if not exists(select 1 from public."Recruitment360" r where r."recruiterJobId"=a."recruiterJobId" and exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE'))) and a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
 select coalesce(max(attempt),0)+1 into attempt_no from public."RecruitmentTestSession" where "testId"=p_test_id and "applicationId"=p_application_id;
 if attempt_no>d."maxAttempts" then raise exception 'MAX_ATTEMPTS_REACHED'; end if;
 insert into public."RecruitmentTestSession"("testId","applicationId",attempt,status,"startedAt","expiresAt","lastHeartbeatAt")
 values(p_test_id,p_application_id,attempt_no,'RUNNING',now(),now()+make_interval(secs=>d."durationSeconds"),now()) returning * into s;
 insert into public."RecruitmentTestEvent"("sessionId",event,metadata) values(s.id,'START',jsonb_build_object('serverStartedAt',s."startedAt",'serverExpiresAt',s."expiresAt"));
 return s;
end; $$;
create or replace function public.recruitment360_lot4_save_answer(p_session_id uuid,p_question_id uuid,p_answer jsonb,p_actor_user_id text)
returns public."RecruitmentTestAnswer" language plpgsql security definer set search_path=''
as $$
declare s public."RecruitmentTestSession"; a public."Application"; q public."RecruitmentTestQuestion"; outrow public."RecruitmentTestAnswer";
begin
 select * into s from public."RecruitmentTestSession" where id=p_session_id for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 select * into q from public."RecruitmentTestQuestion" where id=p_question_id and "testId"=s."testId";
 if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
 select * into a from public."Application" where id=s."applicationId";
 if not found or a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
 if s.status<>'RUNNING' then raise exception 'SESSION_NOT_RUNNING'; end if;
 if s."expiresAt"<=now() then update public."RecruitmentTestSession" set status='EXPIRED' where id=s.id; insert into public."RecruitmentTestEvent"("sessionId",event) values(s.id,'EXPIRED'); raise exception 'SESSION_EXPIRED'; end if;
 insert into public."RecruitmentTestAnswer"("sessionId","questionId",answer) values(s.id,p_question_id,coalesce(p_answer,'null'::jsonb))
 on conflict("sessionId","questionId") do update set answer=excluded.answer,"answeredAt"=now()
 returning * into outrow;
 update public."RecruitmentTestSession" set "lastHeartbeatAt"=now() where id=s.id;
 return outrow;
end; $$;
create or replace function public.recruitment360_lot4_heartbeat(p_session_id uuid,p_actor_user_id text)
returns public."RecruitmentTestSession" language plpgsql security definer set search_path=''
as $$
declare s public."RecruitmentTestSession"; a public."Application";
begin
 select * into s from public."RecruitmentTestSession" where id=p_session_id for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 select * into a from public."Application" where id=s."applicationId";
 if not found or a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
 if s.status<>'RUNNING' then return s; end if;
 if s."expiresAt"<=now() then update public."RecruitmentTestSession" set status='EXPIRED',"lastHeartbeatAt"=now() where id=s.id returning * into s; insert into public."RecruitmentTestEvent"("sessionId",event) values(s.id,'EXPIRED'); return s; end if;
 update public."RecruitmentTestSession" set "lastHeartbeatAt"=now() where id=s.id returning * into s;
 return s;
end; $$;
create or replace function public.recruitment360_lot4_submit_session(p_session_id uuid,p_actor_user_id text)
returns public."RecruitmentTestSession" language plpgsql security definer set search_path=''
as $$
declare s public."RecruitmentTestSession"; a public."Application"; q record; ans jsonb; earned numeric:=0; total numeric:=0; submitted public."RecruitmentTestSession";
begin
 select * into s from public."RecruitmentTestSession" where id=p_session_id for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 select * into a from public."Application" where id=s."applicationId";
 if not found or a."userId"::text<>p_actor_user_id then raise exception 'FORBIDDEN'; end if;
 if s.status<>'RUNNING' then return s; end if;
 for q in select * from public."RecruitmentTestQuestion" where "testId"=s."testId" loop
   total:=total+q.points;
   select answer into ans from public."RecruitmentTestAnswer" where "sessionId"=s.id and "questionId"=q.id;
   if q.type in('SINGLE_CHOICE','NUMBER') and ans is not null and ans->>'value'=q.options->>'correct' then earned:=earned+q.points; end if;
 end loop;
 update public."RecruitmentTestSession" set status=case when "expiresAt"<=now() then 'EXPIRED' else 'SUBMITTED' end,"submittedAt"=now(),score=case when total>0 then round(earned/total*100,2) else null end,"lastHeartbeatAt"=now() where id=s.id returning * into submitted;
 insert into public."RecruitmentTestEvent"("sessionId",event,metadata) values(s.id,case when submitted.status='EXPIRED' then 'AUTO_EXPIRE' else 'SUBMIT' end,jsonb_build_object('score',submitted.score));
 if submitted.status='SUBMITTED' then
   update public."RecruitmentApplicationState" set "currentState"='TEST',"stepNumber"=4,"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=a.id;
   update public."Application" set "recruitment360Status"='TEST',"updatedAt"=now() where id=a.id;
   insert into public."RecruitmentAuditLog"("applicationId","actorUserId",action,"toState") values(a.id,p_actor_user_id,'TEST_SUBMITTED','TEST');
 end if;
 return submitted;
end; $$;
revoke all on function public.recruitment360_lot4_start_session(uuid,uuid,text),public.recruitment360_lot4_save_answer(uuid,uuid,jsonb,text),public.recruitment360_lot4_heartbeat(uuid,text),public.recruitment360_lot4_submit_session(uuid,text) from public,anon,authenticated;
grant execute on function public.recruitment360_lot4_start_session(uuid,uuid,text),public.recruitment360_lot4_save_answer(uuid,uuid,jsonb,text),public.recruitment360_lot4_heartbeat(uuid,text),public.recruitment360_lot4_submit_session(uuid,text) to service_role;