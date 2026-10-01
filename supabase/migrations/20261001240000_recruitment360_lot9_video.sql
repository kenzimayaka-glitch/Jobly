-- Jobly Recruitment 360° — Lot 9: visio intégrée, consentement, notes et quotas
create table if not exists public."RecruitmentInterviewVideoSession" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null unique references public."RecruitmentInterview"(id) on delete cascade,
 provider text not null check(provider in('JITSI','LIVEKIT','EXTERNAL')),
 "roomName" text not null unique,
 status text not null default 'WAITING' check(status in('WAITING','LIVE','ENDED','CANCELLED')),
 "startedAt" timestamptz,
 "endedAt" timestamptz,
 "durationSeconds" integer not null default 0 check("durationSeconds">=0),
 "participantMinutes" numeric(12,2) not null default 0 check("participantMinutes">=0),
 "recordingStatus" text not null default 'OFF' check("recordingStatus" in('OFF','CONSENT_PENDING','RECORDING','READY','FAILED')),
 "recordingStartedAt" timestamptz,
 "recordingEndedAt" timestamptz,
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now()
);
create table if not exists public."RecruitmentInterviewRecordingConsent" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "userId" text not null references public."User"(id) on delete cascade,
 consented boolean not null,
 "consentVersion" text not null default '2026-10-01',
 "consentedAt" timestamptz,
 "revokedAt" timestamptz,
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now(),
 unique("interviewId","userId")
);
create table if not exists public."RecruitmentInterviewNote" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "authorUserId" text not null references public."User"(id) on delete restrict,
 body text not null check(char_length(trim(body)) between 1 and 10000),
 "createdAt" timestamptz not null default now(),
 "updatedAt" timestamptz not null default now()
);
create index if not exists "RecruitmentInterviewVideoSession_interviewId_idx" on public."RecruitmentInterviewVideoSession"("interviewId");
create index if not exists "RecruitmentInterviewVideoSession_createdAt_idx" on public."RecruitmentInterviewVideoSession"("createdAt");
create index if not exists "RecruitmentInterviewRecordingConsent_interviewId_idx" on public."RecruitmentInterviewRecordingConsent"("interviewId");
create index if not exists "RecruitmentInterviewNote_interviewId_createdAt_idx" on public."RecruitmentInterviewNote"("interviewId","createdAt" desc);

alter table public."RecruitmentInterviewVideoSession" enable row level security;
alter table public."RecruitmentInterviewRecordingConsent" enable row level security;
alter table public."RecruitmentInterviewNote" enable row level security;
revoke all on public."RecruitmentInterviewVideoSession",public."RecruitmentInterviewRecordingConsent",public."RecruitmentInterviewNote" from anon,authenticated;
grant select on public."RecruitmentInterviewVideoSession",public."RecruitmentInterviewRecordingConsent",public."RecruitmentInterviewNote" to authenticated;

create or replace function public.recruitment360_lot9_finalize_video(
 p_session_id uuid,
 p_actor_user_id text,
 p_participant_count integer default 1
) returns public."RecruitmentInterviewVideoSession"
language plpgsql security definer set search_path=public
as $$
declare
 v public."RecruitmentInterviewVideoSession";
 v_now timestamptz := now();
begin
 if auth.role() <> 'service_role' then raise exception 'FORBIDDEN'; end if;
 select * into v from public."RecruitmentInterviewVideoSession" where id=p_session_id for update;
 if not found then raise exception 'VIDEO_SESSION_NOT_FOUND'; end if;
 if v."endedAt" is null then
   v."endedAt" := v_now;
   if v."startedAt" is not null then
     v."durationSeconds" := greatest(0,extract(epoch from (v_now-v."startedAt"))::integer);
     v."participantMinutes" := round((v."durationSeconds"::numeric * greatest(1,p_participant_count)::numeric)/60,2);
   end if;
   v.status := 'ENDED';
   v."updatedAt" := v_now;
   update public."RecruitmentInterviewVideoSession"
     set status=v.status,"endedAt"=v."endedAt","durationSeconds"=v."durationSeconds",
         "participantMinutes"=v."participantMinutes","updatedAt"=v."updatedAt"
     where id=v.id
     returning * into v;
 end if;
 return v;
end $$;
revoke execute on function public.recruitment360_lot9_finalize_video(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.recruitment360_lot9_finalize_video(uuid,text,integer) to service_role;
