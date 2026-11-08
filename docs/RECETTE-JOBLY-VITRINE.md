# Jobly — recette de la vitrine publique

**Objet :** `/vitrine`, compteurs dynamiques et Jobly Success Moments
**Branche testée :** `feat/public-vitrine-live-stats-success-moments`
**Commit Preview validé :** `90b61817016aa7c1d0b379ea2cd6f87a6214f5e4`
**Environnement :** Vercel Preview uniquement — pas de mise en production.

## Périmètre

- Page publique et navigation responsive.
- Six photos locales WebP : hero, trois cartes de parcours, section Impact et section Réseau.
- Compteurs Talents / Offres consommant la même API que l'application.
- Notifications de succès basées exclusivement sur les transitions réelles vers `HIRED`, validées par un rôle recruteur autorisé.
- Accès anonyme, absence de fuite d'identifiants dans les payloads publics.
- Conservation de la route `/` comme entrée existante de l'application.

## Recette technique automatisée

Le script `scripts/jobly-vitrine-smoke.mjs` vérifie :
1. `/vitrine` répond HTTP 200 et contient les six sections.
2. `/` reste accessible.
3. Les six images répondent HTTP 200 avec `Content-Type: image/webp`.
4. `/api/public/home-stats` répond HTTP 200 avec deux entiers non négatifs et un horodatage.
5. `/api/public/success-moments` renvoie une liste d'événements valide, avec seulement `id` et `occurredAt`.
6. `/api/public/site-context` ne révèle aucun identifiant ni rôle à un visiteur anonyme.

Commande depuis la racine du dépôt : coller le lien de partage Vercel complet (y compris le paramètre `_vercel_share`) dans la variable. Le script propage ce paramètre à toutes les requêtes.
```powershell
$env:JOBLY_VITRINE_BASE_URL = "COLLER ICI LE LIEN DE PARTAGE VERCEL COMPLET"
node scripts/jobly-vitrine-smoke.mjs
```

## Recette fonctionnelle à effectuer dans le navigateur

| ID | Test | Résultat attendu |
|---|---|---|
| VIT-01 | Ouvrir `/vitrine` sur ordinateur | La page s'affiche, aucun écran d'erreur |
| VIT-02 | Ouvrir `/` | L'entrée de l'application existante est conservée |
| VIT-03 | Parcourir le hero et les sections | Les titres et CTA restent lisibles sur les photos |
| VIT-04 | Vérifier les trois cartes | Les images Talent, Recruteur et Partenaire sont présentes |
| VIT-05 | Ouvrir le sélecteur FR/EN | Les libellés changent sans rechargement |
| VIT-06 | Cliquer sur les liens de navigation | Les ancres ouvrent la bonne section |
| VIT-07 | Tester sur un écran mobile | Menu, cartes, compteurs et CTA restent utilisables |
| VIT-08 | Faire défiler la page | Les animations ne bloquent pas la navigation |
| VIT-09 | Attendre deux rafraîchissements de compteurs | Les valeurs proviennent de l'API commune et se mettent à jour |
| VIT-10 | Visiteur non connecté | Aucun identifiant de compte n'est exposé |
| VIT-11 | Vérifier les Success Moments | Aucune notification sans événement HIRED admissible |
| VIT-12 | Après interaction, avec événement admissible | Son discret et notification de 3 secondes, entre 10 h et 20 h Africa/Douala |
| VIT-13 | Désactiver le son | Le son reste coupé après rechargement |
| VIT-14 | Activer la préférence de réduction des animations | Les contenus restent visibles sans mouvement superflu |

## Critères de validation

- Aucun chiffre de repli marketing en cas d'indisponibilité de l'API.
- Aucune notification fictive ou auto-déclarée comme recrutement confirmé.
- Aucune donnée personnelle dans les événements publics.
- Les images doivent être servies depuis `/images/jobly-vitrine/`, sans URL temporaire.
- Aucune modification de schéma Supabase n'est requise par cette vitrine.

## Résultat du contrôle Preview (8 novembre 2026)

- Build Next.js : PASS.
- TypeScript : PASS.
- `/vitrine` : HTTP 200.
- `/` : entrée de l'application conservée.
- Les six images WebP : HTTP 200.
- `/api/public/home-stats` : HTTP 200 ; **2 415 offres et 3 talents** au moment du contrôle.
- `/api/public/success-moments` : HTTP 200 ; 0 événement admissible. Aucune notification ne doit donc apparaître.
- `/api/public/site-context` sans authentification : HTTP 200 ; `accountKey=null`, `role=null`.
- Le contrôle automatisé direct sans jeton Vercel a répondu HTTP 401 (protection Preview) ; le script transmet désormais le paramètre de partage à toutes les routes.
- Un premier appel aux compteurs avait répondu 503 ; l'appel de contrôle suivant a répondu 200 avec les valeurs ci-dessus. La réponse 503 n'est pas reproduite au contrôle final.

## Limites de cette recette

La recette automatisée ne simule pas une session Talent ou Recruteur authentifiée et ne crée pas de candidature / embauche. Les cas authentifiés, le test réel du son et l'affichage d'un événement HIRED nécessitent des comptes et des données de test autorisés dans l'environnement JOBLY-E2E.