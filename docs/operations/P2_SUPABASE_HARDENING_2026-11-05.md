# Jobly — Audit sécurité et performance Supabase (P2)

**Dernière vérification :** 6 novembre 2026  
**Projet :** JOBLY-PROD (`mpoyaegtwtmhookdzqdy`) — PostgreSQL 17.6.1.166  
**Organisation :** Jobly — plan Free  
**HEAD `main` avant cette mise à jour :** `be8e5fdb903abe1f22fa18556626c0ed478a9dce`

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

## Performance Advisor — points restants revus

### 1. Clés étrangères : les 38 alertes sont corrigées

La migration Supabase `20261105231315 / p2_cover_all_public_foreign_keys_20261106` a créé **38 index couvrants** pour les 38 clés étrangères remontées par l'Advisor, sur 31 tables publiques.

Avant application, un `COUNT(*)` exact a confirmé que les 31 tables étaient vides. La migration refait ce contrôle pour chaque table et s'arrête si une ligne est apparue ; elle exige aussi exactement 38 contraintes et roule entièrement en arrière si le compte d'index créés diffère.

**Vérification après migration :** Performance Advisor remonte désormais **0 `unindexed_foreign_keys`**. Les index ont été conservés pour préparer correctement les parcours FK des modules Mobility, Recruitment 360, Community/Event et J'IA lorsque ces tables recevront leurs premières lignes.

### 2. Index inutilisés : 206 INFO, dont 38 nouveaux index FK

État exact après la migration FK :

- **206 index** sans scan enregistré et non uniques/non attachés à une contrainte, totalisant **2 654 208 octets** (environ 2,53 Mio).
- Les 206 se composent de **168 index préexistants** déjà examinés et **38 nouveaux index FK** sur les 31 tables actuellement vides.
- Parmi les 168 index préexistants, le comptage exact a identifié **125 index sur des tables vides** et **43 sur des tables non vides**.
- Statistiques PostgreSQL observées depuis le reset du **25 août 2026 à 20:33 UTC**, soit environ 72 jours de recul statistique.
- Les quatre doublons strictement équivalents aux index uniques ont déjà été supprimés ; les index uniques de remplacement sont conservés.

