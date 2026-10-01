create table if not exists public."RecruitmentTestProctoringEvent" (
  id uuid primary key default gen_random_uuid(),
  "sessionId" uuid not null references public."RecruitmentTestSession"(id) on delete cascade,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  "occurredAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

create table if not exists public."RecruitmentTestIncident" (
  id uuid primary key default gen_random_uuid(),
  "sessionId" uuid not null references public."RecruitmentTestSession"(id) on delete cascade,
  kind text not null,
  severity text not null default 'INFO',
  details jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "resolvedAt" timestamptz,
  resolution text
);

create table if not exists public."RecruitmentTestSignal" (
  id uuid primary key default gen_random_uuid(),
  "sessionId" uuid not null references public."RecruitmentTestSession"(id) on delete cascade,
  "signalType" text not null,
  score numeric(5,2) not null default 0 check ("score" >= 0 and "score" <= 100),
  evidence jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Recruitment360DeliveryLog" (
  id uuid primary key default gen_random_uuid(),
  "applicationId" uuid,
  "recipientUserId" text,
  channel text not null,
  provider text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

alter table public."RecruitmentTestProctoringEvent" enable row level security;
alter table public."RecruitmentTestIncident" enable row level security;
alter table public."RecruitmentTestSignal" enable row level security;
alter table public."Recruitment360DeliveryLog" enable row level security;

create index if not exists "RecruitmentTestProctoringEvent_sessionId_idx"
  on public."RecruitmentTestProctoringEvent" ("sessionId");
create index if not exists "RecruitmentTestProctoringEvent_occurredAt_idx"
  on public."RecruitmentTestProctoringEvent" ("occurredAt");
create index if not exists "RecruitmentTestIncident_sessionId_idx"
  on public."RecruitmentTestIncident" ("sessionId");
create index if not exists "RecruitmentTestSignal_sessionId_idx"
  on public."RecruitmentTestSignal" ("sessionId");
create index if not exists "Recruitment360DeliveryLog_applicationId_idx"
  on public."Recruitment360DeliveryLog" ("applicationId");

create or replace function public.recruitment360_lot8_record_events(
  p_session_id uuid,
  p_actor_user_id text,
  p_events jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'EVENTS_ARRAY_REQUIRED';
  end if;

  if not exists (
    select 1
    from public."RecruitmentTestSession" s
    join public."Application" a on a.id = s."applicationId"
    where s.id = p_session_id and a."userId"::text = p_actor_user_id
  ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public."RecruitmentTestProctoringEvent" ("sessionId", event, metadata, "occurredAt")
  select
    p_session_id,
    left(coalesce(value->>'event','UNKNOWN'), 80),
    coalesce(value->'metadata','{}'::jsonb),
    coalesce((value->>'occurredAt')::timestamptz, now())
  from jsonb_array_elements(p_events)
  where coalesce(value->>'event','') <> '';

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.recruitment360_lot8_finalize_signals(
  p_session_id uuid,
  p_actor_user_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  paste_count integer;
  tab_count integer;
  fullscreen_count integer;
  offline_count integer;
  rapid_count integer;
  camera_issue_count integer;
  total integer;
  heuristic numeric(5,2);
begin
  if not exists (
    select 1
    from public."RecruitmentTestSession" s
    join public."Application" a on a.id = s."applicationId"
    where s.id = p_session_id and (
      a."userId"::text = p_actor_user_id
      or exists (
        select 1 from public."RecruitmentRole" rr
        where rr."recruitmentId" = (
          select td."recruitmentId" from public."RecruitmentTestDefinition" td
          where td.id = s."testId"
        ) and rr."userId" = p_actor_user_id
      )
    )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select
    count(*) filter (where event in ('PASTE','CLIPBOARD_PASTE')),
    count(*) filter (where event in ('TAB_HIDDEN','WINDOW_BLUR')),
    count(*) filter (where event = 'FULLSCREEN_EXIT'),
    count(*) filter (where event in ('OFFLINE','NETWORK_LOST')),
    count(*) filter (where event = 'RAPID_ANSWER'),
    count(*) filter (where event in ('CAMERA_DENIED','CAMERA_UNAVAILABLE','MULTIPLE_FACES','FACE_ABSENT'))
  into paste_count, tab_count, fullscreen_count, offline_count, rapid_count, camera_issue_count
  from public."RecruitmentTestProctoringEvent"
  where "sessionId" = p_session_id;

  total := greatest(paste_count + tab_count + fullscreen_count + offline_count + rapid_count + camera_issue_count, 0);
  heuristic := least(100, paste_count * 15 + tab_count * 8 + fullscreen_count * 8 + offline_count * 3 + rapid_count * 5 + camera_issue_count * 4);

  insert into public."RecruitmentTestSignal" ("sessionId","signalType",score,evidence)
  values (
    p_session_id,
    'INTEGRITY_HEURISTIC',
    heuristic,
    jsonb_build_object(
      'pasteEvents', paste_count,
      'tabEvents', tab_count,
      'fullscreenExitEvents', fullscreen_count,
      'offlineEvents', offline_count,
      'rapidAnswerEvents', rapid_count,
      'cameraIssueEvents', camera_issue_count,
      'eventsCount', total,
      'interpretation', 'INDICATOR_ONLY_NOT_PROOF'
    )
  );

  return jsonb_build_object(
    'score', heuristic,
    'evidence', jsonb_build_object(
      'pasteEvents', paste_count,
      'tabEvents', tab_count,
      'fullscreenExitEvents', fullscreen_count,
      'offlineEvents', offline_count,
      'rapidAnswerEvents', rapid_count,
      'cameraIssueEvents', camera_issue_count,
      'interpretation', 'INDICATOR_ONLY_NOT_PROOF'
    )
  );
end;
$$;

revoke all on function public.recruitment360_lot8_record_events(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.recruitment360_lot8_record_events(uuid,text,jsonb) to service_role;
revoke all on function public.recruitment360_lot8_finalize_signals(uuid,text) from public, anon, authenticated;
grant execute on function public.recruitment360_lot8_finalize_signals(uuid,text) to service_role;
