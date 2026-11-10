# Jobly — recette E2E globale

**Statut :** La recette locale bulk couvre désormais les sessions Auth réelles des trois rôles, les API Talent/Recruteur/Partenaire et un parcours croisé de candidature synthétique Talent → Recruteur. Le résultat global reste PARTIAL tant que les 11 lots et leurs parcours obligatoires ne sont pas tous validés. Une clé privée JOBLY-E2E peut être demandée localement en saisie masquée ; elle ne doit jamais être copiée dans le chat.

**Document de continuité de référence :** [docs/e2e/CONTINUITE-RECETTE-E2E.md](../docs/e2e/CONTINUITE-RECETTE-E2E.md). Mettre à jour ce bilan après chaque recette significative ; ne pas reprendre à partir d'un ancien rapport isolé.

## Balayage global rapide V1 — une seule commande

Pour la reprise rapide, utiliser le nouvel orchestrateur plutôt que lancer les runners séparément :

```cmd
call e2e\run-global-e2e.cmd
```

Il exécute en parallèle les suites statiques transversales et la préparation du runtime, vérifie l'accueil HTTP, lance les lectures runtime Talent/Recruteur/Afrique en parallèle, puis arrête uniquement le serveur identifié par son PID JOBLY-E2E. Rapport consolidé : `artifacts/e2e/global-e2e-report.md` ; détail JSON au même emplacement.

Cette passe est volontairement rapide et non destructive pour les données métier. Elle ne remplace pas une validation complète Playwright, les écritures métier synthétiques, les paiements sandbox ou les parcours runtime Mobility/Event/J'IA/Android. Les modules non exercés en runtime restent PARTIAL, jamais artificiellement PASS. Elle ne touche ni `main`, ni Vercel, ni JOBLY-PROD.

## Environnements autorisés

| Élément | Valeur |
|---|---|
| Dépôt | `kenzimayaka-glitch/Jobly` |
| Branche de recette | `e2e/recette` |
| Commit de référence initial | `979f2ccfec9258bc30989af18433cf6adb1b4698` |
| Base réservée aux tests | `JOBLY-E2E` |
| Référence Supabase E2E | `ofqqrryamslxoqkklraw` |
| Base de production | `JOBLY-PROD` — interdite en écriture et hors périmètre d'exécution |

Toutes les variables utilisées par les tests doivent pointer vers `JOBLY-E2E`. Le workflow vérifie l'URL et la référence Supabase avant de lancer le navigateur. Aucun secret de production ne doit être copié dans GitHub, dans cette branche ou dans les rapports.

## Règles de sécurité

- Aucun appel d'écriture vers JOBLY-PROD : ni SQL, ni migration, ni Auth Admin, ni Storage, ni Edge Function, ni cron, ni paiement.
- Comptes, candidatures, pièces jointes et transactions créés pour la recette doivent être synthétiques et identifiés par le run E2E.
- Les candidatures et communications externes ne sont jamais envoyées à de vrais employeurs ou contacts.
- Les paiements, Mobile Money et SMS sont testés avec simulateur ou mode sandbox uniquement. Une simulation n'est jamais présentée comme une confirmation opérateur.
- Les fonctions qui déclenchent des effets externes restent désactivées tant que leurs secrets/test doubles ne sont pas isolés.
- Pas de push ni de fusion dans `main`, pas de déploiement Vercel, sauf autorisation explicite distincte.

## Baseline Lot 0 — 2026-11-06

Les valeurs techniques détaillées sont archivées dans [lot0-baseline.json](./lot0-baseline.json).

| Contrôle | Résultat observé |
|---|---|
| Projet E2E | Actif |
| Tables publiques | 179 |
| Tables avec RLS activé | 179/179 |
| Politiques RLS | 215 |
| Tables RLS sans politique explicite | 25 ; accès direct `anon` / `authenticated` absent, `service_role` autorisé |
| Compte Auth E2E confirmé | 1 |
| Identité ADMIN active | 1 |
| Espaces ADMIN actifs | 4 |
| Offres synthétiques/publiques de référence | 31 |
| Entreprises de référence | 17 |
| Candidatures / paiements / événements de recette | 0 / 0 / 0 |
| Buckets Storage / objets | 7 / 0 |
| Edge Functions déployées sur E2E | 0 |
| Schéma `cron` observé | absent |
| Version PostgreSQL | 17.11.0.018 |

