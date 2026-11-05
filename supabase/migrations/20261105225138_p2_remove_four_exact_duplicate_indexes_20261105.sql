-- Remove only four exact standalone duplicates of existing unique btree indexes.
-- Preconditions are checked against PostgreSQL catalog metadata before each DROP.
-- No constraint-backed index is removed; each unique counterpart remains in place.
DO $p2_cleanup$
DECLARE
  v record;
  v_candidate oid;
  v_cover oid;
  v_candidate_name text;
  v_cover_name text;
BEGIN
  FOR v IN
    SELECT *
    FROM (VALUES
      ('CVShare'::text, 'cvshare_token_idx'::text, 'cvshare_token_key'::text),
      ('RecruitmentDecisionPolicy', 'RecruitmentDecisionPolicy_recruitmentId_idx', 'RecruitmentDecisionPolicy_recruitmentId_key'),
      ('RecruitmentInterviewVideoSession', 'RecruitmentInterviewVideoSession_interviewId_idx', 'RecruitmentInterviewVideoSession_interviewId_key'),
      ('RecruitmentListingPublicLink', 'RecruitmentListingPublicLink_tokenHash_idx', 'RecruitmentListingPublicLink_tokenHash_key')
    ) AS candidates(table_name, candidate_index, unique_index)
  LOOP
    SELECT ci.oid, ui.oid, ci.relname, ui.relname
      INTO v_candidate, v_cover, v_candidate_name, v_cover_name
    FROM pg_class ci
    JOIN pg_namespace n ON n.oid = ci.relnamespace
    JOIN pg_index cix ON cix.indexrelid = ci.oid
    JOIN pg_class ti ON ti.oid = cix.indrelid
    JOIN pg_index uix ON uix.indrelid = ti.oid
    JOIN pg_class ui ON ui.oid = uix.indexrelid
    WHERE n.nspname = 'public'
      AND ti.relname = v.table_name
      AND ci.relname = v.candidate_index
      AND ui.relname = v.unique_index
      AND cix.indisvalid AND cix.indisready AND NOT cix.indisunique
      AND uix.indisvalid AND uix.indisready AND uix.indisunique
      AND cix.indnkeyatts = uix.indnkeyatts
      AND cix.indnatts = uix.indnatts
      AND cix.indkey = uix.indkey
      AND cix.indclass = uix.indclass
      AND cix.indcollation = uix.indcollation
      AND cix.indoption = uix.indoption
      AND cix.indexprs IS NOT DISTINCT FROM uix.indexprs
      AND cix.indpred IS NOT DISTINCT FROM uix.indpred
      AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = ci.oid)
    LIMIT 1;

    IF v_candidate IS NULL OR v_cover IS NULL THEN
      RAISE EXCEPTION
        'Duplicate index cleanup aborted: exact unique replacement not verified for %.%',
        v.table_name, v.candidate_index;
    END IF;

    EXECUTE format('DROP INDEX %I.%I', 'public', v_candidate_name);
    RAISE NOTICE 'Removed redundant index %; retained unique index %', v_candidate_name, v_cover_name;
    v_candidate := NULL;
    v_cover := NULL;
  END LOOP;
END
$p2_cleanup$;
