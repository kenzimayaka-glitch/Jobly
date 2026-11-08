# Jobly — Référence de continuité de la recette E2E

> ## ÉTAT MAÎTRE ACTUALISÉ — V2.74 — 8 novembre 2026
>
> **Dernier code E2E-001 commité :** `8385b60400bbaf9cedfcb4aa01073b733533f6c2` sur `e2e/recette`.
> **`main` :** inchangée dans le cadre de cette correction. **PR #266 :** reste ouverte, brouillon et non fusionnée.
> **Environnement :** JOBLY-E2E uniquement. Aucun test runtime ni accès JOBLY-PROD n'a été effectué pendant la correction distante.
>
> **Important — instructions historiques neutralisées :** les instructions plus anciennes de ce document qui autorisaient ou demandaient une réinitialisation des mots de passe, une recréation de fixtures ou l'exécution de `e2e/reset-existing-fixture-passwords.mjs` sont obsolètes et ne doivent pas être suivies. Le script local `e2e/reset-existing-fixture-passwords.mjs` reste à préserver et ne doit pas être exécuté. Aucune fixture partagée ne doit être modifiée sans nouvelle autorisation explicite et spécifique.
>
> **Nouvelle méthode de continuité :** ce fichier Markdown dans Git est la seule référence maître. Chaque nouvelle conversation Jobly doit le lire intégralement avant d'agir. Après chaque réponse consacrée à la recette E2E, l'assistant met à jour ce fichier dans la même séquence de travail, sur `e2e/recette`, puis fournit le commit GitHub vérifiable et le chemin du fichier. Chaque entrée distingue les faits établis, leur preuve, les actions non exécutées et les blocages ; aucun résultat non testé ne peut être présenté comme PASS. Ne pas passer par la Bibliothèque/Word pour cette continuité.
>
> **Garde-fous actuels :** les consignes historiques qui autorisaient la réinitialisation des mots de passe, la recréation/restauration des fixtures ou l'exécution automatique du provisionneur restent neutralisées. Ne pas exécuter `e2e/reset-existing-fixture-passwords.mjs`, ne pas restaurer de secret/runtime et ne pas lancer `scripts/e2e-local-recipe.mjs` tant que les prérequis effectifs du préflight, les fixtures et l'isolation n'ont pas été revus.
> **État courant et ordre des lots :** E2E-001 conserve son PASS statique local 6/6. LOT-00 conserve uniquement le préflight environnement/fixtures et les contrôles read-only de base (identité, RLS/grants, Storage, correspondances des fixtures), hors OpenAPI. Les lots métier LOT-01 à LOT-10 suivent leurs dépendances propres. Le contrôle OpenAPI `public`/`net` est déplacé en **LOT-11, dernier lot**, après LOT-10 et la réconciliation de la campagne ; son absence de résultat ne bloque plus l'entrée dans les lots précédents.

**Version :** 2.55  
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

### 15.3 Audit LOT-00 initial — HISTORIQUE, ordre OpenAPI remplacé par §76

**Note V2.74 : les consignes de séquencement qui suivent décrivent l'état historique de l'audit initial. L'OpenAPI n'est plus un préalable runtime ; il est déplacé en LOT-11 final (§76).**

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

### 15.4 État de continuité au moment de l'audit — HISTORIQUE, remplacé par §76

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

**LOT-00 = PARTIAL, non clos.** Le contrôle OpenAPI est retiré de son périmètre et reporté au LOT-11 final.

Contrôles satisfaits :
- identité projet JOBLY-E2E et disponibilité confirmées ;
- RLS activé sur 180/180 tables publiques ;
- absence de privilèges clients directs sur les 26 tables RLS sans policy ;
- présence et correspondance des 3 fixtures métier E2E confirmées ;
- inventaire des buckets et policies Storage établi.

Points à fermer avant le PASS LOT-00 (hors OpenAPI) :
1. Valider que les deux buckets publics jobly-events et profile-photos sont intentionnels.
2. Documenter le plan de moindre privilège des grants table/storage, sans modifier les droits dans le cadre de cette recette.

Le GET OpenAPI `public`/ `net` n'est plus un critère de sortie de LOT-00. Il est réservé au LOT-11 final (§76).

### 16.7 Historique du contrôle OpenAPI GET — méthode initiale invalidée le 8 novembre 2026 — reporté au LOT-11

**Note de séquencement V2.74 : cette section conserve les tentatives historiques ; elle ne constitue plus une étape opératoire de LOT-00 et ne bloque plus les lots précédents. Le contrôle est différé au LOT-11 final.**

La commande initiale utilisait la clé publishable `sb_publishable_...` à la racine exacte `/rest/v1/`. Le rapport opérateur `feedback-lot00-net-schema-exposure.txt` a retourné :

- `public` : HTTP 401, `apiSchemaAccepted=false`, `openapi=false`, message `Secret API key required` ;
- `net` : HTTP 401, `apiSchemaAccepted=false`, `openapi=false`, même message ;
- synthèse : `GATE=BLOCKED_REVIEW_REQUIRED`.

**Interprétation :** les deux requêtes ont été rejetées au contrôle de clé avant la négociation des profils PostgREST. Ce résultat ne prouve ni que `net` est exposé, ni qu'il est masqué. La procédure utilisant la clé publishable à cette racine est invalidée et ne doit pas être répétée.

Pour la racine OpenAPI, utiliser la procédure corrigée au §22.3 : une clé secrète de JOBLY-E2E (`sb_secret_...`) ou l'ancienne clé `service_role`, saisie localement et masquée. La requête reste strictement GET, sur l'unique endpoint `/rest/v1/`, pour lire le catalogue de schémas ; aucun objet métier, table, fonction RPC ou endpoint `net.http_*` n'est appelé. La clé secrète contourne RLS : son usage est donc limité à ces deux lectures de métadonnées et elle ne doit jamais être copiée dans le rapport, les logs, le chat ou Git.

Références Supabase : la racine OpenAPI peut exiger une clé d'administration ; les clés `sb_secret_...` sont privilégiées et doivent rester côté opérateur. Voir https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup et https://supabase.com/docs/guides/getting-started/api-keys.

Après le test corrigé, analyser séparément le résultat `public` et le résultat `net`. Tout 401/403, erreur réseau, réponse ambiguë ou schéma `net` accepté maintient le blocage. Aucun grant, rôle, schéma ou policy ne doit être modifié à partir d'un simple échec d'authentification.

### 16.8 État courant après reclassement

- E2E-001 : **PASS statique local — 6/6**.
- LOT-00 : **PARTIAL — éléments non-OpenAPI encore à fermer : décision sur les buckets publics, matrice grants/policies et prérequis environnement/fixtures applicables**.
- LOT-01 à LOT-10 : à conduire selon leurs dépendances métier et les prérequis Auth/fixtures ; l'absence de résultat OpenAPI ne les bloque plus.
- LOT-11 OpenAPI final : **À FAIRE EN DERNIER**, après LOT-10 et réconciliation.
- Recettes runtime/bulk : restent conditionnées à la disponibilité réelle des fixtures, de la session Auth et à l'isolation JOBLY-E2E ; le déplacement d'OpenAPI ne lève pas ces conditions.
- JOBLY-PROD : aucune requête SQL, aucune écriture.
- Fixtures partagées : inchangées.
- PR #266 : ouverte, brouillon, non fusionnée.
- main : inchangée ; aucun merge ni déploiement.

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

### 17.3 Validation historique de la méthode OpenAPI §16.7 — à exécuter au LOT-11 final uniquement

**Note de séquencement V2.74 : cette analyse documente la méthode technique, mais ne donne aucune instruction d'exécution immédiate. Le GET est différé au LOT-11 final (§76), après LOT-10.**

La méthode est cohérente avec PostgREST : pour GET/HEAD, Accept-Profile sélectionne le schéma ; un schéma absent de la liste exposée est refusé avec PGRST106. PostgREST indique également que la sélection de schéma s'applique à OpenAPI. Références :
- https://docs.postgrest.org/en/latest/references/api/schemas.html
- https://supabase.com/docs/guides/api/using-custom-schemas

La commande du §16.7 reste un GET seulement et peut être exécutée sans synchroniser le dépôt, car elle ne dépend d'aucun fichier du code local. Interprétation à conserver :
- public accepté (réponse HTTP réussie) et net refusé avec PGRST106 : preuve que net n'est pas dans les schémas exposés par cette Data API à cet instant ; ce résultat ne prouve rien sur les autres contrôles.
- net accepté : LOT-00 reste BLOCKED sur l'exposition du schéma ; aucune correction automatique.
- 401/403, erreur réseau, réponse non JSON, ou résultat différent : BLOCKED/ambigu ; ne rien modifier et faire analyser le rapport.

### 17.4 Critères de fermeture LOT-00 — hors OpenAPI

LOT-00 ne pourra être déclaré PASS que lorsque les preuves suivantes seront regroupées et relues :

1. **Identité** : endpoint et project ref correspondent exactement à JOBLY-E2E ofqqrryamslxoqkklraw.
2. **Storage** : décision explicite que jobly-events et profile-photos doivent être publics ; les buckets privés et les accès attendus sont documentés.
3. **Moindre privilège** : matrice limitée aux tables/routines/objets Storage utilisés par la recette, avec rôle, privilèges directs, RLS, policies applicables et opérations nécessaires. Les écarts doivent être classés et faire l'objet d'un plan approuvé. Aucun grant, policy, bucket ou schéma ne sera modifié dans le cadre de la recette sans autorisation séparée.
4. **Fixtures et runtime** : correspondance des trois fixtures déjà établie en lecture seule ; disponibilité du moyen local d'authentification/runtime JOBLY-E2E à confirmer séparément, sans réinitialiser les mots de passe et sans exposer le secret.

L'OpenAPI public/net est exclu de ces critères et sera traité au LOT-11 final (§76). L'activation RLS sur 180/180 tables est un bon indicateur de couverture technique, mais ne remplace pas les points 2 à 4 et ne suffit pas à certifier les policies de toutes les tables.

### 17.5 Séquence de reprise autorisée — HISTORIQUE, remplacée par §76

**Cette procédure décrivait l'ancien ordre. Elle est supplantée par la décision V2.74 §76 : ne pas exécuter OpenAPI avant la fin des lots précédents.**

**Action autorisée à l'époque :** si la clé affichée dans la ligne `service_role` sous **Legacy API Keys** commence bien par `eyJ`, exécuter exclusivement le contrôle GET OpenAPI du §23.3, puis transmettre uniquement le rapport non sensible `feedback-lot00-net-schema-exposure-v3.txt`. Ne jamais utiliser la clé `anon`.

**Ne pas lancer avant analyse de ce résultat et fermeture LOT-00 :**
- tout smoke Auth/runtime Talent ou Recruteur ;
- le parcours croisé Talent → Recruteur ;
- le runner scripts/e2e-local-recipe.mjs ou tout bulk ;
- les scripts de vérification, provisionnement, restauration ou reset des fixtures ;
- toute commande SQL DDL/DML ou modification de grants/policies/buckets ;
- tout accès JOBLY-PROD, merge PR #266, modification de main ou déploiement.

Après réception du GET corrigé, analyser les codes HTTP et le code PostgREST, puis choisir uniquement le prochain contrôle read-only nécessaire. Ne pas enchaîner automatiquement les opérations.

**Mise à jour V2.13 :** une tentative identique depuis l'environnement Node.js isolé de l'agent a échoué avant réponse HTTP (`fetch failed`, Node.js v22.16.0). Elle ne remplace pas le contrôle opérateur ; voir §21. Aucun résultat HTTP n'a été obtenu et LOT-00 reste PARTIAL.

### 17.6 État de reprise à la date de l'audit — HISTORIQUE, remplacé par §76