Le compte ADMIN existe et ses quatre espaces sont actifs. Son mot de passe n'est pas contenu dans le dépôt ni dans les rapports.

### Points d'attention du baseline

- L'Advisor signale 25 tables RLS sans politique explicite. Le contrôle des privilèges directs confirme qu'aucun rôle client n'a de droits sur ces tables : elles sont réservées au rôle serveur. Ce signal INFO n'est donc pas traité comme une exposition confirmée.
- L'Advisor signale également `pg_net` dans le schéma `public`. Supabase documente que cette extension est gérée par `supabase_admin` et que des `REVOKE` lancés par `postgres` peuvent être sans effet. Ne pas réappliquer aveuglément la migration de verrouillage existante ; vérifier d'abord l'exposition effective du schéma Data API et les dépendances.
- La protection des mots de passe compromis via HaveIBeenPwned n'est pas activée ; Supabase la réserve au forfait Pro ou supérieur. C'est une limitation de forfait, pas une réussite de test.
- Les fonctions Edge et le calendrier d'ingestion ne sont pas provisionnés dans E2E. Les parcours qui en dépendent restent hors périmètre tant que des variantes E2E sûres ne sont pas préparées.

## Reprise corrective du Lot 0 — 2026-11-06

Le workflow E2E est désormais déclenché **manuellement uniquement** (`workflow_dispatch`) afin d'éviter de consommer les minutes CI à chaque mise à jour de PR. Il ne déclenche aucun déploiement.

Avant le build et le navigateur, `e2e/lot0-preflight.mjs` vérifie exclusivement en lecture :
- URL et référence du projet Supabase strictement égales à `JOBLY-E2E` ;
- correspondance de la clé publishable publique avec le projet E2E ;
- disponibilité de l'API Auth E2E via une requête GET.

Le préflight ne prétend pas vérifier l'identité ADMIN, les profils métier ou une connexion interactive. Il n'effectue aucune création de compte, écriture SQL, migration, envoi d'e-mail/SMS, opération Storage, exécution Edge Function ou appel de paiement. Il ne lit ni n'utilise aucun secret de JOBLY-PROD.

### Résultats SQL en lecture seule — recontrôle du 6 novembre

- `JOBLY-E2E` : 179 tables publiques, 179/179 avec RLS, 215 politiques.
- Les 25 tables RLS sans politique explicite n'accordent aucun privilège direct à `anon` ou `authenticated` ; elles restent réservées au serveur.
- Comparaison des noms de tables avec `JOBLY-PROD` : les 165 tables de Production sont présentes dans E2E ; aucune table Production n'est absente. E2E comporte 14 tables supplémentaires liées aux espaces Admin, aux conversations J'IA et à l'Analytics.
- Comptes E2E : 1 utilisateur Auth et 1 ligne `User` avec rôle ADMIN ; `authUserId` relié, `AdminIdentity` active et 4 espaces Admin activés.
- Profils métier : 0 profil Talent et 0 profil Recruteur. Aucun compte métier synthétique n'est donc prêt pour les scénarios authentifiés.
- Entreprises : 17 ; offres de référence : 31 ; fonctions Edge déployées : 0.

Ces vérifications n'ont exécuté que des requêtes `SELECT` sur JOBLY-E2E et JOBLY-PROD. Aucune donnée n'a été modifiée. Les deux environnements conservent des historiques de migrations différents ; la comparaison ci-dessus porte sur les objets du schéma, pas sur l'égalité des historiques de migrations.
### Provisionnement local sécurisé et recette bulk

Le lanceur local `node scripts/e2e-local-recipe.mjs` prépare automatiquement trois identités synthétiques : Talent, Recruteur et Partenaire. Il utilise le client Auth Admin uniquement depuis Node.js sur le poste de recette, avec l'URL Supabase codée en garde-fou vers `https://ofqqrryamslxoqkklraw.supabase.co`.

