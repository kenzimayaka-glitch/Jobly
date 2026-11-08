# Jobly — Référence de continuité de la recette E2E

> ## ÉTAT MAÎTRE ACTUALISÉ — V2.36 — 8 novembre 2026
>
> **Dernier code E2E-001 commité :** `8385b60400bbaf9cedfcb4aa01073b733533f6c2` sur `e2e/recette`.
> **`main` :** inchangée dans le cadre de cette correction. **PR #266 :** reste ouverte, brouillon et non fusionnée.
> **Environnement :** JOBLY-E2E uniquement. Aucun test runtime ni accès JOBLY-PROD n'a été effectué pendant la correction distante.
>
> **Important — instructions historiques neutralisées :** les instructions plus anciennes de ce document qui autorisaient ou demandaient une réinitialisation des mots de passe, une recréation de fixtures ou l'exécution de `e2e/reset-existing-fixture-passwords.mjs` sont obsolètes et ne doivent pas être suivies. Le script local `e2e/reset-existing-fixture-passwords.mjs` reste à préserver et ne doit pas être exécuté. Aucune fixture partagée ne doit être modifiée sans nouvelle autorisation explicite et spécifique.
>
> **Nouvelle méthode de continuité :** ce fichier Markdown dans Git est la seule référence maître. Chaque nouvelle conversation Jobly doit le lire intégralement avant d'agir. Après chaque réponse consacrée à la recette E2E, l'assistant met à jour ce fichier dans la même séquence de travail, sur `e2e/recette`, puis fournit le commit GitHub vérifiable et le chemin du fichier. Chaque entrée distingue les faits établis, leur preuve, les actions non exécutées et les blocages ; aucun résultat non testé ne peut être présenté comme PASS. Ne pas passer par la Bibliothèque/Word pour cette continuité.
>
> **Verrou de reprise V2.8 :** les sections 7, 9, 10, 11, 12 et 13.7 contiennent des états ou consignes historiques ; elles ne constituent plus des instructions opératoires. En particulier, l'autorisation de reset citée au §9 n'est plus active : ne pas exécuter e2e/reset-existing-fixture-passwords.mjs, les scripts de vérification Auth des anciennes fixtures, le provisionneur, ni scripts/e2e-local-recipe.mjs/le runner bulk. Aucune connexion Auth, mutation de fixture, restauration de mot de passe ou relance globale n'est autorisée par ce document. Le seul prochain contrôle permis est le GET OpenAPI décrit au §16.7, suivi de son analyse.
>
> **État E2E-001 : PASS STATIQUE LOCAL — 6/6 tests, 0 échec** (résultat opérateur reçu le 8 novembre 2026 ; détail au §15). Le correctif Talent est présent dans le code de la branche et le test statique a réussi sur le poste local. **LOT-00 reste PARTIAL / BLOCKED_REVIEW_REQUIRED** : le rapport V6 s'est arrêté avant toute requête HTTP (`KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]`). L'opérateur confirme que la ligne Legacy `service_role` sélectionnée commence bien par `eyJ`. L'audit du code V6 montre un défaut possible dans le traitement des marqueurs de collage du terminal : le caractère ESC peut être filtré alors que le suffixe imprimable `[200~` est conservé, ce qui reproduit exactement le rejet. La V7 au §40 corrige ce parseur et journalise uniquement des indicateurs non secrets. La V7 n'a pas encore été exécutée ; aucun GET OpenAPI n'a donc été obtenu et l'exposition de `net` reste indéterminée. L'intention des deux buckets publics doit être confirmée et la revue ciblée des grants/policies documentée. Aucun smoke runtime ni bulk n'est autorisé à ce stade.
> **LOT-00 — état clé OpenAPI :** les GET avec clé publishable ont retourné HTTP 401 `Secret API key required`. Le rejet V6 est intervenu avant HTTP et ne démontre pas que la clé Supabase est refusée. L'opérateur a confirmé la ligne Legacy `service_role` et le préfixe `eyJ`. Ne pas utiliser `anon`, `sb_secret_…` ou une clé de production. La V5 et la V6 sont conservées pour historique ; la V7 corrigée du §40 est la prochaine commande de retest. Aucun secret dans le chat, les rapports ou Git.

**Version :** 2.36  
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

La dernière vérification requise est le contrôle GET du catalogue OpenAPI PostgREST avec les profils public puis net via la clé legacy `service_role` du projet E2E, saisie masquée et prévalidée par le script du §23.3. Le rapport doit confirmer si net fait partie des schémas exposés, sans appeler aucune fonction net.http_*.

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
- LOT-00 : **PARTIAL — les GET avec la clé publishable ont été rejetés en 401 ; la tentative `sb_secret_…` est signalée rejetée ; l'opérateur voit les entrées `anon` public et `service_role` secret. La seule procédure restante est le test legacy `service_role` masqué du §23.3 ; décision Storage et matrice grants/policies toujours en attente**.
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

**Action autorisée maintenant :** si la clé affichée dans la ligne `service_role` sous **Legacy API Keys** commence bien par `eyJ`, exécuter exclusivement le contrôle GET OpenAPI du §23.3, puis transmettre uniquement le rapport non sensible `feedback-lot00-net-schema-exposure-v3.txt`. Ne jamais utiliser la clé `anon`.

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

Le document maître V2.12 a été relu intégralement avant cette reprise (1 093 lignes). Le contrôle autorisé reste limité à deux requêtes HTTP GET sur `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec les profils `public` puis `net`. Après le 401 provoqué par la clé publishable, la méthode correcte est celle du §22.3. Aucun endpoint Auth, RPC métier, SQL, `net.http_*`, mutation ou script de fixtures n’entre dans ce contrôle.

État GitHub revalidé avant cette mise à jour : PR #266 ouverte, en brouillon, non fusionnée ; HEAD `75e802a9e85b3571eecfc44939744ef3a26d07eb`. Aucun merge ni déploiement.

### 21.2 Tentative Node.js dans l’environnement d’exécution de l’agent

- Runtime disponible dans cet environnement : Node.js `v22.16.0` (différent du poste Windows opérateur, Node.js `v26.13.0`).
- Tentative : deux GET séquentiels vers l’URL Data API JOBLY-E2E, en utilisant la clé publishable déjà référencée au §16.7 ; aucun secret `service_role`.
- Résultat : `LOT00_SCHEMA_CHECK_ERROR: fetch failed` avant réception du premier statut HTTP.
- Aucun code HTTP, code PostgREST ou document OpenAPI n’a donc été reçu. Cette erreur ne permet pas de conclure que l’API JOBLY-E2E est indisponible ou que `net` est exposé ; la sortie réseau de cet environnement isolé peut bloquer la requête.
- Aucun appel Auth, aucune requête SQL, aucun RPC métier, aucune écriture, aucune modification de fixture et aucun accès à JOBLY-PROD.

**Classification : BLOCKED_ENVIRONMENT / NON CONCLUANT. LOT-00 reste PARTIAL.** Ne pas compter cette tentative comme PASS ni comme FAIL du service Supabase.

### 21.3 Procédure précédente V2.14 — retirée du protocole actif

La commande utilisant la clé publishable a été conservée dans l'historique Git mais supprimée de cette section opérationnelle après le retour HTTP 401 `Secret API key required`. Ne pas la recopier ni la relancer. La procédure valide à présent est celle du §22.3, avec clé d'administration JOBLY-E2E saisie masquée et GET limité à la racine OpenAPI.

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
- Cette description appartient à la tentative V2.15, désormais historique. Pour la clé legacy `service_role`, appliquer exclusivement le comportement vérifié du §23.3 : header `apikey` seul, sans `Authorization: Bearer`.
- La clé n'est ni affichée, ni écrite dans un fichier, rapport ou journal ; seul son type est enregistré.
- Une clé `sb_secret_...` / `service_role` contourne RLS. Le code est donc volontairement borné à la racine OpenAPI et n'effectue aucune requête de table, aucun RPC, aucun appel Storage, aucun `net.http_*` et aucune écriture.
- Si aucune clé d'administration JOBLY-E2E n'est disponible, ne pas créer ni faire tourner une clé pour ce test. Signaler `NON_TESTABLE_KEY_UNAVAILABLE` ; ne pas utiliser un secret de production.

Références Supabase consultées le 8 novembre 2026 :
- https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup — la racine OpenAPI `/rest/v1/` est réservée à une clé d'administration ;
- https://supabase.com/docs/guides/getting-started/api-keys — distingue publishable et secret, indique que le secret contourne RLS et doit rester côté serveur ;
- https://supabase.com/docs/guides/self-hosting/self-hosted-envoy — décrit la séparation entre racine OpenAPI et routes Data API.

### 22.3 Procédure V2.15 — historique retiré du protocole actif

L'ancienne commande de cette section est retirée du protocole actif pour éviter toute confusion entre les clés `sb_secret_…` et `service_role` JWT. Ne pas l'exécuter ni la recopier. Le seul test actif est la procédure Node.js legacy `service_role` du §23.3 : elle accepte uniquement un JWT commençant par `eyJ`, vérifie que son payload contient le rôle `service_role` et le projet `ofqqrryamslxoqkklraw`, puis envoie uniquement le header `apikey`.

### 22.4 Critère du résultat

| Profil | Résultat attendu |
|---|---|
| `public` | HTTP 200 et document OpenAPI (`openapi=true`) |
| `net` | HTTP 406 et code PostgREST `PGRST106` |
| Synthèse | `GATE=PASS_NET_NOT_EXPOSED` |

Tout autre résultat reste `BLOCKED_REVIEW_REQUIRED`. HTTP 401 avec clé `sb_secret` signifie clé incorrecte, désactivée ou appartenant à un autre projet ; HTTP 200 sur `net` signifie que le schéma est exposé et exige une revue de sécurité. Aucune correction de grants ou Data API settings automatique.

### 22.5 Statut de reprise

- Résultat précédent avec publishable : **401 / NON CONCLUANT** pour `public` et `net`.
- Clé moderne `sb_secret_…` : **signalée rejetée par l'opérateur ; code HTTP et message exacts non encore documentés**.
- Repli legacy `service_role` : **à vérifier dans Legacy API Keys, puis à tester uniquement si active**.
- LOT-00 : **PARTIAL**.
- Décision sur les buckets publics et matrice grants/RLS/policies ciblée : toujours en attente.
- Smoke runtime Auth / navigateur JOBLY-E2E / bulk 11 lots : **suspendus**.
- Fixtures : inchangées ; aucun Auth, aucune écriture ; JOBLY-PROD interdit.
- PR #266 : ouverte, brouillon, non fusionnée ; `main` inchangée ; aucun déploiement.

---

## 23. LOT-00 — repli sur la clé legacy service_role — V2.16 — 8 novembre 2026

### 23.1 Fait nouveau et limites

L'opérateur indique voir dans le Dashboard les entrées `anon` public et `service_role` secret. Il s'agit des noms legacy si elles apparaissent sous **Legacy API Keys** ; la valeur `service_role` doit alors être un JWT commençant par `eyJ`. L'opérateur avait auparavant signalé le rejet de la clé moderne `sb_secret_…`, sans transmettre le statut HTTP ou le message exact. La présence visuelle de la ligne `service_role` ne confirme pas à elle seule son activation ; le script validera son rôle/projet avant tout appel, puis la réponse API indiquera si elle est acceptée.

Contrôle Supabase Management API effectué en lecture seule : le projet `ofqqrryamslxoqkklraw` correspond bien à `JOBLY-E2E` et son état est `ACTIVE_HEALTHY`. Les clés publiques du projet sont enregistrées ; l'outil de gestion disponible ne permet pas de récupérer ni de vérifier la valeur ou l'état de la clé secrète.

### 23.2 Clé de repli à vérifier dans le Dashboard

URL directe : https://supabase.com/dashboard/project/ofqqrryamslxoqkklraw/settings/api-keys

Dans **Legacy API Keys**, l'opérateur confirme maintenant voir les deux entrées `anon` public et `service_role` secret. Repérer la ligne `service_role` et vérifier son état sans partager la valeur :
- si `service_role` est **active** et que sa valeur commence par `eyJ`, elle peut être utilisée pour le contrôle OpenAPI limité au GET de métadonnées ;
- si `service_role` est absente ou désactivée, ne pas la réactiver, ne pas la régénérer et ne pas créer une autre clé pour ce diagnostic ; retourner `LEGACY_SERVICE_ROLE_UNAVAILABLE`.

Supabase indique que les clés legacy `anon` et `service_role` continuent de fonctionner en parallèle des nouvelles clés tant qu'elles ne sont pas explicitement désactivées. La racine OpenAPI accepte une clé d'administration ; son exemple legacy place `service_role` uniquement dans le header `apikey`.

Références :
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup

### 23.3 Contrôle Node.js — legacy service_role uniquement

À exécuter uniquement après avoir confirmé dans le Dashboard que la clé `service_role` de JOBLY-E2E est active. La saisie est masquée, la clé n'est ni affichée ni sauvegardée, et un rapport neuf `feedback-lot00-net-schema-exposure-v3.txt` est créé sans écraser un rapport existant. Le script envoie `apikey` seulement, sans `Authorization: Bearer`, et n'exécute que deux GET OpenAPI sur le projet E2E.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v3.txt echo Rapport deja present : conservation, aucune nouvelle execution.
if not exist feedback-lot00-net-schema-exposure-v3.txt node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v3.txt';if(fs.existsSync(report)){console.log('REPORT_EXISTS_PRESERVED');process.exit(3)}if(!input.isTTY||typeof input.setRawMode!=='function'){console.log('TTY_REQUIRED');process.exit(2)}let key='';out.write('Ancienne cle service_role JOBLY-E2E (masquee) : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');process.exit(2)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');const k=key.trim();key='';run(k);return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net');const pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}
notepad feedback-lot00-net-schema-exposure-v3.txt
```

