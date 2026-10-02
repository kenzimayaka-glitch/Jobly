# Lot B — Veille J’IA : état d’implémentation

## Branche
`feat/jia-watch-persistence-20261002`

## Étape B1 réalisée
- Ajout d’un stockage persistant des abonnements de veille côté architecture.
- Ajout de `lib/jia/watchPersistence.ts` :
  - abonnements dus ;
  - création/mise à jour ;
  - exécution idempotente ;
  - hash d’état ;
  - snapshots persistants ;
  - historique des runs ;
  - planification du prochain passage.
- Ajout de `GET/POST /api/jia/watch-subscriptions`.
- Ajout de `GET /api/cron/jia-watch` protégé par `CRON_SECRET`.
- Ajout du dispatcher quotidien dans `vercel.json`.
- La fréquence minimale est volontairement de 24 h dans cette première étape afin de rester compatible avec l’infrastructure Vercel existante.

## Architecture conservée
La veille réutilise :
`watchExternal → observeInternet → ingestExternalSignal → JiaEvent/JiaMemory/trace`.

Aucun nouveau moteur de recherche, de mémoire ou de notification n’est créé.

## Persistance prévue
Trois modèles SQL :
- `JiaWatchSubscription`
- `JiaWatchRun`
- `JiaWatchSnapshot`

Ils doivent être ajoutés via une migration contrôlée avant activation du scheduler.

## B2 à venir
- intégration complète aux préférences `jia_preferences` ;
- qualification de pertinence ;
- déduplication des notifications ;
- digest/proactif ;
- branchement du QCM conversationnel ;
- tests de reprise après erreur et de concurrence.

## Sécurité
- RLS prévu sur les trois tables ;
- lecture utilisateur limitée à ses abonnements/runs/snapshots ;
- exécution cron protégée par `CRON_SECRET` ;
- aucun déploiement ou changement de production effectué.
