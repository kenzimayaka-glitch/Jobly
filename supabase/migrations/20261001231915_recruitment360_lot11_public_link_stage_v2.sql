alter table public."RecruitmentListingPublicLink"
  add column if not exists "stage" text not null default 'CV',
  add column if not exists "theme" text not null default 'OFFICIAL_CONCOURS';

alter table public."RecruitmentListingPublicLink"
  add constraint "RecruitmentListingPublicLink_stage_check"
  check ("stage" in ('CV','TEST','INTERVIEW','DECISION'));

alter table public."RecruitmentListingPublicLink"
  add constraint "RecruitmentListingPublicLink_theme_check"
  check ("theme" in ('OFFICIAL_CONCOURS','MODERNE','SOBRE'));

create or replace function public.recruitment360_lot11_create_public_link_v2(
  p_version_id uuid,
  p_actor_user_id text,
  p_ttl_hours integer,
  p_stage text,
  p_theme text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_recruitment_id uuid;
  v_token text;
  v_id uuid;
  v_expires timestamptz;
begin
  if p_ttl_hours < 1 or p_ttl_hours > 720 then raise exception using errcode='22023', message='TTL_INVALID'; end if;
  if p_stage not in ('CV','TEST','INTERVIEW','DECISION') then raise exception using errcode='22023', message='STAGE_INVALID'; end if;
  if p_theme not in ('OFFICIAL_CONCOURS','MODERNE','SOBRE') then raise exception using errcode='22023', message='THEME_INVALID'; end if;

  select v."recruitmentId" into v_recruitment_id
  from public."RecruitmentAnnouncementVersion" v
  where v.id=p_version_id and v.status in ('PUBLISHED','EXTENDED');

  if v_recruitment_id is null then raise exception using errcode='P0002', message='VERSION_NOT_PUBLISHED'; end if;

  if not exists (
    select 1 from public."RecruitmentRole" rr
    where rr."recruitmentId"=v_recruitment_id
      and rr."userId"=p_actor_user_id
      and upper(rr.role) in ('OWNER','HR','MANAGER','DELEGATE')
  ) then raise exception using errcode='42501', message='FORBIDDEN'; end if;

  update public."RecruitmentListingPublicLink" set "revokedAt"=now()
  where "versionId"=p_version_id and "revokedAt" is null;

  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  v_expires := now() + make_interval(hours => p_ttl_hours);

  insert into public."RecruitmentListingPublicLink"
    ("versionId","tokenHash","expiresAt","createdByUserId","stage","theme")
  values (p_version_id, md5(v_token), v_expires, p_actor_user_id, p_stage, p_theme)
  returning id into v_id;

  return jsonb_build_object('linkId',v_id,'token',v_token,'expiresAt',v_expires,'stage',p_stage,'theme',p_theme);
end;
$$;

revoke all on function public.recruitment360_lot11_create_public_link_v2(uuid,text,integer,text,text) from public;
grant execute on function public.recruitment360_lot11_create_public_link_v2(uuid,text,integer,text,text) to authenticated;

create or replace function public.recruitment360_lot11_get_public_listing(p_token text)
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
select public.recruitment360_lot11_get_official_listing(v."recruitmentId")
  || jsonb_build_object(
    'publicLink', jsonb_build_object(
      'id', l.id,
      'expiresAt', l."expiresAt",
      'stage', l.stage,
      'theme', l.theme
    ),
    'joblyBlock', to_jsonb(b)
  )
from public."RecruitmentListingPublicLink" l
join public."RecruitmentAnnouncementVersion" v on v.id=l."versionId"
left join public."RecruitmentListingImmutableBlock" b on b."versionId"=v.id
where l."tokenHash"=md5(trim(p_token))
  and l."revokedAt" is null
  and l."expiresAt">now()
  and v.status in ('PUBLISHED','EXTENDED')
limit 1;
$function$;

revoke all on function public.recruitment360_lot11_get_public_listing(text) from public;
grant execute on function public.recruitment360_lot11_get_public_listing(text) to anon, authenticated;