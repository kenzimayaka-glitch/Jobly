-- Jobly Recruitment 360° v2 — Lot 7 database assertions
do $$
declare
 v integer;
begin
 select count(*) into v from pg_class where oid='public."RecruitmentReportShare"'::regclass and relrowsecurity;
 if v<>1 then raise exception 'LOT7_REPORT_SHARE_RLS_FAILED'; end if;
 select count(*) into v from pg_class where oid='public."RecruitmentReview"'::regclass and relrowsecurity;
 if v<>1 then raise exception 'LOT7_REVIEW_RLS_FAILED'; end if;
 select count(*) into v from information_schema.role_routine_grants where routine_schema='public' and routine_name like 'recruitment360_lot7_%' and grantee='service_role' and privilege_type='EXECUTE';
 if v<>4 then raise exception 'LOT7_SERVICE_EXECUTE_FAILED'; end if;
 select count(*) into v from information_schema.role_routine_grants where routine_schema='public' and routine_name like 'recruitment360_lot7_%' and grantee in('anon','authenticated') and privilege_type='EXECUTE';
 if v<>0 then raise exception 'LOT7_CLIENT_EXECUTE_LEAK'; end if;
 select count(*) into v from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relname='RecruitmentApplicationState' and t.tgname='recruitment360_lot7_review_request';
 if v<>1 then raise exception 'LOT7_REVIEW_TRIGGER_FAILED'; end if;
end $$;
