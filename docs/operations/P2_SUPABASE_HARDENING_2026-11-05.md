# Jobly — Audit sécurité Supabase (P2)

**État vérifié :** 5 novembre 2026, 19:xx Africa/Douala  
**Projet :** JOBLY-PROD (`mpoyaegtwtmhookdzqdy`) — PostgreSQL 17.6.1.166  
**Organisation :** Jobly — plan Free  
**Branche principale au départ de cette mise à jour :** `d6adc8ec3661703a613452dad75b3d7cd5320f85`

## Résultat immédiat

Les 72 alertes `rls_enabled_no_policy` ont été supprimées par une migration appliquée en production et archivée dans le dépôt :

- Migration Supabase : `20261105182613 / p2_explicit_service_only_rls_denials_20261105`.
- 72 politiques explicites `deny_client_access` ont été créées sur les tables de service ciblées.
- Vérification SQL : 0 table publique avec RLS sans politique ; 72 tables avec politique explicite de refus client.
- Aucune table de ce lot n'accorde SELECT à `anon` ou `authenticated`.
- `service_role` conserve SELECT sur les 72 tables et possède `BYPASSRLS=true`.
- Advisor sécurité après migration : les 72 INFO `RLS Enabled No Policy` ne sont plus remontées.

Cette migration ne crée aucun accès utilisateur : elle formalise explicitement le refus déjà imposé par l'absence de privilèges clients et conserve le chemin d'accès serveur.

## Avertissements sécurité encore ouverts

### 1. `pg_net` dans `public` — WARN

État observé :
- `pg_net 0.20.4`, enregistré dans `public`, `extrelocatable=false`.
- Propriétaire réel : `supabase_admin`.
- La session disponible est `postgres`, sans privilège superuser et sans appartenance à `supabase_admin`.
- Le script opérateur existant utilise `DROP EXTENSION ... RESTRICT`, jamais `CASCADE`, et protège le cron de découverte. Il s'arrête avant toute écriture lorsque le rôle est insuffisant.

**Décision :** ne pas contourner l'ownership, ne pas supprimer l'extension en cascade. Le cutover doit être exécuté par un opérateur Supabase autorisé ou leur support, puis vérifié par une réponse HTTP 2xx de l'ingestion. Script : [p2_pg_net_recreate_2026-11-05.sql](../../supabase/operations/p2_pg_net_recreate_2026-11-05.sql).

Documentation : [Supabase — pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).

### 2. Protection des mots de passe compromis — WARN

- Security Advisor confirme la protection HIBP désactivée.
- Le plan de l'organisation est confirmé `free`.
- La documentation Supabase indique que cette protection intégrée est disponible à partir du plan Pro.
- Aucun changement payant n'est autorisé ; aucun upgrade n'a été effectué.

**Décision :** ne pas engager de frais ni prétendre que le contrôle HIBP est actif. Ce point reste conditionné à une décision de souscription. Documentation : [Password security](https://supabase.com/docs/guides/auth/password-security).

## Privilèges par défaut de `supabase_admin`

L'inventaire des ACL par défaut révèle encore des droits `anon`/`authenticated` sur les futures tables, séquences et fonctions des schémas `public`, `graphql` et `graphql_public` lorsque les objets sont créés par `supabase_admin`.

La session `postgres` ne peut pas modifier les defaults d'un rôle dont elle n'est pas membre. Le script propriétaire est préparé et gardé par un contrôle de rôle : [p2_supabase_admin_default_acl.sql](../../supabase/operations/p2_supabase_admin_default_acl.sql). Il doit être exécuté par un membre autorisé / Supabase Support. Il conserve les droits `service_role`.

## Indicateurs de performance — INFO, pas des WARN sécurité

Le Performance Advisor remonte :
- 38 clés étrangères sans index couvrant.
- 172 index signalés inutilisés.

Ces éléments ne sont pas des failles d'accès. Les index inutilisés ne doivent pas être supprimés en masse : certaines fonctionnalités rares (Recrutement, Mobility, Event, Paiement) peuvent en dépendre. Les index FK restants doivent être décidés après observation du volume et des plans de requête, pas ajoutés à l'aveugle.

## Écart de traçabilité à corriger

L'historique de production contient aussi `20261105175610 / p2_supabase_hardening_20261105`, mais aucun fichier portant cette migration n'a été retrouvé dans `supabase/migrations` sur `main`. Le présent correctif ne reconstruit pas artificiellement son SQL : il faut réconcilier cette migration avec sa source exacte avant de prétendre que tous les historiques locaux et distants sont parfaitement synchronisés.

## Verdict

**Partiellement vert.** Les politiques RLS explicites des 72 tables sont désormais corrigées et vérifiées. Deux WARN sécurité restent réels (`pg_net`, HIBP). Les ACL par défaut `supabase_admin` sont également à traiter par le rôle propriétaire. Aucun paiement, `DROP ... CASCADE`, ni déploiement Netlify n'a été effectué.
