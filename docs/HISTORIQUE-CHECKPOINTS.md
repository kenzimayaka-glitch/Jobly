# JOBLY — Historique condensé des checkpoints (archivé)

> Ce fichier remplace 11 fichiers `*-CHECKPOINT.md` dispersés à la racine et dans `docs/`.
> Il n'est pas une source de vérité — c'est un journal historique, pour référence uniquement.
> La source de vérité de l'état d'avancement est `Statut.md`. La source de vérité de la vision est `README.md`.

| Version | Date | Contenu |
|---|---|---|
| C0.6.4 | — | Fix build Vercel (client Supabase lazy) ; reprise visuelle Auth/PWA selon charte v1.2 |
| C0.6.8 | 09/09/2026 | Réalignement Home/Auth avec la charte graphique et la référence documentaire |
| C0.6.9 | 09/09/2026 | Continuité visuelle Home/Auth |
| C0.7.0 | 09/09/2026 | Finalisation de la base de données de production (Prisma/PostgreSQL) |
| C0.8.8 | — | Reconstruction complète du projet à partir du ZIP C0.8.5, fichiers de suivi mis à jour |
| C0.9.1 | 11/09/2026 | Correctif fonctionnel de l'écran Auth mobile, sans modifier la charte validée |
| C0.9.4 | 11/09/2026 | Parcours auth définis : téléphone → SMS OTP (6 chiffres, sans mot de passe) ; e-mail + mot de passe |
| C0.9.5 | 11/09/2026 | Correction du scroll de l'écran de connexion (CGU/confidentialité toujours accessibles) |
| C0.9.6 | 11/09/2026 | Livraison initiale de `/career-brain` (profil, objectifs, expériences, compétences) |
| C0.9.6.2 | 11/09/2026 | Corrections UI et scroll de Career Brain et des pages légales |
| C0.9.6.3 | 11/09/2026 | Fix build Vercel (erreur JSX sur composants `Chips` auto-fermés) |
| C0.9.8 | 11/09/2026 | Fondation Recruiter/Partner (profils, offres recruteur, commissions partenaire) |

**Décision de nettoyage (12/09/2026) :** consolidation des 11 fichiers checkpoint en ce document unique, suppression du `STATUS.md` en double avec `Statut.md`, remplacement de l'ancien `Statut.md`/`README.md` à la racine par la version de continuité du 12/09/2026 (source de vérité actuelle).