**Résultat attendu :** `public` = HTTP 200 avec document OpenAPI ; `net` = HTTP 406 et code `PGRST106` ; synthèse `PASS_NET_NOT_EXPOSED`. Tout autre résultat reste BLOCKED. Ne jamais envoyer la clé dans le chat ni mettre son contenu dans le rapport.

### 23.4 Si la legacy service_role est également rejetée

Ne pas effectuer un troisième essai avec une autre clé. Transmettre uniquement le rapport non sensible `feedback-lot00-net-schema-exposure-v3.txt` et préciser si la ligne `service_role` est active ou désactivée (sans valeur). Si elle est active et que l'API la refuse, le résultat sera examiné comme un problème de configuration/validation des clés Data API ; aucune modification du projet ne sera faite automatiquement.

### 23.5 Statut de continuité

- Projet `JOBLY-E2E` : `ACTIVE_HEALTHY` confirmé par Supabase Management API.
- Clé publishable : refusée sur la racine OpenAPI (401 attendu pour ce type de clé).
- Clé moderne `sb_secret_…` : rejet signalé par l'opérateur ; preuve HTTP exacte non fournie.
- Ancienne `service_role` : entrée visible dans le Dashboard selon l'opérateur ; confirmer son activation et utiliser seulement le JWT `eyJ…` prévalidé par le §23.3 ; ne pas réactiver/régénérer.
- LOT-00 : **PARTIAL** ; aucune preuve d'exposition ou de non-exposition de `net` obtenue.
- Buckets publics et matrice ciblée grants/RLS/policies : toujours à compléter.
- Aucun smoke runtime/Auth, aucun bulk, aucune fixture modifiée, aucun accès JOBLY-PROD, aucun merge/déploiement.
---

## 24. Gouvernance de continuité et clarification LOT-00 — V2.19 — 8 novembre 2026

### 24.1 Directive de mise à jour systématique

L'opérateur demande que l'assistant mette lui-même à jour le présent document à chaque réponse dans le chantier de recette E2E, avec des preuves.

Règle opérationnelle :
- Chaque réponse consacrée à ce chantier donne lieu, dans le même tour, à une mise à jour du document sur la branche `e2e/recette`.
- La mise à jour consigne uniquement les nouveaux faits réellement établis, les décisions, les commandes ou vérifications demandées, les résultats effectivement reçus, les limites et les blocages.
- Chaque résultat doit être accompagné de sa preuve traçable (rapport, exécution CI, fichier, commit, réponse HTTP ou source exacte). Une action non réalisée est explicitement marquée comme non réalisée.
- En l'absence de nouvelle preuve technique, l'entrée précise qu'aucun nouveau test ni appel runtime n'a été effectué ; elle ne change pas artificiellement les statuts des lots.
- Chaque réponse fournit comme preuve de mise à jour le SHA du commit GitHub, la branche et le chemin exact du document.
- Cette obligation ne lève aucun garde-fou : aucune fixture, donnée, clé, politique, production, fusion ni déploiement ne peut être touché sans l'autorisation spécifique déjà exigée.

### 24.2 État du document et de la PR revalidé avant cette mise à jour

Lecture intégrale du fichier distant sur `e2e/recette` avant écriture :
- Chemin : `docs/e2e/CONTINUITE-RECETTE-E2E.md`.
- État source : version V2.18, 1 232 lignes, 102 869 caractères.
- Blob SHA source : `9d802c1ec8b707067c39019c3b331e674c8cd8a1`.
- PR #266 : ouverte, brouillon, non fusionnée ; base `main`, branche source `e2e/recette`.
- HEAD de la PR vérifié : `0aa7970255ffda89fd71412e68f5a1c82f4e126d`.
- Source de vérification PR : https://github.com/kenzimayaka-glitch/Jobly/pull/266
- Source du document : https://github.com/kenzimayaka-glitch/Jobly/blob/e2e/recette/docs/e2e/CONTINUITE-RECETTE-E2E.md

### 24.3 Réponse reçue sur l'emplacement de la clé legacy

La question posée était de choisir explicitement entre :
- **Legacy API Keys** : ligne `service_role` legacy, valeur JWT attendue commençant par `eyJ` ;
- **Secret keys** : clé moderne commençant par `sb_secret_`.

La réponse opérateur reçue est uniquement « Oui ». Elle ne sélectionne aucun des deux onglets. Elle ne constitue donc pas une preuve que la ligne `service_role` est dans **Legacy API Keys**, ni que son état est actif.

**Blocage inchangé :** demander uniquement le nom de l'onglet où apparaît la ligne, sans jamais demander ni accepter la valeur de la clé. Tant que l'onglet n'est pas identifié, ne pas lancer le script §23.3 et ne faire aucun appel HTTP supplémentaire avec une clé.

### 24.4 Effet de ce tour sur les validations

- LOT-00 : **PARTIAL**, sans changement.
- Contrôle OpenAPI `public`/`net` avec la clé legacy : **NON EXÉCUTÉ** dans ce tour.
- Aucun secret saisi, lu, transmis ou utilisé.
- Aucun appel HTTP Supabase, Auth, SQL, RPC ou Storage effectué dans ce tour.
- Aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Aucun test runtime, browser smoke ou bulk exécuté.
- Aucun changement de code applicatif ; seule cette documentation de continuité est mise à jour.
- `main` non modifiée ; PR #266 reste ouverte en brouillon ; aucun merge ni déploiement.
---

## 25. Confirmation de l'onglet Legacy API Keys — V2.20 — 8 novembre 2026

### 25.1 Nouvelle confirmation opérateur

L'opérateur confirme explicitement que la ligne `service_role` apparaît dans l'onglet **Legacy API Keys** du Dashboard Supabase JOBLY-E2E.

Cette réponse confirme l'emplacement legacy, mais ne confirme pas encore :
- que la ligne est active ;
- que la valeur commence par `eyJ` (format JWT attendu par le script §23.3).

Aucune valeur de clé n'a été demandée ni communiquée.

### 25.2 Prochaine vérification autorisée

Demander à l'opérateur de vérifier uniquement dans le Dashboard, sans copier la clé :
- état affiché de la ligne `service_role` : active ;
- premiers caractères de format : `eyJ`.

