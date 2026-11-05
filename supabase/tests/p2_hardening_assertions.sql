-- Run after the P2 migration using a role with catalog visibility.
-- This file is read-only and raises an exception if an assertion fails.
DO $$
DECLARE
  v_count integer;
BEGIN
  -- All 23 no-policy tables must be inaccessible to anon/authenticated at ACL level.
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('BonPlanInteraction'), ('IdempotencyKey'),
      ('InstitutionCommunication'), ('InstitutionMember'),
      ('JobOfferPipeline'), ('JoblyCountry'), ('JoblyLanguage'),
      ('MobilityCompanyAgreement'), ('MobilityCostItem'), ('MobilityDocument'),
      ('MobilityEligibilityDecision'), ('MobilityFundingAllocation'),
      ('MobilityFundingRule'), ('MobilityFundingTransaction'),
      ('MobilityProcessEvent'), ('MobilityProgram'),
      ('MobilityRecruiterGuarantee'), ('MobilityRepaymentPlan'),
      ('MobilityRequest'), ('RecruitmentInterviewNote'),
      ('RecruitmentInterviewRecordingConsent'),
      ('RecruitmentInterviewVideoSession'), ('jobs_backup_20260929')
    ) AS t(table_name)
    CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(role_name)
    WHERE has_table_privilege(r.role_name, format('public.%I', t.table_name), 'SELECT')
       OR has_table_privilege(r.role_name, format('public.%I', t.table_name), 'INSERT')
       OR has_table_privilege(r.role_name, format('public.%I', t.table_name), 'UPDATE')
       OR has_table_privilege(r.role_name, format('public.%I', t.table_name), 'DELETE')
  ) THEN
    RAISE EXCEPTION 'P2 assertion failed: client role still has DML access to a service-only table';
  END IF;

  -- Service role must retain its ingestion access.
  IF NOT has_table_privilege('service_role', 'public."JobOfferPipeline"', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public."JobOfferPipeline"', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public."JobHarvestCapture"', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public."JobHarvestCapture"', 'INSERT') THEN
    RAISE EXCEPTION 'P2 assertion failed: service_role ingestion grants changed';
  END IF;

  -- Future postgres-created public tables must not receive client table grants.
  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole = 'postgres'::regrole
      AND n.nspname = 'public'
      AND d.defaclobjtype = 'r'
      AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole)
      AND a.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
  ) THEN
    RAISE EXCEPTION 'P2 assertion failed: postgres default table ACL still grants client roles';
  END IF;

  -- SELECT is now represented by exactly one authenticated policy.
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'RecruiterJob'
    AND cmd = 'SELECT'
    AND 'authenticated' = ANY(roles);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'P2 assertion failed: RecruiterJob has % authenticated SELECT policies (expected 1)', v_count;
  END IF;

  -- Per-operation ownership policies must all exist.
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'RecruiterJob'
    AND policyname IN (
      'p2_recruiter_job_select',
      'p2_recruiter_job_insert',
      'p2_recruiter_job_update',
      'p2_recruiter_job_delete'
    );
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'P2 assertion failed: RecruiterJob policy set is incomplete';
  END IF;

  -- All four workload-backed FK indexes must exist and be valid.
  SELECT count(*) INTO v_count
  FROM pg_index i
  JOIN pg_class x ON x.oid = i.indexrelid
  JOIN pg_namespace n ON n.oid = x.relnamespace
  WHERE n.nspname = 'public'
    AND x.relname IN (
      'Application_coverLetterFileId_idx',
      'RecruitmentRole_grantedByUserId_idx',
      'Community_createdById_idx',
      'jia_action_runs_user_id_idx'
    )
    AND i.indisvalid
    AND i.indisready;
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'P2 assertion failed: only % of 4 workload-backed FK indexes are valid', v_count;
  END IF;

  RAISE NOTICE 'P2 hardening assertions passed';
END
$$;
