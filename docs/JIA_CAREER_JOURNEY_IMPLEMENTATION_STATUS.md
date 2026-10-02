# J’IA Career Journey 360 — Implementation Status

Date: 2 octobre 2026

## Branch / PR

- Branch: `feat/jia-career-journey-360-main-20261002`
- PR: #155
- Base: current `main`
- Production DB: unchanged
- Vercel: no deployment
- Supabase migration: not applied to `JOBLY-PROD`

## Implemented

- Career Journey longitudinal state
- Career goals and target horizon
- Reuse of `lib/careerEngine.ts` for readiness, gaps and next action
- Explainable recommendations with assumptions and missing data
- Mission lifecycle + progress history
- Optional competency assessments
- QCM contract: max 4 standard choices, Other, multiple selection and voice capability metadata
- Evidence provenance: declared / documented / AI-evaluated / convergent
- Portfolio of achievements
- Alternative career scenarios
- Consent-based periodic reviews
- Contextual Career Radar based on currently accessible JOBLY offers; explicitly non-predictive
- Initial Career Journey UI at `/career-journey`
- RLS policies in the migration
- Existing plan catalogue reused; no parallel billing/credit system

## Product classification

The feature uses the existing FREE / START / PREMIUM / PRO catalogue:

| Capability | FREE | START | PREMIUM | PRO |
|---|---|---|---|---|
| Career Journey + basic reassessment | ✓ | ✓ | ✓ | ✓ |
| Active missions | 1 | 3 | 10 | Unlimited |
| Optional competency assessments / month | 1 | 3 | 10 | Unlimited |
| Adaptive assessments | — | — | ✓ | ✓ |
| Periodic review | — | ✓ | ✓ | ✓ |
| Career path simulation | — | — | ✓ | ✓ |
| Career Radar | — | — | ✓ | ✓ |
| Advanced portfolio | — | — | ✓ | ✓ |

These limits are implemented through `lib/careerJourneyEntitlements.ts` and reuse the existing subscription/promo resolution.

## Still pending validation

1. Generate/refresh Prisma client from the updated schema.
2. Run `prisma validate`, TypeScript/build and E2E checks.
3. Apply the migration to a non-production validation database/branch.
4. Run Supabase security/performance advisors.
5. Validate the complete Career Journey flow against real authenticated data.
6. Only after validation: decide whether the migration and PR are ready for human approval.

No production migration or deployment is performed by this implementation step.


## Checkpoint conformité — 2 octobre 2026

Contrôle croisé code ↔ décisions validées :
- Corrigé : une recommandation de préparation suffisante ne demande plus une « vérification » intermédiaire ; elle produit une recommandation explicite de candidature (APPLY).
- Corrigé : une mission ne peut plus être créée directement en ACCEPTED ; elle commence en PROPOSED et nécessite l'action explicite d'acceptation.
- Corrigé : les transitions de mission invalides sont refusées côté serveur.
- Corrigé : les preuves liées à une mission, une évaluation ou un portfolio sont désormais vérifiées côté serveur pour empêcher le rattachement à une ressource d'un autre compte.
- Corrigé : la migration Career Journey n'utilise plus FOR ALL pour ses politiques RLS ; les opérations SELECT/INSERT/UPDATE/DELETE sont séparées avec contrôle propriétaire.
- Réconcilié : la migration Career Journey existe dans la branche sous packages/database/prisma/migrations/20261002050000_career_journey_360/migration.sql.

### État de vérité
**🟨 CODÉ + CORRIGÉ + RÉCONCILIÉ — NON VALIDÉ RUNTIME / NON DÉPLOYÉ.**

La base JOBLY-PROD ne contient pas encore les tables Career* de cette migration. Aucun changement de schéma de production n'a été exécuté pendant cette passe. Le build/TypeScript et l'E2E restent à exécuter sur un environnement de validation avant toute approbation humaine.

**Aucun merge vers main et aucun déploiement Vercel n'ont été effectués.**
