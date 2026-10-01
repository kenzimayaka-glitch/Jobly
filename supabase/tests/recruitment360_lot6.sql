-- Recruitment 360° Lot 6 — SQL assertions
select to_regclass('public."RecruitmentDecisionPolicy"') is not null as policy_table_present;
select to_regclass('public."RecruitmentOffer"') is not null as offer_table_present;
select to_regclass('public."RecruitmentOfferNegotiation"') is not null as negotiation_table_present;
select to_regclass('public."RecruitmentDecisionApproval"') is not null as approval_table_present;
select to_regclass('public."RecruitmentDecisionReference"') is not null as reference_table_present;
select to_regclass('public."RecruitmentDecisionRecommendation"') is not null as recommendation_table_present;
select relrowsecurity from pg_class where oid='public."RecruitmentOffer"'::regclass;
select relrowsecurity from pg_class where oid='public."RecruitmentDecisionPolicy"'::regclass;
select has_function_privilege('anon','public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb)','EXECUTE')=false as anon_cannot_finalize;
select has_function_privilege('authenticated','public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb)','EXECUTE')=false as authenticated_cannot_finalize;
select has_function_privilege('service_role','public.recruitment360_lot6_finalize_decision(uuid,text,text,text,text,numeric,jsonb)','EXECUTE') as service_can_finalize;
select has_function_privilege('service_role','public.recruitment360_lot6_respond_offer(uuid,text,text,integer,text,text,date)','EXECUTE') as service_can_respond_offer;
