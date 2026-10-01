-- Jobly Recruitment 360° v2 — Lot 5: Entretiens
create table if not exists public."RecruitmentInterviewSlot" (
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid references public."Application"(id) on delete cascade,
 "startsAt" timestamptz not null, "endsAt" timestamptz not null,
 timezone text not null default 'Africa/Douala',
 capacity integer not null default 1 check (capacity between 1 and 20),
 status text not null default 'OPEN' check(status in('OPEN','HELD','BOOKED','CLOSED')),
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "createdAt" timestamptz not null default now(), "updatedAt" timestamptz not null default now(),
 check("endsAt">"startsAt")
);
create table if not exists public."RecruitmentInterview" (
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid not null references public."Application"(id) on delete cascade,
 "slotId" uuid references public."RecruitmentInterviewSlot"(id) on delete set null,
 title text not null default 'Entretien Jobly',
 "startsAt" timestamptz not null, "endsAt" timestamptz not null,
 timezone text not null default 'Africa/Douala',
 status text not null default 'SCHEDULED' check(status in('SCHEDULED','CONFIRMED','STARTED','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED')),
 "meetingProvider" text not null default 'EXTERNAL' check("meetingProvider" in('GOOGLE_MEET','EXTERNAL','JOBLY_NATIVE')),
 "meetingUrl" text, "meetingSpaceName" text, location text, notes text,
 "candidateConfirmedAt" timestamptz, "recruiterConfirmedAt" timestamptz,
 "cancelledAt" timestamptz, "cancellationReason" text,
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "createdAt" timestamptz not null default now(), "updatedAt" timestamptz not null default now(),
 check("endsAt">"startsAt"),
 check("meetingProvider"='JOBLY_NATIVE' or "meetingUrl" is not null or status='CANCELLED')
);
create table if not exists public."RecruitmentInterviewJury" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "userId" text not null references public."User"(id) on delete cascade,
 role text not null default 'JURY' check(role in('JURY','OWNER','HR','MANAGER')),
 weight numeric(6,3) not null default 1 check(weight>0),
 "presenceStatus" text not null default 'INVITED' check("presenceStatus" in('INVITED','CONFIRMED','PRESENT','NO_SHOW')),
 "joinedAt" timestamptz, "leftAt" timestamptz, "createdAt" timestamptz not null default now(),
 unique("interviewId","userId")
);
create table if not exists public."RecruitmentInterviewAttendance" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "userId" uuid, "participantUserId" text,
 participantRole text not null check(participantRole in('CANDIDATE','JURY','RECRUITER')),
 status text not null default 'INVITED' check(status in('INVITED','CONFIRMED','PRESENT','NO_SHOW')),
 "joinedAt" timestamptz, "leftAt" timestamptz,
 "source" text not null default 'JOBLY' check("source" in('JOBLY','GOOGLE_MEET','MANUAL')),
 "createdAt" timestamptz not null default now(),
 unique("interviewId","participantRole","participantUserId")
);
create table if not exists public."RecruitmentInterviewReminder" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "reminderType" text not null check("reminderType" in('30_MIN','5_MIN')),
 "scheduledFor" timestamptz not null,
 status text not null default 'PENDING' check(status in('PENDING','SENT','CANCELLED')),
 "sentAt" timestamptz, "createdAt" timestamptz not null default now(),
 unique("interviewId","reminderType")
);
create index if not exists "RecruitmentInterview_recruitment_starts_idx" on public."RecruitmentInterview"("recruitmentId","startsAt");
create index if not exists "RecruitmentInterview_application_starts_idx" on public."RecruitmentInterview"("applicationId","startsAt");
create index if not exists "RecruitmentInterviewSlot_recruitment_starts_idx" on public."RecruitmentInterviewSlot"("recruitmentId","startsAt");
create index if not exists "RecruitmentInterviewReminder_due_idx" on public."RecruitmentInterviewReminder"(status,"scheduledFor");

alter table public."RecruitmentInterviewSlot" enable row level security;
alter table public."RecruitmentInterview" enable row level security;
alter table public."RecruitmentInterviewJury" enable row level security;
alter table public."RecruitmentInterviewAttendance" enable row level security;
alter table public."RecruitmentInterviewReminder" enable row level security;
revoke all on public."RecruitmentInterviewSlot" from anon,authenticated;
revoke all on public."RecruitmentInterview" from anon,authenticated;
revoke all on public."RecruitmentInterviewJury" from anon,authenticated;
revoke all on public."RecruitmentInterviewAttendance" from anon,authenticated;
revoke all on public."RecruitmentInterviewReminder" from anon,authenticated;
grant select on public."RecruitmentInterviewSlot",public."RecruitmentInterview",public."RecruitmentInterviewJury",public."RecruitmentInterviewAttendance" to authenticated;

