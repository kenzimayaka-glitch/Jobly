# Jobly Security Core — état vérifié au 6 novembre 2026

## Production déjà protégée

- PR #252 fusionnée sur `main`, commit `19b584eec939d9162f7c9306246eeea1d34fcd79`.
- Migration Supabase `20261106091500_jobly_security_core` appliquée sur JOBLY-PROD (`mpoyaegtwtmhookdzqdy`) et smoke test exécuté.
- Les accès directs anon/authenticated aux tables sensibles `Job`, `RecruiterJob`, `Company`, `JobHarvestCapture`, `JobOfferPipeline`, `JobSource` sont révoqués; la lecture serveur `service_role` est préservée.
- Le catalogue comptait 2 715 offres actives au contrôle suivant migration.
- Limiteur atomique partagé entre instances, identifiants HMAC-SHA-256, réponses 429/Retry-After, et fermeture 503 si le contrôle serveur ne peut pas être effectué.
- Secret `JOBLY_RATE_LIMIT_SECRET` configuré dans les environnements Vercel Production, Preview et Development.
- En-têtes HTTP de sécurité, anti-cache des API, sourcemaps de production protégées/désactivées et réponse `X-Powered-By` retirée.
- Android : R8 et resource shrinking activés; règles ProGuard pour le worker WorkManager.
- Déploiement Vercel de production vérifié `READY` sur `jobly-c0651.vercel.app`; aucun runtime error dans l'heure contrôlée.

## Deuxième vague en préparation sur branche dédiée

Branche : `feat/security-red-remediation-20261106` (non fusionnée tant que les contrôles CI et la revue ne sont pas terminés).

- Android Play/internal split : la variante `play` conserve le package public `com.jobly.android`, mais ne déclare ni `RECEIVE_SMS` ni receiver système. Le paiement côté utilisateur passe par le partage volontaire d'un reçu depuis Messages vers Jobly; l'API n'active pas l'abonnement sur cette seule preuve.
- Variante `internal` : conserve la réception automatique pour le téléphone marchand géré par Jobly, avec package distinct `com.jobly.android.internal`; elle n'est pas destinée au Play Store.
- L'interface d'administration affiche la capacité réelle de la variante Android avant de proposer la permission.
- Validation AAB Play ajoutée en CI. L'artefact de validation est non signé tant qu'un keystore de publication n'est pas fourni par secret; aucun upload Play Console n'a été effectué.
- Réévaluation Career Journey : contrôle START+ et limitation partagée par compte/IP.
- Lots de candidatures : vérification serveur des limites de postulation groupée et du quota hebdomadaire avant création.
- Gmail recruteur : rôle RECRUITER/ADMIN requis; utilisation et stockage des jetons Gmail réservés aux plans PREMIUM/PRO.
- J'IA proactive : limite atomique partagée compte/IP au lieu d'une Map mémoire par instance.
- Tests de régression d'entitlements et CodeQL v4 pour TypeScript/JavaScript, Kotlin et workflows; Dependabot hebdomadaire ajouté.

## Contrôles externes toujours requis

1. **GitHub visibilité** : le dépôt est actuellement `public`. Je ne l'ai pas rendu privé car cela peut casser l'accès public ou les workflows externes et la décision de confidentialité n'a pas été demandée. Le passer en privé seulement si le dépôt doit être propriétaire; l'intégration connectée n'expose pas l'action d'administration nécessaire.
2. **Protection de `main`** : l'API connectée retourne une liste de rulesets vide; la lecture de l'endpoint de branch protection renvoie 403, donc je ne peux pas confirmer l'existence ou l'absence d'une ancienne règle de protection. Une règle explicite doit exiger les checks CI, une revue, bloquer le force push et la suppression, et limiter les bypass.
3. **Secret Scanning / Push Protection** : le dépôt est public. GitHub indique que le secret scanning s'exécute automatiquement et que la protection utilisateur contre les secrets connus bloque par défaut certains pushes vers les dépôts publics. L'activation des alertes et des contrôles de bypass au niveau du dépôt n'a pas été vérifiée par l'intégration; CodeQL ne remplace pas ces fonctions.
4. **Supabase Auth — mots de passe compromis** : l'option Leaked Password Protection reste à activer dans Auth → Password Security lorsque disponible sur le plan du projet.
5. **Vercel WAF personnalisé / Bot Management** : le projet Hobby n'avait pas de configuration Seawall initialisée (API retourne `Seawall Config not found`). Ne pas déclarer de règle custom active. La mitigation DDoS de plateforme est distincte de ces règles personnalisées.
6. **Turnstile** : les clés `TURNSTILE_*` sont absentes; l'intégration n'est pas active.
7. **Play Integrity** : pas encore configuré côté Play Console + Google Cloud, et aucun verdict n'est vérifié par le serveur. Ne pas assimiler la signature ou R8 à Play Integrity.
8. **Signature release Android** : l'AAB de validation CI ne sera pas publiable avant configuration d'un keystore release sécurisé et d'une piste de test Google Play.
9. **Audit Premium exhaustif** : 186 routes API ont été recensées. La deuxième vague couvre les contournements identifiés ci-dessus, mais toutes les actions Premium dans chaque module n'ont pas encore une matrice d'évidence complète.
10. **Supabase `pg_net`** : l'extension est détenue par `supabase_admin`, non-relocatable, et une tâche cron `postgres` l'utilise. Supabase confirme que les privilèges par défaut de l'extension ne peuvent pas être révoqués par `postgres`; les rôles `anon` et `authenticated` sont `NOLOGIN`, et le schéma `net` n'est pas ajouté à l'exposition PostgREST par défaut. Il faut conserver l'extension et la tâche cron. Le contrôle pertinent est de vérifier les schémas réellement exposés dans Data API et de ne jamais y ajouter `net`; ne pas créer de migration `REVOKE` trompeuse.

## Modèle Android SMS et Google Play

- Le bundle destiné au Play Store ne demande pas l'accès à la boîte SMS; le payeur partage manuellement un reçu choisi.
- Le receiver automatique appartient uniquement à la variante interne de l'appareil marchand.
- Le SMS client reste une preuve de corroboration; l'abonnement ne devient actif qu'après confirmation indépendante du compte marchand ou prestataire.
- Le ciblage Android est API 36; la compilation ne remplace pas les tests sur appareils physiques, la signature release et l'examen de Google Play.

## Ordre de validation de cette deuxième vague

1. Contrôles CI Node/TypeScript/Android et CodeQL.
2. Vérification des manifests fusionnés Play et internal, build `bundlePlayRelease`, instrumentation tests.
3. Audit des changements API Premium et test de non-régression FREE/START/PREMIUM/PRO.
4. Fusion du PR après CI verte, puis un seul déploiement Vercel Production.
5. Vérifications post-déploiement; upload Google Play seulement après signature release et piste de test.