- E2E-001 : **PASS STATIQUE LOCAL — 6/6, 0 échec**.
- LOT-00 : **PARTIAL à cette date** ; les exigences OpenAPI mentionnées dans ce bilan sont historiques et désormais reportées au LOT-11 par §76. Les contrôles non-OpenAPI (Storage et matrice grants/policies) restent dans LOT-00.
- Smoke runtime authentifié : **NON AUTORISÉ à cette date** ; les conditions opératoires actuelles sont celles de §76 et des prérequis non-OpenAPI applicables.
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
- La simulation [200~ reproduit l'erreur V6, mais la V7 n'a observé aucun marqueur de collage. Cette hypothèse n'explique donc pas à elle seule le résultat V7 ; cause réelle locale encore inconnue.
- V7 : **exécutée par l'opérateur, rejetée avant HTTP**.
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

---

## 41. Résultat V7 sans marqueur de collage et isolation du presse-papiers — V2.37 — 8 novembre 2026

### 41.1 Résultat non secret transmis

L'opérateur transmet le rapport : node=v26.13.0 ; project_ref=ofqqrryamslxoqkklraw ; expected_credential_type=legacy_service_role ; paste_start_marker_detected=false ; paste_end_marker_detected=false ; normalized_prefix_ok=false ; results=[] ; GATE=BLOCKED_REVIEW_REQUIRED ; error=KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT.

### 41.2 Ce que ce rapport prouve

- La V7 s'est exécutée et le contrôle TTY a été franchi.
- Aucun marqueur de collage reconnu n'a été présent au début ou à la fin de la chaîne reçue.
- Après normalisation, la chaîne capturée ne commence toujours pas par eyJ.
- Les deux requêtes OpenAPI n'ont pas démarré ; results=[].
- Le problème est toujours avant le réseau et avant le décodage des claims JWT.
- L'hypothèse [200~ n'est pas confirmée pour ce run V7.
- Le rapport ne révèle pas la valeur saisie, la longueur capturée ni le premier caractère ; la cause exacte reste inconnue.

### 41.3 Raisonnement par contradiction révisé

L'opérateur confirme que la valeur révélée dans la ligne Legacy service_role commence par eyJ. V7 confirme qu'après collecte et normalisation, la chaîne capturée ne commence pas par eyJ, sans marqueur de collage détecté.

Ces constats situent le défaut dans le parcours local : champ révélé dans le Dashboard ; action Copier / presse-papiers Windows ; transmission du presse-papiers au terminal en mode raw ; accumulation des événements par process.stdin ; normalisation et validation startsWith('eyJ'). Supabase, les claims role/ref et le Data API ne sont pas encore atteints.

### 41.4 Test discriminant sans secret

Avant une nouvelle méthode de saisie de clé, tester le transport terminal avec une chaîne factice placée automatiquement dans le presse-papiers avec la commande Windows clip. Le test utilise le même setRawMode(true) et le même traitement de buffer ; la seule donnée saisie est JOBLY-CLIP-TEST-7A91.

- sentinel_exact_match=true : le terminal sait coller un texte factice dans ce mode ; il faudra ensuite isoler le contenu du presse-papiers au moment du collage de la clé, sans jamais le journaliser.
- sentinel_exact_match=false : le chemin clipboard/TTY raw est en cause ; abandonner ce mode de saisie de clé.
- Le test ne lit aucune clé ni variable d'environnement, ne contacte pas Supabase et n'écrit aucune donnée applicative.
- Le rapport ne contient que des booléens, une longueur non sensible et un statut PASS/BLOCKED.

### 41.5 Commande CMD du test factice

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-input-transport-probe-20261108.txt (
  echo Rapport du test presse-papiers deja present : conservation.
) else (
  echo JOBLY-CLIP-TEST-7A91|clip
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-input-transport-probe-20261108.txt',expected='JOBLY-CLIP-TEST-7A91';function save(r){fs.writeFileSync(report,['node='+process.version,'probe=clipboard_raw_tty','paste_start_marker_detected='+r.start,'paste_end_marker_detected='+r.end,'input_length='+r.length,'sentinel_exact_match='+r.match,'GATE='+(r.match?'PASS_CLIPBOARD_RAW_INPUT':'BLOCKED_INPUT_TRANSPORT')].join('\r\n')+'\r\n',{flag:'wx'});out.write('paste_start_marker_detected='+r.start+'\n paste_end_marker_detected='+r.end+'\n input_length='+r.length+'\n sentinel_exact_match='+r.match+'\n GATE='+(r.match?'PASS_CLIPBOARD_RAW_INPUT':'BLOCKED_INPUT_TRANSPORT')+'\n REPORT='+report+'\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){save({start:false,end:false,length:0,match:false});process.exit(2)}let raw='';out.write('\nTEST SANS SECRET : le texte factice est deja dans le presse-papiers. Appuie sur Ctrl+V (ou clic droit), puis Entree : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();raw='';save({start:false,end:false,length:0,match:false});return}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();const t=raw.replace(/^\uFEFF/,'').trim(),start=/^(?:\u001b)?\[200~/.test(t),end=/(?:\u001b)?\[201~$/.test(t),n=t.replace(/^(?:\u001b)?\[200~/,'').replace(/(?:\u001b)?\[201~$/,'').trim();save({start,end,length:n.length,match:n===expected});raw='';return}if(ch==='\u007f'||ch==='\b')raw=raw.slice(0,-1);else if(ch==='\u001b'||ch>=' ')raw+=ch}})"
)
if exist feedback-lot00-input-transport-probe-20261108.txt notepad feedback-lot00-input-transport-probe-20261108.txt
```

Commande Notepad correspondante :
```bat
notepad feedback-lot00-input-transport-probe-20261108.txt
```

Le test place d'abord le texte factice dans le presse-papiers. À l'invite, appuyer sur Ctrl+V (ou utiliser le geste de collage disponible), puis Entrée. Ne saisir aucune clé.

### 41.6 Résultat attendu

- PASS_CLIPBOARD_RAW_INPUT : texte factice collé exactement.
- BLOCKED_INPUT_TRANSPORT : texte non reçu intact ; abandonner le lecteur Node raw et utiliser une méthode sécurisée compatible Windows avant toute nouvelle tentative de clé.

### 41.7 Statut LOT-00

- V6 : précontrôle local en échec ; aucun HTTP.
- V7 : précontrôle local en échec, sans marqueurs de collage détectés ; aucun HTTP.
- Préfixe eyJ affiché dans Dashboard : confirmé par l'opérateur.
- Préfixe reçu par le parseur V7 : non conforme.
- GET OpenAPI public et net : NON EXÉCUTÉS.
- LOT-00 : PARTIAL / BLOCKED_REVIEW_REQUIRED.
- Aucun secret reçu par l'assistant ; aucun accès JOBLY-PROD ; aucune mutation Supabase, fixture ou permission.
- main inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 41.8 Sources et preuves

- Rapport V7 transmis par l'opérateur.
- Code V7 enregistré au §40.6.
- Node.js TTY : https://nodejs.org/api/tty.html ; le mode raw désactive l'écho et le traitement spécial des caractères et délivre l'entrée caractère par caractère.
- Microsoft Terminal Clipboard.cpp : https://github.com/microsoft/terminal/blob/main/src/interactivity/win32/Clipboard.cpp ; le texte du presse-papiers est converti en événements d'entrée et peut être encadré par des marqueurs bracketed-paste.
- Microsoft Terminal issue #17656 : https://github.com/microsoft/terminal/issues/17656 ; décrit la représentation de marqueurs bracketed-paste en événements Win32.
- Document source avant cette mise à jour : V2.36, blob SHA ec80c4fc146468b3e0a989fed7b62338ddfbbd93, branche e2e/recette.

---

## 42. Contrôle direct du presse-papiers Windows — sans TTY raw — V2.39 — 8 novembre 2026

### 42.1 Motif

V7 a reçu normalized_prefix_ok=false et aucun marqueur de collage. Le préfixe visible dans le Dashboard est confirmé par l'opérateur comme eyJ. Pour départager la copie de la clé du transport clavier/TTY, cette étape lit directement le presse-papiers Windows avec PowerShell Get-Clipboard -Raw. La saisie Node.js en mode raw est ainsi complètement contournée.

Microsoft documente que Get-Clipboard récupère le contenu du presse-papiers, et que -Raw retourne le texte complet en une seule chaîne : https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-clipboard?view=powershell-5.1.

### 42.2 Ce que le contrôle vérifie

- présence d'un contenu presse-papiers non vide ;
- préfixe JWT eyJ ;
- trois segments JWT ;
- décodage JSON du payload ;
- claims role=service_role et ref=ofqqrryamslxoqkklraw.

Le rapport ne contient que des booléens, un statut et une erreur générique. Il ne contient ni clé, ni fragment, ni longueur de la clé, ni payload. Le script efface le presse-papiers après lecture. Aucun appel réseau, aucune requête Supabase, aucune authentification et aucune écriture n'est exécuté dans cette étape.

Cette vérification locale des claims ne valide pas la signature cryptographique du JWT et ne prouve pas son acceptation serveur. Elle permet uniquement de vérifier si la valeur copiée est bien formée et porte les identifiants attendus.

### 42.3 Commande CMD

Copier d'abord, avec le bouton Copier, la valeur de la ligne service_role dans Legacy API Keys du projet JOBLY-E2E. Ne pas la révéler à l'écran. Puis coller et exécuter le bloc CMD ci-dessous ; il lira directement le presse-papiers, sans demander de coller la clé dans le terminal.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-clipboard-jwt-check-20261108.txt (
  echo Rapport du controle presse-papiers deja present : conservation.
) else (
  powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-jwt-check-20261108.txt';$k=$null;$parts=$null;$b64=$null;$payload=$null;$pt=$null;$prefix=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$err='';$cleared=$false;try{$k=Get-Clipboard -Raw;if([string]::IsNullOrWhiteSpace($k)){$err='CLIPBOARD_EMPTY'}else{$k=$k.Trim();$prefix=$k.StartsWith('eyJ');if($prefix){$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');if(($b64.Length % 4) -eq 1){$err='JWT_BASE64URL_INVALID'}else{while(($b64.Length % 4) -ne 0){$b64+='='};$pt=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $pt -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}else{$err='JWT_SEGMENT_COUNT_INVALID'}}else{$err='KEY_PREFIX_INVALID'}}}catch{$err='CLIPBOARD_READ_OR_JWT_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$pt=$null;try{Set-Clipboard -Value '';$cleared=$true}catch{}};$gate=if($prefix -and $three -and $json -and $role -and $ref){'PASS_CLIPBOARD_JWT_METADATA'}else{'BLOCKED_CLIPBOARD_COPY_OR_FORMAT'};$runtime='PowerShell '+$PSVersionTable.PSVersion.ToString();$lines=@('runtime='+$runtime,'project_ref=ofqqrryamslxoqkklraw','clipboard_prefix_eyJ='+$prefix,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_cleared='+$cleared,'GATE='+$gate,'error='+$err);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
)
if exist feedback-lot00-clipboard-jwt-check-20261108.txt notepad feedback-lot00-clipboard-jwt-check-20261108.txt
```

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-clipboard-jwt-check-20261108.txt
```

### 42.4 Lecture des résultats

- PASS_CLIPBOARD_JWT_METADATA : le presse-papiers contient une valeur JWT structurée avec role et ref attendus ; cela démontre que la copie est correcte et que les rejets précédents proviennent du chemin de saisie brut Node.js.
- BLOCKED_CLIPBOARD_COPY_OR_FORMAT : au moins un contrôle local échoue ; le message error et les booléens indiquent l'étape, sans révéler la valeur.
- clipboard_cleared=true : la tentative de nettoyage du presse-papiers a réussi.
- clipboard_cleared=false : nettoyer manuellement le presse-papiers Windows après le contrôle.

Après ce contrôle seulement, si les métadonnées sont correctes, la méthode suivante sera d'exécuter les deux GET OpenAPI depuis PowerShell en lisant directement le presse-papiers, toujours sans echo ni stockage du secret. Aucun endpoint ne doit être appelé avant validation de ce rapport local.

### 42.5 Statut LOT-00

- V6 : rejet local avant HTTP.
- V7 : rejet local avant HTTP ; marqueurs de collage non détectés ; normalized_prefix_ok=false.
- Préfixe révélé dans le Dashboard : eyJ confirmé par l'opérateur.
- Contrôle presse-papiers PowerShell : transmis, non exécuté.
- GET OpenAPI public et net : NON EXÉCUTÉS.
- LOT-00 : PARTIAL / BLOCKED_REVIEW_REQUIRED.
- Aucune clé reçue par l'assistant ; aucun accès JOBLY-PROD ; aucune mutation Supabase, fixture ou permission.
- main inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun déploiement.

### 42.6 Preuves et références

- Rapport V7 opérateur, reproduit au §41.1.
- Supabase JWT Claims Reference : https://supabase.com/docs/guides/auth/jwt-fields ; décrit role et ref comme claims des clés anon/service_role.
- Microsoft Learn Get-Clipboard : https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-clipboard?view=powershell-5.1 ; décrit l'accès au presse-papiers et le paramètre Raw.
- Document source avant cette mise à jour : V2.38, blob SHA dcdd5b1b2bc1de050207d908ef7c04472d6c8f22, branche e2e/recette.


---

## 43. Classification du contenu presse-papiers et remplacement vérifié — V2.40 — 8 novembre 2026

### 43.1 Résultat opérateur du §42

L'opérateur transmet :

```text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_prefix_eyJ=False
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_cleared=False
GATE=BLOCKED_CLIPBOARD_COPY_OR_FORMAT
error=KEY_PREFIX_INVALID
```

Le script a donc lu une valeur textuelle non vide (sinon il aurait produit `CLIPBOARD_EMPTY`) qui ne commençait pas par `eyJ`. Les contrôles JWT suivants n'ont pas pu s'effectuer. Cela ne prouve pas que la clé Supabase elle-même est invalide : le contenu du presse-papiers ne correspond pas au début confirmé dans le Dashboard.

### 43.2 Interprétation de clipboard_cleared=false

La version précédente a tenté `Set-Clipboard -Value ''` dans un bloc `catch` silencieux. Le rapport ne contient pas l'exception ; il est donc impossible de conclure si l'échec provient de la valeur vide, du cmdlet, d'un verrou du presse-papiers ou d'une autre cause. L'indicateur signifie seulement que le script n'a pas confirmé le nettoyage. Ne pas interpréter ce champ comme la preuve que Windows bloque l'accès au presse-papiers.

La documentation Microsoft décrit `Get-Clipboard -Raw` comme une lecture de l'entrée complète, et `Set-Clipboard -Value` comme un remplacement du contenu. La nouvelle procédure remplace par un texte sentinelle non secret et vérifie sa relecture, au lieu d'essayer d'écrire une chaîne vide.

### 43.3 Raisonnement par contradiction actualisé

- Le Dashboard affiche la bonne entrée Legacy `service_role`.
- L'opérateur confirme que la valeur révélée commence par `eyJ`.
- Le contrôle PowerShell a lu un texte qui ne commence pas par `eyJ`.
- Il y a donc divergence entre la valeur révélée et le contenu textuel présent dans le presse-papiers Windows au moment de la lecture.

Les causes encore compatibles avec les preuves sont :
1. Le bouton Copier n'a pas écrit la valeur dans le presse-papiers système (permission/échec d'écriture du navigateur).
2. Le presse-papiers contenait un autre texte ou une ancienne valeur.
3. Le bouton Copier a mis une donnée au format non textuel ou un contenu différent de celui affiché.

La preuve actuelle ne permet pas de choisir entre ces causes. Le mode raw Node.js est désormais secondaire : PowerShell a directement lu le presse-papiers et obtenu un contenu différent.

### 43.4 Diagnostic suivant

Après avoir cliqué sur Copier dans la ligne Legacy `service_role` JOBLY-E2E, lancer le bloc du §43.5. Il va uniquement classifier le presse-papiers :
- `LEGACY_JWT_CANDIDATE` si le texte commence par `eyJ` ;
- `MODERN_SECRET_KEY` s'il commence par `sb_secret_` ;
- `UI_LABEL_TEXT` si le presse-papiers contient seulement `service_role` ou `anon` ;
- `OTHER_TEXT` pour un autre contenu ;
- `EMPTY` si aucun texte n'est disponible.

Si le texte commence par eyJ, il vérifiera aussi le nombre de segments, le JSON du payload et les claims role/ref attendus. Il ne journalise jamais le contenu, le préfixe lui-même, les fragments ou le payload.

Dans tous les cas, il remplace enfin le presse-papiers par `JOBLY-CLIPBOARD-OVERWRITTEN` et vérifie la relecture. Ainsi, si le bouton Copier a bien placé le secret, ce test le retire ensuite du presse-papiers système.

### 43.5 Commande CMD V2.40

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-clipboard-classification-20261108.txt (
  echo Rapport de classification presse-papiers deja present : conservation.
) else (
  powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-classification-20261108.txt';$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;$readError='NONE';$overwriteError='NONE';$hasText=$false;$prefix=$false;$modern=$false;$label=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$kind='UNKNOWN';$bucket='UNKNOWN';$overwritten=$false;try{$k=Get-Clipboard -Raw;$hasText=(-not [string]::IsNullOrWhiteSpace([string]$k));if(-not $hasText){$kind='EMPTY';$bucket='ZERO'}else{$k=([string]$k).Trim();$prefix=$k.StartsWith('eyJ');$modern=$k.StartsWith('sb_secret_');$label=($k -eq 'service_role' -or $k -eq 'anon');if($k.Length -lt 100){$bucket='LT100'}elseif($k.Length -lt 1000){$bucket='100_TO_999'}else{$bucket='GE1000'};if($prefix){$kind='LEGACY_JWT_CANDIDATE';$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');while(($b64.Length % 4) -ne 0){$b64+='='};$decoded=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $decoded -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}elseif($modern){$kind='MODERN_SECRET_KEY'}elseif($label){$kind='UI_LABEL_TEXT'}else{$kind='OTHER_TEXT'}}}catch{$readError='CLIPBOARD_READ_OR_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;try{Set-Clipboard -Value 'JOBLY-CLIPBOARD-OVERWRITTEN' -ErrorAction Stop;$check=Get-Clipboard -Raw;$overwritten=([string]$check -eq 'JOBLY-CLIPBOARD-OVERWRITTEN');$check=$null;if(-not $overwritten){$overwriteError='SENTINEL_READBACK_MISMATCH'}}catch{$overwriteError='CLIPBOARD_OVERWRITE_FAILED'}};$pass=($prefix -and $three -and $json -and $role -and $ref);$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'clipboard_equals_ui_label='+$label,'clipboard_length_bucket='+$bucket,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError;$gate=if($pass){'PASS_CLIPBOARD_JWT_METADATA'}else{'BLOCKED_CLIPBOARD_COPY_OR_FORMAT'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'clipboard_equals_ui_label='+$label,'clipboard_length_bucket='+$bucket,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
)
if exist feedback-lot00-clipboard-classification-20261108.txt notepad feedback-lot00-clipboard-classification-20261108.txt
```

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-clipboard-classification-20261108.txt
```

### 43.6 Lecture du rapport

- `clipboard_kind=LEGACY_JWT_CANDIDATE` avec `role_service_role=true` et `project_ref_match=true` : la copie système correspond bien à la legacy service_role JOBLY-E2E ; la prochaine étape pourra lancer les deux GET OpenAPI depuis PowerShell, sans repasser par Node.js raw.
- `clipboard_kind=MODERN_SECRET_KEY` : le presse-papiers contient une clé moderne, pas le JWT legacy attendu.
- `clipboard_kind=UI_LABEL_TEXT` : le bouton a copié le libellé plutôt que la valeur.
- `clipboard_kind=OTHER_TEXT` : le contenu copié n'est pas le JWT attendu ; la copie côté Dashboard doit être diagnostiquée.
- `clipboard_kind=EMPTY` ou `read_error` : aucun contenu texte utilisable n'a été lu.
- `clipboard_overwrite_verified=true` : le presse-papiers a été remplacé par la sentinelle inoffensive.
- Aucune requête HTTP ne se déclenche dans cette étape.

### 43.7 État LOT-00

- Résultat §42 : `KEY_PREFIX_INVALID`, `clipboard_prefix_eyJ=false`, `clipboard_cleared=false`.
- Le texte lu était non vide, mais son contenu exact n'est pas connu.
- Le nettoyage par chaîne vide n'a pas été confirmé ; la cause n'est pas établie.
- V6/V7 : aucun GET OpenAPI ; les rejets précédents sont pré-HTTP.
- V2.40 : commande de classification transmise, non exécutée.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun secret reçu, lu ou enregistré par l'assistant ; aucune requête JOBLY-PROD ; aucune modification de fixture, donnée, permission ou configuration Supabase.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 43.8 Preuves et références

- Rapport opérateur §43.1.
- Supabase API Keys : `https://supabase.com/docs/guides/getting-started/api-keys`, clés Legacy anon et service_role en JWT, clés modernes `sb_publishable_` / `sb_secret_`.
- Microsoft Learn Get-Clipboard PowerShell 5.1 : `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-clipboard?view=powershell-5.1`, `-Raw` récupère le contenu complet du presse-papiers.
- Microsoft Learn Set-Clipboard PowerShell 5.1 : `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-clipboard?view=powershell-5.1`, le cmdlet définit/remplace l'entrée du presse-papiers.
- Document source avant cette mise à jour : V2.39, blob SHA `7f7b0ab65d32b998bba466c37a3dddfb594cf65f`, branche `e2e/recette`.


---

## 44. Correctif syntaxique du rapport PowerShell de classification — V2.41 — 8 novembre 2026

### 44.1 Revue avant exécution

Une revue statique de la commande du §43.5 a identifié une construction PowerShell incorrecte : `if(...)` était placé directement à l'intérieur d'une concaténation de chaîne `'GATE='+(if(...))`. PowerShell traite `if` comme une instruction ; il faut d'abord lui affecter le résultat dans une variable, puis construire la ligne du rapport.

### 44.2 Correction

La commande du §43.5 est remplacée dans le présent document par la forme corrigée :
- `$gate=if($pass){...}else{...}`
- `'GATE='+$gate` dans le tableau de lignes.

Aucun autre comportement n'est modifié : lecture presse-papiers, classification sans divulgation, parsing local conditionnel, remplacement du presse-papiers par une sentinelle non secrète et vérification de relecture.

### 44.3 État

- Commande PowerShell relue statiquement et construction `if` corrigée.
- Aucun script PowerShell n'a été exécuté par l'assistant ; aucune valeur de presse-papiers lue.
- Le contrôle opérateur du §43.5 reste **À EXÉCUTER** ; aucun résultat anticipé.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun GET OpenAPI n'a eu lieu.
- Aucun accès JOBLY-PROD, aucune mutation Supabase ou fixture.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.
- Document source avant cette correction : V2.40, blob SHA `6fbc062d14a21a3f6ae5e70b5bc502e76c1378fc`.


---

## 45. Test différentiel du bouton Copier — V2.42 — 8 novembre 2026

### 45.1 Résultat opérateur du §43.5

Rapport reçu :

~~~text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_text_present=True
clipboard_kind=OTHER_TEXT
clipboard_prefix_eyJ=False
clipboard_prefix_sb_secret=False
clipboard_equals_ui_label=False
clipboard_length_bucket=GE1000
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_overwrite_verified=True
read_error=NONE
overwrite_error=NONE
GATE=BLOCKED_CLIPBOARD_COPY_OR_FORMAT
~~~

Le presse-papiers contenait un texte non vide de plus de 1 000 caractères, mais aucun des formats de clé attendus ni le libellé UI. Le contenu exact n'a pas été demandé, affiché ou écrit dans le rapport. La sentinelle de remplacement a été relue correctement : la neutralisation du contenu précédent est donc confirmée.

### 45.2 Conclusion probante

Les résultats §42 et §43 convergent : au moment des lectures, le presse-papiers ne contenait pas la valeur Legacy service_role révélée dans le Dashboard. En revanche, ils ne prouvent pas encore que le bouton Copier est lui-même en échec : aucune sentinelle de départ n'avait été déposée et vérifiée juste avant le clic. Le contenu OTHER_TEXT peut être un ancien texte, une sélection copiée depuis un autre élément ou un résultat erroné du bouton.

La différence entre « valeur du presse-papiers non conforme » (établie) et « échec du bouton Copier Supabase » (non établi) doit être conservée. Aucun secret n'a été transmis à l'assistant. Aucun appel HTTP, aucune validation de signature JWT et aucun accès Supabase n'ont eu lieu.

### 45.3 Contrôle discriminant — deux temps

Ce contrôle ne demande jamais de révéler, coller dans le terminal ou transmettre la clé. Le premier bloc écrit une sentinelle inoffensive dans le presse-papiers et vérifie sa relecture. **Ne cliquer sur Copier dans Supabase qu'après avoir obtenu baseline_verified=True.** Le second bloc est exécuté immédiatement après le clic ; il classe le contenu sans l'afficher ni l'enregistrer, puis remplace le presse-papiers par une autre sentinelle et vérifie sa relecture.

#### Étape A — installer la sentinelle témoin

Commande CMD :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-baseline-20261108.txt';$s='JOBLY-CLIPBOARD-BASELINE-20261108';$ok=$false;$err='NONE';try{Set-Clipboard -Value $s -ErrorAction Stop;$r=Get-Clipboard -Raw;$ok=([string]$r -eq $s);$r=$null;if(-not $ok){$err='BASELINE_READBACK_MISMATCH'}}catch{$err='BASELINE_SET_OR_READ_FAILED'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'baseline_verified='+$ok,'error='+$err);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-baseline-20261108.txt
~~~

Si baseline_verified=False, arrêter : ne pas cliquer sur Copier et transmettre uniquement le rapport.

Si baseline_verified=True, ouvrir le projet JOBLY-E2E dans Supabase, confirmer la rangée Legacy API Keys → service_role, révéler la valeur si le Dashboard l'exige, puis cliquer une seule fois sur son bouton Copier. Ne pas sélectionner/copier la page ou le libellé. Ne pas coller la clé dans un champ, un terminal ou un message.

#### Étape B — lire uniquement le statut après clic

Commande CMD, immédiatement après le clic :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-after-copy-20261108.txt';$baseline='JOBLY-CLIPBOARD-BASELINE-20261108';$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;$kind='UNKNOWN';$prefix=$false;$modern=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$hasText=$false;$readError='NONE';$overwriteError='NONE';$overwritten=$false;try{$k=Get-Clipboard -Raw;$hasText=(-not [string]::IsNullOrWhiteSpace([string]$k));if(-not $hasText){$kind='EMPTY_AFTER_COPY'}else{$k=([string]$k).Trim();if($k -eq $baseline){$kind='BASELINE_UNCHANGED'}else{$prefix=$k.StartsWith('eyJ');$modern=$k.StartsWith('sb_secret_');if($prefix){$kind='LEGACY_JWT_CANDIDATE';$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');while(($b64.Length % 4) -ne 0){$b64+='='};$decoded=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $decoded -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}elseif($modern){$kind='MODERN_SECRET_KEY'}else{$kind='OTHER_TEXT'}}}}catch{$readError='CLIPBOARD_READ_OR_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;try{Set-Clipboard -Value 'JOBLY-CLIPBOARD-AFTER-CHECK' -ErrorAction Stop;$q=Get-Clipboard -Raw;$overwritten=([string]$q -eq 'JOBLY-CLIPBOARD-AFTER-CHECK');$q=$null;if(-not $overwritten){$overwriteError='SENTINEL_READBACK_MISMATCH'}}catch{$overwriteError='CLIPBOARD_OVERWRITE_FAILED'}};$pass=($kind -eq 'LEGACY_JWT_CANDIDATE' -and $three -and $json -and $role -and $ref);$gate=if($pass){'PASS_CLIPBOARD_JWT_METADATA'}elseif($kind -eq 'BASELINE_UNCHANGED'){'BLOCKED_COPY_NOT_OBSERVED'}elseif($kind -eq 'OTHER_TEXT' -or $kind -eq 'MODERN_SECRET_KEY' -or $kind -eq 'EMPTY_AFTER_COPY'){'BLOCKED_COPY_CONTENT_NOT_EXPECTED'}else{'BLOCKED_CLIPBOARD_READ_OR_PARSE'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-after-copy-20261108.txt
~~~

### 45.4 Lecture sans surinterprétation

- baseline_verified=False : le test n'a pas démarré correctement ; ne pas interpréter le résultat.
- BASELINE_UNCHANGED / BLOCKED_COPY_NOT_OBSERVED : le clic n'a pas remplacé la sentinelle. Cela confirme que la copie n'a pas atteint le presse-papiers système pendant ce contrôle ; cela ne distingue pas encore permission navigateur, bouton inactif ou autre blocage OS.
- OTHER_TEXT, MODERN_SECRET_KEY ou EMPTY_AFTER_COPY : le presse-papiers a changé ou est devenu vide, mais il ne contient pas la clé JWT attendue ; analyser le mécanisme de copie avant toute requête.
- PASS_CLIPBOARD_JWT_METADATA : la valeur lue a le format JWT et les claims role/ref attendus. Cela ne valide pas la signature cryptographique et n'autorise pas à lui seul à conclure que le serveur l'accepte ; le contrôle OpenAPI pourra ensuite être exécuté de façon masquée sur JOBLY-E2E.
- clipboard_overwrite_verified=True : le presse-papiers est remplacé par la sentinelle non secrète après classification.

### 45.5 État LOT-00 et garde-fous

- V6/V7 : précontrôle local en échec, aucun HTTP.
- §42 : contenu non vide sans préfixe eyJ.
- §43.5 : OTHER_TEXT, GE1000, remplacement sentinelle vérifié.
- Test différentiel §45 : préparé, pas encore exécuté.
- GET OpenAPI public et net : NON EXÉCUTÉS.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun secret transmis, affiché ou enregistré par l'assistant ; aucun appel Supabase ou accès JOBLY-PROD ; aucune mutation des données, fixtures, permissions ou paramètres.
- main inchangée ; PR #266 ouverte, brouillon, non fusionnée ; aucun déploiement.

### 45.6 Référence et provenance

- Rapport opérateur du §43.5, reproduit au §45.1.
- Les conclusions sont limitées aux booléens/étiquettes et à la sentinelle de relecture effectivement rapportés.
- Document source avant cette mise à jour : V2.41, blob SHA b568b52051f181880629f46e08af1157999e6e50, branche e2e/recette.


---

## 46. Résultat confirmé du contrôle de classification presse-papiers — V2.43 — 8 novembre 2026

### 46.1 Résultat opérateur

Le rapport transmis après exécution du contrôle §43.5 indique :

~~~text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_text_present=True
clipboard_kind=OTHER_TEXT
clipboard_prefix_eyJ=False
clipboard_prefix_sb_secret=False
clipboard_equals_ui_label=False
clipboard_length_bucket=GE1000
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_overwrite_verified=True
read_error=NONE
overwrite_error=NONE
GATE=BLOCKED_CLIPBOARD_COPY_OR_FORMAT
~~~

### 46.2 Conclusions strictement établies

- PowerShell a lu du texte non vide, classé OTHER_TEXT, de longueur supérieure ou égale à 1 000 caractères.
- Ce texte ne correspond ni au préfixe d'une clé Legacy JWT (eyJ), ni au préfixe d'une clé moderne (sb_secret_), ni au libellé service_role/anon.
- La lecture n'a signalé aucune erreur.
- Le remplacement par la sentinelle non secrète et sa relecture ont réussi ; le contenu antérieur a donc été remplacé.
- Le contenu exact n'a pas été affiché, transmis ou enregistré.

Ces éléments confirment que le presse-papiers ne contenait pas la clé Legacy attendue au moment du contrôle. Ils ne prouvent toujours pas que le bouton Copier du Dashboard est en panne : aucun état sentinelle vérifié n'avait été posé juste avant le clic. Un contenu ancien ou une copie provenant d'un autre élément reste compatible avec les faits.

### 46.3 Prochaine action unique

Exécuter le test différentiel en deux temps déjà documenté au §45 :
1. Installer la sentinelle et vérifier `baseline_verified=True`.
2. Seulement après ce PASS, cliquer une fois sur Copier dans la ligne Legacy `service_role` du projet JOBLY-E2E, puis exécuter immédiatement le contrôle après-copie du §45.3.

Ne pas relancer V5/V6/V7, ne pas coller la clé dans un terminal ou un message et ne pas tenter de requête HTTP avant que le contrôle local confirme le format et les claims attendus. Aucun secret n'est demandé.

### 46.4 État et périmètre

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` et `net` : non exécutés.
- Aucun appel HTTP, aucune validation de signature JWT, aucune mutation Supabase/fixture.
- JOBLY-PROD non consulté ; `main` inchangée ; PR #266 reste ouverte, brouillon et non fusionnée ; aucun déploiement.
- Source : rapport opérateur transmis dans la conversation ; valeurs non secrètes uniquement.
- Document source : V2.42, branche `e2e/recette`, blob SHA `07927cbd8bc8c8dafe2e88453d380277cc20b145`.


---

## 47. Procédure de correction du transfert presse-papiers — V2.44 — 8 novembre 2026

### 47.1 Objectif

Le contrôle V2.43 a lu OTHER_TEXT (GE1000), et non une clé. La correction doit d'abord prouver que le clic Copier remplace une sentinelle fraîche ; ne pas diagnostiquer le navigateur ou Supabase avant ce test différentiel.

### 47.2 Procédure opérateur

1. Ouvrir le Dashboard Supabase dans le navigateur habituel et sélectionner explicitement le projet JOBLY-E2E, référence `ofqqrryamslxoqkklraw`.
2. Ouvrir Project Settings → API Keys → onglet Legacy API Keys ; repérer la ligne `service_role` portant le badge secret. Ne pas copier la valeur affichée ailleurs et ne pas sélectionner une clé anon/publishable.
3. Vérifier dans les paramètres du site/navigateur que l'accès au presse-papiers n'est pas bloqué pour le domaine du Dashboard. Si une demande d'autorisation apparaît, l'autoriser pour cette session/site. Ne pas activer globalement des permissions sans nécessité.
4. Exécuter le préparateur de sentinelle documenté au §45.2. Continuer uniquement si `baseline_verified=True`.
5. Cliquer une seule fois sur l'icône Copier de la ligne `service_role` (pas sur le bouton de révélation, pas sur un autre champ).
6. Sans coller ni afficher la valeur, exécuter immédiatement le classificateur après-copie du §45.3. Celui-ci vérifie les métadonnées localement et remplace le presse-papiers par une sentinelle non secrète.
7. Interpréter le résultat :
   - `BASELINE_UNCHANGED` : le clic n'a pas modifié le presse-papiers ; recharger le Dashboard, réessayer une seule fois, puis tester un autre navigateur à jour si le résultat persiste.
   - `OTHER_TEXT` : le presse-papiers a changé mais pas vers une clé reconnue ; vérifier que le clic visait bien la ligne `service_role` du projet E2E, puis essayer l'autre navigateur.
   - `PASS_CLIPBOARD_JWT_METADATA` : format et claims locaux attendus ; seulement alors poursuivre le contrôle HTTP masqué du LOT-00.
   - erreur de lecture/écriture ou baseline non vérifiée : le contrôle n'est pas concluant ; ne pas en déduire que la clé est invalide.

### 47.3 Interdictions et critères

- Ne jamais coller la clé dans CMD, PowerShell, un fichier, un rapport, une capture d'écran ou une conversation.
- Ne pas envoyer le contenu du presse-papiers à l'assistant ; seuls les booléens et le code GATE sont nécessaires.
- Ne pas générer/remplacer/révoquer de clé, modifier les permissions Supabase, ni utiliser `net.http_*`.
- Aucun GET OpenAPI n'est autorisé avant `PASS_CLIPBOARD_JWT_METADATA`.
- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'aux réponses HTTP documentées.

### 47.4 État de référence

- Dernière preuve opérateur : V2.43, `OTHER_TEXT`, `GE1000`, sentinelle de remplacement vérifiée.
- Aucune preuve que le bouton Copier est défectueux ; la cause précise n'est pas encore isolée.
- JOBLY-PROD hors périmètre ; `main` inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun déploiement.
- Document source avant mise à jour : V2.43, blob SHA `33462723bb421ff11dc72f7027350cd8c1084e02`, branche `e2e/recette`.


---

## 48. Test différentiel par message témoin — V2.46 — 8 novembre 2026

### 48.1 But et limite de sécurité

L'opérateur souhaite vérifier d'abord un copier-coller dans un champ de message. Ce test est autorisé uniquement avec une chaîne témoin fictive, jamais avec le mot de passe du compte, une clé Supabase, un JWT, un refresh token ou toute autre donnée d'authentification.

Un brouillon de message peut être synchronisé ou autosauvegardé. Le secret réel ne doit donc jamais y être collé, même si le message n'est pas envoyé.

### 48.2 Test sûr du champ de message

1. Ouvrir un nouveau brouillon de message, sans destinataire nécessaire.
2. Saisir exactement cette chaîne non sensible dans le corps : `JOBLY-COPY-TEST-20261108`.
3. Sélectionner uniquement cette chaîne et utiliser Copier.
4. Créer une nouvelle ligne dans le même brouillon et utiliser Coller.
5. Vérifier visuellement que la seconde ligne correspond exactement à `JOBLY-COPY-TEST-20261108` : aucun caractère ajouté, supprimé ou remplacé.
6. Ne pas envoyer le message. Fermer le brouillon et le supprimer/abandonner si l'application le conserve.

Résultats à rapporter, sans capture contenant d'autres données :
- `MESSAGE_CANARY_MATCH=True` si les deux chaînes sont identiques.
- `MESSAGE_CANARY_MATCH=False` si le collage échoue ou diffère.
- `MESSAGE_CANARY_TEST_NOT_RUN` si le champ ne permet pas un brouillon sûr.

Ce test établit uniquement que le copier-coller générique fonctionne dans ce champ. Il ne prouve pas que le bouton Copier de Supabase fonctionne.

### 48.3 Test ciblé du bouton Supabase

Si et seulement si le canari de message correspond :

1. Revenir au Dashboard du projet JOBLY-E2E `ofqqrryamslxoqkklraw`, onglet Legacy API Keys.
2. Exécuter le préparateur de sentinelle du §45.2 et exiger `baseline_verified=True`.
3. Cliquer une seule fois sur Copier dans la ligne `service_role`.
4. Ne coller la valeur nulle part. Exécuter immédiatement le classificateur local du §45.3, qui lit uniquement les métadonnées nécessaires puis remplace le presse-papiers par une sentinelle.
5. Ne transmettre que les lignes de classification non sensibles et le GATE.

Interprétation :
- Canari message faux : problème de copie/collage générique ou de champ ; ne pas poursuivre avec le secret.
- Canari vrai + `BASELINE_UNCHANGED` : le clic Supabase n'a pas remplacé la sentinelle ; recharger le Dashboard, puis un seul nouvel essai contrôlé.
- Canari vrai + `OTHER_TEXT` : le transfert du bouton a changé le presse-papiers mais pas vers le JWT attendu ; revalider le projet et la ligne sélectionnée.
- Canari vrai + `PASS_CLIPBOARD_JWT_METADATA` : format et claims locaux attendus ; ce n'est pas encore une validation de signature ni une preuve d'acceptation serveur.

### 48.4 Interdictions inchangées

- Ne jamais coller un vrai mot de passe ou une clé dans un message, même non envoyé, un e-mail, un chat, un document ou un terminal.
- Ne jamais envoyer le secret à l'assistant, même pour le vérifier ; ne pas en transmettre de préfixe, suffixe ou extrait.
- Ne pas modifier, régénérer ou révoquer les clés ; ne pas toucher aux permissions ; ne pas exécuter `net.http_*`..
- Aucun GET OpenAPI avant `PASS_CLIPBOARD_JWT_METADATA).
- JOBLY-PROD reste strictement hors périmètre ; aucun changement de `main`, aucun déploiement.

