do $$
declare n integer; rls_ok boolean;
begin
 select count(*) into n from information_schema.tables where table_schema='public' and table_name in('RecruitmentApplicationAssessment','RecruitmentApplicationDocument','RecruitmentShortlist');
 if n<>3 then raise exception 'Lot3 tables missing: %',n; end if;
 select bool_and(c.relrowsecurity) into rls_ok from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relname in('RecruitmentApplicationAssessment','RecruitmentApplicationDocument','RecruitmentShortlist');
 if coalesce(rls_ok,false) is not true then raise exception 'Lot3 RLS incomplete'; end if;
 if has_table_privilege('anon','public."RecruitmentShortlist"','select') then raise exception 'anon can read shortlist'; end if;
 if has_function_privilege('authenticated','public.recruitment360_lot3_set_shortlist(uuid,text,text,text,timestamptz,integer)','execute') then raise exception 'authenticated can execute shortlist RPC'; end if;
end $$;