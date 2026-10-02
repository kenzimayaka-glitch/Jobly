alter table public."RecruiterJob"
  add column if not exists "distributionScope" text not null default 'LOCAL',
  add column if not exists "targetCountryCodes" text[] not null default '{}';

update public."RecruiterJob"
set "distributionScope" = 'LOCAL'
where "distributionScope" is null;

do $$ begin
  alter table public."RecruiterJob"
    add constraint "RecruiterJob_distributionScope_check"
    check ("distributionScope" in ('LOCAL','COUNTRIES','AFRICA'));
exception when duplicate_object then null;
end $$;

create index if not exists "RecruiterJob_distributionScope_idx"
  on public."RecruiterJob" ("distributionScope");

create index if not exists "RecruiterJob_countryCode_idx"
  on public."RecruiterJob" ("countryCode");