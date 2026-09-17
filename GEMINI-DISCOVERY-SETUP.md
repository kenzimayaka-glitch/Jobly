# JOBLY — Gemini Discovery AI

La couche IA du Discovery Engine utilise Google Gemini directement depuis la Supabase Edge Function `discover-jobs`.

## Variables Supabase

Ajouter dans les secrets de la fonction :

- `GEMINI_API_KEY` : clé API Google AI Studio/Gemini
- `GEMINI_MODEL` : `gemini-2.5-flash` par défaut

La clé n'est jamais exposée au navigateur.

## Fonctionnement

Sources → extraction → normalisation → Gemini → qualité/secteur/compétences/résumé → déduplication → Supabase → JOBLY.

Si `GEMINI_API_KEY` n'est pas configurée, le moteur continue à fonctionner avec les règles déterministes et renvoie `provider=RULES_FALLBACK`.

Le code n'ajoute pas le SDK Google : il appelle l'API Gemini REST directement afin de garder la fonction légère.
