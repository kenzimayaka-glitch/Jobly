do $$
declare n integer; rls_ok boolean;
begin
 select count(*) into n from information_schema.tables where table_schema='public' and table_name in('RecruitmentTestDefinition','RecruitmentTestQuestion','RecruitmentTestSession','RecruitmentTestAnswer','RecruitmentTestEvent');
 if n<>5 then raise exception 'Lot4 tables missing: %',n; end if;
 select bool_and(c.relrowsecurity) into rls_ok from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relname in('RecruitmentTestDefinition','RecruitmentTestQuestion','RecruitmentTestSession','RecruitmentTestAnswer','RecruitmentTestEvent');
 if coalesce(rls_ok,false) is not true then raise exception 'Lot4 RLS incomplete'; end if;
 if has_function_privilege('authenticated','public.recruitment360_lot4_start_session(uuid,uuid,text)','execute') then raise exception 'authenticated can execute start_session'; end if;
end $$;