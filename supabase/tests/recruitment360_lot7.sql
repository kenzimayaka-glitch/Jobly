-- Recruitment 360° Lot 7 — structural/security smoke assertions
select to_regclass('public."RecruitmentReport"') is not null as report_table_present;
select to_regclass('public."RecruitmentReview"') is not null as review_table_present;
select relrowsecurity from pg_class where oid='public."RecruitmentReport"'::regclass;
select relrowsecurity from pg_class where oid='public."RecruitmentReview"'::regclass;
select has_function_privilege('anon','public.recruitment360_lot7_generate_report(uuid,text,text,uuid)','EXECUTE')=false as anon_cannot_generate_report;
select has_function_privilege('authenticated','public.recruitment360_lot7_generate_report(uuid,text,text,uuid)','EXECUTE')=false as authenticated_cannot_generate_report;
select has_function_privilege('service_role','public.recruitment360_lot7_generate_report(uuid,text,text,uuid)','EXECUTE') as service_can_generate_report;
select has_function_privilege('anon','public.recruitment360_lot7_submit_review(uuid,uuid,text,text,text,boolean)','EXECUTE')=false as anon_cannot_submit_review;
select has_function_privilege('authenticated','public.recruitment360_lot7_submit_review(uuid,uuid,text,text,text,boolean)','EXECUTE')=false as authenticated_cannot_submit_review;
select has_function_privilege('service_role','public.recruitment360_lot7_submit_review(uuid,uuid,text,text,text,boolean)','EXECUTE') as service_can_submit_review;