### 48.5 État après préparation de la recette

- La procédure est préparée mais pas encore exécutée ; aucun résultat canari n'est revendiqué.
- Le dernier résultat disponible reste celui du §46 : `OTHER_TEXT`, longueur `GE1000`, remplacement sentinelle vérifié.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; GET OpenAPI `public` et `net` non exécutés.
- PR #266 reste la branche de continuité E2E ; cette mise à jour documentaire ne fusionne pas la PR.
- Document source avant cette mise à jour : V2.45, blob SHA `77c4218ccf49239f278c4330da9f5edf09570d27`, branche `e2e/recette`.


---

## 49. Priorisation — recette presse-papiers différable, tests code-only autorisés — V2.47 — 8 novembre 2026

### 49.1 Décision de priorité

Le test canari de message du §48.2 est **OPTIONNEL et DIFFÉRABLE**. Il vérifie seulement le copier-coller générique dans un champ de message ; il ne valide ni le bouton du Dashboard Supabase, ni la clé, ni l'API, ni une fonctionnalité Jobly. Il ne doit pas retarder les recettes autonomes. Il peut être ignoré si le diagnostic du presse-papiers n'est plus nécessaire.

Ne jamais remplacer le canari fictif par un vrai mot de passe, une clé, un JWT ou un jeton. Aucun secret ne doit être collé dans un message, même non envoyé.

Le verrou **LOT-00 reste en revanche un prérequis obligatoire à toute recette runtime qui appelle JOBLY-E2E**. Jusqu'à sa fermeture selon les critères des §§17.4 et 19.5, restent suspendus : smoke navigateur qui appelle les API JOBLY-E2E, authentification réelle, parcours Talent/Recruteur/Partenaire, parcours croisé, exécution du runner E2E complet et toute écriture runtime. Le test canari ne ferme pas LOT-00.

### 49.2 Recette code-only exécutable maintenant

Le groupe `authenticated-runtime-contracts` du fichier `scripts/e2e-bulk-runner.mjs` sélectionne uniquement `scripts/e2e-authenticated-runtime-regression.test.mjs`.

Inspection du code au moment de cette mise à jour :
- le fichier de test contient **6 tests Node.js** ;
- il lit uniquement le texte de `e2e/authenticated-role-smoke.mjs` ;
- il vérifie la présence des contrôles Talent et Recruteur, les limites GET/lecture seule, l'absence d'écriture du profil Talent et l'absence d'insertion de document ;
- il n'exécute pas le smoke authentifié, n'appelle pas Supabase, ne lit aucune fixture et ne modifie aucun compte ou profil.

Cette recette de non-régression statique peut donc être exécutée immédiatement, indépendamment de LOT-00. Son PASS valide uniquement les assertions de structure du code ; il n'autorise aucun runtime et ne prouve pas le comportement réel des API.

### 49.3 Commande opérateur isolée

Depuis CMD Windows, après synchronisation locale de la branche `e2e/recette` au commit documentaire courant et vérification que le répertoire est bien le dépôt Jobly :

~~~bat
cd /d C:\Users\ASUS\Jobly
node --experimental-strip-types scripts/e2e-bulk-runner.mjs --groups authenticated-runtime-contracts
notepad artifacts\e2e\bulk\summary.md
notepad artifacts\e2e\bulk\authenticated-runtime-contracts.log
~~~

Le runner crée `artifacts/e2e/bulk/summary.md`, `summary.json` et le journal du groupe. Transmettre les résultats non sensibles, en indiquant le SHA réellement exécuté. Ne pas lancer le runner global de 7 groupes par déduction de cette seule autorisation.

### 49.4 Ordre de reprise retenu — HISTORIQUE, remplacé par §76

**Ordre historique conservé pour traçabilité ; l'ordre opératoire actuel est celui du §76. OpenAPI est le LOT-11 final, jamais un gate amont.**

1. **À l'époque :** exécuter uniquement le groupe code-only `authenticated-runtime-contracts` ci-dessus et analyser son rapport.
2. **En parallèle, sans runtime :** poursuivre les revues de code et tests locaux explicitement isolés, après vérification de leur absence d'appels réseau, d'Auth, de mutations ou de dépendances à des fixtures.
3. **À reprendre ensuite :** LOT-00, par la procédure de sentinelle §45.2 puis classification §45.3 ; le canari de message §48.2 reste facultatif et peut être sauté.
4. **Seulement après fermeture documentée de LOT-00 :** reprendre les recettes navigateur/API/authentifiées et les parcours métier runtime.

### 49.5 Statut et garde-fous

- Test canari de message : **DIFFÉRÉ / NON BLOQUANT**.
- Groupe `authenticated-runtime-contracts` : **EXÉCUTABLE, NON ENCORE EXÉCUTÉ dans le cadre de cette mise à jour**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun GET OpenAPI `public` ou `net` n'est enregistré.
- Aucun runtime JOBLY-E2E n'a été lancé par cette mise à jour ; aucun accès JOBLY-PROD, aucune mutation de fixture ou de données, aucun changement de `main), aucun déploiement.
- PR #266 demeure ouverte, en brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.46, blob SHA `6df71ed163b5fd95d69ba70f9157317c46804fcc`, branche `e2e/recette`.


---

## 50. Résultat opérateur — authenticated-runtime-contracts — V2.48 — 8 novembre 2026

### 50.1 Rapport transmis

Rapport bulk communiqué par l'opérateur :

~~~text
Date UTC : 2026-11-08T14:15:12.550Z
Commit : e92feb8abc1a2491cab7dd81e834080b80982681
Node.js : v26.13.0
Groupes exécutés en parallèle : 3
Groupes sélectionnés : authenticated-runtime-contracts
Fichiers de test : 1
Résultat : 1/1 groupes réussis

Groupe : Contrats runtime authentifiés Talent, CV et Recruitment 360
Statut : PASS
Tests : 6
Réussis : 6
Échoués : 0
Durée : 0.4 s
Journal : artifacts/e2e/bulk/authenticated-runtime-contracts.log
~~~

### 50.2 Rattachement au code vérifié

Vérifications GitHub effectuées lors de l'enregistrement :
- Le commit exécuté `e92feb8abc1a2491cab7dd81e834080b80982681` existe ; son parent direct est `8385b60400bbaf9cedfcb4aa01073b733533f6c2`.
- Le commit exécuté ne modifie que `docs/e2e/CONTINUITE-RECETTE-E2E.md), sans changement de fichier de code.
- La tête distante de `e2e/recette) est `625d686b11ebc136695494f278b98f606929204f`. La comparaison GitHub depuis le commit exécuté indique 47 commits d'avance, 0 en retard ; l'ensemble des fichiers modifiés sur cette plage se limite au document de continuité.
- La définition du groupe dans `scripts/e2e-bulk-runner.mjs` ne sélectionne qu'un fichier : `scripts/e2e-authenticated-runtime-regression.test.mjs`. Ce fichier contient 6 tests Node.js qui inspectent statiquement le contenu de `e2e/authenticated-role-smoke.mjs`.

Le résultat transmis est donc rattaché au même état de code E2E-001 que celui présent à la tête distante actuelle, les commits ultérieurs vérifiés étant documentaires uniquement. Le rapport a été fourni par l'opérateur ; le journal local lui-même n'a pas été reçu ni inspecté indépendamment.

### 50.3 Portée du PASS

Le PASS démontre que les six assertions statiques du groupe ont réussi. Elles contrôlent notamment :
- la présence des scénarios de lecture Talent (flux local/Afrique, détail d'offre, CV original et Career Journey) ;
- la sélection du détail d'offre à partir du flux authentifié ;
- l'absence d'écriture dans le bloc Talent en lecture seule ;
- la protection de l'URL signée du CV contre sa journalisation ;
- les réponses attendues 403 sur un identifiant de recrutement non détenu et 404 pour une cible documentaire inexistante ;
- l'absence d'insertion de document dans le contrôle négatif.

Ce PASS ne constitue pas une exécution de `e2e/authenticated-role-smoke.mjs). Il ne prouve aucune réponse API runtime, aucune connexion Auth, aucune lecture réelle du flux JOBLY-E2E, aucune sécurité complète RLS/Storage, ni aucun parcours Talent/Recruteur en navigateur. Il n'autorise pas la recette globale ni un runner runtime.

### 50.4 Décision de reprise

- Groupe `authenticated-runtime-contracts` : **PASS — 6/6, 0 échec**.
- Recette statique code-only : résultat enregistré.
- Canari de message §48 : reste différable et non bloquant.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; les GET OpenAPI `public` et `net), la décision sur les buckets publics et la matrice ciblée grants/policies restent à établir selon les critères du §17.4.
- Tant que LOT-00 n'est pas fermé, ne pas exécuter le smoke Auth/runtime, les parcours Talent/Recruteur, le smoke navigateur qui appelle JOBLY-E2E, le parcours croisé, ni le runner E2E complet.
- Aucun accès JOBLY-PROD, aucune mutation de fixture ou de données, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.47, blob SHA `08c7a37a53eb28089b3ddd5fee2c88d6f0f6128a`, branche `e2e/recette`.


---

## 51. Cartographie des six groupes bulk locaux et relance minimale — V2.49 — 8 novembre 2026

### 51.1 Conclusion

Les six groupes de régression de `scripts/e2e-bulk-runner.mjs` ne dépendent pas du gate LOT-00 : leur périmètre est constitué de tests Node.js unitaires ou statiques. Ils n'exécutent ni smoke Auth/runtime, ni appel réseau réel à Supabase, ni ingestion, ni paiement, ni écriture dans une fixture.

