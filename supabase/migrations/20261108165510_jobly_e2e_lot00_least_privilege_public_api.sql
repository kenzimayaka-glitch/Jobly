-- JOBLY-E2E only: least-privilege grants for public API roles.
-- Preserve existing authenticated CRUD grants and the three intentional anonymous read surfaces.
-- Supabase-owned supabase_admin default privileges are platform-managed and intentionally untouched.

-- Stop future objects created by postgres in public from being automatically exposed to client roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Anonymous clients receive read access only to existing public content tables.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON TABLE public."BonPlan", public."BonPlanComment", public."Institution" TO anon;

-- Authenticated users keep their existing SELECT/INSERT/UPDATE/DELETE grants,
-- while non-application DDL/control privileges are removed.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public
  FROM authenticated;

-- No direct sequence privileges are required by browser roles.
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- No anonymous caller needs direct execution of a public-schema function.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- These two trigger functions must not be callable as Data API RPCs.
REVOKE EXECUTE ON FUNCTION public.set_applications_updated_at()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profiles_updated_at()
  FROM PUBLIC, anon, authenticated;

-- This aggregate RPC is no longer used by the current home-stats route,
-- which calculates metrics server-side through adminClient.
REVOKE EXECUTE ON FUNCTION public.get_public_home_stats()
  FROM PUBLIC, anon, authenticated;

-- This guarded Recruitment360 batch RPC is for signed-in recruiter members only.
-- Preserve its authenticated grant, remove the inherited PUBLIC/anonymous entry point.
REVOKE EXECUTE ON FUNCTION public.recruitment360_lot10_execute_batch(
  uuid, text, text, uuid[], text, jsonb
) FROM PUBLIC, anon;

-- recruitment360_lot11_set_listing_consent remains executable by authenticated
-- users only; its ownership check is enforced in the function body.
