# Jobly — Référence de continuité de la recette E2E

> ## ÉTAT MAÎTRE ACTUALISÉ — V2.5 — 8 novembre 2026
>
> **Dernier code E2E-001 commité :** `8385b60400bbaf9cedfcb4aa01073b733533f6c2` sur `e2e/recette`.
> **`main` :** inchangée dans le cadre de cette correction. **PR #266 :** reste ouverte, brouillon et non fusionnée.
> **Environnement :** JOBLY-E2E uniquement. Aucun test runtime ni accès JOBLY-PROD n'a été effectué pendant la correction distante.
>
> **Important — instructions historiques neutralisées :** les instructions plus anciennes de ce document qui autorisaient ou demandaient une réinitialisation des mots de passe, une recréation de fixtures ou l'exécution de `e2e/reset-existing-fixture-passwords.mjs` sont obsolètes et ne doivent pas être suivies. Le script local `e2e/reset-existing-fixture-passwords.mjs` reste à préserver et ne doit pas être exécuté. Aucune fixture partagée ne doit être modifiée sans nouvelle autorisation explicite et spécifique.
>
> **Nouvelle méthode de continuité :** ce fichier Markdown dans Git est la seule référence maître. Chaque nouvelle conversation Jobly doit le lire intégralement avant d'agir. Après chaque réponse Jobly, le mettre à jour dans cette branche et donner comme preuve le commit GitHub ainsi que le chemin du fichier. Ne pas passer par la Bibliothèque/Word pour cette continuité.
>
> **État E2E-001 :** le code a été corrigé directement sur GitHub. Le smoke Talent ne fait plus de `PUT /api/profile`; la zone read-only couvre tout le bloc Talent ; le test statique de non-mutation a été ajouté et intégré au LOT-01. **Validation statique locale encore à exécuter** après synchronisation du poste opérateur. Aucun PASS de test n'est encore revendiqué.

**Version :** 2.5  
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

## 7. Plan de reprise ordonné

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

## 9. Point exact de reprise au moment de cette consolidation

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

## 10. Recette bulk après récupération des fixtures — 7 novembre 2026

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
5. Aucun merge vers `main), aucun déploiement, aucun accès JOBLY-PROD.

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

## 11. Recette E2E complète après récupération des fixtures — 8 novembre 2026

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

## 12. Extension de la recette runtime authentifiée — 8 novembre 2026

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
- Marqueur `E2E-READONLY-TALENT-START` placé avant `TALENT-PROFILE-READ) ; marqueur END présent à la fin du bloc Talent.
- Test statique : sixième test présent ; il inspecte la frontière entre `if (item.role === "TALENT")` et `if (item.role === "RECRUITER")`.
- Runner 11 lots : le fichier de régression est listé dans LOT-01.
- Aucun changement de branche `main), aucune fusion PR, aucun déploiement et aucune requête vers Supabase n'ont été effectués dans cette séquence.

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

Attendu : HEAD `8385b60400bbaf9cedfcb4aa01073b733533f6c2` ou un SHA descendant explicitement vérifié sur la branche `e2e/recette). Si le pull est refusé à cause d'un conflit ou d'un état local, **ne pas lancer reset, stash, clean ou suppression** ; transmettre le rapport et traiter le conflit en préservant tous les changements.

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
4. Seulement après preuves de stabilité et d'isolation, relancer la recette bulk avec `E2E_LOT_CONCURRENCY=2). Garder les scénarios utilisant les mêmes fixtures et objets séquentiels.
5. Ne pas déclarer les lots PASS tant que tous les scénarios métier obligatoires ne sont pas testés et que les preuves d'accès, persistance et nettoyage ne sont pas jointes.

### 13.7 État de continuité après cette mise à jour

- E2E-001 : correctif commité sur `e2e/recette) ; test statique local en attente.
- Smoke Auth Talent : ne pas exécuter avant PASS statique et audit LOT-00.
- Campagne bulk locale : ne pas relancer avant fermeture des prérequis.
- JOBLY-E2E : aucune opération runtime effectuée par les commits documentaires/code.
- JOBLY-PROD : interdit, aucun accès.
- PR #266 : ouverte, brouillon, non fusionnée.
- `main) : inchangée.
- Fixtures partagées : aucune modification par cette correction.
