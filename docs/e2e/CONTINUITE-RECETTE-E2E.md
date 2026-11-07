# Jobly — Référence de continuité de la recette E2E

**Version :** 1.0  
**Date de consolidation :** 7 novembre 2026  
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

## 7. Plan de reprise ordonné

### Étape A — état local, sans toucher aux comptes

À demander à l'opérateur, dans son CMD, sans afficher ni transmettre le contenu des fichiers :
- rechercher une copie de sauvegarde de `.e2e-fixtures.json` (historique de fichiers, sauvegarde du dossier, corbeille, copie locale sécurisée) ;
- rechercher si un fichier `.env.e2e.local`, `.env.local` ou `.env` contient une URL JOBLY-E2E et une clé privée correspondante, sans imprimer la clé ;
- conserver l'information de disponibilité sous forme PRESENT/ABSENT seulement.

### Étape A2 — vérification des anciens mots de passe (lecture seule)

Le script `e2e/verify-existing-fixtures.mjs` est disponible sur la branche. Après synchronisation, exécuter `node e2e/verify-existing-fixtures.mjs`, puis ouvrir `artifacts/e2e/fixture-password-verification.json`. Il recherche `.e2e-fixtures.json` ou une sauvegarde reconnue, tente un vrai `signInWithPassword` pour chacun des trois rôles et valide la session avec `getUser`. Il n'utilise aucune clé privée, ne modifie aucun mot de passe, compte ou profil, et n'imprime aucun secret. Si aucun fichier d'identifiants n'est disponible, le résultat correct est `NON_TESTABLE` ; ne pas remplacer cela par un provisionnement complet. En présence de plusieurs sauvegardes, indiquer explicitement le chemin d'une seule au script.

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

## 9. Point exact de reprise au moment de cette consolidation

**À faire en premier :** demander à l'opérateur de vérifier les sauvegardes de dossier (Windows Previous Versions/File History, outil de sauvegarde local ou copie externe) pour retrouver `.e2e-fixtures.json`. Le vérificateur n'a parcouru que la racine du dépôt et a retourné `NON_TESTABLE` pour les trois rôles sans appeler Auth. Ne pas redemander une clé et ne pas relancer le runner. Si aucune sauvegarde n'est retrouvée, présenter les preuves puis demander une autorisation explicite avant toute réinitialisation ciblée des mots de passe des comptes existants.

**État attendu du prochain échange :**
- Talent : PASS / FAIL / NON TESTABLE.
- Recruteur : PASS / FAIL / NON TESTABLE.
- Partenaire : PASS / FAIL / NON TESTABLE.
- Sauvegarde de `.e2e-fixtures.json` : PRESENT / ABSENT.
- Source locale d'une clé JOBLY-E2E : PRESENT / ABSENT (ne jamais révéler la valeur).

**Décisions non prises :** aucune réinitialisation de mot de passe, aucune recréation de compte, aucune fusion PR, aucun déploiement.

Ce document est la référence de continuité jusqu'à sa prochaine mise à jour versionnée.