Si les deux conditions sont confirmées, utiliser exclusivement la commande exacte du §23.3, dans le CMD local, avec saisie masquée. Immédiatement après la commande d'exécution, conserver la commande `notepad feedback-lot00-net-schema-exposure-v3.txt` pour ouvrir le rapport. Ne pas exécuter si la clé est inactive, absente ou ne commence pas par `eyJ` ; ne pas réactiver, régénérer ou créer une clé.

### 25.3 Effet sur les validations et périmètre

- Emplacement de la clé : **CONFIRMÉ — Legacy API Keys** (déclaration explicite de l'opérateur).
- État actif : **À CONFIRMER**.
- Format JWT `eyJ` : **À CONFIRMER**.
- GET OpenAPI `public` puis `net` : **NON EXÉCUTÉ** à ce tour.
- LOT-00 : **PARTIAL**, sans changement de statut.
- Aucun secret saisi, lu, transmis ou stocké ; aucun appel HTTP Supabase/Auth/SQL/RPC/Storage dans ce tour.
- Aucune fixture, donnée, permission ou configuration Supabase modifiée ; aucun test runtime/browser/bulk exécuté.
- `main` inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun merge ni déploiement.

### 25.4 Preuves de référence

- Réponse opérateur dans la conversation : « legacy api keys ».
- Document source relu avant écriture : V2.19, blob SHA `2c342894d059f29615dd49e42c628560d3cb7a16`.
- PR #266 relue avant écriture : ouverte, brouillon, non fusionnée ; HEAD `9803dcb0a8281a799366b915d8a0430c3c7ea686`, base `main`.
- Dashboard à consulter : https://supabase.com/dashboard/project/ofqqrryamslxoqkklraw/settings/api-keys
- Aucun statut de clé ni valeur secrète n'a été inspecté par l'assistant.
---

## 26. Résultat de contrôle `KEY_TYPE_INVALID` — V2.21 — 8 novembre 2026

### 26.1 Rapport opérateur reçu

L'opérateur a transmis le résultat non sensible suivant :

```text
node=v26.13.0
project_ref=ofqqrryamslxoqkklraw
credential_type=unknown
results=[]
GATE=BLOCKED_REVIEW_REQUIRED
error=Error: KEY_TYPE_INVALID
```

### 26.2 Comparaison avec la procédure de référence §23.3

Ce résultat ne correspond pas à la commande exacte conservée au §23.3 :
- le §23.3 écrit la valeur fixe `credential_type=legacy_service_role` dans tout rapport qu'il génère ; il ne peut donc pas produire `credential_type=unknown` ;
- pour un format ne commençant pas par `eyJ`, il émet `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, et non `KEY_TYPE_INVALID` ;
- si le payload JWT ne confirme pas le rôle `service_role` et le projet `ofqqrryamslxoqkklraw`, il émet `KEY_PROJECT_OR_ROLE_MISMATCH`.

**Conclusion limitée :** le rapport transmis provient d'une commande, d'un script ou d'une version différente de la procédure documentée au §23.3, ou a été transformé avant transmission. La commande effectivement lancée n'est pas encore identifiée. `results=[]` signifie que le rapport ne contient aucune réponse HTTP exploitable pour les profils `public` et `net` ; il ne démontre ni l'acceptation ni le refus de la clé par PostgREST et ne permet aucune conclusion sur l'exposition du schéma `net`.

### 26.3 Décision de sécurité et prochaine vérification

- Aucun nouvel essai de clé ne doit être lancé à ce stade.
- Ne pas essayer une clé `anon`, une clé `sb_secret_…`, une clé JOBLY-PROD, une autre clé ou un autre endpoint.
- Ne pas activer, réactiver, régénérer ou créer une clé.
- Ne pas demander ni transmettre la valeur de la clé.
- Identifier d'abord la commande exacte exécutée et son origine : demander à l'opérateur de copier uniquement la ligne CMD ou le nom/chemin du script utilisé, en excluant toute valeur secrète. Comparer ensuite cette commande à la commande de référence §23.3 avant de décider de la suite.
- Même si la ligne `service_role` se trouve dans **Legacy API Keys**, son état **Active** et le format JWT `eyJ…` ne sont pas encore confirmés par une preuve distincte dans la conversation.

### 26.4 Effet sur les gates et périmètre

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**, inchangé.
- Contrôle OpenAPI `public` : **AUCUN STATUT HTTP EXPLOITABLE** dans le rapport reçu.
- Contrôle OpenAPI `net` : **AUCUN STATUT HTTP EXPLOITABLE** dans le rapport reçu.
- Exposition du schéma PostgreSQL `net` : **NON DÉTERMINÉE**.
- Aucune preuve que la clé fournie soit active, legacy JWT, rattachée au rôle attendu ou acceptée par l'API.
- Aucun smoke runtime Auth/Talent/Recruteur, aucun navigateur, aucun parcours croisé et aucun bulk ne sont autorisés avant fermeture de LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission, configuration Supabase ou code applicatif modifié dans ce tour.
- `main` non modifiée ; PR #266 reste ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 26.5 Sources et preuves

- Rapport opérateur reçu dans la conversation : bloc de sortie reproduit au §26.1.
- Procédure de référence comparée : §23.3 de ce document.
- Document source avant cette mise à jour : blob SHA `228ad6ca36df76e928435a99fe51c758064a6192` sur `e2e/recette`.
- PR #266 vérifiée avant cette mise à jour : state `open`, draft `true`, merged `false`, HEAD `d74b6d2a61f9a7cb6baab67adc2726b81a19dc39`, base `main`.
- Aucune valeur de clé n'a été reçue, lue ou enregistrée.
---

## 27. Retransmission contrôlée de la commande LOT-00 — V2.22 — 8 novembre 2026

### 27.1 Demande opérateur et décision

Après le rapport `KEY_TYPE_INVALID` (§26), l'opérateur demande explicitement la retransmission de la commande LOT-00 pour la réessayer.

La commande de référence reste celle du §23.3. Une copie strictement identique de la logique est retransmise avec un nouveau nom de rapport `feedback-lot00-net-schema-exposure-v4.txt` afin de préserver le rapport `v3` et toute sortie antérieure. Le contrôle reste limité au JWT legacy JOBLY-E2E prévalidé et à deux requêtes GET OpenAPI, schémas `public` puis `net`, sur l'URL `/rest/v1/` du projet `ofqqrryamslxoqkklraw`.

### 27.2 Précondition obligatoire

Avant exécution, l'opérateur doit vérifier dans le Dashboard que la ligne `service_role` sous **Legacy API Keys** est marquée **Active** et que son format de valeur commence par `eyJ`. Ne jamais transmettre la valeur. Si l'une des deux conditions manque, ne pas exécuter ; ne pas réactiver, recréer ou régénérer de clé.

Le script contrôle en plus localement le préfixe JWT, le claim `role=service_role` et le claim `ref=ofqqrryamslxoqkklraw`. En cas d'échec de ces validations, aucune requête HTTP n'est envoyée. En cas de validation réussie, seules deux requêtes GET à la racine OpenAPI sont faites, avec le header `apikey` uniquement ; aucun Authorization Bearer, table, RPC, Storage, `net.http_*` ou écriture.

### 27.3 Commande CMD retransmise

Le bloc CMD complet transmis à l'opérateur utilise le rapport `feedback-lot00-net-schema-exposure-v4.txt`, ouvre ce rapport avec Notepad immédiatement après l'exécution et refuse d'écraser un rapport v4 déjà présent.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v4.txt echo Rapport v4 deja present : conservation, aucune nouvelle execution.
if not exist feedback-lot00-net-schema-exposure-v4.txt node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v4.txt';if(fs.existsSync(report)){console.log('REPORT_EXISTS_PRESERVED');process.exit(3)}if(!input.isTTY||typeof input.setRawMode!=='function'){console.log('TTY_REQUIRED');process.exit(2)}let key='';out.write('Ancienne cle service_role JOBLY-E2E (masquee) : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');process.exit(2)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');const k=key.trim();key='';run(k);return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net');const pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}
notepad feedback-lot00-net-schema-exposure-v4.txt
```

### 27.4 Interprétation du résultat

- `public` : HTTP 200 avec document OpenAPI attendu.
- `net` : HTTP 406 et code PostgREST `PGRST106`.
- Seule la combinaison des deux donne `GATE=PASS_NET_NOT_EXPOSED` pour le sous-contrôle d'exposition du schéma.
- Tout autre résultat reste `BLOCKED_REVIEW_REQUIRED` ; ne pas changer les grants, schémas, rôles, policies ou configuration à partir de ce seul résultat.
- Si `feedback-lot00-net-schema-exposure-v4.txt` existe déjà, la commande le préserve et n'exécute pas un second run avec ce nom. Ne pas supprimer ni écraser un rapport existant.

### 27.5 État à cet instant

- Rapport précédent : `credential_type=unknown`, `results=[]`, `GATE=BLOCKED_REVIEW_REQUIRED`, `KEY_TYPE_INVALID` (§26.1). Il ne contient aucun statut HTTP.
- Commande exacte qui a produit le précédent rapport : **NON IDENTIFIÉE**.
- Emplacement `service_role` : confirmé par l'opérateur sous Legacy API Keys.
- État Active et préfixe `eyJ` : **non confirmés à ce jour dans la conversation** ; préconditions à vérifier avant utilisation.
- Commande V4 : **retransmise, non exécutée par l'assistant** ; aucun résultat de test n'est encore revendiqué.
- LOT-00 : **PARTIAL** ; exposition `net` indéterminée.
- Smoke runtime, navigateur, parcours croisé et bulk : suspendus jusqu'à fermeture LOT-00.
- Aucun appel HTTP Supabase, Auth, SQL, RPC ou Storage dans cette mise à jour ; aucune fixture, donnée, permission ou configuration modifiée ; JOBLY-PROD interdit.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 27.6 Preuves GitHub et sources

- Source documentaire relue avant édition : V2.21, blob SHA `e8a2e7212ea2b04e85bd8fa7f9660b4e193f1399`.
- PR #266 relue avant édition : state `open`, draft `true`, merged `false`, HEAD `77919abb0e63e91de3da9a1119bf9921d449781d`, base `main`.
- Procédure logique de référence : §23.3 du présent document.
- Nouveau nom de rapport local réservé : `feedback-lot00-net-schema-exposure-v4.txt`.
---

## 28. Retour opérateur après commande LOT-00 V4 — V2.23 — 8 novembre 2026

### 28.1 Résultat communiqué

Après retransmission de la procédure CMD du §27.3, l'opérateur communique uniquement :

```text
GATE=BLOCKED_REVIEW_REQUIRED
```

Ce retour confirme que le gate n'a pas atteint son critère PASS. Il ne constitue toutefois pas le rapport complet `feedback-lot00-net-schema-exposure-v4.txt` et ne fournit ni `credential_type`, ni contenu de `results`, ni détail `error`, ni statut HTTP par profil.

### 28.2 Conclusion permise et limites

- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Il est impossible de déterminer si le script s'est arrêté avant les requêtes (format/claims de clé ou TTY), si la requête `public` a échoué, si la requête `net` a échoué, ou si la réponse a été différente du critère attendu.
- Aucun statut HTTP pour `public` ou `net` n'est attesté dans ce retour.
- L'exposition du schéma PostgreSQL `net` reste **NON DÉTERMINÉE**.
- Ne pas conclure que la clé est invalide, désactivée, acceptée ou rejetée sur la seule base du gate global.

### 28.3 Prochaine information nécessaire

Demander le contenu non secret du rapport V4, ou à défaut les seules lignes suivantes copiées telles quelles : `credential_type=...`, `results=...`, `error=...` si présente, et `GATE=...`. Si `results` contient des réponses HTTP, conserver pour chaque profil `schema`, `status`, `code` et `message`. Ne jamais communiquer la valeur de clé, un header `apikey`, un token ou un contenu d'environnement.

Aucune nouvelle tentative de clé ni nouvelle requête n'est demandée avant lecture de ces détails. Ne pas supprimer ni écraser le rapport V4. La commande exacte est conservée au §27.3 ; si le résultat provient d'une autre commande ou d'un autre fichier, préciser son nom sans joindre de secret.

### 28.4 Effet sur le périmètre E2E

- Le contrôle `public` : **NON QUALIFIÉ — absence de détail HTTP**.
- Le contrôle `net` : **NON QUALIFIÉ — absence de détail HTTP**.
- Le gate OpenAPI : **BLOCKED_REVIEW_REQUIRED** selon le message opérateur.
- Aucun smoke runtime Auth/Talent/Recruteur, aucun navigateur, aucun parcours croisé et aucun bulk ne sont autorisés avant fermeture de LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission, configuration Supabase ou code applicatif modifié dans ce tour.
- Aucune requête HTTP Supabase n'a été effectuée par l'assistant ; le résultat est une déclaration opérateur, non une observation directe.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 28.5 Preuves de référence

- Retour opérateur reçu dans la conversation : `GATE=BLOCKED_REVIEW_REQUIRED`.
- Procédure V4 précédemment transmise : §27.3 ; rapport attendu : `feedback-lot00-net-schema-exposure-v4.txt`.
- Document V2.22 relu avant cette mise à jour : blob SHA `76d8a7e8994b7263b71a42531bf5031ce7df977a` ; branche `e2e/recette`.
- Aucune preuve HTTP ni détail diagnostique supplémentaire reçu à ce stade.
---

## 29. Commande V4 sans demande de clé — diagnostic d'exécution — V2.24 — 8 novembre 2026

### 29.1 Retour opérateur

L'opérateur précise que, lors de l'utilisation de la commande LOT-00 V4 (§27.3), le terminal ne lui a pas demandé de saisir la clé `service_role`.

Le seul retour de gate communiqué précédemment est `GATE=BLOCKED_REVIEW_REQUIRED` (§28.1). Le contenu complet du rapport V4 et les lignes CMD affichées avant l'ouverture de Notepad ne sont pas disponibles.

### 29.2 Causes possibles dans le bloc CMD, sans diagnostic définitif

Le comportement dépend de deux gardes explicites du bloc :
- Si `feedback-lot00-net-schema-exposure-v4.txt` existe déjà, `if exist` affiche le message de conservation puis `if not exist` saute entièrement `node -e` : aucune invite de clé n'apparaît et Notepad ouvre le rapport déjà présent.
- Si le processus Node.js n'a pas un terminal TTY avec `setRawMode`, le script affiche `TTY_REQUIRED` et quitte avant l'invite de saisie.
- Si le bloc n'a pas été exécuté intégralement dans CMD (copie partielle, condition non atteinte ou autre commande), aucune conclusion ne peut être tirée sans la sortie console.

Ces causes sont des possibilités déduites du code de la commande, pas des faits constatés. Le message `GATE=BLOCKED_REVIEW_REQUIRED` à lui seul ne permet pas de savoir laquelle s'est produite.

### 29.3 Prochaine vérification — sans nouvelle tentative

Ne pas relancer le script et ne pas ressaisir de clé pour l'instant. Demander uniquement à l'opérateur de recopier les lignes visibles dans la fenêtre CMD **avant l'ouverture de Notepad**. Les indices à rechercher sont :
- `Rapport v4 deja present : conservation, aucune nouvelle execution.`
- `TTY_REQUIRED`.
- `REPORT=feedback-lot00-net-schema-exposure-v4.txt` et le résumé `GATE=...` émis par le script.

Le nom du fichier ouvert par Notepad peut aussi être confirmé sans partager son contenu secret. Ne jamais transmettre de clé, en-tête `apikey`, variable d'environnement ou jeton. Si le rapport V4 existe, le conserver sans le supprimer ni l'écraser.

### 29.4 Statut et périmètre

- Exécution effective du `node -e` V4 : **NON CONFIRMÉE**.
- Invite masquée : **NON AFFICHÉE selon le retour opérateur**.
- Cause de l'absence d'invite : **À DÉTERMINER**.
- Statut HTTP `public` et `net` : **NON DISPONIBLE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; exposition de `net` **NON DÉTERMINÉE**.
- Aucun nouveau test, appel HTTP, appel Auth, SQL, RPC ou Storage exécuté par l'assistant ; aucune fixture, donnée, permission ou configuration modifiée.
- Aucun smoke runtime, navigateur, parcours croisé ou bulk ; JOBLY-PROD interdit.
- `main` inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun déploiement.

### 29.5 Preuves

- Déclaration opérateur dans la conversation : « Il ne m'as pas demandé la clé ».
- Commande analysée : §27.3, avec protections `if exist` / `if not exist` et contrôle `input.isTTY` / `setRawMode`.
- Document source avant cette mise à jour : blob SHA `eb642b3fc8ef5819fea16f618c94e3a2548567fa` sur la branche `e2e/recette`.
- PR #266 avant écriture : state `open`, draft `true`, merged `false`, HEAD `2827789b05bccfd7e35f893c05183915531365f1`, base `main`.

---

## 30. Résultat de la validation de format de la clé V4 — V2.25 — 8 novembre 2026

### 30.1 Rapport opérateur reçu

L'opérateur transmet le rapport suivant après la commande LOT-00 V4 (§27.3) :

```text
node=v26.13.0
project_ref=ofqqrryamslxoqkklraw
credential_type=legacy_service_role
results=[]
GATE=BLOCKED_REVIEW_REQUIRED
error=Error: KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT
```

### 30.2 Interprétation exacte du contrôle

Ce résultat correspond au contrôle explicite du script §27.3 :

- Le champ `credential_type=legacy_service_role` est une valeur fixe écrite par le script ; il ne prouve pas, à lui seul, que la valeur saisie est une clé valide de ce rôle.
- Le script arrête l'exécution si la chaîne reçue ne commence pas par `eyJ`, en émettant exactement `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- Le rapport `results=[]` confirme qu'aucune réponse HTTP n'a été ajoutée aux résultats.
- Le script n'a donc pas atteint les deux GET OpenAPI prévus pour les profils `public` puis `net`.

Le précontrôle a reçu une chaîne non vide (la branche `KEY_EMPTY` avait été testée avant `run(k)`) qui ne commençait pas par le préfixe JWT attendu `eyJ` après normalisation par `trim()`. Le rapport ne permet pas de distinguer ces deux cas et ne permet pas d'inférer l'état Active de la clé dans le Dashboard.

### 30.3 Décision et prochaine étape sûre

- Ne pas effectuer un nouvel essai avec une autre clé ou un autre type de clé.
- Ne pas utiliser `anon`, `sb_secret_…`, une clé JOBLY-PROD ou une valeur provenant d'un autre projet.
- Ne pas activer, réactiver, régénérer ou créer une clé.
- Ne jamais demander à l'opérateur de copier ou transmettre la valeur de la clé dans le chat, un rapport ou Git.
- Avant toute autre commande, l'opérateur peut seulement consulter le Dashboard JOBLY-E2E, sans copier la valeur, pour vérifier si la ligne `service_role` historique est indiquée comme **Active** et si le format est celui d'un JWT historique. Si le Dashboard ne permet pas de confirmer ces deux éléments sans exposer la clé, arrêter le contrôle et conserver le statut bloqué.
- Aucun autre endpoint, appel API, requête SQL/RPC/Storage ou changement de permissions n'est justifié par ce rapport.

### 30.4 Effet sur les gates et périmètre

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` : **NON EXÉCUTÉ**.
- GET OpenAPI `net` : **NON EXÉCUTÉ**.
- Exposition du schéma PostgreSQL `net` : **NON DÉTERMINÉE**.
- L'étape de contrôle de format s'est exécutée ; les requêtes HTTP ne se sont pas exécutées.
- Aucun smoke runtime Auth/Talent/Recruteur, aucun navigateur, aucun parcours croisé et aucun bulk ne sont autorisés avant fermeture de LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Le retour est une preuve textuelle transmise par l'opérateur ; aucun appel Supabase n'a été effectué par l'assistant.
- `main` inchangée ; PR #266 reste ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 30.5 Preuves

- Rapport non secret fourni par l'opérateur dans la conversation (§30.1).
- Signature de l'erreur comparée au contrôle `if (!k.startsWith('eyJ')) throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT')` du §27.3.
- Document source avant cette mise à jour : V2.24, blob SHA `b57d8c57861026198e4f1ceae42dd3afa2670462`, branche `e2e/recette`.
- PR #266 vérifiée avant écriture : state `open`, draft `true`, merged `false`, HEAD `fb46608e64a0e5a522828739897fe98201523e63`, base `main`.
- Aucune valeur de clé n'a été reçue, lue ou enregistrée par l'assistant.

---

## 31. Nouvelle transmission de la commande LOT-00 avec invite explicite — V2.26 — 8 novembre 2026

### 31.1 Clarification opérateur

L'opérateur indique qu'il n'a pas encore été amené à saisir la clé et demande la retransmission de la commande pour effectuer le test. Il faut donc éviter toute formulation laissant croire que la clé a déjà été fournie. Le rapport V4 précédent (§30) indique seulement que le précontrôle a reçu une chaîne vide ou une chaîne sans préfixe `eyJ` ; il ne prouve pas que l'opérateur a volontairement saisi une valeur.

### 31.2 Nouvelle commande V5 — rapport séparé

Pour éviter toute collision avec les rapports V3 et V4, la commande ci-dessous réserve un nouveau nom V5. Elle affiche explicitement une invite de saisie masquée **après** confirmation que le terminal CMD dispose d'un TTY. Aucun caractère saisi n'est affiché. La commande refuse d'écraser le nouveau rapport s'il existe déjà.

**Précondition :** exécuter uniquement dans le Node.js Command Prompt/CMD interactif et uniquement si la ligne `service_role` de JOBLY-E2E est indiquée Active sous Legacy API Keys. La clé ne doit pas être copiée dans le chat. Si la ligne n'est pas active ou si le format n'est pas celui du JWT historique, arrêter sans saisir de valeur ; aucune réactivation, rotation ou génération n'est autorisée.

### 31.3 Bloc CMD transmis

Le bloc a été corrigé et vérifié pour conserver les séquences d'échappement nécessaires à Node.js (`\r`, `\n`, `\u0003`) après le passage par CMD. Le prompt de saisie apparaît explicitement avant le passage en mode masqué.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v5-20261108-b.txt (
  echo Rapport V5 deja present : conservation, aucune nouvelle execution.
) else (
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v5-20261108-b.txt';if(fs.existsSync(report)){console.log('REPORT_EXISTS_PRESERVED');process.exit(3)}function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){out.write('TTY_REQUIRED - ouvrir Node.js Command Prompt puis coller la commande complete.\n');save([],'BLOCKED_REVIEW_REQUIRED','TTY_REQUIRED');process.exit(2)}let key='';out.write('\nSAISIE MASQUEE : colle maintenant la valeur complete de la cle service_role historique JOBLY-E2E, puis appuie sur Entree. Aucun caractere ne sera affiche : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');save([],'BLOCKED_REVIEW_REQUIRED','CANCELLED');process.exit(2)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');const k=key.trim();key='';if(!k){save([],'BLOCKED_REVIEW_REQUIRED','KEY_EMPTY');return}run(k);return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net'),pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}"
)
if exist feedback-lot00-net-schema-exposure-v5-20261108-b.txt notepad feedback-lot00-net-schema-exposure-v5-20261108-b.txt
```

Le prompt doit afficher exactement une instruction commençant par `SAISIE MASQUEE`. À ce moment seulement, coller localement la valeur complète de la clé historique `service_role` JOBLY-E2E puis appuyer sur Entrée. L'absence d'écho à l'écran est normale. Si `TTY_REQUIRED` apparaît, ne pas essayer de saisir la clé ; transmettre seulement cette ligne.

Le script valide localement le préfixe JWT et les claims `role=service_role` et `ref=ofqqrryamslxoqkklraw`. Si ces validations passent, il effectue exclusivement deux GET à `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec `Accept-Profile: public` puis `Accept-Profile: net`, le header `apikey` uniquement. Aucun Authorization Bearer, table, RPC, Storage, `net.http_*` ou écriture.

