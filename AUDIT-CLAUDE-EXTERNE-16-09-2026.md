# AUDIT EXTERNE JOBLY — 16/09/2026
Auditeur : Claude (Anthropic) — audit statique indépendant du livrable
`Jobly-Cinematic-15-10-V23-True-Video-Pitch-16-09-2026.zip`.

## 0. Mon avis général

C'est un projet sérieux, pas un prototype cosmétique. 67 pages Next.js, 43
routes API, un vrai modèle de données Prisma/Supabase, une logique métier
(matching, mobilité, paiement iClan, ATS) qui existe réellement dans le
code — ce n'est pas juste de la maquette. Le plus impressionnant : les
équipes précédentes ont documenté leurs propres limites avec une honnêteté
inhabituelle (`Statut.md`, 113 Ko de journal, assume noir sur blanc les
zones non testées).

Le vrai problème n'est pas le code, c'est la **validation** : ce livrable
n'a jamais été buildé avec succès dans un environnement complet (pas de
`node_modules`, pas de lockfile dans le zip), donc personne ne peut
garantir aujourd'hui que `npm run build` passe. Tout le reste — bugs de
navigation, incohérences, fonctions décoratives — est secondaire à côté de
ce point-là.

## 1. Méthodologie

Audit **statique**, sans exécution (pas de build possible : réseau
sandbox désactivé, pas de `node_modules`/lockfile fournis). J'ai :
- listé les 67 routes (`app/**/page.tsx`) et 43 endpoints API (`app/api/**/route.ts`) ;
- extrait par script tous les `href`, `router.push/replace`, appels `fetch("/api/...")` du code (pas de la doc) et vérifié qu'ils pointent vers une route ou un endpoint qui existe réellement ;
- vérifié tous les imports locaux (`@/...`, `./...`) — 0 import cassé trouvé ;
- inspecté à la main les composants de navigation (`BottomNav`, `BottomNavTalent`, `BottomNavPartner`, `JoblyCinematic`) clic par clic ;
- recherché les marqueurs d'inachèvement (`TODO`, `disabled`, `alert(`, `href="#"`, `console.log`, "bientôt disponible") ;
- confronté les affirmations des documents internes (`Statut.md`, `README.md`) au code réel, pour repérer les endroits où la doc dit "corrigé" mais le code dit le contraire ;
- lu `.env`/variables `process.env.*` pour vérifier la configuration de déploiement.

## 2. Ce qui fonctionne bien (vérifié dans le code, pas dans la doc)

- **Navigation principale saine** : les 3 barres de navigation (Talent, Recruiter, Partner) et les 2 barres Mobility pointent toutes vers des pages qui existent. Aucun `href="#"`, aucun lien mort dans les composants de nav.
- **Aucun import cassé** sur 171 fichiers TS/TSX.
- **43 routes API cohérentes** avec les appels `fetch()` du frontend (jobs, candidatures, ATS, mobilité, paiement, profil, AI) — je n'ai trouvé aucun appel vers un endpoint inexistant.
- Le flux **Talent → Jobs → Candidature → ATS Recruteur** est câblé de bout en bout sur des données réelles (`/api/jobs`, `/api/applications`, `/api/recruiter/applications`), pas des données de démo.
- Le moteur **True Video Pitch** (V23) est le morceau le plus abouti techniquement : upload/caméra, validation de durée 5–8s, stockage Supabase, propagation réelle du pitch du Talent vers le Recruteur — bien pensé, avec fallback honnête si le Talent n'a pas encore de vidéo.
- Le flux paiement iClan (`/abonnement`) fait un vrai aller-retour API (souscription, vérification de statut), pas un mock.

## 3. Incohérences et blocages trouvés (vérifiés, pas supposés)

### P0 — Pages codées mais **inaccessibles en clic** (portes qui ne mènent nulle part)
Confirmé par recherche exhaustive dans le code (pas dans la doc) : **aucun**
`href`, `router.push` ou `router.replace` littéral du code ne pointait vers
ces 5 routes avant mes corrections. Elles n'étaient joignables qu'en tapant
l'URL à la main :
- `/recruiter/onboarding`
- `/recruiter/mobility`
- `/ai/application`
- `/ai/companion`
- `/ai/interview` (seul `/ai/learning` était relié, depuis le dashboard)