Les 168 index préexistants concernent des chemins métiers variés (offres, pipeline, profils, paiements, J'IA, Mobility, Community/Campus et Recrutement 360). Les index les plus volumineux incluent notamment `Job.tags`, `Job.language` et `JobOfferPipeline.processedAt`.

**Décision :** aucun retrait massif supplémentaire. Pour les tables vides, un index non encore scanné ne démontre pas qu'il est inutile au moment où le module sera activé. Pour les tables avec données, un compteur à zéro sur cette fenêtre n'est pas suffisant pour conclure qu'un parcours rare ne l'utilise pas. Une suppression future exige les requêtes applicatives représentatives, des plans `EXPLAIN (ANALYZE, BUFFERS)` et une validation en staging. Les 206 INFO restent visibles dans Advisor, mais sont qualifiées et suivies plutôt que supprimées au hasard.

### 3. Health Advisor

**0 alerte** au dernier contrôle.

## Avertissements Security Advisor encore ouverts

### Avertissement `function_search_path_mutable` : corrigé

Le dernier contrôle avait fait remonter `public.jobly_p1_resegment_offer(jsonb)`. La fonction est `SECURITY INVOKER`, `IMMUTABLE` et n'utilise que des fonctions intégrées PostgreSQL. La migration `20261105231351 / p2_fix_search_path_jobly_p1_resegment_offer_20261106` fixe `search_path = pg_catalog`.

Vérifications : `proconfig = {search_path=pg_catalog}`, test d'exécution avec une entrée JSON représentative, résultat cohérent ; le WARN a disparu de Security Advisor.

### 1. `pg_net` enregistré dans `public` — WARN non résolu

État réel observé le 6 novembre 2026 :
- `pg_net 0.20.4`, propriétaire `supabase_admin`, schéma d'enregistrement `public`, extension non relocalisable ;
- rôle courant `postgres`, non membre de `supabase_admin` ;
- file `net.http_request_queue` vide ;
- cron Jobly `jobid=1`, actif, nommé `jobly-discover-jobs-every-6h`, horaire `15 */6 * * *`, appelant `net.http_post` vers `/functions/v1/discover-jobs`.

La procédure officielle Supabase prévoit de supprimer puis recréer `pg_net` dans `extensions`, sans `CASCADE`, après contrôle de la file et sauvegarde des réponses. La migration contrôlée a été tentée via Supabase le 6 novembre ; son garde-fou a refusé l'opération car `postgres` n'a pas l'appartenance/propriété requise. **L'échec est intervenu avant toute DDL ou modification du cron** : l'extension reste dans `public`, le cron demeure actif et la file est toujours vide.

**Action nécessaire :** Supabase Support / opérateur privilégié doit exécuter le cutover documenté dans [p2_pg_net_recreate_2026-11-05.sql](../../supabase/operations/p2_pg_net_recreate_2026-11-05.sql), puis vérifier une réponse HTTP 2xx réelle de l'ingestion. Aucun privilège managé n'a été contourné.

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


## Contrôle de suivi — 6 novembre 2026 (dernier état vérifié)

### État Security Advisor

- `function_search_path_mutable` : **corrigé**, le WARN a disparu après le réglage de `public.jobly_p1_resegment_offer(jsonb)` sur `search_path = pg_catalog`.
- `rls_enabled_no_policy` : **corrigé** après découverte d'une nouvelle table de sauvegarde P1. Voir la section suivante.
- Deux WARN restent : `extension_in_public` pour `pg_net`, et `auth_leaked_password_protection` pour HIBP.

### Nouvelle alerte RLS sur la sauvegarde P1 : corrigée

La dernière lecture Advisor a détecté `public.JobP1QualityLiveIngestionBackup`, une table de sauvegarde contenant **252 lignes**, avec RLS activé mais sans politique explicite.

Migration appliquée : `20261105234414 / p2_explicit_deny_job_p1_live_ingestion_backup_20261106`.

Vérifications après migration :
- politique `deny_client_access` ajoutée pour `anon` et `authenticated`, avec `USING (false)` et `WITH CHECK (false)` ;
- aucun privilège SQL donné à `anon` ou `authenticated` sur cette table ;
- `service_role` conserve SELECT/INSERT/UPDATE/DELETE et `BYPASSRLS=true) ;
- Security Advisor ne remonte plus `rls_enabled_no_policy`.

Aucune donnée de sauvegarde n'a été supprimée.

### `pg_net` : déplacement toujours bloqué par les privilèges managés

État actuellement vérifié :
- `pg_net 0.20.4`, schéma enregistré `public), propriétaire `supabase_admin` ;
- connexion courante `postgres), sans appartenance au rôle interne `supabase_admin` ;
- le cron `jobly-discover-jobs-every-6h` reste actif, horaire `15 */6 * * *`, et appelle `net.http_post` vers `/functions/v1/discover-jobs` ;
- file `net.http_request_queue` vide ; aucun dossier d'archive de cutover n'a été créé.

La procédure contrôlée a été tentée une fois ; son garde-fou s'est arrêté avant toute DDL. **L'extension n'a pas bougé et le cron n'a pas été arrêté.** Le rôle `postgres` ne peut pas s'attribuer lui-même les privilèges réservés à Supabase.

**Intervention nécessaire :** Supabase Support / opérateur privilégié doit exécuter le déplacement documenté dans [p2_pg_net_recreate_2026-11-05.sql](../../supabase/operations/p2_pg_net_recreate_2026-11-05.sql), en conservant le cron, puis valider un vrai retour HTTP 2xx de la fonction d'ingestion. Le ticket n'a pas été envoyé : aucun outil connecté ne permet de créer un ticket Support au nom du propriétaire du compte.

Source : [Supabase — pg_net et déplacement d'extension](https://supabase.com/docs/guides/database/extensions/pg_net).

### Protection HIBP : activation impossible sur le plan Free

- Organisation Jobly confirmée sur `free`.
- Supabase confirme que la protection HIBP native est réservée au plan Pro ou supérieur.
- Le plan Pro commence à **25 USD/mois** ; les coûts de compute et de dépassement d'usage peuvent s'ajouter suivant la configuration et la consommation.
- Aucun upgrade ni paiement n'a été fait ; le connecteur disponible ne fournit pas d'action pour changer l'abonnement ou modifier le réglage Auth.

Après passage au plan Pro, le réglage doit être activé dans les paramètres Auth du projet (Password Security / Leaked Password Protection), puis contrôlé dans Security Advisor.

Sources : [Supabase — Password security](https://supabase.com/docs/guides/auth/password-security) ; [Supabase — Pricing](https://supabase.com/pricing).

### Performance et Health Advisor

- Clés étrangères non indexées : **0**.
- Index inutilisés : **206 INFO** (168 préexistants + 38 index FK ajoutés). Les index restent en place pour ne pas supprimer à l'aveugle des chemins métiers ou des index préparatoires.
- Health Advisor : **0 alerte**.

## Verdict

**Le chantier n'est pas encore vert dans Supabase Advisor.** Les contrôles RLS et FK sont assainis, et les corrections SQL sûres sont appliquées. Deux WARN restent bloqués par des privilèges/paramètres de compte que le connecteur ne peut pas modifier.

- 72 alertes RLS/no-policy historiques : corrigées.
- Nouvelle sauvegarde P1 de 252 lignes : politique explicite de refus client ajoutée, accès service-role préservé.
- Defaults d'EXECUTE pour les nouvelles fonctions créées par `postgres) : durcis.
- Quatre doublons exacts d'index : supprimés, index uniques conservés.
- 38 clés étrangères non indexées : **corrigées** ; l'Advisor en signale maintenant 0.
- `function_search_path_mutable` : corrigé ; WARN disparu.
- Index inutilisés : 206 INFO, examinés et conservés.
- `pg_net` dans `public` : WARN ouvert ; seule une intervention Supabase Support/opérateur privilégié peut effectuer le déplacement sans contourner les protections de rôle.
- Protection HIBP : WARN ouvert ; exige le plan Pro ou supérieur et l'activation dans les paramètres Auth.
- Health Advisor : 0 alerte.

**Pour clôturer les deux derniers WARN :** faire exécuter le cutover `pg_net` par Supabase Support, puis passer l'organisation Jobly au plan Pro (à partir de 25 USD/mois, hors éventuels coûts variables) et activer HIBP dans Auth. Ces actions ne sont pas exécutables par les privilèges ni les outils actuellement connectés.

Aucun paiement, `DROP ... CASCADE`, suppression d'index de contrainte, contournement de propriété Supabase ou déploiement Netlify n'a été effectué.
