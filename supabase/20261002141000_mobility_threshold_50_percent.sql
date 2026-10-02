alter table public."MobilityRequest" alter column "eligibilityThresholdPercent" set default 50;
alter table public."MobilityEligibilityDecision" alter column "thresholdPercent" set default 50;
alter table public."MobilityProgram" alter column "eligibilityRule" set default '{"mobilityThresholdPercent":50,"requiresEmployerAgreement":true,"requiresRecruiterGuarantee":true,"repaymentMonths":3}'::jsonb;
update public."MobilityProgram"
set "eligibilityRule" = jsonb_set(coalesce("eligibilityRule",'{}'::jsonb), '{mobilityThresholdPercent}', '50'::jsonb, true)
where coalesce(("eligibilityRule"->>'mobilityThresholdPercent')::numeric, 35) <> 50;