Les contrôles non-OpenAPI du préflight LOT-00 (identité projet, disponibilité des fixtures, isolation et éléments de sécurité read-only applicables) restent requis pour les scénarios runtime concernés. **Le GET OpenAPI n'est pas requis à l'entrée** : il est réservé au LOT-11 final après LOT-10.

### 51.2 Inventaire des groupes et volumes de tests inspectés

| Groupe | Fichiers | Tests dans les fichiers | Nature contrôlée |
|---|---:|---:|---|
| `identity-talent-recruiter` | 4 | 66 | Auth, assistant candidature externe, CV/Talent, rôles Recruteur ; assertions de code et de contrats |
| `africa-mobility` | 3 | 38 | Fraîcheur des offres, règles Mobility et segmentation des requêtes batch avec fonction de chargement simulée |
| `jia-360-android` | 10 | 71 | Fonctions J'IA, règles de conversation, isolation et inventaire d'interface ; assertions locales |
| `events-billing-ecosystem` | 5 | 30 | Règles Events, éligibilité billing, communauté, logos et watermark ; sans appel fournisseur |
| `mobile-money` | 7 | 66 | Parsing SMS, matching, configuration, partage client et assertions Android ; données et fonctions de test simulées |
| `security-offline` | 4 | 31 | Rate limiting, droits, offline et vérification HIBP avec `fetchImpl` simulé |
| **Total** | **33** | **302** | **Code-only / local** |

Le groupe `authenticated-runtime-contracts` est distinct : son fichier unique contient 6 tests et a désormais un résultat opérateur **PASS 6/6**, enregistré au §50.

### 51.3 Différentiel de code depuis la campagne 302/302

La campagne antérieure de six groupes, enregistrée au §11, totalise 302/302. Le commit historique communiqué pour la campagne est `60a40dbc60bb8d3a7b069e96291a0a375a01911e).

Comparaison GitHub entre ce commit et `e92feb8abc1a2491cab7dd81e834080b80982681) :
- 11 commits d'avance, aucun commit en retard ;
- parmi les six groupes historiques, le seul fichier de test existant modifié est `scripts/talent-cv-application-regression.test.mjs`, qui appartient à `identity-talent-recruiter` (une insertion et une suppression dans ce fichier) ;
- `scripts/e2e-bulk-runner.mjs` ajoute le groupe `authenticated-runtime-contracts`, sans remplacer les définitions des six groupes historiques ;
- les autres changements portent sur `e2e/authenticated-role-smoke.mjs), `scripts/e2e-local-recipe.mjs), le nouveau test `scripts/e2e-authenticated-runtime-regression.test.mjs` et le document de continuité ; ils ne modifient pas les cinq autres suites bulk.

Conséquence : les cinq groupes `africa-mobility`, `jia-360-android`, `events-billing-ecosystem`, `mobile-money` et `security-offline` conservent leur preuve précédente, leurs fichiers de test n'ayant pas changé dans le différentiel contrôlé. Il n'est pas nécessaire de les relancer uniquement pour débloquer LOT-00. Le groupe `identity-talent-recruiter` doit être relancé pour rafraîchir sa preuve sur la version modifiée du test CV.

### 51.4 Commande minimale à exécuter maintenant

Depuis CMD Windows, dans le dépôt Jobly et sur la branche locale `e2e/recette) :

~~~bat
cd /d C:\Users\ASUS\Jobly
node --experimental-strip-types scripts/e2e-bulk-runner.mjs --groups identity-talent-recruiter
notepad artifacts\e2e\bulk\summary.md
notepad artifacts\e2e\bulk\identity-talent-recruiter.log
~~~

Le runner écrit uniquement les rapports du groupe dans `artifacts/e2e/bulk`. Transmettre le SHA local effectivement testé ainsi que les lignes du rapport ; ne pas lancer le runner E2E global.

### 51.5 Statut et limites

- Six groupes historiques : **302/302 PASS précédemment enregistré** ; cinq groupes inchangés, preuve conservée.
- `identity-talent-recruiter` : **PASS — 66/66**, preuve fraîche reçue au §52 sur le commit `e92feb8abc1a2491cab7dd81e834080b80982681`.
- `authenticated-runtime-contracts` : **PASS 6/6**, cf. §50.
- Les recettes code-only n'établissent pas la disponibilité des API, la validité des fixtures, l'authentification réelle, les permissions runtime ni les parcours utilisateur.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; les recettes runtime demeurent suspendues.
- Aucun accès JOBLY-PROD, aucune mutation Supabase/fixture, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.48, blob SHA `5c504ec11128ae45f1aa1ed25f686f3ea8cccdfe`, branche `e2e/recette`.


---

## 52. Résultat opérateur — identity-talent-recruiter — V2.50 — 8 novembre 2026

### 52.1 Rapport reçu

~~~text
Date UTC : 2026-11-08T14:20:15.634Z
Commit : e92feb8abc1a2491cab7dd81e834080b80982681
Node.js : v26.13.0
Groupes exécutés en parallèle : 3
Groupe sélectionné : identity-talent-recruiter
Fichiers de test : 4
Résultat : 1/1 groupe réussi

Tests : 66
Réussis : 66
Échoués : 0
Durée : 0.9 s
Journal : artifacts/e2e/bulk/identity-talent-recruiter.log
~~~

### 52.2 Vérification du SHA et de la définition du groupe

- Le commit `e92feb8abc1a2491cab7dd81e834080b80982681` existe sur GitHub ; son parent direct est `8385b60400bbaf9cedfcb4aa01073b733533f6c2`.
- Le commit exécuté n'apporte qu'une modification documentaire. Il ne modifie aucun fichier de test ou code applicatif.
- Le runner `scripts/e2e-bulk-runner.mjs` à ce commit définit `identity-talent-recruiter` avec les quatre fichiers suivants : `scripts/authentication-flow-regression.test.mjs`, `scripts/external-application-assistant.test.mjs`, `scripts/talent-cv-application-regression.test.mjs` et `scripts/recruiter-role-regression.test.mjs`.
- La comparaison GitHub entre `e92feb8...` et la tête distante actuelle de `e2e/recette` (`52443728249c05748a96cfda4be980d74e9ba70b)) indique 49 commits d'avance, aucun en retard ; les commits ultérieurs n'ont modifié que `docs/e2e/CONTINUITE-RECETTE-E2E.md`.
- Le commit de campagne historique `60a40dbc60bb8d3a7b069e96291a0a375a01911e` vers `e92feb8...` montrait que le seul fichier de test de ces six groupes modifié était `scripts/talent-cv-application-regression.test.mjs), précisément réexécuté dans le présent groupe. Les cinq autres groupes gardent leur preuve antérieure, sous réserve du périmètre de code comparé au §51.3.

Le rapport opérateur est cohérent avec la définition du groupe et la version de code. Le journal local n'a pas été transmis et n'a donc pas fait l'objet d'une inspection indépendante.

### 52.3 Bilan actualisé des six groupes locaux

- Les six groupes historiques totalisent 302 tests dans leur définition.
- Les cinq groupes restés inchangés conservent les PASS précédents (236 tests).
- Le groupe `identity-talent-recruiter` est désormais revalidé : 66/66 PASS.
- Le groupe supplémentaire `authenticated-runtime-contracts` a aussi son PASS propre : 6/6, cf. §50.

Les six groupes locaux sont donc tous couverts par une preuve PASS ; il n'est pas nécessaire de les relancer à nouveau uniquement pour contourner ou attendre LOT-00. Les résultats proviennent de plusieurs exécutions et ne doivent pas être présentés comme un seul run bulk simultané.

### 52.4 Portée et suite

- Recettes code-only bulk : les six groupes historiques sont **PASS couverts** ; le groupe additionnel `authenticated-runtime-contracts` est **PASS 6/6**.
- Ces résultats ne prouvent pas l'authentification réelle, les réponses HTTP de JOBLY-E2E, l'accès aux données, les politiques RLS/Storage en runtime, ni les parcours métier en navigateur.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; il bloque toujours les recettes runtime.
- Les recettes locales supplémentaires ne doivent être lancées que si elles couvrent un code ou un risque non déjà testé ; éviter les relances redondantes.
- Prochaine frontière de validation métier : terminer LOT-00 avec preuves read-only, puis reprendre Auth/runtime, smoke navigateur et parcours E2E.
- Aucun accès JOBLY-PROD, aucune mutation Supabase/fixture, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.49, blob SHA `8ac9cdf0e73b0a81044d3015c868c77752dd82dc`, branche `e2e/recette`.


---

## 53. Reprise ciblée LOT-00 après clôture des groupes bulk locaux — V2.51 — 8 novembre 2026

### 53.1 Décision de reprise

À la suite des PASS consignés aux §§50 et 52, l'opérateur valide l'arrêt des relances bulk locales redondantes et la reprise ciblée de LOT-00. Le test canari du champ de message §48 reste différé et n'est pas un prérequis.

### 53.2 Prochaine action opérateur — établir la sentinelle de départ

Exécuter uniquement l'étape A du §45.3 pour poser et relire la sentinelle locale. Commande CMD :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-baseline-20261108.txt';$s='JOBLY-CLIPBOARD-BASELINE-20261108';$ok=$false;$err='NONE';try{Set-Clipboard -Value $s -ErrorAction Stop;$r=Get-Clipboard -Raw;$ok=([string]$r -eq $s);$r=$null;if(-not $ok){$err='BASELINE_READBACK_MISMATCH'}}catch{$err='BASELINE_SET_OR_READ_FAILED'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'baseline_verified='+$ok,'error='+$err);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-baseline-20261108.txt
~~~

Décision :
- Si `baseline_verified=True` : la sentinelle est bien installée. L'étape suivante peut être le clic unique sur Copier de la ligne Legacy `service_role` du projet JOBLY-E2E, immédiatement suivi du classificateur après-copie §45.3 étape B.
- Si `baseline_verified=False` ou erreur : arrêter avant le clic Supabase ; transmettre uniquement le contenu non sensible du rapport pour diagnostic.

### 53.3 Interdictions et état

- Ne jamais coller le mot de passe, la clé, un JWT ou un jeton dans un message, terminal, fichier, rapport ou conversation.
- Ne pas envoyer de secret ni d'extrait de secret à l'assistant.
- Le canari de message §48 est différé.
- Ne pas modifier/régénérer/révoquer de clé, ni changer les permissions, ni appeler `net.http_*`.
- Aucun GET OpenAPI avant `PASS_CLIPBOARD_JWT_METADATA`.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun GET OpenAPI `public`/ `net` n'est établi.
- Aucun accès JOBLY-PROD, aucune mutation Supabase/fixture, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.50, blob SHA `af8ea3eafa44f189feddc24c3703cf89b11ec357`, branche `e2e/recette`.


---

## 54. Résultat opérateur — sentinelle presse-papiers initiale PASS — V2.52 — 8 novembre 2026

### 54.1 Résultat reçu

~~~text
runtime=PowerShell 5.1.19041.4522
baseline_verified=True
error=NONE
~~~

### 54.2 Conclusion exacte

- PowerShell 5.1 a écrit la sentinelle non secrète `JOBLY-CLIPBOARD-BASELINE-20261108` et a relu exactement la même chaîne.
- Le contrôle de départ du presse-papiers est **PASS**.
- Cela prouve que PowerShell peut écrire et relire le presse-papiers Windows dans cette session.
- Cela ne prouve pas encore que le bouton Copier du Dashboard Supabase copie le contenu attendu, ni que le JWT est valide ou accepté par le serveur.

### 54.3 Prochaine action unique

1. Dans le Dashboard Supabase, vérifier le projet JOBLY-E2E `ofqqrryamslxoqkklraw), puis la ligne Legacy API Keys `service_role) avec badge `secret`.
2. Cliquer une seule fois sur l'icône Copier de cette ligne.
3. Ne pas coller le secret dans un message, un terminal, un fichier ou un champ.
4. Exécuter immédiatement la commande de classification du §45.3 étape B. Elle ne consigne que les indicateurs booléens et le GATE, puis remplace le presse-papiers par une sentinelle non secrète.
5. Ouvrir le rapport avec la commande Notepad prévue et ne transmettre que les lignes non sensibles.

Le résultat déterminant attendu à cette étape est `PASS_CLIPBOARD_JWT_METADATA). Tout autre GATE reste bloqué et devra être diagnostiqué sans transmettre le contenu du presse-papiers.

### 54.4 Garde-fous et état

- Aucun secret n'a été lu par l'assistant, affiché ou transmis ; le rapport communiqué ne contient que la version PowerShell, un booléen et un code d'erreur.
- Aucun GET OpenAPI n'a été exécuté ; aucune validation de signature JWT ou d'acceptation serveur n'a eu lieu.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucun changement de `main) ; aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.51, blob SHA `5e9b6ffb08cea3244d1f5bbb65fc82b2f29a571a`, branche `e2e/recette`.


---

## 55. Résultat opérateur — clic Copier remplace la sentinelle par OTHER_TEXT — V2.53 — 8 novembre 2026

### 55.1 Résultat communiqué

~~~text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_text_present=True
clipboard_kind=OTHER_TEXT
clipboard_prefix_eyJ=False
clipboard_prefix_sb_secret=False
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_overwrite_verified=True
read_error=NONE
overwrite_error=NONE
GATE=BLOCKED_COPY_CONTENT_NOT_EXPECTED
~~~

### 55.2 Rapprochement avec la sentinelle initiale

Le contrôle précédent §54 avait établi `baseline_verified=True` avec la sentinelle `JOBLY-CLIPBOARD-BASELINE-20261108`. Le résultat ci-dessus est celui transmis après le clic sur Copier et le classificateur §45.3 étape B.

Conclusions limitées aux preuves :
- Le presse-papiers était non vide au contrôle après-clic.
- Son contenu n'était plus égal à la sentinelle initiale ; il a donc changé entre le dépôt de la sentinelle et la lecture après-clic.
- Le contenu n'a pas le préfixe d'un JWT Legacy (`eyJ`) ni celui d'une clé moderne (`sb_secret_`).
- Il ne contient pas un JWT à trois segments reconnu, et les claims `role=service_role` / `ref=ofqqrryamslxoqkklraw` ne sont pas établis.
- La lecture n'a pas échoué. Le remplacement ultérieur par la sentinelle de contrôle a réussi.

On peut donc confirmer que le presse-papiers a été modifié après la baseline, mais pas que le bouton ait copié la clé. Le contenu exact, sa longueur et sa nature ne sont pas connus, car le classificateur ne les a pas consignés. Ne pas conclure que Supabase a rejeté la clé : aucune requête HTTP n'a eu lieu.

### 55.3 Contexte technique Supabase

La documentation Supabase consultée le 8 novembre 2026 indique que les clés Legacy `anon` et `service_role` sont des JWT, tandis que les nouvelles clés secret sont des chaînes opaques `sb_secret_...`. Les deux familles de clés peuvent coexister jusqu'à désactivation explicite des anciennes clés. Références :
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys

Le gate actuellement préparé vise explicitement la ligne Legacy `service_role` du projet JOBLY-E2E ; il ne faut pas substituer une autre valeur ni migrer les variables du projet dans cette étape de diagnostic.

### 55.4 Prochaine vérification ciblée

Ne pas répéter immédiatement le clic dans la même condition sans vérifier sa cible :
1. Retourner à **Project Settings → API Keys → Legacy API Keys** du projet `ofqqrryamslxoqkklraw`.
2. Confirmer visuellement que la ligne est celle nommée `service_role` avec le badge `secret` ; ne pas utiliser l'onglet des nouvelles clés, le bouton de révélation seul, le JWT Signing Secret, ou un bouton Copier associé à un autre champ.
3. Si la valeur est masquée, le bouton Copier doit être celui associé à la valeur de la ligne `service_role`, pas celui du nom de ligne ou d'un panneau voisin.
4. Avant tout nouvel essai, installer à nouveau la sentinelle et exiger `baseline_verified=True).
5. Pour le nouvel essai, reposer d'abord la sentinelle puis utiliser la commande enrichie du §56.1. Elle ne révèle aucun contenu ; elle ajoute seulement longueur par tranche, égalité avec quelques libellés statiques, indicateurs de forme, format JWT, claims role/ref et GATE. Le rapport ne doit jamais afficher, hacher ou sauvegarder la valeur.

Si le Dashboard confirme visuellement la bonne ligne mais que le résultat reste `OTHER_TEXT), interrompre les tentatives répétées et tester une seule fois dans un navigateur à jour différent, avec la même procédure de sentinelle.

### 55.5 État et garde-fous

