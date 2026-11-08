# Jobly — Référence de continuité de la recette E2E

> ## ÉTAT MAÎTRE ACTUALISÉ — V2.15 — 8 novembre 2026
>
> **Dernier code E2E-001 commité :** `8385b60400bbaf9cedfcb4aa01073b733533f6c2` sur `e2e/recette`.
> **`main` :** inchangée dans le cadre de cette correction. **PR #266 :** reste ouverte, brouillon et non fusionnée.
> **Environnement :** JOBLY-E2E uniquement. Aucun test runtime ni accès JOBLY-PROD n'a été effectué pendant la correction distante.
>
> **Important — instructions historiques neutralisées :** les instructions plus anciennes de ce document qui autorisaient ou demandaient une réinitialisation des mots de passe, une recréation de fixtures ou l'exécution de `e2e/reset-existing-fixture-passwords.mjs` sont obsolètes et ne doivent pas être suivies. Le script local `e2e/reset-existing-fixture-passwords.mjs` reste à préserver et ne doit pas être exécuté. Aucune fixture partagée ne doit être modifiée sans nouvelle autorisation explicite et spécifique.
>
> **Nouvelle méthode de continuité :** ce fichier Markdown dans Git est la seule référence maître. Chaque nouvelle conversation Jobly doit le lire intégralement avant d'agir. Après chaque réponse Jobly, le mettre à jour dans cette branche et donner comme preuve le commit GitHub ainsi que le chemin du fichier. Ne pas passer par la Bibliothèque/Word pour cette continuité.
>
> **Verrou de reprise V2.8 :** les sections 7, 9, 10, 11, 12 et 13.7 contiennent des états ou consignes historiques ; elles ne constituent plus des instructions opératoires. En particulier, l'autorisation de reset citée au §9 n'est plus active : ne pas exécuter e2e/reset-existing-fixture-passwords.mjs, les scripts de vérification Auth des anciennes fixtures, le provisionneur, ni scripts/e2e-local-recipe.mjs/le runner bulk. Aucune connexion Auth, mutation de fixture, restauration de mot de passe ou relance globale n'est autorisée par ce document. Le seul prochain contrôle permis est le GET OpenAPI décrit au §16.7, suivi de son analyse.
>
> **État E2E-001 : PASS STATIQUE LOCAL — 6/6 tests, 0 échec** (résultat opérateur reçu le 8 novembre 2026 ; détail au §15). Le correctif Talent est présent dans le code de la branche et le test statique a réussi sur le poste local. **LOT-00 reste PARTIAL** : le contrôle Data API du schéma net n'a pas encore reçu de réponse HTTP exploitable ; l'intention des deux buckets publics doit être confirmée et la revue des grants/policies des tables concernées par la recette doit être documentée. Aucun smoke runtime ni bulk n'est autorisé à ce stade.
> **LOT-00 — dernier résultat opérateur :** les deux GET OpenAPI `public` et `net` avec la clé publishable ont retourné HTTP 401, message `Secret API key required`. La racine `/rest/v1/` exige ici une clé d'administration pour le catalogue OpenAPI ; ces réponses ne renseignent pas sur l'exposition de `net`. La procédure précédente était donc inadaptée. Utiliser exclusivement la procédure corrigée à saisie masquée du §22.3 ; aucun secret ne doit être copié dans le chat, les rapports ou Git.

