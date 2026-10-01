-- Recruitment 360° Lot 1 database smoke checks.
-- Run against a test database with: supabase test db, or execute each assertion
-- through the Supabase SQL editor/MCP in a controlled environment.
--
-- This project currently has no pgTAP extension enabled, so this file uses
-- plain PostgreSQL DO assertions and does not require a test-only extension.

do $$
declare
  v_count integer;
  v_rls boolean;
begin
  select count(*) into v_count
  from information_schema.tables
  where table_schema='public'
    and table_name in (
      'Recruitment360','RecruitmentApplicationState','RecruitmentRole',
      'RecruitmentAuditLog','RecruitmentInvitationCode'
    );
  if v_count <> 5 then
    raise exception 'Recruitment 360 foundation tables missing: %', v_count;
  end if;

  select count(*) into v_count
  from pg_policies
  where schemaname='public'
    and tablename in (
      'Recruitment360','RecruitmentApplicationState','RecruitmentRole',
      'RecruitmentAuditLog','RecruitmentInvitationCode'
    );
  if v_count < 5 then
    raise exception 'Recruitment 360 RLS policies incomplete: %', v_count;
  end if;

  select bool_and(c.relrowsecurity) into v_rls
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in (
      'Recruitment360','RecruitmentApplicationState','RecruitmentRole',
      'RecruitmentAuditLog','RecruitmentInvitationCode'
    );
  if coalesce(v_rls,false) is not true then
    raise exception 'Recruitment 360 RLS is not enabled on every foundation table';
  end if;

  if not has_table_privilege('anon','public."Recruitment360"','select') is false then
    raise exception 'Anonymous access unexpectedly granted to Recruitment360';
  end if;
end;
$$;

-- Functional transition and notification-open behavior are covered by the
-- Lot 1 execution report with isolated rollback/cleanup data.