**Point important** : `Statut.md` (16/09/2026) affirme *« `/recruiter/onboarding`
et `/recruiter/mobility` sont accessibles depuis le dashboard Recruiter »* —
c'est faux, je l'ai vérifié ligne par ligne dans `app/recruiter/page.tsx` et
`components/JoblyCinematic.tsx` : aucun des deux ne contient de lien vers ces
routes. La documentation interne s'est auto-déclarée "corrigée" sur ce point
sans que le correctif ait réellement été poussé dans le code livré.
→ **J'ai corrigé ce point** dans ce zip (voir §5).

### P0 — Fonctionnalité "Importer en 10s" trompeuse
Le bouton recruteur *« Colle l'URL LinkedIn/Indeed → Importer en 10s »*
(`components/recruiter/RecruiterJobForm.tsx`, fonction `scrapeJobFromUrl`
dans `lib/jobImportService.ts`) **ne scrape rien**. Il génère un titre
générique (`"Opportunité importée depuis linkedin"`) et une description
passe-partout à partir du seul nom de domaine de l'URL, sans lire le
contenu réel de la page. Le recruteur peut légitimement croire qu'une
vraie extraction a eu lieu. C'est le point le plus sensible de l'audit
en termes de confiance utilisateur.
→ **J'ai ajouté un avertissement visible** sous le bouton (voir §5) ; la
vraie extraction reste à implémenter (scraping serveur ou API tierce).

### P1 — Élément d'interface décoratif sans fonction
La case à cocher *« Connecter Gmail pour recevoir les candidatures »*
(même formulaire) était cochée par défaut mais n'avait **aucun** gestionnaire
(`onChange`) et aucune intégration Gmail n'existe nulle part dans le code
(aucune variable d'environnement, aucun flux OAuth). Un recruteur pouvait
croire que ses candidatures Gmail étaient déjà connectées.
→ **Corrigé** : case désactivée et libellée "Bientôt disponible", sur le
même modèle que le bouton IA déjà honnêtement désactivé plus bas dans le
même formulaire.

### P1 — 3 `alert()` natifs dans le tunnel de candidature
`app/jobs/[id]/page.tsx` utilise `alert()` du navigateur (candidature déjà
postulée, confirmation, erreur réseau) — rupture nette avec le reste de
l'app qui est en Cinematic UI (haptique, sons, animations, bottom sheets).
Non corrigé dans ce passage (changement d'UI plus risqué sans build local
pour vérifier le rendu) — recommandé en prochaine itération.

### P1 — Configuration de déploiement incomplète
Aucun fichier `.env.example` n'existait dans le livrable alors que 16
variables d'environnement distinctes sont lues dans le code (Supabase,
iClan, Gemini, Brandfetch, Microsoft Learn, secret webhook). Sans ce
fichier, un déploiement à froid ne peut pas savoir quelles clés préparer.
→ **Ajouté** dans ce zip (`.env.example`).

### P1 — Build jamais validé de bout en bout
`node_modules` et `package-lock.json` sont absents du zip (choix assumé
dans `Statut.md`). Résultat : **aucun** des documents internes ne peut
prouver que `npm run build` / `npm run typecheck` réussit réellement — ils
disent tous "à valider sur Vercel". Je n'ai pas non plus pu l'exécuter ici
(sandbox sans accès réseau pour `npm install`). C'est le principal angle
mort de tout le projet : tout le reste de l'audit porte sur du code
statique jamais compilé avec succès de façon vérifiable.

### Mineur — Fonctionnalités honnêtement désactivées (pas des bugs)
- Génération de description d'offre par IA : bouton visiblement grisé
  "Bientôt disponible", avec `title` renvoyant vers `Statut.md §17`. C'est
  la bonne pratique — signalé ici uniquement pour valoriser ce qui est
  déjà bien fait, pas comme un problème.
- Persistance des CV Talent : explicitement documentée comme "locale au
  navigateur" dans l'interface elle-même — honnête, pas un bug caché.
- Billing Partner : l'écran affiche les commissions réelles sans simuler
  de versement — décision assumée et documentée dans `AUDIT-E2E-CONTINUITE`.

