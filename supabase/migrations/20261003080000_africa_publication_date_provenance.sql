-- Branch-only. Adds provenance flags; do not execute against JOBLY-PROD in this phase.
alter table public."Job" add column if not exists "publicationDateEstimated" boolean not null default false;
alter table public."Job" add column if not exists "publicationDateSource" text;
create index if not exists "Job_publicationDateEstimated_idx" on public."Job" ("publicationDateEstimated") where "publicationDateEstimated" = true;
