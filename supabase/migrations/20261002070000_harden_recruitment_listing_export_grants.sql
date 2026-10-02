-- Harden Recruitment360 official listing functions: only server-side callers may invoke them.
revoke execute on function public.recruitment360_lot11_get_official_listing(uuid) from public, anon, authenticated;
revoke execute on function public.recruitment360_lot11_export_official_listing(uuid, text) from public, anon, authenticated;
revoke execute on function public.recruitment360_lot11_export_official_listing_csv(uuid) from public, anon, authenticated;
revoke execute on function public.recruitment360_lot11_export_official_listing_csv_v2(uuid) from public, anon, authenticated;

-- Public sharing remains available through the token-gated function.
grant execute on function public.recruitment360_lot11_get_public_listing(text) to anon, authenticated;
