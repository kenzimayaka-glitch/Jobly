-- Keep homepage statistics aggregate access server-side only.
-- The public HTTP route uses adminClient(); browser roles must not call this RPC.
REVOKE ALL ON FUNCTION public.get_public_home_stats()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_home_stats()
  TO service_role;