create policy "interview slots visible to recruitment members" on public."RecruitmentInterviewSlot" for select to authenticated using (
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentInterviewSlot"."recruitmentId" and rr."authUserId"=(select auth.uid()))
);
create policy "interviews visible to recruitment members" on public."RecruitmentInterview" for select to authenticated using (
 exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"="RecruitmentInterview"."recruitmentId" and rr."authUserId"=(select auth.uid()))
);
create policy "jury visible to recruitment members" on public."RecruitmentInterviewJury" for select to authenticated using (
 exists(select 1 from public."RecruitmentInterview" i join public."RecruitmentRole" rr on rr."recruitmentId"=i."recruitmentId" where i.id="RecruitmentInterviewJury"."interviewId" and rr."authUserId"=(select auth.uid()))
);
create policy "attendance visible to recruitment members" on public."RecruitmentInterviewAttendance" for select to authenticated using (
 exists(select 1 from public."RecruitmentInterview" i join public."RecruitmentRole" rr on rr."recruitmentId"=i."recruitmentId" where i.id="RecruitmentInterviewAttendance"."interviewId" and rr."authUserId"=(select auth.uid()))
);

create or replace function public.recruitment360_lot5_create_slot(p_recruiter_job_id uuid,p_actor_user_id text,p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text default 'Africa/Douala',p_capacity integer default 1,p_application_id uuid default null)
returns public."RecruitmentInterviewSlot" language plpgsql security definer set search_path='' as $$
declare r public."Recruitment360"; s public."RecruitmentInterviewSlot";
begin
 select * into r from public."Recruitment360" where "recruiterJobId"=p_recruiter_job_id for update;
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 if r."currentState" not in('PUBLISHED','EXTENDED') then raise exception 'RECRUITMENT_NOT_OPEN'; end if;
 if p_starts_at<=now() or p_ends_at<=p_starts_at then raise exception 'INVALID_SLOT'; end if;
 if p_capacity not between 1 and 20 then raise exception 'INVALID_CAPACITY'; end if;
 if p_application_id is not null and not exists(select 1 from public."Application" a where a.id=p_application_id and a."recruiterJobId"=p_recruiter_job_id) then raise exception 'APPLICATION_NOT_IN_RECRUITMENT'; end if;
 insert into public."RecruitmentInterviewSlot"("recruitmentId","applicationId","startsAt","endsAt",timezone,capacity,"createdByUserId")
 values(r.id,p_application_id,p_starts_at,p_ends_at,coalesce(nullif(trim(p_timezone),''),'Africa/Douala'),p_capacity,p_actor_user_id) returning * into s;
 return s;
end; $$;

