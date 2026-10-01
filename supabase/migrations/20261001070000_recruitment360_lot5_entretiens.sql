-- Jobly Recruitment 360° v2 — Lot 5 schema
-- Runtime RPCs are maintained as server-authoritative database functions.
create table if not exists public."RecruitmentInterviewSlot" (
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid references public."Application"(id) on delete cascade,
 "startsAt" timestamptz not null,"endsAt" timestamptz not null,
 timezone text not null default 'Africa/Douala',
 capacity integer not null default 1 check(capacity between 1 and 20),
 status text not null default 'OPEN' check(status in('OPEN','HELD','BOOKED','CLOSED')),
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "createdAt" timestamptz not null default now(),"updatedAt" timestamptz not null default now(),
 check("endsAt">"startsAt")
);
create table if not exists public."RecruitmentInterview" (
 id uuid primary key default gen_random_uuid(),
 "recruitmentId" uuid not null references public."Recruitment360"(id) on delete cascade,
 "applicationId" uuid not null references public."Application"(id) on delete cascade,
 "slotId" uuid references public."RecruitmentInterviewSlot"(id) on delete set null,
 title text not null default 'Entretien Jobly',"startsAt" timestamptz not null,"endsAt" timestamptz not null,
 timezone text not null default 'Africa/Douala',
 status text not null default 'SCHEDULED' check(status in('SCHEDULED','CONFIRMED','STARTED','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED')),
 "meetingProvider" text not null default 'EXTERNAL' check("meetingProvider" in('GOOGLE_MEET','EXTERNAL','JOBLY_NATIVE')),
 "meetingUrl" text,"meetingSpaceName" text,location text,notes text,
 "candidateConfirmedAt" timestamptz,"recruiterConfirmedAt" timestamptz,"cancelledAt" timestamptz,"cancellationReason" text,
 "createdByUserId" text not null references public."User"(id) on delete restrict,
 "createdAt" timestamptz not null default now(),"updatedAt" timestamptz not null default now(),
 check("endsAt">"startsAt")
);
create table if not exists public."RecruitmentInterviewJury" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "userId" text not null references public."User"(id) on delete cascade,
 role text not null default 'JURY',weight numeric(6,3) not null default 1,
 "presenceStatus" text not null default 'INVITED',"joinedAt" timestamptz,"leftAt" timestamptz,
 "createdAt" timestamptz not null default now(),unique("interviewId","userId")
);
create table if not exists public."RecruitmentInterviewAttendance" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "userId" uuid,"participantUserId" text,
 "participantRole" text not null,status text not null default 'INVITED',
 "joinedAt" timestamptz,"leftAt" timestamptz,
 "source" text not null default 'JOBLY',"createdAt" timestamptz not null default now(),
 unique("interviewId","participantRole","participantUserId")
);
create table if not exists public."RecruitmentInterviewReminder" (
 id uuid primary key default gen_random_uuid(),
 "interviewId" uuid not null references public."RecruitmentInterview"(id) on delete cascade,
 "reminderType" text not null,"scheduledFor" timestamptz not null,
 status text not null default 'PENDING',"sentAt" timestamptz,"createdAt" timestamptz not null default now(),
 unique("interviewId","reminderType")
);
alter table public."RecruitmentInterviewSlot" enable row level security;
alter table public."RecruitmentInterview" enable row level security;
alter table public."RecruitmentInterviewJury" enable row level security;
alter table public."RecruitmentInterviewAttendance" enable row level security;
alter table public."RecruitmentInterviewReminder" enable row level security;
revoke all on public."RecruitmentInterviewSlot",public."RecruitmentInterview",public."RecruitmentInterviewJury",public."RecruitmentInterviewAttendance",public."RecruitmentInterviewReminder" from anon,authenticated;
grant select on public."RecruitmentInterviewSlot",public."RecruitmentInterview",public."RecruitmentInterviewJury",public."RecruitmentInterviewAttendance" to authenticated;