- Le script recherche d'abord une clé privée dans un fichier local uniquement si l'URL déclarée dans ce même fichier est exactement celle de JOBLY-E2E.
- Si aucune clé E2E n'est disponible, il demande une saisie masquée dans le terminal interactif. La clé ne doit jamais être copiée dans le chat.
- La clé est conservée temporairement dans `.e2e-fixture-runtime.json`, ignoré par Git, puis supprimée à la fin du run. Elle est utilisée uniquement en mémoire par le serveur Next.js local et le script de recette pour préparer/nettoyer des fixtures synthétiques JOBLY-E2E ; elle n'est jamais journalisée ni injectée dans le navigateur.
- Si les trois comptes existent mais que le runtime privé a été supprimé par un run antérieur, le mode `--runtime-only` revalide Auth et `public.User`, puis restaure uniquement le fichier runtime. Il ne supprime ni ne recrée les comptes, ne change aucun mot de passe et ne réécrit aucun profil.
- Le provisionnement complet est désormais strictement création-only : il valide d'abord la clé et l'accès Auth Admin, puis refuse de toucher à une identité fixture déjà présente dans JOBLY-E2E. Il ne supprime plus les fichiers locaux avant validation et ne renouvelle jamais silencieusement un mot de passe existant. Si les fixtures locales ont été perdues alors que les identités existent, le runner s'arrête en BLOCKED ; une récupération ou réinitialisation ciblée exige une autorisation explicite.
- Avant toute récupération de comptes, exécuter `node e2e/verify-existing-fixtures.mjs`. Ce contrôle utilise uniquement les anciens identifiants présents dans `.e2e-fixtures.json` ou dans une sauvegarde reconnue, teste chaque connexion avec `signInWithPassword` puis vérifie la session avec `getUser`. Il n'utilise aucune clé privée, ne change aucun mot de passe et ne touche pas aux profils. S'il ne trouve aucune fixture exploitable, il retourne `NON_TESTABLE` sans tenter de connexion. Si plusieurs sauvegardes existent, passer le chemin explicite d'une seule sauvegarde en argument. Le rapport expurgé est écrit dans `artifacts/e2e/fixture-password-verification.json`.
- Vérification bulk des anciens mots de passe : `node e2e/verify-existing-fixtures-bulk.mjs`. Si une sauvegarde des fixtures est trouvée, les identifiants enregistrés sont utilisés ; sinon, le CMD demande les trois anciens mots de passe en saisie masquée. Après collecte, trois connexions Auth réelles sont lancées en parallèle, chacune avec vérification `getUser` et du rôle signé. Une seule tentative par rôle ; aucun secret n'est imprimé, aucune clé privée n'est utilisée, aucun compte/mot de passe/profil n'est modifié. Rapport expurgé : `artifacts/e2e/fixture-password-verification-bulk.json`. Si les anciens mots de passe ne sont pas connus, ne pas les deviner : interrompre la vérification.
- Réinitialisation autorisée des mots de passe des trois identités fixture déjà existantes (sans création/suppression de compte ni modification de profil) : `node e2e/reset-existing-fixture-passwords.mjs --confirm-reset-existing-e2e-passwords`. Le script exige en plus la confirmation textuelle exacte `RESET 3 JOBLY-E2E PASSWORDS`, vérifie d'abord les 3 identités Auth, les 3 liaisons `public.User` et les 3 profils métier, puis change seulement le champ password via Auth Admin. Il génère des mots de passe aléatoires et les stocke localement dans `.e2e-fixtures.json` ; le fichier temporaire de reprise `.e2e-fixture-password-reset.pending.json` est également ignoré par Git et permet de reprendre proprement après une interruption. Une Secret key (`sb_secret_`) ou l'ancienne `service_role` de JOBLY-E2E est requise, saisie masquée si elle n'est pas déjà dans un fichier `.env` explicitement pointé vers JOBLY-E2E. Rapport expurgé : `artifacts/e2e/fixture-password-reset.json`. Ne jamais transmettre les fichiers contenant les mots de passe ou la clé.
- Les mots de passe aléatoires des trois comptes de test sont conservés dans `.e2e-fixtures.json`, également ignoré par Git ; ils ne sont pas imprimés dans les rapports.
- Le script refuse une configuration de projet différente, une clé JWT dont le claim `ref` correspond à un autre projet, ou une adresse de fixture déjà utilisée par un compte non-fixture.
- Les comptes Admin existants ne sont ni lus pour leurs mots de passe, ni modifiés. Aucun e-mail, SMS, paiement ou appel externe n'est envoyé.

Le workflow GitHub Actions reste sans secret privé : il exécute les contrôles automatisés/statistiques et signale le provisionnement Auth Admin comme local-only. Le run local est la voie de recette authentifiée des trois rôles.

