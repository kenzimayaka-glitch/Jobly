-- Recruitment 360° Partie A FK covering indexes
create index if not exists "RecruitmentApplicationAssessment_computedByUserId_idx" on public."RecruitmentApplicationAssessment"("computedByUserId");
create index if not exists "RecruitmentApplicationDocument_verifiedByUserId_idx" on public."RecruitmentApplicationDocument"("verifiedByUserId");
create index if not exists "RecruitmentShortlist_decidedByUserId_idx" on public."RecruitmentShortlist"("decidedByUserId");
create index if not exists "RecruitmentTestDefinition_recruitmentId_idx" on public."RecruitmentTestDefinition"("recruitmentId");
create index if not exists "RecruitmentTestDefinition_createdByUserId_idx" on public."RecruitmentTestDefinition"("createdByUserId");
create index if not exists "RecruitmentTestQuestion_testId_idx" on public."RecruitmentTestQuestion"("testId");
create index if not exists "RecruitmentTestAnswer_questionId_idx" on public."RecruitmentTestAnswer"("questionId");
