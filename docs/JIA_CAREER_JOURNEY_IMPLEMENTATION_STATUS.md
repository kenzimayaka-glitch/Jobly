# J’IA Career Journey 360 — État canonique

Date : 02 octobre 2026

## Source de vérité

**Career Journey 360 — Architecture B est la seule architecture Career retenue pour cette étape.**

Architecture A est abandonnée. Toute évolution Career doit prolonger Architecture B et ne doit pas créer un état, une trajectoire ou un parcours parallèle.

## Socle intégré dans main

- `CareerJourney` comme état longitudinal.
- Objectifs et horizon cible.
- Évaluation de compétences, écarts et readiness.
- Recommandations explicables, avec hypothèses et données manquantes.
- Missions et historique de progression.
- Preuves professionnelles et portfolio.
- Scénarios de trajectoire.
- Revues périodiques et réévaluation.
- Radar contextualisé.
- Entitlements réutilisant le catalogue existant.
- UI `/career-journey`.
- APIs : parcours, assessments, missions, portfolio, radar.
- Migration : `20261002050000_career_journey_360`.
- RLS définies dans la migration.

## Boucle canonique

Career Journey → Objectif → Compétences / Gap → Recommandations → Missions → Progression → Evidence → Portfolio → Assessment → Radar / Scénarios → Review → Réévaluation → boucle suivante.

## Intégrations

- **Career Engine** : moteur d'analyse réutilisé par Journey, sans devenir une seconde source d'état.
- **J’IA** : couche d'intelligence/orchestration autour de Journey.
- **Offers / Matching** : alimentation du Radar et des opportunités contextualisées.
- **CV / Evidence** : les preuves et éléments de portfolio alimentent la progression.
- **Mobility** : branche d'exécution lorsqu'une opportunité nécessite une mobilité géographique.
- **Outcome** : doit alimenter les Reviews et la réévaluation lorsque les événements métier seront raccordés.

## État

| Élément | État |
|---|---|
| Architecture B | 🟢 SOURCE UNIQUE DE VÉRITÉ |
| Code Career Journey | 🟢 INTÉGRÉ DANS MAIN |
| Schéma Prisma | 🟢 INTÉGRÉ |
| Migration | 🟢 PRÉSENTE DANS MAIN |
| Documentation | 🟢 MISE À JOUR |
| JOBLY-PROD | ⏸️ NON MODIFIÉE PAR CETTE PASSE |
| Vercel | ⏸️ AUCUN DÉPLOIEMENT |
| E2E complet | ⏳ À POURSUIVRE |
| Outcome → Review → Reassessment | ⏳ À RACCORD​ER / VALIDER |
| Suppression des anciennes branches | ⏳ APRÈS CONTRÔLE FINAL |

## Règle de gouvernance

Aucun chantier Career ultérieur ne doit proposer Architecture A ou un modèle concurrent. Les travaux suivants portent uniquement sur la réconciliation fonctionnelle, les intégrations cross-écosystèmes et la validation E2E d'Architecture B.
