# JOBLY — AUDIT POST-CORRECTIF V4

Date : 16/09/2026
Base : livrable hardening V4

## Corrections
- Suppression du duplicata `/jobly/`.
- Exclusion TypeScript de `jobly/**` et `supabase/functions/**`.
- `.gitignore` ajouté.
- URLs publiques centralisées dans `lib/site.ts`.
- `/jobs/[id]` + `/api/jobs/[id]` ajoutés pour les liens d'offres partagées.
- `/join` ajouté pour les liens Partner.
- 4 écrans J'IA reliés au dashboard et dotés d'une navigation de retour.
- Recruiter onboarding/mobility reliés au dashboard.
- Hub Admin ajouté et contrôlé par rôle.
- Persistance locale des CV signalée explicitement.

## Re-check
- Routes internes littérales : aucune cible morte détectée.
- Import Edge Deno dans le périmètre Next : aucun.
- Dossiers de projet dupliqués : aucun.
- Schémas Prisma : un seul livré.
- Domaines publics codés en dur dans les sources applicatives : centralisés dans `lib/site.ts`.
- Secrets évidents en clair : aucun trouvé.
- Build local : non exécutable sans dépendances/réseau; Vercel reste le contrôle de compilation final.

## Point restant non qualifié comme bug corrigible dans ce ZIP
Le `package-lock.json` n'a pas pu être généré dans l'environnement courant car le registre npm n'est pas accessible. Il doit être généré et commité depuis le poste/CI du projet pour verrouiller définitivement les versions.
