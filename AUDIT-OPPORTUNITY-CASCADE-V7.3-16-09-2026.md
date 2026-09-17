# JOBLY — Audit Opportunity Aggregator / PUB AUTO CASCADE — 16/09/2026

## Périmètre
- Talent uniquement.
- Authentification, EcosystemSelector, Recruiter et Partner protégés.

## Fonctionnalités
- Mix emplois / stages / formations externes.
- Top 10 maximum.
- Score = Prestige 50% + Match profil 50%.
- 3 phases : logo 0-1s, badge entreprise 1-2s, poste 2-4s, transition 4-5s.
- 8 transitions, tirage via Math.random(), aucune répétition consécutive.
- Pause hover/touch.
- Swipe gauche/droite.
- Flèches et dots.
- Reprise automatique 5s après navigation manuelle.
- Clic emploi/stage -> /jobs/[id]?source=...
- Clic formation -> source externe dans un nouvel onglet.
- Fallback logo par initiales si logo distant absent/erreur.

## Sources
- `CourseRecommendation` : liens externes déjà stockés dans JOBLY.
- freeCodeCamp Curriculum GraphQL API : métadonnées publiques, liens vers la plateforme originale.
- Microsoft Learn : connecteur préparé mais désactivé tant que l'authentification serveur n'est pas configurée.
- Aucun scraping arbitraire.

## Contrôles
- `/app/ecosystem/page.tsx` inchangé vs V7.2.
- `/components/EcosystemSelector.tsx` inchangé vs V7.2.
- Aucun fichier d'authentification modifié vs V7.2.
- Aucun dossier `/jobly/` dupliqué.
- 1 seul `schema.prisma`.
- Modification code limitée à :
  - `app/jobs/page.tsx`
  - `app/api/opportunity-cascade/route.ts`
  - `components/OpportunityCascade.tsx`
  - `lib/opportunityAggregator.ts`
  - `lib/externalTrainingSources.ts`
  - `app/globals.css`
  - documentation.

## Limitation de validation
Le build Next.js complet n'a pas pu être exécuté dans cet environnement car `node_modules` n'est pas fourni et le registre npm n'est pas accessible. Vercel reste la validation finale de compilation/runtime.
