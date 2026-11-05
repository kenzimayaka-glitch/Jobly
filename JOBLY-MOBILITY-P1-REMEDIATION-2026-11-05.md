# Jobly Mobility — P1 remediation & release audit
**Date:** 5 November 2026  
**Base inspected:** `main @ 707e55308fc5c761ac0b77cee06cb2e92e81c482`  
**Branch:** `fix/p1-mobility-business-journey-20261105`  
**Scope:** 50% business threshold, eligibility, employer/recruiter obligations, provider onboarding, institutional funding, disbursement proof and partner workflow.

## Code readiness

The branch contains the end-to-end business and control paths needed to operate the process once the additive database migration is rolled out and real institutions/providers submit verified evidence.

- Threshold 50%, inclusive boundary, precision-safe comparison; rule engine versioned.
- Talent request takes the accepted recruiter's offer and approved salary, not browser-provided salary.
- Premium gate uses the production `Subscription.planCode` and verifies active period.
- Employer agreement is versioned, authenticated and explicitly accepted by an authorized recruiter representative.
- Recruiter guarantee verifies ownership, agreement and recalculates eligibility; it cannot override missing information or an ineligible request.
- Talent can apply to an active, budget-evidence-verified, non-DEMO funding programme.
- Institution admin reviews applications; only APPROVED applications can create allocations.
- Allocation is performed under a locked programme row, checks eligible dossier, 50% rule, guarantee, verified programme commitment, currency and available unreserved budget.
- Provider registry is separate from affiliate Partner. Onboarding accepts KYC to a private Storage bucket and a provider agreement; only an Admin can verify and activate the provider.
- Providers can publish service catalogues and update only their assigned jobs through legal state transitions.
- A service assignment requires a verified provider, a dossier eligible at 50%, recruiter guarantee and an approved allocation under an institution programme.
- Disbursement submission requires a Finance provider verified by Jobly, a positive amount, external bank/mobile-money reference, HTTPS evidence and an idempotency key. It remains `PENDING_VERIFICATION`.
- An independent Jobly Admin confirmation is the only transition to `EXECUTED`; allocation totals determine partial/full disbursement status.
- Institution, recruiter, provider and Admin screens expose the appropriate steps; reports are scoped by ownership/allocation/provider assignment.
- Prisma schema and CI now validate the new models and run Mobility regression tests.

## Production observations — read-only, prior to rollout

JOBLY-PROD was queried without writes. At the last read-only snapshot:
- Mobility requests: 0
- Mobility cost items: 0
- Eligibility decisions: 0
- Accepted employer agreements: 0
- Accepted recruiter guarantees: 0
- Funding allocations: 0
- Successful funding transactions: 0
- Mobility documents: 0
- Mobility process events: 0
- The one active programme is `JOBLY-MOBILITY-DEMO-001` / “Programme Pilote Mobility — DEMO”, with a configured 10,000,000 XAF budget. It is deliberately excluded from all applications, allocations and disbursements.

No genuine employer agreement, finance provider KYC, signed funding commitment or payment evidence existed in that production snapshot. These cannot be manufactured by code or by CI.

## Database rollout required

The branch includes:
- `supabase/migrations/20261105160000_mobility_provider_funding_runtime.sql`
- `supabase/migrations/20261105160100_mobility_provider_single_account_guard.sql`

These are additive migrations and have not been applied to JOBLY-PROD in this task. They create the provider/service/assignment and programme-application tables, private KYC bucket, funding evidence fields, RLS/service-role grants and controlled funding RPCs. Production API activation requires this database rollout and verification afterward.

## Release boundary

- Code can be merged after CI/build/Prisma validation succeeds.
- No production migration or data writes were performed.
- No real allocation or disbursement was created.
- No actual provider or institution KYC/contract was asserted to be verified.
- No Vercel deployment was initiated.

**Conclusion:** the blocking code and integration gaps have been addressed in this branch. The global live-operations indicator must remain pending until the migrations are rolled out, a real funded programme is verified, a finance provider is KYC-verified and at least one real dossier-to-transfer journey is evidenced.
