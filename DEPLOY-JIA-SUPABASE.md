# Déployer J'IA dans Supabase

## Option recommandée — Dashboard Supabase

1. Ouvre le projet Supabase de JOBLY.
2. Va dans **Edge Functions**.
3. Choisis **Deploy a new function → Via Editor**.
4. Nom de la fonction : `ai-core`.
5. Remplace le contenu de l'éditeur par le fichier :
   `supabase/functions/ai-core/index.ts`
6. Clique **Deploy function**.
7. Si `ai-core` existe déjà, ouvre-la puis utilise **Deploy updates**.

Les secrets API ne doivent PAS être collés dans le code. Ils restent dans **Edge Functions → Secrets**.

Secrets nécessaires :
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `CEREBRAS_API_KEY`
- `TOGETHER_API_KEY`
- `HF_TOKEN`

Modèles optionnels :
- `GEMINI_MODEL`
- `OPENROUTER_MODEL`
- `GROQ_MODEL`
- `CEREBRAS_MODEL`
- `TOGETHER_MODEL`
- `HF_MODEL`
- `JOBLY_PUBLIC_URL`

Les secrets déjà présents sont disponibles immédiatement dans les Edge Functions ; il n'est pas nécessaire de redéployer uniquement après une modification de secret.

## Option CLI

Depuis la racine du projet JOBLY :

```bash
supabase login
supabase projects list
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy ai-core --use-api
```

Si le projet est déjà lié, la dernière commande suffit.

Vérification :

```bash
supabase functions list
```

## Important pour JOBLY

Le flux applicatif est :

`Next.js /api/ai/[operation]` → `Supabase Edge Function ai-core` → `J'IA` → fournisseur disponible → fallback éventuel.

Le nom utilisateur-facing est **J'IA**. Les noms Gemini, OpenRouter, Groq, Cerebras, Together AI et Hugging Face restent des fournisseurs internes et ne constituent pas des assistants séparés.

## Test

Le test fonctionnel doit être réalisé depuis une session JOBLY authentifiée, car `ai-core` exige un bearer token utilisateur.

Ne jamais publier une clé API dans GitHub, le navigateur ou le chat.