create or replace function public.recruitment360_lot5_schedule(p_recruiter_job_id uuid,p_actor_user_id text,p_application_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text default 'Africa/Douala',p_title text default 'Entretien Jobly',p_meeting_provider text default 'EXTERNAL',p_meeting_url text default null,p_location text default null,p_notes text default null,p_slot_id uuid default null,p_jury jsonb default '[]'::jsonb)
returns public."RecruitmentInterview" language plpgsql security definer set search_path='' as $$
declare r public."Recruitment360"; a public."Application"; i public."RecruitmentInterview"; s public."RecruitmentInterviewSlot"; x jsonb; uid text; candidate uuid; cur text;
begin
 select * into r from public."Recruitment360" where "recruiterJobId"=p_recruiter_job_id for update;
 if not found then raise exception 'RECRUITMENT_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 select * into a from public."Application" where id=p_application_id and "recruiterJobId"=p_recruiter_job_id for update;
 if not found then raise exception 'APPLICATION_NOT_IN_RECRUITMENT'; end if;
 if p_starts_at<=now() or p_ends_at<=p_starts_at then raise exception 'INVALID_INTERVIEW_TIME'; end if;
 if p_meeting_provider not in('GOOGLE_MEET','EXTERNAL','JOBLY_NATIVE') then raise exception 'INVALID_MEETING_PROVIDER'; end if;
 if p_meeting_provider<>'JOBLY_NATIVE' and coalesce(trim(p_meeting_url),'')='' then raise exception 'MEETING_URL_REQUIRED'; end if;
 if exists(select 1 from public."RecruitmentInterview" z where z."applicationId"=p_application_id and z.status in('SCHEDULED','CONFIRMED','STARTED') and z."endsAt">now()) then raise exception 'ACTIVE_INTERVIEW_EXISTS'; end if;
 if p_slot_id is not null then
   select * into s from public."RecruitmentInterviewSlot" where id=p_slot_id and "recruitmentId"=r.id for update;
   if not found or s.status not in('OPEN','HELD') then raise exception 'SLOT_NOT_AVAILABLE'; end if;
   if s."startsAt"<>p_starts_at or s."endsAt"<>p_ends_at then raise exception 'SLOT_TIME_MISMATCH'; end if;
   update public."RecruitmentInterviewSlot" set status='BOOKED',"applicationId"=p_application_id,"updatedAt"=now() where id=s.id;
 end if;
 insert into public."RecruitmentInterview"("recruitmentId","applicationId","slotId",title,"startsAt","endsAt",timezone,status,"meetingProvider","meetingUrl",location,notes,"createdByUserId")
 values(r.id,p_application_id,p_slot_id,coalesce(nullif(trim(p_title),''),'Entretien Jobly'),p_starts_at,p_ends_at,coalesce(nullif(trim(p_timezone),''),'Africa/Douala'),'SCHEDULED',p_meeting_provider,nullif(trim(p_meeting_url),''),nullif(trim(p_location),''),nullif(trim(p_notes),''),p_actor_user_id) returning * into i;
 for x in select * from jsonb_array_elements(case when jsonb_typeof(p_jury)='array' then p_jury else '[]'::jsonb end) loop
   uid:=nullif(trim(x->>'userId'),'');
   if uid is not null then
     if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=r.id and rr."userId"=uid and rr.role in('JURY','OWNER','HR','MANAGER','DELEGATE')) then raise exception 'JURY_MEMBER_FORBIDDEN'; end if;
     insert into public."RecruitmentInterviewJury"("interviewId","userId",role,weight) values(i.id,uid,coalesce(nullif(x->>'role',''),'JURY'),coalesce(nullif(x->>'weight','')::numeric,1)) on conflict("interviewId","userId") do update set role=excluded.role,weight=excluded.weight;
   end if;
 end loop;
 candidate:=a."userId";
 insert into public."RecruitmentInterviewAttendance"("interviewId","userId","participantUserId",participantRole,status) values(i.id,candidate,candidate::text,'CANDIDATE','INVITED') on conflict do nothing;
 insert into public."RecruitmentInterviewReminder"("interviewId","reminderType","scheduledFor") values(i.id,'30_MIN',p_starts_at-interval '30 minutes'),(i.id,'5_MIN',p_starts_at-interval '5 minutes') on conflict("interviewId","reminderType") do update set "scheduledFor"=excluded."scheduledFor",status='PENDING',"sentAt"=null;
 cur:=coalesce((select "currentState" from public."RecruitmentApplicationState" where "applicationId"=a.id),'REVIEW');
 if cur not in('INTERVIEW','FINALIST','OFFER','HIRED','REJECTED','WITHDRAWN','OFFER_DECLINED') then
   update public."RecruitmentApplicationState" set "currentState"='INTERVIEW',"stepNumber"=5,"lastTransitionAt"=now(),"updatedAt"=now() where "applicationId"=a.id;
   update public."Application" set "recruitment360Status"='INTERVIEW',"updatedAt"=now() where id=a.id;
   insert into public."RecruitmentAuditLog"("recruitmentId","applicationId","actorUserId",action,"fromState","toState") values(r.id,a.id,p_actor_user_id,'INTERVIEW_SCHEDULED',cur,'INTERVIEW');
 end if;
 insert into public."Notification"("userId",type,title,body,link,"entityId","recruitmentId","applicationId","actionType","actionPayload")
 values(candidate,'RECRUITMENT_INTERVIEW','Entretien planifié','Votre entretien de recrutement est planifié. Ouvrez Jobly pour voir le créneau et le lien.','/career',i.id::text,r.id,a.id,'OPEN_INTERVIEW',jsonb_build_object('interviewId',i.id));
 return i;
end; $$;

create or replace function public.recruitment360_lot5_update_presence(p_interview_id uuid,p_actor_user_id text,p_participant_user_id text,p_status text,p_role text default 'JURY')
returns public."RecruitmentInterviewAttendance" language plpgsql security definer set search_path='' as $$
declare i public."RecruitmentInterview"; a public."RecruitmentInterviewAttendance";
begin
 select * into i from public."RecruitmentInterview" where id=p_interview_id for update;
 if not found then raise exception 'INTERVIEW_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=i."recruitmentId" and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','JURY','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 if p_status not in('INVITED','CONFIRMED','PRESENT','NO_SHOW') or p_role not in('CANDIDATE','JURY','RECRUITER') then raise exception 'INVALID_PRESENCE'; end if;
 update public."RecruitmentInterviewAttendance" set status=p_status,"joinedAt"=case when p_status='PRESENT' then coalesce("joinedAt",now()) else "joinedAt" end,"leftAt"=case when p_status='NO_SHOW' then coalesce("leftAt",now()) else "leftAt" end where "interviewId"=p_interview_id and participantRole=p_role and coalesce("participantUserId",'')=coalesce(p_participant_user_id,'');
 if not found then insert into public."RecruitmentInterviewAttendance"("interviewId","participantUserId",participantRole,status,source) values(p_interview_id,p_participant_user_id,p_role,p_status,'MANUAL') returning * into a; else select * into a from public."RecruitmentInterviewAttendance" where "interviewId"=p_interview_id and participantRole=p_role and coalesce("participantUserId",'')=coalesce(p_participant_user_id,'') limit 1; end if;
 if p_role='JURY' then update public."RecruitmentInterviewJury" set "presenceStatus"=p_status where "interviewId"=p_interview_id and "userId"=p_participant_user_id; end if;
 return a;
