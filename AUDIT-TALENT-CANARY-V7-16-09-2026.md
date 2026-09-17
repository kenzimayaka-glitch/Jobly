# AUDIT TALENT CANARY V7 — 16/09/2026

## Objectif
Appliquer la nouvelle direction visuelle Talent inspirée de la maquette de référence : interface claire, premium, beaucoup d'espace blanc, bleu JOBLY + jaune canari comme accents principaux, sans multiplier les couleurs.

## Périmètre
- Dashboard Talent `/dashboard`
- Offres `/jobs` et `/jobs/[id]`
- Candidatures `/candidatures`
- Career Brain `/career-brain`
- Career OS `/career-os`
- Opportunity Intelligence `/opportunities`
- Profil Talent `/talent/profile`
- CV Talent `/talent/cvs`
- 4 modules J'IA `/ai/*`
- Jobly Mobility côté Talent `/bons-plans/mobility*`

## Corrections visuelles
- Nouveau fond Talent dédié `components/TalentBackground.tsx`.
- Animation douce de blobs bleu/jaune conservée, sans violet/vert/orange.
- Palette principale : blanc, navy neutre, bleu JOBLY, jaune canari.
- ScoreRing Talent limité au bleu + jaune.
- PageHeader supporte désormais un thème `talent` sans modifier le rendu par défaut Recruiter/Partner.
- Dashboard Talent refondu vers la structure de la maquette : hero, recherche, 4 raccourcis, score, opportunités, compétences, navigation.
- Cards et CTA Talent harmonisés avec la nouvelle direction.
- Mobility Talent conserve sa logique et adopte le même fond/traitement visuel.

## Contrôles statiques
- Aucun import `DecorativeBackground` restant dans le périmètre Talent principal.
- Aucun token Tailwind violet/vert/orange/émeraude restant dans le périmètre Talent contrôlé.
- Les rouges restent réservés aux états d'erreur.
- Aucun changement d'API, de logique Supabase, d'authentification ou de modèle de données volontaire.
- Vérification syntaxique TypeScript/TSX ciblée : aucune erreur de syntaxe détectée.

## Limitation
Le build Next.js complet n'a pas pu être exécuté localement car le registre npm n'est pas accessible dans l'environnement d'audit et le ZIP ne contient pas `node_modules`/lockfile. Validation Vercel requise.
