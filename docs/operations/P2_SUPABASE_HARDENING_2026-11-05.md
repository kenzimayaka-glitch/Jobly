# Jobly — Audit sécurité et performance Supabase (P2)

**Dernière vérification :** 5 novembre 2026, 23:52 Africa/Douala  
**Projet :** JOBLY-PROD (`mpoyaegtwtmhookdzqdy`) — PostgreSQL 17.6.1.166  
**Organisation :** Jobly — plan Free  
**Branche principale de cette mise à jour :** `af170ce5710b324061f6827623192489ad0c8e40`

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

- Suppression du droit implicite `EXECUTE` de `PUBLIC` pour les nouvelles fonctions créées par `postgres`, globalement.
- Vérification du catalogue : le défaut global des fonctions donne désormais `EXECUTE` uniquement à `postgres`, sans `PUBLIC`.
- Les privilèges par défaut de `anon` et `authenticated` sur les nouvelles tables/séquences publiques avaient déjà été révoqués.
- Les droits explicites des rôles Supabase Storage dans le schéma `storage` ont été conservés.
- Les fonctions RPC nouvellement exposées aux clients doivent maintenant recevoir un `GRANT EXECUTE` explicite dans leur migration.

Aucun droit des fonctions existantes n'a été retiré par cette migration.

### 3. Index doublons exacts : quatre supprimés

Migration Supabase `20261105225138 / p2_remove_four_exact_duplicate_indexes_20261105` :

- `public.cvshare_token_idx` remplacé par l'index unique `cvshare_token_key`.
- `RecruitmentDecisionPolicy_recruitmentId_idx` remplacé par `RecruitmentDecisionPolicy_recruitmentId_key`.
- `RecruitmentInterviewVideoSession_interviewId_idx` remplacé par `RecruitmentInterviewVideoSession_interviewId_key`.
- `RecruitmentListingPublicLink_tokenHash_idx` remplacé par `RecruitmentListingPublicLink_tokenHash_key`.

La migration vérifie avant chaque suppression que l'index unique restant est exactement équivalent (colonnes, ordre, opérateurs, collation, prédicat, expressions), et que l'index candidat n'est pas attaché à une contrainte. Les quatre contrôles post-migration confirment que les doublons sont supprimés et les quatre index uniques conservés.

Security Advisor : l'alerte `unused_index` est passée de **172 à 168**.

## Performance Advisor — INFO restantes revues

### 1. Clés étrangères sans index couvrant : 38 alertes sur 31 tables vides

L'état exact a été contrôlé par comptage SQL, pas seulement par statistiques estimées :

- 38 contraintes de clés étrangères sont concernées.
- Elles appartiennent à 31 tables distinctes.
- Les 31 tables contiennent actuellement **0 ligne**.
- Taille totale des tables observées : environ 16 à 80 Ko par relation.

**Décision :** ne pas ajouter 38 index sur des tables entièrement vides. Cela accroîtrait le stockage et produirait immédiatement des index non utilisés sans bénéfice mesurable aujourd'hui. Les relations seront réévaluées dès que ces tables recevront des lignes ou que leurs parcours applicatifs seront activés. À ce moment-là, ajouter les index FK couvrant les accès réellement exercés.

Cette décision ne masque pas les 38 INFO ; elle évite une optimisation prématurée sur des relations sans données.

### 2. Index inutilisés : 168 alertes conservées après nettoyage des doublons

Contrôles SQL après nettoyage :

- 168 index non uniques, non attachés à des contraintes, sans scan enregistré.
- Taille cumulée : **2 288 Ko** (environ 2,23 Mio).
- Dernier reset des statistiques PostgreSQL : **25 août 2026 à 20:33 UTC** ; la période observée est donc d'environ 72 jours.
- Quatre doublons stricts supprimés ; les index uniques de remplacement sont encore présents.