### 31.4 Lecture du résultat

- Le rapport attendu est `feedback-lot00-net-schema-exposure-v5-20261108-b.txt`.
- Le fichier s'ouvre dans Notepad après l'exécution.
- Seule la paire `public=HTTP 200 avec OpenAPI` et `net=HTTP 406 / PGRST106` donne `PASS_NET_NOT_EXPOSED`.
- Tout autre résultat reste `BLOCKED_REVIEW_REQUIRED`. Ne pas relancer le test avec une autre clé.
- Ne transmettre que les lignes non secrètes du rapport : `results`, `GATE`, `error` éventuelle et `REPORT`. Jamais la clé ou un header.

### 31.5 État et limites après transmission

- Commande V5 corrigée : **PRÊTE À ÊTRE TESTÉE, NON EXÉCUTÉE** par l'assistant ; aucun résultat n'est anticipé.
- Invite de saisie de la clé : prévue explicitement après le contrôle TTY ; sa visibilité devra être confirmée par l'opérateur.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à réception et examen du rapport.
- Aucun GET OpenAPI n'a été effectué par l'assistant ; exposition de `net` toujours **NON DÉTERMINÉE**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée ; aucun smoke runtime/browser/bulk.
- `main` inchangée ; PR #266 reste ouverte en brouillon et non fusionnée ; aucun déploiement.

