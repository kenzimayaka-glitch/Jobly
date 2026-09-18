create table if not exists public."CVShare" (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  "userId" text not null references public."User"(id) on delete cascade,
  "jobId" uuid null references public."Job"(id) on delete set null,
  source text null,
  "candidateNameSnapshot" text null,
  "jobTitleSnapshot" text null,
  "companyNameSnapshot" text null,
  "createdAt" timestamptz not null default now(),
  "expiresAt" timestamptz null,
  "revokedAt" timestamptz null,
  "viewCount" integer not null default 0,
  "downloadCount" integer not null default 0,
  "recruiterCtaCount" integer not null default 0
);
alter table public."CVShare" enable row level security;
create index if not exists cvshare_token_idx on public."CVShare"(token);
create index if not exists cvshare_user_idx on public."CVShare"("userId");
create index if not exists cvshare_job_idx on public."CVShare"("jobId");