Les index restants couvrent de nombreux domaines fonctionnels Jobly (Recrutement 360, Mobility, Paiements, Community/Campus, J'IA, profils et offres). Un compteur de scan à zéro sur la période ne prouve pas qu'un index est inutile : une fonction rare ou une fonctionnalité récemment livrée peut en avoir besoin lors de son prochain usage.

**Décision :** ne pas supprimer les 168 index en masse. Leur suppression pourrait ralentir les parcours peu fréquents ou les futures activations. Les index simples qui sont des préfixes d'index composés ne sont pas supprimés automatiquement non plus : un index plus étroit peut rester moins coûteux pour certains parcours. Une suppression ultérieure exige une comparaison des requêtes réelles, des plans `EXPLAIN (ANALYZE, BUFFERS)` et de la période de trafic représentative.

Ces 168 INFO restent visibles dans Advisor, mais ont été examinées et ne constituent pas une anomalie non traitée sans décision.

## Avertissements Security Advisor encore ouverts

### 1. `pg_net` enregistré dans `public` — WARN

État réel observé :
- `pg_net 0.20.4`, `extrelocatable=false`, propriétaire `supabase_admin`, schéma d'enregistrement `public`.
- `postgres` n'est ni superuser ni membre de `supabase_admin`. Supabase réserve ce rôle interne.
- Le schéma `net` n'est pas exposé par défaut via la Data API.
- Le lint de placement de l'extension reste valide.

Le runbook [p2_pg_net_recreate_2026-11-05.sql](../../supabase/operations/p2_pg_net_recreate_2026-11-05.sql) prépare un cutover protégé : sauvegarde des réponses, file vide exigée, protection du cron, `DROP ... RESTRICT` (jamais `CASCADE`) et vérification après coup. Le cutover doit être exécuté par la voie privilégiée Supabase/support, puis validé par une réponse HTTP 2xx de l'ingestion. Aucun contournement de l'ownership n'a été tenté.

Source : [Supabase — pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).

### 2. Protection des mots de passe compromis (HIBP) — WARN

- Security Advisor confirme que la protection contre les mots de passe compromis est désactivée.
- L'organisation Jobly est confirmée sur le plan `free`.
- Supabase réserve la protection intégrée HaveIBeenPwned au plan Pro ou supérieur.
- Aucun upgrade ni dépense n'a été effectué.

**Décision :** cette fonction ne peut être activée sans changement d'offre. Aucun coût ne sera engagé sans approbation.

Source : [Supabase — Password security](https://supabase.com/docs/guides/auth/password-security).

## Privilèges par défaut de `supabase_admin` : reclassification

La documentation Supabase précise que les defaults de ce rôle interne ne sont pas modifiables par `postgres`. Les objets publics métier observés appartiennent à `postgres` ; aucune table ou vue publique n'appartient à `supabase_admin`. Une fonction `graphql_public.graphql(text,text,jsonb,jsonb)` appartient à `supabase_admin` et constitue le point d'entrée GraphQL géré par Supabase.

Le script [p2_supabase_admin_default_acl.sql](../../supabase/operations/p2_supabase_admin_default_acl.sql) est un diagnostic SELECT-only, et non une migration de privilèges à exécuter.

## Écart de traçabilité historique

L'historique de production contient `20261105175610 / p2_supabase_hardening_20261105`, mais aucun fichier de migration correspondant n'a été retrouvé sous `supabase/migrations` sur `main`. Le SQL exact n'a pas été reconstitué artificiellement. Cet écart de traçabilité reste à réconcilier depuis sa source d'origine.

## Verdict

**P2 : les corrections sûres ont été appliquées ; les INFO restantes sont documentées et conditionnées à des données/à un trafic réel. Le chantier n'est pas entièrement vert dans l'Advisor.**

- 72 alertes RLS/no-policy : corrigées.
- Defaults d'EXECUTE pour les futures fonctions créées par `postgres` : durcis.
- Quatre index doublons stricts : supprimés, quatre index uniques équivalents conservés.
- 38 alertes FK : revues ; 31 tables concernées sont vides, donc indexation différée.
- 168 index non utilisés : revus, doublons éliminés ; index métier restants conservés faute de preuve suffisante de suppression sûre.
- `pg_net` dans `public` : WARN en attente de l'opérateur privilégié Supabase.
- Protection HIBP : WARN lié au plan Free.

Aucun paiement, `DROP ... CASCADE`, suppression d'index de contrainte, changement d'accès non autorisé ou déploiement Netlify n'a été effectué.
