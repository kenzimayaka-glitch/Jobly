# Déploiement Vercel — C0.9.6.3 Ecosystem V3

1. Uploader le ZIP sur Vercel.
2. Vérifier les variables Supabase déjà utilisées par le projet.
3. Si le build passe mais que Career Brain affiche `Could not find the table 'public.User' in the schema cache`, ouvrir Supabase → SQL Editor.
4. Exécuter **`supabase/PROFILE-FOUNDATION.sql`** une seule fois.
5. Relancer le déploiement / rafraîchir l'application.

Le script est idempotent et contient `NOTIFY pgrst, 'reload schema'` pour demander le rechargement du cache PostgREST.
