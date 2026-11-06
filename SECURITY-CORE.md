# Jobly Security Core — première livraison

Date : 6 novembre 2026  
Branche : `feat/jobly-security-core-20261106`  
Base : `main` à `12bffe1dbb7288c3a92ef0a86cd842dfcbafb30f`

## Implémenté dans cette branche
- Rate limiter atomique, partagé entre instances Next.js et stocké en base; limites par compte + IP sur le feed et les opportunités, par IP sur le détail d'offre.
- Les identifiants d'IP et de compte sont HMAC-SHA-256; aucune IP brute ni identifiant brut n'est stocké dans les compteurs. Les erreurs DB/config ferment l'accès avec 503; dépassement retourne 429 et Retry-After.
- Migration pour retirer les accès directs anon/authenticated aux tables `Job`, `RecruiterJob`, `Company`, `JobHarvestCapture`; les routes serveur existantes utilisent le client serveur privilégié.
- En-têtes web: HSTS, nosniff, anti-framing, Referrer-Policy, Permissions-Policy; API no-store/noindex; source maps de production désactivées; X-Powered-By désactivé.
- Renforcement Android: resource shrinking R8 et règle keep pour le worker WorkManager. R8/minification, `allowBackup=false`, HTTP clair désactivé et bridge WebView origin-bound étaient déjà présents.
- Le Service Worker existant contourne déjà les réponses `/api/`, `/auth/`, `/_next/data/` pour ne pas mettre en cache les données privées.

## Non déclaré comme actif
- Play Integrity (client + vérification serveur Google) : nécessite Play Console, configuration Google Cloud et identité serveur; aucune vérification fictive ajoutée.
- CSP stricte : reportée jusqu'à l'inventaire des fournisseurs externes afin de ne pas casser OAuth, paiements, médias et J'IA.
- WAF / Bot Management / Turnstile : pas activé dans cette PR; le rate limiting n'arrête pas le scraping distribué.
- L'audit exhaustif de toutes les actions Premium reste à compléter; les droits doivent être calculés côté serveur pour chaque action sensible, jamais à partir d'un drapeau client.

## Blocages externes
1. Le dépôt GitHub `kenzimayaka-glitch/Jobly` est actuellement **public**. Tant qu'il reste public, le code source et cette branche sont clonables. L'intégration ne permet pas de changer la visibilité; si le code est propriétaire, passer le dépôt en privé dans GitHub Settings > General > Danger Zone, puis vérifier Actions et Vercel.
2. La migration Supabase incluse n'a pas été appliquée à JOBLY-PROD. Le nouveau code du limiter échouera volontairement en 503 tant que la migration n'est pas appliquée; déployer dans l'ordre migration, smoke test, puis application.
3. Supabase Security Advisor signalait la protection contre les mots de passe compromis désactivée; l'activer dans Auth > Password Security.
4. L'état Secret Scanning / Push Protection n'a pas pu être lu via l'intégration; vérifier et activer sur GitHub.
5. L'accès au endpoint branch-protection a répondu 403; les règles branch protection de main doivent être contrôlées manuellement. Le endpoint rulesets ne retournait aucun ruleset.

## Ingestion
Les Edge Functions Harvest avec `verify_jwt=false` inspectées vérifient dans leur code un JWT GitHub Actions OIDC (issuer, audience, repository, ref). Ne pas activer aveuglément le JWT Supabase sur ces endpoints, ce qui casserait le chemin OIDC; conserver et tester cette vérification.

## Ordre de mise en production
1. Régler la visibilité privée du dépôt si le code doit être propriétaire.
2. Examiner et appliquer la migration via le processus normal Supabase; vérifier les advisors et le smoke test.
3. Tester le feed Talent/recruteur, les détails publics, Company et les candidatures (les lectures directes Data API sont volontairement fermées).
4. Déployer le code seulement après vérification de la migration.
5. Ajouter Play Integrity et une CSP stricte lorsque les prérequis externes seront configurés.

Aucune migration n'a été exécutée sur la production, aucune configuration Vercel n'a été modifiée et aucun merge/déploiement n'a été effectué par cette branche.
