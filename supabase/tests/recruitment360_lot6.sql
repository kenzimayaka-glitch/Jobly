-- Lot 6 smoke assertions. Execute in an isolated test transaction/fixture.
select to_regclass('public."RecruitmentDecision"') is not null as decision_table_present;
select to_regclass('public."RecruitmentDecisionVote"') is not null as vote_table_present;
select relrowsecurity from pg_class where oid='public."RecruitmentDecision"'::regclass;
select relrowsecurity from pg_class where oid='public."RecruitmentDecisionVote"'::regclass;
select has_function_privilege('anon','public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb)','EXECUTE')=false as anon_cannot_finalize;
select has_function_privilege('authenticated','public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb)','EXECUTE')=false as authenticated_cannot_finalize;
select has_function_privilege('service_role','public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb)','EXECUTE') as service_can_finalize;
select has_function_privilege('service_role','public.recruitment360_lot6_submit_vote(uuid,text,text,numeric,text,uuid)','EXECUTE') as service_can_vote;
select has_function_privilege('service_role','public.recruitment360_lot6_list_candidates(uuid,text)','EXECUTE') as service_can_list;
