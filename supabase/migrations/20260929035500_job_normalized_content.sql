-- Jobly canonical normalized offer payload
alter table public."Job"
  add column if not exists "normalizedContent" jsonb,
  add column if not exists "normalizedVersion" text,
  add column if not exists "normalizedAt" timestamptz;

create index if not exists "Job_normalizedVersion_idx"
  on public."Job" ("normalizedVersion");
