-- Owner-only correction for JOBLY-PROD.
-- Execute only as supabase_admin, a superuser, or a role with membership in supabase_admin.
-- Removes risky client defaults for objects created by supabase_admin in exposed/GraphQL schemas.
-- Existing objects and service_role grants are not modified by this script.
BEGIN;

DO $guard$
DECLARE
  v_superuser boolean;
BEGIN
  SELECT rolsuper INTO v_superuser
  FROM pg_roles
  WHERE rolname = current_user;

  IF current_user <> 'supabase_admin'
     AND NOT coalesce(v_superuser, false)
     AND NOT pg_has_role(current_user, 'supabase_admin', 'MEMBER') THEN
    RAISE EXCEPTION
      'Blocked: current role % cannot alter supabase_admin default privileges. Run as supabase_admin or an authorized owner/support operator.',
      current_user;
  END IF;
END
$guard$;

-- PUBLIC API schema.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- GraphQL internal/public schemas: future objects must not inherit client grants.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
