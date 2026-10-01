-- J’IA / AI credit security hardening.
-- The RPC is SECURITY DEFINER and must never be callable from the public Data API.
revoke execute on function public.reserve_ai_credit(uuid,text,text,integer,text) from public;
revoke execute on function public.reserve_ai_credit(uuid,text,text,integer,text) from anon, authenticated;
grant execute on function public.reserve_ai_credit(uuid,text,text,integer,text) to service_role;
