select count(*) as interview_slots from public."RecruitmentInterviewSlot";
select count(*) as interviews from public."RecruitmentInterview";
select count(*) as juries from public."RecruitmentInterviewJury";
select count(*) as attendance from public."RecruitmentInterviewAttendance";
select count(*) as reminders from public."RecruitmentInterviewReminder";
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename like 'RecruitmentInterview%' order by tablename;
select routine_name,grantee,privilege_type from information_schema.routine_privileges where specific_schema='public' and routine_name like 'recruitment360_lot5_%' and grantee in('anon','authenticated') order by routine_name,grantee;