# Lot G — production checkpoint — 2026-10-02

## State of truth

- Career Brain integration: merged to `main` via PR #171.
- Career Brain connection pass: merged to `main` via PR #172.
- Main merge commit: `d1cd41d8ad6b4cc828c29df578f12533ddb7d891`.
- Production schema migration: `career_journey_360` applied to JOBLY-PROD.
- Career Journey production tables: present with RLS enabled.
- Career Journey production policies: 4 policies per table (SELECT / INSERT / UPDATE / DELETE).
- Typecheck + production build: green on the final Lot G connection SHA.
- Offer pipeline verification: green on the final Lot G connection SHA.
- J’IA Cognitive/Hard/Internet/Architecture/Master gates: green on the final Lot G connection SHA.
- Vercel production delivery: wired to `main` through `.github/workflows/vercel-production.yml`; deployment must remain gated by typecheck + Vercel build.
- Africa Shadow Crawl: still running independently at the time of this checkpoint; it is not a Career Journey dependency.

## Architecture

Career Journey 360 remains the source of truth. Career Brain is a computed intelligence layer over it. J’IA reads that state and orchestrates proposals/actions without creating a parallel career state.

The connected loop is:

Career Journey → Career Brain → Opportunity / Mobility / Learning / Interview / CV evidence → Outcome → Review → Reassessment → updated Career state → next recommendation.

No parallel outcome or career-state model was introduced.

## Production safety

The production migration was applied only after the application code passed the final static/build gates. The migration creates the Career Journey schema and its RLS policies; it does not seed or mutate user career data.
