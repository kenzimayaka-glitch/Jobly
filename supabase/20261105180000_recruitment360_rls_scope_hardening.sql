-- Scope Recruitment360 read policies to the row's actual recruitment.
-- The previous self-comparisons (rr.recruitmentId = rr.recruitmentId) made the
-- recruiter-membership branch true for every row whenever the actor had any
-- RecruitmentRole membership.

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

drop policy if exists "360 shortlist members"
  on public."RecruitmentShortlist";

create policy "360 shortlist members"
  on public."RecruitmentShortlist"
  for select
  to authenticated
  using (
    exists (
      select 1
      from public."RecruitmentRole" rr
      where rr."recruitmentId" = "RecruitmentShortlist"."recruitmentId"
        and rr."authUserId" = (select auth.uid())
    )
  );

drop policy if exists "360 test definitions recruiters"
  on public."RecruitmentTestDefinition";

create policy "360 test definitions recruiters"
  on public."RecruitmentTestDefinition"
  for select
  to authenticated
  using (
    exists (
      select 1
      from public."RecruitmentRole" rr
      where rr."recruitmentId" = "RecruitmentTestDefinition"."recruitmentId"
        and rr."authUserId" = (select auth.uid())
    )
  );