- Clic Copier : **CONTENU MODIFIÉ, MAIS VALEUR ATTENDUE NON PROUVÉE**.
- `PASS_CLIPBOARD_JWT_METADATA) : non obtenu.
- GET OpenAPI `public` et `net) : non exécutés.
- Signature JWT et acceptation par le serveur : non testées.
- Aucun secret n'a été communiqué à l'assistant ; aucune mutation Supabase/fixture ; aucun accès JOBLY-PROD ; aucun changement de `main) ; aucun déploiement.
- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.52, blob SHA `93167da9abdd64ab72f9ada43a580e5801c1b4f7`, branche `e2e/recette`.


---

## 56. Commande de classification enrichie du presse-papiers — V2.54 — 8 novembre 2026

### 56.1 Utilisation

À n'utiliser qu'après avoir vérifié de nouveau la sentinelle de départ avec l'étape A du §45.3, puis après un clic unique sur le bouton Copier associé à la valeur de la ligne Legacy service_role du projet JOBLY-E2E. Aucun collage manuel. Le contenu exact n'est jamais affiché ni écrit dans un fichier ; le script remplace le presse-papiers par une sentinelle avant de terminer.

Commande CMD :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-after-copy-detail-20261108.txt';$baseline='JOBLY-CLIPBOARD-BASELINE-20261108';$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;$kind='UNKNOWN';$prefix=$false;$modern=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$hasText=$false;$lengthBucket='UNKNOWN';$labelService=$false;$labelAnon=$false;$labelSecret=$false;$labelCopy=$false;$masked=$false;$looksJson=$false;$looksHtml=$false;$whitespace=$false;$readError='NONE';$overwriteError='NONE';$overwritten=$false;try{$k=Get-Clipboard -Raw;$hasText=(-not [string]::IsNullOrWhiteSpace([string]$k));if(-not $hasText){$kind='EMPTY_AFTER_COPY'}else{$k=([string]$k).Trim();if($k.Length -le 32){$lengthBucket='LE32'}elseif($k.Length -le 256){$lengthBucket='LE256'}elseif($k.Length -le 1000){$lengthBucket='LE1000'}else{$lengthBucket='GT1000'};$labelService=($k -ieq 'service_role');$labelAnon=($k -ieq 'anon');$labelSecret=($k -ieq 'secret');$labelCopy=($k -match '^(copy|copied|copy key|copied to clipboard)$');$masked=($k -match '^[*xX.]{4,}$');$looksJson=($k.StartsWith('{') -or $k.StartsWith('['));$looksHtml=$k.StartsWith('<');$whitespace=($k -match '\s');$prefix=$k.StartsWith('eyJ');$modern=$k.StartsWith('sb_secret_');$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($k -eq $baseline){$kind='BASELINE_UNCHANGED'}elseif($prefix){$kind='LEGACY_JWT_CANDIDATE';if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');while(($b64.Length % 4) -ne 0){$b64+='='};$decoded=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $decoded -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}elseif($modern){$kind='MODERN_SECRET_KEY'}elseif($labelService -or $labelAnon -or $labelSecret -or $labelCopy){$kind='UI_LABEL'}elseif($masked){$kind='MASKED_PLACEHOLDER'}elseif($looksJson){$kind='JSON_TEXT'}elseif($looksHtml){$kind='HTML_TEXT'}else{$kind='OTHER_TEXT'}}}catch{$readError='CLIPBOARD_READ_OR_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;try{Set-Clipboard -Value 'JOBLY-CLIPBOARD-AFTER-CHECK' -ErrorAction Stop;$q=Get-Clipboard -Raw;$overwritten=([string]$q -eq 'JOBLY-CLIPBOARD-AFTER-CHECK');$q=$null;if(-not $overwritten){$overwriteError='SENTINEL_READBACK_MISMATCH'}}catch{$overwriteError='CLIPBOARD_OVERWRITE_FAILED'}};$pass=($kind -eq 'LEGACY_JWT_CANDIDATE' -and $three -and $json -and $role -and $ref);$gate=if($pass){'PASS_CLIPBOARD_JWT_METADATA'}elseif($kind -eq 'BASELINE_UNCHANGED'){'BLOCKED_COPY_NOT_OBSERVED'}elseif($kind -eq 'OTHER_TEXT' -or $kind -eq 'UI_LABEL' -or $kind -eq 'MASKED_PLACEHOLDER' -or $kind -eq 'JSON_TEXT' -or $kind -eq 'HTML_TEXT' -or $kind -eq 'MODERN_SECRET_KEY' -or $kind -eq 'EMPTY_AFTER_COPY'){'BLOCKED_COPY_CONTENT_NOT_EXPECTED'}else{'BLOCKED_CLIPBOARD_READ_OR_PARSE'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_length_bucket='+$lengthBucket,'clipboard_equals_service_role_label='+$labelService,'clipboard_equals_anon_label='+$labelAnon,'clipboard_equals_secret_label='+$labelSecret,'clipboard_equals_copy_label='+$labelCopy,'clipboard_looks_masked='+$masked,'clipboard_looks_like_json='+$looksJson,'clipboard_looks_like_html='+$looksHtml,'clipboard_contains_whitespace='+$whitespace,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-after-copy-detail-20261108.txt
~~~

### 56.2 Interprétation

- UI_LABEL + LE32 : le texte copié est probablement un libellé court, pas une clé ; vérifier l'icône précise.
- MASKED_PLACEHOLDER : le presse-papiers contient un masque de valeur ; le bouton copier n'a pas fourni la clé révélée.
- JSON_TEXT ou HTML_TEXT : le navigateur a copié un bloc de structure/markup plutôt que la valeur brute ; arrêter et tester une seule fois avec un autre navigateur si la bonne icône est confirmée.
- OTHER_TEXT : le contenu est non reconnu ; les indicateurs de longueur et de forme aideront à choisir le prochain contrôle sans le révéler.
- LEGACY_JWT_CANDIDATE sans claims attendus : ne pas poursuivre vers HTTP.
- PASS_CLIPBOARD_JWT_METADATA : format et claims locaux attendus seulement ; la signature et l'acceptation par le serveur ne sont pas validées.

### 56.3 Garde-fous

Aucun GET OpenAPI avant PASS. Ne pas copier ou transmettre le contenu par une autre méthode. Aucun changement de clé, permission, fixture, production ou déploiement. LOT-00 reste PARTIAL / BLOCKED_REVIEW_REQUIRED jusqu'aux preuves HTTP et aux contrôles de sécurité restants.

Document source avant cette mise à jour : V2.53, blob SHA 37ae675855214e2df7b2211316e3bff69e751f37, branche e2e/recette.


---

## 57. Nouvelle tentative contrôlée de classification du presse-papiers — V2.55 — 8 novembre 2026

### 57.1 Motif

Le résultat précédent (§55) était `OTHER_TEXT` après une baseline qui avait réussi (§54). Il établit que le presse-papiers a changé, mais pas que le bouton a copié la clé Legacy. Le classificateur détaillé du §56 est donc retenu pour un nouvel essai unique, après contrôle visuel de la cible du bouton.

### 57.2 Séquence opérateur à répéter

1. Ouvrir explicitement le projet JOBLY-E2E `ofqqrryamslxoqkklraw` dans Supabase.
2. Ouvrir **Project Settings → API Keys → Legacy API Keys**.
3. Identifier la ligne `service_role` portant le badge `secret`. Ne pas confondre l'icône Copier de la valeur avec Copier le nom, Révéler, une autre clé ou le JWT Signing Secret.
4. Exécuter l'étape A de §45.3 pour réinstaller et vérifier la sentinelle. Continuer uniquement si `baseline_verified=True`.
5. Cliquer une seule fois sur l'icône Copier attachée à la valeur de cette ligne.
6. Immédiatement exécuter la commande détaillée du §56.1, puis ouvrir son rapport avec Notepad.
7. Communiquer uniquement les lignes non sensibles du rapport.

### 57.3 Décision selon le résultat

- `PASS_CLIPBOARD_JWT_METADATA` : la forme JWT et les claims locaux `role=service_role` / `ref=ofqqrryamslxoqkklraw` sont établis. Cela ne valide pas la signature ni l'acceptation serveur ; le GET OpenAPI contrôlé pourra alors être préparé.
- `BASELINE_UNCHANGED` ou `UI_LABEL` : le bouton n'a pas fourni le secret attendu ; vérifier la cible exacte du bouton. Ne pas continuer vers HTTP.
- `OTHER_TEXT`, `JSON_TEXT`, `HTML_TEXT`, `MASKED_PLACEHOLDER` ou erreur : ne pas multiplier les clics dans le même navigateur. Si la ligne et le bouton sont visuellement confirmés, effectuer au maximum un essai dans un autre navigateur à jour, en recommençant par la sentinelle.
- Aucun contenu du presse-papiers ne doit être affiché, collé dans une conversation, copié dans un fichier ou envoyé à l'assistant.

### 57.4 État et garde-fous

- Cette section décrit une procédure à exécuter ; aucun nouveau résultat de presse-papiers n'est déclaré ici.
- Aucun GET OpenAPI n'a été exécuté à ce stade ; aucune signature JWT ni acceptation serveur n'est validée.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucun accès à une clé de production ; aucun changement de `main) ; aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.54, blob SHA `44551e84248808579fd2e011e48924943896f675`, branche `e2e/recette`.


---

## 58. Pause des essais presse-papiers répétitifs — V2.56 — 8 novembre 2026

### 58.1 Décision opératoire

Après plusieurs tentatives de classification qui n'ont pas établi le contenu attendu du presse-papiers, l'opérateur signale une fatigue/frustration légitime. **Les essais répétés dans le même navigateur sont suspendus.** Ne pas lui redemander immédiatement de répéter les étapes §45, §56 ou §57.

### 58.2 Faits conservés

- La baseline Windows/PowerShell a été vérifiée : `baseline_verified=True`.
- Après le clic Copier, le classificateur simple a retourné `OTHER_TEXT`, puis `GATE=BLOCKED_COPY_CONTENT_NOT_EXPECTED`.
- Aucun secret n'a été communiqué ni enregistré.
- Aucun appel OpenAPI n'a été exécuté ; aucune preuve d'acceptation ou de rejet serveur n'existe.
- L'origine de `OTHER_TEXT` reste indéterminée ; ne pas l'attribuer avec certitude à Supabase, au navigateur ou à PowerShell.

### 58.3 Changement de stratégie requis

La prochaine reprise ne doit pas répéter le même geste. Préparer une méthode alternative qui évite de transmettre ou d'afficher le secret : vérifier d'abord les possibilités locales déjà authentifiées, par exemple la présence d'une session Supabase CLI ou d'une configuration locale JOBLY-E2E, sans afficher les valeurs secrètes, sans modifier les clés et sans lancer d'appel HTTP avant validation des prérequis. Si aucune méthode sûre n'est disponible, reporter le contrôle credential et poursuivre uniquement les recettes code-only non redondantes.

Aucune recherche de secret sur le disque, aucun dump d'environnement, aucun affichage de variable secrète, aucune transmission dans le chat, aucun appel `net.http_*`, aucun accès JOBLY-PROD.

### 58.4 État

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Le test presse-papiers est **PAUSED**, pas PASS ni FAIL.
- Aucun GET OpenAPI `public`/`net` n'a été exécuté.
- Aucun compte, fixture, mot de passe, permission ou clé n'a été modifié.
- Aucun changement de `main`, aucune fusion et aucun déploiement.
- PR #266 reste ouverte, en brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.55, blob SHA c8b5977caa546cdf1a5b56daddfbbd91246087b0, branche `e2e/recette`.


---

## 59. Voie alternative CLI pour LOT-00 — V2.57 — 8 novembre 2026

### 59.1 Découverte vérifiée

La documentation Supabase actuelle présente une voie officielle hors Dashboard pour lister les clés d'un projet avec la CLI :

`supabase projects api-keys --project-ref <project-ref>`

La documentation distingue bien les clés Legacy `anon`/`service_role` (JWT) des nouvelles clés `sb_publishable_...`/`sb_secret_...`. Le chemin CLI permet d'éviter le bouton Copier du navigateur. Sources consultées le 8 novembre 2026 :
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/reference/cli/supabase-projects-api-keys

### 59.2 Vérifications non destructives via le connecteur Supabase

Pour le seul projet autorisé `JOBLY-E2E` / `ofqqrryamslxoqkklraw` :
- `get_project` retourne `ACTIVE_HEALTHY`, région `eu-west-1`.
- `get_publishable_keys` retourne la clé Legacy `anon` avec `disabled=false), ainsi que la clé `default` de type publishable avec `disabled=false`.
- Cette réponse ne contient pas la clé `service_role` et ne prouve pas à elle seule son état ; elle ne permet donc pas de clore LOT-00.
- Aucun endpoint de lecture sécurisée de la clé `service_role` n'est exposé dans les outils Supabase connectés à cette session.

### 59.3 Plan de substitution au presse-papiers

- Suspendre définitivement les essais de copie Dashboard (§58).
- Vérifier localement la présence de la CLI Supabase et l'existence d'une session Management API déjà authentifiée. Le contrôle préliminaire utilise uniquement `supabase --version` et `supabase projects list`, sans afficher ni enregistrer de clé.
- Si la CLI est présente et authentifiée, utiliser ensuite `supabase projects api-keys --project-ref ofqqrryamslxoqkklraw` depuis un processus local qui capture sa sortie uniquement en mémoire, sélectionne la clé Legacy dont les claims JWT sont `role=service_role` et `ref=ofqqrryamslxoqkklraw), puis exécute exclusivement les GET OpenAPI prévus au §16.7.
- La valeur ne doit jamais être imprimée, copiée dans le presse-papiers, écrite dans un fichier, ajoutée à une commande, ou transmise à l'assistant. Seuls les statuts HTTP, codes PostgREST et indicateurs de validation sont conservés.
- Si la CLI n'est pas installée ou si aucune session authentifiée n'existe, arrêter le chemin CLI et décider ensuite de l'installation/authentification locale ; ne pas demander de PAT ou de clé dans le chat.
- Ne pas utiliser `--reveal` pour tenter d'exposer une nouvelle clé `sb_secret_...` : le gate actuel vise explicitement la clé Legacy `service_role`.

### 59.4 État et interdictions

- La voie CLI est **identifiée, mais non encore exécutée sur le poste Windows de l'opérateur**.
- Le prochain contrôle demandé est uniquement le préflight non secret ci-dessous ; aucun GET OpenAPI n'est lancé par ce préflight.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-cli-preflight-20261108.txt';$available=$false;$version='NOT_FOUND';$auth='NOT_CHECKED';$e2e=$false;$cliCommand=$false;$exitCode='NOT_RUN';$failure='NONE';try{$null=Get-Command supabase -ErrorAction Stop;$available=$true;$v=@(& supabase --version 2>&1);if($LASTEXITCODE -eq 0){$version=($v -join ' ').Trim()};$h=@(& supabase projects api-keys --help 2>&1);$helpText=($h | ForEach-Object {[string]$_}) -join ' ';$cliCommand=($helpText -match 'api-keys') -and ($helpText -match 'project-ref');$p=@(& supabase projects list 2>&1);$exitCode=[string]$LASTEXITCODE;$projectText=($p | ForEach-Object {[string]$_}) -join ' ';if($exitCode -eq '0'){$auth='CLI_AUTH_OK';$e2e=($projectText -match 'ofqqrryamslxoqkklraw')}else{$auth='CLI_AUTH_REQUIRED_OR_API_ERROR'};$v=$null;$h=$null;$helpText=$null;$p=$null;$projectText=$null}catch{$failure='CLI_NOT_FOUND_OR_PREFLIGHT_ERROR'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'supabase_cli_available='+$available,'supabase_cli_version='+$version,'api_keys_command_project_ref_supported='+$cliCommand,'management_api_auth='+$auth,'jobly_e2e_visible='+$e2e,'projects_list_exit_code='+$exitCode,'failure='+$failure);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-cli-preflight-20261108.txt
~~~

- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'aux réponses OpenAPI réelles et aux autres preuves de sécurité du lot.
- JOBLY-PROD hors périmètre ; aucune clé, fixture, mot de passe, permission ou donnée n'y a été utilisée/modifiée.
- Aucun changement de `main`, aucune fusion, aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.56, blob SHA `d48e06078af5f0591908c283a74973fa3a30625c`, branche `e2e/recette`.


---

## 60. CLI globale absente — préflight sans installation globale — V2.58 — 8 novembre 2026

### 60.1 Résultat opérateur

Le préflight PowerShell 5.1 communiqué retourne :
```text
supabase_cli_available=False
supabase_cli_version=NOT_FOUND
api_keys_command_project_ref_supported=False
management_api_auth=NOT_CHECKED
jobly_e2e_visible=False
projects_list_exit_code=NOT_RUN
failure=CLI_NOT_FOUND_OR_PREFLIGHT_ERROR
```

Conclusion : aucune CLI `supabase` globale n'est détectée. L'authentification CLI n'a donc pas encore été testée. Ce résultat ne dit rien sur la présence d'une session Management API locale par une autre voie.

### 60.2 Méthode sans installation globale ni modification du dépôt

La documentation Supabase à jour (guide Windows/Node mis à jour le 2 novembre 2026) accepte l'exécution du CLI par `npx supabase`, avec Node.js 20 ou supérieur. Le poste est rapporté sous Node.js 26.13.0. Utiliser `npx --yes supabase@latest` permet au préflight de charger le CLI dans le cache npm plutôt que d'ajouter une dépendance au `package.json` du dépôt ou de l'installer globalement.

Références :
- https://supabase.com/docs/guides/local-development/cli/getting-started?access-method=analytics&platform=windows&queryGroups=access-method&queryGroups=platform
- https://supabase.com/docs/reference/cli/introduction

### 60.3 Prochaine commande autorisée — préflight npx uniquement

Elle vérifie le binaire npx, télécharge/charge le CLI dans le cache npm si nécessaire, lit sa version et l'aide de `projects api-keys), puis tente `projects list`. Elle ne récupère aucune API key et ne fait aucune requête à PostgREST.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-npx-preflight-20261108.txt';$available=$false;$version='NOT_FOUND';$helpFlagProjectRef=$false;$helpFlagRemote=$false;$auth='NOT_CHECKED';$e2e=$false;$versionExit='NOT_RUN';$helpExit='NOT_RUN';$projectsExit='NOT_RUN';$failure='NONE';try{$npx=Get-Command npx.cmd -ErrorAction Stop;$available=$true;$v=@(& $npx.Source --yes supabase@latest --version 2>&1);$versionExit=[string]$LASTEXITCODE;if($versionExit -eq '0'){$version=($v -join ' ').Trim()};$h=@(& $npx.Source --yes supabase@latest projects api-keys --help 2>&1);$helpExit=[string]$LASTEXITCODE;$ht=($h | ForEach-Object {[string]$_}) -join ' ';$helpFlagProjectRef=($ht -match '--project-ref');$helpFlagRemote=($ht -match '--remote');$p=@(& $npx.Source --yes supabase@latest projects list 2>&1);$projectsExit=[string]$LASTEXITCODE;$pt=($p | ForEach-Object {[string]$_}) -join ' ';if($projectsExit -eq '0'){$auth='CLI_AUTH_OK';$e2e=($pt -match 'ofqqrryamslxoqkklraw')}else{$auth='CLI_AUTH_REQUIRED_OR_API_ERROR'};$v=$null;$h=$null;$ht=$null;$p=$null;$pt=$null}catch{$failure='NPX_NOT_FOUND_OR_PREFLIGHT_ERROR'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'npx_available='+$available,'supabase_cli_version='+$version,'version_exit_code='+$versionExit,'api_keys_help_exit_code='+$helpExit,'api_keys_flag_project_ref='+$helpFlagProjectRef,'api_keys_flag_remote='+$helpFlagRemote,'management_api_auth='+$auth,'jobly_e2e_visible='+$e2e,'projects_list_exit_code='+$projectsExit,'failure='+$failure);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-npx-preflight-20261108.txt
~~~

### 60.4 Garde-fous

- Aucun token PAT demandé ou transmis dans la conversation.
- Aucun API key n'est récupéré ou affiché par ce préflight.
- Aucun fichier de dépendance du dépôt n'est modifié ; le paquet CLI n'est utilisé que depuis le cache npm via `npx`.
- Aucune commande `projects api-keys` sans `--help) ; aucun GET OpenAPI à ce stade.
- Si la CLI indique une authentification manquante, la prochaine étape sera une authentification interactive locale officielle, puis un nouveau contrôle de visibilité du seul projet E2E.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucune modification de clé, `main), fusion ou déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.57, blob SHA `b6b63b918582fcd9378e3a94f06d0fb7fee81ff5`, branche `e2e/recette`.


---

## 61. Préflight CLI v3 corrigé et authentification PAT à portée minimale — V2.59 — 8 novembre 2026

### 61.1 Résultat opérateur reçu

```text
runtime=PowerShell 5.1.19041.4522
npx_available=True
supabase_cli_version=3.0.0
version_exit_code=0
api_keys_help_exit_code=0
api_keys_flag_project_ref=False
api_keys_flag_remote=True
management_api_auth=NOT_CHECKED
jobly_e2e_visible=False
projects_list_exit_code=NOT_RUN
failure=NPX_NOT_FOUND_OR_PREFLIGHT_ERROR
```

Conclusions :
- `npx` peut lancer Supabase CLI `3.0.0).
- Pour cette version, le préflight a trouvé `--remote` et non `--project-ref`. Le ciblage correct documenté de la commande est `--remote=<project-ref>`.
- Le script s'est arrêté avant `projects list` et n'a donc pas établi l'état d'authentification. Ne pas diagnostiquer une absence de session à partir de `management_api_auth=NOT_CHECKED`.
- La prochaine commande ne doit plus lister tous les projets du compte. Elle devra cibler directement JOBLY-E2E par son ref explicite.

### 61.2 Permissions minimales documentées

La documentation Supabase indique que la lecture des clés API d'un projet requiert les permissions **API Keys — Read** et **API Key Secrets — Read**. Un jeton personnel peut être limité à un seul projet. Les droits d'écriture ne sont pas nécessaires pour lire les clés. Sources vérifiées le 8 novembre 2026 :
- https://supabase.com/docs/guides/platform/personal-access-tokens
- https://supabase.com/docs/reference/api/v1-get-project-api-key
- https://supabase.com/docs/guides/getting-started/api-keys

Créer, si aucun jeton approprié n'existe déjà, un Personal Access Token (PAT) scoped exclusivement au projet JOBLY-E2E avec ces deux permissions de lecture seulement. Ne pas créer un PAT Legacy/full-access et ne pas accorder d'écriture. Ne jamais transmettre le PAT à l'assistant.

### 61.3 Action locale unique — authentifier Supabase CLI

Dans CMD :
```bat
cd /d C:\Users\ASUS\Jobly
npx.cmd --yes supabase@3.0.0 login
```

Au prompt interactif du CLI, saisir directement dans le terminal le PAT scoped créé dans le Dashboard Supabase, sans le placer dans la commande, une variable shell, un fichier, un rapport ou cette conversation. Attendre le message de succès du CLI. Supabase indique que le CLI conserve ce jeton dans le stockage natif sécurisé quand disponible et utilise un fichier local en repli si ce stockage ne l'est pas ; ne pas ouvrir ou partager ce fichier.

Cette commande n'effectue aucune modification sur le projet Supabase. Elle authentifie uniquement la CLI locale.

### 61.4 Étape suivante après succès de login

Utiliser exclusivement :
`npx.cmd --yes supabase@3.0.0 projects api-keys --remote=ofqqrryamslxoqkklraw`

Cette commande doit être appelée depuis un processus local capturant sa sortie en mémoire ; ne jamais afficher, copier, écrire ou journaliser la réponse contenant les clés. Extraire localement uniquement la Legacy `service_role) du projet E2E, vérifier le format/claims, puis effectuer les GET OpenAPI read-only prescrits au §16.7. Si l'authentification ou les scopes sont insuffisants, ne pas élargir le jeton sans revoir précisément les permissions requises.