end; $$;

create or replace function public.recruitment360_lot5_change_status(p_interview_id uuid,p_actor_user_id text,p_status text,p_reason text default null)
returns public."RecruitmentInterview" language plpgsql security definer set search_path='' as $$
declare i public."RecruitmentInterview";
begin
 select * into i from public."RecruitmentInterview" where id=p_interview_id for update;
 if not found then raise exception 'INTERVIEW_NOT_FOUND'; end if;
 if not exists(select 1 from public."RecruitmentRole" rr where rr."recruitmentId"=i."recruitmentId" and rr."userId"=p_actor_user_id and rr.role in('OWNER','HR','MANAGER','JURY','DELEGATE')) then raise exception 'FORBIDDEN'; end if;
 if p_status not in('CONFIRMED','STARTED','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED') then raise exception 'INVALID_INTERVIEW_STATUS'; end if;
 if p_status='CANCELLED' and length(trim(coalesce(p_reason,'')))<5 then raise exception 'CANCELLATION_REASON_REQUIRED'; end if;
 update public."RecruitmentInterview" set status=p_status,"recruiterConfirmedAt"=case when p_status='CONFIRMED' then now() else "recruiterConfirmedAt" end,"cancelledAt"=case when p_status='CANCELLED' then now() else "cancelledAt" end,"cancellationReason"=case when p_status='CANCELLED' then trim(p_reason) else "cancellationReason" end,"updatedAt"=now() where id=p_interview_id returning * into i;
 if p_status='CANCELLED' then update public."RecruitmentInterviewSlot" set status='OPEN',"updatedAt"=now() where id=i."slotId"; update public."RecruitmentInterviewReminder" set status='CANCELLED' where "interviewId"=i.id and status='PENDING'; end if;
 return i;
end; $$;

create or replace function public.recruitment360_lot5_dispatch_reminders(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare n integer:=0; r record; candidate uuid;
begin
 for r in select ir.id,ir."interviewId",i."applicationId",i."recruitmentId",ir."reminderType" from public."RecruitmentInterviewReminder" ir join public."RecruitmentInterview" i on i.id=ir."interviewId" where ir.status='PENDING' and ir."scheduledFor"<=p_now and i.status in('SCHEDULED','CONFIRMED') for update of ir skip locked loop
   select "userId" into candidate from public."Application" where id=r."applicationId";
   if candidate is not null then insert into public."Notification"("userId",type,title,body,link,"entityId","recruitmentId","applicationId","actionType","actionPayload") values(candidate,'RECRUITMENT_INTERVIEW_REMINDER',case when r."reminderType"='5_MIN' then 'Entretien dans 5 minutes' else 'Entretien dans 30 minutes' end,case when r."reminderType"='5_MIN' then 'Votre entretien commence dans 5 minutes.' else 'Votre entretien commence dans 30 minutes.' end,'/career',r."interviewId"::text,r."recruitmentId",r."applicationId",'OPEN_INTERVIEW',jsonb_build_object('interviewId',r."interviewId")); end if;
   update public."RecruitmentInterviewReminder" set status='SENT',"sentAt"=now() where id=r.id; n:=n+1;
 end loop; return n;
end; $$;

revoke all on function public.recruitment360_lot5_create_slot(uuid,text,timestamptz,timestamptz,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.recruitment360_lot5_schedule(uuid,text,uuid,timestamptz,timestamptz,text,text,text,text,text,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.recruitment360_lot5_update_presence(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.recruitment360_lot5_change_status(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.recruitment360_lot5_dispatch_reminders(timestamptz) from public,anon,authenticated;
grant execute on function public.recruitment360_lot5_create_slot(uuid,text,timestamptz,timestamptz,text,integer,uuid) to service_role;
grant execute on function public.recruitment360_lot5_schedule(uuid,text,uuid,timestamptz,timestamptz,text,text,text,text,text,uuid,jsonb) to service_role;
grant execute on function public.recruitment360_lot5_update_presence(uuid,text,text,text,text) to service_role;
grant execute on function public.recruitment360_lot5_change_status(uuid,text,text,text) to service_role;
grant execute on function public.recruitment360_lot5_dispatch_reminders(timestamptz) to service_role;