### 31.6 Preuves

- Retour opérateur : « je n'ai pas encore été amené à saisir ce code, renvoi la commande du lot je teste ».
- Rapport V4 précédent : §30.1 ; erreur locale `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]`.
- Procédure de référence comparée : §23.3 ; nouveau rapport réservé : `feedback-lot00-net-schema-exposure-v5-20261108-b.txt`.
- Document source avant cette mise à jour : V2.25, blob SHA `1bff7a776d12c599eddabd154915e61d1ade8679`, branche `e2e/recette`.
- Aucun secret reçu, lu ou enregistré par l'assistant.


### 31.7 Correction de transmission avant exécution

Avant l'envoi à l'opérateur, le bloc CMD a été réémis dans le document avec les échappements JavaScript exacts (`\r`, `\n`, `\u0003`, `\u007f`) afin que le script Node.js traite correctement les retours à la ligne et les touches d'annulation/suppression. Le prompt `SAISIE MASQUEE` est affiché avant l'activation du mode brut. Cette correction documentaire ne constitue pas une exécution du script et ne change aucun statut de test.


---

## 32. Suspension de la commande V5 avant saisie de la clé — V2.28 — 8 novembre 2026

### 32.1 Retour opérateur et clarification

L'opérateur signale que la commande V5 affiche une demande de coller la valeur de la clé historique `service_role`. C'est bien le comportement prévu par le code transmis au §31.3 : le script attend une saisie masquée dans le terminal local, puis utilise la valeur comme header `apikey` pour deux requêtes GET OpenAPI sur JOBLY-E2E.

Cette saisie n'a pas été effectuée selon le retour reçu à cette étape. Aucun élément ne permet d'affirmer que la clé a été fournie ou qu'une requête HTTP a été envoyée.

### 32.2 Décision de sécurité

**Suspendre la commande V5. Ne pas coller la clé et interrompre l'invite par Ctrl+C.**

La clé `service_role` est un secret privilégié. Le fait que la saisie soit masquée ne réduit pas les privilèges qu'obtient le processus qui la reçoit. La procédure V5 ne doit donc pas être poursuivie sur la seule base de l'instruction précédente. Réévaluer une méthode de vérification à privilèges minimaux avant toute nouvelle exécution.

Ne jamais transmettre cette clé dans le chat, un rapport, Git ou un autre canal. Ne pas utiliser une clé alternative, ne pas réactiver/régénérer/rotater de clé et ne modifier aucune configuration Supabase.

### 32.3 État exact du LOT-00

