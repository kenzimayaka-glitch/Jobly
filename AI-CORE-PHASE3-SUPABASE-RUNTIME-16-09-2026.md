# JOBLY — AI CORE Phase 3 — Supabase Runtime

## Objectif
Déporter l'exécution réelle des providers IA dans une Supabase Edge Function afin que les secrets `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `TOGETHER_API_KEY` et `HF_TOKEN` restent côté runtime Supabase.

## Flux
`Next.js /api/ai/[operation]` → réservation de crédit → `Supabase Edge Function ai-core` → orchestrateur → provider disponible → retour normalisé → comptabilisation `AiUsage`.

## Sécurité
- Les clés providers ne sont jamais envoyées au navigateur.
- Le JWT utilisateur est transmis à l'Edge Function et vérifié via Supabase Auth.
- Le contexte transmis à l'Edge Function est déjà nettoyé et limité par le Gateway.
- Le provider déterministe reste le dernier fallback.
- Aucun secret n'est écrit dans le dépôt.

## Déploiement
Déployer la fonction `ai-core` dans le projet Supabase associé à JOBLY. Les secrets providers doivent rester configurés dans Supabase Edge Functions.

## Important
Le code est prêt pour le runtime Supabase, mais un test réel des providers nécessite le déploiement de la fonction dans le projet Supabase et des clés valides présentes dans son environnement.

## Navigation — pages orphelines (16/09/2026)
Diagnostic : `/market-intelligence`, `/communities`, `/campus` et `/events` existaient comme routes mais n'étaient reliées nulle part dans l'app (accessibles uniquement en tapant l'URL). Les autres briques Career OS (`career-gps`, `career-gap`, `readiness`, `opportunity-radar`, `jobly-id`) étaient déjà accessibles via `/career-os` et le dashboard.

Correction apportée :
- `app/career-os/page.tsx` : ajout d'une section "Explorer" (grille de 4 boutons) pointant vers les 4 pages orphelines.
- `app/dashboard/page.tsx` : ajout d'une section "Explorer" équivalente, juste après la section "Career Intelligence".

Aucune modification des pages cibles elles-mêmes ni de la logique métier — uniquement des points d'entrée de navigation ajoutés.