Le préflight ne remplace pas la validation Auth. La recette authentifiée vérifie la connexion et le renouvellement de session, les profils avec leurs bonnes clés de propriété (ID interne Jobly pour Talent/Partner, UID Auth pour Recruiter), les API Talent/Partner et les API Recruteur. Le scénario croisé crée un brouillon synthétique puis une offre locale publiée par l'API Recruteur dans JOBLY-E2E, ajoute un canal EMAIL fictif en `.invalid`, prépare une candidature Talent sans soumission, vérifie sa réception côté Recruteur, fait évoluer son état vers INTERVIEW puis OFFER et teste la priorité de la décision Recruteur. L'offre et la candidature sont supprimées et leur absence est vérifiée en base. Aucun email, SMS, paiement ou appel de fournisseur n'est déclenché.

**Critère de sortie Lot 0 :** préflight JOBLY-E2E PASS, trois comptes Auth confirmés, trois profils métier vérifiés, puis contrôles RLS/grants prouvés. Les parcours Talent/Recruteur ne sont comptés que si les appels authentifiés retournent des preuves persistées. Les autres modules conservent leurs statuts PARTIAL tant que leurs scénarios propres ne sont pas exécutés.
## Catalogue de recette

Chaque test reçoit un identifiant stable, son rôle, ses préconditions, ses étapes, ses résultats attendus, une preuve et un statut. Statuts autorisés : `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`. Sévérité : `P0`, `P1`, `P2`, `P3`.

| Lot | Modules | Couverture attendue |
|---|---|---|
| 0 | Environnement et jeux de données | Références, Auth, RLS, Storage, secrets isolés, test data |
| 1 | Auth, rôles, navigation, sécurité | Connexion, inscription, OTP, Google, mot de passe oublié, sessions, refus d'accès |
| 2 | Talent, offres, recherche, candidatures | Profil, CV, compétences, recherche, détail, préparation et suivi de candidature |
| 3 | Recruteur et Recruitment 360 | Profil entreprise, publication, réception, tri, tests, entretiens, décisions |
| 4 | Mission Afrique et qualité | Sources, collecte, normalisation, pays, dates, contact candidature, dédoublonnage, reprise |
| 5 | J'IA 360 | Conversation, mémoire, contexte, Internet Brain, outils, confirmations, offline |
| 6 | Mobility et partenaires | Demande, éligibilité, justificatifs, financement, prestataire, statut |
| 7 | Paiements et abonnements | Cycle de vie, idempotence, SMS partagé, rapprochement, sandbox uniquement |
| 8 | Events, Community, Bons Plans, Campus | Publication, inscription, interactions, modération, paiements simulés |
| 9 | Career Journey, Admin 360, BI | Objectifs, missions, espaces Admin, tableaux de bord, exports, droits |
| 10 | PWA, Android et régression transverse | Responsive, offline, synchronisation, accessibilité, performance, sécurité |

## Ordre et critères de clôture

1. Lot 0 : environnement, rôles et données de test.
2. Lot 1 : Auth, navigation et sécurité.
3. Lots 2 à 4 : flux cœur métier et offres Afrique.
4. Lots 5 à 9 : intelligence, mobilité, paiements simulés et écosystème.
5. Lot 10 : PWA/Android, performance et régression générale.

Un lot n'est déclaré vert qu'après exécution de tous ses tests obligatoires, preuve conservée, contrôle de l'état en base, régression réussie et absence d'anomalie P0/P1 ouverte. Aucun scénario non exécuté n'est comptabilisé comme réussi.

## Constat UX relevé pendant la première preuve navigateur

Le premier contrôle d'écran mobile a bien confirmé l'absence de débordement horizontal (viewport/document/body : 390/390/390 px), mais la capture a révélé un chevauchement visuel entre le texte du hero et l'illustration. Une correction CSS ciblée pour les écrans de moins de 640 px est ajoutée, ainsi qu'une assertion Playwright géométrique afin que le chevauchement ne puisse plus passer inaperçu. Le correctif reste à confirmer par le rerun navigateur.

Le run 42295562370 a exécuté 5 contrôles d'interface : 5 PASS, 0 FAIL et 0 erreur JavaScript. L'API `/api/public/home-stats` a répondu HTTP 503 faute de configuration serveur E2E dans le workflow. Le workflow a depuis été corrigé pour ne plus dépendre de secrets manuels ; ce endpoint reste à retester avec son mode public ou un mécanisme serveur isolé. Aucun formulaire ni appel externe n'a été soumis.

