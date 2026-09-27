-- Jobly: candidature groupée, fichiers candidats et reporting
create table if not exists public."ApplicationBatch" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  "status" text not null default 'GENERATING' check ("status" in ('GENERATING','READY_FOR_REVIEW','SENDING','COMPLETED','PARTIAL_FAILURE')),
  "itemCount" integer not null default 0 check ("itemCount" >= 0)
);

create table if not exists public."CandidateFile" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "type" text not null check ("type" in ('CV','COVER_LETTER')),
  "variant" text not null default 'ORIGINAL' check ("variant" in ('ORIGINAL','ATS_OPTIMIZED')),
  "sourceFileId" uuid null references public."CandidateFile"("id") on delete set null,
  "url" text not null,
  "isDefault" boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."ApplicationBatchItem" (
  "id" uuid primary key default gen_random_uuid(),
  "batchId" uuid not null references public."ApplicationBatch"("id") on delete cascade,
  "offerId" uuid null references public."Job"("id") on delete set null,
  "generatedSubject" text,
  "generatedBody" text,
  "hasCoverLetter" boolean not null default false,
  "editedByUser" boolean not null default false,
  "cvFileId" uuid null references public."CandidateFile"("id") on delete set null,
  "coverLetterFileId" uuid null references public."CandidateFile"("id") on delete set null,
  "status" text not null default 'DRAFT' check ("status" in ('DRAFT','READY','SENT','FAILED'))
);

alter table public."Application"
  add column if not exists "batchId" uuid null references public."ApplicationBatch"("id") on delete set null,
  add column if not exists "cvFileId" uuid null references public."CandidateFile"("id") on delete set null,
  add column if not exists "coverLetterFileId" uuid null references public."CandidateFile"("id") on delete set null,
  add column if not exists "readinessScoreAtApply" integer null,
  add column if not exists "atsScoreAtApply" integer null,
  add column if not exists "locale" text null;

create index if not exists "ApplicationBatch_userId_createdAt_idx" on public."ApplicationBatch"("userId","createdAt" desc);
create index if not exists "ApplicationBatchItem_batchId_idx" on public."ApplicationBatchItem"("batchId");
create index if not exists "ApplicationBatchItem_offerId_idx" on public."ApplicationBatchItem"("offerId");
create index if not exists "CandidateFile_userId_type_default_idx" on public."CandidateFile"("userId","type","isDefault");
create index if not exists "Application_batchId_idx" on public."Application"("batchId");
create index if not exists "Application_cvFileId_idx" on public."Application"("cvFileId");

alter table public."ApplicationBatch" enable row level security;
alter table public."CandidateFile" enable row level security;
alter table public."ApplicationBatchItem" enable row level security;

drop policy if exists "ApplicationBatch owner select" on public."ApplicationBatch";
create policy "ApplicationBatch owner select" on public."ApplicationBatch" for select to authenticated using ((select auth.uid()) = "userId");
drop policy if exists "ApplicationBatch owner insert" on public."ApplicationBatch";
create policy "ApplicationBatch owner insert" on public."ApplicationBatch" for insert to authenticated with check ((select auth.uid()) = "userId");
drop policy if exists "ApplicationBatch owner update" on public."ApplicationBatch";
create policy "ApplicationBatch owner update" on public."ApplicationBatch" for update to authenticated using ((select auth.uid()) = "userId") with check ((select auth.uid()) = "userId");

drop policy if exists "CandidateFile owner select" on public."CandidateFile";
create policy "CandidateFile owner select" on public."CandidateFile" for select to authenticated using ((select auth.uid()) = "userId");
drop policy if exists "CandidateFile owner insert" on public."CandidateFile";
create policy "CandidateFile owner insert" on public."CandidateFile" for insert to authenticated with check ((select auth.uid()) = "userId");
drop policy if exists "CandidateFile owner update" on public."CandidateFile";
create policy "CandidateFile owner update" on public."CandidateFile" for update to authenticated using ((select auth.uid()) = "userId") with check ((select auth.uid()) = "userId");
drop policy if exists "CandidateFile owner delete" on public."CandidateFile";
create policy "CandidateFile owner delete" on public."CandidateFile" for delete to authenticated using ((select auth.uid()) = "userId");

drop policy if exists "ApplicationBatchItem owner select" on public."ApplicationBatchItem";
create policy "ApplicationBatchItem owner select" on public."ApplicationBatchItem" for select to authenticated using (exists (select 1 from public."ApplicationBatch" b where b.id = "batchId" and b."userId" = (select auth.uid())));
drop policy if exists "ApplicationBatchItem owner insert" on public."ApplicationBatchItem";
create policy "ApplicationBatchItem owner insert" on public."ApplicationBatchItem" for insert to authenticated with check (exists (select 1 from public."ApplicationBatch" b where b.id = "batchId" and b."userId" = (select auth.uid())));
drop policy if exists "ApplicationBatchItem owner update" on public."ApplicationBatchItem";
create policy "ApplicationBatchItem owner update" on public."ApplicationBatchItem" for update to authenticated using (exists (select 1 from public."ApplicationBatch" b where b.id = "batchId" and b."userId" = (select auth.uid()))) with check (exists (select 1 from public."ApplicationBatch" b where b.id = "batchId" and b."userId" = (select auth.uid())));