**Version :** 2.15  
**Date de consolidation :** 8 novembre 2026  
**Dépôt :** `kenzimayaka-glitch/Jobly`  
**Branche de recette :** `e2e/recette`  
**PR de référence :** [#266](https://github.com/kenzimayaka-glitch/Jobly/pull/266) — ouverte, brouillon  
**Projet de test autorisé :** JOBLY-E2E — `ofqqrryamslxoqkklraw`  
**Environnement interdit :** JOBLY-PROD, ses données, ses clés, ses comptes et ses déploiements.

> Ce document est le point de reprise de référence. Il sépare les preuves effectivement obtenues, les scénarios présents dans le code mais non validés, les blocages locaux et les actions qui nécessitent l'accord de l'utilisateur. Il doit être mis à jour à chaque nouvelle exécution significative.

---

## 1. Résumé de pilotage

Le dernier jalon E2E authentifié pleinement démontré avant l'ajout du parcours croisé est celui du **7 novembre 2026, entre 11:17 et 12:06** :

- Auth Supabase réelle : **12/12 contrôles PASS**, pour Talent, Recruteur et Partenaire.
- API authentifiées : **24/24 contrôles PASS**, pour les trois rôles.
- Smoke navigateur : **14/14 contrôles PASS**, sans blocage ni erreur navigateur.
- TypeScript et build Next.js : **PASS**.
- Recette bulk : **301 tests automatisés**, **0 FAIL**, mais **11 lots PARTIAL**.

Ce jalon n'était donc **pas une recette globale verte**. Il démontrait que les comptes de test pouvaient se connecter et que plusieurs API fonctionnaient, tandis que des parcours métier complets restaient à construire et à valider.

Le parcours croisé **Talent → Recruteur → entretien → décision OFFER → contrôle des droits → nettoyage** a ensuite été intégré à la branche. Son code est présent, mais son exécution locale n'a pas encore été prouvée par un rapport PASS.

La dernière exécution locale communiquée (12:21:58–12:26:49) a donné **277 tests, 0 FAIL, 10 PARTIAL et 1 BLOCKED**. Les contrôles d'authentification et les API authentifiées étaient BLOCKED : cette exécution ne permet donc pas de conclure que les fonctionnalités authentifiées ont régressé.

**État de pilotage à retenir :**
- Dernier point de preuve authentifiée : PASS sur les smoke tests précédents.
- État de la recette complète : PARTIAL.
- Parcours croisé : code intégré, validation locale en attente.
- Récupération des fixtures locales : en attente de vérification par l'opérateur.
- Aucun changement de mot de passe, aucune recréation de compte, aucune fusion dans `main` et aucun déploiement autorisé ou effectué dans ce chantier.

## 2. Périmètre et règles non négociables

1. Exécuter la recette uniquement sur JOBLY-E2E, projet `ofqqrryamslxoqkklraw`.
2. Ne jamais utiliser JOBLY-PROD, ni ses secrets, comptes, données ou URL.
3. Travailler sur `e2e/recette`. La PR #266 reste en brouillon jusqu'à décision explicite.
4. Ne pas fusionner dans `main` et ne pas déclencher de déploiement Vercel ou Netlify dans le cadre de cette recette.
5. Aucun e-mail, SMS, paiement, Mobile Money, candidature externe, webhook ou appel réel à un fournisseur. Les contacts synthétiques utilisent le domaine réservé `.invalid`.
6. Ne jamais placer mots de passe, clé service_role/secret, jetons de session ou fichier runtime dans le chat, les rapports, les logs ou Git.
7. Ne jamais relancer un provisionnement complet pour « voir si cela passe ». Tout changement d'identifiant exige un besoin établi et une autorisation explicite.
8. Un test non exécuté est BLOCKED ou NON TESTABLE, jamais PASS. Un test unitaire/statique ne vaut pas validation E2E.
9. Un lot est PASS uniquement lorsque ses critères métier obligatoires, ses preuves de persistance et ses contrôles de nettoyage/sécurité sont tous démontrés.
10. L'opérateur qui exécute le CMD et l'agent qui analyse les rapports travaillent en boucle : l'agent demande une action précise, l'opérateur retourne le résultat, puis l'agent conclut. Aucun état local ne doit être supposé.

**Poste local connu lors des derniers tests :** Windows, chemin `C:\Users\ASUS\Jobly`, Node.js v26.13.0, pnpm 10.28.0 et Git installés. L'opérateur préfère le Node.js Command Prompt/CMD, pas PowerShell.

## 3. Chronologie des preuves

### 3.1 Jalon authentifié réussi — avant le parcours croisé

| Heure locale du 7 novembre | Preuve | Résultat | Portée exacte |
|---|---|---:|---|
| 11:17 | `auth-session-smoke.json` | 12/12 PASS | Connexion Auth, validation du jeton, rôle signé, refresh et rotation de session sur 3 rôles |
| 11:51 | `authenticated-role-smoke.json` | 24/24 PASS | API Talent, Recruteur et Partenaire ; lecture/écriture et persistance prévues par le smoke |
| 11:57 | `lot1-auth-ui-smoke.json` | 14/14 PASS | UI navigateur, responsive 390 px et routes protégées |
| 12:01–12:06 | Rapport bulk local | 301 tests ; 0 FAIL ; 11 PARTIAL | 11 lots exécutés ; les lots restaient incomplets au regard des critères de recette |
| Même exécution | TypeScript / build / Playwright / API authentifiées | PASS / PASS / PASS / PASS | Contrôles techniques transverses rapportés par l'opérateur |

Le smoke API avait aussi révélé une absence de colonnes de marché sur JOBLY-E2E pour la création des RecruiterJobs. La migration existante `20261002100000_lot_e_recruiter_africa_market.sql` avait été appliquée **uniquement** à JOBLY-E2E, puis les contrôles de colonnes, contrainte, index et lignes invalides avaient été vérifiés. Le smoke avait ensuite atteint 24/24 PASS. Aucune modification de production n'avait été faite.

### 3.2 Parcours croisé ajouté au code

Le parcours ajouté à la branche prévoit :
1. Création API d'une offre synthétique publiée au Cameroun sur JOBLY-E2E.
2. Ajout d'un canal e-mail fictif en `.invalid`, exclusivement sur cette offre.
3. Préparation d'une candidature Talent sans soumission ni envoi externe.
4. Vérification de la visibilité de la même candidature côté Talent et côté Recruteur.
5. Transition Recruteur vers `INTERVIEW`, puis décision `OFFER`.
6. Vérification qu'une tentative de modification par Talent ne remplace pas la décision du Recruteur.
7. Suppression de l'offre et vérification en base de l'absence de l'offre et de la candidature.

**État :** code intégré ; aucune preuve d'exécution locale PASS du scénario croisé disponible à la date de ce document.

### 3.3 Dernière exécution locale communiquée

Rapport transmis par l'opérateur :
- Début : 12:21:58.435Z ; fin : 12:26:49.785Z.
- Commit : `local` (aucun SHA exact n'est fourni dans le rapport).
- Node.js : v26.13.0.
- JOBLY-E2E uniquement.
- Parallélisme : 5 lots, maximum 2 fichiers par lot.
- Bilan : 277 tests ; 0 PASS, 10 PARTIAL, 1 BLOCKED, 0 FAIL.

| Lot | Domaine | Statut | Tests |
|---|---|---:|---:|
| LOT-00 | Environnement et jeux de données | PARTIAL | 1 |
| LOT-01 | Auth, rôles, navigation et sécurité | PARTIAL | 48 |
| LOT-02 | Talent, offres, recherche et candidatures | PARTIAL | 16 |
| LOT-03 | Recruteur et Recruitment 360 | BLOCKED | 5 |
| LOT-04 | Mission Afrique et qualité des offres | PARTIAL | 16 |
| LOT-05 | J'IA 360 | PARTIAL | 51 |
| LOT-06 | Mobility et partenaires | PARTIAL | 25 |
| LOT-07 | Paiements, abonnements et Mobile Money | PARTIAL | 71 |
| LOT-08 | Events, Community, Bons Plans et Campus | PARTIAL | 21 |
| LOT-09 | Career Journey, Admin 360 et BI | PARTIAL | 0 |
| LOT-10 | PWA, Android et régression transverse | PARTIAL | 23 |

Contrôles transverses de cette exécution :
- Provisionnement des comptes : BLOCKED.
- Session Auth : BLOCKED.
- TypeScript : PASS.
- Build production : PASS.
- Playwright : PARTIAL.
- Parcours API authentifiés : BLOCKED.

Le rapport dit qu'aucune anomalie FAIL n'a été détectée dans les suites exécutées. Cela ne permet pas de dire que tous les parcours fonctionnels sont PASS : les parcours authentifiés n'ont pas démarré.

## 4. Incident fixtures : faits, hypothèses et limites

### Faits établis

- Une vérification SQL directe de JOBLY-E2E a retrouvé trois identités Auth marquées comme fixtures : une TALENT, une RECRUITER et une PARTNER.
- La même vérification a retrouvé une correspondance par rôle dans `public.User` pour chacune de ces trois identités.
- L'opérateur a ensuite signalé que `.e2e-fixtures.json` et `.e2e-fixture-runtime.json` étaient tous deux ABSENT sur son poste.
- Le message affiché lors d'une tentative de saisie de clé était : `[FIXTURE-PROVISION] Clé privée Supabase absente ou invalide.`
- Dans le code avant correction, le provisionnement complet supprimait les deux fichiers locaux avant de demander et de valider la clé privée.
- Le runner supprime également `.e2e-fixture-runtime.json` dans son bloc `finally` à la fin d'une exécution. L'absence de ce seul fichier après un run est donc normale.
- Le script de provisionnement complet d'avant correction pouvait mettre à jour un compte Auth existant avec un nouveau mot de passe aléatoire.

### Ce qui n'est pas établi

- Nous n'avons pas de capture de l'état de `.e2e-fixtures.json` immédiatement avant le lancement fautif. Nous ne pouvons donc pas affirmer que le runner l'a supprimé pendant ce lancement ; il a pu être absent auparavant.
- L'erreur de clé indique que la chaîne reçue était vide ou trop courte selon le contrôle de code exécuté. Elle ne prouve pas, à elle seule, que la clé appartenait au mauvais projet.
- Nous ne savons pas encore si l'opérateur possède une sauvegarde locale des anciennes fixtures ou une copie sécurisée des anciens mots de passe.
- Nous ne savons pas encore si les anciens mots de passe fonctionnent toujours. La base Auth ne permet pas de retrouver un mot de passe en clair.

### Conséquence opérationnelle

Ne pas tenter une connexion si le mot de passe correspondant n'est pas disponible depuis une source sûre. Ne pas réinitialiser et ne pas recréer les comptes sans autorisation explicite. Le test demandé à l'opérateur est un véritable `signInWithPassword` pour chaque rôle, puis vérification du rôle signé et fermeture de session, avec un rapport PASS/FAIL/NON TESTABLE sans secret ni jeton.

### Résultat du contrôle des anciens identifiants — 7 novembre 2026, 12:53:43Z

Le rapport `artifacts/e2e/fixture-password-verification.json` a été transmis par l'opérateur :
- Statut : `NON_TESTABLE`.
- Talent : `NON_TESTABLE`, identifiants locaux indisponibles.
- Recruteur : `NON_TESTABLE`, identifiants locaux indisponibles.
- Partenaire : `NON_TESTABLE`, identifiants locaux indisponibles.
- Raison : le script n'a trouvé ni `.e2e-fixtures.json` ni sauvegarde reconnue dans le dossier racine du dépôt.
- Aucun appel Supabase Auth n'a été effectué.
- `serviceRoleUsed=false`, `passwordsChanged=false`, `accountsCreatedOrDeleted=false`, `profilesModified=false`.

**Portée exacte :** le vérificateur recherche le fichier primaire et les copies dont le nom correspond à ses critères dans le dossier racine du dépôt. Il ne parcourt pas l'ensemble du disque, les répertoires de sauvegarde Windows, l'historique de fichiers, OneDrive ou d'éventuelles sauvegardes externes. Le résultat ne démontre donc pas qu'aucune copie de sauvegarde n'existe ailleurs.

**Décision :** aucun mot de passe n'est déclaré invalide. Les anciens mots de passe restent `NON TESTABLE` faute de matériel local permettant de les essayer. Aucune réinitialisation n'est autorisée à ce stade.

## 5. Correctifs de garde-fou déjà poussés sur la branche

La PR #266 est restée ouverte et en brouillon. SHA de tête vérifié lors de la consolidation : `13456d8cfd5e35aee0ab726e52068e3f4f8561a7`.

| Commit | Modification | Portée |
|---|---|---|
| `e3691a3` | Provisionneur création-only, contrôle préalable, refus de toucher à une identité fixture déjà existante | `e2e/provision-fixtures.mjs` |
| `e9a272e` | Reconnaissance de `E2E_EXISTING_FIXTURE_PRESERVED` comme blocage contrôlé dans le runner | `scripts/e2e-local-recipe.mjs` |
| `13456d8` | Documentation de la règle de récupération | `e2e/README.md` |

Vérification du contenu GitHub au SHA de tête :
- Le provisionneur ne contient plus d'appel `unlink`.
- Une identité fixture existante avec le rôle attendu entraîne `E2E_EXISTING_FIXTURE_PRESERVED` ; aucun mot de passe n'est changé.
- Le runner classe ce cas en BLOCKED au lieu de tenter un provisionnement destructif.
- Le README décrit le mode création-only et la nécessité d'une récupération autorisée.

**Limite :** ces corrections ont été vérifiées dans le contenu GitHub. Elles n'ont pas encore été validées par une nouvelle exécution locale authentifiée de bout en bout.

### CI sur le SHA 13456d8

Workflow E2E : [run 42373614590](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42373614590).

Le workflow a terminé avec une conclusion `failure` parce que le bilan de recette restait PARTIAL et renvoyait un code de sortie 1. Les journaux indiquent 277 tests, 10 lots PARTIAL, 1 BLOCKED, 0 FAIL ; TypeScript et build PASS ; Auth et API authentifiées BLOCKED. C'est un workflow GitHub Actions qui ne reçoit volontairement pas la clé privée locale. Il ne remplace pas la recette authentifiée locale et ne doit pas être interprété comme une régression Auth.

État PR vérifié : #266 ouverte, brouillon, non fusionnée. Aucune action de déploiement effectuée.

## 6. État de référence des 11 lots

Les statuts à conserver sont ceux de la dernière exécution locale communiquée (section 3.3). Le précédent rapport à 301 tests et le rapport récent à 277 tests sont deux exécutions distinctes ; leurs nombres de tests ne doivent pas être additionnés ni comparés comme s'il s'agissait d'un seul run.

Priorités de reprise :
- **P0 — LOT-00 / LOT-01 :** restaurer les conditions d'exécution et confirmer la session Auth sur les fixtures existantes.
- **P0 — LOT-02 / LOT-03 :** rejouer le smoke Talent/Recruteur et exécuter le parcours croisé complet avec preuve de persistance et nettoyage.
- **P0 — LOT-07 :** poursuivre le scénario de paiement en sandbox uniquement, sans transfert ni notification réelle.
- **P1 — LOT-04 / LOT-05 / LOT-06 :** compléter les parcours Mission Afrique, J'IA 360 et Mobility.
- **P2 — LOT-08 :** compléter événements, communauté, bons plans et campus.
- **P1 — LOT-09 :** le gate statique seul ne valide pas les parcours Career Journey/Admin 360/BI ; ajouter des preuves runtime.
- **P1 — LOT-10 :** la recette responsive ne remplace pas les validations PWA/Android et synchronisation sur appareils/runtimes prévus.

Aucun lot ne doit être passé au vert par simple absence d'erreur dans une suite partielle.

## 7. Plan de reprise ordonné — HISTORIQUE, NE PAS EXÉCUTER

> Cette séquence décrit un ancien plan de récupération des fixtures. Elle est conservée pour la traçabilité, mais elle est remplacée par les verrous V2.8 et les sections 15 à 17. Ne pas exécuter les scripts verify-existing-fixtures, verify-existing-fixtures-bulk, le provisionneur, la restauration runtime ou la recette complète à partir de cette section.


### Étape A — état local, sans toucher aux comptes

À demander à l'opérateur, dans son CMD, sans afficher ni transmettre le contenu des fichiers :
- rechercher une copie de sauvegarde de `.e2e-fixtures.json` (historique de fichiers, sauvegarde du dossier, corbeille, copie locale sécurisée) ;
- rechercher si un fichier `.env.e2e.local`, `.env.local` ou `.env` contient une URL JOBLY-E2E et une clé privée correspondante, sans imprimer la clé ;
- conserver l'information de disponibilité sous forme PRESENT/ABSENT seulement.

### Étape A2 — vérification des anciens mots de passe (lecture seule)

Le script `e2e/verify-existing-fixtures.mjs` est disponible sur la branche. Après synchronisation, exécuter `node e2e/verify-existing-fixtures.mjs`, puis ouvrir `artifacts/e2e/fixture-password-verification.json`. Il recherche `.e2e-fixtures.json` ou une sauvegarde reconnue, tente un vrai `signInWithPassword` pour chacun des trois rôles et valide la session avec `getUser`. Il n'utilise aucune clé privée, ne modifie aucun mot de passe, compte ou profil, et n'imprime aucun secret. Si aucun fichier d'identifiants n'est disponible, le résultat correct est `NON_TESTABLE` ; ne pas remplacer cela par un provisionnement complet. En présence de plusieurs sauvegardes, indiquer explicitement le chemin d'une seule au script.

### Étape A3 — vérification bulk par Node.js, trois rôles en parallèle

Le script `e2e/verify-existing-fixtures-bulk.mjs` prépare trois connexions Auth réelles simultanées. Il utilise d'abord `.e2e-fixtures.json` ou une sauvegarde reconnue. Si aucune n'existe, il demande à l'opérateur les anciens mots de passe Talent, Recruteur et Partenaire dans des champs terminal masqués, puis démarre les trois connexions en parallèle. Chaque session est validée par `getUser`, avec contrôle de l'adresse, de `app_metadata.e2e_fixture` et du rôle signé. Une seule tentative est réalisée par rôle. Aucun mot de passe n'est imprimé ni sauvegardé ; aucune clé privée, réinitialisation, création/suppression de compte ou modification de profil n'est utilisée. Commande : `node e2e/verify-existing-fixtures-bulk.mjs`. Rapport : `artifacts/e2e/fixture-password-verification-bulk.json`. N'exécuter que si l'opérateur connaît les anciens mots de passe ; ne jamais les deviner.

### Étape B — tester les anciens identifiants avec l'opérateur

Si les anciens identifiants sont récupérés depuis une source sûre :
- tester séparément Talent, Recruteur et Partenaire par véritable Auth `signInWithPassword` ;
- vérifier `app_metadata.e2e_fixture` et `app_metadata.e2e_role` ;
- fermer chaque session ;
- retourner seulement PASS, FAIL ou NON TESTABLE pour chaque rôle.

Aucun renouvellement de mot de passe pendant cette étape.

### Étape C — restauration ciblée

- Si les anciens identifiants fonctionnent, reconstruire les fixtures locales à partir des valeurs existantes de manière sécurisée ; ne pas appeler le provisionnement complet.
- Si les identifiants sont introuvables ou ne fonctionnent plus, présenter à l'utilisateur les preuves et demander son autorisation avant toute réinitialisation ciblée des trois comptes existants.
- Ne jamais supprimer/recréer les utilisateurs Auth ni leurs profils pour résoudre un simple problème de fichiers locaux.

### Étape D — runtime privé

Une fois les fixtures locales correctement restaurées, restaurer le runtime JOBLY-E2E par le chemin `--runtime-only`. La clé reste dans le terminal/fichier local protégé ; jamais dans le chat. Vérifier le rapport de restauration avant de lancer la recette complète.

### Étape E — nouvelle recette

1. Récupérer la dernière branche `e2e/recette`.
2. Vérifier que le HEAD local correspond au SHA attendu.
3. Exécuter la recette complète une seule fois, sur JOBLY-E2E uniquement.
4. Ouvrir et transmettre les rapports non sensibles : bilan global, résumé Markdown/JSON, smoke Auth, smoke API authentifié, smoke navigateur et logs des lots en BLOCKED/PARTIAL.
5. Examiner chaque résultat avant toute correction.
6. Ne déclarer PASS que sur la base de contrôles exécutés et de preuves de persistance/nettoyage.
7. Mettre à jour ce document avec la date, le SHA, les résultats et les actions restantes.

## 8. Format standard de compte rendu

À chaque exécution, consigner :
- date/heure de début et de fin, fuseau horaire ;
- environnement et référence du projet ;
- SHA exact du commit ;
- version Node.js/pnpm ;
- commande lancée ;
- statut global et statut de chaque lot ;
- nombre de tests exécutés, PASS, FAIL, BLOCKED et SKIPPED ;
- contrôles transverses, dont Auth réel, API authentifiées, navigateur, typecheck et build ;
- identifiant d'exécution GitHub Actions éventuel ;
- anomalies avec fichier/log et étapes de reproduction ;
- preuve de nettoyage des données synthétiques ;
- changements de données/identifiants explicitement autorisés ;
- décision de reprise et responsable de la prochaine action.

**Ne jamais inclure** mots de passe, clés privées, jetons, en-têtes Authorization, cookies, CV ou données personnelles réelles.

---

## 9. Point exact de reprise — HISTORIQUE OBSOLÈTE, NE PAS EXÉCUTER

> **Alerte critique :** la phrase d'autorisation de génération de nouveaux mots de passe ci-dessous est un enregistrement historique, pas une autorisation actuelle. La commande node e2e/reset-existing-fixture-passwords.mjs --confirm-reset-existing-e2e-passwords est interdite dans la reprise actuelle. Ne pas l'exécuter, ne pas demander la clé privée et ne pas recréer ni réinitialiser les fixtures. Le script local modifié reste à préserver.


**Décision utilisateur enregistrée :** l'utilisateur a autorisé la génération de nouveaux mots de passe pour les trois identités Auth fixtures EXISTANTES (Talent, Recruteur, Partenaire). Cette autorisation n'inclut ni la création/suppression des comptes, ni la modification des profils, ni l'accès à JOBLY-PROD.

**Prochaine action opérateur :** synchroniser `e2e/recette`, puis exécuter `node e2e/reset-existing-fixture-passwords.mjs --confirm-reset-existing-e2e-passwords`. Le script demande la confirmation textuelle `RESET 3 JOBLY-E2E PASSWORDS`, exige une clé privée JOBLY-E2E, vérifie en lecture seule les trois comptes Auth, leurs rôles, les liaisons `public.User` et les profils, puis ne met à jour que leurs mots de passe. Il enregistre les nouveaux identifiants dans `.e2e-fixtures.json`, ignoré par Git, et un état de reprise sécurisé dans `.e2e-fixture-password-reset.pending.json` en cas d'interruption. Il vérifie ensuite les nouvelles connexions et génère `artifacts/e2e/fixture-password-reset.json`. Ne jamais joindre ni afficher les fichiers locaux sensibles.

Après un rapport PASS, exécuter la recette complète `node scripts/e2e-local-recipe.mjs` et transmettre le rapport consolidé. Ne pas lancer avant que l'opérateur ait terminé le reset et confirmé son rapport.


**État attendu du prochain échange :**
- Talent : PASS / FAIL / NON TESTABLE.
- Recruteur : PASS / FAIL / NON TESTABLE.
- Partenaire : PASS / FAIL / NON TESTABLE.
- Sauvegarde de `.e2e-fixtures.json` : PRESENT / ABSENT.
- Source locale d'une clé JOBLY-E2E : PRESENT / ABSENT (ne jamais révéler la valeur).

**Décisions :** réinitialisation ciblée des seuls mots de passe des trois comptes fixtures existants autorisée par l'utilisateur ; création/suppression de compte, modification de profil, fusion PR et déploiement non autorisés.

Ce document est la référence de continuité jusqu'à sa prochaine mise à jour versionnée.


---

## 10. Recette bulk après récupération des fixtures — HISTORIQUE, NE PAS RELANCER — 7 novembre 2026

> Cette exécution et sa prochaine action sont des faits historiques. La consigne de relancer node scripts/e2e-local-recipe.mjs est annulée par le verrou V2.8 et le LOT-00 PARTIAL. Ne pas relancer le bulk.


Rapport opérateur : exécution locale du 7 novembre, 16:37:42.949Z–16:43:39.422Z, Node.js v26.13.0, JOBLY-E2E uniquement, 5 lots en parallèle, 2 fichiers par lot.

- Bilan : 307 tests automatisés ; 0 lot PASS, 10 PARTIAL, 0 BLOCKED, 1 FAIL ; statut global FAIL.
- Provisionnement : PASS, réutilisation des trois fixtures sans rotation ni recréation.
- Auth session : PASS, les 12 contrôles Talent/Recruteur/Partenaire passent.
- TypeScript, build Next.js et Playwright : PASS.
- API authentifiées : 29/30 PASS ; un seul FAIL sur `CROSS-ROLE-APPLICATION-LIFECYCLE-PREPARE` (HTTP 500).
- Cause constatée : `create_application_with_quota(uuid,integer,jsonb)` insère `jsonb_populate_record(null::public."Application", p_application)`. La colonne `officialListingConsent` est `NOT NULL DEFAULT false`, mais une propriété omise du JSON devient `NULL` lors de `jsonb_populate_record`, au lieu de déclencher le défaut SQL.
- Nettoyage : l'offre et la candidature synthétiques ont été vérifiées absentes après le scénario en échec ; aucun effet externe n'a été déclenché.

### Correctif poussé sur e2e/recette

- Commit `8da1f893b26b1e4213de1e63de78f5eda243e4fd` : le POST `/api/applications` fournit maintenant explicitement `officialListingConsent: false` au RPC. Le consentement à la publication officielle reste donc opt-in.
- Commit `b7b79a13aa2f5d34b27a3d1b977d1101315bfad5` : le modèle Prisma `Application` est aligné sur les colonnes `officialListingConsent` et `officialListingDisplayName`, avec l'index correspondant.
- Aucune migration ni écriture supplémentaire sur la base E2E n'est nécessaire pour ce correctif ; la colonne et son défaut sont déjà présents.
- Les lots PARTIAL gardent leur statut : ils signalent des parcours métier non entièrement démontrés, pas des PASS implicites.

### Prochaine exécution opérateur

1. Synchroniser `e2e/recette` avec `git pull --ff-only origin e2e/recette` (conserver les modifications locales du runner ; ne pas réinitialiser la branche).
2. Relancer une seule fois `node scripts/e2e-local-recipe.mjs`.
3. Fournir `artifacts/e2e/local-recipe/summary.md` et `artifacts/e2e/authenticated-role-smoke.json`.
4. Critère ciblé : le scénario croisé doit obtenir PASS à `CROSS-ROLE-APPLICATION-LIFECYCLE-PREPARE`, puis poursuivre la lecture Talent, réception Recruteur, transition INTERVIEW/OFFER, garde de décision et nettoyage.
5. Aucun merge vers `main`, aucun déploiement, aucun accès JOBLY-PROD.

## Correctif de sécurité Recruitment 360 — 7 novembre 2026

Audit ciblé du lot P0 Recruteur/Recruitment 360 : deux contrôles d'accès manquaient dans `app/api/recruitment360/applications/route.ts`.

- **Lecture GET :** lorsqu'un `recruitmentId` était transmis dans la query string, le code l'utilisait directement sans vérifier que l'acteur possédait un rôle sur ce recrutement. La lecture filtre désormais les rôles autorisés (`OWNER`, `HR`, `MANAGER`, `DELEGATE`, `JURY`), dérive les identifiants accessibles de ces adhésions et répond HTTP 403 si le recrutement demandé n'en fait pas partie.
- **Écriture document POST :** l'action `document` insérait un document pour un `applicationId` sans établir l'appartenance de l'acteur au recrutement de cette candidature. Elle vérifie désormais la candidature, son recrutement, puis un rôle d'écriture (`OWNER`, `HR`, `MANAGER`, `DELEGATE`) avant toute insertion. Candidature ou recrutement absent : HTTP 404 ; rôle absent : HTTP 403.
- **Non-régression :** `scripts/recruiter-role-regression.test.mjs` contient deux assertions supplémentaires garantissant l'ordre des contrôles avant la lecture ou l'insertion sensible.

Commits de la branche `e2e/recette` :
- `aaaeb37f` — filtrage des lectures par adhésion RecruitmentRole.
- `51f657bf` — autorisation des ajouts de documents par rôle recruteur.
- `8bee9816` et `64d745cf` — tests de non-régression associés.

**Validation locale :** non exécutée par l'agent. L'opérateur doit récupérer la branche puis lancer `node --experimental-strip-types --test scripts/recruiter-role-regression.test.mjs` et `pnpm typecheck`. Aucun test E2E n'est déclaré PASS sur la seule base de ces modifications de code. PR #266 reste ouverte et en brouillon ; pas de merge dans `main`, pas de déploiement.
 
## Correctif Paiements — référence client non vérifiée

Audit P0 Mobile Money : `POST /api/payments/[id]/verify` acceptait une référence de transaction saisie par le client et l'écrivait immédiatement dans `Payment.reportedTransactionId`, avant de vérifier qu'un reçu marchand de confiance existait pour cette référence.

Risque : une faute de frappe ou une référence inventée pouvait associer définitivement une mauvaise référence à la commande. Le moteur de rapprochement traite ensuite une référence déjà renseignée et différente comme un conflit dur ; la vraie confirmation opérateur risquait donc de ne jamais rapprocher cette commande.

Correction sur `e2e/recette` :
- la référence saisie par le client reste un **indice de recherche non fiable** ;
- elle sert uniquement à rechercher le reçu correspondant dans `PaymentSmsReceipt` ;
- aucun champ `Payment` n'est modifié tant que le reçu marchand indépendant n'a pas été trouvé et contrôlé ;
- la fonction SQL `finalize_payment_from_sms` reste responsable de l'association définitive à partir du reçu marchand validé ;
- aucun droit ni abonnement n'est activé par la seule référence saisie par le client.

Non-régression ajoutée dans `scripts/payment-sms-customer-share.test.mjs` : vérifie que le chemin SMS ne persiste pas `reportedTransactionId` à partir de la saisie non vérifiée.

Commits :
- `843e7077` — référence client non vérifiée en lecture seule.
- `1c9dba04` — test de non-régression.

Validation locale par l'opérateur requise ; aucune transaction réelle n'a été exécutée et aucun paiement n'a été modifié dans une base.

## Correctif Auth — déconnexion limitée à l'appareil courant

Audit Auth P0 : les appels JavaScript à `supabase.auth.signOut()` sans portée explicite utilisent la portée `global` par défaut. Cela invalide les sessions des autres appareils, alors que Jobly expose une gestion de plusieurs sessions indépendantes.

Correction sur `e2e/recette` :
- `lib/session-manager.ts` : la déconnexion du gestionnaire utilise désormais `signOut({ scope: "local" })`.
- `components/AccountSettings.tsx` : le bouton « Se déconnecter de Jobly » ferme uniquement la session courante.
- `lib/supabase.ts` : l'expiration locale du délai « Rester connecté » ferme uniquement cette session et ne déconnecte pas les autres appareils.
- `scripts/authentication-flow-regression.test.mjs` : test supplémentaire vérifiant la portée locale dans ces trois chemins et empêchant le retour involontaire au défaut global.

Le comportement de portée est confirmé par la documentation Supabase : JavaScript utilise `global` par défaut ; `local` termine seulement la session courante et maintient celles des autres appareils. <https://supabase.com/docs/guides/auth/signout>

Commits :
- `1e1842e5` — session manager.
- `7bb4c3b9` — déconnexion depuis les paramètres du compte.
- `c2b539c6` — expiration du rappel « Rester connecté ».
- `e249c0e5` — test de non-régression.

Validation locale par Node.js requise ; aucune session utilisateur réelle n'a été révoquée pendant la correction. PR #266 reste en brouillon ; aucun merge ou déploiement.

## 11. Recette E2E complète après récupération des fixtures — ÉTAT HISTORIQUE — 8 novembre 2026

> Ce rapport reste une preuve historique d'une exécution antérieure. Ses priorités de reprise ne remplacent pas le statut courant des §§15 à 17.


**SHA exact confirmé par l'opérateur :** `f33b0e3564189a8766fe1f357a8fe711368b9653`. Ce SHA correspond au HEAD de la branche `e2e/recette` et à celui de la PR #266 au moment du contrôle GitHub. Le rapport local qui indiquait `Commit: local` est donc désormais rattaché à ce commit par confirmation explicite de l'opérateur.

Rapport local transmis :
- Début : `2026-11-08T03:47:14.898Z`.
- Fin : `2026-11-08T03:55:13.600Z`.
- Node.js : v26.13.0.
- Environnement : JOBLY-E2E uniquement, projet `ofqqrryamslxoqkklraw`.
- Résultat : 339 tests automatisés ; 0 FAIL ; 0 BLOCKED ; 11 PARTIAL.
- Provisionnement des trois fixtures existantes : PASS via restauration du runtime privé.
- Session Auth : PASS.
- TypeScript : PASS.
- Build Next.js : PASS.
- Playwright / responsive : PASS.
- Parcours API authentifiés : PASS, 36/36 contrôles.

### Preuves runtime authentifiées

| Rôle / scénario | Résultat |
|---|---:|
| Talent | 12/12 PASS |
| Recruteur | 19/19 PASS |
| Partenaire | 5/5 PASS |
| Parcours croisé candidature Talent → Recruteur | PASS |
| Nettoyage API et vérification DB de l'offre/candidature synthétiques | PASS |

Le parcours croisé a prouvé : création d'une offre synthétique locale, configuration d'un canal e-mail fictif en domaine `.invalid`, préparation d'une candidature sans envoi externe, visibilité de la même candidature dans les deux espaces, transition `INTERVIEW`, décision `OFFER`, protection de la décision du Recruteur contre une modification Talent, puis suppression de l'offre et de la candidature et contrôle de leur absence en base.

Aucune action externe n'a été effectuée : `externalActions=false`.

### Lecture correcte du statut global

Les 11 lots restent `PARTIAL`, mais il n'y a aucune anomalie FAIL détectée. Les lots sont maintenus PARTIAL parce que leurs critères métier complets ne sont pas tous couverts, pas parce que les 339 tests auraient échoué.

Les deux exécutions bulk précédentes ne doivent pas être additionnées aux 339 tests de recette globale comme s'il s'agissait d'une seule campagne indépendante : elles couvrent en partie les mêmes fichiers et contrats. Le total de 302/302 représente les six groupes du runner de régression sur le même SHA ; les 339 correspondent à une autre exécution du runner E2E par lots, sur le même SHA.

### Priorités de reprise après cette preuve

- **P0 — Talent (LOT-02) :** ajouter des contrôles runtime authentifiés en lecture seule pour le flux d'offres, le détail d'une offre et la lecture du CV original lorsqu'il existe. Ajouter un scénario de sauvegarde CV uniquement avec un fichier synthétique temporaire et un mécanisme de restauration de l'état initial explicitement vérifié ; ne jamais écraser ni supprimer le CV préexistant d'une fixture.
- **P0 — Recruteur 360 (LOT-03) :** compléter l'exercice runtime de score, shortlist et accès aux documents sur des candidatures synthétiques appartenant à l'offre créée pendant le run ; nettoyage et preuve DB obligatoires.
- **P0 — Lot 00 :** compléter l'audit en lecture seule des privilèges directs, RLS, Storage, buckets et politiques sur JOBLY-E2E ; le simple préflight HTTP ne suffit pas.
- **P0 — Paiements (LOT-07) :** préparer un scénario sandbox/double de paiement avec idempotence et réconciliation, sans appel opérateur ni mouvement d'argent.
- **P1 — Mission Afrique (LOT-04) :** valider la collecte et la persistance sur un jeu de sources E2E strictement borné et des identifiants de run, sans lancer d'ingestion Production.
- **P1 — J'IA 360 (LOT-05) :** compléter une session réelle Talent, outils connectés simulés et chemin Internet Brain avec sources de test ; aucune donnée externe inventée.
- **P1 — Mobility (LOT-06) :** exécuter les états de demande, éligibilité, documents et allocation avec fixtures et montants synthétiques.
- **P2 — Events / Community (LOT-08) :** publier, inscrire et modérer uniquement des objets étiquetés E2E, puis les nettoyer.
- **P1 — Career Journey / Admin / BI (LOT-09) :** concevoir des tests runtime authentifiés par rôle ; conserver GET Career Journey en lecture seule et isoler les écritures temporaires.
- **P1 — PWA / Android (LOT-10) :** installer la PWA et vérifier la synchronisation sur un environnement/appareil de test ; le smoke responsive navigateur n'est pas une validation Android physique.

### Garde-fous inchangés

JOBLY-E2E seulement. Ne pas écrire dans JOBLY-PROD. Ne pas fusionner la PR #266, ne pas toucher à `main`, ne pas déployer. Ne pas modifier les profils ni les comptes fixtures existants hors autorisation spécifique. Aucun paiement réel, SMS, e-mail ou candidature externe.

## 12. Extension de la recette runtime authentifiée — ÉTAT PRÉPARATOIRE HISTORIQUE — 8 novembre 2026

> Les statuts « préparés mais pas encore exécutés » de cette section sont remplacés pour E2E-001 par le résultat du §15. Les ajouts de code y sont décrits comme contexte, pas comme preuve runtime.


Après confirmation du SHA de la recette précédente, de nouveaux contrôles ont été ajoutés sur `e2e/recette` pour couvrir des angles encore absents du rapport authentifié. Ces contrôles sont **préparés dans le code mais pas encore exécutés par l'opérateur**.

### Ajouts Talent (lecture sans mutation du profil)

- `TALENT-JOBS-FEED-READ` : lecture authentifiée du flux local, contrat de structure et compteurs.
- `TALENT-AFRICA-FEED-READ` : lecture authentifiée du flux Afrique, contrat de structure et compteurs.
- `TALENT-JOB-DETAIL-READ` : lecture du détail d'une offre active choisie uniquement depuis un flux retourné ; validation du contrat selon la source `discovery` ou `recruiter`.
- `TALENT-CV-ORIGINAL-READ` : accepte uniquement un lien signé privé de 60 secondes ou l'état explicite `CV_NOT_FOUND`. Le lien signé n'est jamais imprimé et le contenu du CV n'est pas téléchargé.
- `TALENT-CAREER-JOURNEY-READ` : lecture GET de Career Journey, des preuves et du portfolio ; aucun état n'est créé ou modifié.

Si aucun emploi actif n'est disponible dans les flux local/Afrique, le contrôle du détail d'offre reste `BLOCKED` et n'est pas transformé en PASS.

### Ajouts Recruteur 360 (refus négatifs, sans persistance)

- `RECRUITMENT360-DENY-UNOWNED-ID` : vérifie en runtime qu'un identifiant de recrutement non détenu retourne HTTP 403.
- `RECRUITMENT360-DOCUMENT-MISSING-APPLICATION` : envoie une requête négative vers l'action document avec une candidature synthétique inexistante et une URL `.invalid` ; le résultat attendu est HTTP 404 avant toute insertion.

Cette seconde requête est un POST négatif volontaire, mais elle ne vise aucune candidature existante et doit s'arrêter avant l'insertion. Aucun document ni aucune ligne métier ne doit être créé.

### Bulk de non-régression associé

Nouveau groupe du runner `scripts/e2e-bulk-runner.mjs` :
- ID : `authenticated-runtime-contracts`.
- Fichier : `scripts/e2e-authenticated-runtime-regression.test.mjs`.
- Couverture : 5 assertions de contrat sur la présence des nouveaux contrôles, leur sélection depuis des résultats authentifiés, les garanties de confidentialité et l'absence d'écritures dans les blocs de lecture.

### Commits préparés sur la branche

- `ca80ed4a` — enregistrement de la recette E2E 11 lots et des 36/36 contrôles authentifiés.
- `6a0691ba` — extension du smoke authentifié Talent et Recruteur 360.
- `29e2fa56` — ajout des assertions de non-régression runtime.
- `b0fae9dc` — ajout du groupe `authenticated-runtime-contracts` au runner bulk.
- `e459b63a` — alignement du contrôle détail selon le contrat des offres `discovery` et `recruiter`.

**Statut de validation :** en attente de l'exécution par l'opérateur. Aucun de ces nouveaux contrôles n'est déclaré PASS sur la base de la seule modification du code.

### Commandes de validation prévues

1. Exécuter le groupe bulk `authenticated-runtime-contracts`.
2. Après PASS de ce groupe, exécuter la recette globale locale pour lancer les nouvelles lectures authentifiées et les contrôles négatifs Recruteur 360.
3. Examiner `artifacts/e2e/authenticated-role-smoke.json` et `artifacts/e2e/local-recipe/summary.md`.

Garde-fous inchangés : JOBLY-E2E uniquement ; aucune écriture sur JOBLY-PROD ; aucune modification des profils ou comptes fixtures existants ; PR #266 conservée en brouillon ; aucun merge dans `main` et aucun déploiement.

---

## 13. Mise à jour V2.5 — correctif E2E-001 commité — 8 novembre 2026

### 13.1 Incident de transfert du script local

L'opérateur a tenté d'exécuter `apply-e2e001-readonly-fix.mjs` depuis `C:\Users\ASUS\Downloads`, puis depuis `C:\Users\ASUS\Jobly`. Les deux tentatives ont retourné `MODULE_NOT_FOUND`. Cela signifie que le script n'était pas présent à ces chemins et qu'il n'a pas été exécuté. Aucun fichier du dépôt local n'a été modifié par ces deux tentatives. **Ne plus demander à l'opérateur de relancer ce script absent.**

Pour éliminer cette dépendance au transfert de fichier, le correctif a été commité directement sur la branche GitHub `e2e/recette`.

### 13.2 Commits du correctif distant

| Commit | Fichier | Modification |
|---|---|---|
| `7bcc2a07a4ee3f9de44bb8e9c28eda5ec9043537` | `e2e/authenticated-role-smoke.mjs` | Suppression de la requête Talent `PUT /api/profile`, des contrôles de persistance associés et placement des marqueurs read-only autour de toute la séquence Talent. |
| `14dd444d1e7a9916abc778ab4503595181bbe829` | `scripts/e2e-authenticated-runtime-regression.test.mjs` | Ajout d'un sixième test qui examine tout le bloc Talent jusqu'au bloc Recruteur et interdit les méthodes HTTP mutatrices ainsi que les méthodes Supabase `insert/upsert/update/delete`. |
| `8385b60400bbaf9cedfcb4aa01073b733533f6c2` | `scripts/e2e-local-recipe.mjs` | Inclusion du test `e2e-authenticated-runtime-regression.test.mjs` dans le catalogue du LOT-01. |

### 13.3 Vérifications du contenu commité

Lecture des trois fichiers depuis GitHub au HEAD `8385b60400bbaf9cedfcb4aa01073b733533f6c2` :

- Smoke Talent : 505 lignes ; aucun appel `request(token, "/api/profile", "PUT")`, aucun identifiant `TALENT-PROFILE-WRITE` ou `TALENT-PROFILE-PERSIST`.
- Marqueur `E2E-READONLY-TALENT-START` placé avant `TALENT-PROFILE-READ` ; marqueur END présent à la fin du bloc Talent.
- Test statique : sixième test présent ; il inspecte la frontière entre `if (item.role === "TALENT")` et `if (item.role === "RECRUITER")`.
- Runner 11 lots : le fichier de régression est listé dans LOT-01.
- Aucun changement de branche `main`, aucune fusion PR, aucun déploiement et aucune requête vers Supabase n'ont été effectués dans cette séquence.

**Limite de preuve :** la relecture distante prouve que le code est commité et que les protections sont présentes. Elle ne prouve pas encore que le test Node.js passe sur le poste Windows. Le statut E2E-001 reste donc **CORRECTIF COMMITÉ — TEST STATIQUE LOCAL EN ATTENTE**, et non PASS.

### 13.4 Prochaine action locale — synchroniser sans écraser les modifications existantes

Le dernier diagnostic opérateur (12:09:34) indiquait que les trois fichiers cibles étaient propres, mais que `e2e/reset-existing-fixture-passwords.mjs` était modifié et que plusieurs rapports et fichiers inhabituels étaient non suivis. Ces changements doivent être préservés.

Commande opérateur dans CMD :

```bat
cd /d C:\Users\ASUS\Jobly
git pull --ff-only origin e2e/recette > feedback-e2e001-sync.txt 2>&1
(
  echo ==== HEAD APRES SYNCHRONISATION ====
  git rev-parse HEAD
  echo ==== ETAT A PRESERVER ====
  git status --short
) >> feedback-e2e001-sync.txt 2>&1
notepad feedback-e2e001-sync.txt
```

Attendu : HEAD `8385b60400bbaf9cedfcb4aa01073b733533f6c2` ou un SHA descendant explicitement vérifié sur la branche `e2e/recette`. Si le pull est refusé à cause d'un conflit ou d'un état local, **ne pas lancer reset, stash, clean ou suppression** ; transmettre le rapport et traiter le conflit en préservant tous les changements.

### 13.5 Test ciblé — seulement après synchronisation vérifiée

Lorsque le rapport de synchronisation confirme que les fichiers modifiés sont bien présents et que le HEAD est le bon :

```bat
cd /d C:\Users\ASUS\Jobly
node --test scripts/e2e-authenticated-runtime-regression.test.mjs > feedback-e2e001-static-test.txt 2>&1
notepad feedback-e2e001-static-test.txt
```

Résultat attendu : les six tests statiques PASS. Si un test échoue, ne pas lancer le smoke runtime Talent ni le runner bulk ; examiner le rapport, corriger puis retester.

### 13.6 Suite après le PASS statique

1. Refaire un audit LOT-00 strictement en lecture seule sur JOBLY-E2E : identité du projet, RLS, grants, Storage/buckets/policies, présence/mapping des fixtures ; ne pas muter de données.
2. Si LOT-00 et E2E-001 sont conformes, exécuter le smoke runtime authentifié en mode read-only, une seule fois et séquentiellement pour les fixtures partagées.
3. Examiner les réponses individuelles Talent : profil GET, applications GET, flux local/Afrique, détail offre, CV original et Career Journey. Un détail d'offre sans offre exploitable reste BLOCKED ; aucune conversion artificielle en PASS.
4. Seulement après preuves de stabilité et d'isolation, relancer la recette bulk avec `E2E_LOT_CONCURRENCY=2`. Garder les scénarios utilisant les mêmes fixtures et objets séquentiels.
5. Ne pas déclarer les lots PASS tant que tous les scénarios métier obligatoires ne sont pas testés et que les preuves d'accès, persistance et nettoyage ne sont pas jointes.

### 13.7 État de continuité après cette mise à jour — HISTORIQUE, REMPLACÉ PAR §§15–17

- E2E-001 : correctif commité sur `e2e/recette` ; test statique local en attente.
- Smoke Auth Talent : ne pas exécuter avant PASS statique et audit LOT-00.
- Campagne bulk locale : ne pas relancer avant fermeture des prérequis.
- JOBLY-E2E : aucune opération runtime effectuée par les commits documentaires/code.
- JOBLY-PROD : interdit, aucun accès.
- PR #266 : ouverte, brouillon, non fusionnée.
- `main` : inchangée.
- Fixtures partagées : aucune modification par cette correction.

---

## 14. Résultat de synchronisation locale et prochaine recette — 8 novembre 2026

### 14.1 Synchronisation opérateur confirmée

Sortie CMD communiquée par l'opérateur après `git pull --ff-only origin e2e/recette` :

- Ancien HEAD local : `546672d`.
- Fast-forward effectué depuis `546672d` vers `e92feb8`.
- Nouveau HEAD local confirmé : `e92feb8abc1a2491cab7dd81e834080b80982681`.
- Quatre fichiers mis à jour par Git : ce document de continuité, le smoke Talent, le test de régression authentifié et le runner 11 lots.
- Aucun conflit, aucun reset, aucun stash et aucune suppression ne figurent dans le résultat transmis.

### 14.2 État local à préserver après la synchronisation

Le rapport `git status --short` transmis indique :

- Modifié : `e2e/reset-existing-fixture-passwords.mjs`. Ce fichier est hors périmètre du correctif E2E-001 ; ne pas l'exécuter, le restaurer, le remplacer, le stager ou le supprimer.
- Non suivis : fichiers de diagnostics, rapports bulk, rapports de recette, `tsconfig.tsbuildinfo`, `typecheck-latest.txt` et entrées inhabituelles affichées par Git (`({`, `)`, `0`, `account.role)`, `item.role`, `item.status`, `role)`, `undefined)`, `{`). Tous restent à préserver.
- Les trois fichiers cibles sont arrivés par fast-forward. Le rapport fourni ne présente aucune erreur de merge.

### 14.3 Action initialement prévue — test statique E2E-001 (exécutée, résultat enregistré au §15)

La commande prévue a été exécutée sur le poste Windows synchronisé. Le résultat intégral a ensuite été transmis : 6 tests PASS, 0 FAIL. La portée exacte et les noms des six contrôles sont consignés au §15. Cette exécution statique ne lance pas le smoke authentifié, ne contacte pas Supabase et ne change aucune fixture.

La condition de passage statique est donc satisfaite. Le contrôle LOT-00 en lecture seule (identité du projet, RLS, grants, Storage/buckets/policies, présence et liaison des fixtures) est maintenant le prochain prérequis. Le smoke runtime Talent et le bulk restent interdits avant fermeture de LOT-00.

### 14.4 Point de reprise après synchronisation (état avant le test statique)

- Branche locale : e2e/recette.
- HEAD local confirmé par le rapport opérateur : e92feb8abc1a2491cab7dd81e834080b80982681.
- À cet instant historique, E2E-001 attendait encore sa validation statique ; ce statut est remplacé par le résultat du §15.
- Aucun accès ou appel JOBLY-E2E n'avait été effectué pendant la synchronisation ; aucun accès JOBLY-PROD.
- Aucune fixture modifiée ; aucun commit local, push, merge ou déploiement rapporté.


---

## 15. PASS statique local E2E-001 — preuve opérateur — 8 novembre 2026

### 15.1 Résultat reçu

L'opérateur a exécuté le test ciblé scripts/e2e-authenticated-runtime-regression.test.mjs après synchronisation de la branche. Sortie transmise :

| Contrôle | Résultat |
|---|---:|
| Talent runtime smoke couvre les flux local et Afrique sans mutation | PASS |
| Talent offer detail is selected only from an authenticated feed result | PASS |
| CV original read accepts only a valid signed-link response or explicit no-CV state | PASS |
| Career Journey runtime smoke uses GET only | PASS |
| Recruitment360 runtime smoke verifies non-owned scope and missing document target without writes | PASS |
| Talent role block is read-only from entry through the Recruiter boundary | PASS |
| **Total** | **6 PASS / 0 FAIL** |

Synthèse Node.js : tests 6, suites 0, pass 6, fail 0, cancelled 0, skipped 0, todo 0, durée 254.0035 ms.

**Gate statique E2E-001 franchi : PASS.**

### 15.2 Portée exacte et limites

Ce résultat valide les six tests automatisés du fichier de régression ciblé. Il confirme notamment que le bloc Talent est protégé en lecture seule sur toute sa portée, depuis son entrée jusqu'à la frontière du bloc Recruteur, et que les contrats statiques des smoke Talent, CV, Career Journey et Recruitment360 sont présents.

Ce résultat n'est PAS :
- un run du smoke runtime authentifié contre l'API JOBLY-E2E ;
- une preuve de session Auth ou de disponibilité des fixtures ;
- une preuve de lecture effective des flux/données en base ;
- une validation complète du LOT-01, des 11 lots ou de la recette globale.

Aucun PASS runtime, aucun PASS LOT-00 et aucun PASS global n'est déduit de cette exécution. Aucun appel Supabase, aucune modification de fixture et aucune mutation métier ne sont rapportés pour ce test ciblé.

### 15.3 Audit LOT-00 initial — résultat détaillé au §16

L'audit initial en lecture seule sur JOBLY-E2E est désormais exécuté et consigné au §16. Le statut reste PARTIAL : l'exposition du schéma PostgreSQL net sur la Data API n'est pas encore confirmée, et les grants clients larges doivent être traités comme un point de moindre privilège. Aucune modification de base n'est autorisée pour fermer ces points sans revue dédiée.

La dernière vérification requise est le contrôle GET du catalogue OpenAPI PostgREST avec les profils public puis net. Le rapport doit confirmer si net fait partie des schémas exposés, sans appeler aucune fonction net.http_*.

1. **Identité de l'environnement** : URL/projet ciblé et confirmation que le ref est exactement ofqqrryamslxoqkklraw.
2. **RLS** : état RLS des tables concernées par les parcours de recette et présence/absence des politiques applicables.
3. **Grants et privilèges** : privilèges directs des rôles concernés, sans accorder ni révoquer de droits.
4. **Storage** : inventaire des buckets, visibilité, policies et accès attendus ; ne pas télécharger ni remplacer un CV ou document fixture.
5. **Fixtures** : présence des trois identités déjà connues et correspondance identité/role, uniquement en lecture ; ne jamais lire ni modifier de mot de passe, session, jeton ou secret.
6. **Traçabilité** : conserver les requêtes de diagnostic, le nombre de lignes et les résultats PASS/PARTIAL/BLOCKED ; masquer toute donnée personnelle ou valeur secrète dans le rapport.

**Interdictions maintenues :** aucun INSERT/UPDATE/DELETE/UPSERT, aucune modification de schéma/policy/grant/bucket, aucun changement de compte ou profil fixture, aucun provisionnement ou reset. Ne pas exécuter e2e/reset-existing-fixture-passwords.mjs. Ne pas lancer le smoke runtime, le parcours croisé ou le bulk avant fermeture et analyse du LOT-00.

Après réception du rapport LOT-00, réconcilier les résultats avec le code et les prérequis avant de décider du premier smoke runtime read-only.

### 15.4 État de continuité courant

- E2E-001 : **PASS statique local — 6/6, 0 échec**.
- LOT-00 : **PARTIAL — audit SQL en lecture seule réalisé ; exposition Data API du schéma net à confirmer**.
- Smoke runtime Talent/Recruteur : **en attente du LOT-00**.
- Recette bulk 11 lots : **suspendue**.
- JOBLY-E2E : aucune mutation associée au test statique.
- JOBLY-PROD : interdit, aucun accès.
- Fixtures partagées : aucune modification.
- Branche : e2e/recette.
- PR #266 : ouverte, brouillon, non fusionnée.
- main : inchangée ; aucun merge ni déploiement.

---

## 16. LOT-00 — audit SQL en lecture seule — 8 novembre 2026

### 16.1 Identification du projet et méthode

Audit réalisé via les outils de lecture de projet et de requête SQL, avec le project_id exact ofqqrryamslxoqkklraw.

- Projet : JOBLY-E2E.
- URL : https://ofqqrryamslxoqkklraw.supabase.co
- État : ACTIVE_HEALTHY.
- Région : eu-west-1.
- PostgreSQL : 17.11.0.018.
- Toutes les requêtes SQL de cette section ont été exécutées sur JOBLY-E2E et sont des SELECT / lectures de catalogues.
- Aucune migration, aucun DDL, aucun DML, aucun changement Auth, aucun changement Storage et aucune lecture de secret ou de contenu de fichier.
- Aucune requête SQL n'a été exécutée contre JOBLY-PROD.

### 16.2 Tables publiques, RLS, politiques et grants

Résultat du contrôle de catalogue :

| Contrôle | Résultat |
|---|---:|
| Tables publiques | 180 |
| Tables avec RLS | 180/180 |
| Tables sans RLS | 0 |
| Tables avec FORCE RLS | 0 |
| Politiques RLS publiques | 215 |
| Tables avec RLS mais sans policy | 26 |
| Tables sans policy ayant un privilège direct anon/authenticated | 0 |

Les 26 tables sans policy sont donc fermées aux rôles clients par absence de privilège direct, tout en restant accessibles au rôle serveur lorsque nécessaire. Le signal Advisor correspondant est INFO, pas une preuve d'exposition de lignes.

Privilèges effectifs relevés au niveau table :

- anon : privilèges sur 23 tables ; les quatre opérations SELECT/INSERT/UPDATE/DELETE sont accordées à ces tables au niveau SQL.
- authenticated : privilèges sur 55 tables ; SELECT sur 55, INSERT sur 24, UPDATE sur 23 et DELETE sur 23.
- service_role : SELECT sur les 180 tables publiques.

Les grants clients sont plus larges que le strict minimum sur plusieurs tables. Les politiques RLS relevées sur les tables vérifiées ajoutent des contrôles par propriétaire (auth.uid() ou lien via User.authUserId) ; les lectures publiques identifiées sont limitées aux données actives/publiées pour Institution, BonPlan et ses commentaires. Les politiques core inspectées comprennent User, Profile, RecruiterProfile, Partner, Application, CandidateFile, CVShare, Career Journey, JiaWatch et RecruitmentApplicationDocument.

**Conclusion grants/RLS :** aucune table sans policy n'est directement accordée aux rôles clients et aucune table publique n'est dépourvue de RLS. Les grants étendus sur des tables protégées par RLS restent toutefois un point de moindre privilège à documenter et réduire dans un chantier dédié ; aucune réduction n'est appliquée pendant la recette.

### 16.3 Storage

- 7 buckets détectés ; 0 objet dans Storage.
- Buckets publics : jobly-events et profile-photos.
- Buckets privés : jobly-payment-proofs, mobility-documents, mobility-provider-documents, recruitment-listings et talent-cvs.
- RLS activé sur storage.buckets et storage.objects.
- 4 policies sur storage.objects, toutes limitées au bucket talent-cvs, au rôle authenticated, avec chemin de dossier fondé sur auth.uid() pour SELECT/INSERT/UPDATE/DELETE.
- Les rôles anon et authenticated ont des privilèges SQL SELECT/INSERT/UPDATE/DELETE sur storage.objects, mais RLS s'applique. Aucune policy anon n'a été trouvée ; aucune policy utilisateur n'a été trouvée pour les buckets privés hors talent-cvs. Le comportement attendu est donc le refus par défaut pour ces buckets privés.
- Les deux buckets publics n'ont actuellement aucun objet ; l'accès public à leurs futurs objets découlera de leur configuration publique.

**Point de contrôle restant :** confirmer que le statut public de jobly-events et profile-photos correspond à l'intention produit et conserver les documents privés hors accès client direct sans policy spécifique.

### 16.4 Fixtures et correspondances Auth

Comptages agrégés uniquement ; aucun e-mail, mot de passe, jeton ni identifiant personnel n'a été extrait dans le rapport.

| Contrôle | Résultat |
|---|---:|
| Utilisateurs Auth | 4 |
| Lignes public.User | 4 |
| Liens User.authUserId → auth.users | 4/4 |
| Identités marquées e2e_fixture | 3 |
| Fixtures TALENT / RECRUITER / PARTNER | 1 / 1 / 1 |
| Mismatch entre e2e_role et public.User.role | 0 |
| Comptes Auth confirmés | 4 |
| Comptes non bannis | 4 |
| Profil Talent lié | 1 |
| Profil Recruteur lié | 1 |
| Profil Partenaire lié | 1 |

Répartition public.User : ADMIN 1, TALENT 1, RECRUITER 1, PARTNER 1. Le lien Partner est établi via public.User.id ; le lien RecruiterProfile via public.User.authUserId. Aucune écriture ou modification de fixture.

### 16.5 Advisor et fonctions privilégiées

Advisor sécurité JOBLY-E2E :

- 26 avis INFO rls_enabled_no_policy, cohérents avec le catalogue : aucun privilège direct client sur ces 26 tables.
- 1 avertissement extension_in_public : extension pg_net version 0.20.4 installée avec son namespace d'extension public.
- 1 avertissement anon_security_definer_function_executable et 1 avertissement authenticated : public.get_public_home_stats() est un SECURITY DEFINER exécutable par anon et authenticated.
- 1 avertissement auth_leaked_password_protection : protection des mots de passe compromis désactivée (limitation de forfait déjà identifiée).

La fonction public.get_public_home_stats() a été lue sans exécution. Elle ne prend aucun argument et retourne uniquement offersCount, talentsCount et updatedAt. Son search_path est vide et ses relations sont qualifiées en public. L'exposition publique de ces seuls agrégats paraît cohérente avec son nom et son usage de statistiques d'accueil ; ce n'est pas une exposition de données personnelles détectée dans son corps actuel.

Pour pg_net, les fonctions HTTP sont situées dans le schéma PostgreSQL net. Les contrôles SQL indiquent :
- USAGE du schéma net accordé à anon et authenticated ;
- CREATE non accordé à ces rôles ;
- EXECUTE accordé à anon et authenticated sur les fonctions net.http_get, net.http_post, net.http_delete et fonctions auxiliaires.

La présence de ces privilèges ne suffit pas à prouver que le schéma net est exposé par PostgREST. Le paramètre PostgREST exposé n'a pas pu être lu depuis la session SQL. **Ne jamais appeler net.http_* pendant cette vérification.**

### 16.6 Statut LOT-00

**LOT-00 = PARTIAL, non clos.**

Contrôles satisfaits :
- identité projet JOBLY-E2E et disponibilité confirmées ;
- RLS activé sur 180/180 tables publiques ;
- absence de privilèges clients directs sur les 26 tables RLS sans policy ;
- présence et correspondance des 3 fixtures métier E2E confirmées ;
- inventaire des buckets et policies Storage établi.

Points à fermer avant le PASS LOT-00 :
1. Confirmer par GET OpenAPI PostgREST que le schéma net n'est pas exposé aux clients ; aucun appel RPC ou fonction net.http_*.
2. Valider que les deux buckets publics jobly-events et profile-photos sont intentionnels.
3. Documenter le plan de moindre privilège des grants table/storage, sans modifier les droits dans le cadre de cette recette.

### 16.7 Contrôle OpenAPI GET — méthode initiale invalidée le 8 novembre 2026

La commande initiale utilisait la clé publishable `sb_publishable_...` à la racine exacte `/rest/v1/`. Le rapport opérateur `feedback-lot00-net-schema-exposure.txt` a retourné :

- `public` : HTTP 401, `apiSchemaAccepted=false`, `openapi=false`, message `Secret API key required` ;
- `net` : HTTP 401, `apiSchemaAccepted=false`, `openapi=false`, même message ;
- synthèse : `GATE=BLOCKED_REVIEW_REQUIRED`.

**Interprétation :** les deux requêtes ont été rejetées au contrôle de clé avant la négociation des profils PostgREST. Ce résultat ne prouve ni que `net` est exposé, ni qu'il est masqué. La procédure utilisant la clé publishable à cette racine est invalidée et ne doit pas être répétée.

Pour la racine OpenAPI, utiliser la procédure corrigée au §22.3 : une clé secrète de JOBLY-E2E (`sb_secret_...`) ou l'ancienne clé `service_role`, saisie localement et masquée. La requête reste strictement GET, sur l'unique endpoint `/rest/v1/`, pour lire le catalogue de schémas ; aucun objet métier, table, fonction RPC ou endpoint `net.http_*` n'est appelé. La clé secrète contourne RLS : son usage est donc limité à ces deux lectures de métadonnées et elle ne doit jamais être copiée dans le rapport, les logs, le chat ou Git.

Références Supabase : la racine OpenAPI peut exiger une clé d'administration ; les clés `sb_secret_...` sont privilégiées et doivent rester côté opérateur. Voir https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup et https://supabase.com/docs/guides/getting-started/api-keys.

Après le test corrigé, analyser séparément le résultat `public` et le résultat `net`. Tout 401/403, erreur réseau, réponse ambiguë ou schéma `net` accepté maintient le blocage. Aucun grant, rôle, schéma ou policy ne doit être modifié à partir d'un simple échec d'authentification.

### 16.8 État courant

- E2E-001 : **PASS statique local — 6/6**.
- LOT-00 : **PARTIAL — le GET OpenAPI précédent a été rejeté en 401 avec la clé publishable ; nouvelle méthode secret-key GET-only documentée au §22 ; décision Storage et matrice grants/policies toujours en attente**.
- Smoke runtime Talent/Recruteur : **suspendu jusqu'à LOT-00 PASS**.
- Recette bulk 11 lots : **suspendue**.
- JOBLY-PROD : aucune requête SQL, aucune écriture.
- Fixtures partagées : inchangées.
- PR #266 : ouverte, brouillon, non fusionnée.
- main : inchangée ; aucun merge ni déploiement.


---

## 17. Audit de continuité et de reprise — V2.8 — 8 novembre 2026

### 17.1 Périmètre et références vérifiées

Audit effectué sur le contenu GitHub de docs/e2e/CONTINUITE-RECETTE-E2E.md, branche e2e/recette.

- Blob du document audité avant cet audit : 12bdb974d3e442dc6c5908ad49025cb8a7216094.
- HEAD de la PR #266 au contrôle : 06152a7347cdb3399d36352462cab73e81ae2061.
- PR #266 : ouverte, brouillon, non fusionnée.
- Comparaison du HEAD local communiqué e92feb8abc1a2491cab7dd81e834080b80982681 avec le HEAD distant : 3 commits d'avance côté distant, tous limités à docs/e2e/CONTINUITE-RECETTE-E2E.md, aucune différence de code dans cette comparaison.
- Le résultat opérateur du test statique 6/6 reste donc rattaché au même code que celui comparé sur la branche distante. En revanche, le document local est en retard et doit être synchronisé avant toute prochaine modification documentaire locale.
- Le résultat E2E-001 est PASS STATIQUE LOCAL ; il ne prouve ni authentification runtime, ni lecture réelle d'API, ni recette globale.

### 17.2 Défauts documentaires détectés et traitement

| Gravité | Défaut | Risque | Traitement V2.8 |
|---|---|---|---|
| CRITIQUE | Le §9 conserve une autorisation historique de réinitialisation des trois mots de passe et une commande exécutable. | Un nouvel opérateur pourrait croire que cette autorisation est encore valable et modifier des fixtures partagées. | Le §9 est explicitement marqué historique et interdit d'exécution ; le verrou est répété en tête du document. |
| ÉLEVÉE | Les §§7 et 10 contiennent des instructions d'Auth, de restauration ou de relance complète/bulk qui précèdent les garde-fous actuels. | Connexion Auth, provisionnement ou runner pouvant toucher les fixtures avant la fermeture de LOT-00. | Ces séquences sont marquées historiques ; les scripts cités ne sont pas autorisés par la reprise V2.8. |
| ÉLEVÉE | Le §13.7 indique encore que le test statique E2E-001 est en attente. | Deux statuts incompatibles dans le même document. | Le statut est explicitement subordonné aux §§15 à 17 ; le résultat courant est celui du §15 : 6/6 PASS. |
| ÉLEVÉE | Le critère de sortie LOT-00 mélange exposition net, statut des buckets publics et durcissement des grants sans distinguer preuve minimale et remédiation. | Risque de déclarer LOT-00 vert sur un contrôle partiel ou, inversement, d'appliquer des changements de privilèges hors périmètre. | Le LOT-00 reste PARTIAL. Il faut une preuve GET net, une décision sur les buckets publics et une matrice documentée des grants/policies pertinents. Aucune modification SQL n'est permise dans cette recette. |
| MOYENNE | Le constat RLS 180/180 est présenté à côté de grants clients larges ; les policies n'ont été décrites que pour les tables inspectées, pas démontrées exhaustivement pour les 180 tables. | Confondre activation RLS et validation de la qualité de toutes les policies. | Ne pas conclure à une sécurité complète. La revue doit couvrir les tables/routines effectivement accessibles aux rôles clients dans le périmètre E2E et rapprocher privilèges, policies et opérations métier. |
| MOYENNE | Les deux buckets publics sont identifiés mais leur intention produit n'est pas attestée. | Une visibilité publique par configuration pourrait être involontaire, même si les buckets sont actuellement vides. | Maintenir le point ouvert ; demander une décision métier explicite avant de les traiter comme conformes. |
| MOYENNE | Le contrôle OpenAPI §16.7 ne valide que l'exposition Data API du schéma demandé ; il ne valide ni toutes les policies RLS, ni les grants de chaque table, ni les droits Storage. | Surinterpréter un 406 PGRST106 comme une certification complète de sécurité. | Le résultat net ne ferme que ce point précis ; il doit être combiné avec les deux autres contrôles LOT-00. |
| MOYENNE | Le dernier HEAD local connu est e92feb8, alors que la PR est au HEAD 06152a7. | Les fichiers documentaires locaux ne reflètent pas les trois commits distants. | La comparaison confirme que ces trois commits ne changent que le document. Pas de pull nécessaire pour exécuter le GET autonome du §16.7 ; synchroniser la branche avant toute nouvelle édition/commande dépendant de fichiers versionnés. |
| FAIBLE | Plusieurs sous-sections historiques ont des statuts « en attente » conservés après que les tests ont été exécutés ; quelques parenthèses/points parasites rendaient certains noms de fichiers ou SHA moins lisibles. | Ambiguïté lors de la reprise et mauvaise lecture des statuts. | Ajout de marqueurs historiques et correction des coquilles ciblées ; conserver les anciennes preuves sans les réinterpréter. |

### 17.3 Validation de la méthode du contrôle OpenAPI §16.7

La méthode est cohérente avec PostgREST : pour GET/HEAD, Accept-Profile sélectionne le schéma ; un schéma absent de la liste exposée est refusé avec PGRST106. PostgREST indique également que la sélection de schéma s'applique à OpenAPI. Références :
- https://docs.postgrest.org/en/latest/references/api/schemas.html
- https://supabase.com/docs/guides/api/using-custom-schemas

La commande du §16.7 reste un GET seulement et peut être exécutée sans synchroniser le dépôt, car elle ne dépend d'aucun fichier du code local. Interprétation à conserver :
- public accepté (réponse HTTP réussie) et net refusé avec PGRST106 : preuve que net n'est pas dans les schémas exposés par cette Data API à cet instant ; ce résultat ne prouve rien sur les autres contrôles.
- net accepté : LOT-00 reste BLOCKED sur l'exposition du schéma ; aucune correction automatique.
- 401/403, erreur réseau, réponse non JSON, ou résultat différent : BLOCKED/ambigu ; ne rien modifier et faire analyser le rapport.

### 17.4 Critères de fermeture LOT-00 — version clarifiée

LOT-00 ne pourra être déclaré PASS que lorsque les preuves suivantes seront regroupées et relues :

1. **Identité** : endpoint et project ref correspondent exactement à JOBLY-E2E ofqqrryamslxoqkklraw.
2. **Exposition API** : public est accessible selon le contrat attendu et net n'est pas exposé (PGRST106 sur le profil net).
3. **Storage** : décision explicite que jobly-events et profile-photos doivent être publics ; les buckets privés et les accès attendus sont documentés.
4. **Moindre privilège** : matrice limitée aux tables/routines/objets Storage utilisés par la recette, avec rôle, privilèges directs, RLS, policies applicables et opérations nécessaires. Les écarts doivent être classés et faire l'objet d'un plan approuvé. Aucun grant, policy, bucket ou schéma ne sera modifié dans le cadre de la recette sans autorisation séparée.
5. **Fixtures et runtime** : correspondance des trois fixtures déjà établie en lecture seule ; disponibilité du moyen local d'authentification/runtime JOBLY-E2E à confirmer séparément, sans réinitialiser les mots de passe et sans exposer le secret.

L'activation RLS sur 180/180 tables est un bon indicateur de couverture technique, mais ne remplace pas les points 2 à 5 et ne suffit pas à certifier les policies de toutes les tables.

### 17.5 Séquence de reprise autorisée — une seule action à la fois

**Action autorisée maintenant :** exécuter exclusivement le contrôle GET OpenAPI corrigé du §22.3 avec une clé d'administration JOBLY-E2E saisie localement et masquée, puis transmettre uniquement le rapport non sensible `feedback-lot00-net-schema-exposure-v2.txt`.

**Ne pas lancer avant analyse de ce résultat et fermeture LOT-00 :**
- tout smoke Auth/runtime Talent ou Recruteur ;
- le parcours croisé Talent → Recruteur ;
- le runner scripts/e2e-local-recipe.mjs ou tout bulk ;
- les scripts de vérification, provisionnement, restauration ou reset des fixtures ;
- toute commande SQL DDL/DML ou modification de grants/policies/buckets ;
- tout accès JOBLY-PROD, merge PR #266, modification de main ou déploiement.

Après réception du GET corrigé, analyser les codes HTTP et le code PostgREST, puis choisir uniquement le prochain contrôle read-only nécessaire. Ne pas enchaîner automatiquement les opérations.

**Mise à jour V2.13 :** une tentative identique depuis l'environnement Node.js isolé de l'agent a échoué avant réponse HTTP (`fetch failed`, Node.js v22.16.0). Elle ne remplace pas le contrôle opérateur ; voir §21. Aucun résultat HTTP n'a été obtenu et LOT-00 reste PARTIAL.

### 17.6 État de reprise faisant foi après l'audit

- E2E-001 : **PASS STATIQUE LOCAL — 6/6, 0 échec**.
- LOT-00 : **PARTIAL** ; GET net, validation de l'intention des deux buckets publics et matrice grants/policies ciblée encore requis.
- Smoke runtime authentifié : **NON AUTORISÉ à ce stade**.
- Runner bulk / recette 11 lots : **SUSPENDU**.
- Fixtures partagées / mots de passe / profils : **aucune modification autorisée par ce document**.
- JOBLY-E2E : seul environnement autorisé, mais aucun nouvel appel runtime avant fermeture du gate.
- JOBLY-PROD : interdit.
- Branche : e2e/recette.
- PR #266 : **ouverte, brouillon, non fusionnée**.
- main : aucun merge ; aucun déploiement.


---

## 18. Retransmission du résultat E2E-001 — 8 novembre 2026

L'opérateur a retransmis le même extrait de sortie Node.js que celui déjà enregistré au §15.1. La comparaison des six intitulés, des compteurs et de la durée est identique :

- 6 tests ; 6 PASS ; 0 FAIL.
- 0 cancelled, 0 skipped, 0 todo.
- Durée affichée : 254.0035 ms.
- Les six tests couvrent les contrats statiques Talent local/Afrique, sélection de détail depuis un flux authentifié, lecture CV, Career Journey GET-only, refus négatifs Recruitment360 sans écriture, et lecture seule du bloc Talent.

**Traitement :** retransmission reconnue comme doublon de la preuve du §15.1 ; aucune nouvelle exécution distincte n'est établie et aucun nouveau statut n'est attribué. E2E-001 reste PASS STATIQUE LOCAL — 6/6.

**Important : ce contenu ne correspond pas au rapport LOT-00 demandé.** Il ne contient ni code HTTP pour le GET OpenAPI du profil `public`, ni code HTTP/code PostgREST pour le profil `net`. Il ne permet donc pas de fermer, de faire avancer ou de requalifier LOT-00.

### 18.1 Prochaine preuve attendue

Le seul contrôle restant autorisé à ce stade demeure la commande GET uniquement décrite au §16.7. Le fichier attendu est `feedback-lot00-net-schema-exposure.txt`, qui doit contenir les deux résultats (schéma `public` et schéma `net`), avec statut HTTP et code/message PostgREST si disponible.

Jusqu'à réception et analyse de ce rapport :
- LOT-00 : **PARTIAL** ;
- smoke runtime Auth : **NON AUTORISÉ** ;
- parcours croisé : **SUSPENDU** ;
- runner bulk / recette 11 lots : **SUSPENDU** ;
- fixtures partagées : inchangées et à préserver ;
- JOBLY-PROD : interdit.


---

## 19. Recettes sans comptes authentifiés — résultats CI — 8 novembre 2026

### 19.1 Périmètre et rattachement de code

Contrôle des exécutions GitHub Actions associées à la PR #266, branche `e2e/recette`, HEAD `5aff245361c053337328bd98e7ca8727400e52e7`.

Comparaison entre le commit code E2E-001 `8385b60400bbaf9cedfcb4aa01073b733533f6c2` et ce HEAD :
- 6 commits d'avance ;
- un seul fichier modifié : `docs/e2e/CONTINUITE-RECETTE-E2E.md` ;
- aucun changement de code applicatif ou de tests entre ces deux références.

Les exécutions ci-dessous valident donc le code présent au SHA `8385b604...`, avec uniquement des ajouts documentaires ensuite. PR #266 reste ouverte, en brouillon et non fusionnée.

### 19.2 Recettes sans authentification confirmées PASS

| Domaine | Workflow / run | Résultat | Portée |
|---|---|---|---|
| CI générale | Jobly CI — run `42478108383` | PASS | Tests de régression, typecheck et build terminés avec succès. |
| Admin 360 / BI | Jobly CI — job isolé PostgreSQL | PASS | Création d'un PostgreSQL temporaire, migrations Admin 360 et BI, vérification RLS, grants, singleton racine et backfill BI. Aucun compte JOBLY-E2E. |
| Conversations J'IA | Jobly CI — job isolé PostgreSQL | PASS | Migration de conversation canonique, privilèges, RLS, contraintes et idempotence sur PostgreSQL temporaire. |
| Security Core | run `42478108345` | PASS | Migrations Security Core et verrouillage pg_net appliqués et vérifiés sur PostgreSQL local éphémère ; contrôle du rate limiter atomique et des grants. Aucun accès au projet Supabase JOBLY-E2E. |
| Registre Afrique | run `42478108363` | PASS | 51 tests Deno passés, 0 échec ; audit du registre et des états d'activation. |
| Fraîcheur / contact Afrique | run `42478108412` | PASS | 16 tests passés, 0 échec ; type-check des fonctions de récolte et test des bornes de fraîcheur sur deux mois. Le job `shadow-crawl` a été SKIPPED parce que l'événement était `pull_request` : aucune collecte réelle ni ingestion n'a été exécutée par ce workflow. |
| Confidentialité Android | run `42478108415` — job `privacy-tests` | PASS | 16 tests Node.js passés, 0 échec. |
| Build Android | run `42478108415` — job `android-debug-build` | PASS | Compilation de l'APK debug et dépôt de l'artefact réussis ; ce n'est pas encore le résultat du smoke sur émulateur. |
| Pipeline des offres / normalisation / J'IA | run `42478108380` | PASS | Tests de batch d'identifiants Supabase, normalisation Gemini, parcours source-only et handoff J'IA, typecheck, build et smoke J'IA Watch réussis. Le smoke J'IA Watch affiche 4/4 chemins de décision et atténuation des contradictions. |
| Auth UI — régression de code | Jobly CI — étape du run `42478108383` | PASS | Tests de régression du code d'authentification et du choix de compte Google ; ce sont des tests automatisés de code/UI, pas des connexions réelles avec les fixtures Talent/Recruteur/Partenaire. |

Liens des workflows :
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108383
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108345
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108363
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108412
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108415
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108380

### 19.3 Vérifications encore en cours ou non couvertes

- Android J'IA WebView, run `42478108415` : les jobs privacy-tests et android-debug-build sont PASS ; le job `android-emulator-smoke` était encore `in_progress` au dernier contrôle. Ne pas déclarer le smoke émulateur PASS avant la conclusion finale du job.
- Les contrôles de build et tests unitaires de la CI ne remplacent pas les parcours de navigation publique sur un navigateur réel.
- Aucun smoke navigateur public autonome n'est enregistré comme nouvelle exécution dans cette section.
- Aucun test runtime nécessitant une session Auth n'a été exécuté par les runs listés ci-dessus.
- Aucun compte fixture, profil, mot de passe ou session n'a été modifié par ces workflows.
- Le workflow E2E complet 11 lots n'a pas été exécuté par cette démarche.

### 19.4 Portée et limites des PASS

Les PASS du présent chapitre prouvent l'exécution des tests unitaires, statiques, de compilation et des migrations sur des bases PostgreSQL éphémères explicitement utilisées par les workflows.

Ils ne prouvent pas :
- l'authentification réelle des comptes Talent, Recruteur ou Partenaire ;
- les permissions effectives sur les tables du projet JOBLY-E2E en production de test ;
- la visibilité réelle des offres via les API JOBLY-E2E ;
- la sécurité globale de toutes les policies RLS et de tous les buckets Storage ;
- la persistance ou le nettoyage de parcours métier dans JOBLY-E2E ;
- la recette globale des 11 lots.

Les tests Security Core sur PostgreSQL isolé ne constituent pas une application de migration à JOBLY-E2E. Ils ne ferment pas non plus le point d'exposition du schéma `net` relevé au §16.

### 19.5 État de reprise après les recettes sans compte

- Recettes CI sans comptes : plusieurs groupes **PASS**, détaillés ci-dessus.
- E2E-001 : **PASS STATIQUE LOCAL — 6/6** ; la retransmission précédente reste un doublon, cf. §18.
- LOT-00 : **PARTIAL**, toujours en attente du GET OpenAPI `public/net`, de la confirmation métier des deux buckets publics et de la matrice grants/policies ciblée.
- Smoke runtime authentifié Talent/Recruteur : **NON AUTORISÉ** tant que LOT-00 n'est pas clos.
- Parcours croisé Talent → Recruteur : **SUSPENDU**.
- Runner bulk / recette globale 11 lots : **SUSPENDU**.
- JOBLY-PROD : interdit ; aucun accès ni écriture.
- PR #266 : ouverte, brouillon, non fusionnée ; aucun merge dans `main`, aucun déploiement.

### 19.6 Prochaines recettes non authentifiées envisageables

Après le contrôle GET LOT-00 demandé au §16.7 et sans démarrer le runner global, les prochaines recettes isolables sont :
1. tests statiques de routes publiques et de pages anonymes, après vérification de leur code pour garantir l'absence d'appel à Auth ou d'écriture ;
2. audit de rendu public du flux d'offres et de la page détail avec un serveur local et données de démonstration non persistées ;
3. tests responsive/PWA et navigation anonyme, séparés des parcours Talent connectés.

Ces recettes ne doivent pas être qualifiées de PASS tant qu'une exécution et un rapport daté, rattachés au SHA exact, ne sont pas disponibles.


### 19.7 Smoke navigateur anonyme — inspection du code, non exécuté

Fichier examiné : e2e/browser-smoke.mjs, blob 87d7acbadce230d5b343ee6025e246e0016408d2.

Le script prévoit des contrôles réalisables sans session utilisateur :
- page d'accueil publique et réponse GET /api/public/home-stats ;
- affichage du formulaire de connexion et des boutons Google ;
- navigation vers le formulaire d'inscription, sans soumission ;
- affichage/masquage du mot de passe ;
- page d'accueil mobile à 390 px, sans débordement horizontal ni chevauchement ;
- six GET anonymes qui doivent répondre HTTP 401 : /api/profile, /api/jobs, /api/applications, /api/talent/ai-bonus, /api/talent/cv/original et /api/career-journey.

Préconditions techniques : serveur local accessible via E2E_BASE_URL (par défaut localhost:3000), ref exact JOBLY-E2E ofqqrryamslxoqkklraw, URL et clé publishable JOBLY-E2E, Playwright installé. Le script écrit des captures et un rapport local dans artifacts/e2e. Il ne soumet aucun formulaire, OTP, paiement, candidature, e-mail ou demande externe.

**Réserve de preuve :** le script lit aussi artifacts/e2e/auth-session-smoke.json. Si ce fichier existe et satisfait les critères de fraîcheur et de complétude, il peut marquer AUTH-006/007 PASS à partir de cette preuve antérieure. Ce mécanisme ne réalise pas lui-même une authentification, mais il mélange le résultat du smoke anonyme à un rapport Auth préexistant. Pour obtenir un rapport strictement anonyme, il faut ajouter un mode explicite qui désactive la lecture et l'importation de cette preuve Auth, sans supprimer, renommer ni écraser les artefacts locaux existants.

**Décision de sécurité :** le script n'a pas été lancé. Malgré l'absence de compte nécessaire pour les contrôles publics, il réalise des appels runtime à JOBLY-E2E. Le verrou LOT-00 interdit encore tout smoke runtime avant fermeture du gate. Après LOT-00 PASS et séparation explicite de la preuve Auth, ce smoke pourra être exécuté comme recette navigateur anonyme isolée.


---

## 20. Premier lot — contrôles statiques publics et anonymes — 8 novembre 2026

### 20.1 Objectif et base de code

Premier sous-lot du plan §19.6 : tests de logique UI/API publique et vérifications statiques de pages utilisables sans compte. Aucun test de session Auth ni aucune écriture JOBLY-E2E n'est autorisé dans ce sous-lot.

- HEAD PR avant cet ajout : 635f5fbb8483ceefa63fec832ed84acaccec0a91.
- SHA de code de référence : 8385b60400bbaf9cedfcb4aa01073b733533f6c2.
- Comparaison entre ces deux SHAs : 8 commits d'avance, un seul fichier modifié (docs/e2e/CONTINUITE-RECETTE-E2E.md) ; aucune différence de code applicatif ou de test.
- PR #266 : ouverte, brouillon, non fusionnée.

### 20.2 Résultats CI du sous-lot statique — PASS 40/40

Les journaux des workflows PR rattachés au code ci-dessus montrent les exécutions suivantes :

| Fichier / groupe | Tests | Résultat | Contrôles |
|---|---:|---:|---|
| scripts/company-logo-fallback.test.mjs | 3 | 3 PASS / 0 FAIL | Initiales de logo, valeur de repli et SVG assaini/déterministe. |
| scripts/p2-jobly-offer-watermark.test.mjs | 3 | 3 PASS / 0 FAIL | Filigrane décoratif, absence d'interception des interactions et rendu feed/détail. |
| scripts/external-application-assistant.test.mjs + scripts/jia-extension-onboarding.test.mjs | 24 | 24 PASS / 0 FAIL | Offres sans canal direct, accès au site promoteur, détail GET sans mutation, ingestion strictement POST, relais J’IA et permissions de l'extension. Les tests inspectent le code ; ils ne soumettent pas de candidature et n'ouvrent pas de session Auth. |
| scripts/offline-first.test.mjs | 10 | 10 PASS / 0 FAIL | Visiteur public sans session, cache service worker, confidentialité, chiffrement et liaison des sauvegardes à un compte ; tests unitaires/statistiques, sans vraie session. |
| **Total du sous-lot reproductible** | **40** | **40 PASS / 0 FAIL** | Exécution CI, sans compte Auth, sans lecture/écriture de fixture et sans accès Supabase runtime. |

Preuves :
- Jobly CI run 42478108383 : company-logo-fallback 3/3, p2-offer-watermark 3/3, offline-first 10/10 ; typecheck et build également PASS.
- Verify offer pipeline run 42478108380 : groupe external-application-assistant + jia-extension-onboarding PASS 24/24 ; typecheck, build et J’IA Watch également PASS.
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108383
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108380

**Important :** le total 40 additionne les quatre groupes disjoints du tableau, et non les autres suites présentes dans ces workflows. Les deux workflows ont terminé avec la conclusion SUCCESS. Les tests ont été exécutés par GitHub Actions ; aucune exécution CMD locale nouvelle n'est revendiquée.

### 20.3 Revue ciblée de la page publique et de ses routes

Lecture statique des fichiers de la branche :

- app/page.tsx : l'écran initial est welcome. Il charge les compteurs depuis GET /api/public/home-stats. Les appels Auth visibles dans le composant sont cantonnés aux parcours de connexion, d'inscription et de restauration d'un état non public ; l'écran welcome n'a pas besoin d'une session.
- app/api/public/home-stats/route.ts : handler GET qui utilise le client publishable et le RPC d'agrégats get_public_home_stats. Le contrat limite les données exposées aux compteurs agrégés ; aucune opération INSERT/UPDATE/DELETE/UPSERT n'a été relevée dans ce handler.
- app/api/jobs/route.ts : le flux Talent GET /api/jobs reste protégé par getAuthUser et répond 401 sans session. Il ne faut pas le confondre avec un flux d'offres public.
- app/api/jobs/[id]/route.ts : le handler GET de détail effectue des lectures de l'offre et ne présente pas de garde getAuthUser dans son code actuel ; les contrôles statiques du test external-application vérifient notamment la gestion des offres expirées sans mutation de la ligne Job.

Limite : cette relecture de code n'est pas une preuve HTTP de disponibilité réelle, de statut 200/401, de contenu affiché ni de rendu mobile. Aucun appel runtime au projet JOBLY-E2E n'a été lancé.

### 20.4 Commande CMD de reproduction locale du sous-lot 40 tests

La commande ci-dessous exécute uniquement les cinq fichiers du tableau (le groupe externe contient deux fichiers). Elle ne lance ni le runner E2E, ni le navigateur, ni Supabase, ni Auth. Elle ne modifie aucune fixture. Elle produit un seul rapport local :

```bat
cd /d C:\Users\ASUS\Jobly
node --experimental-strip-types --test scripts/company-logo-fallback.test.mjs scripts/p2-jobly-offer-watermark.test.mjs scripts/external-application-assistant.test.mjs scripts/jia-extension-onboarding.test.mjs scripts/offline-first.test.mjs > feedback-lot1-public-static.txt 2>&1
notepad feedback-lot1-public-static.txt
```

Le dernier HEAD local communiqué e92feb8abc1a2491cab7dd81e834080b80982681 contient déjà le code de référence ; les commits distants ultérieurs vérifiés jusqu'au HEAD indiqué en §20.1 ne changent que le document de continuité. Aucun pull n'est nécessaire pour ces fichiers de test.

### 20.5 Statut et étape suivante

- Sous-lot statique public/anonyme : **PASS CI — 40/40**.
- Page d'accueil publique : revue statique du code effectuée ; rendu navigateur réel non exécuté.
- Détail public d'offre : contrats statiques couverts ; aucune réponse HTTP runtime vérifiée.
- Smoke navigateur anonyme complet : **NON EXÉCUTÉ**, car le script actuel peut importer un ancien rapport Auth et le verrou LOT-00 interdit encore les appels runtime JOBLY-E2E.
- LOT-00 : **PARTIAL**.
- Aucun accès JOBLY-PROD, aucune fixture touchée, aucune authentification, aucune écriture, aucun merge ni déploiement.

Après retour éventuel du rapport local, comparer le résultat avec les 40 PASS CI sans additionner les mêmes tests deux fois. Le prochain contrôle navigateur anonyme ne sera engagé qu'après fermeture de LOT-00 et séparation effective des preuves Auth antérieures.

---

## 21. LOT-00 — contrôle OpenAPI en Node.js — V2.13 — 8 novembre 2026

### 21.1 Relecture et limites d’autorisation

Le document maître V2.12 a été relu intégralement avant cette reprise (1 093 lignes). Le contrôle autorisé reste celui du §16.7 : deux requêtes HTTP GET sur `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec les profils `public` puis `net`. Aucun endpoint Auth, RPC métier, SQL, `net.http_*`, mutation ou script de fixtures n’entre dans ce contrôle.

État GitHub revalidé avant cette mise à jour : PR #266 ouverte, en brouillon, non fusionnée ; HEAD `75e802a9e85b3571eecfc44939744ef3a26d07eb`. Aucun merge ni déploiement.

### 21.2 Tentative Node.js dans l’environnement d’exécution de l’agent

- Runtime disponible dans cet environnement : Node.js `v22.16.0` (différent du poste Windows opérateur, Node.js `v26.13.0`).
- Tentative : deux GET séquentiels vers l’URL Data API JOBLY-E2E, en utilisant la clé publishable déjà référencée au §16.7 ; aucun secret `service_role`.
- Résultat : `LOT00_SCHEMA_CHECK_ERROR: fetch failed` avant réception du premier statut HTTP.
- Aucun code HTTP, code PostgREST ou document OpenAPI n’a donc été reçu. Cette erreur ne permet pas de conclure que l’API JOBLY-E2E est indisponible ou que `net` est exposé ; la sortie réseau de cet environnement isolé peut bloquer la requête.
- Aucun appel Auth, aucune requête SQL, aucun RPC métier, aucune écriture, aucune modification de fixture et aucun accès à JOBLY-PROD.

**Classification : BLOCKED_ENVIRONMENT / NON CONCLUANT. LOT-00 reste PARTIAL.** Ne pas compter cette tentative comme PASS ni comme FAIL du service Supabase.

### 21.3 Commande précédente V2.14 — OBSOLÈTE, ne pas relancer

Le poste opérateur est déjà connu : `C:\Users\ASUS\Jobly`, Node.js `v26.13.0`. La commande ci-dessous reste strictement limitée aux GET OpenAPI. Elle contrôle également les conditions attendues et écrit un rapport sans afficher la clé. La clé `sb_publishable_...` est la clé publishable JOBLY-E2E documentée au §16.7, et non une clé privée.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure.txt echo Rapport existant conserve : ne pas l'ecraser ; ouvrir et transmettre le rapport existant.
if not exist feedback-lot00-net-schema-exposure.txt node -e "const run=async()=>{const url='https://ofqqrryamslxoqkklraw.supabase.co';const key='sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y';let failed=false;console.log('node='+process.version);for(const schema of ['public','net']){const r=await fetch(url+'/rest/v1/',{method:'GET',headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let body={};try{body=JSON.parse(raw)}catch{};const out={schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(body.openapi||body.swagger),code:body.code??null,message:body.message??null};console.log(JSON.stringify(out));if(schema==='public'){if(!r.ok||!(body.openapi||body.swagger))failed=true;}else if(r.status!==406||body.code!=='PGRST106')failed=true;}console.log('GATE='+(!failed?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED'));if(failed)process.exitCode=2;};run().catch(e=>{console.error('LOT00_SCHEMA_CHECK_ERROR:'+e.message);process.exitCode=2;});" > feedback-lot00-net-schema-exposure.txt 2>&1
notepad feedback-lot00-net-schema-exposure.txt
```

Le premier `if exist` protège un éventuel rapport précédent : il n’est jamais écrasé. Si le rapport existe déjà, l’ouvrir et transmettre son contenu avant toute nouvelle tentative ; ne pas le supprimer ni le remplacer.

Résultat attendu pour fermer uniquement le point d’exposition `net` :
- Profil `public` : HTTP réussi (`200`), `apiSchemaAccepted=true` et `openapi=true`.
- Profil `net` : HTTP `406`, `apiSchemaAccepted=false`, `code=PGRST106` ; la commande impose les deux conditions, et non seulement un refus quelconque.
- Synthèse : `GATE=PASS_NET_NOT_EXPOSED`.

Tout autre résultat — `fetch failed`, délai dépassé, erreur 401/403, `public` refusé, `net` accepté, code inattendu ou réponse non JSON — reste `BLOCKED_REVIEW_REQUIRED`. Ne pas tenter de corriger les grants ou la configuration à partir de ce seul résultat.

### 21.4 Contrôles LOT-00 qui resteront ouverts après le GET

Même si le contrôle Node.js retourne `PASS_NET_NOT_EXPOSED`, LOT-00 ne sera pas automatiquement PASS. Il restera à obtenir la décision métier explicite sur la visibilité publique de `jobly-events` et `profile-photos`, puis à compléter la matrice ciblée des grants directs, RLS/policies et opérations nécessaires sur les tables, routines et objets Storage effectivement utilisés par les recettes. Aucun droit, bucket, schéma ou policy ne sera modifié dans cette recette.

En attente du rapport Node.js local : LOT-00 **PARTIAL** ; smoke runtime Auth, smoke navigateur JOBLY-E2E et bulk toujours suspendus ; fixtures inchangées ; JOBLY-PROD interdit ; PR #266 en brouillon ; aucun merge ou déploiement.

---

## 22. LOT-00 — correction de l'authentification OpenAPI — V2.15 — 8 novembre 2026

### 22.1 Rapport opérateur reçu

Fichier transmis : `feedback-lot00-net-schema-exposure.txt` ; Node.js `v26.13.0`.

| Profil | HTTP | `apiSchemaAccepted` | `openapi` | Message |
|---|---:|---:|---:|---|
| `public` | 401 | false | false | `Secret API key required` |
| `net` | 401 | false | false | `Secret API key required` |

Synthèse du script : `GATE=BLOCKED_REVIEW_REQUIRED`.

**Diagnostic :** cette racine OpenAPI exige une clé d'administration. La clé publishable était adaptée aux appels ordinaires d'une application cliente, mais pas à la consultation de ce catalogue sur cet endpoint. Les deux 401 sont donc des refus d'accès au document OpenAPI ; ils ne disent rien sur la présence ou l'absence du schéma `net`. Il n'y a aucune preuve que le projet ou la clé publishable soient globalement en panne.

### 22.2 Règles de sécurité du correctif

- Endpoint immuable : `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/` ; aucune URL de production.
- Méthode : GET uniquement ; deux lectures séquentielles avec `Accept-Profile: public`, puis `Accept-Profile: net`.
- Clé admise : clé secrète du projet JOBLY-E2E (`sb_secret_...`) ou ancienne clé `service_role` du même projet. Ne jamais employer `anon`, `sb_publishable_...` ou une clé de JOBLY-PROD.
- La clé est saisie dans la console masquée (aucun écho), utilisée uniquement dans le header `apikey` pour `sb_secret_...`. Pour l'ancienne clé `service_role` JWT, le script ajoute aussi `Authorization: Bearer` afin de conserver le contexte de rôle.
- La clé n'est ni affichée, ni écrite dans un fichier, rapport ou journal ; seul son type est enregistré.
- Une clé `sb_secret_...` / `service_role` contourne RLS. Le code est donc volontairement borné à la racine OpenAPI et n'effectue aucune requête de table, aucun RPC, aucun appel Storage, aucun `net.http_*` et aucune écriture.
- Si aucune clé d'administration JOBLY-E2E n'est disponible, ne pas créer ni faire tourner une clé pour ce test. Signaler `NON_TESTABLE_KEY_UNAVAILABLE` ; ne pas utiliser un secret de production.

Références Supabase consultées le 8 novembre 2026 :
- https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup — la racine OpenAPI `/rest/v1/` est réservée à une clé d'administration ;
- https://supabase.com/docs/guides/getting-started/api-keys — distingue publishable et secret, indique que le secret contourne RLS et doit rester côté serveur ;
- https://supabase.com/docs/guides/self-hosting/self-hosted-envoy — décrit la séparation entre racine OpenAPI et routes Data API.

### 22.3 Commande Node.js locale corrigée — CMD Windows

La commande demande une clé d'administration JOBLY-E2E dans le terminal sans afficher les caractères saisis. Elle n'écrase jamais un rapport précédent : elle crée `feedback-lot00-net-schema-exposure-v2.txt` seulement s'il n'existe pas. Ne pas rediriger la sortie CMD vers un fichier, car la saisie doit rester interactive.

Depuis le Node.js Command Prompt / CMD :

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v2.txt echo Rapport deja present : conservation, aucune nouvelle execution.
if not exist feedback-lot00-net-schema-exposure-v2.txt node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v2.txt';if(fs.existsSync(report)){console.log('REPORT_EXISTS_PRESERVED');process.exit(3)}if(!input.isTTY||typeof input.setRawMode!=='function'){console.log('TTY_REQUIRED');process.exit(2)}let key='';out.write('Cle secrete JOBLY-E2E sb_secret_... ou ancienne service_role, saisie masquee : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');process.exit(2)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');const entered=key.trim();key='';run(entered);return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type='+kind,'results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}let kind='unknown';async function run(k){const rows=[];try{if(k.startsWith('sb_secret_'))kind='sb_secret';else if(k.startsWith('eyJ')){const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role')throw Error('LEGACY_KEY_ROLE_INVALID');kind='legacy_service_role'}else throw Error('KEY_TYPE_INVALID');for(const schema of ['public','net']){const h={apikey:k,Accept:'application/openapi+json','Accept-Profile':schema};if(kind==='legacy_service_role')h.Authorization='Bearer '+k;const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:h,signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net');const pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}
notepad feedback-lot00-net-schema-exposure-v2.txt
```

Le terminal doit afficher la demande de clé sans écho. Entrer la clé `sb_secret_...` du projet `ofqqrryamslxoqkklraw`, ou son ancienne `service_role` si le projet utilise encore cette clé. Ne pas me l'envoyer. Si la saisie masquée n'est pas prise en charge ou si aucune clé E2E n'est disponible, arrêter ; ne pas saisir la clé dans la ligne de commande, ne pas la mettre dans un fichier et ne pas utiliser une clé de production.

### 22.4 Critère du résultat

| Profil | Résultat attendu |
|---|---|
| `public` | HTTP 200 et document OpenAPI (`openapi=true`) |
| `net` | HTTP 406 et code PostgREST `PGRST106` |
| Synthèse | `GATE=PASS_NET_NOT_EXPOSED` |

Tout autre résultat reste `BLOCKED_REVIEW_REQUIRED`. HTTP 401 avec clé `sb_secret` signifie clé incorrecte, désactivée ou appartenant à un autre projet ; HTTP 200 sur `net` signifie que le schéma est exposé et exige une revue de sécurité. Aucune correction de grants ou Data API settings automatique.

### 22.5 Statut de reprise

- Résultat précédent avec publishable : **401 / NON CONCLUANT** pour `public` et `net`.
- Contrôle OpenAPI corrigé avec clé d'administration locale : **à exécuter**.
- LOT-00 : **PARTIAL**.
- Décision sur les buckets publics et matrice grants/RLS/policies ciblée : toujours en attente.
- Smoke runtime Auth / navigateur JOBLY-E2E / bulk 11 lots : **suspendus**.
- Fixtures : inchangées ; aucun Auth, aucune écriture ; JOBLY-PROD interdit.
- PR #266 : ouverte, brouillon, non fusionnée ; `main` inchangée ; aucun déploiement.
