-- Restrict pg_net HTTP capabilities to trusted server-side execution.
-- pg_net is used by scheduled/server workflows; browser roles must not be able
-- to invoke outbound HTTP functions directly.
BEGIN;

REVOKE ALL PRIVILEGES ON SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA net TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA net REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA net GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMIT;
