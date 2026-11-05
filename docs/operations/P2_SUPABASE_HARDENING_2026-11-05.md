# Jobly — Audit sécurité Supabase (P2)

**Dernière vérification :** 5 novembre 2026, 19:23 Africa/Douala  
**Projet :** JOBLY-PROD (`mpoyaegtwtmhookdzqdy`) — PostgreSQL 17.6.1.166  
**Organisation :** Jobly — plan Free  
**Base `main` de cette mise à jour :** `5f8d0fc5f68a044eddf1fe2ed3ba8cd889fa8c56`

## Corrections réellement appliquées

### 1. Tables service-only : les 72 alertes RLS/no-policy sont éliminées

Migration Supabase `20261105182613 / p2_explicit_service_only_rls_denials_20261105` :

- 72 politiques explicites `deny_client_access` ajoutées aux tables publiques RLS-enabled qui n'avaient aucune politique.
- Vérification SQL : 0 table publique RLS sans politique ; 72 tables avec politique explicite de refus à `anon` et `authenticated`.
- Aucune table de ce lot n'accorde de privilège SELECT/INSERT/UPDATE/DELETE à `anon` ou `authenticated`.
- `service_role` conserve ses droits ; son attribut `BYPASSRLS=true` est confirmé.
- Security Advisor : les 72 INFO `rls_enabled_no_policy` ne sont plus remontées.

Il s'agit d'une formalisation du refus existant, pas d'un nouvel accès utilisateur.

### 2. Privilèges par défaut créés par `postgres` : durcis

Migration Supabase `20261105183309 / p2_revoke_postgres_global_function_execute_20261105` :

- Suppression du droit implicite `EXECUTE` de `PUBLIC` pour les nouvelles fonctions créées par `postgres`, globalement et pas seulement dans `public`.
- Vérification du catalogue : le défaut global des fonctions donne désormais `EXECUTE` uniquement à `postgres`, sans `PUBLIC`.
- Les privilèges par défaut de `anon` et `authenticated` sur les nouvelles tables/séquences publiques avaient déjà été révoqués.
- Les droits explicites des rôles Supabase Storage dans le schéma `storage` ont été conservés.
- Les fonctions RPC nouvellement exposées aux clients doivent maintenant recevoir un `GRANT EXECUTE` explicite dans leur migration.

Aucun droit des fonctions existantes n'a été retiré par cette migration.

## Avertissements Security Advisor encore ouverts

### 1. `pg_net` enregistré dans `public` — WARN

État réel observé :
- `pg_net 0.20.4`, `extrelocatable=false`, propriétaire `supabase_admin`, schéma d'enregistrement `public`.
- `postgres` n'est ni superuser ni membre de `supabase_admin`. Supabase réserve ce rôle interne : il n'est pas possible de s'y ajouter avec un simple `GRANT`.
- L'API de `pg_net` utilise le schéma `net`. Supabase indique que `net` n'est pas exposé par défaut via la Data API et que `anon`/`authenticated` sont des rôles NOLOGIN : les droits de schéma hérités ne rendent donc pas les tables HTTP accessibles depuis les clés clients.
- Le lint reste toutefois valide : l'extension est enregistrée dans `public`.

**Correction recommandée par Supabase :** supprimer puis recréer `pg_net` dans `extensions`. Cette opération retire les objets d'extension, y compris la file et l'historique HTTP ; elle doit donc être précédée d'un contrôle de file, d'une sauvegarde des réponses nécessaires et d'une protection du cron. Le runbook garde `RESTRICT`, jamais `CASCADE`, et s'arrête si le rôle ne possède pas l'extension : [p2_pg_net_recreate_2026-11-05.sql](../../supabase/operations/p2_pg_net_recreate_2026-11-05.sql).

**État :** runbook préparé, aucune tentative de contournement de l'ownership, aucun changement de cron ou d'extension effectué avec un rôle non autorisé. Le cutover reste à exécuter par la voie privilégiée Supabase/support, puis à valider par une réponse HTTP 2xx de l'ingestion.