## Tests navigateur disponibles

Le workflow `.github/workflows/jobly-e2e-recipe.yml` construit le site dans GitHub Actions, démarre Next.js localement et lance Playwright en Chromium. Il ne déploie rien sur Vercel.

Le script `browser-smoke.mjs` couvre le parcours public d'entrée et les écrans de connexion/inscription, sans envoyer de formulaire ni contacter un service externe. Le script `authenticated-role-smoke.mjs` exerce séparément de vraies sessions Supabase Auth et les API métier Talent/Recruteur/Partenaire, avec un parcours croisé de candidature synthétique et un nettoyage vérifié en base.

La suite authentifiée utilise un secret privé strictement JOBLY-E2E, saisi localement en mode masqué si aucun fichier d'environnement E2E local n'en contient. Les comptes de test restent synthétiques ; aucun secret, compte ou service de Production n'est utilisé. Le workflow GitHub Actions ne reçoit aucun secret privé et ne prétend pas valider les parcours authentifiés.

## Rapport et preuves

Chaque run doit conserver :
- commit exact, URL/base E2E et date ;
- résultats PASS/FAIL/BLOCKED/NOT RUN par identifiant ;
- captures d'écran, traces, logs et extraits d'état non sensibles ;
- anomalie, sévérité, cause, fichier/API concernés et correction ;
- test de non-régression après correction.

Les preuves sont des artefacts GitHub Actions avec durée de conservation limitée. Ne jamais y inclure de mot de passe, clé secrète, token de session, CV ou donnée personnelle réelle.


## Lot 04 — recette bulk réelle du pipeline Afrique

### Lancement Windows durci — commande bootstrap visible

Depuis CMD, la commande à exécuter est :

```cmd
cd /d "%USERPROFILE%\Jobly-e2e-recette-lot01" && set "GIT_TERMINAL_PROMPT=0" && set "GCM_INTERACTIVE=never" && set "BOOTLOG=%TEMP%\jobly-africa-bulk-bootstrap.log" && (echo JOBLY AFRICA BULK BOOTSTRAP > "%BOOTLOG%") && echo [BOOTSTRAP 1/3] FETCH && echo [BOOTSTRAP 1/3] FETCH>>"%BOOTLOG%" && git fetch --depth=1 --progress --no-tags origin refs/heads/e2e/recette && echo FETCH_EXIT_CODE=0>>"%BOOTLOG%" && echo [BOOTSTRAP 2/3] FETCH_TERMINE && git show FETCH_HEAD:e2e/run-africa-bulk-bootstrap.cmd > "%TEMP%\jobly-africa-bulk-bootstrap.cmd" && echo [BOOTSTRAP 3/3] LANCEMENT && call "%TEMP%\jobly-africa-bulk-bootstrap.cmd" FETCH_HEAD
```

Ce fichier versionné affiche cinq jalons. Il récupère le SHA distant, extrait le PowerShell versionné dans un dossier temporaire puis l'exécute avec ce SHA. Il ne demande pas un worktree propre, n'effectue aucun checkout/reset/clean et ne modifie pas les fichiers locaux. Journal bootstrap fixe : `%TEMP%\jobly-africa-bulk-bootstrap.log`. Le lanceur PowerShell ouvre le rapport JSON si le runner Deno le produit ; sinon il ouvre son journal fixe `%TEMP%\jobly-africa-bulk-launch.log`.

Le dossier temporaire contient le snapshot du commit et son rapport ; le chemin exact du rapport est imprimé dans CMD et ouvert dans Notepad. La commande retourne 0 seulement si le rapport est PASS et si `cleanupVerified=true`.


