# JOBLY AI Core — Phase 2 Provider Adapters

Phase 2 ajoute les adaptateurs serveur pour Gemini, OpenRouter, Groq, Cerebras, Together AI et Hugging Face.

## Sécurité

- Les clés sont lues uniquement côté serveur via les variables d'environnement.
- Aucune clé n'est exposée au navigateur.
- Un provider est considéré disponible uniquement si sa variable de clé existe dans l'environnement du serveur.
- Le provider déterministe reste le dernier fallback.

## Routage

Le routage existant de `lib/ai/orchestrator.ts` est conservé. Les providers disponibles sont essayés selon la priorité (`QUALITY`, `BALANCED`, `SPEED`, `COST`).

## Adapters

- Gemini : API `generateContent`.
- OpenRouter : API compatible OpenAI `/chat/completions`.
- Groq : API compatible OpenAI `/chat/completions`.
- Cerebras : API compatible OpenAI `/chat/completions`.
- Together AI : API compatible OpenAI `/chat/completions`.
- Hugging Face : endpoint Inference Providers compatible OpenAI `/v1/chat/completions`.

Les modèles sont configurables par variable d'environnement afin d'éviter de figer le catalogue de modèles dans le code.

## Déploiement important

Les secrets créés dans Supabase Edge Functions ne sont pas automatiquement injectés dans le runtime Next.js qui exécute `app/api/ai/[operation]/route.ts`.

Pour activer réellement ces adapters dans cette route, les mêmes variables doivent être disponibles dans le gestionnaire de secrets de l'environnement qui héberge le serveur Next.js. Ne jamais les mettre dans `NEXT_PUBLIC_*`, le navigateur ou Git.

## Validation

Le ZIP ne contient pas `node_modules`. Le typecheck complet doit donc être exécuté dans l'environnement de build après installation des dépendances.