Sources : [Supabase — pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [Supabase KB — extension ownership et privilèges internes](https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).

### 2. Protection des mots de passe compromis (HIBP) — WARN

- Security Advisor confirme que la protection contre les mots de passe compromis est désactivée.
- L'organisation Jobly est confirmée sur le plan `free`.
- Supabase réserve la protection intégrée HaveIBeenPwned au plan Pro ou supérieur.
- Aucun upgrade ni dépense n'a été effectué.

**État :** impossible à passer au vert sans changement d'offre. Aucun coût n'est engagé sans décision explicite. Les exigences de longueur et de complexité des mots de passe restent configurables séparément, mais ne remplacent pas la vérification HIBP.

Source : [Supabase — Password security](https://supabase.com/docs/guides/auth/password-security).

## Privilèges par défaut de `supabase_admin` : reclassification après vérification

Le diagnostic initial pouvait laisser penser qu'il fallait révoquer les defaults du rôle `supabase_admin`. La documentation officielle Supabase, mise à jour le 4 novembre 2026, précise que ces defaults sont réservés et non modifiables par `postgres`. Ils ne s'appliquent qu'aux objets effectivement créés par `supabase_admin`, principalement des objets d'extensions.

Inventaire live des objets dans `public`, `graphql`, `graphql_public` :
- 0 table/vue publique appartenant à `supabase_admin`.
- Les 154 relations publiques recensées (153 tables et 1 vue) appartiennent à `postgres`.
- 1 fonction `graphql_public.graphql(text,text,jsonb,jsonb)` appartient à `supabase_admin` et est exécutable par `anon`/`authenticated` ; il s'agit du point d'entrée GraphQL exposé, pas d'une table métier oubliée.
- Les defaults de `postgres` sur ses nouveaux objets sont durcis séparément par les deux migrations ci-dessus.

**Conclusion :** ce n'est pas un correctif SQL à exécuter ni un défaut applicatif supplémentaire à laisser orange. Le script [p2_supabase_admin_default_acl.sql](../../supabase/operations/p2_supabase_admin_default_acl.sql) a été remplacé par un diagnostic SELECT-only. Ne pas tenter `GRANT supabase_admin TO postgres` ni des révocations d'ACL sur des objets dont `postgres` n'est pas le grantor.

Source : [Supabase KB — Can't change the default privileges of supabase_admin](https://supabase.com/kb/troubleshooting/cant-change-the-default-privileges-of-supabase_admin-in-the-public-schema-448af9).

## Indicateurs Performance Advisor — INFO

- 38 clés étrangères sans index couvrant.
- 172 index signalés inutilisés.

Ce ne sont pas des WARN de sécurité. Les index inutilisés ne doivent pas être supprimés en masse ; ils peuvent soutenir des parcours peu fréquents. Les 38 index FK restants doivent être évalués selon les volumes et plans de requête réels, pas ajoutés aveuglément.

## Écart de traçabilité

L'historique de production contient `20261105175610 / p2_supabase_hardening_20261105`, mais aucun fichier de migration correspondant n'a été retrouvé sous `supabase/migrations` sur `main`. Le SQL exact n'a pas été reconstitué artificiellement. Cet écart de traçabilité reste à réconcilier depuis sa source d'origine.

## Verdict

**Sécurité production : nettement renforcée, mais pas entièrement verte.**

- 72 alertes RLS/no-policy : corrigées et vérifiées.
- Defaults des futures fonctions créées par `postgres` : durcis et vérifiés.
- `supabase_admin` defaults : réservés par Supabase, non modifiables ; aucun objet métier appartenant à ce rôle dans `public`.
- `pg_net` dans `public` : un WARN de placement reste, sans exposition directe par Data API selon Supabase ; migration de schéma en attente de la voie privilégiée.
- Protection HIBP : reste désactivée sur le plan Free.

Aucun paiement, `DROP ... CASCADE`, changement d'accès non autorisé ou déploiement Netlify n'a été effectué.
