# Jobly — Addendum continuité LOT-01 — diagnostic du timeout réseau

**Date :** 9 novembre 2026  
**Branche :** `e2e/recette`  
**Commit de code testé :** `a8b1b8ef81e41a740e7d9045650d5c60b5567f17`  
**Projet attendu :** JOBLY-E2E / `ofqqrryamslxoqkklraw`

## Résultat opérateur

- Préflight local : worktree propre ; SHA local et distant identiques (`a8b1b8ef81e41a740e7d9045650d5c60b5567f17`).
- Node : v26.13.0 ; pnpm : 10.28.0.
- Régression Auth : **30/30 PASS**, 0 échec, 0 ignoré.
- Runner `--auth-advanced-only` : **BLOCKED avant le build**.
- Rapport de synthèse frais horodaté `2026-11-09T10:24:48.240Z` : `build=NOT_RUN`, `localServer=NOT_RUN`, `authAdvancedSmoke=NOT_RUN`, `serverKeyVerifiedForE2E=false`, `serverKeyProbeStatus=null`.
- Motif du rapport : `The operation was aborted due to timeout`.
- Le runner effectue avant le build un GET en lecture seule sur `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec un délai de 12 secondes. L'absence de statut HTTP et l'abandon par timeout indiquent que la sonde réseau n'a reçu aucune réponse dans ce délai. Cela ne permet pas de conclure que la clé est invalide ; aucun code HTTP n'a été reçu.
- Build, démarrage du serveur local et navigateur : **non exécutés dans cette tentative**.

## Journaux périmés — ne pas les attribuer à cette tentative

Le fichier `auth-advanced-process.log` disponible localement contient encore l'ancien timeout Playwright `waitForEvent("requestfailed")`, horodaté autour de `08:51Z`. Le diagnostic `auth-advanced-smoke-diagnostic.json` porte aussi l'horodatage `08:51Z`. Comme le runner actuel s'est arrêté avant le build et avant le lancement du navigateur, ces fichiers sont des artefacts d'une exécution antérieure, non des résultats du run `10:24:48Z`.

Le SHA `a8b1b8e...` est bien celui de la correction qui remplace l'attente fragile Google par l'observation des requêtes bloquées au niveau du contexte navigateur. Le vieux journal ne démontre donc pas que ce correctif a échoué.

## Prochaine action — diagnostic réseau sans secret

Avant de relancer le runner complet, tester depuis le même Windows la résolution DNS et une requête Node fetch sans clé, vers le endpoint REST du projet JOBLY-E2E. Une réponse HTTP (notamment 401 sans clé) prouve que DNS/TLS/HTTP répondent ; un nouvel abandon ou une erreur de connexion confirme que la connectivité doit être résolue avant de réexécuter la recette. Ne pas afficher ni transmettre le contenu de `.env.local` ou du manifeste de fixtures.

Commande CMD de diagnostic :
```cmd
set "NETLOG=%TEMP%\\jobly-lot01-supabase-connectivity.txt"
echo JOBLY-E2E DNS and HTTPS connectivity check > "%NETLOG%"
nslookup ofqqrryamslxoqkklraw.supabase.co >> "%NETLOG%" 2>&1
echo.>> "%NETLOG%"
node -e "fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/', {signal: AbortSignal.timeout(25000)}).then(r => {console.log('HTTP_STATUS=' + r.status); return r.body?.cancel();}).catch(e => {console.log('FETCH_ERROR=' + e.name + ' CAUSE=' + (e.cause?.code || 'none')); process.exitCode=1;})" >> "%NETLOG%" 2>&1
notepad "%NETLOG%"
```

Ne pas répéter le runner complet avant cette sonde. Si HTTP répond, prévoir ensuite un retest ciblé avec une sonde de clé en lecture seule dotée de tentatives limitées et d'un diagnostic réseau explicite ; aucune écriture de données n'est nécessaire.

## Protections et statut

- Les rapports fournis indiquent `remoteBusinessDataMayBeModified=false`, `remoteAuthDeviceStateMayBeModified=false`, `remoteDataMayBeModified=false`, `secretsPrinted=false`.
- Aucun compte, mot de passe, appareil ou session préexistante n'a été réinitialisé ou révoqué.
- Pas d'accès JOBLY-PROD, pas de merge sur `main`, pas de déploiement.
- **LOT-01 demeure PARTIAL / NON CLOS**. Les 30/30 tests statiques de régression ne remplacent pas le runtime Auth avancé.

## Résultat de la sonde réseau sans clé — 9 novembre 2026

L'opérateur a exécuté le diagnostic depuis Windows :
- DNS via le résolveur local `192.168.43.1` : résolution réussie pour `ofqqrryamslxoqkklraw.supabase.co`, avec deux adresses IPv4 retournées (`172.64.149.246` et `104.18.38.10`).
- Node fetch vers `/rest/v1/` sans clé : **HTTP 401**.

Interprétation : la résolution DNS et le chemin HTTPS/HTTP jusqu'au endpoint Supabase répondent. Le HTTP 401 est attendu pour une requête anonyme sans clé ; il ne valide ni n'invalide la clé serveur `sb_secret`. Le timeout antérieur du runner reste donc à diagnostiquer sur la requête avec clé, sans conclure à une panne DNS générale.

### Prochaine commande

Effectuer une seule sonde authentifiée, en lecture seule, chargée depuis les variables locales du dépôt source. La commande doit afficher uniquement le type de clé, le statut HTTP ou le code d'erreur réseau, jamais la clé ni son contenu. Si elle répond 200, le préflight authentifié est validé et le runner ciblé peut être relancé. Si elle expire encore, conserver le journal et diagnostiquer le chemin réseau/TLS/filtrage avant toute nouvelle recette.

Le statut global ne change pas : **LOT-01 PARTIAL / NON CLOS**, car aucun build ni navigateur n'ont été exécutés dans la tentative du rapport `10:24:48.240Z`.


## Défaut du premier utilitaire de sonde de clé — 9 novembre 2026

Le premier fichier `Jobly-LOT-01-Supabase-Key-Probe.cmd` a échoué avant toute requête HTTP authentifiée :
`MODULE_NOT_FOUND: Cannot find module '@next/env'`, lors de la tentative de résolution depuis le worktree. Ce message appartient à l'utilitaire de diagnostic, pas au runner Auth ni à Supabase. Il ne permet aucune conclusion sur la clé. Le script de diagnostic dépendait inutilement du module privé `@next/env` ; le runner précédent avait, lui, déjà réussi à lire les métadonnées de configuration avant son timeout réseau.

Correction préparée : sonde V2 sans dépendance à Next.js ou `@next/env`. Elle lit localement les seules entrées nécessaires dans les fichiers .env selon la priorité Next courante, applique l'éventuel override .env.e2e.local, ne journalise jamais la valeur de clé, vérifie la portée du JWT legacy quand applicable, puis fait un GET uniquement sur `/rest/v1/` avec l'en-tête apikey. Pour une clé `sb_secret`, la portée est confirmée par la réponse HTTP, pas par décodage local.

Aucun résultat de cette V2 n'est encore disponible. Ne pas déclarer la clé validée avant un code HTTP de cette sonde. Le diagnostic réseau sans clé précédent reste PASS (DNS résolu, HTTP 401 attendu).



## Résultat de la première sonde de clé et correction de l'outil — 9 novembre 2026

Le journal utilisateur de `Jobly-LOT-01-Supabase-Key-Probe.cmd` révèle :
`MODULE_NOT_FOUND: Cannot find module '@next/env'`, avec la require stack vers `node_modules/next/package.json`. L'utilitaire s'est arrêté pendant son chargement de configuration, avant tout appel HTTP authentifié. Ce résultat n'est ni un rejet de la clé, ni un nouvel échec Supabase, ni un résultat du runner LOT-01.

Un nouveau lanceur de sonde, `Jobly-LOT-01-Supabase-Key-Probe-v2.cmd`, a été préparé et son JavaScript embarqué a passé `node --check` dans l'environnement de préparation. Il ne charge ni Next.js ni `@next/env` : il lit localement les fichiers .env nécessaires, applique l'override éventuel .env.e2e.local, masque la valeur de clé, valide le project URL et la portée des JWT legacy, puis lance un unique GET read-only vers le PostgREST JOBLY-E2E (30 secondes). Le résultat runtime sur le poste opérateur est encore **NON EXÉCUTÉ / NON PROUVÉ**.

Ne pas relancer le runner complet avant d'avoir reçu le HTTP_STATUS ou le FETCH_ERROR de la sonde V2. LOT-01 reste **PARTIAL / NON CLOS**.
