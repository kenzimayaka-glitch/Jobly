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


## Contrôle de suivi — 6 novembre 2026

### État réel des deux WARN de sécurité

**pg_net — toujours WARN, mais dépendance active vérifiée**

Le contrôle SQL complémentaire confirme :

- extension pg_net 0.20.4, enregistrée dans public, propriétaire supabase_admin ;
- postgres n'est pas membre de supabase_admin et ne peut donc pas prendre ce rôle ;
- file net.http_request_queue vide au moment du contrôle ;
- le cron Jobly jobid=1, planifié à 15 */6 * * *, appelle bien net.http_post vers la fonction Edge /functions/v1/discover-jobs.

**Décision :** ne pas supprimer/recréer l'extension ni désactiver le cron depuis ce rôle. Cela interromprait le mécanisme d'ingestion périodique. La correction exige une intervention privilégiée Supabase/support, coordonnée avec la préservation du cron et un test HTTP 2xx de la fonction après bascule. Le WARN reste ouvert en attendant cette intervention.

**Protection HIBP — toujours WARN, contrainte de forfait**

Le projet est toujours sur le plan Free. La documentation Supabase confirme que la protection intégrée HaveIBeenPwned est disponible sur Pro et au-dessus. Aucun changement d'offre ni paiement n'a été autorisé ou effectué. Ce WARN reste ouvert jusqu'à une décision de forfait ou à une solution de contrôle distincte qui ne prétendrait pas activer le réglage Supabase natif.

### État réel des INFO de performance

- Les 38 FK non indexées sont toujours réparties sur les mêmes 31 tables ; les 31 comptages SQL exacts sont à **0 ligne**. L'ajout immédiat de 38 index créerait des structures sans bénéfice de requête actuel et risquerait de rajouter des alertes d'index inutilisés. L'indexation est donc différée jusqu'à l'arrivée de données ou l'activation mesurée des parcours.
- Les 168 index inutilisés totalisent **2 342 912 octets (2 288 Kio, environ 2,23 Mio)**. Les quatre index doublons exacts déjà identifiés ont été supprimés ; les index uniques équivalents sont conservés. Les 168 restants couvrent notamment des parcours de Recrutement 360, Mobility, Paiements, Community/Campus et J'IA. Leur suppression en bloc n'est pas sûre sans analyse des requêtes et plans d'exécution représentatifs ; aucune suppression supplémentaire n'a été faite.
- Health Advisor : **0 alerte**.

### CI — vérification terminée

Les cinq workflows déclenchés par le commit c39531353821b3aa68bd03852789c5c198f657ea sont tous terminés avec succès :

| Workflow | Run GitHub | Résultat |
|---|---:|---|
| Verify offer pipeline | [42125190894](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42125190894) | SUCCESS |
| Jobly CI — Typecheck & Build | [42125190919](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42125190919) | SUCCESS |
| Verify Africa source registry | [42125190940](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42125190940) | SUCCESS |
| Offer migration to latest version | [42125191115](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42125191115) | SUCCESS |
| Jobly Offer 360 Audit | [42125190713](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42125190713) | SUCCESS |

Les étapes TypeScript, build de production, tests de régression Mission Afrique, Event Core, Mobility, Billing, vérification du registre Afrique, migration des offres et audit des offres actives sont vertes. La CI liée à ce commit est donc **5/5 verte**.

Ce suivi documentaire ne déclenche pas de déploiement applicatif : aucune modification de code applicatif n'est incluse dans cette mise à jour. Aucun déploiement Netlify n'est utilisé.

## Verdict

**Le chantier n'est pas encore entièrement vert dans Supabase Advisor.** Les corrections de code et d'index sûres sont appliquées, mais deux WARN de sécurité restent bloqués par des prérequis externes et 206 INFO de performance demeurent visibles.

- 72 alertes RLS/no-policy : corrigées.
- Defaults d'EXECUTE pour les nouvelles fonctions créées par `postgres` : durcis.
- Quatre doublons exacts d'index : supprimés, index uniques conservés.
- 38 clés étrangères non indexées : **corrigées** ; l'Advisor en signale maintenant 0.
- `function_search_path_mutable` : corrigé ; WARN disparu.
- Index inutilisés : 206 INFO (168 préexistants + 38 index FK nouvellement créés), conservés après examen pour ne pas supprimer à l'aveugle des chemins métiers ou des optimisations FK prévues.
- `pg_net` dans `public` : WARN en attente d'une intervention privilégiée Supabase ; l'opération contrôlée a échoué au garde-fou sans changer la base.
- Protection HIBP : WARN lié au plan Free ; le réglage natif exige Pro ou supérieur. Aucun upgrade ni coût n'a été engagé.
- Health Advisor : 0 alerte.

**Pour déclarer le vert complet dans Advisor, il reste deux actions hors du périmètre de privilèges actuel :** l'intervention Supabase Support sur `pg_net`, et l'activation native de HIBP après autorisation d'un changement vers Pro. Les 206 INFO de performance ne sont pas des défauts d'accès ; elles nécessitent des validations d'usage avant tout retrait d'index.

Aucun paiement, `DROP ... CASCADE`, suppression d'index de contrainte, contournement de propriété Supabase ou déploiement Netlify n'a été effectué.
