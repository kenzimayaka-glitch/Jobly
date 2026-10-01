-- Lot 2 targeted DB tests. Run with service role / SQL runner.
select count(*) as versions from public."RecruitmentAnnouncementVersion";
select count(*) as criteria from public."RecruitmentCriterion";
select count(*) as events from public."RecruitmentPublicationEvent";
select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('RecruitmentAnnouncementVersion','RecruitmentCriterion','RecruitmentPublicationEvent') order by tablename;
select routine_name, privilege_type from information_schema.routine_privileges where specific_schema='public' and routine_name like 'recruitment360_lot2_%' and grantee in ('anon','authenticated') order by routine_name, grantee;