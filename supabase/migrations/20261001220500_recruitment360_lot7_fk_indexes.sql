-- Jobly Recruitment 360° v2 — Lot 7 foreign-key indexes
create index if not exists "RecruitmentReportShare_createdByUserId_idx" on public."RecruitmentReportShare"("createdByUserId");
create index if not exists "RecruitmentReview_moderatedByUserId_idx" on public."RecruitmentReview"("moderatedByUserId");