# Lot B — Veille J’IA : état de clôture technique

## Branche de travail
`feat/jia-watch-intelligence-b3-20261002`

## B1 — Watcher existant
- Réutilisation du pipeline existant `watchExternal → observeInternet → ingestExternalSignal`.
- Aucun nouveau moteur de recherche créé.

## B2 — Orchestration / persistance
- `JiaWatchSubscription`, `JiaWatchRun`, `JiaWatchSnapshot` persistés.
- Exécution idempotente par abonnement + créneau.
- Hash d’état pour les snapshots.
- Historisation des échecs en `FAILED`.
- Correction appliquée : génération explicite de l’identifiant de subscription à la création, conservation de l’identifiant lors d'une mise à jour.
- Scheduler `/api/cron/jia-watch` protégé par `CRON_SECRET`.
- Aucun abonnement orphelin sans id observé en production au contrôle de clôture.

## B3 — Intelligence de veille
Pipeline :
`SIGNAL → NOUVEAUTÉ → PERTINENCE → IMPACT → CONFIANCE → CONTRADICTIONS → MÉMOIRE → DÉCISION`

Décisions :
- `SUPPRESS` : aucun changement substantiel.
- `DIGEST` : changement utile mais sous le seuil d’alerte immédiate.
- `NOTIFY` : signal nouveau, suffisamment pertinent, impactant et fiable.
- `REVIEW` : signal important mais contesté ; la contradiction réduit la certitude sans supprimer le signal.

Rattachement mémoire :
- clé cognitive `external:<query>`.
- récupération de récurrence, confiance, pertinence et importance depuis `jia_memory`.

Traçabilité :
- scores et décision enregistrés dans `JiaWatchRun`.
- émission de `JIA_WATCH_INTELLIGENCE` via l’Event Bus / trace cognitive.
- notification uniquement in-app pour `NOTIFY` et `REVIEW`.
- aucun push/email automatique activé.

## B3.1 — Validation contrôlée
Le moteur de scoring est isolé dans :
`lib/jia/watchIntelligenceScoring.ts`

Le smoke test :
`scripts/jia-watch-intelligence-smoke.mjs`

couvre les quatre décisions :
1. `SUPPRESS`
2. `DIGEST`
3. `NOTIFY`
4. `REVIEW`

et vérifie également l’atténuation de la certitude lorsque des sources contradictoires sont présentes.

La CI exécute désormais :
- typecheck ;
- smoke B3.1 ;
- build de production.

## Clôture du Lot B
**B est techniquement fermé sur la branche de travail.**

Conditions de clôture :
- architecture B1/B2/B3 présente ;
- persistance et idempotence en place ;
- moteur de décision intelligent en place ;
- mémoire et traçabilité connectées ;
- matrice des quatre décisions couverte par test ;
- aucune activation push/email ;
- aucun déploiement Vercel ;
- aucun merge vers `main`.

## Étape suivante
Le chantier suivant peut être ouvert séparément, après revue/validation de cette branche. Il ne doit pas modifier `main` ni déclencher de déploiement sans autorisation explicite.
