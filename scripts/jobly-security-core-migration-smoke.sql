do $$
begin
  if has_table_privilege('anon', 'public."Job"', 'SELECT') then raise exception 'anon can still select Job'; end if;
  if has_table_privilege('authenticated', 'public."Job"', 'SELECT') then raise exception 'authenticated can still select Job'; end if;
  if has_table_privilege('anon', 'public."RecruiterJob"', 'SELECT') then raise exception 'anon can still select RecruiterJob'; end if;
  if has_table_privilege('authenticated', 'public."RecruiterJob"', 'SELECT') then raise exception 'authenticated can still select RecruiterJob'; end if;
  if has_table_privilege('anon', 'public."Company"', 'SELECT') then raise exception 'anon can still select Company'; end if;
  if has_table_privilege('anon', 'public."JobHarvestCapture"', 'SELECT') then raise exception 'anon can still select JobHarvestCapture'; end if;
  if not has_table_privilege('service_role', 'public."Job"', 'SELECT') then raise exception 'service_role lost Job access'; end if;
  if has_table_privilege('anon', 'public."JoblyRateLimitBucket"', 'SELECT') then raise exception 'anon can inspect rate-limit buckets'; end if;
  if has_function_privilege('anon', 'public.consume_jobly_rate_limit(text,text,integer,integer)', 'EXECUTE') then raise exception 'anon can call rate-limit RPC'; end if;
  if has_function_privilege('authenticated', 'public.consume_jobly_rate_limit(text,text,integer,integer)', 'EXECUTE') then raise exception 'authenticated can call rate-limit RPC'; end if;
  if not has_function_privilege('service_role', 'public.consume_jobly_rate_limit(text,text,integer,integer)', 'EXECUTE') then raise exception 'service_role cannot call rate-limit RPC'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public."Job"'::regclass) then raise exception 'RLS is disabled on Job'; end if;
end;
$$;

set role service_role;
do $$
declare a record; b record; c record;
begin
  select * into a from public.consume_jobly_rate_limit('smoke:test', repeat('a',64), 2, 60);
  select * into b from public.consume_jobly_rate_limit('smoke:test', repeat('a',64), 2, 60);
  select * into c from public.consume_jobly_rate_limit('smoke:test', repeat('a',64), 2, 60);
  if not a.allowed or not b.allowed then raise exception 'first two requests should be allowed'; end if;
  if c.allowed or c.remaining <> 0 then raise exception 'third request should be blocked'; end if;
end;
$$;
reset role;