- Rapport V4 : le contrôle local a retourné `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]` ; aucune requête HTTP n'a été atteinte lors de cette exécution.
- Commande V5 : transmise avec une invite de saisie masquée, mais **suspendue avant saisie** à la demande de clarification opérateur.
- GET OpenAPI `public` : **NON CONFIRMÉ / aucun résultat reçu**.
- GET OpenAPI `net` : **NON CONFIRMÉ / aucun résultat reçu**.
- Exposition du schéma `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun smoke Auth/runtime, navigateur, parcours croisé ou bulk n'est autorisé avant fermeture du LOT-00.
- Aucun accès JOBLY-PROD, aucune mutation de fixture, donnée, permission ou configuration Supabase.
- `main` inchangée ; PR #266 reste ouverte en brouillon et non fusionnée ; aucun déploiement.

### 32.4 Preuve et correction documentaire

- Déclaration opérateur : « Il me demande de coller la valeur de la clé service role historique ».
- Code de commande transmis au §31.3 : invite masquée suivie de l'utilisation de la valeur dans le header `apikey`.
- Décision communiquée : ne pas saisir la clé et interrompre la commande.
- Cette section prévaut sur toute instruction antérieure du §31 qui demanderait de coller la clé pour exécuter V5. Le §31 est conservé pour traçabilité, mais sa commande est **SUSPENDUE — NE PAS EXÉCUTER**.


---

## 33. Nouvelle demande de retest et méthode de contrôle sans secret — V2.29 — 8 novembre 2026

### 33.1 Demande opérateur

L'opérateur demande de renvoyer la commande pour retester LOT-00. La commande V5 du §31 attend une clé historique `service_role` privilégiée et a été suspendue au §32 avant toute saisie. Cette suspension reste active : aucune invite de saisie de cette clé ne doit être relancée.

### 33.2 Contrôle sans clé recommandé

La documentation officielle Supabase indique que les schémas exposés se consultent dans les réglages API du projet : Dashboard JOBLY-E2E, `Project Settings > Data API > Exposed schemas` (route Dashboard documentée : `/dashboard/project/_/settings/api`). La documentation « Using Custom Schemas » précise qu'un schéma doit être ajouté à cette liste pour être exposé au Data API.

Procédure opérateur :
1. Ouvrir le projet Supabase JOBLY-E2E uniquement, ref `ofqqrryamslxoqkklraw`.
2. Ouvrir `Project Settings > Data API` puis consulter `Exposed schemas`.
3. Lire la liste sans la modifier et sans cliquer sur Save.
4. Communiquer uniquement si `net` figure dans la liste, et éventuellement la liste des noms de schémas non sensibles.
5. Ne pas ouvrir ni consulter JOBLY-PROD ; ne saisir aucune clé API.

**Limite de cette méthode :** la liste Dashboard établit la configuration visible dans le panneau. La documentation Supabase signale qu'un réglage manuel tel que `ALTER ROLE authenticator SET pgrst.db_schemas` empêche le Dashboard de gérer cette configuration ; si un tel override existe, il faut le documenter séparément avant de conclure que la configuration effective correspond à la liste UI.

### 33.3 Décision sur la commande

- Aucune nouvelle commande CMD avec `service_role` n'est transmise dans cette étape.
- Ne pas exécuter la commande V5 du §31 ; elle reste suspendue.
- Ne pas remplacer la clé par `anon`, publishable, `sb_secret_…` ou une clé JOBLY-PROD.
- Ne pas effectuer de requête Auth, SQL, RPC, Storage, de table, ni aucun changement de schéma/grant/configuration.
- La prochaine donnée attendue est la présence/absence de `net` dans la liste Dashboard Exposed schemas.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à revue du réglage affiché et de tout éventuel override PostgREST.
- Aucun GET OpenAPI, aucun test runtime, aucun navigateur et aucun bulk n'est attesté par cette mise à jour.

### 33.4 Sources et preuves

- Demande opérateur : « Renvoi la commande pour retester. »
- Document source avant édition : V2.28, blob SHA `b1d337e8d1aa4e661ebcc32f4061d118fd18e275`, branche `e2e/recette`.
- Supabase Docs, `Using Custom Schemas` : `https://supabase.com/docs/guides/api/using-custom-schemas`, consulté le 8 novembre 2026 ; étapes d'ajout à `API settings > Exposed schemas`.
- Supabase Docs, `API Keys` : `https://supabase.com/docs/guides/getting-started/api-keys`, consulté le 8 novembre 2026 ; `service_role` est l'ancienne clé élevée qui correspond au rôle privilégié, la clé secret actuelle donne accès complet et bypass RLS.
- Supabase Knowledge Base, `PGRST002 / schema cache` : `https://supabase.com/kb/troubleshooting/postgrest-error-pgrst002-could-not-query-the-database-for-the-schema-cache-c396e9`, consulté le 8 novembre 2026 ; un override `ALTER ROLE authenticator SET pgrst.db_schemas` fait que Dashboard n'est plus l'interface gestionnaire du réglage.
- Aucun secret reçu, lu, copié, transmis ou écrit ; aucune requête vers JOBLY-E2E effectuée par l'assistant dans ce tour ; aucun accès JOBLY-PROD, aucune modification Supabase ou des fixtures.
- `main` inchangée ; PR #266 maintenue ouverte en brouillon et non fusionnée ; aucun déploiement.


---

## 34. Refus du contrôle Dashboard seul et nouvelle commande de retest V6 — V2.30 — 8 novembre 2026

### 34.1 Décision opérateur

Après proposition d'un contrôle manuel du Dashboard, l'opérateur répond « non » et réitère sa demande de disposer d'une commande de retest. Interprétation opérationnelle : il souhaite poursuivre le contrôle depuis le Node.js Command Prompt, plutôt que relever manuellement la liste Exposed schemas.

La V5 du §31 demeure suspendue et ne doit pas être relancée telle quelle. Une nouvelle commande V6, avec un nom de rapport inédit, est transmise à la demande explicite de l'opérateur. Elle est conditionnée à l'utilisation exclusive de la clé historique `service_role` de JOBLY-E2E, si celle-ci est active et correspond bien au projet et au rôle attendus.

### 34.2 Contrôles de sécurité de la V6

- La saisie est masquée dans le terminal local ; la valeur n'est pas écrite dans le rapport ni affichée.
- Le script exige le préfixe JWT historique `eyJ`, puis contrôle les claims `role=service_role` et `ref=ofqqrryamslxoqkklraw`.
- En cas de format/claims non conformes, aucun appel HTTP n'est émis.
- Si les validations passent, le script exécute exactement deux requêtes GET au endpoint racine REST de JOBLY-E2E : `Accept-Profile: public`, puis `Accept-Profile: net`, avec le header `apikey` uniquement.
- Il n'effectue aucun appel Authorization Bearer, Auth, table, SQL, RPC, Storage, `net.http_*` ou aucune écriture.
- Le rapport local neuf est `feedback-lot00-net-schema-exposure-v6-20261108.txt` ; il est protégé contre l'écrasement et ouvert dans Notepad après l'exécution.
- N'utiliser aucune clé provenant de JOBLY-PROD, aucun autre type de clé et ne jamais transmettre la clé dans le chat. Si la ligne historique n'est pas confirmée Active ou si l'opérateur n'est pas certain qu'il s'agit du secret JOBLY-E2E, arrêter sans saisie.

### 34.3 Commande CMD remise à l'opérateur

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v6-20261108.txt (
  echo Rapport V6 deja present : conservation, aucune nouvelle execution.
) else (
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v6-20261108.txt';function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\\r\\n')+'\\r\\n',{flag:'wx'});for(const line of lines)out.write(line+'\\n');out.write('REPORT='+report+'\\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){out.write('TTY_REQUIRED - ouvrir Node.js Command Prompt.\\n');save([],'BLOCKED_REVIEW_REQUIRED','TTY_REQUIRED');process.exit(2)}let key='';out.write('\\nSAISIE MASQUEE : colle la cle service_role historique ACTIVE de JOBLY-E2E, puis appuie sur Entree. Aucun caractere ne sera affiche : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\\u0003'){input.setRawMode(false);input.pause();key='';out.write('\\nCANCELLED\\n');save([],'BLOCKED_REVIEW_REQUIRED','CANCELLED');process.exit(2)}if(ch==='\\r'||ch==='\\n'){input.setRawMode(false);input.pause();out.write('\\n');const k=key.trim();key='';if(!k){save([],'BLOCKED_REVIEW_REQUIRED','KEY_EMPTY');return}run(k);return}if(ch==='\\u007f'||ch==='\\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net'),pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}"
)
if exist feedback-lot00-net-schema-exposure-v6-20261108.txt notepad feedback-lot00-net-schema-exposure-v6-20261108.txt
```

Après lancement, le terminal doit afficher `SAISIE MASQUEE`. L'opérateur colle la valeur uniquement dans le terminal local puis appuie sur Entrée ; aucun caractère ne doit apparaître. Si `TTY_REQUIRED` s'affiche, ne pas saisir la clé. Le raccourci `Ctrl+C` annule la saisie.

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-net-schema-exposure-v6-20261108.txt
```

### 34.4 Lecture et statut

- Seule la paire `public: HTTP 200 avec OpenAPI` et `net: HTTP 406 / PGRST106` donne `PASS_NET_NOT_EXPOSED`.
- Toute autre réponse reste `BLOCKED_REVIEW_REQUIRED`.
- Transmettre seulement `results`, `GATE`, `error` et `REPORT`, jamais la clé ou un header.
- Tant qu'un rapport V6 valide n'est pas reçu et examiné, LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** et aucun smoke runtime, navigateur, parcours croisé ou bulk n'est autorisé.

### 34.5 État à la transmission

- V6 : **TRANSMISE, NON EXÉCUTÉE** par l'assistant ; aucun résultat n'est anticipé.
- V5 : reste suspendue, conservée pour traçabilité.
- Aucun GET OpenAPI, aucune connexion Auth ou autre requête JOBLY-E2E effectuée par l'assistant dans ce tour.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 34.6 Preuves

- Réponse opérateur au contrôle Dashboard-only : « non » ; il demande à nouveau la commande de retest.
- Document source avant édition : V2.29, blob SHA `cfaf33aa38a525a4d7b99396ac05002a1124f1c1`, branche `e2e/recette`.
- Procédure V5 suspendue au §32 ; nouveau rapport V6 distinct de V3/V4/V5.
- Aucun secret reçu, lu ou enregistré par l'assistant.


---

## 35. Résultat de la commande V6 et analyse de la capture opérateur — V2.31 — 8 novembre 2026

### 35.1 Preuve reçue

L'opérateur transmet une capture du Node.js Command Prompt ouvert sur le Dashboard du projet JOBLY-E2E. Le terminal affiche :

```text
SAISIE MASQUEE : colle la cle service_role historique ACTIVE de JOBLY-E2E, puis appuie sur Entree.
node=v26.13.0
project_ref=ofqqrryamslxoqkklraw
credential_type=legacy_service_role
results=[]
GATE=BLOCKED_REVIEW_REQUIRED
error=Error: KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT
REPORT=feedback-lot00-net-schema-exposure-v6-20261108.txt
```

La capture montre également que l'onglet du Dashboard ouvert est **API Keys (Legacy)** et que le bouton visible est **Disable legacy API keys**. Cela indique que les clés JWT historiques sont activées globalement dans ce projet. La capture ne permet pas de lire ni de certifier la valeur de la clé copiée, ni d'établir son préfixe, son rôle ou son projet.

### 35.2 Interprétation exacte

- L'invite de saisie masquée s'est bien affichée ; le script V6 a donc franchi le contrôle TTY.
- Le script a reçu une chaîne qui ne commence pas par `eyJ` (ou une chaîne vide après traitement). Le contrôle `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT` l'a rejetée avant toute requête réseau.
- `results=[]` confirme qu'aucun statut HTTP n'a été obtenu.
- Les GET OpenAPI pour `public` et `net` n'ont pas été exécutés.
- `credential_type=legacy_service_role` est une étiquette constante du rapport et ne certifie pas la valeur saisie.
- La présence du bouton **Disable legacy API keys** confirme l'activation globale des clés historiques, mais pas que la valeur effectivement collée est la clé JWT `service_role` attendue.

