-- pg_net lives in an extension-owned, non-relocatable installation.
-- Do not move the extension: the production cron depends on net.http_post().
-- Client/API roles do not need arbitrary outbound HTTP from PostgreSQL.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'net') then
    execute 'revoke all privileges on schema net from public, anon, authenticated';
    execute 'grant usage on schema net to service_role';
    execute 'revoke execute on all functions in schema net from public, anon, authenticated';
    execute 'grant execute on all functions in schema net to service_role';
    execute 'alter default privileges for role postgres in schema net revoke execute on functions from public';
  end if;
end;
$$;
