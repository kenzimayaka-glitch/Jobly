# JOBLY — AI CORE Phase 1

## Objectif

Introduire une couche d'orchestration IA centrale sans modifier le comportement fonctionnel actuel de JOBLY.

## Architecture ajoutée

- `lib/ai/types.ts` — contrats communs des tâches, providers et résultats.
- `lib/ai/providerRegistry.ts` — registre central des providers et mapping sécurisé des secrets.
- `lib/ai/providers/deterministic.ts` — déplacement du fallback déterministe existant dans un provider officiel.
- `lib/ai/orchestrator.ts` — point unique de décision/routage et mécanisme de fallback.
- `lib/aiGateway.ts` — conserve l'authentification, la préparation du contexte et la réservation des crédits, puis délègue l'exécution à l'AI Orchestrator.

## Providers préparés

- Gemini — `GEMINI_API_KEY`
- OpenRouter — `OPENROUTER_API_KEY`
- Groq — `GROQ_API_KEY`
- Cerebras — `CEREBRAS_API_KEY`
- Together AI — `TOGETHER_API_KEY`
- Hugging Face — `HF_TOKEN`
- Deterministic — toujours disponible

Les providers externes sont déclarés mais volontairement non exécutés en Phase 1. Cela garantit qu'aucun appel supplémentaire ni aucune dépense fournisseur n'est déclenché avant l'installation de leurs adapters en Phase 2.

## Routage prévu

Le Core possède déjà quatre politiques :

- `QUALITY`
- `BALANCED`
- `SPEED`
- `COST`

Chaque politique contient un ordre de préférence. Un provider indisponible ou en erreur est ignoré et le suivant peut prendre le relais.

## Traçabilité

`AiUsage` reçoit désormais le provider et le modèle réellement retournés par l'orchestrateur. `AuditLog` conserve également les tentatives et indique si un fallback a été utilisé.

## Compatibilité

Le contrat HTTP existant `/api/ai/[operation]` reste inchangé.
Les quatre opérations actuelles restent supportées :

- `INTERVIEW`
- `LEARNING`
- `APPLICATION_COPILOT`
- `CAREER_COMPANION`

## Validation

Le dépôt extrait ne contient pas les dépendances `node_modules`, donc le `typecheck` complet ne peut pas être exécuté dans cet environnement. Le contrôle lancé échoue sur les dépendances manquantes (`react`, `next`, `@supabase/supabase-js`, etc.) déjà nécessaires au projet, et non sur une erreur explicitement identifiée dans les nouveaux fichiers AI Core.

## Prochaine phase

Phase 2 : implémenter les adapters réels des providers, en commençant par OpenRouter et Gemini, puis ajouter les autres fournisseurs avec sélection de modèle, timeout, retry et fallback contrôlé.
