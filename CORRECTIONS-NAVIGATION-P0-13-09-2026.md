# JOBLY — CORRECTIONS NAVIGATION P0 — 13 septembre 2026
## Suite de l'audit 360° (voir `AUDIT-360-JOBLY-13-09-2026.md`)

Ce document liste uniquement les corrections **P0** appliquées ce jour (boutons morts,
liens erronés, navigation manquante). Le détail produit/décision se trouve dans
`Statut.md` section 22. Les points P1/P2 (stubs, fonctionnalités manquantes du
cahier des charges) ne sont **pas** traités ici — voir le rapport d'audit.

---

## ✅ Corrigés

1. **Écosystème (`app/ecosystem/page.tsx`)**
   - Onglet "Candidatures" : `/jobs` → `/candidatures` (doublonnait avec "Offres").
   - Onglet "Profil" : `/dashboard` → `/career-brain` (`/dashboard` est l'Accueil, pas un profil).

2. **Dashboard Recruiter (`app/recruiter/page.tsx`)**
   - Section "Candidats recommandés" : les 3 candidats fictifs codés en dur (Amina Diallo, Paul Nkomo, Claire Mbarga) et le bouton "Voir tout →" sans action ont été retirés, remplacés par un état honnête "Bientôt disponible".

3. **Création/édition d'offre (`app/recruiter/jobs/[id]/page.tsx`)**
   - Bouton "✨ Générer avec IA" (aucun `onClick`) retiré, remplacé par un badge désactivé avec info-bulle explicative.
   - `BottomNav` ajoutée (absente auparavant).

4. **ATS (`app/recruiter/ats/page.tsx`)**
   - `BottomNav` ajoutée (absente auparavant, padding bas ajusté en conséquence).

5. **Nouvelle page — liste des offres Recruiter (`app/recruiter/jobs/page.tsx`, créée)**
   - Corrige l'onglet "Offres" du `BottomNav` Recruiter, qui pointait vers une route inexistante (404 systématique) avant cette correction.
   - Réutilise `/api/recruiter/jobs` + `/api/recruiter/applications` (même logique que le Dashboard).
   - Filtre par statut (Toutes / Publiées / Brouillons / Clôturées).

6. **Nouvelle page — Notifications (`app/notifications/page.tsx`, créée)**
   - La cloche de `components/PageHeader.tsx` (présente sur toutes les pages) n'avait jusqu'ici aucune action. Elle pointe maintenant vers cet écran.
   - Aucun moteur de notifications réel n'existe encore côté API : l'écran affiche un état honnête, pas de données inventées.

7. **PWA (`components/PwaInit.tsx`, créé ; `app/pwa-init.ts` supprimé ; `app/layout.tsx` et `scripts/check-pwa.mjs` mis à jour)**
   - `app/pwa-init.ts` appelait `registerJoblyServiceWorker()` mais n'était importé nulle part : le service worker n'était jamais enregistré.
   - `components/PwaInit.tsx` (composant client, monté dans `app/layout.tsx`) appelle désormais réellement cette fonction au chargement.
   - `scripts/check-pwa.mjs` corrigé : le script cherchait les fichiers sous un préfixe `apps/web/` qui ne correspond à aucune structure réelle de ce repo (racine plate) — il aurait toujours échoué s'il avait été exécuté.

---

## ⏸️ Volontairement non traités aujourd'hui (P1/P2)

- `/recruiter/candidatures` — stub figé, jamais branché sur les vraies données.
- `/recruiter/onboarding` — page orpheline (codée, non reliée).
- `/partner/payment`, `/partner/profile` — stubs "à venir".
- Détail d'une offre côté Talent, fiche "Voir profil talent" côté Recruiter, "Mes filleuls" et "Retrait" côté Partner — fonctionnalités du cahier des charges non codées.
- Match global / Opportunités recommandées / Mon CV IA (Dashboard Talent) — spécifiés dans `Statut.md` §12.4 mais non codés.
- Nommage "Career AI" (mène en réalité à Career Brain, formulaire, pas un chat) — décision produit à trancher, pas une correction technique.

**Statut de validation :** 🔧 CODÉ, non déployé, non testé sur téléphone réel — conformément au principe §18 de `Statut.md` ("codé ≠ validé"), à vérifier avant toute mise en production.