### 35.3 Prochaine action — aucune nouvelle saisie à l'aveugle

Ne pas relancer V6 immédiatement avec la même valeur. Ne pas transmettre la clé au chat, à Notepad, à un rapport ou à Git. Ne pas utiliser `anon`, `sb_secret_…`, une clé d'un autre projet ou une clé JOBLY-PROD. Ne pas désactiver, réactiver, recréer ou faire tourner les clés.

Avant une nouvelle tentative, l'opérateur doit seulement confirmer visuellement, dans l'onglet **API Keys (Legacy)** du projet **JOBLY-E2E**, qu'il a sélectionné la ligne `service_role` et copié sa valeur JWT historique, et non une valeur de l'onglet API Keys moderne ou un autre champ. Si l'interface ne permet pas d'identifier le bon type sans exposer le secret, ne pas poursuivre.

La capture ne justifie pas de changer le script ni d'élargir les autorisations. Une seule tentative ultérieure ne serait envisageable qu'après confirmation locale du bon champ ; aucun secret ne doit être partagé.

### 35.4 État LOT-00

- Invite masquée V6 : **AFFICHÉE**.
- Précontrôle de format : **BLOCKED** — `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- GET OpenAPI `public` : **NON EXÉCUTÉ**.
- GET OpenAPI `net` : **NON EXÉCUTÉ**.
- Exposition de `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun runtime Auth, navigateur, parcours croisé ou bulk ne peut reprendre avant la clôture du LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Aucune valeur de secret n'a été visible ni communiquée à l'assistant ; aucune requête Supabase n'a été effectuée par l'assistant dans ce tour.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 35.5 Preuves et traçabilité

- Capture utilisateur reçue le 8 novembre 2026 : invite masquée visible, rapport V6 et erreur de format reproduits au §35.1 ; onglet **API Keys (Legacy)** et bouton **Disable legacy API keys** visibles.
- Rapport V6 local : `feedback-lot00-net-schema-exposure-v6-20261108.txt`, contenu non secret visible dans la capture.
- Document source avant cette mise à jour : V2.30, blob SHA `62af041ff871f191fe4416d05ce37469868a5f76`, branche `e2e/recette`.
- Aucune valeur de clé, aucun en-tête `apikey` et aucun jeton n'ont été reçus.


---

## 36. Clarification opérateur sur la clé copiée après l'erreur V6 — V2.32 — 8 novembre 2026

### 36.1 Déclaration reçue

L'opérateur indique : « j'ai copier celle de service role anon ». La formulation ne permet pas de déterminer de manière certaine s'il confirme avoir cliqué sur Copier en face de `service_role`, s'il parle de la ligne `anon`, ou s'il désigne les deux clés.

### 36.2 État technique inchangé

- Le rapport V6 reçu en capture reste : `results=[]`, `GATE=BLOCKED_REVIEW_REQUIRED`, `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- Le script a reçu une chaîne vide ou une chaîne qui ne commence pas par `eyJ`; il s'est arrêté avant validation des claims et avant toute requête HTTP.
- Les clés Legacy `anon` et `service_role` sont distinctes. La sélection de `anon` ne satisferait pas le contrôle de rôle même si son format JWT commençait également par `eyJ`.
- La capture confirme le bouton de désactivation des clés Legacy, mais ne montre pas quelle ligne a été copiée ni la valeur utilisée.

### 36.3 Prochaine clarification

Demander uniquement quelle ligne a été copiée : `service_role` ou `anon`. Ne pas demander la valeur, un extrait, une capture montrant le secret, ni un copier-coller de la clé. Ne pas relancer V6 avant cette clarification. Aucun changement de clé, réactivation, rotation ou modification Supabase n'est autorisé.

### 36.4 Statut

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- Exposition de `net` : **NON DÉTERMINÉE**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.
- Aucun secret reçu par l'assistant.

### 36.5 Preuves

- Déclaration opérateur : « j'ai copier celle de service role anon ».
- Rapport V6 présenté dans la capture utilisateur et analysé au §35.1.
- Document source avant cette mise à jour : V2.31, blob SHA `3ba90a1a914ba7a5f2fffafa5d99c3b96c3db9c9`, branche `e2e/recette`.


---

## 37. Confirmation visuelle de la ligne service_role — V2.33 — 8 novembre 2026

### 37.1 Nouvelle preuve opérateur

L'opérateur transmet une capture rapprochée de la ligne d'API Key affichant :
- label `service_role` ;
- badge de type `secret` ;
- champ de valeur masqué ;
- avertissement Supabase indiquant que cette clé peut contourner RLS.

La capture précédente du Dashboard montrait l'onglet **API Keys (Legacy)**. Ensemble, ces éléments confirment que l'opérateur a identifié la ligne historique `service_role`, et non la ligne `anon`.

### 37.2 Ce que cette capture ne prouve pas

- Le badge UI `secret` est une étiquette de catégorie/sensibilité ; ce n'est pas le préfixe ni le contenu de la valeur.
- La valeur étant masquée, la capture ne permet pas de vérifier ses trois premiers caractères ni de confirmer qu'il s'agit du JWT historique attendu.
- Le rapport V6 reste `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]`. Le terminal a reçu une chaîne non vide qui ne commence pas par `eyJ` après `trim()` ; aucun GET OpenAPI n'a été envoyé.
- La sélection visuelle de la ligne est désormais confirmée ; le format de la valeur copiée et son arrivée intacte dans le terminal ne le sont pas.

### 37.3 Diagnostic minimal restant

Demander à l'opérateur de vérifier uniquement le préfixe des trois premiers caractères en cliquant, si nécessaire, sur **Reveal** dans le Dashboard JOBLY-E2E, sans capturer l'écran ni copier la valeur dans le chat :
- si les trois premiers caractères sont `eyJ`, répondre uniquement `PREFIX=eyJ` ;
- sinon répondre uniquement `PREFIX_DIFFERENT`.

Ne jamais transmettre les caractères suivants, le JWT, une capture révélant la clé ou toute autre partie du secret. Ne pas relancer V6 avant ce contrôle local. Aucun essai avec `anon`, `sb_secret_…`, une clé d'un autre projet ou JOBLY-PROD. Aucune rotation/régénération/réactivation n'est autorisée.

### 37.4 État LOT-00

- Ligne sélectionnée : **service_role — confirmée visuellement**.
- Format JWT de la valeur : **NON VÉRIFIÉ**.
- Précontrôle V6 : **BLOCKED** — `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- Exposition effective du schéma `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Aucun secret reçu, affiché ou enregistré par l'assistant.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 37.5 Preuves et traçabilité

- Capture opérateur du 8 novembre 2026 : ligne `service_role`, badge `secret`, valeur masquée, avertissement RLS.
- Capture précédente : onglet Dashboard `API Keys (Legacy)` et sortie terminal V6.
- Rapport V6 reproduit au §35.1.
- Document source avant cette mise à jour : V2.32, blob SHA `750fd141b3eef92a0e9f12de97f9e763e3e9c07c`, branche `e2e/recette`.
- Aucune valeur de clé ni aucun préfixe n'ont été reçus à cette étape.


---

## 38. Préfixe partiel communiqué — V2.34 — 8 novembre 2026

### 38.1 Retour opérateur

À la demande de vérifier localement les trois premiers caractères de la valeur, l'opérateur répond uniquement `ey`.

### 38.2 Interprétation

- Le préfixe complet `eyJ` est désormais confirmé par l'opérateur.
- Le script V6 vérifie précisément `startsWith('eyJ')`; le rapport antérieur indique qu'il a reçu une chaîne vide ou ne commençant pas par cette séquence.
- Aucune conclusion ne peut être tirée du seul préfixe partiel `ey`. Il ne faut pas demander à l'opérateur de communiquer d'autres caractères de la clé.

### 38.3 Étape suivante

L'opérateur peut vérifier lui-même, dans le Dashboard JOBLY-E2E, si le troisième caractère est exactement `J`, sans communiquer la valeur ni aucun autre caractère. Il répond uniquement `PREFIX_OK` si les trois caractères sont `eyJ`, ou `PREFIX_NO` dans le cas contraire. Ne pas relancer le script avant cette clarification, ne pas copier la valeur dans le chat et ne pas modifier ni régénérer la clé.

### 38.4 Statut

- Ligne Legacy `service_role` : confirmée visuellement au §37.
- Préfixe complet `eyJ` : **CONFIRMÉ PAR L'OPÉRATEUR**.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun secret complet reçu ; aucun accès JOBLY-PROD, aucune modification de fixture, donnée, permission ou configuration Supabase.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 38.5 Preuves

- Déclaration opérateur : `ey`.
- Document source avant cette mise à jour : V2.33, blob SHA `c5257d9eb998c20863072e25f751b36c3cfe7fa3`, branche `e2e/recette`.


---

## 39. Réponse « ok » — préfixe JWT toujours non confirmé — V2.35 — 8 novembre 2026

### 39.1 Retour opérateur

Après demande de confirmer si le troisième caractère de la valeur masquée est `J`, l'opérateur répond uniquement « ok ».

### 39.2 Limite de l'information reçue

Cette réponse accuse réception de la consigne, mais ne confirme pas explicitement le résultat du contrôle local. Le préfixe complet `eyJ` est confirmé ; le désaccord porte sur la chaîne capturée par le programme, pas sur le préfixe visible dans le Dashboard. Aucun caractère supplémentaire de la clé ne doit être demandé ou communiqué.

### 39.3 Prochaine étape

Demander une réponse non ambiguë après vérification locale : `PREFIX_OK` si les trois premiers caractères sont `eyJ`, sinon `PREFIX_NO`. Ne pas relancer la V6 avant cette confirmation. Ne jamais transmettre la clé ou un extrait plus long.

### 39.4 État LOT-00

- Ligne Legacy `service_role` : confirmée visuellement au §37.
- Préfixe complet `eyJ` : **CONFIRMÉ PAR L'OPÉRATEUR**.
- Rapport V6 : `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]`.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- Exposition effective de `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 39.5 Preuves