### 61.5 Garde-fous et état

- Le préflight précédent n'a prouvé ni réussite ni échec de l'authentification CLI.
- Aucun appel `projects list` n'est à répéter ; ne pas énumérer les projets du compte.
- Aucun appel de lecture de clé ni HTTP OpenAPI n'a encore été exécuté par cette voie.
- Aucun secret/API key/PAT n'a été transmis à l'assistant, imprimé ou ajouté au dépôt.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucun accès ni interrogation de ce projet.
- Aucune mutation Supabase/fixture, aucun changement de `main), aucune fusion et aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.58, blob SHA `85e107006657fb1acfa767bdca7c1b8306eabae1`, branche `e2e/recette`.

---

## 62. Identification et création du PAT Supabase scoped — V2.60 — 8 novembre 2026

### 62.1 Nature du jeton

Le jeton demandé est un **Personal Access Token (PAT) Supabase**, qui authentifie la CLI à la Management API. Il est créé par le titulaire du compte depuis **Account preferences → Access Tokens** dans le Dashboard. Il n'est pas fourni/généré par l'assistant et ne correspond ni au mot de passe, ni à la clé API service_role, ni à anon.

Les PAT scoped créés depuis le Dashboard commencent par sbp_fc. La valeur n'est affichée qu'au moment de la création ; elle ne doit jamais être communiquée à l'assistant.

Source officielle vérifiée le 8 novembre 2026 :
- https://supabase.com/docs/guides/platform/personal-access-tokens

### 62.2 Configuration à sélectionner

Créer un PAT scoped avec :
- Ressource / projet : uniquement JOBLY-E2E, ref ofqqrryamslxoqkklraw.
- Permission **API Keys** : **Read**.
- Permission **API Key Secrets** : **Read**.
- Toute permission Write : désactivée.
- Aucun autre projet ou organisation supplémentaire.
- Expiration courte/appropriée au diagnostic.

Ces deux permissions en lecture sont celles indiquées par Supabase pour les endpoints GET des clés de projet ; la combinaison est requise pour lire les valeurs des API keys. Ne pas sélectionner « Create legacy token », « Legacy », ou un jeton à accès complet.

### 62.3 Correction de la commande d'authentification précédente

La commande supabase login sans argument démarre le flux navigateur et crée un PAT disposant de l'accès complet au compte. **Ne pas utiliser ce flux** pour ce diagnostic à privilège minimal. La documentation supporte deux moyens pour un PAT scoped :
- SUPABASE_ACCESS_TOKEN dans l'environnement du processus CLI ;
- supabase login --token.

Pour éviter d'inscrire le PAT dans l'historique de commandes ou dans la liste des arguments du processus, la prochaine procédure devra demander le PAT via saisie masquée locale, le placer uniquement dans l'environnement mémoire du processus courant, exécuter la commande ciblant uniquement le projet E2E, puis effacer la variable. Ne pas stocker le PAT dans un fichier ou dans le dépôt.

### 62.4 État

- Aucun PAT n'a été créé ou reçu par l'assistant.
- Aucun jeton n'a été saisi ou envoyé dans le chat.
- Aucun appel CLI authentifié, aucune lecture de clé et aucun GET OpenAPI n'a été exécuté.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase, fixture, clé, permission, main, fusion ou déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Cette section corrige et remplace toute indication antérieure qui aurait fait utiliser le flux navigateur non scoped supabase login seul.
- Document source avant cette mise à jour : V2.59, blob SHA 91d2abef8cce8127975a0e8c9adf327250636a3e, branche e2e/recette.

---

## 63. Connexion Supabase signalée — contexte à préciser — V2.61 — 8 novembre 2026

L'opérateur indique « Je me suis logged ». Le canal de connexion n'est pas précisé : Dashboard web ou CLI via `supabase login`. Aucune hypothèse ne doit être faite sur l'état de la session, la nature ou la portée d'un éventuel PAT.

Prochaine question unique : confirmer si la connexion a été faite dans le Dashboard Supabase web ou dans CMD avec `npx.cmd --yes supabase@3.0.0 login`.

Si la connexion est le Dashboard web : poursuivre la création d'un PAT scoped uniquement JOBLY-E2E avec API Keys Read et API Key Secrets Read, sans permission d'écriture. Si la commande CLI login a été exécutée : ne pas lancer de commande d'accès aux clés avant d'avoir établi la portée du jeton ; un flux login navigateur sans PAT fourni peut accorder un accès complet au compte.

Aucun PAT n'a été demandé dans le chat, affiché ou enregistré. Aucun appel CLI authentifié, aucune lecture de clé, aucun GET OpenAPI et aucune modification Supabase n'ont été réalisés sur la base de ce seul message.

LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**. JOBLY-PROD hors périmètre ; aucun changement `main`, aucune fusion ni déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

Document source avant cette mise à jour : V2.60, blob SHA 641f828835483ca54ad9955dd7e7e0c886eef04b, branche `e2e/recette`.

---

## 64. Connexion CLI par flux navigateur — PAT full-access détecté — V2.62 — 8 novembre 2026

### 64.1 Déclaration opérateur

L'opérateur confirme avoir exécuté `npx.cmd --yes supabase@3.0.0 login`, avoir été redirigé vers le navigateur, reçu un jeton via le flux Supabase et terminé la connexion dans CMD.

### 64.2 Portée du jeton

La documentation Supabase mise à jour le 2 novembre 2026 précise explicitement que le flux navigateur de `supabase login` crée actuellement un PAT avec accès complet au compte. Il ne s'agit donc pas du PAT scoped minimal recherché pour LOT-00. Le CLI l'a enregistré localement ; aucune valeur n'a été transmise à l'assistant.

Sources officielles vérifiées le 8 novembre 2026 :
- https://supabase.com/docs/guides/platform/personal-access-tokens
- https://supabase.com/changelog/scoped-personal-access-tokens-ga
- https://supabase.com/docs/reference/cli/introduction

### 64.3 Décision de sécurité

- Ne pas utiliser le PAT issu du flux navigateur pour récupérer les clés du projet.
- Ne pas transmettre, afficher ou journaliser ce PAT.
- Créer dans Dashboard → Account preferences → Access Tokens un PAT **scoped** limité au seul projet JOBLY-E2E (`ofqqrryamslxoqkklraw`) et aux permissions **API Keys — Read** + **API Key Secrets — Read**, sans permission Write.
- Une fois le PAT scoped créé et son usage local vérifié, révoquer/supprimer le PAT full-access créé par le flux navigateur, en identifiant exactement ce jeton dans la liste des tokens. Ne pas supprimer un autre PAT existant.
- Injecter le PAT scoped uniquement dans l'environnement mémoire du processus PowerShell/CLI qui effectue le contrôle ciblé ; ne pas le passer en argument de commande, ne pas l'ajouter à un fichier ni au dépôt.
- La variable d'environnement locale doit être supprimée en `finally` après l'exécution. Ne pas modifier le token stocké par défaut si le PAT scoped temporaire via environnement suffit.

### 64.4 Permissions de lecture des clés

La table des permissions Supabase associe **API Keys — Read** à la lecture de la liste et des métadonnées des clés, et **API Key Secrets — Read** à la révélation de leur valeur. La lecture ciblée de la Legacy `service_role` nécessite les deux droits read-only. Aucun droit d'écriture n'est requis.
Source : https://supabase.com/docs/guides/platform/personal-access-tokens

### 64.5 État

- Authentification CLI : flux navigateur terminé localement, mais PAT stocké considéré full-access par la documentation ; il n'est pas approuvé pour l'opération de lecture de clé.
- PAT scoped : non encore créé.
- Aucune clé API lue via CLI ; aucun GET OpenAPI effectué.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucun changement de clé API, `main`, aucune fusion et aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.61, blob SHA 69d4862bfbf08cacad7c6e10dfe69b611256c742, branche `e2e/recette`.

---

## 65. Utilisation éventuellement bornée du PAT full-access pour un contrôle ponctuel — V2.63 — 8 novembre 2026

### 65.1 Question de l'opérateur

L'opérateur demande si la session CLI issue du flux navigateur peut être contrainte à ne travailler que sur la recette. Réponse : oui au niveau procédural (allowlist de projet, d'endpoint et de méthode HTTP), mais non au niveau des droits intrinsèques du PAT.

### 65.2 Fait de sécurité vérifié

Le PAT créé par le flux navigateur `supabase login` porte l'accès complet au compte. L'option CLI `--remote=<project-ref>` sélectionne le projet pour une commande donnée mais ne réduit pas le périmètre ni les droits du PAT stocké. Toute automatisation locale peut être bornée à des opérations GET et à JOBLY-E2E, mais le jeton reste techniquement capable d'autres opérations si une autre commande l'utilise.

Source officielle : https://supabase.com/docs/guides/platform/personal-access-tokens — mise à jour le 2 novembre 2026.

### 65.3 Garde-fous possibles pour un usage unique

Si l'opérateur choisit explicitement la voie ponctuelle avec le PAT actuel, l'exécution doit être un wrapper local fixe qui :
- cible exclusivement le projet `ofqqrryamslxoqkklraw` ;
- n'appelle que l'opération de lecture de clés nécessaire au diagnostic ;
- sélectionne en mémoire uniquement la Legacy `service_role` attendue ;
- vérifie localement les claims du projet E2E et le rôle ;
- envoie uniquement deux GET au endpoint PostgREST OpenAPI `public` puis `net` ;
- ne contient aucun chemin d'écriture, aucun autre projet, aucune commande générique reçue en paramètre ;
- ne journalise ni PAT, ni API key, ni header ; seuls les statuts HTTP et indicateurs non sensibles sont consignés ;
- retire les variables sensibles de l'environnement du processus à la fin.

Ces garde-fous limitent le comportement du wrapper et constituent une restriction opérationnelle, **pas une restriction cryptographique ou IAM du PAT**.

### 65.4 Préférence

La préférence de sécurité reste de créer un PAT scoped au seul projet JOBLY-E2E avec API Keys Read + API Key Secrets Read, sans droits d'écriture. La voie full-access peut être envisagée pour un seul contrôle read-only si l'opérateur l'autorise explicitement, sur un poste qu'il contrôle, puis le PAT full-access devra être révoqué après le contrôle. Ne jamais employer ce PAT pour une autre action Jobly.

### 65.5 État

- Aucun nouvel usage du PAT full-access n'a été exécuté sur la base de cette question.
- Aucun appel API Keys ou OpenAPI n'a été fait via la session CLI.
- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation, aucune modification `main`, aucune fusion ni déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.62, blob SHA 281499a84a1a7cd844922b51f12c2e977cfb6cf1, branche `e2e/recette`.

---

## 66. Séquence unique CLI → claims → GET OpenAPI — V2.64 — 8 novembre 2026

### 66.1 Décision de moindre exposition

La CLI v3 `projects api-keys` peut retourner les clés Legacy sous forme JWT, tandis que la valeur des nouvelles clés `sb_secret_...` est redacted par défaut ; `--reveal` provoque la révélation des clés secrètes. Pour éviter d'exposer toutes les nouvelles clés secrètes du projet, ne pas utiliser `--reveal` dans cette recette. Appeler uniquement `projects api-keys --remote=<JOBLY-E2E> --output json`, capturer stdout en mémoire et sélectionner le seul enregistrement `name=service_role`.

Source technique CLI v3.0.0 : `apps/cli/src/commands/projects/api-keys/SIDE_EFFECTS.md` dans https://github.com/supabase/cli/tree/v3.0.0 ; documentation utilisateur : https://supabase.com/docs/guides/getting-started/api-keys ; issue qui documente la distinction Legacy vs nouvelles clés : https://github.com/supabase/cli/issues/4775.

### 66.2 Séquence autorisée

1. Vérifier que `SUPABASE_ACCESS_TOKEN` n'est pas défini dans l'environnement du processus. Si défini, arrêter sans afficher sa valeur. Le CLI utilisera alors le token déjà enregistré lors de la connexion locale.
2. Exécuter seulement `npx.cmd --yes supabase@3.0.0 --output json projects api-keys --remote=ofqqrryamslxoqkklraw` ; aucun `projects list`, `link`, `db`, `secrets`, `--reveal` ou autre commande.
3. Capturer toute la sortie stdout dans une variable en mémoire, jamais à l'écran ni dans un fichier. Exiger un unique enregistrement `service_role` avec `api_key` non vide.
4. Vérifier localement sans afficher le JWT : trois segments, en-tête `alg=HS256`, claims `role=service_role` et `ref=ofqqrryamslxoqkklraw`. Cette étape ne vérifie pas la signature cryptographique.
5. Si les claims concordent, envoyer deux GET, et seulement deux, vers `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec `apikey`, `Authorization: Bearer`, `Accept: application/openapi+json` et `Accept-Profile` successivement `public` puis `net`.
6. Conserver dans le rapport uniquement code HTTP, code PostgREST, présence OpenAPI et nombre de chemins ; ne jamais écrire le corps de la spec, le PAT, la clé ou les en-têtes.
7. Effacer les références PowerShell aux chaînes sensibles avant de terminer. La mémoire du processus est de courte durée ; cette opération ne constitue pas une garantie matérielle d'effacement mémoire.

### 66.3 Critères

- `public` HTTP 200 et document OpenAPI valide, puis `net` HTTP 406 avec `PGRST106` : `PASS_NET_NOT_EXPOSED`.
- `net` HTTP 200 avec OpenAPI : `BLOCKED_NET_EXPOSED`; aucun changement de schéma/grant sans autorisation distincte.
- Si la clé Legacy `service_role` n'est pas fournie sans `--reveal`, arrêter avec `BLOCKED_SERVICE_ROLE_VALUE_REDACTED`. Ne pas lancer `--reveal` automatiquement : cette option peut révéler d'autres clés secrètes. Demander une décision supplémentaire ou préférer un PAT scoped adapté.
- Toute erreur CLI, JWT/claims non conformes, erreur HTTP, résultat autre que les deux attendus : `BLOCKED_REVIEW_REQUIRED`; aucun retry automatique.

### 66.4 Limites

Le PAT issu du flux navigateur demeure full-access ; `--remote` limite la cible de cette commande, pas les permissions du PAT. Le script est une contention procédurale, pas une restriction IAM. Il n'effectue aucune écriture, aucun RPC métier, aucun appel `net.http_*`, aucun accès Auth, aucune migration et aucun accès JOBLY-PROD.

Aucun appel CLI `projects api-keys` ni GET OpenAPI n'a encore été exécuté au moment de l'ajout de cette section.

LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**. Après le contrôle OpenAPI, la décision sur les buckets publics et la revue ciblée des privilèges restent à clôturer. `main` inchangée ; aucune fusion ni aucun déploiement ; PR #266 reste ouverte, brouillon, non fusionnée.

Document source avant cette mise à jour : V2.63, blob SHA 496e8659ace78b223476eb9106ff5b10c9276b4b, branche `e2e/recette`.

---

## 67. Réduction des handoffs opérateur — raison de la commande locale — V2.65 — 8 novembre 2026

### 67.1 Réponse au point de l'opérateur

L'opérateur demande pourquoi multiplier les commandes si Supabase CLI peut réaliser le contrôle. Décision : supprimer les prétests et handoffs intermédiaires désormais redondants. Ne demander qu'une seule exécution locale complète pour le contrôle OpenAPI LOT-00 lorsque le CLI est authentifié.

### 67.2 Limite réelle de l'environnement assistant

La session Supabase CLI authentifiée est stockée localement sur le poste Windows de l'opérateur. Les outils connectés Supabase de cette session permettent des opérations de gestion et d'inspection ciblées (état projet, clés publishable, SQL, tables, migrations, advisors), mais aucun outil exposé ne permet de lire la valeur Legacy `service_role` du projet. L'assistant ne dispose pas d'un shell distant sur le CMD local, ni d'un accès au fichier/keyring local de la CLI. Il ne peut donc pas exécuter à distance la commande CLI déjà authentifiée.

Cette frontière est la seule raison du dernier handoff local ; ce n'est pas une nécessité de répéter des diagnostics. La commande doit faire le travail utile en une fois, sans exposer PAT ou API key.

### 67.3 Règle opératoire mise à jour

- Ne plus demander `supabase projects list`, préflight CLI séparé, test du presse-papiers ou collecte d'informations déjà établies.
- Pour LOT-00, conserver une seule exécution locale contrôlée : récupération en mémoire de la Legacy `service_role` sans `--reveal` pour les nouvelles clés, validation locale des claims, puis deux GET OpenAPI en lecture seule si les claims correspondent.
- Si le CLI ne renvoie pas de valeur non redacted pour Legacy `service_role`, arrêt net et demande d'une décision précise ; pas de `--reveal` automatique.
- Pendant ce temps, l'assistant doit avancer directement avec les outils connectés sur les contrôles réellement accessibles, sans demander à l'opérateur de les refaire.
- Aucune opération autre que GET pour le contrôle OpenAPI ; aucun accès JOBLY-PROD, aucun changement de clés, droits, fixtures, `main`, merge ou déploiement.

### 67.4 État

- Supabase CLI 3.0.0 lancé via npx et login navigateur effectué localement par l'opérateur.
- PAT stocké localement issu du flux navigateur considéré full-access ; utilisation uniquement opérationnelle et ponctuelle telle que §65-66, avec révocation après le contrôle. Aucun PAT ou API key communiqué à l'assistant.
- Aucun GET OpenAPI exécuté à ce stade.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- PR #266 reste ouverte, brouillon, non fusionnée ; `main` inchangée ; aucun déploiement.
- Document source avant cette mise à jour : V2.64, blob SHA f20b3ae830303e8c2de3b2e24ab8079a0c113b76, branche `e2e/recette`.

---

## 68. Correction technique du chemin CLI et commande finale unique — V2.66 — 8 novembre 2026

### 68.1 Vérification directe du code Supabase CLI v3.0.0

Inspection des fichiers sources officiels taggés `v3.0.0` : `apps/cli/src/commands/projects/api-keys/api-keys.handler.ts`, `apps/cli/src/command-internal/get-api-keys.ts` et fixtures E2E enregistrées.

Constats :
- La réponse `GET /v1/projects/{ref}/api-keys` sans `reveal=true` peut contenir la Legacy `service_role` avec son JWT (`id=service_role`, `type=legacy`, `api_key` non nul). Les fixtures `default.response.json` de la CLI v3 le montrent explicitement.
- Les nouvelles clés de type `secret` (`sb_secret_...`) sont redacted par défaut (`api_key=null`) ; `--reveal` ajoute `reveal=true` et dévoile les valeurs de type secret.
- Le contrôle LOT-00 vise la clé Legacy `service_role` et ne doit donc pas utiliser `--reveal`.
- Pour obtenir un JSON stable, la forme du CLI est `supabase projects api-keys --remote=<ref> --output json` (le flag output est placé après la sous-commande).

Sources :
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/projects/api-keys/api-keys.handler.ts
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/command-internal/get-api-keys.ts
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/projects/api-keys/SIDE_EFFECTS.md
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli-e2e/fixtures/recorded/GET_v1_projects_replayfixtureprojref_api_keys/default.response.json

Cette inspection corrige toute ambiguïté antérieure : **la clé Legacy `service_role` doit être disponible sans `--reveal`** dans le scénario CLI v3 attendu. Si elle ne l'est pas dans ce projet réel, le script s'arrête.

### 68.2 Contrôle SQL read-only supplémentaire

Une requête SELECT unique sur JOBLY-E2E a consulté `current_setting('pgrst.db_schemas', true)`, `current_setting('pgrst.db_extra_search_path', true)` et les paramètres `pgrst.db_schemas` attachés aux rôles/bases via `pg_db_role_setting`.

Résultat : `session_db_schemas=null`, `session_extra_search_path=null`, `role_db_schemas=[]`, `database_db_schemas=[]`. Ce résultat demeure **NON CONCLUANT** : la configuration effective peut provenir de l'environnement du service PostgREST et n'être pas exposée dans ces paramètres PostgreSQL. Il ne prouve ni l'exposition ni la non-exposition de `net`. Aucune modification n'a eu lieu.

### 68.3 Règle d'exécution finale

