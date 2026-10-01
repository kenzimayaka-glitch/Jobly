-- Jobly Recruitment 360° v2 — Lot 1: foundations
-- Versioned, server-authoritative recruitment/application state, recruitment roles,
-- audit trail, invitation codes, and notification read receipts.
--
-- This migration intentionally does not replace legacy Application.status or
-- RecruiterJob.status. The new 360° state is the canonical state for the new
-- recruitment flow; legacy fields remain compatible until later lots migrate
-- their UI/API projections.

create table if not exists public."Recruitment360" (
  id uuid primary key default gen_random_uuid(),
  "recruiterJobId" uuid not null unique references public."RecruiterJob"(id) on delete cascade,
  "currentState" text not null default 'DRAFT'
    check ("currentState" in (
      'DRAFT','PUBLISHED','EXTENDED','APPLICATIONS_CLOSED','SELECTION',
      'TESTS','INTERVIEWS','DECISION','OFFER','COMPLETED',
      'SUSPENDED','CANCELLED','REOPENED'
    )),
  "version" integer not null default 1 check ("version" > 0),
  "lockedAt" timestamptz,
  "closedAt" timestamptz,
  "completedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."RecruitmentApplicationState" (
  id uuid primary key default gen_random_uuid(),
  "applicationId" uuid not null unique references public."Application"(id) on delete cascade,
  "currentState" text not null default 'SENT'
    check ("currentState" in (
      'SENT','RECEIVED','REVIEW','SELECTED','TEST','INTERVIEW',
      'FINALIST','OFFER','HIRED','POOL','REJECTED','WITHDRAWN','OFFER_DECLINED'
    )),
  "stepNumber" integer not null default 0 check ("stepNumber" >= 0),
  "lockedAt" timestamptz,
  "lastTransitionAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."RecruitmentRole" (
  id uuid primary key default gen_random_uuid(),
  "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
  "userId" text not null references public."User"(id) on delete cascade,
  role text not null check (role in ('OWNER','HR','MANAGER','DG_READONLY','JURY','DELEGATE')),
  "grantedByUserId" text references public."User"(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  unique ("recruitmentId","userId","role")
);

create table if not exists public."RecruitmentAuditLog" (
  id uuid primary key default gen_random_uuid(),
  "recruitmentId" uuid references public."Recruitment360"(id) on delete cascade,
  "applicationId" uuid references public."Application"(id) on delete cascade,
  "actorUserId" text references public."User"(id) on delete set null,
  action text not null,
  "fromState" text,
  "toState" text,
  "exceptionReason" text,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  check ("exceptionReason" is null or length(trim("exceptionReason")) >= 5)
);

create table if not exists public."RecruitmentInvitationCode" (
  id uuid primary key default gen_random_uuid(),
  "applicationId" uuid not null references public."Application"(id) on delete cascade,
  email text not null,
  code_hash text not null unique,
  "expiresAt" timestamptz not null,
  "usedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "usedByUserId" text references public."User"(id) on delete set null
);

alter table public."Application"
  add column if not exists "recruitment360Status" text
    default 'SENT';

alter table public."Notification"
  add column if not exists "recruitmentId" uuid references public."Recruitment360"(id) on delete cascade,
  add column if not exists "applicationId" uuid references public."Application"(id) on delete cascade,
  add column if not exists "actionType" text,
  add column if not exists "actionPayload" jsonb not null default '{}'::jsonb,
  add column if not exists "locale" text not null default 'fr',
  add column if not exists "channels" jsonb not null default '{"inApp":true,"email":false,"push":false}'::jsonb,
  add column if not exists "emailSentAt" timestamptz,
  add column if not exists "pushSentAt" timestamptz,
  add column if not exists "openedAt" timestamptz,
  add column if not exists "recruiterSeenAt" timestamptz;

create index if not exists "Recruitment360_recruiterJobId_idx"
  on public."Recruitment360" ("recruiterJobId");
create index if not exists "Recruitment360_currentState_idx"
  on public."Recruitment360" ("currentState");
create index if not exists "RecruitmentApplicationState_currentState_idx"
  on public."RecruitmentApplicationState" ("currentState");
create index if not exists "RecruitmentRole_userId_idx"
  on public."RecruitmentRole" ("userId");
create index if not exists "RecruitmentAuditLog_recruitmentId_createdAt_idx"
  on public."RecruitmentAuditLog" ("recruitmentId","createdAt" desc);
create index if not exists "RecruitmentAuditLog_applicationId_createdAt_idx"
  on public."RecruitmentAuditLog" ("applicationId","createdAt" desc);
create index if not exists "RecruitmentInvitationCode_applicationId_idx"
  on public."RecruitmentInvitationCode" ("applicationId");
create index if not exists "RecruitmentInvitationCode_expiresAt_idx"
  on public."RecruitmentInvitationCode" ("expiresAt");
create index if not exists "Notification_applicationId_idx"
  on public."Notification" ("applicationId");

create or replace function public.recruitment360_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u."id"
  from public."User" u
  where u."authUserId" = (select auth.uid())::text
  limit 1
$$;

revoke execute on function public.recruitment360_user_id() from public, anon, authenticated;

create or replace function public.recruitment360_role(
  p_recruitment_id uuid,
  p_role text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."RecruitmentRole" rr
    where rr."recruitmentId" = p_recruitment_id
      and rr."userId" = public.recruitment360_user_id()
      and rr.role = p_role
  )
  or exists (
    select 1
    from public."RecruitmentRole" rr
    where rr."recruitmentId" = p_recruitment_id
      and rr."userId" = public.recruitment360_user_id()
      and rr.role in ('OWNER','DELEGATE')
      and p_role in ('HR','MANAGER','JURY')
  )
$$;

revoke execute on function public.recruitment360_role(uuid,text) from public, anon, authenticated;

create or replace function public.recruitment360_transition_application(
  p_application_id uuid,
  p_next_state text,
  p_exception_reason text default null
)
returns public."RecruitmentApplicationState"
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public."RecruitmentApplicationState";
  v_current text;
  v_next_rank integer;
  v_current_rank integer;
  v_recruitment_id uuid;
  v_actor text;
begin
  v_actor := public.recruitment360_user_id();

  if v_actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select ras.*
    into v_row
  from public."RecruitmentApplicationState" ras
  where ras."applicationId" = p_application_id
  for update;

  select r.id
    into v_recruitment_id
  from public."Recruitment360" r
  join public."Application" a on a."recruiterJobId" = r."recruiterJobId"
  where a.id = p_application_id
  limit 1;

  if not found then
    raise exception 'APPLICATION_360_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_current := v_row."currentState";

  if not exists (
    select 1 from public."Recruitment360" r
    join public."RecruitmentRole" rr on rr."recruitmentId" = r.id
    where r."recruiterJobId" = v_recruitment_id
      and rr."userId" = v_actor
      and rr.role in ('OWNER','HR','MANAGER','DG_READONLY','JURY','DELEGATE')
  ) and not exists (
    select 1 from public."Application" a
    where a.id = p_application_id and a."userId"::text = v_actor
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_current_rank := case v_current
    when 'SENT' then 10 when 'RECEIVED' then 20 when 'REVIEW' then 30
    when 'SELECTED' then 40 when 'TEST' then 50 when 'INTERVIEW' then 60
    when 'FINALIST' then 70 when 'OFFER' then 80 when 'HIRED' then 90
    when 'POOL' then 100 when 'REJECTED' then 100 when 'WITHDRAWN' then 100
    when 'OFFER_DECLINED' then 100 else -1 end;

  v_next_rank := case p_next_state
    when 'SENT' then 10 when 'RECEIVED' then 20 when 'REVIEW' then 30
    when 'SELECTED' then 40 when 'TEST' then 50 when 'INTERVIEW' then 60
    when 'FINALIST' then 70 when 'OFFER' then 80 when 'HIRED' then 90
    when 'POOL' then 100 when 'REJECTED' then 100 when 'WITHDRAWN' then 100
    when 'OFFER_DECLINED' then 100 else -1 end;

  if v_next_rank < 0 then
    raise exception 'INVALID_APPLICATION_STATE' using errcode = '22023';
  end if;

  if v_current in ('REJECTED','WITHDRAWN','HIRED','OFFER_DECLINED') then
    if coalesce(length(trim(p_exception_reason)),0) < 5 then
      raise exception 'LOCKED_STATE_EXCEPTION_REASON_REQUIRED' using errcode = '22023';
    end if;
  elsif v_next_rank < v_current_rank then
    if coalesce(length(trim(p_exception_reason)),0) < 5 then
      raise exception 'BACKWARD_TRANSITION_REQUIRES_REASON' using errcode = '22023';
    end if;
  end if;

  update public."RecruitmentApplicationState"
  set "currentState" = p_next_state,
      "stepNumber" = case p_next_state
        when 'SENT' then 0 when 'RECEIVED' then 1 when 'REVIEW' then 2
        when 'SELECTED' then 3 when 'TEST' then 4 when 'INTERVIEW' then 5
        when 'FINALIST' then 6 when 'OFFER' then 7 when 'HIRED' then 8 else 9 end,
      "lockedAt" = case when p_next_state in ('REJECTED','WITHDRAWN','HIRED','OFFER_DECLINED') then now() else "lockedAt" end,
      "lastTransitionAt" = now(),
      "updatedAt" = now()
  where "applicationId" = p_application_id
  returning * into v_row;

  update public."Application"
  set "recruitment360Status" = p_next_state,
      "updatedAt" = now()
  where id = p_application_id;

  insert into public."RecruitmentAuditLog" (
    "applicationId","actorUserId",action,"fromState","toState","exceptionReason"
  ) values (
    p_application_id,v_actor,
    case when p_exception_reason is null then 'STATE_TRANSITION' else 'EXCEPTION_STATE_CORRECTION' end,
    v_current,p_next_state,p_exception_reason
  );

  return v_row;
end;
$$;

revoke execute on function public.recruitment360_transition_application(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.recruitment360_transition_application(uuid,text,text)
  to service_role;

-- Notification opening is the sole server-side source of the Recruiter "double check".
create or replace function public.recruitment360_open_notification(p_notification_id uuid)
returns public."Notification"
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id text;
  v_notification public."Notification";
begin
  v_user_id := public.recruitment360_user_id();
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public."Notification" n
  set "readAt" = coalesce(n."readAt", now()),
      "openedAt" = coalesce(n."openedAt", now()),
      "recruiterSeenAt" = case
        when n."applicationId" is not null
         and exists (
           select 1 from public."Application" a
           where a.id = n."applicationId"
             and a."userId"::text = v_user_id
             and coalesce(a."recruitment360Status",'SENT') not in ('REJECTED','WITHDRAWN','HIRED','OFFER_DECLINED')
         )
        then now()
        else n."recruiterSeenAt"
      end
  where n.id = p_notification_id
    and n."userId"::text = v_user_id
  returning n.* into v_notification;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_notification;
end;
$$;

revoke execute on function public.recruitment360_open_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.recruitment360_open_notification(uuid)
  to service_role;

-- Every new table in public is protected explicitly. Supabase's Data API
-- no longer auto-exposes new public tables by default, but grants are kept
-- intentionally narrow for existing projects.
alter table public."Recruitment360" enable row level security;
alter table public."RecruitmentApplicationState" enable row level security;
alter table public."RecruitmentRole" enable row level security;
alter table public."RecruitmentAuditLog" enable row level security;
alter table public."RecruitmentInvitationCode" enable row level security;

revoke all on table public."Recruitment360" from anon, authenticated;
revoke all on table public."RecruitmentApplicationState" from anon, authenticated;
revoke all on table public."RecruitmentRole" from anon, authenticated;
revoke all on table public."RecruitmentAuditLog" from anon, authenticated;
revoke all on table public."RecruitmentInvitationCode" from anon, authenticated;

grant select on table public."Recruitment360" to authenticated;
grant select on table public."RecruitmentApplicationState" to authenticated;
grant select on table public."RecruitmentRole" to authenticated;
grant select on table public."RecruitmentAuditLog" to authenticated;

create policy "Recruitment owners and members can read recruitment"
on public."Recruitment360" for select to authenticated
using (
  exists (
    select 1 from public."RecruitmentRole" rr
    where rr."recruitmentId" = id
      and rr."userId" = public.recruitment360_user_id()
  )
);

create policy "Application owner or recruitment member can read state"
on public."RecruitmentApplicationState" for select to authenticated
using (
  exists (
    select 1 from public."Application" a
    where a.id = "applicationId"
      and (
        a."userId"::text = public.recruitment360_user_id()
        or exists (
          select 1
          from public."Recruitment360" r
          join public."RecruitmentRole" rr on rr."recruitmentId" = r.id
          where r."recruiterJobId" = a."recruiterJobId"
            and rr."userId" = public.recruitment360_user_id()
        )
      )
  )
);

create policy "Recruitment members can read roles"
on public."RecruitmentRole" for select to authenticated
using ("userId" = public.recruitment360_user_id());

create policy "Recruitment members can read audit"
on public."RecruitmentAuditLog" for select to authenticated
using (
  "actorUserId" = public.recruitment360_user_id()
  or exists (
    select 1
    from public."RecruitmentRole" rr
    where rr."recruitmentId" = "RecruitmentAuditLog"."recruitmentId"
      and rr."userId" = public.recruitment360_user_id()
  )
);

create policy "Candidate can read own invitation code metadata"
on public."RecruitmentInvitationCode" for select to authenticated
using (
  exists (
    select 1 from public."Application" a
    where a.id = "applicationId"
      and a."userId"::text = public.recruitment360_user_id()
  )
);

-- Notification table already existed; its RLS is preserved. Add only a
-- supporting index for the new application relationship.


-- Bootstrap the new source-of-truth rows for existing RecruiterJob/Application data.
insert into public."Recruitment360" ("recruiterJobId")
select rj.id
from public."RecruiterJob" rj
where not exists (
  select 1 from public."Recruitment360" r where r."recruiterJobId" = rj.id
);

insert into public."RecruitmentRole" ("recruitmentId","userId",role)
select r.id, rj."recruiterUserId"::text, 'OWNER'
from public."Recruitment360" r
join public."RecruiterJob" rj on rj.id = r."recruiterJobId"
where not exists (
  select 1 from public."RecruitmentRole" rr
  where rr."recruitmentId" = r.id
    and rr."userId" = rj."recruiterUserId"::text
    and rr.role = 'OWNER'
);

insert into public."RecruitmentApplicationState" ("applicationId","currentState")
select a.id,
  case a.status::text
    when 'SUBMITTED' then 'SENT'
    when 'ACKNOWLEDGED' then 'RECEIVED'
    when 'INTERVIEW' then 'INTERVIEW'
    when 'OFFER' then 'OFFER'
    when 'REJECTED' then 'REJECTED'
    when 'WITHDRAWN' then 'WITHDRAWN'
    else 'REVIEW'
  end
from public."Application" a
where a."recruiterJobId" is not null
  and not exists (
    select 1 from public."RecruitmentApplicationState" ras
    where ras."applicationId" = a.id
  );
