-- Explicit deny-by-default policies for 72 service-only public tables.
-- Applied to JOBLY-PROD as migration p2_explicit_service_only_rls_denials_20261105.
-- This only targets tables with RLS enabled, no pre-existing policy, no anon/authenticated
-- table privileges, and an existing service_role SELECT grant. service_role has BYPASSRLS.
DO $migration$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.oid, n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
      AND NOT has_table_privilege('anon', c.oid, 'SELECT')
      AND NOT has_table_privilege('anon', c.oid, 'INSERT')
      AND NOT has_table_privilege('anon', c.oid, 'UPDATE')
      AND NOT has_table_privilege('anon', c.oid, 'DELETE')
      AND NOT has_table_privilege('authenticated', c.oid, 'SELECT')
      AND NOT has_table_privilege('authenticated', c.oid, 'INSERT')
      AND NOT has_table_privilege('authenticated', c.oid, 'UPDATE')
      AND NOT has_table_privilege('authenticated', c.oid, 'DELETE')
      AND has_table_privilege('service_role', c.oid, 'SELECT')
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      'deny_client_access',
      t.nspname,
      t.relname
    );
  END LOOP;
END
$migration$;
