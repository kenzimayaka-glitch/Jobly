# JOBLY Discovery Engine — Gemini V1

- Fournisseurs : Emploi.cm, Emplois Cameroun, Job in Cameroun, JobInfoCamer, FNE, ReliefWeb, UNjobs, Impactpool.
- Gemini : analyse des offres pour titre, entreprise, ville, secteur, contrat, remote, expérience, salaire, compétences, résumé et score qualité.
- Fallback : règles locales si la clé Gemini n'est pas présente ou si l'appel IA échoue.
- Secrets : `GEMINI_API_KEY` uniquement côté Supabase Edge Function.
- Le navigateur ne reçoit jamais la clé.