- Réponse opérateur : « ok ».
- Demande précédente : confirmer localement le troisième caractère sans partager la valeur.
- Document source avant cette mise à jour : V2.34, blob SHA `5ebe225a8d84426766168e40c2a27074fc266f83`, branche `e2e/recette`.


---

## 40. Audit contradictoire du rejet V6 et correction du parseur de saisie — V2.36 — 8 novembre 2026

### 40.1 Faits désormais établis

- L'opérateur confirme avoir sélectionné la ligne **service_role** dans **API Keys (Legacy)** (§37).
- L'opérateur confirme maintenant que la valeur révélée commence bien par `eyJ`.
- La capture V6 établit que l'invite masquée s'est affichée et que le rapport indique `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT` avec `results=[]`.
- Le V6 vérifie d'abord `if(!k)` et émet `KEY_EMPTY` en cas de saisie vide ; il appelle ensuite `run(k)`, dont le test `!k.startsWith('eyJ')` émet `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`. Puisque c'est cette dernière erreur qui apparaît, la chaîne capturée était **non vide** et ne commençait pas par `eyJ` après `.trim()`. Le diagnostic précédent « chaîne vide ou mauvais préfixe » était trop large : la branche vide est exclue pour ce rapport précis.
- Le précontrôle a arrêté l'exécution avant décodage des claims `role`/`ref` et avant les requêtes HTTP. Le rôle, le projet, la signature et l'acceptation serveur n'ont donc pas été testés.

### 40.2 Contradiction logique

Si la valeur du champ Legacy service_role commence par `eyJ`, mais que `k.startsWith('eyJ')` est faux, le contenu transmis à `run(k)` n'est pas identique au début visible dans le Dashboard. Le problème se situe donc avant le contrôle JWT : copie presse-papiers, transport terminal ou traitement du buffer d'entrée. Le rapport V6 ne journalise aucun indicateur permettant de distinguer ces causes.

### 40.3 Défaut précis trouvé dans le parseur V6

Le V6 construit la chaîne ainsi :

```js
if (ch === '\\u007f' || ch === '\\b') key = key.slice(0, -1);
else if (ch >= ' ') key += ch;
```

Cette logique ignore tous les caractères de contrôle séparément. Sur un terminal qui encadre un collage par le marqueur bracketed-paste `ESC[200~`, le caractère ESC (code 27) est ignoré car il est inférieur à l'espace, tandis que les caractères imprimables `[200~` sont ajoutés à `key`. La chaîne obtenue commence alors par `[200~eyJ...` et déclenche exactement `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, même si le secret sous-jacent commence correctement par `eyJ`.

**Reproduction synthétique effectuée hors de JOBLY, sans secret réel :** la logique de capture V6 appliquée à `ESC[200~eyJTEST.eyJTEST.eyJTESTESC[201~` donne un préfixe capturé `[200~` et échoue au contrôle `eyJ`. Un parseur qui conserve puis enlève le marqueur complet retrouve `eyJ`. C'est un mécanisme reproduisant exactement l'erreur. Il n'est pas démontré que ce marqueur a été envoyé lors du collage réel de l'opérateur ; il s'agit de l'hypothèse principale vérifiable.

La documentation Node décrit le mode raw comme un mode où les caractères sont livrés individuellement, sans écho et avec le traitement spécial du terminal désactivé. Un cas documenté dans Windows Terminal montre que les séquences d'échappement de collage peuvent arriver sous forme de touches Win32 (ESC, `[`, chiffres, `~`) en mode d'entrée Win32 ; cela rend le mécanisme crédible sur un terminal Windows, sans établir qu'il s'est produit ici.

### 40.4 Autres hypothèses encore ouvertes

1. Le terminal a injecté un marqueur de collage, dont le résidu imprimable précède le JWT — hypothèse principale, car elle reproduit exactement le rejet avec le code V6.
2. Le presse-papiers contenait un texte différent de la valeur révélée (ancien contenu, mauvaise action Copier, sélection incomplète).
3. Le buffer d'entrée a été modifié ou tronqué par le terminal avant la validation.

La capture V6 ne comporte ni longueur, ni indicateur de marqueur de collage, ni indicateur de préfixe normalisé. Elle ne permet donc pas de départager ces hypothèses. Il serait incorrect de conclure que la clé service_role est invalide ou expirée.

### 40.5 Correction proposée — commande V7

La V7 conserve le caractère ESC pendant la collecte, puis retire explicitement les marqueurs de collage complets `ESC[200~` et `ESC[201~`. Elle reconnaît aussi les variantes où le terminal a supprimé le caractère ESC mais laissé `[200~` ou `[201~`. Elle écrit uniquement des booléens de diagnostic (`paste_start_marker_detected`, `paste_end_marker_detected`, `normalized_prefix_ok`) dans le rapport. Aucune partie de la clé n'est journalisée.

- Le rapport est nouveau : `feedback-lot00-net-schema-exposure-v7-20261108.txt`.
- Le V7 conserve les contrôles `role=service_role` et `ref=ofqqrryamslxoqkklraw`.
- Il n'effectue que les deux GET OpenAPI JOBLY-E2E `public` et `net`, uniquement après validation locale du préfixe et des claims.
- Le critère PASS reste exactement : `public=200` avec OpenAPI et `net=406/PGRST106`.
- Aucune clé alternative, aucune écriture, aucun Auth, SQL, RPC, Storage, `net.http_*` ou accès JOBLY-PROD.

### 40.6 Commande CMD V7 transmise

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v7-20261108.txt (
  echo Rapport V7 deja present : conservation, aucune nouvelle execution.
) else (
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v7-20261108.txt';function save(rows,gate,error='',meta={}){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','expected_credential_type=legacy_service_role','paste_start_marker_detected='+Boolean(meta.pasteStart),'paste_end_marker_detected='+Boolean(meta.pasteEnd),'normalized_prefix_ok='+Boolean(meta.prefixOk),'results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){out.write('TTY_REQUIRED - ouvrir Node.js Command Prompt.\n');save([],'BLOCKED_REVIEW_REQUIRED','TTY_REQUIRED');process.exit(2)}let key='';out.write('\nSAISIE MASQUEE V7 : colle la cle service_role historique JOBLY-E2E puis appuie sur Entree. Aucun caractere ne sera affiche : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');save([],'BLOCKED_REVIEW_REQUIRED','CANCELLED');return}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');let raw=key;key='';raw=raw.replace(/^\uFEFF/,'').trim();const pasteStart=/^(?:\u001b)?\[200~/.test(raw);const pasteEnd=/(?:\u001b)?\[201~$/.test(raw);let normalized=raw.replace(/^(?:\u001b)?\[200~/,'').replace(/(?:\u001b)?\[201~$/,'').trim();const meta={pasteStart,pasteEnd,prefixOk:normalized.startsWith('eyJ')};if(!normalized){save([],'BLOCKED_REVIEW_REQUIRED','KEY_EMPTY',meta);raw='';normalized='';return}run(normalized,meta);raw='';normalized='';return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch==='\u001b'||ch>=' ')key+=ch}});async function run(k,meta){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const payload=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(payload.role!=='service_role'||payload.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net'),pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED','',meta)}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message,meta)}finally{k=''}}"
)
if exist feedback-lot00-net-schema-exposure-v7-20261108.txt notepad feedback-lot00-net-schema-exposure-v7-20261108.txt
```

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-net-schema-exposure-v7-20261108.txt
```

Le terminal doit afficher `SAISIE MASQUEE V7`. La clé est saisie uniquement dans le terminal local. Transmettre le rapport non secret uniquement. Si V7 retourne encore `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, le champ `paste_start_marker_detected` et `normalized_prefix_ok` permettra de savoir si le marqueur explique le problème. Si `normalized_prefix_ok=true` mais que les claims échouent, le résultat sera `KEY_PROJECT_OR_ROLE_MISMATCH`, distinct du problème actuel.

### 40.7 Statut et limites

- Préfixe affiché dans le Dashboard : `eyJ` **confirmé par l'opérateur**.
- V6 : **échoué au parseur local avant décodage claims et avant réseau**.
- Hypothèse principale : résidu du marqueur de collage `[200~` causé par le filtrage du caractère ESC dans le V6 ; **reproduction synthétique PASS, cause réelle locale pas encore observée**.
- V7 : **transmise, non exécutée** par l'assistant.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` et `net` : toujours **NON EXÉCUTÉS** à ce stade.
- Aucun secret reçu ni stocké par l'assistant ; aucun appel JOBLY-PROD ; aucune mutation Supabase ou fixture.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 40.8 Sources et preuves

- Code V6 de référence au §34.3 : branche collecte `else if(ch>=' ') key+=ch`, précontrôle `startsWith('eyJ')`, branche `KEY_EMPTY` séparée.
- Reproduction Node.js locale synthétique : séquence de collage avec marqueurs et valeur factice, sans secret réel ni appel réseau ; le parseur V6 reproduit le rejet et le parseur V7 restaure le préfixe.
- Supabase JWT Claims Reference : `https://supabase.com/docs/guides/auth/jwt-fields` ; le JWT service_role inclut les claims `role=service_role` et `ref`.
- Supabase API Keys : `https://supabase.com/docs/guides/getting-started/api-keys` ; `service_role` est une clé legacy de format JWT à privilèges élevés.
- Node.js TTY : `https://nodejs.org/api/tty.html` ; décrit le mode raw et son traitement caractère par caractère sans écho.
- Microsoft Windows Terminal issue #17656 : `https://github.com/microsoft/terminal/issues/17656` ; décrit le passage de séquences d'échappement de collage sous forme de touches en entrée Win32.
- Rapport V6 transmis en capture : §35.1 ; préfixe confirmé ensuite par l'opérateur : déclaration « je confirme » après demande de vérifier `eyJ`.
- Document source avant cette mise à jour : V2.35, blob SHA `5453278abae577170907691dd84094caa5791eb3`, branche `e2e/recette`.