Commande unique depuis le worktree \`Jobly-e2e-recette-lot01\` :

\`\`\`cmd
call "%USERPROFILE%\Jobly-e2e-recette-lot01\e2e\run-africa-bulk-bootstrap.cmd"
\`\`\`

Le bootstrap récupère le SHA exact de `e2e/recette`, exporte un snapshot temporaire sans checkout du worktree, réutilise les dépendances locales, exécute les garde-fous, construit Next.js, démarre un serveur local sur `127.0.0.1:3217`, puis authentifie la fixture Talent et vérifie le vrai flux `/api/jobs?scope=africa` et les deux détails d'offre. Le lot importe et exécute les fonctions réelles `job-harvest-ingest` et `job-harvest-process` sans les déployer, puis un lot d'intégration unique qui importe et exécute les fonctions réelles \`job-harvest-ingest\` et \`job-harvest-process\` sans les déployer sur Supabase. Il n'appelle aucune source Internet de recrutement.

Le lot synthétique vérifie en une passe :
- une capture avec vraie date de publication et contact email synthétique \`.invalid\` ;
- une capture sans date source, dont le premier constat doit rester une date estimée limitée à 30 jours ;
- le rejet avant persistance d'une publication trop ancienne et d'une offre dont le délai est dépassé ;
- le traitement de captures déjà présentes : expiration par ancienneté, expiration par délai et mise en quarantaine d'une date absente ;
- la cohérence \`JobHarvestCapture\` → \`Job\` → \`JobOfferPipeline\`, les pays, le contact, les statuts et le champ \`sourcePublishedAt\`.

Les objets temporaires portent une \`sourceKey\` unique \`jobly_e2e_bulk_*\`. Le runner enregistre un manifeste de reprise, supprime les lignes du lot dans l'ordre pipeline → Job → capture, puis vérifie leur absence. Si le processus est interrompu, la prochaine exécution nettoie d'abord uniquement la \`sourceKey\` du précédent run. Ne jamais modifier manuellement le manifeste pour y ajouter une autre source.

Le rapport JSON est \`artifacts/e2e/africa-bulk-recipe-report.json\`. Le wrapper ouvre automatiquement ce rapport dans Notepad ; en cas d'arrêt avant sa création, il ouvre le journal \`artifacts/e2e/africa-bulk-recipe-process.log\`. Aucun deuxième CMD ou commande Notepad n'est nécessaire.

**Écriture temporaire autorisée uniquement dans JOBLY-E2E** : ce lot crée réellement des captures, Jobs et pipelines synthétiques avant de les nettoyer. Le rapport indique donc \`temporaryE2EBusinessWrites: true\` et \`productionModified: false\`. Les communications, paiements, ingestion de sources réelles, tâches planifiées, Production, \`main\` et Vercel restent hors périmètre.

**Prérequis local :** Node.js (pour `node --test`) et Deno **2.x** dans le `PATH`. Le wrapper détecte l'absence de Deno avant tout accès en écriture et ouvre le journal explicatif dans Notepad.

Le rapport du run précédent est conservé en `artifacts/e2e/africa-bulk-recipe-report.previous.json` ; un ancien résultat n'est jamais présenté comme celui du run courant.


### Correction du lancement bloqué avant le rapport

Le bootstrap de la recette Afrique crée désormais `%TEMP%\\jobly-africa-bulk-bootstrap.log` avant le tout premier fetch, puis récupère uniquement la tête de branche (`--depth=1`) et force l'affichage de la progression Git (`--progress`). Les invites d'authentification interactives sont désactivées pour qu'une absence de jeton produise une erreur explicite au lieu de laisser la fenêtre sans résultat. Le journal bootstrap est créé avant la récupération.

Le lanceur PowerShell transmet maintenant les sorties des processus natifs au terminal et au journal au fil de l'eau avec `Tee-Object`; il ne met plus les sorties des tests et de Deno en mémoire jusqu'à la fin du processus. Le rapport et le journal deviennent donc observables pendant l'exécution.

Commande de reprise mise à jour (elle initialise d'abord le journal, avant le premier accès réseau) :

```cmd
cd /d "%USERPROFILE%\Jobly-e2e-recette-lot01" && set "GIT_TERMINAL_PROMPT=0" && set "GCM_INTERACTIVE=never" && echo [BOOTSTRAP 1/3] FETCH && git fetch --depth=1 --progress --no-tags origin refs/heads/e2e/recette && echo [BOOTSTRAP 2/3] FETCH_TERMINE && git show FETCH_HEAD:e2e/run-africa-bulk-bootstrap.cmd > "%TEMP%\jobly-africa-bulk-bootstrap.cmd" && echo [BOOTSTRAP 3/3] LANCEMENT && call "%TEMP%\jobly-africa-bulk-bootstrap.cmd" FETCH_HEAD
```

Le worktree n'est ni checkouté ni nettoyé. L'exécution de la recette reste à confirmer par un nouveau rapport runtime JOBLY-E2E avec `status=PASS` et `cleanupVerified=true`.