Ne plus demander de préflight intermédiaire. L'unique handoff opérateur restant est la commande finale locale qui :
- utilise la session CLI locale déjà connectée ;
- appelle uniquement `projects api-keys` sur `ofqqrryamslxoqkklraw`, sans `--reveal` et sans `projects list` ;
- capture stdout en mémoire, sélectionne `name=service_role` et vérifie localement les claims `role` et `ref` ;
- exécute ensuite les deux GET OpenAPI `public` et `net` si et seulement si les claims correspondent ;
- écrit un rapport exclusivement constitué de résultats non sensibles et remplace toutes les références locales explicites à la clé par null avant la fin du script.

Cette commande locale est nécessaire uniquement parce que la session CLI et son stockage de credentials sont sur le poste Windows de l'opérateur, sans shell distant accessible à l'assistant. Les contrôles exposés par le connecteur Supabase sont exécutés directement par l'assistant et ne sont pas redemandés à l'opérateur.

### 68.4 État

- Aucune requête de lecture de clés via la CLI n'a encore eu lieu.
- Aucun GET OpenAPI n'a encore eu lieu.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Le résultat SQL sur les paramètres PGRST reste inconclusif.
- PAT CLI issu du flux navigateur : full-access ; usage admis uniquement pour cette opération ciblée en lecture seule, puis révocation après le contrôle. Ce bornage est procédural et ne modifie pas les permissions réelles du PAT.
- JOBLY-PROD hors périmètre ; aucun DML/DDL, aucune mutation fixture, aucun changement `main`, aucune fusion ni déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.65, blob SHA fa25092885c7fe7512614f3adbca9cc35c3d5426, branche `e2e/recette`.

---

## 69. Commande finale locale LOT-00 — une seule exécution — V2.67 — 8 novembre 2026

### 69.1 Preuves sources exactes

La fixture enregistrée de Supabase CLI v3.0.0 `GET_v1_projects_replayfixtureprojref_api_keys/default.response.json` comprend une entrée `name=service_role`, `id=service_role`, `type=legacy`, `api_key=__JWT__` sans option reveal. La même réponse contient séparément une entrée `type=secret` dont la valeur est opaque. Cela confirme qu'on peut sélectionner l'ancienne clé Legacy sans révéler la clé moderne `sb_secret`.

Source : https://raw.githubusercontent.com/supabase/cli/v3.0.0/apps/cli-e2e/fixtures/recorded/GET_v1_projects_replayfixtureprojref_api_keys/default.response.json

Le CLI v3 permet `--remote=<ref>` et `--output json`. Le PAT full-access, issu de `supabase login` navigateur, demeure local. L'opérateur a explicitement autorisé une utilisation ponctuelle strictement bornée à cette recette en lecture seule.

### 69.2 Commande unique à exécuter dans CMD

Le script ci-dessous exécute la récupération locale, valide le format/les claims, puis les deux GET OpenAPI. Il n'utilise pas `--reveal`, n'utilise pas `projects list`, et n'émet aucun secret. Il bloque si `SUPABASE_ACCESS_TOKEN` est défini dans l'environnement, afin de forcer l'utilisation du login CLI local déjà établi. Aucun préflight supplémentaire n'est nécessaire.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-openapi-readonly-20261108.txt';$envTokenPresent=(-not [string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN));$cliExit='NOT_RUN';$legacyCount=0;$jwtThree=$false;$jwtAlg='UNKNOWN';$roleMatch=$false;$refMatch=$false;$pubHttp='NOT_RUN';$pubOpenApi=$false;$pubPaths=0;$pubPgrst='NONE';$netHttp='NOT_RUN';$netOpenApi=$false;$netPaths=0;$netPgrst='NONE';$gate='BLOCKED_NOT_STARTED';$key=$null;$cliText=$null;$cliLines=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null;$failure='NONE';function Invoke-OpenApi([string]$profile,[string]$secretKey){$status='NO_HTTP';$code='NONE';$valid=$false;$count=0;$response=$null;$reader=$null;$body=$null;$spec=$null;$err=$null;$request=$null;try{$request=[System.Net.HttpWebRequest]::Create('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/');$request.Method='GET';$request.Accept='application/openapi+json';$request.UserAgent='JoblyE2E-LOT00-Readonly/1.0';$request.Headers['apikey']=$secretKey;$request.Headers['Authorization']='Bearer '+$secretKey;$request.Headers['Accept-Profile']=$profile;$request.Timeout=30000;$request.ReadWriteTimeout=30000;try{$response=$request.GetResponse()}catch [System.Net.WebException]{$response=$_.Exception.Response};if($null -ne $response){$status=[string][int]$response.StatusCode;$reader=New-Object System.IO.StreamReader($response.GetResponseStream());$body=$reader.ReadToEnd();if($status -eq '200'){try{$spec=ConvertFrom-Json -InputObject $body -ErrorAction Stop;$valid=($null -ne $spec.openapi) -or ($null -ne $spec.swagger);if($null -ne $spec.paths){$count=$spec.paths.PSObject.Properties.Count}}catch{$valid=$false}}else{try{$err=ConvertFrom-Json -InputObject $body -ErrorAction Stop;if($null -ne $err.code){$code=[string]$err.code}}catch{}}}else{$status='NETWORK_ERROR'}}catch{$status='REQUEST_ERROR'}finally{if($null -ne $reader){$reader.Dispose()};if($null -ne $response){$response.Close()};$request=$null;$body=$null;$spec=$null;$err=$null};return [pscustomobject]@{http=$status;openapi=$valid;paths=$count;pgrst=$code}};try{if($envTokenPresent){$gate='BLOCKED_ENV_TOKEN_OVERRIDE'}else{$npx=(Get-Command npx.cmd -ErrorAction Stop).Source;$cliLines=@(& $npx --yes supabase@3.0.0 projects api-keys --remote=ofqqrryamslxoqkklraw --output json 2>$null);$cliExit=[string]$LASTEXITCODE;$cliText=($cliLines | ForEach-Object {[string]$_}) -join ([Environment]::NewLine);$cliLines=$null;if($cliExit -ne '0'){$gate='BLOCKED_CLI_AUTH_OR_API_ERROR'}else{$rows=@(ConvertFrom-Json -InputObject $cliText -ErrorAction Stop);$selected=@($rows | Where-Object {$_.name -eq 'service_role' -and $_.type -eq 'legacy'});$legacyCount=$selected.Count;if($legacyCount -ne 1){$gate='BLOCKED_LEGACY_SERVICE_ROLE_NOT_UNIQUE'}else{$key=[string]$selected[0].api_key;if([string]::IsNullOrWhiteSpace($key)){$gate='BLOCKED_LEGACY_SERVICE_ROLE_REDACTED'}else{$parts=$key.Split([char]'.');$jwtThree=($parts.Length -eq 3);if($jwtThree){$head64=$parts[0].Replace('-','+').Replace('_','/');$body64=$parts[1].Replace('-','+').Replace('_','/');while(($head64.Length % 4) -ne 0){$head64+='='};while(($body64.Length % 4) -ne 0){$body64+='='};$headText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($head64));$bodyText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($body64));$jwtHeader=ConvertFrom-Json -InputObject $headText -ErrorAction Stop;$jwtClaims=ConvertFrom-Json -InputObject $bodyText -ErrorAction Stop;$jwtAlg=[string]$jwtHeader.alg;$roleMatch=($jwtClaims.role -eq 'service_role');$refMatch=($jwtClaims.ref -eq 'ofqqrryamslxoqkklraw')};if($jwtThree -and $jwtAlg -eq 'HS256' -and $roleMatch -and $refMatch){$pub=Invoke-OpenApi -profile 'public' -secretKey $key;$pubHttp=[string]$pub.http;$pubOpenApi=[bool]$pub.openapi;$pubPaths=[int]$pub.paths;$pubPgrst=[string]$pub.pgrst;$net=Invoke-OpenApi -profile 'net' -secretKey $key;$netHttp=[string]$net.http;$netOpenApi=[bool]$net.openapi;$netPaths=[int]$net.paths;$netPgrst=[string]$net.pgrst;if($pubHttp -eq '200' -and $pubOpenApi -and $netHttp -eq '406' -and $netPgrst -eq 'PGRST106'){$gate='PASS_NET_NOT_EXPOSED'}elseif($netHttp -eq '200' -and $netOpenApi){$gate='BLOCKED_NET_EXPOSED'}else{$gate='BLOCKED_HTTP_OR_OPENAPI_RESULT'}}else{$gate='BLOCKED_JWT_CLAIMS_MISMATCH'}}}}}}catch{$gate='BLOCKED_CLI_JSON_OR_INTERNAL_ERROR';$failure='CHECK_COMMAND_FAILED'}finally{$key=$null;$cliText=$null;$cliLines=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','supabase_cli_version=3.0.0','env_SUPABASE_ACCESS_TOKEN_present='+$envTokenPresent,'cli_command_exit_code='+$cliExit,'legacy_service_role_count='+$legacyCount,'jwt_three_segments='+$jwtThree,'jwt_algorithm='+$jwtAlg,'jwt_role_service_role='+$roleMatch,'jwt_project_ref_match='+$refMatch,'jwt_signature_verified=False','public_http_status='+$pubHttp,'public_openapi_valid='+$pubOpenApi,'public_openapi_path_count='+$pubPaths,'public_postgrest_code='+$pubPgrst,'net_http_status='+$netHttp,'net_openapi_valid='+$netOpenApi,'net_openapi_path_count='+$netPaths,'net_postgrest_code='+$netPgrst,'failure='+$failure,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-openapi-readonly-20261108.txt
~~~

### 69.3 Sortie attendue et interprétation

Le rapport `feedback-lot00-openapi-readonly-20261108.txt` ne contient que les codes HTTP, les indicateurs JWT non secrets, le code PostgREST, le nombre de chemins OpenAPI et le GATE. L'ouvrir avec la commande Notepad fournie après l'exécution.

- `PASS_NET_NOT_EXPOSED` exige `public_http_status=200`, `public_openapi_valid=True`, `net_http_status=406` et `net_postgrest_code=PGRST106`.
- `BLOCKED_NET_EXPOSED` si le profil net reçoit HTTP 200 et OpenAPI valide.
- Toute autre valeur maintient `BLOCKED_REVIEW_REQUIRED`; aucune modification du schéma ou des droits n'est automatique.

### 69.4 Garde-fous

- Appel Management API en GET limité à `api-keys` pour le ref E2E explicitement fourni ; appel PostgREST en deux GET seulement.
- Aucun `--reveal` ; aucune nouvelle clé `sb_secret` révélée ; aucun `projects list`.
- Pour le Data API, la clé JWT Legacy est envoyée dans `apikey` et `Authorization: Bearer`, car c'est un JWT HS256.
- Aucun accès JOBLY-PROD, aucun DML/DDL/RPC métier/`net.http_*`, aucune opération Auth, aucune mutation fixture, aucune fusion, aucun déploiement.
- Le script annule ses références locales à la clé et aux objets de sortie avant de terminer ; cela ne garantit pas l'effacement physique des chaînes en mémoire du runtime.
- Le PAT full-access demeure full-access au compte ; les restrictions sont procédurales. Le révoquer dans Dashboard → Access Tokens après le contrôle, en identifiant exactement le PAT créé par le login navigateur, sans révoquer un autre jeton.

- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à réception et analyse du rapport.
- `main` inchangée ; PR #266 ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.66, blob SHA 41623285363f1267fe3f7109f91fcd9dcda20a6b, branche `e2e/recette`.

---

## 70. Envoi direct des commandes de recette — état d'exécution — V2.68 — 8 novembre 2026

### 70.1 Commandes à exécuter maintenant

L'opérateur demande l'envoi direct des commandes de recette. Réponse opératoire :

1. Les commandes bulk déjà PASS (302 tests historiques couverts, 66/66 Identity revalidés, 6/6 authenticated-runtime-contracts) ne doivent pas être répétées. Aucun nouvel appel bulk n'est nécessaire.
2. Le seul contrôle exécutable maintenant pour débloquer les scénarios runtime est la commande LOT-00 exacte du §69.2. Elle doit être transmise directement à l'opérateur, pas seulement un lien vers le document.
3. Ne pas lancer `scripts/e2e-local-recipe.mjs`, les recettes Auth/runtime, navigateur connecté ou bulk global tant que LOT-00 ne remplit pas ses critères de sortie et que les prérequis/fixtures n'ont pas été vérifiés. Le runner global ne permet pas de sélectionner un seul lot et pourrait atteindre des étapes de restauration runtime ; il demeure bloqué par les règles de reprise historiques et les protections fixtures.
4. À réception du rapport LOT-00 : analyser les deux profils ; si le gate est conforme, planifier le parcours Auth / Talent / Recruteur en séquence, avec preuve d'exécution et de nettoyage. Si le gate ne l'est pas, corriger seulement le blocage observé.

### 70.2 Commandes d'ouverture du résultat

Le §69.2 crée `feedback-lot00-openapi-readonly-20261108.txt` et termine déjà par le Notepad associé. Ne pas exécuter le Notepad avant la création du fichier.

### 70.3 État

- Aucun nouveau test local ou runtime n'a été lancé par cette mise à jour documentaire.
- Groupes bulk locaux déjà couverts : aucune relance demandée.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'au rapport OpenAPI.
- JOBLY-PROD hors périmètre ; aucun accès, aucune mutation, aucun changement de `main`, aucune fusion ni déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.67, blob SHA e296f4c524941eba41845d69939eabd70cc58c6d, branche `e2e/recette`.

---

## 71. Échec PowerShell avant retour CLI — correction native stderr — V2.69 — 8 novembre 2026

### 71.1 Rapport opérateur

```text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
supabase_cli_version=3.0.0
env_SUPABASE_ACCESS_TOKEN_present=False
cli_command_exit_code=NOT_RUN
legacy_service_role_count=0
jwt_three_segments=False
jwt_algorithm=UNKNOWN
jwt_role_service_role=False
jwt_project_ref_match=False
jwt_signature_verified=False
public_http_status=NOT_RUN
public_openapi_valid=False
public_openapi_path_count=0
public_postgrest_code=NONE
net_http_status=NOT_RUN
net_openapi_valid=False
net_openapi_path_count=0
net_postgrest_code=NONE
failure=CHECK_COMMAND_FAILED
GATE=BLOCKED_CLI_JSON_OR_INTERNAL_ERROR
```

### 71.2 Analyse exacte

- `env_SUPABASE_ACCESS_TOKEN_present=False` : aucun override d'environnement détecté ; le script était censé utiliser le credential local du CLI.
- `cli_command_exit_code=NOT_RUN` : la variable n'a pas été assignée après l'appel natif. Cela ne prouve ni un refus d'authentification, ni un refus Management API, ni une clé absente.
- `failure=CHECK_COMMAND_FAILED` : le catch générique a masqué la classe d'exception ; aucun diagnostic CLI n'a été capturé.
- Cause plausible, non encore prouvée : Windows PowerShell 5.1 traite certaines lignes stderr d'un programme natif comme des erreurs PowerShell. Avec `$ErrorActionPreference='Stop'` et `2>$null`, un avertissement/erreur stderr de npx peut interrompre l'affectation avant la lecture de `$LASTEXITCODE`.

### 71.3 Correction

La commande de reprise doit abaisser temporairement `$ErrorActionPreference` à `Continue` uniquement pendant l'appel natif `npx.cmd`, puis restaurer `Stop` immédiatement après. Capturer `$LASTEXITCODE` sans afficher stdout. Capturer uniquement la classe d'exception (pas son message) en cas d'erreur inattendue. L'appel CLI conserve strictement les mêmes paramètres : version 3.0.0, projet E2E explicite, `--output json`, sans `--reveal` et sans `projects list`.

Aucune modification de la clé, du PAT, des droits, de Supabase ou du code local n'est requise pour cette correction.

### 71.4 État

- La commande CLI n'a pas fourni de code retour ; aucun résultat OpenAPI n'a été obtenu.
- Aucun élément ne permet de déclarer que Supabase a rejeté le PAT ou la clé `service_role`.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucun accès ni mutation ; aucun changement `main`, aucune fusion ni aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.68, blob SHA 6e9d4a4357e6157b08347650c1cebea188e4f178, branche `e2e/recette`.

---

## 72. Reprise LOT-00 après exception PowerShell — commande corrigée — V2.70 — 8 novembre 2026

### 72.1 Correction technique

Le résultat §71 montrait `cli_command_exit_code=NOT_RUN`, ce qui indique une exception PowerShell avant la capture du code retour natif. Cause probable : traitement du stderr d'un programme natif par Windows PowerShell 5.1 lorsque `$ErrorActionPreference='Stop'` et `2>$null` sont combinés. La commande ci-dessous passe temporairement à `Continue` seulement pendant l'appel npx, restaure immédiatement la préférence, puis capture le code retour. Le catch ne journalise que le type d'exception, pas son message.

### 72.2 Commande unique corrigée

Cette commande refait la séquence complète sans préflight additionnel : Management API GET de la liste des clés pour le seul ref JOBLY-E2E, sélection de la Legacy `service_role`, vérification locale des claims, puis GET OpenAPI `public` et `net`. Elle ne fait pas usage de `--reveal` ni de `projects list`.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-openapi-readonly-20261108.txt';$envTokenPresent=(-not [string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN));$cliExit='NOT_RUN';$legacyCount=0;$jsonParsed=$false;$jwtThree=$false;$jwtAlg='UNKNOWN';$roleMatch=$false;$refMatch=$false;$pubHttp='NOT_RUN';$pubOpenApi=$false;$pubPaths=0;$pubPgrst='NONE';$netHttp='NOT_RUN';$netOpenApi=$false;$netPaths=0;$netPgrst='NONE';$gate='BLOCKED_NOT_STARTED';$key=$null;$cliText=$null;$cliOut=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null;$failure='NONE';function Invoke-OpenApi([string]$profile,[string]$secretKey){$status='NO_HTTP';$code='NONE';$valid=$false;$count=0;$response=$null;$reader=$null;$body=$null;$spec=$null;$err=$null;$request=$null;try{$request=[System.Net.HttpWebRequest]::Create('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/');$request.Method='GET';$request.Accept='application/openapi+json';$request.UserAgent='JoblyE2E-LOT00-Readonly/1.0';$request.Headers['apikey']=$secretKey;$request.Headers['Authorization']='Bearer '+$secretKey;$request.Headers['Accept-Profile']=$profile;$request.Timeout=30000;$request.ReadWriteTimeout=30000;try{$response=$request.GetResponse()}catch [System.Net.WebException]{$response=$_.Exception.Response};if($null -ne $response){$status=[string][int]$response.StatusCode;$reader=New-Object System.IO.StreamReader($response.GetResponseStream());$body=$reader.ReadToEnd();if($status -eq '200'){try{$spec=ConvertFrom-Json -InputObject $body -ErrorAction Stop;$valid=($null -ne $spec.openapi) -or ($null -ne $spec.swagger);if($null -ne $spec.paths){$count=$spec.paths.PSObject.Properties.Count}}catch{$valid=$false}}else{try{$err=ConvertFrom-Json -InputObject $body -ErrorAction Stop;if($null -ne $err.code){$code=[string]$err.code}}catch{}}}else{$status='NETWORK_ERROR'}}catch{$status='REQUEST_ERROR'}finally{if($null -ne $reader){$reader.Dispose()};if($null -ne $response){$response.Close()};$request=$null;$body=$null;$spec=$null;$err=$null};return [pscustomobject]@{http=$status;openapi=$valid;paths=$count;pgrst=$code}};try{if($envTokenPresent){$gate='BLOCKED_ENV_TOKEN_OVERRIDE'}else{$npx=(Get-Command npx.cmd -ErrorAction Stop).Source;$savedNativePreference=$ErrorActionPreference;try{$ErrorActionPreference='Continue';$cliOut=@(& $npx --yes supabase@3.0.0 projects api-keys --remote=ofqqrryamslxoqkklraw --output json 2>$null);$cliExit=[string]$LASTEXITCODE}finally{$ErrorActionPreference=$savedNativePreference};if($cliExit -ne '0'){$gate='BLOCKED_CLI_NONZERO_EXIT'}else{$cliText=($cliOut | ForEach-Object {[string]$_}) -join ([Environment]::NewLine);$cliOut=$null;$root=ConvertFrom-Json -InputObject $cliText -ErrorAction Stop;$jsonParsed=$true;if($root -is [array]){$rows=@($root)}elseif($null -ne $root.keys){$rows=@($root.keys)}else{$rows=@()};$selected=@($rows | Where-Object {$_.name -eq 'service_role' -and $_.type -eq 'legacy'});$legacyCount=$selected.Count;if($legacyCount -ne 1){$gate='BLOCKED_LEGACY_SERVICE_ROLE_NOT_UNIQUE'}else{$key=[string]$selected[0].api_key;if([string]::IsNullOrWhiteSpace($key)){$gate='BLOCKED_LEGACY_SERVICE_ROLE_REDACTED'}else{$parts=$key.Split([char]'.');$jwtThree=($parts.Length -eq 3);if($jwtThree){$head64=$parts[0].Replace('-','+').Replace('_','/');$body64=$parts[1].Replace('-','+').Replace('_','/');while(($head64.Length % 4) -ne 0){$head64+='='};while(($body64.Length % 4) -ne 0){$body64+='='};$headText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($head64));$bodyText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($body64));$jwtHeader=ConvertFrom-Json -InputObject $headText -ErrorAction Stop;$jwtClaims=ConvertFrom-Json -InputObject $bodyText -ErrorAction Stop;$jwtAlg=[string]$jwtHeader.alg;$roleMatch=($jwtClaims.role -eq 'service_role');$refMatch=($jwtClaims.ref -eq 'ofqqrryamslxoqkklraw')};if($jwtThree -and $jwtAlg -eq 'HS256' -and $roleMatch -and $refMatch){$pub=Invoke-OpenApi -profile 'public' -secretKey $key;$pubHttp=[string]$pub.http;$pubOpenApi=[bool]$pub.openapi;$pubPaths=[int]$pub.paths;$pubPgrst=[string]$pub.pgrst;$net=Invoke-OpenApi -profile 'net' -secretKey $key;$netHttp=[string]$net.http;$netOpenApi=[bool]$net.openapi;$netPaths=[int]$net.paths;$netPgrst=[string]$net.pgrst;if($pubHttp -eq '200' -and $pubOpenApi -and $netHttp -eq '406' -and $netPgrst -eq 'PGRST106'){$gate='PASS_NET_NOT_EXPOSED'}elseif($netHttp -eq '200' -and $netOpenApi){$gate='BLOCKED_NET_EXPOSED'}else{$gate='BLOCKED_HTTP_OR_OPENAPI_RESULT'}}else{$gate='BLOCKED_JWT_CLAIMS_MISMATCH'}}}}}}catch{$failure=$_.Exception.GetType().Name;if($cliExit -eq 'NOT_RUN'){$gate='BLOCKED_POWERSHELL_BEFORE_CLI_EXIT'}else{$gate='BLOCKED_CHECK_EXCEPTION'}}finally{$key=$null;$cliText=$null;$cliOut=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null;$root=$null};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','supabase_cli_version=3.0.0','env_SUPABASE_ACCESS_TOKEN_present='+$envTokenPresent,'cli_command_exit_code='+$cliExit,'cli_json_parsed='+$jsonParsed,'legacy_service_role_count='+$legacyCount,'jwt_three_segments='+$jwtThree,'jwt_algorithm='+$jwtAlg,'jwt_role_service_role='+$roleMatch,'jwt_project_ref_match='+$refMatch,'jwt_signature_verified=False','public_http_status='+$pubHttp,'public_openapi_valid='+$pubOpenApi,'public_openapi_path_count='+$pubPaths,'public_postgrest_code='+$pubPgrst,'net_http_status='+$netHttp,'net_openapi_valid='+$netOpenApi,'net_openapi_path_count='+$netPaths,'net_postgrest_code='+$netPgrst,'failure_class='+$failure,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-openapi-readonly-20261108.txt
~~~

