# Jobly — vitrine publique et preuves de confiance

## Accès

La vitrine publique est disponible sur `/vitrine`. La route `/` reste l'entrée de l'application (connexion / inscription) et n'est pas remplacée. Les boutons d'appel à l'action de la vitrine renvoient vers l'application existante.

## Compteurs synchronisés avec l'application

Le site et l'écran d'accueil de l'application consomment la même route : `GET /api/public/home-stats`. Les champs affichés sont `talentsCount` (profils rattachés à un compte TALENT) et `offersCount` (offres d'emploi africaines visibles et à jour selon la règle de fraîcheur partagée). Aucune formule de calcul propre au site n'est utilisée.

Le site et l'accueil de l'application actualisent les compteurs toutes les 20 secondes. L'API autorise une mise en cache CDN courte de 10 secondes pour limiter les requêtes identiques sans créer deux chiffres différents. En cas d'indisponibilité, l'interface conserve la dernière valeur vérifiée ou affiche un tiret si aucune valeur n'a encore été chargée ; elle ne bascule jamais sur des chiffres marketing.

## Jobly Success Moments

`GET /api/public/success-moments` retourne uniquement des événements anonymisés : transition vers `HIRED`, enregistrée dans `RecruitmentAuditLog`, toujours à l'état courant `HIRED`, et effectuée par un rôle recruteur `OWNER`, `HR` ou `MANAGER`. Les transitions auto-déclarées par le talent ne sont pas diffusées comme recrutements confirmés.

Aucun nom, identifiant de candidature, téléphone, courriel, entreprise ou profil n'est envoyé au navigateur. Les événements sont limités aux sept derniers jours et chaque événement est présenté au plus une fois par compte ou visiteur.

La fréquence est tirée au sort séparément pour chaque compte authentifié (ou visiteur non connecté) : faible, régulière ou soutenue. Les affichages ne peuvent survenir qu'entre 10 h et 20 h, heure `Africa/Douala`, durent trois secondes et ne bloquent jamais la navigation. Le petit son Web Audio ne joue qu'après une première interaction utilisateur et peut être désactivé.

Les messages varient selon le rôle du compte : Talent (« un talent vient de décrocher un emploi »), Recruteur (« un recruteur vient de recruter un talent »), ou formulation neutre pour les visiteurs non connectés. Une notification n'est jamais générée sans événement réel admissible.

## Authentification et confidentialité

La vitrine lit la session Supabase déjà ouverte dans le navigateur. Elle transmet le jeton au serveur uniquement pour obtenir un contexte limité : rôle (`TALENT`/`RECRUITER`) et clé de compte hachée. Le jeton n'est jamais envoyé à l'interface statique ou à un tiers.

## Témoignages

Les faux témoignages de la maquette ont été retirés. La section reste prête à accueillir des retours réels de talents, recruteurs, partenaires et institutions, avec pays/drapeau, après vérification et consentement explicite.

## Validation et mise en production

Aucun schéma Supabase n'est modifié par cette intégration et aucun déploiement n'est effectué automatiquement. La PR doit passer les contrôles CI/build du dépôt, puis être relue et validée avant fusion et mise en production.

## Photographies de la vitrine

Les six photos fournies pour cette intégration sont intégrées localement dans `public/images/jobly-vitrine/` au format WebP optimisé. Répartition : `hero-community.webp` en arrière-plan du hero ; `talent-learning.webp`, `recruiter-focus.webp` et `partner-network.webp` comme illustrations des cartes Talent, Recruteur et Partenaire ; `community-celebration.webp` en arrière-plan de la section Impact ; `career-friends.webp` en arrière-plan de la section Réseau. Les images d'arrière-plan sont décoratives, avec des overlays pour préserver le contraste du texte. Les images des cartes ont des textes alternatifs bilingues et un chargement différé. Aucune photo n'est utilisée comme faux témoignage ou comme preuve d'une embauche.
