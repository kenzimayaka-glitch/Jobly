-- Jobly P2 Supabase hardening
-- Audit snapshot: 2026-11-05. Apply as one controlled migration.
-- No changes to service_role grants, business data, pg_net, or Auth configuration.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- 1) Secure future public tables created by postgres.
-- Existing sequence defaults are intentionally preserved: client-side INSERT
-- flows may require sequence USAGE when a table has an explicit RLS policy.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

-- 2) Remove client ACLs from service-only tables which currently have RLS
-- enabled but no policies. RLS remains enabled; service_role is untouched.
REVOKE ALL PRIVILEGES ON TABLE
  public."BonPlanInteraction",
  public."IdempotencyKey",
  public."InstitutionCommunication",
  public."InstitutionMember",
  public."JobOfferPipeline",
  public."JoblyCountry",
  public."JoblyLanguage",
  public."MobilityCompanyAgreement",
  public."MobilityCostItem",
  public."MobilityDocument",
  public."MobilityEligibilityDecision",
  public."MobilityFundingAllocation",
  public."MobilityFundingRule",
  public."MobilityFundingTransaction",
  public."MobilityProcessEvent",
  public."MobilityProgram",
  public."MobilityRecruiterGuarantee",
  public."MobilityRepaymentPlan",
  public."MobilityRequest",
  public."RecruitmentInterviewNote",
  public."RecruitmentInterviewRecordingConsent",
  public."RecruitmentInterviewVideoSession",
  public."jobs_backup_20260929"
FROM anon, authenticated;

-- 3) Consolidate RecruiterJob SELECT semantics.
-- Prior effective rule was owner OR published. INSERT/UPDATE/DELETE remain
-- restricted to the owner, including UPDATE WITH CHECK against ownership.
DROP POLICY IF EXISTS "recruiter_job_owner_or_admin" ON public."RecruiterJob";
DROP POLICY IF EXISTS "recruiter_job_published_readable" ON public."RecruiterJob";

CREATE POLICY "p2_recruiter_job_select"
  ON public."RecruiterJob"
  FOR SELECT TO authenticated
  USING (
    "recruiterUserId" = (SELECT auth.uid())
    OR status = 'published'::public."RecruiterJobStatus"
  );

CREATE POLICY "p2_recruiter_job_insert"
  ON public."RecruiterJob"
  FOR INSERT TO authenticated
  WITH CHECK ("recruiterUserId" = (SELECT auth.uid()));

CREATE POLICY "p2_recruiter_job_update"
  ON public."RecruiterJob"
  FOR UPDATE TO authenticated
  USING ("recruiterUserId" = (SELECT auth.uid()))
  WITH CHECK ("recruiterUserId" = (SELECT auth.uid()));

CREATE POLICY "p2_recruiter_job_delete"
  ON public."RecruiterJob"
  FOR DELETE TO authenticated
  USING ("recruiterUserId" = (SELECT auth.uid()));

-- 4) Cover missing foreign keys on tables with current, observed activity.
-- The remaining lints belong to tables with no meaningful usage statistics;
-- they are deferred rather than creating 30+ speculative write-cost indexes.
CREATE INDEX IF NOT EXISTS "Application_coverLetterFileId_idx"
  ON public."Application" ("coverLetterFileId");

CREATE INDEX IF NOT EXISTS "RecruitmentRole_grantedByUserId_idx"
  ON public."RecruitmentRole" ("grantedByUserId");

CREATE INDEX IF NOT EXISTS "Community_createdById_idx"
  ON public."Community" ("createdById");

CREATE INDEX IF NOT EXISTS "jia_action_runs_user_id_idx"
  ON public.jia_action_runs (user_id);

COMMIT;
