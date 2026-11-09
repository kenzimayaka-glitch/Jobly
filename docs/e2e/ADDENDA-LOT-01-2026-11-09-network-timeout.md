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