### 72.3 Interprétation

- `PASS_NET_NOT_EXPOSED` : `public=200` avec OpenAPI valide et `net=406 / PGRST106`.
- `BLOCKED_CLI_NONZERO_EXIT` : le CLI a réellement retourné un code non nul ; aucun appel OpenAPI n'a été effectué.
- `BLOCKED_POWERSHELL_BEFORE_CLI_EXIT` : exception avant la capture du code retour ; `failure_class` précise uniquement la classe .NET/PowerShell, sans contenu sensible.
- `BLOCKED_LEGACY_SERVICE_ROLE_REDACTED` ou `BLOCKED_LEGACY_SERVICE_ROLE_NOT_UNIQUE` : pas de fallback `--reveal` automatique.
- Tous les autres gates restent à analyser sans mutation.

Le rapport final est `feedback-lot00-openapi-readonly-20261108.txt`; le script ouvre Notepad après écriture. Il n'y a pas de second fichier ni de collecte manuelle de clé.

### 72.4 État

- Le résultat précédent n'est ni un rejet du PAT ni un rejet de la clé ; aucun code HTTP n'a été reçu.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à ce nouveau rapport.
- Aucun accès JOBLY-PROD, aucune écriture, aucune opération Auth, aucune mutation de fixture, aucune modification `main`, aucune fusion ni déploiement.
- PAT full-access utilisé seulement pour le contrôle ponctuel autorisé ; le révoquer ensuite dans Supabase Access Tokens.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.69, blob SHA f6d4931ae995683b7773a780a489411742c933de, branche `e2e/recette`.

---

## 73. Rapport retransmis sans les marqueurs V2.70 — commande corrigée non démontrée — 8 novembre 2026

### 73.1 Constat sur la sortie fournie

La sortie communiquée après le §72 reprend exactement les indicateurs de l'ancien rapport :
- `failure=CHECK_COMMAND_FAILED`
- `GATE=BLOCKED_CLI_JSON_OR_INTERNAL_ERROR`
- absence de `cli_json_parsed`, `failure_class` et des gates introduits au §72.2.

Or la commande du §72.2 produit obligatoirement les champs `failure_class` et `GATE` de la nouvelle nomenclature (`BLOCKED_POWERSHELL_BEFORE_CLI_EXIT`, `BLOCKED_CLI_NONZERO_EXIT`, etc.). La sortie reçue ne permet donc pas d'établir que cette commande corrigée a été exécutée. Elle peut provenir d'une ancienne exécution ou du contenu non actualisé du fichier de rapport ; les éléments disponibles ne permettent pas de trancher.

### 73.2 Conséquence de recette — état historique, séquencement remplacé par §76

- Ce résultat ne prouve ni échec d'authentification CLI, ni rejet du PAT, ni rejet de la clé Supabase.
- Aucun appel HTTP OpenAPI n'est confirmé ; les statuts public/net restent non mesurés dans cette sortie.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Ne pas répéter les préflights, les tests du presse-papiers ou les groupes de tests locaux déjà verts.
- Cette consigne de reprise immédiate est historique et annulée par §76 : le contrôle OpenAPI est maintenant LOT-11, à la fin. Ne pas relancer la commande §72.2 ni l'ancienne commande §69 uniquement pour débloquer les lots précédents.
- Aucune action sur JOBLY-PROD, aucune mutation, aucun changement de `main`, aucune fusion et aucun déploiement. PR #266 demeure ouverte, brouillon et non fusionnée.

### 73.3 Référence

Document mis à jour en V2.71 sur `e2e/recette`. Source avant mise à jour : blob SHA 9275c8bcd8c645324dad69d13e5772d2fd2fa136.


---

## 74. LOT-00 — CLI lancée, code retour 1, diagnostic CLI masqué — 8 novembre 2026

### 74.1 Sortie opérateur reçue

```text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
supabase_cli_version=3.0.0
env_SUPABASE_ACCESS_TOKEN_present=False
cli_command_exit_code=1
cli_json_parsed=False
legacy_service_role_count=0
jwt_three_segments=False
jwt_algorithm=UNKNOWN
jwt_role_service_role=False
jwt_project_ref_match=False
jwt_signature_verified=False
public_http_status=NOT_RUN
public_openapi_valid=False
public_openapi_path_count=0
public_postgrest_code=NONE
net_http_status=NOT_RUN
net_openapi_valid=False
net_openapi_path_count=0
net_postgrest_code=NONE
failure_class=NONE
GATE=BLOCKED_CLI_NONZERO_EXIT
```

### 74.2 Interprétation strictement établie

- Contrairement aux rapports antérieurs avec `cli_command_exit_code=NOT_RUN`, cette exécution prouve que le processus CLI a été lancé et qu'il a renvoyé le code de sortie `1`.
- `cli_json_parsed=False` signifie que la sortie CLI n'a pas été transformée en JSON exploitable. `legacy_service_role_count=0` est donc une valeur par défaut du contrôle et **ne prouve pas** que la clé Legacy est absente ou masquée.
- `failure_class=NONE` est cohérent avec un code de sortie non nul sans exception PowerShell attrapée ; ce champ n'explique pas l'erreur CLI.
- La commande redirigeait `stderr` vers `$null`. Le message d'erreur déterminant n'a donc pas été conservé. Les éléments reçus ne permettent pas de distinguer une absence de session CLI, un problème d'autorisation/projet, un problème réseau ou une erreur interne du CLI.
- Les appels HTTP OpenAPI n'ont pas commencé : `public_http_status=NOT_RUN` et `net_http_status=NOT_RUN`. Aucun verdict sur les schémas `public` ou `net` n'est possible.

### 74.3 État de recette et verrou sur le jeton

- Gate courant : **`BLOCKED_CLI_NONZERO_EXIT`**.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun PASS OpenAPI n'est acquis.
- Cette tentative était la commande CLI bornée autorisée pour l'utilisation ponctuelle du PAT local full-access. Ne pas relancer automatiquement la commande avec ce PAT, ni lancer `--reveal`, `projects list`, une commande de mutation ou un contrôle global.
- L'opérateur avait indiqué vouloir révoquer ce PAT après le contrôle ponctuel. La révocation du PAT dans Supabase Access Tokens est à effectuer après cette tentative, sauf nouvelle autorisation explicite et distincte pour un diagnostic supplémentaire.
- Aucune clé, aucun JWT, aucun token ni message d'erreur potentiellement sensible n'a été inscrit dans le rapport.
- JOBLY-PROD n'a pas été consulté. Aucune écriture Supabase, mutation de fixture, authentification runtime, modification de `main`, fusion ou déploiement n'a été effectué. PR #266 reste ouverte, brouillon et non fusionnée.

### 74.4 Suite nécessaire — sans nouvelle tentative implicite

La cause du code retour 1 ne peut être déterminée qu'avec une nouvelle exécution diagnostique qui conserve `stderr` en mémoire, le classe en catégorie non sensible puis détruit le texte brut sans l'écrire dans un fichier ou l'afficher. Comme le contrôle ponctuel avec PAT full-access a déjà été tenté et que sa révocation était prévue, cette nouvelle exécution exige une **nouvelle autorisation explicite**. Aucun nouvel appel CLI n'est lancé par cette mise à jour documentaire.

### 74.5 Référence

Mise à jour V2.72 sur la branche `e2e/recette`. Source avant cette entrée : blob SHA `74c4900b15ea35c9be68fa3910cdaaf6919251cb`. Le présent ajout enregistre le résultat opérateur sans prétendre à un diagnostic de la cause CLI.


---

## 75. Rôle réel du contrôle OpenAPI reclassé en LOT-11 final — portée et limites — 8 novembre 2026

### 75.1 Pourquoi ce contrôle a été ajouté

Le GET OpenAPI sur `/rest/v1/` est un contrôle final de la surface d'exposition de la Data API Supabase (PostgREST), après les recettes fonctionnelles et la réconciliation finale. Il ne conditionne plus l'engagement des tests runtime E2E. Le document décrit les ressources REST générées à partir des schémas exposés : tables, vues, fonctions et méthodes disponibles.

Le gate conçu pour LOT-00 demandait :
- `Accept-Profile: public` : HTTP 200 avec un document OpenAPI valide, afin de confirmer que le schéma applicatif attendu est servi par la Data API ;
- `Accept-Profile: net` : HTTP 406 avec `PGRST106`, afin de confirmer que le schéma interne `net` n'est pas exposé par PostgREST.

### 75.2 Ce que ce test démontre — et ne démontre pas

Ce contrôle renseigne sur l'exposition des schémas via la Data API et sur les ressources décrites par PostgREST pour le rôle d'accès utilisé.

Il ne constitue **pas** une recette fonctionnelle Jobly et ne valide pas :
- les parcours Talent, Recruteur, J'IA, Mobility, Paiements ou Events ;
- les politiques RLS et leur comportement pour chaque utilisateur authentifié ;
- la sécurité de chaque ligne ou donnée métier ;
- les Edge Functions, les traitements asynchrones ou les intégrations externes.

Il ne faut donc pas le présenter comme une preuve globale de sécurité ou comme un prérequis intrinsèque à toute exécution de tests E2E. C'est un garde-fou ciblé sur l'exposition de la Data API.

### 75.3 Contexte Supabase sur l'accès au document

Supabase a annoncé en février 2026 la suppression de l'accès au document OpenAPI au moyen de la clé `anon`, changement déployé à partir du 11 mars 2026. Les réponses `401 Secret API key required` obtenues précédemment avec la clé publishable/anon sont donc cohérentes avec cette restriction et ne signifient pas que les requêtes REST ordinaires vers les ressources autorisées sont en panne.

Supabase documente également le Management API `GET /v1/projects/{ref}/database/openapi`, protégé par le scope de lecture de base de données `database:read`. Cette voie est à évaluer si le contrôle OpenAPI est conservé ; elle évite de déduire qu'une clé `service_role` doit nécessairement être extraite localement pour cette inspection.

### 75.4 Décision et garde-fous — reclassement en LOT-11 final

- Le contrôle OpenAPI est reclassé **LOT-11 — audit final**, à exécuter après LOT-10 et après la réconciliation des preuves ; il n'est plus un verrou absolu des parcours précédents.
- Le dernier essai CLI a retourné le code 1 et son `stderr` a été perdu. Aucune nouvelle commande CLI avec le PAT full-access n'est autorisée implicitement ; l'opérateur doit révoquer ce PAT comme prévu.
- Pour le LOT-11, privilégier une lecture via Management API avec scope strict `database:read` ou un autre accès read-only approuvé. Ne pas réutiliser le PAT full-access ni extraire `service_role` par défaut. Aucun contrôle alternatif n'a encore été exécuté ou déclaré PASS.
- Ne pas confondre l'absence de document OpenAPI avec l'indisponibilité des endpoints REST ordinaires.
- Aucune action JOBLY-PROD, aucune écriture Supabase, aucune mutation de fixture, aucune modification `main`, aucune fusion et aucun déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

### 75.5 Référence

Mise à jour V2.73 sur `e2e/recette`. Source avant cette entrée : blob SHA `4a0ca9a44416398c2f2fc1a76827a99dc42155ac`. Cette entrée documente la finalité et les limites du contrôle ; elle ne modifie pas le gate technique en statut PASS.


---

## 76. Décision de séquencement — OpenAPI déplacé au dernier LOT-11 — V2.74 — 8 novembre 2026

### 76.1 Décision

À la demande de l'opérateur, le contrôle d'exposition Data API/OpenAPI `public` et `net` est retiré du LOT-00 et devient **LOT-11 — CONTRÔLE FINAL**, à exécuter seulement après LOT-10.

Ce changement est un reclassement d'ordre et de dépendance. Il ne transforme pas le résultat actuel en PASS et ne supprime pas le contrôle : il le reporte à la fin de la campagne.

### 76.2 Séquence cible

| Ordre | Lot | Périmètre | Dépendance / règle |
|---:|---|---|---|
| 0 | LOT-00 | Préflight environnement, identification JOBLY-E2E, RLS/grants ciblés, Storage, fixtures et isolation — hors OpenAPI | Prérequis de sécurité et de disponibilité des parcours runtime concernés |
| 1 | LOT-01 | Auth, rôles, navigation et sécurité | Après les prérequis non-OpenAPI de LOT-00 |
| 2 | LOT-02 | Talent, offres, recherche et candidatures | Après LOT-01 |
| 3 | LOT-03 | Recruteur et Recruitment 360 | Après LOT-01 |
| 4 | LOT-04 | Mission Afrique et qualité des offres | Après les contrôles non-OpenAPI de LOT-00 |
| 5 | LOT-05 | J'IA 360 | Après LOT-01 |
| 6 | LOT-06 | Mobility et partenaires | Après LOT-02 et LOT-03 |
| 7 | LOT-07 | Paiements, abonnements et Mobile Money | Après LOT-02 et LOT-03 |
| 8 | LOT-08 | Events, Community, Bons Plans et Campus | Après LOT-01 |
| 9 | LOT-09 | Career Journey, Admin 360 et BI | Après LOT-01 et LOT-02 |
| 10 | LOT-10 | PWA, Android et régression transverse | Après LOT-01 à LOT-09 selon le graphe du runner |
| 11 | **LOT-11 — OpenAPI final** | Inspection Data API/PostgREST : `public=200` avec OpenAPI valide, puis `net=406/PGRST106` attendu | **Après LOT-10**, réconciliation des résultats et nettoyage de la campagne |

Le tableau de synthèse de l'exécution historique §3.3 n'est pas réécrit : il représente le run réellement communiqué à cette date. LOT-11 est un lot de fin de recette nouvellement planifié, non exécuté et absent des anciens comptages.

### 76.3 Effet sur les blocages

- Le contrôle OpenAPI n'est plus un critère d'entrée ni une dépendance des LOT-01 à LOT-10.
- L'échec CLI `BLOCKED_CLI_NONZERO_EXIT` n'empêche donc plus à lui seul la poursuite des autres lots.
- LOT-00 conserve ses contrôles propres hors OpenAPI : identité/projet, disponibilité et correspondance des fixtures, isolation, audit RLS/grants/Storage et décisions de moindre privilège nécessaires à la sécurité des parcours runtime. Le reclassement OpenAPI ne lève aucun de ces prérequis.
- Les recettes runtime restent conditionnées aux prérequis de session Auth, à l'intégrité des fixtures partagées, à l'isolation JOBLY-E2E et aux contraintes de lecture/écriture documentées par chaque lot. Le déplacement d'OpenAPI ne donne aucune autorisation de reset, provisionnement ou mutation.
- Les six groupes locaux code-only déjà PASS ne sont pas relancés.
- Le runner `scripts/e2e-local-recipe.mjs` a été inspecté : son LOT-00 est un préflight environnement/fixtures et son catalogue porte les lots LOT-01 à LOT-10 ; il ne contient pas l'appel OpenAPI. Aucun code runner n'est changé par cette décision. LOT-11 est un contrôle final documentaire/manuellement piloté, non déclenché automatiquement par le runner actuel.

### 76.4 Méthode retenue pour le LOT-11

1. Attendre la fin de LOT-10 et la réconciliation des rapports/artefacts, sans relancer les tests déjà verts.
2. Révoquer le PAT Supabase full-access utilisé lors de la tentative précédente, comme prévu par l'opérateur. Ne pas le réutiliser pour LOT-11.
3. Préférer le Management API `GET /v1/projects/{ref}/database/openapi` avec le scope OAuth `database:read` ; pour un fine-grained PAT, la permission requise est `database_read`. L'accès doit être limité au seul projet JOBLY-E2E et aux lectures de métadonnées. Éviter tout PAT classique/full-access.
4. Vérifier les deux profils attendus, sans appeler de fonction `net.http_*`, sans lire les données métier et sans modifier grants, schémas, policies, buckets ou clés.
5. Si l'accès read-only approprié n'est pas disponible à la fin, déclarer LOT-11 BLOCKED avec preuve de l'obstacle ; ne pas contourner par un PAT full-access ni par extraction de la clé `service_role`.

### 76.5 Statut après reclassement

- LOT-00 : PARTIAL sur ses seuls éléments non-OpenAPI encore à fermer ; son périmètre ne comprend plus le GET OpenAPI.
- LOT-01 à LOT-10 : séquencés selon leurs dépendances et les prérequis runtime propres ; aucune dépendance OpenAPI.
- LOT-11 : **À FAIRE EN DERNIER — NON EXÉCUTÉ**.
- Le résultat `BLOCKED_CLI_NONZERO_EXIT` est conservé comme historique de tentative antérieure et n'est pas un FAIL du service Data API.
- JOBLY-PROD reste hors périmètre ; aucune mutation de fixture non autorisée, aucun changement `main`, aucune fusion et aucun déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

### 76.6 Référence

Décision enregistrée en V2.74 sur `e2e/recette`. Source avant cette mise à jour : blob SHA `1bf9cde875353a3db200e04518c80c515caa2341`. Aucun code d'application ni runner n'a été modifié dans cette mise à jour ; seule la référence de recette et l'ordre des lots sont ajustés.
