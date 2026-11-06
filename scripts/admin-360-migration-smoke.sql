-- Admin 360 + Jobly Intelligence 360 migration smoke test.
-- Run after the isolated migration job has applied all 5 migrations.

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'public."AdminIdentity"',
    'public."AdminWorkspace"',
    'public."AdminManagedAccount"',
    'public."AdminSupportTicket"',
    'public."AdminSupportTicketMessage"',
    'public."AdminCommunityReport"',
    'public."JoblyAnalyticsDailySnapshot"',
    'public."JoblyAnalyticsEvent"',
    'public."JoblyAnalyticsGoal"',
    'public."JoblyAnalyticsReport"',
    'public."JoblyAnalyticsDecision"',
    'public."JoblyAnalyticsAlert"'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = v_table::regclass) THEN
      RAISE EXCEPTION 'RLS is disabled on %', v_table;
    END IF;
    IF has_table_privilege('anon', v_table, 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'anon still has direct table access to %', v_table;
    END IF;
    IF has_table_privilege('authenticated', v_table, 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'authenticated still has direct table access to %', v_table;
    END IF;
    IF NOT has_table_privilege('service_role', v_table, 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'service_role is missing required access to %', v_table;
    END IF;
  END LOOP;

  IF has_function_privilege('anon', 'public.jobly_analytics_refresh_created_history(date,date)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute analytics backfill';
  END IF;
  IF has_function_privilege('authenticated', 'public.jobly_analytics_refresh_created_history(date,date)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute analytics backfill';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.jobly_analytics_refresh_created_history(date,date)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute analytics backfill';
  END IF;

  IF has_schema_privilege('anon', 'net', 'USAGE') OR has_schema_privilege('authenticated', 'net', 'USAGE') THEN
    RAISE EXCEPTION 'client role can use pg_net schema';
  END IF;
  IF NOT has_schema_privilege('service_role', 'net', 'USAGE') THEN
    RAISE EXCEPTION 'service_role lost pg_net schema usage';
  END IF;
  IF has_function_privilege('anon', 'net.http_post(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'net.http_post(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'client role can execute pg_net HTTP helper';
  END IF;
  IF NOT has_function_privilege('service_role', 'net.http_post(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute pg_net HTTP helper';
  END IF;
END;
$$;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
INSERT INTO public."User" ("id", "createdAt", "country") VALUES
  ('admin-owner-1', now(), 'CM'),
  ('admin-owner-2', now(), 'CI');

INSERT INTO public."AdminIdentity" ("id", "ownerUserId", "authUserId", "active")
VALUES ('admin-identity-1', 'admin-owner-1', '00000000-0000-4000-8000-000000000001', true);

DO $$
BEGIN
  BEGIN
    INSERT INTO public."AdminIdentity" ("id", "ownerUserId", "authUserId", "active")
    VALUES ('admin-identity-2', 'admin-owner-2', '00000000-0000-4000-8000-000000000002', true);
    RAISE EXCEPTION 'database accepted a second active root ADMIN';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;

-- Seed source rows as the migration-test owner; service_role receives read-only
-- access to source data and performs the actual backfill below.
INSERT INTO public."Payment" ("id","paidAt","amount","currency","status") VALUES
  ('confirmed-xaf-yesterday', now() - interval '1 day', 15000, 'XAF', 'PAID'),
  ('paid-without-currency-today', now(), 900000, NULL, 'PAID'),
  ('paid-in-usd-today', now(), 750000, 'USD', 'PAID');

-- Execute a real date-bounded backfill with service_role against representative sources.
SET ROLE service_role;
SELECT public.jobly_analytics_refresh_created_history(
  (now() AT TIME ZONE 'Africa/Douala')::date - 1,
  (now() AT TIME ZONE 'Africa/Douala')::date
);
RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."JoblyAnalyticsDailySnapshot"
    WHERE "metricKey" = 'users'
      AND "dimensionKey" = 'ALL'
      AND status = 'observed'
  ) THEN
    RAISE EXCEPTION 'analytics backfill did not persist the User source snapshot';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."JoblyAnalyticsDailySnapshot"
    WHERE "metricKey" = 'jobs'
      AND "dimensionKey" = 'ALL'
      AND "snapshotDate" = (now() AT TIME ZONE 'Africa/Douala')::date
      AND value = 0
      AND status = 'observed'
  ) THEN
    RAISE EXCEPTION 'analytics backfill did not persist an explicit zero for an available empty source';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."JoblyAnalyticsDailySnapshot"
    WHERE "metricKey" = 'revenue_confirmed_xaf'
      AND "dimensionKey" = 'ALL'
      AND "snapshotDate" = (now() AT TIME ZONE 'Africa/Douala')::date
      AND value = 0
      AND status = 'observed'
      AND source = 'confirmed_paid_xaf'
  ) THEN
    RAISE EXCEPTION 'analytics backfill treated missing or non-XAF currency as confirmed XAF revenue';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."JoblyAnalyticsDailySnapshot"
    WHERE "metricKey" = 'revenue_confirmed_xaf'
      AND "dimensionKey" = 'ALL'
      AND "snapshotDate" = (now() AT TIME ZONE 'Africa/Douala')::date - 1
      AND value = 15000
      AND status = 'observed'
      AND source = 'confirmed_paid_xaf'
  ) THEN
    RAISE EXCEPTION 'analytics backfill did not recognize an explicitly confirmed XAF payment';
  END IF;
END;
$$;
