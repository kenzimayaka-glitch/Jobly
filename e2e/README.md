# Jobly — recette E2E globale

**Statut :** préparation Lot 0 terminée partiellement ; Lot 1 (contrôle navigateur de l'accueil et des écrans Auth) instrumenté. La recette globale n'est pas déclarée verte.

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
- Les fonctions Edge et le calendrier d'ingestion ne sont pas provisionnés dans E2E. Les parcours qui en dépendent restent BLOQUÉS jusqu'à installation contrôlée des fonctions et secrets E2E.

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

## Tests navigateur disponibles

Le workflow `.github/workflows/jobly-e2e-recipe.yml` construit le site dans GitHub Actions, démarre Next.js localement et lance Playwright en Chromium. Il ne déploie rien sur Vercel.

Le script `browser-smoke.mjs` couvre uniquement le parcours public d'entrée et les écrans de connexion/inscription, sans envoyer de formulaire ni contacter un service externe. Ce premier smoke ne valide pas encore les flux authentifiés, les APIs métier ni la persistance en base.

Pour la suite authentifiée, les secrets devront être ajoutés dans GitHub Actions sous des noms E2E dédiés : `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` et, selon les tests, `E2E_DATABASE_URL`. Ne jamais les écrire dans le dépôt ou les transmettre dans la conversation. Le script et le workflow devront refuser toute URL Supabase ne correspondant pas à la référence E2E.

## Rapport et preuves

Chaque run doit conserver :
- commit exact, URL/base E2E et date ;
- résultats PASS/FAIL/BLOCKED/NOT RUN par identifiant ;
- captures d'écran, traces, logs et extraits d'état non sensibles ;
- anomalie, sévérité, cause, fichier/API concernés et correction ;
- test de non-régression après correction.

Les preuves sont des artefacts GitHub Actions avec durée de conservation limitée. Ne jamais y inclure de mot de passe, clé secrète, token de session, CV ou donnée personnelle réelle.
