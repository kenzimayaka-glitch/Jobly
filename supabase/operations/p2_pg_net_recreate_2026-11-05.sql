-- Controlled pg_net relocation for JOBLY-PROD.
-- Supabase-supported route: DROP pg_net (non-relocatable), then CREATE
-- EXTENSION pg_net WITH SCHEMA extensions. The extension continues to create
-- and use its own "net" schema; the registration namespace becomes extensions.
-- Apply ONLY after user validation. Do not use CASCADE.
--
-- Preflight observed 2026-11-05:
--   pg_net 0.20.4; extnamespace=public; extrelocatable=false
--   net.http_request_queue pending rows=0
--   net._http_response rows=1 (archived before drop)
--   only one pg_cron job references net.http_*:
--     jobly-discover-jobs-every-6h / 15 */6 * * *
--   Supabase event trigger issue_pg_net_access recreates schema USAGE grants.
-- The most recent cron job_run_details returned "succeeded"; the latest stored
-- HTTP response has status 546, so post-cutover HTTP response status still needs
-- a separate operational check. A successful cron SQL invocation is not proof
-- that the Edge Function returned 2xx.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  v_ext_schema text;
  v_extension_owner name;
  v_is_superuser boolean;
  v_job record;
  v_pending bigint;
  v_response_count bigint;
  v_cron_count integer;
  v_custom_reference_count integer;
  v_new_job_id bigint;
BEGIN
  SELECT e.extnamespace::regnamespace::text, owner_role.rolname
    INTO v_ext_schema, v_extension_owner
  FROM pg_extension e
  JOIN pg_roles owner_role ON owner_role.oid = e.extowner
  WHERE e.extname = 'pg_net';

  IF v_ext_schema IS NULL THEN
    RAISE EXCEPTION 'pg_net is not installed; stop and re-audit';
  END IF;
  IF v_ext_schema <> 'public' THEN
    RAISE EXCEPTION 'pg_net is already registered in schema %, no relocation required', v_ext_schema;
  END IF;

  SELECT rolsuper INTO v_is_superuser
  FROM pg_roles
  WHERE rolname = current_user;

  IF NOT coalesce(v_is_superuser, false)
     AND current_user <> v_extension_owner
     AND NOT pg_has_role(current_user, v_extension_owner, 'MEMBER') THEN
    RAISE EXCEPTION
      'pg_net is owned by %, but current role % lacks membership. Have Supabase owner/support run the cutover; no DDL or cron changes were made.',
      v_extension_owner, current_user;
  END IF;

  IF to_regclass('net.http_request_queue') IS NULL
     OR to_regclass('net._http_response') IS NULL THEN
    RAISE EXCEPTION 'Expected pg_net queue/response objects are missing';
  END IF;

  SELECT count(*) INTO v_pending FROM net.http_request_queue;
  IF v_pending <> 0 THEN
    RAISE EXCEPTION
      'pg_net cutover stopped: % HTTP requests remain queued; let them drain and retry',
      v_pending;
  END IF;

  SELECT count(*) INTO v_cron_count
  FROM cron.job
  WHERE command ILIKE '%net.http_%';
  IF v_cron_count <> 1 THEN
    RAISE EXCEPTION
      'pg_net cutover stopped: expected exactly one pg_cron job using net.http_*, found %',
      v_cron_count;
  END IF;

  SELECT *
    INTO STRICT v_job
  FROM cron.job
  WHERE jobname = 'jobly-discover-jobs-every-6h'
    AND active
    AND command ILIKE '%net.http_post%';

  SELECT count(*) INTO v_custom_reference_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND n.nspname <> 'net'
    AND NOT (n.nspname = 'extensions' AND p.proname = 'grant_pg_net_access')
    AND pg_get_functiondef(p.oid) ILIKE '%net.http_%';

  IF v_custom_reference_count <> 0 THEN
    RAISE EXCEPTION
      'pg_net cutover stopped: % custom functions reference net.http_*; inventory dependencies first',
      v_custom_reference_count;
  END IF;

  -- Preserve the short-lived response evidence before DROP EXTENSION removes
  -- pg_net-owned response storage. The archive schema is private and RLS-deny.
  SELECT count(*) INTO v_response_count FROM net._http_response;
  CREATE SCHEMA IF NOT EXISTS jobly_security_audit;
  REVOKE ALL ON SCHEMA jobly_security_audit
    FROM PUBLIC, anon, authenticated, service_role;

  CREATE TABLE IF NOT EXISTS jobly_security_audit.pg_net_response_archive_20261105 (
    id bigint,
    status_code integer,
    content_type text,
    headers jsonb,
    content text,
    timed_out boolean,
    error_msg text,
    created timestamptz,
    archived_at timestamptz NOT NULL DEFAULT now()
  );
  REVOKE ALL ON TABLE jobly_security_audit.pg_net_response_archive_20261105
    FROM PUBLIC, anon, authenticated, service_role;
  ALTER TABLE jobly_security_audit.pg_net_response_archive_20261105
    ENABLE ROW LEVEL SECURITY;

  IF EXISTS (SELECT 1 FROM jobly_security_audit.pg_net_response_archive_20261105) THEN
    RAISE EXCEPTION 'pg_net response archive already contains data; refusing duplicate cutover';
  END IF;

  INSERT INTO jobly_security_audit.pg_net_response_archive_20261105
    (id, status_code, content_type, headers, content, timed_out, error_msg, created)
  SELECT id, status_code, content_type, headers, content, timed_out, error_msg, created
  FROM net._http_response;

  RAISE NOTICE 'Archiving % historical pg_net responses before extension recreation', v_response_count;

  IF NOT cron.unschedule(v_job.jobid) THEN
    RAISE EXCEPTION 'Unable to pause pg_cron job %', v_job.jobname;
  END IF;

  -- RESTRICT is intentional: any hidden object dependency aborts and rolls
  -- back the whole transaction. Never replace this with CASCADE.
  DROP EXTENSION pg_net RESTRICT;
  CREATE EXTENSION pg_net WITH SCHEMA extensions;

  IF NOT EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'pg_net'
      AND extnamespace = 'extensions'::regnamespace
  ) THEN
    RAISE EXCEPTION 'pg_net was not registered in schema extensions';
  END IF;

  IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN
    RAISE EXCEPTION 'net.http_post was not restored after pg_net recreation';
  END IF;

  v_new_job_id := cron.schedule(v_job.jobname, v_job.schedule, v_job.command);
  IF v_new_job_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobid = v_new_job_id
      AND jobname = v_job.jobname
      AND active
      AND schedule = v_job.schedule
  ) THEN
    RAISE EXCEPTION 'Unable to restore the Jobly discovery cron schedule';
  END IF;
END
$$;

COMMIT;

-- Post-commit checks (run separately after the transaction):
-- SELECT extname, extversion, extnamespace::regnamespace, extrelocatable
-- FROM pg_extension WHERE extname = 'pg_net';
-- SELECT jobid, jobname, schedule, active FROM cron.job
-- WHERE jobname = 'jobly-discover-jobs-every-6h';
-- SELECT count(*) FROM net.http_request_queue;
-- After the next scheduled discovery, inspect net._http_response and require
-- an expected 2xx response. Do not treat pg_cron "succeeded" alone as proof.
