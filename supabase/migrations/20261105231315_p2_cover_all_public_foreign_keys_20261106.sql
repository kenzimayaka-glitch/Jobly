-- Supabase P2: covering indexes for the 38 unindexed public foreign keys.
-- All 31 affected tables were checked with exact COUNT(*) before application.
-- Each table is re-counted inside the migration; abort if data arrives before DDL.
DO $$
DECLARE
  v_fk record;
  v_columns text;
  v_index_name text;
  v_rows bigint;
  v_created integer := 0;
  v_expected text[] := ARRAY[
    'ApplicationBatchItem_coverLetterFileId_fkey',
    'ApplicationBatchItem_cvFileId_fkey',
    'BonPlanComment_userId_fkey',
    'CandidateFile_sourceFileId_fkey',
    'CareerCompetencyAssessment_journeyId_fkey',
    'CareerEvidence_assessmentId_fkey',
    'CareerEvidence_missionId_fkey',
    'CareerEvidence_portfolioId_fkey',
    'CareerMission_goalId_fkey',
    'CareerMission_recommendationId_fkey',
    'CareerRecommendation_goalId_fkey',
    'CareerReview_journeyId_fkey',
    'CommunityPostComment_userId_fkey',
    'EventFeaturedCampaign_eventId_fkey',
    'EventManualPaymentSubmission_eventId_fkey',
    'EventManualPaymentSubmission_reviewedByUserId_fkey',
    'InstitutionCommunication_programId_fkey',
    'MobilityCostItem_mobilityRequestId_fkey',
    'MobilityEligibilityDecision_mobilityRequestId_fkey',
    'MobilityFundingAllocation_mobilityRequestId_fkey',
    'MobilityFundingRule_programId_fkey',
    'MobilityFundingTransaction_allocationId_fkey',
    'MobilityProgramApplication_applicantUserId_fkey',
    'MobilityProviderAssignment_serviceId_fkey',
    'MobilityRepaymentPlan_allocationId_fkey',
    'MobilityRequest_companyAgreementId_fkey',
    'MobilityRequest_recruiterGuaranteeId_fkey',
    'RecruitmentAuditLog_actorUserId_fkey',
    'RecruitmentInterviewNote_authorUserId_fkey',
    'RecruitmentInterviewRecordingConsent_userId_fkey',
    'RecruitmentInterviewVideoSession_createdByUserId_fkey',
    'RecruitmentInvitationCode_usedByUserId_fkey',
    'RecruitmentListingPublicLink_versionId_fkey',
    'RecruitmentListingPublicationConsent_recruitmentId_fkey',
    'jia_predictions_user_id_fkey',
    'jia_reflections_user_id_fkey',
    'jia_world_relations_from_entity_id_fkey',
    'jia_world_relations_to_entity_id_fkey'
  ];
BEGIN
  IF cardinality(v_expected) <> 38 THEN
    RAISE EXCEPTION 'Expected exactly 38 FK indexes, got %', cardinality(v_expected);
  END IF;

  FOR v_fk IN
    SELECT c.oid, c.conname, c.conrelid
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.conrelid)
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND c.conname = ANY(v_expected)
    ORDER BY c.conrelid::regclass::text, c.conname
  LOOP
    EXECUTE format('SELECT count(*) FROM %s', v_fk.conrelid::regclass)
      INTO v_rows;
    IF v_rows <> 0 THEN
      RAISE EXCEPTION 'Table % is no longer empty; stop before creating its FK index', v_fk.conrelid::regclass;
    END IF;

    SELECT string_agg(format('%I', a.attname), ', ' ORDER BY k.ord)
      INTO v_columns
    FROM pg_constraint c
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.oid = v_fk.oid;

    v_index_name := 'p2_fk_' || left(v_fk.conname, 45) || '_' || substr(md5(v_fk.conname), 1, 8);
    EXECUTE format('CREATE INDEX %I ON %s (%s)',
      v_index_name, v_fk.conrelid::regclass, v_columns);
    EXECUTE format('COMMENT ON INDEX %I.%I IS %L',
      'public', v_index_name,
      'Covers foreign key ' || v_fk.conname || '; created by Supabase P2 hardening to prevent unindexed FK scans.');
    v_created := v_created + 1;
  END LOOP;

  IF v_created <> 38 THEN
    RAISE EXCEPTION 'Created % FK indexes; expected 38. Rolling back.', v_created;
  END IF;
END
$$;
