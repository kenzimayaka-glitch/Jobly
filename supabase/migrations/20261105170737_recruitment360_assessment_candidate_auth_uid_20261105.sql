-- Candidate ownership is keyed by Supabase Auth UID (Application.userId),
-- whereas User.id is an independent internal UUID. Do not join those two identifiers.
drop policy if exists "360 assessment members or candidate"
  on public."RecruitmentApplicationAssessment";

create policy "360 assessment members or candidate"
  on public."RecruitmentApplicationAssessment"
  for select
  to authenticated
  using (
    exists (
      select 1
      from public."Application" a
      where a.id = "RecruitmentApplicationAssessment"."applicationId"
        and a."userId" = (select auth.uid())
    )
    or exists (
      select 1
      from public."RecruitmentRole" rr
      where rr."recruitmentId" = "RecruitmentApplicationAssessment"."recruitmentId"
        and rr."authUserId" = (select auth.uid())
    )
  );
