-- Expose only aggregate homepage counters. No public role receives table access.
-- SECURITY DEFINER is deliberately narrow: no arguments, fixed filters, count-only output.
create or replace function public.get_public_home_stats()
returns table ("offersCount" bigint, "talentsCount" bigint, "updatedAt" timestamptz)
language sql
stable
security definer
set search_path = ''
as $function$
  with african_codes(codes) as (
    values (array[
      'AO','BF','BI','BJ','BW','CD','CF','CG','CI','CM','CV','DJ','DZ','EG','ER',
      'ET','GA','GH','GM','GN','GQ','GW','KE','KM','LR','LS','LY','MA','MG','ML',
      'MR','MU','MW','MZ','NA','NE','NG','RW','SC','SD','SL','SN','SO','SS','ST',
      'SZ','TD','TG','TN','TZ','UG','ZA','ZM','ZW','EH'
    ]::text[])
  ),
  job_candidates as (
    select
      coalesce(j."sourcePublishedAt", harvest.first_harvest_at, j."createdAt") as effective_published_at,
      j."sourcePublishedAt" is not null as has_source_publication_date,
      j.deadline
    from public."Job" as j
    cross join african_codes as africa
    left join lateral (
      select pg_catalog.min(c."discoveredAt") as first_harvest_at
      from public."JobHarvestCapture" as c
      where c."jobId" = j.id::text
    ) as harvest on j."sourcePublishedAt" is null
    where j."isActive" is true
      and j."countryCode" = any(africa.codes)
      and (j."opportunityType" is null or j."opportunityType" = 'EMPLOI')
  ),
  discovery_count as (
    select pg_catalog.count(*) as total
    from job_candidates as j
    where j.effective_published_at is not null
      and j.effective_published_at <= pg_catalog.now()
      and (j.deadline is null or j.deadline >= pg_catalog.now())
      and pg_catalog.now() <= case
        when j.has_source_publication_date
          then j.effective_published_at + interval '2 months'
        else j.effective_published_at + interval '30 days'
      end
  ),
  recruiter_count as (
    select pg_catalog.count(*) as total
    from public."RecruiterJob" as r
    cross join african_codes as africa
    where r.status = 'published'
      and r."applicationReady" is true
      and r."countryCode" = any(africa.codes)
      and r."createdAt" >= pg_catalog.now() - interval '2 months'
      and r."createdAt" <= pg_catalog.now()
      and pg_catalog.now() <= r."createdAt" + interval '30 days'
  ),
  talent_count as (
    select pg_catalog.count(*) as total
    from public."Profile" as p
    inner join public."User" as u on u.id = p."userId"
    where u.role::text = 'TALENT'
  )
  select
    (select total from discovery_count) + (select total from recruiter_count),
    (select total from talent_count),
    pg_catalog.now();
$function$;

revoke all on function public.get_public_home_stats() from public, anon, authenticated, service_role;
grant execute on function public.get_public_home_stats() to anon, authenticated;
