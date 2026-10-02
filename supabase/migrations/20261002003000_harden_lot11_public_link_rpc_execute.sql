-- Lot 11 security hardening: public-link creation is a server-only operation.
-- The Next.js API calls this RPC through the service-role client after its own role check.
revoke execute on function public.recruitment360_lot11_create_public_link_v2(uuid,text,integer,text,text) from public, anon, authenticated;
grant execute on function public.recruitment360_lot11_create_public_link_v2(uuid,text,integer,text,text) to service_role;
