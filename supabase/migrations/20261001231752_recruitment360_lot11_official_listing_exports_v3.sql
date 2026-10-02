alter table public."Application"
  add column if not exists "officialListingConsent" boolean not null default false;

alter table public."Application"
  add column if not exists "officialListingDisplayName" text;

comment on column public."Application"."officialListingConsent"
  is 'Candidate consent for publication of first name and last name in official recruitment listings.';

comment on column public."Application"."officialListingDisplayName"
  is 'Optional recruiter-reviewed spelling correction for official listing display; must remain derived from the real candidate application.';

create index if not exists "Application_officialListingConsent_idx"
  on public."Application" ("recruiterJobId","officialListingConsent");

insert into storage.buckets (id, name, public)
values ('recruitment-listings','recruitment-listings',false)
on conflict (id) do nothing;

revoke all on table public."RecruitmentListingExport" from anon, authenticated;
grant select on table public."RecruitmentListingExport" to authenticated;

create or replace function public.recruitment360_lot11_set_listing_consent(
  p_application_id uuid,
  p_consent boolean
) returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_user_id uuid;
begin
  select a."userId" into v_user_id
  from public."Application" a
  where a.id = p_application_id;

  if v_user_id is null then
    raise exception using errcode='P0002', message='APPLICATION_NOT_FOUND';
  end if;

  if v_user_id::text <> (select auth.uid())::text then
    raise exception using errcode='42501', message='FORBIDDEN';
  end if;

  update public."Application"
  set "officialListingConsent" = p_consent,
      "updatedAt" = now()
  where id = p_application_id
    and "userId" = v_user_id;

  return jsonb_build_object(
    'applicationId', p_application_id,
    'officialListingConsent', p_consent
  );
end;
$$;

revoke all on function public.recruitment360_lot11_set_listing_consent(uuid,boolean) from public;
grant execute on function public.recruitment360_lot11_set_listing_consent(uuid,boolean) to authenticated;