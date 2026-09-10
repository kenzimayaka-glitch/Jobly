# JOBLY — STATUT DU PROJET

> Ce fichier est la SEULE source de vérité sur l'avancement.
> Ne pas créer de nouveau document stratégique/checkpoint/handover en dehors de ce fichier.
> Règle d'or : un statut ne passe à l'étape suivante que s'il a été TESTÉ par un humain sur un vrai téléphone — pas juste "codé" ou "revu".

Dernière mise à jour : 10/09/2026

---

## 0. Légende des statuts
- ❌ NON COMMENCÉ
- 🔧 CODÉ (pas encore testé)
- 🧪 EN VALIDATION (tests en cours)
- ✅ VALIDÉ EN PRODUCTION

---

## 1. État réel du MVP (12 briques)

| # | Brique | Statut | Note |
|---|--------|--------|------|
| 1 | Foundation (repo, Docker, CI) | 🔧 | Repo existe, build Vercel Ready |
| 2 | Auth (inscription/connexion/session) | 🔧 | Phone/password + Google OAuth codés, RLS/tests/OAuth réel non validés |
| 3 | Career Brain (profil, skills, expériences) | ❌ | Pas commencé |
| 4 | Jobs / ingestion des offres | 🔧 | Pipeline codé (queue, scheduler, adaptateur RSS), non validé en prod |
| 5 | Matching | ❌ | Pas commencé |
| 6 | Applications (candidature, suivi) | ❌ | Pas commencé |
| 7 | AI Core (CV analyzer, coach) | ❌ | Pas commencé — ne pas commencer avant que 1-6 soient validés |
| 8 | Billing / paiements | ❌ | Spécifié seulement |
| 9 | Engagement (push, bannières, ads) | ❌ | Spécifié seulement |
| 10 | Chat / WhatsApp | ❌ | Spécifié seulement |
| 11 | QR / Jobly ID | ❌ | Spécifié seulement |
| 12 | Production (monitoring, sécurité, backups) | ❌ | Pas commencé |

**Résumé : 2 briques codées non validées, 1 partielle, 9 non commencées.**

---

## 2. Prochaine tâche UNIQUE (ne rien faire d'autre tant que ce n'est pas fait)

🎯 **Valider l'authentification en production sur un vrai téléphone.**

Sous-tâches, dans l'ordre :
1. Configurer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dans Vercel.
2. Refaire l'écran Auth selon la charte graphique (voir section 5).
3. Tester sur téléphone : inscription phone/password → succès.
4. Tester : connexion → succès.
5. Tester : déconnexion + reconnexion → succès.
6. Tester : Google OAuth de bout en bout → succès.
7. Tester : récupération de mot de passe par OTP → succès.
8. Cocher cette tâche comme ✅ ici, puis seulement passer à la brique 4 (Discovery).

**Ne pas** : commencer le Career Brain, le matching, les paiements, ou tout document stratégique tant que ceci n'est pas ✅.

---

## 3. Décisions figées (ne jamais redemander à l'IA de les reproposer)

- Connexion manuelle = téléphone + mot de passe uniquement (pas d'email en connexion manuelle).
- Google OAuth en complément, jamais comme seul canal.
- Récupération de compte = OTP par téléphone.
- Aucune donnée sensible dans les QR — identifiant opaque uniquement.
- L'IA ne doit jamais inventer un fait professionnel (expérience, chiffre, compétence).
- Prix cible Premium : 1 000 FCFA/mois ou 3 000 FCFA/an (à revalider après chiffrage du coût IA réel — voir section 6).
- Stack : Next.js (frontend) / NestJS ou API Supabase (backend) / PostgreSQL + Prisma / Redis / stockage S3-compatible.
- Domaine historique : jobly.eu.org.

---

## 4. Sources de jobs identifiées (statut d'autorisation à vérifier avant toute ingestion)

| Source | Statut autorisation |
|---|---|
| Cameroon Desk (RSS) | À vérifier |
| Doopinet / doopin.net | À vérifier |
| Minajobs | À vérifier |
| i-ce.cm | À vérifier |
| Emploi.cm | À vérifier |
| Louma-jobs.com | À vérifier |
| jobdeals.com | À vérifier |

Règle non négociable : ne jamais activer une source en scraping non autorisé. Vérifier contrat/flux/API avant tout ingestion réelle.

---

## 5. Charte graphique (référence rapide)

- Bleu principal : `#2563EB`
- Jaune (ambition) : `#FBBF24`
- Vert (progression) : `#10B981`
- Violet (IA) : `#8B5CF6`
- Orange (dynamisme) : `#F97316`
- Navy (texte) : `#16254A`
- Blanc : `#FFFFFF`
- Typo : Jakarta Sans (ou équivalent géométrique)
- Cartes très arrondies, beaucoup d'espace blanc, gradients réservés aux moments IA/héro
- Élément signature : le "Career Score"

---

## 6. Point ouvert critique — coût IA vs prix Premium

❗ Non fait à ce jour : chiffrer le coût réel par utilisateur (appels modèle pour matching, génération CV/lettre, coaching) et le comparer aux 1 000 FCFA/mois visés.
**À faire avant d'écrire le moindre code d'IA générative (brique 7).**

---

## 7. Ce qui est volontairement repoussé (ne pas y toucher maintenant)

- Organisation commerciale (5 équipes, BTL, Partner Network, commissionnement)
- Paiements Mobile Money
- WhatsApp, publicité, vidéos courtes
- Jobly ID / QR avancé
- Toute roadmap au-delà du MVP

Ces sujets sont documentés dans les archives du projet mais ne doivent pas revenir dans une session de travail avant que le MVP (section 1) soit ✅ validé de bout en bout.
---

## 8. Consigne à copier-coller au début de CHAQUE session avec l'IA

> "Voici STATUS.md, l'état actuel du projet Jobly. Ne redéfinis pas la stratégie, n'invente pas de nouveau document, ne propose pas de nouvelle organisation. Fais uniquement la tâche indiquée en section 2. À la fin, mets à jour STATUS.md avec ce qui a changé et la prochaine tâche unique."