## 4. Inventaire technique

| Élément | Compte |
|---|---|
| Pages Next.js (`page.tsx`) | 67 |
| Endpoints API (`route.ts`) | 43 |
| Fichiers TS/TSX totaux | 171 |
| Imports locaux cassés | 0 |
| `href="#"` / liens morts dans la nav | 0 |
| Pages orphelines confirmées (avant correctif) | 5 |
| `alert()` natifs restants | 3 |
| Variables d'environnement utilisées sans `.env.example` (avant correctif) | 16 |

## 5. Corrections appliquées dans ce zip (changements additifs, sans suppression de fonctionnalité)

1. `app/recruiter/profile/page.tsx` — ajout de 2 boutons ("Compléter
   l'onboarding →", "Mobility recruteur →") reliant `/recruiter/onboarding`
   et `/recruiter/mobility`, jusque-là inaccessibles en clic.
2. `app/career-brain/page.tsx` — ajout d'une section "J'IA — Coaching
   carrière" reliant `/ai/companion`, `/ai/interview`, `/ai/application`,
   sur le même modèle que la section "Explorer" déjà utilisée dans
   `/career-os`.
3. `components/recruiter/RecruiterJobForm.tsx` — case Gmail désactivée et
   honnêtement labellée ; avertissement ajouté sous "Importer en 10s"
   précisant qu'il s'agit d'un pré-remplissage indicatif, pas d'une
   extraction réelle.
4. `.env.example` — créé, avec les 16 variables d'environnement
   effectivement lues par le code.

Aucune logique métier, aucun style, aucun composant existant n'a été
supprimé ou réécrit. Ces changements sont volontairement minimaux et
réversibles pour ne rien casser sans possibilité de build de vérification.

## 6. Taux de réalisation

Les audits internes précédents (`AUDIT-E2E-CONTINUITE-16-09-2026.md`)
s'auto-évaluaient à **~85 % de couverture fonctionnelle** et **~65 % de
parcours réellement démontrés en production**. Après cet audit
indépendant, je confirme globalement cet ordre de grandeur, avec deux
nuances :

- **Couverture fonctionnelle du code (aujourd'hui) : ~80–85 %.** Les
  écrans existent, les APIs existent, le câblage est globalement cohérent.
  Les 5 pages orphelines réduisaient artificiellement ce chiffre avant
  correctif — la plupart du travail existait déjà, il manquait juste la
  porte d'entrée.
- **Prêt pour la production : ~50–60 %, pas 65 %.** Deux éléments non
  comptabilisés dans l'audit interne précédent pèsent lourd : (a) le build
  n'a **jamais** été validé de bout en bout avec succès de manière
  vérifiable, ce qui est un pré-requis absolu avant tout chiffre de
  "readiness" ; (b) une fonctionnalité recruteur clé (import d'offre) était
  présentée comme automatisée alors qu'elle est cosmétique — ce genre
  d'écart entre promesse et réalité doit être neutralisé avant toute mise
  devant de vrais utilisateurs.

## 7. Recommandations priorisées

1. **Obtenir un build Vercel vert réel** (avec `node_modules`/lockfile,
   variables d'environnement du `.env.example` ajouté) — condition
   bloquante avant toute autre priorité.
2. Décider du sort de `scrapeJobFromUrl` : soit brancher un vrai scraping
   (serveur, ou API tierce type Firecrawl/ScraperAPI), soit renommer le
   bouton pour ne plus dire "Importer en 10s" tant que ce n'est pas réel.
3. Remplacer les 3 `alert()` de `app/jobs/[id]/page.tsx` par des toasts
   cohérents avec le reste de la Cinematic UI.
4. Exécuter un test UAT réel sur téléphone (session Supabase vivante) pour
   les parcours Talent → Candidature → ATS et Recruteur → Match Lab →
   Pitch vidéo, seuls parcours jamais testés en conditions réelles selon
   `Statut.md`.
5. Faire pointer chaque carte "Opportunity Intelligence" vers
   `/jobs/[id]?source=...` au lieu du listing générique `/jobs` (P1 déjà
   identifié dans `AUDIT-E2E-CONTINUITE-16-09-2026.md`, toujours ouvert).
