# Jobly — recette de la vitrine publique

**Objet :** `/vitrine`, compteurs dynamiques et Jobly Success Moments
**Branche testée :** `feat/public-vitrine-live-stats-success-moments`
**Commit de référence :** `73d86bd17fea59c5d5bc638f48956c201b0fe8ff`
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

Commande depuis la racine du dépôt :
```powershell
$env:JOBLY_VITRINE_BASE_URL = "https://URL-PREVIEW"
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

## Résultat initial du contrôle Preview

- Build Next.js : PASS.
- TypeScript : PASS.
- `/vitrine` : HTTP 200.
- Les six images : HTTP 200.
- `/api/public/success-moments` : HTTP 200 ; liste vide au moment du contrôle, donc aucune notification ne doit apparaître.
- `/api/public/site-context` sans authentification : HTTP 200 ; `accountKey=null`, `role=null`.
- `/api/public/home-stats` : HTTP 503 sur le premier Preview. **Recette bloquée sur ce point** ; il doit répondre HTTP 200 avec les compteurs vérifiés avant de déclarer la vitrine intégralement validée.

## Limites de cette recette

La recette automatisée ne simule pas une session Talent ou Recruteur authentifiée et ne crée pas de candidature / embauche. Les cas authentifiés, le test réel du son et l'affichage d'un événement HIRED nécessitent des comptes et des données de test autorisés dans l'environnement JOBLY-E2E.