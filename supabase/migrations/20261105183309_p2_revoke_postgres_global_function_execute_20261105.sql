-- Remove PostgreSQL's built-in PUBLIC EXECUTE default for future functions created by postgres.
-- Applies globally (not IN SCHEMA), because schema-scoped defaults cannot revoke a global default.
-- Existing function ACLs are unchanged. New client-facing RPCs must receive explicit GRANT EXECUTE.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
