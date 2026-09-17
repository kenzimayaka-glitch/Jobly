create or replace function public.update_promo_code_timestamp()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;
revoke execute on function public.update_promo_code_timestamp() from public, anon, authenticated;
grant execute on function public.update_promo_code_timestamp() to service_role;
