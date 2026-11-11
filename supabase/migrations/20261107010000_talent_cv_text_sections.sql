-- Persist the free-text experience and education sections of CV Studio.
-- These are intentionally separate from Experience/Education rows: imported CV
-- text does not necessarily contain reliable dates, employers or institutions.

alter table public."Profile"
  add column if not exists "experienceSummary" text,
  add column if not exists "educationSummary" text;

comment on column public."Profile"."experienceSummary" is
  'Experience section text declared or extracted in Talent CV Studio; not a verified structured Experience row.';
comment on column public."Profile"."educationSummary" is
  'Education section text declared or extracted in Talent CV Studio; not a verified structured Education row.';
