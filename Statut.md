# JOBLY — STATUT DU PROJET
## SOURCE DE VÉRITÉ D'EXÉCUTION — JOBLY 20/20
### Mise à jour : 26/09/2026 — Offres / Matching adaptatif / UX

> Règle : une fonctionnalité n'est terminée que si elle traverse **SPÉCIFIÉ → CODÉ → ACCESSIBLE → CONNECTÉ → TESTÉ → VALIDÉ → DÉPLOYÉ**.
> Les anciens checkpoints restent conservés comme historique et ne remplacent jamais l'état courant.

---

# 0.1 — MISE À JOUR DU 26/09/2026 — OFFRES & MATCHING

## Matching adaptatif — 🔧 CODÉ / 🟡 À VALIDER E2E

Le moteur /api/jobs a été refondu pour comparer le profil du candidat aux **exigences réellement présentes dans chaque offre**. Les critères ne sont plus imposés de façon uniforme.

Critères activés uniquement lorsqu'ils sont pertinents pour l'offre :
- métier / fonction ;
- compétences ;
- expérience ;
- niveau d'études ;
- langues lorsqu'une exigence linguistique est détectée ;
- localisation ;
- secteur ;
- contrat lorsque pertinent.

Les données candidat utilisées incluent désormais Profile, Experience, Skill et Education. Les informations inconnues sont traitées comme **UNKNOWN / Non renseigné** et contribuent à la confiance de l'analyse plutôt qu'à un zéro automatique.

Le score expose maintenant matchBreakdown[] avec le critère, le poids, l'état, la valeur du candidat et l'attendu de l'offre, ainsi qu'un matchConfidence.

## UX Offres — 🔧 CODÉ / 🟡 À VALIDER E2E

- Header : suppression de JOBLY / OPPORTUNITÉS.
- Hero : Offres + J’IA se charge de tout.
- Les offres qui vous correspondent : filtre activable, seuil **≥ 50 %**.
- Vos meilleurs offres + Les offres qui correspondent le mieux à votre profil actuel.
- Compteur dynamique : X offres disponibles aujourd’hui selon le volume réellement chargé.
- Suppression de Fraîcheur · 60 jours max et Deadline explicite prioritaire.
- Suppression des libellés Opportunités de cette surface.
- Logo entreprise : résolution renforcée avec fallback API + favicon.
- CTA du détail de score : Adapter mon CV pour cette candidature → /cv?mode=adapt&jobId=...&source=....

## Déploiement

Ces changements sont poussés sur main par commits successifs et doivent être considérés **CODÉS**, pas encore **VALIDÉS**, jusqu'à vérification du build Vercel et du parcours /jobs en production.

# 0. ÉTAT EXÉCUTIF — 20/09/2026

**JOBLY est déployé en production sur le projet Vercel canonique `jobly-c0.6.5.1`.**

- Branche : `main`
- Commit audité/déployé : `8857d15e235ed683e33ea96a792f668e5435ada6`
- Déploiement : `dpl_2FE94p9idHpVUzDbVpTkoPjmTu49`
- Statut Vercel : **READY**
- Checks Vercel : **SUCCESS**
- Supabase production : **ACTIVE_HEALTHY**
- Repo : `kenzimayaka-glitch/Jobly`

## Verdict

**PRODUCTION DEPLOYED ≠ GO LIVE COMPLET.**

Build et déploiement sont verts, mais l'ensemble du produit n'est pas encore certifié sur toute la chaîne de vérité.

### Écarts de certification

1. E2E complet des parcours authentifiés.
2. Validation mobile réelle des surfaces critiques.
3. Gmail OAuth runtime Talent/Recruiter.
4. Billing / abonnements / iClan de bout en bout.
5. Mobility E2E.
6. Push/proactivité en conditions réelles.
7. J’IA : rig anatomique professionnel non finalisé.
8. Quelques chemins de navigation et éléments documentaires à fermer.

| Niveau | État global |
|---|---|
| SPÉCIFIÉ | 🟢 |
| CODÉ | 🟢 |
| ACCESSIBLE | 🟢 majoritaire |
| CONNECTÉ | 🟢 majoritaire |
| TESTÉ | 🟡 partiel |
| VALIDÉ | 🟡 partiel |
| DÉPLOYÉ | 🟢 |

---

# 1. AUDIT CROISÉ

L'audit appliqué suit pour chaque fonctionnalité : **implémentation → page → accès → CTA → fonctionnement → fin de parcours → persistance/exécution → rôle → mobile → loading/error/empty/success**.

Audit inverse : **fonctionnalité → page → navigation → CTA → API → données**.

Une réponse essentielle manquante signifie **NON TERMINÉE**.

---

# 2. TALENT

| Fonction | État |
|---|---|
| Auth Gmail/Google | 🟢 codée/accessibilité ; 🟡 runtime E2E |
| Jobs / Discovery | 🟢 codé/connecté ; 🟡 E2E |
| Détail offre | 🟢 présent ; 🟡 E2E |
| Applications | 🟢 présent/connecté ; 🟡 E2E |
| CV / CV Share / QR | 🟢 largement connecté ; 🟡 E2E/export |
| CV→ATS | 🟢 présent ; 🟡 validation complète |
| Career OS / Brain | 🟢 accessible |
| Career GPS / Gap / Readiness | 🟡 V1 |
| Opportunity Radar | 🟢 présent |
| Opportunity Cascade | 🟢 présent ; sources externes limitées |
| Market Intelligence | 🟡 V1 |
| Gmail/import | 🟢 code ; 🟡 OAuth runtime |
| Mobility Talent | 🟢 code ; 🟡 E2E |
| AI Companion/Learning/Application | 🟢 surfaces/backend ; 🟡 validation fournisseur/coût |
| Interview AI | 🟢 surface/backend ; 🟡 runtime/fournisseur |

---

# 3. RECRUITER

| Fonction | État |
|---|---|
| Onboarding | 🟢 présent ; 🟡 fermeture E2E |
| Dashboard | 🟢 présent |
| Profil | 🟢 API/UI connectées |
| Offres | 🟢 présent |
| Création d'offre | 🟢 présent |
| Candidatures | 🟢 implémenté ; 🟡 E2E |
| ATS | 🟢 implémenté ; 🟡 E2E |
| Talents | 🟢 présent |
| Gmail | 🟢 code ; 🟡 OAuth runtime |
| Mobility | 🟢 présent ; 🟡 E2E |

---

# 4. PARTNER

| Fonction | État |
|---|---|
| Dashboard | 🟢 connecté |
| Profil | 🟢 API/UI présentes |
| Parrainage | 🟢 connecté |
| Commissions | 🟢 données/API présentes |
| KYC | 🟢 états présents |
| Paiement | 🟡 versement réel non certifié |
| Mobility | 🟢 surfaces ; 🟡 E2E |
| Détection email | 🟡 MVP explicitement simulé |

---

# 5. PAGES / NAVIGATION

### `/cv`

Ancienne surface CV distincte du parcours canonique `/talent/cvs`.

**Décision :** conserver la compatibilité mais rediriger `/cv → /talent/cvs`.

Correction identifiée mais non poussée lors de l'audit en raison du contrôle de sécurité de l'écriture GitHub.

### Recruiter onboarding

Chemin cible : **Recruiter → profil incomplet → `/recruiter/onboarding` → sauvegarde → Recruiter**.

Une correction de fermeture automatique a été préparée mais non poussée pour la même raison.

---

# 6. CTA / BOUTONS

Les principaux problèmes P0 historiques ont été corrigés : navigation Candidatures/Profil Écosystème ; faux « Voir tout » ; CTA « Générer avec IA » non opérationnel ; BottomNav Recruiter sur ATS et détail offre ; route `/recruiter/jobs` ; notifications ; service worker PWA.

Un CTA n'est considéré comme **TESTÉ** qu'après exécution réelle du parcours.

---

# 7. DESIGN SYSTEM

Les composants communs sont présents : `PageHeader`, `BottomNav`, backgrounds, cartes, boutons, typographies et composants d'écosystème.

Il subsiste deux familles visuelles : **JOBLY classique** et **Cinematic**.

**État : 🟡 harmonisation complète à terminer.**

---

# 8. J’IA

## Architecture

**PERSONNAGE VISUEL ≠ MOTEUR D'ANIMATION ≠ CERVEAU ≠ VOIX ≠ ACTIONS**

- **Personnage visuel :** 🟢 identité validée conservée.
- **Animation :** 🟢 moteur et vocabulaire `JIA_100` présents.
- **Cerveau :** 🟢 `lib/jia/brain.ts`, `/api/jia/brain`, préférences, mémoire, proactivité et traces.
- **Voix :** 🟢 codée : wake word, Web Speech API, commandes, réponse vocale ; 🟡 validation navigateur/mobile réelle.
- **Actions :** 🟢 commandes métier partiellement connectées ; garde financière présente.
- **Rig anatomique :** 🟡 **NON VALIDÉ 20/20**. Les couches sont animées indépendamment mais utilisent encore le master/crops ; ce n'est pas encore un ensemble professionnel d'assets anatomiques réellement séparés.

---

# 9. DONNÉES / SUPABASE

Les principaux domaines disposent de leurs tables/migrations : Jobs, Companies, Applications, User/Profile, Recruiter, Partner, Payments, Gmail, CV Share, Mobility, J’IA Preferences/Memory/Events/Intelligence.

Alertes restantes avant certification sécurité finale : tables server-only sans policies, `pg_net` dans `public`, protection contre les mots de passe compromis désactivée.

Des index sont signalés inutilisés ; aucun retrait massif sans données de trafic représentatives.

---

# 10. DÉPLOIEMENT

Production canonique : Vercel `jobly-c0.6.5.1`, projet `prj_7B3nK76wDdgQbHK4WFz59DsKKYJQ`, team `PORTFOLIO / portfolio-5555`, branch `main`, commit `8857d15e235ed683e33ea96a792f668e5435ada6`, deployment `dpl_2FE94p9idHpVUzDbVpTkoPjmTu49`, status **READY**.

Les anciens états ERROR sont historiques et obsolètes.

---

# 11. BLOQUANTS DE CERTIFICATION

1. E2E complet.
2. Mobile réel.
3. Gmail OAuth runtime.
4. Billing/iClan de bout en bout.
5. Mobility E2E.
6. J’IA rig anatomique.
7. Deux corrections GitHub identifiées mais non poussées : `/cv → /talent/cvs` et fermeture automatique Recruiter onboarding.

---

# 12. CRITÈRE DE FIN

Une fonctionnalité est **TERMINÉE** uniquement si : **SPÉCIFIÉ → CODÉ → ACCESSIBLE → CONNECTÉ → TESTÉ → VALIDÉ → DÉPLOYÉ**.

---

# 13. PROCHAINE PASSE OBLIGATOIRE

1. Fermer les corrections GitHub bloquées.
2. Exécuter les E2E prioritaires.
3. Valider mobile.
4. Valider Gmail OAuth runtime.
5. Fermer Billing/iClan.
6. Fermer Mobility E2E.
7. Finaliser le rig anatomique J’IA.
8. Harmoniser Cinematic/classique.
9. Nettoyer les anciennes contradictions documentaires.
10. Rebuild → test → déploiement → vérification production.

**Ne pas revenir à un état antérieur : `main` actuel est la base de continuation.**

---

# HISTORIQUE

# 0. ÉTAT EXÉCUTIF

## Situation actuelle

JOBLY est un produit PWA/Next.js déployé sur Vercel, avec Supabase/PostgreSQL et une fondation Career Brain ainsi que les écosystèmes Recruiter et Partner construits dans le code actuel.

Le projet a volontairement dévié de l'ordre historique pour construire Recruiter/Partner. Cette déviation est **assumée et validée** : il ne faut pas supprimer ces travaux ni revenir artificiellement à l'ancien état.

### Mise à jour — 13/09/2026 — Audit 360° navigation + corrections P0

**Un audit complet de navigation a été réalisé** (lecture exhaustive de `app/**` : chaque bouton, lien et route a été vérifié). Rapport complet : `AUDIT-360-JOBLY-13-09-2026.md`. 27 problèmes identifiés (boutons morts, liens erronés, pages orphelines, écrans stub, fonctionnalités du cahier des charges non codées).

**Corrections P0 appliquées le jour même** (boutons morts / navigation cassée — voir détail section 22) :
- Lien "Candidatures" et "Profil" de l'écran Écosystème corrigés (pointaient au mauvais endroit).
- Bouton "Voir tout" (candidats recommandés, Dashboard Recruiter) : retiré avec les données fictives qui l'accompagnaient (3 candidats codés en dur, jamais réels) — remplacé par un état honnête "Bientôt disponible".
- Bouton "Générer avec IA" (création d'offre) : retiré, remplacé par un badge désactivé explicite (reste soumis au chiffrage Free-First IA, section 17).
- `BottomNav` ajoutée sur `/recruiter/ats` et `/recruiter/jobs/[id]` (absente auparavant — navigation cassée sur ces deux écrans).
- Nouvelle page `/recruiter/jobs` créée : l'onglet "Offres" du Bottom Nav Recruiter pointait vers cette route qui n'existait pas (404 systématique). Nécessaire pour que l'ajout du `BottomNav` ci-dessus n'expose pas ce lien mort partout.
- Nouvelle page `/notifications` créée et cloche de `PageHeader` reliée (présente sur toutes les pages, n'avait jusqu'ici aucune action nulle part).
- Service worker PWA effectivement enregistré : `app/pwa-init.ts` existait mais n'était importé nulle part (`registerJoblyServiceWorker()` n'était donc jamais appelé). Remplacé par `components/PwaInit.tsx`, monté dans `app/layout.tsx`. `scripts/check-pwa.mjs` corrigé au passage (préfixe `apps/web/` incorrect qui ne correspondait à aucune structure réelle du repo).

**Ce qui N'A PAS été traité aujourd'hui (P1/P2 — cf. audit)** — ne pas déclarer résolu :
- `/recruiter/candidatures` reste un stub figé (n'affiche jamais les vraies candidatures).
- `/recruiter/onboarding` reste orphelin (codé mais non relié à aucun parcours).
- `/partner/payment` et `/partner/profile` restent des stubs ("à venir").
- Détail d'une offre côté Talent (`/jobs/[id]`), fiche "Voir profil talent" côté Recruiter, "Mes filleuls" et "Retrait" côté Partner : toujours absents du code (fonctionnalités du cahier des charges, développement réel nécessaire).
- Match global, Opportunités recommandées, Mon CV IA (Dashboard Talent) : toujours absents malgré la spec détaillée en section 12.4.

**Aucun de ces correctifs n'a été testé sur téléphone réel ni déployé.** Conformément au principe §18, "codé" n'est pas "validé".

### Décision de priorité — 12/09/2026 (soir)

**Le fondateur a tranché : avant les abonnements/paiement, on construit d'abord une version simple du moteur qui propose des emplois aux candidats (Matching + Applications basique).**

Raison : sans ce moteur, il n'y a pas encore de "plat principal" à faire payer — Recruiter et Partner sont des briques annexes qui n'ont de sens qu'autour d'un service central qui fonctionne pour le candidat.

Voir section 12 pour le nouvel ordre de construction.

### Mise à jour technique — 12/09/2026 (15:30 UTC)

**RECRUITER — Pages redessinées et enrichies ✅**
- 5 pages entièrement redessinées calquées sur les visuels fournis
- Onboarding recruiter avec scoring progressif (CRÉÉE)
- Dashboard principal avec ATS et candidats recommandés (AMÉLIORÉE)
- Page création d'offre avec prévisualisation (AMÉLIORÉE)
- Page candidatures avec gestion détaillée (AMÉLIORÉE)
- Composant ScoreRing amélioré avec 3 tailles et gradients adaptatifs
- Voir `RECRUITER-UPDATES-12-09-2026.md` pour détails complets

**État:** 🔧 CODÉ → 🟡 EN VALIDATION E2E

### Mise à jour technique — 12/09/2026 (16:00 UTC)

**ATS — Intégration Kanban avec Drag-Drop ✅**
- Composant `RecruiterATS` avec drag-drop HTML5 natif (CRÉÉE)
- 4 colonnes : À faire | En cours | Interview | Recruté
- Sauvegarde automatique des statuts en Supabase
- Statistiques temps réel par colonne
- Page ATS dédiée `/recruiter/ats` avec filtrage par offre (CRÉÉE)
- Avatars candidates + détails candidat en cartes
- Affichage dates d'entretien et preuves jointes
- Intégration dans dashboard recruiter principal
- Voir `ATS-DOCUMENTATION.md` pour détails complets

**État:** 🔧 CODÉ + DÉPLOYÉ → 🟡 EN VALIDATION E2E

### Validation actuelle déclarée par le fondateur

- **Google/Gmail Auth : ✅ VALIDÉ**
- **Vercel : ✅ OK**
- **Dashboards des différents écosystèmes : ✅ présents et journeys correspondants validés côté produit**
- **WhatsApp Auth : ⏸️ REPORTÉ** — coût trop élevé / API non attachée
- **Phone Auth : ⏸️ REPORTÉ** — déjà configuré mais coût trop élevé
- **Abonnements : 🔴 À INTÉGRER**
- **iClan Payment API : 🔴 NON ATTACHÉE**
- **Career Brain : 🟡 construit ; validation E2E téléphone à poursuivre**
- **Recruiter : 🟡 construit ; parcours fonctionnel détaillé à valider**
- **Partner : 🟡 construit ; parcours fonctionnel détaillé à valider**

---

# 1. RÈGLE DE VÉRITÉ

### Statuts

- 🔴 **NON COMMENCÉ** — aucune implémentation significative.
- 🟡 **SPÉCIFIÉ / CONÇU** — défini dans la documentation, pas nécessairement codé.
- 🔧 **CODÉ** — présent dans le code mais pas encore validé.
- 🧪 **EN VALIDATION** — test réel en cours.
- ✅ **VALIDÉ** — parcours testé et accepté.
- 🚀 **DÉPLOYÉ** — présent sur l'environnement de production.
- ⏸️ **REPORTÉ** — volontairement gelé.
- ⚠️ **BLOQUÉ** — dépendance empêchant la progression.

**Une fonctionnalité peut avoir plusieurs dimensions.**
Exemple : `CODÉ + DÉPLOYÉ + NON VALIDÉ`.

---

# 2. ÉTAT DU PRODUIT ACTUEL

| Domaine | Code | Déploiement | Validation | État |
|---|---|---|---|---|
| Foundation / Next.js / PWA | 🔧 | 🚀 | 🧪 | 🟡 |
| Vercel | 🔧 | 🚀 | ✅ selon validation utilisateur | 🟢 |
| Supabase | 🔧 | 🚀 | 🧪 | 🟡 |
| Google/Gmail Auth | 🔧 | 🚀 | ✅ | 🟢 |
| WhatsApp Auth | 🔧 | — | — | ⏸️ |
| Phone Auth | 🔧 | — | — | ⏸️ |
| Profile Foundation | 🔧 | 🚀 | 🧪 | 🟡 |
| Career Brain | 🔧 | 🚀 | 🧪 | 🟡 |
| Career Score | 🔧 | 🚀 | 🧪 | 🟡 |
| Jobs / Discovery | 🔧 | 🚀 | 🧪 | 🟡 |
| Matching | 🔧 | — | — | 🟡 |
| Applications | 🔧 | — | — | 🟡 |
| Recruiter | 🔧 | 🚀 | 🧪 → ✅ | 🟢 |
| Partner | 🔧 | 🚀 | 🧪 | 🟡 |
| Abonnements | 🟡 | — | — | 🔴 |
| Payment Core | 🟡 | — | — | 🔴 |
| iClan | 🟡 | — | — | 🔴 |
| Interview AI | 🟡 | — | — | 🔴 |
| Learning Intelligence | 🟡 | — | — | 🔴 |
| Career GPS | 🟡 | — | — | 🔴 |
| Career Gap Engine | 🟡 | — | — | 🔴 |
| Opportunity Radar | 🟡 | — | — | 🔴 |
| Career Companion | 🟡 | — | — | 🔴 |
| Jobly Mobility | 🟡 | — | — | 🔴 |
| Location Intelligence | 🟡 | — | — | 🔴 |
| Campus | 🟡 | — | — | 🔴 |
| Communities | 🟡 | — | — | 🔴 |
| Events | 🟡 | — | — | 🔴 |
| Jobly ID / QR | 🟡 | — | — | 🔴 |
| Market Intelligence | 🟡 | — | — | 🔴 |
| Admin / Finance / Moderation | 🟡 | — | — | 🔴 |

---

# 3. CE QUI EST ACTUELLEMENT DANS LE CODE

**Note du 13/09/2026 : cette liste est un journal historique du 12/09/2026, elle était déjà incomplète à l'époque (`/recruiter/ats`, `/recruiter/candidatures`, `/recruiter/onboarding`, `/partner/payment`, `/partner/profile`, `/partner/referral` existaient déjà mais n'y figuraient pas). Elle n'est pas réécrite ici pour préserver l'historique — voir section 22 et `README.md` §24 pour l'inventaire exact et à jour des routes.**

Routes observées dans le ZIP C0.9.8 Recruiter/Partner :

### Core
- `/`
- `/ecosystem`
- `/dashboard`
- `/jobs` — 🔧 RECONSTRUITE le 12/09/2026 : consomme `/api/jobs` (liste réelle, filtres CDI/CDD/ville/télétravail, recherche, % de correspondance) et `/api/applications` (bouton "J'ai postulé", détection des offres déjà postulées). Non déployée/testée sur téléphone réel.
- `/candidatures` — 🔧 CRÉÉE le 12/09/2026 (spec 12.2) : consomme `/api/applications` (liste + compteurs) et `/api/applications/[id]` (ajout de preuve, date d'entretien, déclaration Acceptée/Refusée, respecte la règle de conflit recruteur). Non déployée/testée sur téléphone réel. Ajoutée à la navigation principale (`BottomNav`).
- `/career-brain`
- `/auth/callback`

### Recruiter
- `/recruiter`
- `/recruiter/profile`
- `/recruiter/jobs/[id]`

### Partner
- `/partner`

### Legal
- `/legal/terms`
- `/legal/privacy`

### APIs
- `/api/auth/whatsapp/request`
- `/api/auth/whatsapp/verify`
- `/api/profile`
- `/api/recruiter/profile`
- `/api/recruiter/jobs`
- `/api/recruiter/jobs/[id]`
- `/api/partner/profile`
- `/api/partner/commissions`
- `/api/jobs` — 🔧 CODÉE le 12/09/2026, non déployée/testée (calcul du % de correspondance, spec 12.1)
- `/api/applications` (GET liste + POST "j'ai postulé") — 🔧 CODÉE le 12/09/2026, non déployée/testée
- `/api/applications/[id]` (PATCH côté candidat : preuve, statut final, entretien) — 🔧 CODÉE le 12/09/2026, non déployée/testée
- `/api/recruiter/applications` (GET, marque "Vu" automatiquement à l'ouverture) — 🔧 CODÉE le 12/09/2026, non déployée/testée
- `/api/recruiter/applications/[id]` (PATCH côté recruteur : statut prévaut en cas de conflit) — 🔧 CODÉE le 12/09/2026, non déployée/testée

**Attention : les routes WhatsApp présentes ne signifient pas que le fournisseur WhatsApp est opérationnel.**

---

# 4. DATABASE / SUPABASE

Le ZIP actuel contient notamment :

```text
supabase/
├── PROFILE-FOUNDATION.sql
├── RECRUITER-PARTNER-FOUNDATION.sql
└── PRODUCTION-DEPLOYMENT.sql
```

Tables actuellement observées côté Supabase lors des dernières vérifications :

```text
Commission
Education
Experience
Partner
Profile
RecruiterJob
RecruiterProfile
Skill
User
```

Le Prisma schema contient également des modèles plus larges, notamment :

```text
User
Profile
Experience
Skill
Education
Company
Job
Match
Application
Subscription
Partner
Commission
QRShare
AuditLog
```

### Point de vigilance

Historique de divergence entre :
- Prisma schema ;
- SQL Supabase réellement exécuté ;
- modèle d'authentification Supabase.

**Ne jamais déclarer le schéma parfaitement synchronisé sans vérifier la base réelle.**

### Migration 20260912100000_matching_applications_v1 — 🔧 CODÉE, NON DÉPLOYÉE

Ajoutée le 12/09/2026 pour préparer le Matching V1 (spec 12.1) et le suivi de candidature (spec 12.2) :

- `Profile.targetCities[]`, `Profile.contractPreferences[]`, `Profile.remotePreference` ;
- `Job.remoteMode`, `Job.minExperienceYears` ;
- `Application.proofUrl`, `Application.viewedAt`, `Application.interviewAt`, `Application.statusSource`.

Le mapping des statuts de la spec 12.2 réutilise l'enum `ApplicationStatus` existant sans le modifier : `DISCOVERED`→Brouillon, `SUBMITTED`→En attente, `ACKNOWLEDGED`→Vu, `INTERVIEW`→Entretien, `OFFER`/`REJECTED`→Acceptée/Refusée.

**Non exécutée sur la base réelle.** À valider avec `npm run db:validate` puis `db:migrate:deploy` avant tout usage en API.

### Migration 20260912110000_recruiterjob_unification — 🔧 CODÉE, NON DÉPLOYÉE

**Point de vigilance découvert et résolu le 12/09/2026 :** `RecruiterJob` (offres publiées par un recruteur JOBLY) existait uniquement en SQL brut, sans modèle Prisma, sans aucun lien avec `Application`. Le code Recruiter le disait lui-même honnêtement (`app/recruiter/page.tsx`) : *"les vues et candidatures par offre ne sont pas encore affichées ici"*.

**Décision du fondateur (12/09/2026) :** les candidatures portent sur les 2 sources (`Job` Discovery ET `RecruiterJob`), l'écran Offres mélange les deux.

Ajouté par cette migration :
- Modèle Prisma `RecruiterJob` (mappe la table SQL existante) + `remoteMode`/`minExperienceYears` pour un calcul de matching cohérent avec `Job` ;
- `Application.jobId` devient optionnel, ajout de `Application.recruiterJobId` ;
- Contrainte : exactement une des deux sources par candidature (jamais les deux, jamais aucune).

**Non exécutée sur la base réelle.**

---

# 5. AUTHENTIFICATION — DÉCISIONS FIGÉES

## Google/Gmail

**Statut : ✅ VALIDÉ**

Le parcours Google OAuth fonctionne sur l'environnement de production selon la validation utilisateur.

## WhatsApp

**Statut : ⏸️ REPORTÉ**

Décision :
- coût jugé trop élevé ;
- API/fournisseur non attaché.

Ne pas réactiver ou remplacer le provider sans nouvelle décision.

## Numéro de téléphone

**Statut : ⏸️ REPORTÉ**

Décision :
- configuration déjà réalisée ;
- coût jugé trop élevé.

Le code/configuration existants doivent être conservés tant qu'aucune décision contraire n'est prise.

## E-mail / mot de passe

Le code historique contient un parcours téléphone/e-mail + mot de passe. La présence du code ne vaut pas validation actuelle. Toute réactivation doit être testée séparément.

---

# 6. CAREER BRAIN

## État

🔧 **CODÉ**
🧪 **VALIDATION E2E À POURSUIVRE**

Fonctions actuellement présentes/construites :
- profil ;
- objectif ;
- expériences ;
- compétences ;
- formations ;
- sauvegarde ;
- Career Score.

### Validation attendue

```text
Google Login
 ↓
Dashboard
 ↓
Career Brain
 ↓
Saisie
 ↓
Sauvegarde
 ↓
Reconnexion
 ↓
Données retrouvées
```

Ne pas déclarer le Career Brain totalement validé tant que le parcours réel n'a pas été testé.

## 6.1 Spécification technique — Onboarding Career Brain (4 étapes, V1)

*Rédigée le 12/09/2026, sur la base d'une maquette de référence issue du pack Journey. Cette maquette montre un onboarding en 3 étapes ; il en faut 4 pour couvrir les besoins du Matching (spec 12.1).*

### Étapes de l'onboarding
1. **Profil** — Nom, Ville (résidence actuelle), Quartier. *(déjà conforme à la maquette de référence)*
2. **Objectifs** *(nouvel onglet, n'existait pas comme étape distincte dans la maquette)* :
   - Métier(s) ciblé(s)
   - Ville(s) souhaitée(s) pour un emploi — **champ distinct de la ville de résidence**, plusieurs villes possibles (pensé pour s'articuler avec Jobly Mobility plus tard)
   - Type de contrat souhaité — **plusieurs choix possibles** (CDI et/ou CDD)
   - Préférence télétravail (oui / non / peu importe)
3. **Compétences** — tags ajoutables/supprimables (ex : Python, Marketing digital, SQL...). *(conforme à la maquette de référence)*
4. **Score** — Career Score, calcul déjà existant, **non modifié par cette spec**.

### Expériences (années d'expérience pour le Matching)
Le champ "années d'expérience" requis par le Matching (spec 12.1) n'est **pas** ressaisi à la main : il est calculé automatiquement à partir des expériences déjà saisies dans le Career Brain (poste, entreprise, dates — fonction déjà existante d'après le code actuel).

**Règle de calcul simple pour la V1 :** années d'expérience = (date d'aujourd'hui − date de début de la première expérience professionnelle renseignée), arrondi à l'année inférieure. Pas de gestion fine des périodes de chevauchement ou d'interruption en V1 — à affiner plus tard si nécessaire.

### Point HORS PÉRIMÈTRE — CV avec extraction automatique (Gemini IA)
La maquette de référence montre un bloc "Déposez votre CV ici — Extraction automatique via Gemini IA". **Cette fonctionnalité n'est pas incluse dans cette spec.** Décision du 12/09/2026 : le coût réel de l'extraction Gemini par utilisateur doit être chiffré avant toute décision de la construire (voir section 17, action ajoutée). Tant que ce chiffrage n'est pas fait, l'écran Career Brain V1 ne doit pas inclure ce bloc.

### Critère de validation (Definition of Done)
Un candidat de test doit pouvoir : compléter les 4 étapes → se déconnecter → se reconnecter → retrouver toutes ses données, y compris ses années d'expérience recalculées automatiquement. Testé sur téléphone réel.

---

# 7. RECRUITER

## État

🔧 **CODÉ**
🚀 **PRÉSENT SUR VERCEL**
🧪 **VALIDATION E2E À POURSUIVRE**

Construit :
- profil Recruiter ;
- fiche entreprise ;
- création d'offre ;
- publication d'offre ;
- liste/détail des offres ;
- API Recruiter ;
- fondation Supabase Recruiter.

### Parcours de validation

```text
/ecosystem
 ↓
bulle Recruiter
 ↓
dashboard Recruiter
 ↓
fiche entreprise
 ↓
publier une offre
 ↓
retrouver l'offre dans la liste
 ↓
ouvrir la fiche
```

La construction Recruiter est une **déviation consciente et validée** de l'ancien ordre de travail.

Ne pas supprimer cette fonctionnalité sous prétexte que l'ancien `Statut.md` demandait de ne pas encore y toucher.

---

# 8. PARTNER

## État

🔧 **CODÉ**
🚀 **PRÉSENT SUR VERCEL**
🧪 **VALIDATION E2E À POURSUIVRE**

Construit :
- dashboard Partner ;
- code de parrainage ;
- commissions/fondation ;
- moyen de paiement/payout ;
- API Partner ;
- tables Supabase Partner/Commission.

### Parcours de validation

```text
/ecosystem
 ↓
bulle Partner
 ↓
dashboard Partner
 ↓
vérifier code de parrainage
 ↓
copier le lien
 ↓
enregistrer un moyen de paiement
```

---

# 9. ABONNEMENTS

## État

🔴 **À INTÉGRER**

La page / le parcours d'abonnement n'est pas encore intégré au produit actuel.

### Conception cible

```text
Plans
 ↓
Choix du plan
 ↓
Subscription
 ↓
Payment
 ↓
Confirmation
 ↓
Entitlements
 ↓
Activation Premium
```

Hypothèse tarifaire historique :
- 1 000 FCFA/mois ;
- 3 000 FCFA/an.

À conserver comme hypothèse jusqu'à revalidation économique.

---

# 10. PAYMENT CORE / iCLAN

## État

🔴 **NON INTÉGRÉ**

La documentation prévoit un Payment Core abstrait.

iClan/Eduklan est la frontière fournisseur retenue, mais **l'intégration live n'est pas encore considérée comme production**.

### Règles

```text
CREATED
 ↓
PENDING
 ↓SUCCESSFUL / FAILED ↓
REFUNDED
```

Obligatoire :
- external_id ;
- idempotence ;
- confirmation serveur ;
- webhook sécurisé ;
- journalisation ;
- réconciliation ;
- séparation UAT / production.

Ne jamais simuler une réussite de paiement en production comme si elle provenait d'iClan.

---

# 11. VISION 20/20 — BACKLOG STRATÉGIQUE

Les fonctionnalités suivantes sont désormais **validées comme direction produit**, mais ne doivent pas être présentées comme déjà construites.

## Career Intelligence

🔴/🟡 :
- Career Twin ;
- Career GPS ;
- Career Gap Engine ;
- Career Readiness ;
- Seniority Readiness ;
- Decision Engine ;
- Next Best Action.

## Opportunity Intelligence

- Opportunity Score ;
- Opportunity Radar ;
- Application Intelligence ;
- Career Feedback Loop.

## Career Performance

- Interview AI ;
- Interview Memory ;
- Learning Intelligence ;
- Portfolio AI ;
- Career Companion.

## Mobility

- Mobility Intelligence ;
- Location Intelligence ;
- Mobility Fit ;
- Destination Match ;
- Mobility Planner ;
- logement ;
- transport ;
- installation ;
- settlement.

## Ecosystem

- Recruiter Intelligence ;
- Recruit + Move ;
- Partner / Career Ambassador ;
- Campus ;
- Communities ;
- Events ;
- Jobly ID / QR.

## Market Intelligence

- Skills Demand Radar ;
- Salary Intelligence ;
- Talent Intelligence ;
- Employer Intelligence ;
- scénarios de carrière/marché.

---

# 12. PROCHAINE LOGIQUE DE CONSTRUCTION

**Mise à jour du 12/09/2026 (soir) : réordonnancement décidé par le fondateur.**
Avant toute brique économique (abonnements/paiement), on construit et on valide une **boucle de valeur minimale pour le candidat** : proposer des emplois pertinents et permettre d'y postuler. Tant que cette boucle n'existe pas, il n'y a rien de concret à faire payer, et Recruiter/Partner restent des briques annexes sans centre.

### Priorité immédiate

## P0 — Stabiliser et fermer les fondations déjà construites

1. Vérifier build local :
```bash
npm install
npm run typecheck
npm run build
```

2. Tester sur téléphone réel :
- Google Auth ;
- Career Brain ;
- Recruiter ;
- Partner.

3. Corriger uniquement les erreurs observées.

## P1 — Boucle de valeur minimale : Matching + Applications (simple, pas d'IA générative)

*Nouvelle priorité — anciennement P3, remontée par décision du 12/09/2026.*

4. **Matching simple, par règles** : associer une offre au profil selon des critères explicites (métier ciblé, localisation, niveau d'expérience) — pas de score IA sophistiqué à ce stade, juste "cette offre correspond à ce que tu cherches".
5. **Liste des offres proposées** : un écran qui affiche ces offres au candidat, triées par pertinence simple.
6. **Applications** : un candidat peut marquer "j'ai postulé" / suivre le statut d'une candidature (même sans automatisation).
7. **Test réel** : un candidat de test doit pouvoir se connecter, voir des offres pertinentes, et suivre au moins une candidature de bout en bout.

**Ne pas** ajouter d'IA générative, de scoring sophistiqué, ou d'Opportunity Score à ce stade — la version simple doit d'abord prouver que la boucle a de la valeur.

## PISTE PARALLÈLE — 3 fonctionnalités IA gratuites (décision du 12/09/2026, soir)

**Décision du fondateur :** construire Career AI (assistant conversationnel), Mon CV optimisé par IA, et Formations gratuites recommandées **en parallèle du P1**, pas après. **Gratuites pour tous les utilisateurs pour l'instant** (Abonnements/Premium pas encore prêt — voir P2).

**Point de vigilance assumé :** sans verrouillage Premium, ces fonctions sont accessibles à 100% des utilisateurs, pas seulement des payants — c'est le scénario de coût le plus élevé possible, pas le plus prudent. Décision prise en connaissance de cause.

**Règle non négociable, aucune exception :** pour chacune des 3 fonctions, le chiffrage du coût réel par utilisateur (règle Free-First IA, section 17) doit être fait **avant** d'écrire la moindre ligne de code IA. Le chiffrage Gemini CV est déjà en attente (section 17) ; il en faut un pour Career AI et un pour Formations.

- **Career AI** : assistant conversationnel, spec technique à rédiger.
- **Mon CV optimisé par IA** : dépend du chiffrage Gemini déjà en attente (section 17).
- **Formations gratuites recommandées** : nécessite en plus un catalogue réel de formations à sourcer (pas seulement du code) — voir section 12.4.

Tant qu'une des 3 fonctions n'est pas chiffrée + codée + testée, elle reste **non cliquable** sur le dashboard réel (voir section 12.4) — jamais un bouton qui mène nulle part.

## 12.1 Spécification technique — Écran "Offres" (Matching V1 simple)

*Rédigée le 12/09/2026, sur la base d'une maquette de référence issue du pack Journey. Cette maquette est une inspiration visuelle — les chiffres qu'elle affiche (ex : "12 543 offres", "95% match") sont illustratifs, pas des valeurs réelles à reproduire.*

### Objectif
Montrer au candidat une liste d'offres réelles (issues de la brique Discovery déjà ingérée), triées par pertinence, avec un score de correspondance simple, explicable et honnête — pas une prédiction IA.

### Données nécessaires côté candidat (Career Brain)
- Métier(s) ciblé(s)
- Ville souhaitée
- Type de contrat souhaité (CDI / CDD)
- Préférence télétravail (oui / non / peu importe)
- Années d'expérience du candidat

### Données nécessaires côté offre (Jobs / Discovery)
- Intitulé du poste
- Ville
- Type de contrat
- Modalité télétravail (oui / non / partiel)
- Expérience minimale requise (en années)
- Entreprise (nom, logo ou initiale)

### Règle de calcul du % de correspondance (5 critères, pondération égale)
1. **Métier** : correspond si l'intitulé du poste contient ou correspond au métier ciblé → 1 point ou 0.
2. **Ville** : correspond si la ville de l'offre = ville souhaitée → 1 point ou 0.
3. **Contrat** : correspond si le type de contrat de l'offre = celui souhaité → 1 point ou 0.
4. **Télétravail** : 1 point si l'offre correspond exactement à la préférence ; 0,5 point si l'offre propose "partiel" et que le candidat veut du télétravail ; 0 sinon.
5. **Expérience** : correspond si les années d'expérience du candidat ≥ minimum requis par l'offre → 1 point ou 0 (avoir plus d'expérience que le minimum ne pénalise jamais).

**% de correspondance = (somme des points / 5) × 100**, arrondi à l'entier le plus proche.

*Exemple : métier ✅ (1) + ville ✅ (1) + contrat ✅ (1) + télétravail partiel (0,5) + expérience ✅ (1) = 4,5/5 = 90%.*

### Filtres affichés (en-tête de l'écran)
- Type de contrat (CDI / CDD)
- Ville
- Télétravail

*(Les mêmes trois filtres que la maquette de référence ; pas de filtre supplémentaire en V1.)*

### Contenu de chaque carte d'offre
- Initiale ou logo de l'entreprise
- Nom de l'entreprise
- Intitulé du poste
- Ville
- Type de contrat + modalité télétravail
- Badge de % de correspondance (calculé comme ci-dessus)
- Flèche vers le détail de l'offre

### Compteur en haut de liste
Afficher le **nombre réel** d'offres actuellement disponibles dans la base (issu de Discovery) — jamais un nombre inventé ou approximatif.

### Tri de la liste
Par % de correspondance décroissant.

### Explicitement HORS PÉRIMÈTRE de cette version
- Pas de scoring IA générative ou de pondération variable selon l'importance des critères.
- Pas d'Opportunity Score avancé (réservé à la Phase 4 / P4 d'Opportunity Intelligence).
- Pas de pagination infinie ni de recommandations personnalisées au-delà des 5 critères ci-dessus.
- Pas de bouton "Postuler automatiquement" — seulement l'accès au détail de l'offre (le suivi de candidature "j'ai postulé" est une brique séparée, voir P1, point 6).

### Critère de validation (Definition of Done)
Un candidat de test, avec un profil Career Brain rempli, doit pouvoir : ouvrir l'écran Offres → voir des offres réelles avec un % cohérent avec son profil → filtrer par contrat/ville/télétravail → ouvrir le détail d'une offre. Testé sur téléphone réel, pas seulement en local.

---

## 12.2 Spécification technique — Écran "Candidatures" (Suivi V1 simple)

*Rédigée le 12/09/2026, sur la base d'une maquette de référence issue du pack Journey.*

### Objectif
Permettre au candidat de suivre l'état de ses candidatures, avec des statuts fiables — mis à jour manuellement par le candidat ET par le recruteur (déjà présent dans l'espace Recruiter existant), sans automatisation IA.

### Statuts, dans l'ordre du parcours
1. 🟠 **En attente** — dès que le candidat a joint une preuve de candidature (voir ci-dessous). Le recruteur peut aussi confirmer la réception depuis son espace Recruiter.
2. 🔵 **Vu** — automatique, dès qu'un recruteur ouvre la candidature dans son espace Recruiter existant (aucune nouvelle brique à construire, juste enregistrer l'horodatage de première ouverture).
3. 🟣 **Entretien** — une date est renseignée manuellement, par le candidat ou par le recruteur.
4. ✅ **Acceptée** / ❌ **Refusée** — statut final. Le candidat peut le déclarer lui-même, **mais si le recruteur renseigne un résultat depuis son espace, c'est cette valeur qui prévaut** en cas de différence.

### Preuve de candidature (point 1)
- Quand le candidat clique "j'ai postulé" (depuis l'écran Offres), l'app demande une preuve : capture d'écran ou photo de la confirmation (e-mail, message).
- Tant qu'aucune preuve n'est jointe : statut **Brouillon**, non compté dans les statistiques.
- Dès qu'une preuve est jointe : statut **En attente**, avec tag "Preuve vérifiée" + date/heure.
- "Vérifiée" signifie ici : un fichier a bien été joint par le candidat — **pas** une vérification automatique du contenu par IA. Pas d'analyse d'image en V1.

### Compteurs en haut de l'écran
- **Envoyées** : nombre de candidatures au statut En attente ou au-delà (pas les Brouillons).
- **Vues** : nombre de candidatures au statut Vu ou au-delà.
- **Entretien** : nombre de candidatures au statut Entretien.
- Tous calculés automatiquement à partir des statuts réels — jamais un chiffre saisi à la main.

### Contenu de chaque carte de candidature
- Logo/initiale entreprise, nom entreprise
- Intitulé du poste
- Ville, type de contrat, modalité télétravail
- Badge de statut (couleur selon la liste ci-dessus)
- Ligne de détail contextuelle : "Preuve vérifiée · [date]" / "Consultée le [date]" / "Entretien prévu · [date]"
- Flèche vers le détail de la candidature

### Tri
Par défaut : les candidatures les plus récemment mises à jour en premier. Un bouton "Trier" permet de changer l'ordre (par date de candidature, par statut).

### Explicitement HORS PÉRIMÈTRE de cette version
- Pas de vérification automatique du contenu de la preuve (OCR, IA de lecture d'image).
- Pas de notification automatique au recruteur ni de relance automatisée.
- Pas d'estimation de délai de réponse ni de prédiction IA sur les chances de succès.

### Règle de conflit candidat/recruteur
Si le candidat déclare un statut final (Acceptée/Refusée) et que le recruteur déclare un statut différent depuis son espace, **le statut du recruteur remplace celui du candidat**, avec une mention visible de la source ("Confirmé par l'entreprise").

### Critère de validation (Definition of Done)
Un candidat de test doit pouvoir : postuler depuis l'écran Offres → joindre une preuve → voir le statut passer à "En attente" → qu'un compte recruteur de test ouvre cette candidature dans son espace existant → voir le statut du candidat passer automatiquement à "Vu". Testé sur téléphone réel pour le candidat, testé sur l'espace Recruiter existant pour la partie recruteur.

---

## 12.4 Spécification technique — Dashboard / Accueil (V1)

*Rédigée le 12/09/2026, sur la base d'une maquette de référence issue du pack Journey.*

### Éléments réutilisant des specs déjà écrites (pas de nouvelle logique)
- **En-tête** : "Bonjour [Prénom]" (donnée du profil Career Brain), tagline produit fixe.
- **Barre de recherche** : tape un poste → renvoie vers l'écran Offres (12.1) avec la recherche pré-remplie.
- **Raccourci "Offres"** : affiche le nombre réel d'offres disponibles (jamais un chiffre inventé comme "+12 500").
- **Raccourci "Mes candidatures"** : affiche le nombre réel de candidatures du candidat (calculé comme en 12.2).
- **"Match global" (ex : 92%)** : moyenne du % de correspondance (formule 12.1) des 3 meilleures offres du candidat. Pas un nouveau calcul — juste une moyenne de ce qu'on calcule déjà.
- **"Opportunités recommandées"** : les 3 offres au % de correspondance le plus élevé (même logique que l'écran Offres, 12.1), affichées ici en aperçu avec un lien "Voir tout" vers l'écran Offres complet.

### Éléments nouveaux — les 3 fonctions IA (piste parallèle, voir section 12 ci-dessus)
- **Raccourci "Career AI"** : assistant conversationnel. Spec technique détaillée à rédiger séparément. Reste non cliquable tant que non codé/testé.
- **Raccourci "Mon CV"** : optimisation de CV par IA. Dépend du chiffrage Gemini (section 17). Reste non cliquable tant que non chiffré/codé/testé.
- **Bandeau "Boostez vos compétences" (formations gratuites)** : nécessite un chiffrage IA ET un catalogue réel de formations (contenu à sourcer, pas seulement du code — à clarifier séparément : formations internes ou liens vers des plateformes externes gratuites). Reste masqué tant que le contenu et le chiffrage ne sont pas prêts.

### État transitoire (tant que les 3 fonctions IA ne sont pas prêtes)
Les 3 blocs restent visibles sur le dashboard (décision du fondateur, section 12) mais affichent un badge "Bientôt disponible" et ne sont pas cliquables, pour ne jamais exposer un lien mort à un candidat réel.

### Critère de validation (Definition of Done)
Un candidat de test doit voir, après connexion : son prénom réel, un nombre réel d'offres et de candidatures, un % de match global cohérent avec ses 3 meilleures offres, et les 3 blocs IA soit fonctionnels soit clairement marqués "Bientôt disponible" — jamais un lien cassé. Testé sur téléphone réel.

---

### P2 — Finaliser les fondations économiques

*Anciennement P1 — repoussée après P1 par décision du 12/09/2026.*

8. Concevoir/intégrer page Abonnements.
9. Définir Payment Core.
10. Préparer le contrat iClan sans prétendre à une intégration live avant disponibilité des éléments fournisseur.
11. Définir les Entitlements Premium.

### P3 — Transformer Career Brain en Career OS minimal

*Anciennement P2.*

12. Career Goals.
13. Career Gap.
14. Career Roadmap / GPS.
15. Readiness.
16. Next Best Action.

### P4 — Opportunity Intelligence avancée

*Anciennement P3, partie avancée — le socle simple de Matching/Applications est maintenant en P1.*

17. Matching explicable (score détaillé).
18. Opportunity Score.
19. Feedback Loop.

### P5 — AI Career Agent

20. Interview AI.
21. Learning Intelligence.
22. Application Copilot.
23. Career Companion.

### P6 — Mobility

24. Location Intelligence.
25. Mobility Fit.
26. Mobility Planner.
27. Jobly Mobility.

---

# 13. CE QUI NE DOIT PAS ÊTRE FAIT MAINTENANT SANS NOUVEL ARBITRAGE

- développer Abonnements ou Payment Core avant que Matching + Applications (version simple) soit testé de bout en bout par un candidat réel (décision du 12/09/2026) ;
- coder la moindre ligne d'IA pour Career AI, Mon CV, ou Formations gratuites avant d'avoir chiffré le coût réel par utilisateur de chacune (décision du 12/09/2026, soir — voir section 12 et section 17) ;
- rendre cliquable un des 3 blocs IA du dashboard tant qu'il n'est pas codé et testé (voir 12.4) ;
- remplacer Google Auth ;
- réactiver WhatsApp ;
- imposer le SMS payant ;
- brancher un fournisseur de paiement fictif ;
- déclarer iClan production sans test ;
- créer un second modèle de données concurrent ;
- refaire Recruiter ou Partner ;
- supprimer le Career Brain actuel ;
- modifier la charte simplement pour ajouter une fonctionnalité ;
- créer des écrans « IA » sans moteur métier ;
- acheter une API IA payante sans analyse de coût.

---

# 14. DESIGN — DÉCISIONS ACTUELLES

Palette :

```text
Blue       #2563EB
Yellow     #FBBF24
Green      #10B981
Purple     #8B5CF6
Orange     #F97316
Navy       #16254A
White      #FFFFFF
```

Principes :
- mobile-first ;
- PWA ;
- plein écran ;
- haute lisibilité ;
- cartes arrondies ;
- beaucoup d'espace ;
- gradients sobres ;
- gradients surtout marque/IA/héro ;
- animations non bloquantes ;
- Jakarta Sans ou équivalent géométrique.

**Le design actuel ne doit pas être sacrifié à la logique backend.**

---

# 15. PRINCIPES PRODUIT FIGÉS

1. JOBLY n'est pas un job board.
2. Le Career Brain/Career Twin est le centre du Career OS.
3. JOBLY doit parfois dire « ne postule pas ».
4. Les recommandations doivent conduire à des actions.
5. L'IA ne doit jamais inventer les faits professionnels.
6. Les scores importants doivent être explicables.
7. Free-first.
8. Mobile-first.
9. La mobilité est une composante de carrière, pas un simple service de déménagement.
10. Recruiter, Partner et Talent appartiennent au même écosystème.
11. Les interactions doivent alimenter le Career OS lorsque cela est pertinent et autorisé.
12. Une fonctionnalité codée n'est pas une fonctionnalité validée.

---

# 16. RÈGLE DE CONCEPTION DES NOUVEAUX ÉCRANS

Avant de coder un nouvel écran, répondre dans cet ordre :

```text
1. Quel problème résout-il ?
2. Quel acteur l'utilise ?
3. Quel moteur JOBLY l'alimente ?
4. Quelles données utilise-t-il ?
5. Quelle décision/action permet-il ?
6. Quelle donnée/observation renvoie-t-il au Career OS ?
7. Quelles dépendances possède-t-il ?
8. Comment sera-t-il testé ?
```

Si ces réponses ne sont pas claires, **ne pas coder l'écran.**

---

# 17. RÈGLE FREE-FIRST IA

Toute nouvelle fonction IA doit commencer par :

```text
RÈGLES / SCORING DÉTERMINISTE
        ↓
OPEN SOURCE / GRATUIT
        ↓
QUOTAS GRATUITS
        ↓
FALLBACK
        ↓
API PAYANTE SI NÉCESSAIRE
```

Avant une API payante :
- estimer le coût/user ;
- comparer au prix Premium ;
- prévoir un fallback ;
- documenter la limite.

### Action en attente — 12/09/2026

**Chiffrer le coût réel de l'extraction de CV via Gemini IA (coût par upload, coût par utilisateur actif) avant de décider si ce bloc rejoint l'onboarding Career Brain (voir section 6.1).** Tant que ce chiffrage n'est pas fait, ne pas coder cette fonctionnalité.

---

# 18. CRITÈRE DE « TERMINÉ »

Une brique n'est pas terminée parce que :
- le fichier existe ;
- la route répond ;
- le build passe ;
- l'écran paraît correct.

Elle est terminée lorsqu'on dispose de :

```text
CODE
+
BUILD
+
ENVIRONMENT
+
PARCOURS RÉEL
+
TEST
+
VALIDATION
```

---

# 19. INSTRUCTION DE REPRISE

Toute IA qui reprend JOBLY doit :

1. lire `README.md` ;
2. lire ce `Statut.md` ;
3. inspecter le code actuel ;
4. rechercher les décisions historiques pertinentes ;
5. identifier les dépendances ;
6. ne pas repartir de zéro ;
7. ne pas créer une stratégie concurrente ;
8. modifier uniquement ce qui est nécessaire ;
9. tester ;
10. mettre à jour ce fichier avec le résultat réel.

### Prompt court de reprise

> **Tu reprends JOBLY 20/20. Lis README.md et Statut.md intégralement avant toute action. JOBLY est un Career Operating System, pas un simple Job Board. Le Career Brain/Career Twin est le centre. Respecte toutes les décisions validées. Ne confonds jamais codé, déployé et validé. Inspecte le code avant de modifier. Ne recommence rien qui existe déjà. Google/Gmail est validé ; WhatsApp et téléphone sont reportés. Recruiter et Partner sont construits. Abonnements et Payment/iClan restent à intégrer. Travaille selon les dépendances du Career OS et mets à jour Statut.md après chaque évolution significative.**

---

# 20. JOURNAL DE CONTINUITÉ — 12/09/2026

### Décisions majeures consolidées

- Vision JOBLY élevée au niveau **Career Operating System**.
- Career Brain renforcé conceptuellement en **Career Twin**.
- Career GPS / Career Gap / Readiness adoptés comme moteurs structurants.
- Interview AI et Learning Intelligence intégrés à la trajectoire.
- Opportunity Radar et Application Feedback Loop adoptés.
- Jobly Mobility considéré comme un moteur de carrière complet.
- Location Intelligence considérée comme couche transversale.
- Recruiter évolue vers Recruiter Intelligence / Recruit + Move.
- Partner évolue vers Career Network / Career Ambassador.
- Abonnements reconnus comme écran/brique encore manquant.
- Payment Core doit rester abstrait vis-à-vis d'iClan.
- Stratégie **free-first** confirmée.
- Méthode de conception : **moteur → données → action → écran**, et non écran isolé.

### Décision complémentaire — 12/09/2026 (soir)

**Réordonnancement de la construction : Matching + Applications (version simple) passe avant Abonnements/Payment Core.**
Raison donnée par le fondateur : construire la boucle de valeur pour le candidat avant de construire la capacité à le faire payer. Recruiter et Partner restent en l'état (déjà codés), mais aucune nouvelle brique économique ne démarre avant que cette boucle simple soit testée par un candidat réel. Voir section 12.

### Décision complémentaire — 12/09/2026 (reprise Dashboard, écran 10)

**Career AI, Mon CV et Formations gratuites recommandées deviennent des fonctionnalités Premium** (et non gratuites pour tous comme décidé plus tôt le 12/09 — voir section 12, contredit et remplace ce point précis). Elles sont codées maintenant, verrouillées (badge Premium 🔒, clic → écran Abonnements même en placeholder), sans logique IA réelle branchée tant que le chiffrage (section 17) n'est pas fait. Implication : un écran Abonnements minimal doit exister pour que le clic sur le cadenas ne mène pas à un lien mort.

**Moteur de Matching (P1) construit en même temps que l'écran Dashboard**, plutôt qu'avant. Migration DB `20260912100000_matching_applications_v1` codée (voir section 4) pour supporter le calcul du % de correspondance (12.1) et le suivi de candidature (12.2) — non encore déployée sur la base réelle.
**Règle de gouvernance ajoutée :** à chaque codage ou information pertinente, mettre à jour ce `Statut.md` et le `README.md` dans la foulée — pas seulement en fin de session.
**`/api/jobs` codée** (12/09/2026) : GET qui calcule le % de correspondance (5 critères pondération égale, spec 12.1) à partir du profil réel et retourne le nombre réel d'offres actives (`totalActive`, jamais filtré). Non déployée, non testée sur téléphone réel.

**Divergence RecruiterJob/Job découverte et arbitrée** (12/09/2026) : les candidatures couvrent les 2 sources d'offres (décision du fondateur). Migration `20260912110000_recruiterjob_unification` codée. `/api/jobs` fusionne désormais Discovery + RecruiterJob dans une seule liste triée par % de correspondance.

**`/api/applications` + `/api/applications/[id]` + `/api/recruiter/applications` + `/api/recruiter/applications/[id]` codées** (12/09/2026) selon la spec 12.2 : création "j'ai postulé" (Brouillon sans preuve, En attente avec preuve), statut "Vu" automatique dès qu'un recruteur ouvre la liste de ses candidatures reçues, règle de conflit candidat/recruteur (le recruteur prévaut). Non déployées, non testées sur téléphone réel ni avec un compte recruteur réel.

### Suite — 12/09/2026 (soir, écrans Offres/Candidatures)

**Écrans `/app/jobs` et `/app/candidatures` codés et branchés sur les API réelles** (`/api/jobs`, `/api/applications`, `/api/applications/[id]`), qui étaient codées mais non consommées par aucune interface. `/jobs` affiche désormais la vraie liste (Discovery + RecruiterJob fusionnés), le % de correspondance, des filtres fonctionnels, et un bouton "J'ai postulé". `/candidatures` (nouvel écran, ajouté à `BottomNav`) affiche les compteurs réels (envoyées/vues/entretien) et permet au candidat de joindre une preuve, déclarer une date d'entretien, ou un statut final — en respectant la règle de conflit (le recruteur prévaut).

**Non testé sur téléphone réel, ni avec les migrations `matching_applications_v1` et `recruiterjob_unification` déployées sur la base réelle** — ces migrations restent un préalable bloquant avant tout test de bout en bout (voir section 4). Sans elles, les colonnes utilisées par ces écrans (`targetCities`, `contractPreferences`, `remoteMode`, `proofUrl`, etc.) n'existent pas encore en base.

**Suite immédiate (même session) :** le pendant recruteur a aussi été branché — `/app/recruiter` affiche désormais un compteur de candidatures reçues par offre (avec badge "nouvelle(s)" pour les non vues), et `/app/recruiter/jobs/[id]` affiche la liste des candidatures reçues pour cette offre précise avec les actions recruteur (`/api/recruiter/applications`, `/api/recruiter/applications/[id]`) : fixer une date d'entretien, déclarer Acceptée/Refusée. Le bandeau "honnête par défaut" qui disait ces données absentes a été retiré/mis à jour en conséquence. La boucle candidat ↔ recruteur est donc entièrement câblée côté code.

**Construction des écrans terminée pour cette itération.** Prochaine étape obligatoire avant tout test : déployer les migrations `matching_applications_v1` et `recruiterjob_unification` sur la base Supabase réelle (`npm run db:validate` puis `db:migrate:deploy`). Aucun test en production ne doit avoir lieu avant ce déploiement — décision du fondateur, voir plus haut.

### Décision de gouvernance

**Ne plus développer JOBLY comme une succession d'écrans indépendants.**

Chaque nouvel écran doit appartenir à un moteur du Career OS et participer à la boucle :

```text
COMPRENDRE
 ↓
DIAGNOSTIQUER
 ↓
RECOMMANDER
 ↓
AGIR
 ↓
MESURER
 ↓
APPRENDRE
 ↓
AMÉLIORER LE CAREER TWIN
```

---

# 21. ÉTAT FINAL DE RÉFÉRENCE

```text
JOBLY 20/20

FOUNDATION             🟡
AUTH GOOGLE            ✅
AUTH PHONE             ⏸️
AUTH WHATSAPP          ⏸️
CAREER BRAIN           🧪
RECRUITER              🧪
PARTNER                🧪
SUBSCRIPTIONS          🔴
PAYMENT CORE           🔴
ICLAN                  🔴
MATCHING               🔴
APPLICATIONS           🔴
CAREER GPS             🔴
CAREER GAP             🔴
READINESS              🔴
INTERVIEW AI           🔴
LEARNING INTELLIGENCE  🔴
CAREER COMPANION       🔴
JOBLY MOBILITY         🔴
LOCATION INTELLIGENCE  🔴
CAMPUS                 🔴
COMMUNITIES            🔴
EVENTS                 🔴
JOBLY ID / QR          🔴
MARKET INTELLIGENCE    🔴
```

**Ceci est l'état de continuité de référence au 12/09/2026.** (Voir section 22 pour les corrections de navigation du 13/09/2026, qui s'y superposent sans le remplacer.)

---

# 22. JOURNAL DE CONTINUITÉ — 13/09/2026 — AUDIT 360° NAVIGATION

## Contexte

Demande du fondateur : "Audit 360° de toute l'application JOBLY. Objectif : 0 bouton mort." Audit réalisé par lecture exhaustive du code source (`app/**/page.tsx`, tous les composants partagés), sans exécution du build ni test sur téléphone réel (environnement d'audit sans accès réseau). Rapport complet livré séparément : **`AUDIT-360-JOBLY-13-09-2026.md`** — à conserver, il contient le détail des 27 constats, le tableau croisé fonctionnalité existante/non-existante par écosystème (Talent/Recruiter/Partner), et la priorisation P0/P1/P2.

## Corrections P0 appliquées le 13/09/2026

| # | Correction | Fichier(s) touché(s) |
|---|---|---|
| 1 | Lien "Candidatures" de l'écran Écosystème corrigé (`/jobs` → `/candidatures`, doublonnait avec "Offres") | `app/ecosystem/page.tsx` |
| 2 | Lien "Profil" de l'écran Écosystème corrigé (`/dashboard` → `/career-brain`, `/dashboard` est l'Accueil, pas un profil) | `app/ecosystem/page.tsx` |
| 3 | Bouton "Voir tout →" (candidats recommandés, Dashboard Recruiter) retiré, avec la section de données fictives qui l'accompagnait (3 candidats codés en dur : Amina Diallo, Paul Nkomo, Claire Mbarga — jamais réels, aucune API derrière) | `app/recruiter/page.tsx` |
| 4 | Bouton "✨ Générer avec IA" (création d'offre) retiré, remplacé par un badge désactivé explicite avec info-bulle | `app/recruiter/jobs/[id]/page.tsx` |
| 5 | `BottomNav` ajoutée (absente auparavant — navigation cassée, obligeait à utiliser le bouton retour) | `app/recruiter/ats/page.tsx`, `app/recruiter/jobs/[id]/page.tsx` |
| 6 | Nouvelle page créée : liste des offres recruteur | `app/recruiter/jobs/page.tsx` (nouveau) |
| 7 | Nouvelle page créée + cloche de `PageHeader` reliée | `app/notifications/page.tsx` (nouveau), `components/PageHeader.tsx` |
| 8 | Service worker PWA effectivement enregistré (`app/pwa-init.ts` n'était importé nulle part) | `components/PwaInit.tsx` (nouveau, remplace `app/pwa-init.ts` supprimé), `app/layout.tsx`, `scripts/check-pwa.mjs` (chemins `apps/web/` corrigés) |

### Détail — pourquoi la correction #6 était nécessaire (pas juste "en plus")

L'onglet "Offres" du `BottomNav` Recruiter (`RECRUITER_NAV`, dans `components/BottomNav.tsx`) pointait déjà vers `/recruiter/jobs` avant cet audit — mais cette route n'existait pas (seul `/recruiter/jobs/[id]` existait), donc l'onglet menait à un 404 partout où le `BottomNav` Recruiter était affiché. Ajouter le `BottomNav` sur `/recruiter/ats` et `/recruiter/jobs/[id]` (correction #5) aurait donc **propagé ce lien mort sur deux écrans de plus** sans la création de `app/recruiter/jobs/page.tsx`. La nouvelle page reprend la logique déjà utilisée sur `/recruiter` (chargement de `/api/recruiter/jobs` + `/api/recruiter/applications`) avec un filtre par statut (Toutes/Publiées/Brouillons/Clôturées) et redirige vers `/recruiter/jobs/[id]` au clic sur une offre, et vers `/recruiter/jobs/new` pour en publier une nouvelle.

### Détail — décision produit sur les données fictives (#3)

Le Dashboard Recruiter affichait 3 candidats inventés avec des scores de correspondance inventés (94%, 91%, 87%). Ceci contredit directement le principe déjà écrit dans ce document (section 15, principe 6 : "Les scores importants doivent être explicables") et la pratique déjà appliquée ailleurs dans le code (`totalActive` sur `/jobs`, compteurs sur `/candidatures` — toujours calculés, jamais inventés). Plutôt que de continuer à afficher ces faux candidats en attendant un futur moteur de recommandation (non spécifié à ce jour), la section affiche désormais un état honnête "Bientôt disponible", cohérent avec le traitement déjà réservé aux 3 fonctions IA du Dashboard Talent (section 12.4).

## Ce qui reste ouvert (P1 / P2 — non traité aujourd'hui, ne pas déclarer résolu)

Le rapport d'audit détaille la priorisation complète. Rappel des points **non corrigés** pour éviter toute confusion lors d'une reprise :

- **`/recruiter/candidatures`** : reste un stub figé, affiche toujours "Aucune candidature pour l'instant" quelle que soit la réalité. L'API `/api/recruiter/applications` existe et est déjà utilisée ailleurs (Dashboard, ATS, détail d'offre) — il suffit de brancher cette page dessus.
- **`/recruiter/onboarding`** : reste orphelin, codé (scoring de complétion, upload logo) mais non relié à aucun parcours (aucun lien nulle part dans le code ne pointe vers cette route). Décision à prendre : le relier après l'inscription recruteur, ou le supprimer si `/recruiter/profile` suffit.
- **`/partner/payment`** : reste un stub ("brique Billing à venir"), alors que la sélection Orange Money/MoMo fonctionnelle (logos cliquables, sauvegarde réelle) vit sur `/partner` (Dashboard), pas sur cet onglet dédié.
- **`/partner/profile`** : reste un stub ("à venir"), aucun champ.
- **Fiche "Voir profil talent"** (Recruiter) : toujours absente. Les cartes de candidature dans l'ATS et sur `/recruiter/jobs/[id]` n'affichent même pas le nom du candidat.
- **Détail d'une offre** (`/jobs/[id]`, Talent) : toujours absent. La spec 12.1 prévoyait une flèche vers le détail sur chaque carte d'offre — non implémentée.
- **"Mes filleuls"** et **"Retrait"** (Partner) : toujours absents du code (0 occurrence).
- **Match global, Opportunités recommandées, "Mon CV" IA** (Dashboard Talent) : toujours absents malgré la spec détaillée en section 12.4 — le journal du 12/09 (section 20) affirmait ces éléments "codés maintenant, verrouillés" ; ce n'est **pas exact**, ils sont absents du code actuel. Corriger cette affirmation dans toute synthèse future.
- **Onglet "Career AI"** (Talent) : mène en réalité à Career Brain (formulaire d'édition de profil), pas à un assistant conversationnel. Pas corrigé aujourd'hui (décision de renommage/produit à trancher par le fondateur, pas une simple correction technique).

## Critère de validation

Aucun des correctifs ci-dessus n'a été testé sur téléphone réel ni déployé — conformément au principe §18 de ce document, **codé n'est pas validé**. Avant de déclarer ces corrections "terminées", il faut : `npm install && npm run typecheck && npm run build`, puis un passage manuel sur chaque écran Recruiter (le `BottomNav` a été ajouté sur 2 écrans supplémentaires, à vérifier visuellement) et sur la nouvelle page `/recruiter/jobs`.

# 23. FEATURES VIRALES P1/P2 — 13/09/2026

## 8 fonctionnalités intégrées — MVP Free-first

| Feature | État | Implémentation |
|---|---|---|
| 1. Recruiter Gmail Connect + ATS unifié | 🔧 CODÉ | `lib/gmailService.ts`, `lib/atsService.ts`, `/recruiter/settings`, `/recruiter/candidatures` |
| 2. Multiposting inversé | 🔧 CODÉ | `lib/jobImportService.ts`, import URL dans création d'offre |
| 3. Talent Gmail & Drive Importer | 🔧 CODÉ | `/talent/profile`, `/talent/cvs` |
| 4. Pack multiposting manuel intelligent | 🔧 CODÉ | partage LinkedIn/Facebook/WhatsApp après publication |
| 5. Signature virale + auto-relance | 🔧 CODÉ | signature locale + `lib/cronService.ts` |
| 6. Referral passif par email | 🔧 CODÉ | `detectReferralByEmail()` + bloc Partner |
| 7. Générateur d'offre virale | 🔧 CODÉ | `components/ViralPoster.tsx`, Canvas + QR |
| 8. WhatsApp Apply | ⏸️ V2 / PAYANT | champ Business + toggle désactivé + `fetchFromWhatsApp()` |

### Principes d'implémentation

- MVP simulé mais interfaces de services structurées pour remplacement par APIs réelles.
- Aucune API WhatsApp payante appelée.
- Gmail OAuth est simulé côté navigateur pour le MVP.
- Les emails sortants sont journalisés localement pour le MVP.
- Le scoring ATS est déterministe et sans API payante.
- Les données existantes Supabase ne sont pas remplacées.
- Le design respecte le système blanc / radius 24 / pill / jaune `#FFC72C` / bleu `#2E5C9E` / navy `#0A1931`.
- Les fonctionnalités sont **CODÉES**, pas encore déclarées **VALIDÉES E2E** tant qu'un build et un parcours téléphone réel n'ont pas été exécutés.


# 24. CHECKPOINT DE CONTINUITÉ — 13/09/2026 — P1/P2 VIRAL CORE

## 24.1 ÉTAT FAISANT FOI

Cette section est **plus récente** que les anciennes listes P1/P2 de ce fichier. 
Une IA qui reprend JOBLY doit utiliser cette section comme état courant et ne doit pas
re-développer les éléments déjà indiqués comme CODÉS ci-dessous.

### Fonctionnalités déjà intégrées dans le pack

| # | Fonctionnalité | État courant |
|---|---|---|
| 1 | Recruiter Gmail Connect + Candidatures Unifiées + ATS | 🔧 CODÉ — validation E2E à faire |
| 2 | Multiposting inversé / import d'offre par URL | 🔧 CODÉ — validation E2E à faire |
| 3 | Talent Gmail + Google Drive Importer | 🔧 CODÉ — validation E2E à faire |
| 4 | Pack de partage LinkedIn / Facebook / WhatsApp | 🔧 CODÉ — validation E2E à faire |
| 5 | Signature Jobly + auto-relance simulée | 🔧 CODÉ — validation E2E à faire |
| 6 | Referral passif par email | 🔧 CODÉ — validation E2E à faire |
| 7 | Générateur d'affiche virale + QR | 🔧 CODÉ — validation E2E à faire |
| 8 | WhatsApp Apply | ⏸️ V2 PAYANT — préparation uniquement, aucune API payante |

## 24.2 SERVICES CENTRAUX

Les services suivants existent dans `lib/` et doivent être réutilisés avant de créer
un nouveau service équivalent :

- `lib/gmailService.ts`
- `lib/atsService.ts`
- `lib/viralityService.ts`
- `lib/cronService.ts`
- `lib/jobImportService.ts`

Les interfaces sont conçues en MVP simulé pour pouvoir remplacer progressivement les
mocks par de vraies API sans changer les appels métier principaux.

## 24.3 RÈGLE DE NON-RÉGRESSION

Les blocs précédemment validés par le fondateur restent considérés comme validés et
ne doivent pas être re-audités comme s'ils étaient nouveaux :

- Supabase production
- AUTH V2
- Matching
- Applications
- Notifications
- Recruiter
- Partner
- Google/Gmail Auth
- Vercel

WhatsApp/phone auth restent volontairement reportés.

## 24.4 VALIDATION TECHNIQUE — À FAIRE PAR LA PROCHAINE IA

Le code a été préparé mais **n'est pas déclaré BUILD VALIDÉ**.

Ordre obligatoire :

```bash
npm install
npm run typecheck
npm run build
```

Si `npm install` échoue avec une erreur réseau/DNS vers `registry.npmjs.org`,
ce n'est pas une erreur de code : il faut refaire l'installation dans un
environnement disposant d'un accès npm.

Ensuite seulement :
1. corriger les vraies erreurs TypeScript ;
2. relancer `npm run typecheck` jusqu'à 0 erreur ;
3. lancer `npm run build` jusqu'à succès ;
4. tester chaque feature sur mobile ;
5. passer les lignes correspondantes de 🔧 CODÉ à ✅ VALIDÉ E2E.

## 24.5 CE QUI EST RÉEL VS SIMULÉ

### MVP simulé
- OAuth Gmail côté navigateur
- import Gmail/Drive
- envoi d'email sortant
- détection de referral par email
- cron de relance

### Préparé pour V2 réelle
- Gmail API/OAuth réel
- Google Drive API réelle
- provider d'envoi email réel
- vraie détection referral
- vrai scheduler/cron
- WhatsApp Business API

**Ne jamais présenter un mock comme une intégration API production.**

## 24.6 PROCHAIN CHANTIER

Après validation technique des 8 features :

**P3 = Payment Core + Abonnements réels.**

Le Payment Core doit rester indépendant du prestataire de paiement afin que le
provider puisse être changé sans réécrire la logique métier.

## 24.7 GITHUB

Aucune écriture GitHub n'a été effectuée depuis cette session car aucun accès GitHub
en écriture n'est disponible ici. Une IA disposant de Git doit pousser les fichiers
mis à jour après vérification locale, sans inventer un push déjà effectué.

# 25. CHECKPOINT — JOBLY MOBILITY V2 — 13/09/2026

## Décision produit
Le fondateur a demandé d'intégrer Mobility V2 **avant P3 Payment Core**. Cette décision est prioritaire sur l'ancien ordre de chantier.

## Mobility V2 intégrée
- BottomNavTalent contextuel : Estimateur / Ma Demande / Suivi / Mon Pass.
- BottomNavPartner contextuel selon FINANCE / HOUSING / TRANSPORT.
- Le bottom nav global Jobly n'est pas utilisé dans les layouts Mobility contextuels.
- GPS et calcul Haversine pour les villes camerounaises de référence.
- Estimateur public temps réel via `/api/mobility/estimate`.
- Demande Talent en 4 étapes avec budget, logement, trajet GPS et préparation watermark CNI.
- Contrôle Premium côté serveur pour la création de demande.
- Suivi Mobility avec timeline 6 étapes et distance GPS.
- Pass Mobility avec QR et 3 usages.
- API garantie recruteur, validation partenaire, génération admin du Pass.
- Partner dashboard + espaces dossiers / financements / rapports.
- CRUD logements HOUSING avec coordonnées GPS.
- Export de rapport Mobility CSV/XLSX.
- Kanban Admin Mobility avec drag & drop.
- Création de PartnerExtended avec code unique `PART-TYPE-CITY-XXXX`.
- Pass public `/pass/[code]`.

## Dépendances ajoutées pour la V2
- `lucide-react`
- `leaflet`
- `react-leaflet`
- `sharp`
- `nanoid`
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `exceljs`
- `@types/leaflet`

## État de validation
🔧 **CODÉ — NON VALIDÉ BUILD/E2E**.
La validation doit être faite avec :
`npm install` → `npm run typecheck` → `npm run build`, puis parcours mobile et tests API.

## Point de vigilance
Le calcul GPS actuel est une estimation géographique Haversine entre centres de villes, pas une distance routière. Une future version peut brancher un routeur libre si nécessaire.

## Prochain chantier après validation Mobility
**P3 Payment Core + Abonnements réels**, avec architecture indépendante du provider.

# 26. SNAPSHOT DE FUSION GLOBALE — 13/09/2026 — 08:44 UTC

## Source de vérité appliquée

Cette livraison fusionne les sources fournies en respectant la hiérarchie de `Statut.md` :
1. décisions du fondateur les plus récentes ;
2. `Statut.md` ;
3. documentation ;
4. checkpoints ;
5. code.

Le ZIP `JOBLY-MOBILITY-V2-FINAL-CODE-13-09-2026.zip` constitue la **base technique principale** de la fusion car il contient les évolutions Mobility V2 et les 8 features virales. Les checkpoints P1/P2 identiques ont été dédupliqués. Les éléments visuels manquants du redesign historique ont été récupérés depuis `jobly-ecosystem-redesign-v2.0.zip` lorsqu'ils étaient encore référencés par le code.

### Résolution des divergences

- `output_redesign/` est conservé comme racine applicative.
- Les versions concurrentes de `Statut.md`, `README.md`, `package.json` et du Prisma schema sont résolues en faveur de la version la plus récente de la base Mobility/Features.
- `app/pwa-init.ts` historique n'est **pas** réintroduit : le code actuel utilise `components/PwaInit.tsx`, conformément à l'audit P0.
- Les assets suivants ont été réintégrés car nécessaires aux références de l'écran d'accueil/authentification :
  - `public/auth-hero-person-cutout.png`
  - `public/auth-hero-person.svg`
  - `public/femme-jobly.png`
  - `public/jobly-home-source-of-truth-reference.png`
  - `assets/ecosystem/bonsplans.jpg`
  - `assets/ecosystem/partner-22.jpg`
  - `assets/ecosystem/recruiter-40.jpg`
  - `assets/ecosystem/talent-20.jpg`

## Inventaire technique de la fusion

- **41 pages/routes** présentes dans `app/**/page.tsx`.
- **25 routes API** présentes dans `app/api/**/route.ts`.
- **4 migrations Prisma** présentes, dont `matching_applications_v1` et `recruiterjob_unification`.
- **4 scripts SQL Supabase** présents, dont `20260913080000_mobility_v2.sql`.
- Les 8 features virales P1/P2 sont présentes et restent **🔧 CODÉES — non validées E2E**.
- Mobility V2 est présente et reste **🔧 CODÉE — non validée BUILD/E2E**.
- Google/Gmail Auth reste **✅ VALIDÉ** selon la validation du fondateur.
- WhatsApp et Phone Auth restent **⏸️ REPORTÉS**.
- Payment Core / Abonnements / iClan restent **🔴 NON INTÉGRÉS**.

## Corrections de lecture par rapport aux sections historiques

La section 22 décrit certains écrans avant les features virales. Dans **cette fusion**, `/recruiter/candidatures` existe bien comme page intégrée et les services viraux sont présents. Cette présence ne vaut toutefois pas validation E2E.

Les mentions historiques « à faire » restent historiques lorsqu'elles précèdent une livraison plus récente. La dernière section du fichier fait foi pour le snapshot de cette fusion.

## Validation technique effectuée dans cet environnement

Tentative de :

```bash
npm install --no-audit --no-fund
```

Résultat : **timeout de l'installation des dépendances**. Aucun résultat de `typecheck` ou `build` ne peut donc être déclaré.

Par conséquent :

```text
npm install  → ⚠️ NON TERMINÉ / TIMEOUT
typecheck    → ⏸️ NON EXÉCUTÉ (dépendances non installées)
build        → ⏸️ NON EXÉCUTÉ
E2E mobile   → ⏸️ NON EXÉCUTÉ
```

**Règle appliquée : ne pas transformer un timeout d'installation en affirmation de bug code, et ne pas déclarer le build validé.**

## État global après fusion

```text
FOUNDATION / PWA       🟡 codé / validation technique à faire
GOOGLE AUTH            ✅ validé fondateur
PHONE AUTH             ⏸️ reporté
WHATSAPP AUTH          ⏸️ reporté
CAREER BRAIN           🧪 à poursuivre E2E
MATCHING               🔧 code présent / état de continuité fondateur
APPLICATIONS           🔧 code présent / état de continuité fondateur
RECRUITER              🔧 code présent / validation E2E à poursuivre
PARTNER                🔧 code présent / validation E2E à poursuivre
VIRAL P1/P2 (8)        🔧 codé / validation E2E à faire
MOBILITY V2            🔧 codé / validation BUILD + E2E à faire
SUBSCRIPTIONS          🔴 à intégrer
PAYMENT CORE           🔴 à intégrer
ICLAN                   🔴 non attaché
```

## Prochaine action obligatoire

**Validation technique de la fusion**, dans cet ordre :

```bash
npm install
npm run typecheck
npm run build
```

Puis E2E mobile ciblé :
1. Talent : Jobs → Candidatures → Career Brain → Mobility ;
2. Recruiter : Dashboard → Offres → Candidatures → ATS → Mobility ;
3. Partner : Dashboard → Profil → Paiement → Parrainage → Mobility ;
4. Admin Mobility ;
5. Pass public.

Une fois cette validation passée, le chantier suivant reste **P3 — Payment Core + Abonnements réels**, sauf nouvelle décision explicite du fondateur.

# 27. P2 — RECONFIGURATION DES OFFRES ET DU PRICING — 13/09/2026 (HISTORIQUE)

Cette section historique est remplacée par la décision verrouillée et l'implémentation P2/P3 de la section 28. Toute référence à l'ancien catalogue Free/Premium/Pro/Elite ne constitue plus la source de vérité.

# 28. P2/P3 — PRICING VALIDÉ + CONSTRUCTION BILLING — 13/09/2026

## Décision du fondateur — prix verrouillés

| Offre | Mensuel | Annuel |
|---|---:|---:|
| Free | 0 FCFA | 0 FCFA |
| Start | 1 800 FCFA | 5 000 FCFA |
| Premium | 3 500 FCFA | 15 500 FCFA |
| Pro | 5 000 FCFA | 25 800 FCFA |

## P2 livré

- Catalogue centralisé `lib/billingCatalog.ts`.
- Page `/abonnement`.
- `GET/POST/DELETE /api/subscription`.
- `GET /api/entitlements`.
- Inventaire après construction : 42 pages, 32 routes API, 5 migrations Prisma.
- Prix recalculés côté serveur ; le montant client n'est jamais source de vérité.
- Quotas IA : Free 5 / Start 30 / Premium 120 / Pro 300 crédits mensuels.
- Stockage : 25 / 100 / 250 / 500 MB.
- Architecture Lean & Scalable : cache, déterminisme avant IA, Push/Email avant SMS.
- Objectif coût variable ≤ 25 % du revenu net.

## P3 livré — Payment Core v1

- `GET/POST /api/payments`.
- `GET /api/payments/:id`.
- `POST /api/payments/:id/reconcile` (ADMIN/FINANCE).
- `POST /api/payments/:id/refund` (ADMIN/FINANCE).
- `POST /api/webhooks/iclan`.
- Machine d'état `CREATED → PENDING → SUCCESSFUL / FAILED → REFUNDED`.
- Idempotence persistée dans `IdempotencyKey`.
- Anti-rejeu persisté dans `PaymentWebhookEvent`.
- HMAC SHA-256 + timestamp pour le webhook iClan.
- Activation Premium uniquement après confirmation serveur vérifiée.
- Interface provider neutre + `MockPaymentProvider` + frontière `IClanProvider`.

## Restent volontairement non validés

- iClan production : non connecté/non testé.
- Google Play / Apple billing : non intégré.
- UAT réel Mobile Money : à faire.
- `npm install`, `typecheck`, `build`, E2E : à exécuter avec dépendances disponibles.


## P3 — Durcissement reconciliation — 13/09/2026
- Reconciliation admin/finance: transitions contrôlées, idempotence de statut, raison obligatoire pour FAILED, externalId conflict guard.
- Synchronisation Subscription selon SUCCESSFUL / FAILED / REFUNDED.
- AuditLog pour chaque rapprochement.
- UAT iClan et validation DB/build toujours à faire avant production.

# 29. P3 — ICLAN/EDUKLAN UAT BRANCHÉ — 13/09/2026

- Contrat UAT Eduklan intégré : token, make_payment, verify_payment.
- Méthodes : MTN MoMo / Orange Money.
- external_id Jobly unique et vérifié.
- Vérification serveur obligatoire avant activation.
- Credentials UAT : runtime-only, non committées.
- Validation réseau live impossible dans cet environnement : DNS sortant vers `test.api.eduklan.com` indisponible.
- Production iClan : non déclarée validée.


# 30. P3 — ICLAN UAT ADAPTER DURCI — 13/09/2026

- Après création iClan, le paiement Jobly passe explicitement `CREATED → PENDING` et conserve `externalId`.
- En cas d'échec provider avant confirmation, le paiement est marqué `FAILED` et la souscription `EXPIRED`; aucune activation fictive.
- La vérification iClan contrôle le montant XAF puis active la période mensuelle/annuelle correspondante.
- Token UAT : cache local serveur et renouvellement anticipé; reprise sur 401/403.
- Les secrets restent runtime-only.
- Test réseau réel non déclarable depuis cet environnement : résolution DNS externe indisponible.
- Interface `/abonnement` désormais prête pour le choix du numéro Mobile Money et MTN MoMo / Orange Money.
- Prochaine validation externe : exécuter un paiement UAT réel avec un numéro Mobile Money de test, puis vérifier `PENDING → SUCCESSFUL` et les entitlements.

# 31. P3 — UAT SMOKE + PRODUCTION CUTOVER PREP — 13/09/2026

- Ajout du smoke test CLI `npm run uat:iclan` (authentification uniquement) et `npm run uat:iclan:pay` (paiement explicite avec `ICLAN_UAT_PHONE` et `ICLAN_UAT_AMOUNT`).
- Le smoke test ne journalise ni le mot de passe ni le bearer token.
- Ajout de `P3-PRODUCTION-CUTOVER-CHECKLIST-13-09-2026.md`.
- Les critères de go-live couvrent UAT Mobile Money, sécurité provider, migrations, typecheck, build, E2E et absence de secrets dans les artefacts.
- L'UAT réseau n'est pas déclaré réussi dans cet environnement : résolution DNS externe indisponible.

# 32. P3.2 → P4 — CAREER OS + OPPORTUNITY INTELLIGENCE — 13/09/2026

## P3.2 — Career OS minimal livré dans le code
- `GET /api/career-os`.- Écran `/career-os`.
- Career Goals dérivés du Career Brain.
- Career Gap déterministe.- Career Roadmap / GPS minimal.
- Readiness calculé à partir des gaps réels.
- Next Best Action déterminée à partir du prochain blocage utile.

## P4 — Opportunity Intelligence V1 livré dans le code
- `GET/POST /api/opportunities`.
- Écran `/opportunities`.
- Opportunity Score explicable.
- Réutilisation du Matching V1 à 5 critères.
- Ajout d'un facteur de qualité/completude de l'offre, sans IA générative.
- Raisons lisibles du score.
- Feedback Loop `INTERESTED / NOT_RELEVANT / APPLIED` journalisée dans `AuditLog`.

## Applications
- Le parcours Candidatures V1 existant reste relié aux offres et aux nouvelles surfaces Opportunity Intelligence.
- Preuve, statuts candidat/recruteur et compteurs restent déterministes.
- Aucun bouton de candidature automatique ni résultat IA inventé.

## Validation honnête
- Contrôle structurel des nouveaux TS/TSX : OK.
- `typecheck`/`build` complets : NON CERTIFIÉS faute de dépendances npm disponibles dans cet environnement.
- Déploiement migration DB réel : NON CERTIFIÉ faute d'accès à la base réelle.
- UAT iClan réseau : toujours NON CERTIFIÉ depuis cet environnement.

## Prochaine étape selon l'ordre du statut
Après P4, la prochaine phase planifiée est **P5 — AI Career Agent** : Interview AI, Learning Intelligence, Application Copilot, Career Companion. Toute implémentation IA doit d'abord respecter la règle Free-First et son chiffrage de coût avant le code IA.

# 33. P5.0 — AI CAREER AGENT / FREE-FIRST FOUNDATION — 13/09/2026

## P5.0 préparé avant implémentation IA
- Modèle économique Free-First ajouté dans `P5-FREE-FIRST-AI-COST-MODEL-13-09-2026.md`.
- Budget interne maximal de référence : 1 XAF par crédit IA consommé; ce plafond est un garde-fou Jobly et non un tarif fournisseur.
- Quotas conservés : Free 5 / Start 30 / Premium 120 / Pro 300 crédits mensuels.
- Coûts opérationnels de référence : Interview 3 / Learning 2 / Application Copilot 2 / Career Companion 1 crédit.
- Guardrails codés dans `lib/aiEconomics.ts` : déterministe d'abord, cache avant recalcul, quota serveur, fallback déterministe, aucune candidature automatique.
- Architecture et séquence de livraison documentées dans `P5-ARCHITECTURE-DELIVERY-PLAN-13-09-2026.md`.

## P5.0 n'est pas encore P5 production
- Aucun provider IA de production n'est activé par ce checkpoint.
- Les tarifs réels fournisseur, modèles et limites de contexte restent à benchmarker.
- La migration de comptabilité d'usage sera créée après validation du contrat AI Gateway.
- Prochaine étape : **P5.1 — AI Gateway + usage accounting + provider adapter non-production**, puis Interview AI.

# 34. P5 — AI CAREER AGENT CONSTRUIT — 13/09/2026

## P5.1 → P5.5 livré dans une première version Free-First
- AI Gateway serveur unique : `lib/aiGateway.ts`.
- Quota serveur selon plan et comptabilité `AiUsage`.
- Request hash SHA-256 et audit `AuditLog`.
- Fallback déterministe activé par défaut; aucun provider IA externe de production n'est appelé par ce checkpoint.
- `POST /api/ai/[operation]` expose les quatre opérations contrôlées.
- Interview AI : `/ai/interview`.
- Learning Intelligence : `/ai/learning`.
- Application Copilot : `/ai/application`.
- Career Companion : `/ai/companion`.
- Règle ferme : l'IA prépare, l'utilisateur soumet.
- Migration `20260913120000_p5_ai_usage` ajoutée pour la comptabilité d'usage.

## P5.6 — validation restante
- benchmark fournisseur réel et coût réel par opération;
- provider externe non-production;
- tests quota/abus/concurrence;
- minimisation PII et tests contexte/prompt;
- `npm install`, `typecheck`, `build`, migrations réelles et E2E.

## Prochaine étape
Selon la séquence du statut : **P5.6 — Evaluation + benchmark coût + E2E**, puis phase suivante du produit après validation.


# 35. P5.6 — QUOTA ATOMIQUE + PII MINIMIZATION — 13/09/2026

## Correctif quota atomique — CODÉ
Le premier contrôle P5 faisait `SELECT SUM(AiUsage)` puis `INSERT`. Ce pattern était vulnérable à une race condition : deux requêtes concurrentes pouvaient lire le même quota disponible puis toutes deux consommer des crédits.

Correction livrée :
- nouvelle fonction PostgreSQL `public.reserve_ai_credit(...)` ;
- verrou transactionnel `pg_advisory_xact_lock(hashtextextended(userId, 0))` par utilisateur ;
- calcul du quota + insertion `AiUsage` dans la même transaction ;
- idempotence par `userId + requestHash` ;
- index unique `AiUsage_userId_requestHash_key` ;
- le gateway récupère désormais `remaining_credits` depuis la réservation atomique.

## PII / contexte IA — CODÉ
- whitelist des champs d'entrée par opération ;
- limitation de taille des textes ;
- masquage des emails et numéros de téléphone ;
- nettoyage des champs profil/expérience utilisés par le contexte IA ;
- aucun provider IA externe de production n'est encore activé.

## Audit restant
- migration réelle Supabase : ⏳
- test concurrence quota réel : ⏳
- `npm install` + `typecheck` + `build` : ⏳
- benchmark provider/coût réel : ⏳
- E2E mobile des 4 parcours IA : ⏳

## Checkpoint
**P5.6 — sécurité économique et minimisation PII : CORRECTION CODÉE, VALIDATION RÉELLE EN ATTENTE.**

## Prochaine action
Appliquer la migration `20260913140000_p5_6_atomic_ai_quota`, puis lancer le test de concurrence quota et le build complet.

### Mise à jour — 13/09/2026 — Correctif build Vercel `CameroonCityKey`

**Blocage rencontré :** le build Vercel échouait pendant le contrôle TypeScript sur `app/api/mobility/estimate/route.ts` avec :
`Module "../../../../lib/gps" declares 'CameroonCityKey' locally, but it is not exported.`

**Cause racine :** `lib/gps.ts` importait `CameroonCityKey` depuis `lib/cities.ts`, mais ne le ré-exportait pas. La route d'estimation mobilité l'importait pourtant depuis `lib/gps.ts`.

**Correctif appliqué :**
- Ajout de `export type { CameroonCityKey };` dans `lib/gps.ts`.
- Aucune suppression ou réécriture de la logique GPS/mobilité existante.
- `CAMEROON_CITIES`, `haversineKm` et `calculateMobilityCosts` sont conservés.
- `lib/cities.ts` reste la source du type `CameroonCityKey`.
- La route `app/api/mobility/estimate/route.ts` reste inchangée.

**État :**
- CODED : ✅
- Correctif TypeScript : ✅ appliqué dans le ZIP de référence
- Build Vercel : ⏳ à revalider après push du fichier corrigé
- DÉPLOYÉ : ⏳ non confirmé

**Checkpoint Vercel :** l'avertissement `npm warn allow-scripts` n'est pas la cause du build failure actuel. Le blocage est exclusivement l'export TypeScript de `CameroonCityKey`.


### Mise à jour — 13/09/2026 — Correctif build Vercel `Profile.targetRoles`

**Blocage rencontré :** après correction de `CameroonCityKey`, Vercel échoue dans `app/api/opportunities/route.ts` avec `Property 'targetRoles' does not exist on type '{}'`.

**Cause racine :** le résultat Supabase de `Profile.maybeSingle()` n'est pas suffisamment typé dans ce contexte TypeScript ; `p.data || {}` est donc inféré comme `{}`, empêchant l'accès aux propriétés du profil.

**Correctif appliqué :** typage local explicite `ProfileRow` pour `targetRoles`, `targetCities`, `contractPreferences`, `remotePreference` et `preferredSectors`, puis lecture via `p.data ?? {}`.

**Principe :** correction minimale, sans changement de logique de matching ni suppression de fonctionnalité.

**État :** CODED ✅ — build Vercel à revalider ⏳


### Mise à jour — 13/09/2026 — Correctif build Vercel `payments/[id]/verify` params Promise

**Blocage rencontré :** `app/api/payments/[id]/verify/route.ts` utilisait `params.id` alors que Next.js 15 fournit `params` comme `Promise<{ id: string }>`.

**Erreur Vercel :** `Property 'id' does not exist on type 'Promise<{ id: string; }>'`.

**Correctif appliqué :** résolution explicite de `params` avec `const { id } = await params`, puis utilisation de `id` dans la requête Payment. Aucun changement métier du flux de vérification ou des transitions de paiement.

**État :** CODED ✅ — build Vercel à revalider ⏳


### Mise à jour — 13/09/2026 — Correctif build Vercel `Career Brain / ScoreRing`

**Blocage rencontré :** Vercel échoue dans `app/career-brain/page.tsx` avec `Type 'number' is not assignable to type '"sm" | "md" | "lg" | undefined'` sur `<ScoreRing value={score} size={60} />`.

**Cause racine :** le composant `components/ScoreRing.tsx` avait été typé avec `size` limité aux chaînes `sm | md | lg` et uniquement une prop `score`, alors que des écrans existants utilisent aussi `value` et des tailles numériques (`60`, `76`).

**Correctif appliqué :**
- `ScoreRing` accepte désormais `size` sous forme de preset (`sm | md | lg`) **ou** de taille numérique en pixels.
- `ScoreRing` accepte `score` ou `value`, avec conservation du comportement existant.
- Les tailles numériques calculent automatiquement les dimensions et tailles de texte proportionnelles.
- Aucune logique métier du Career Score n'est modifiée.

**État :** CODED ✅ — build Vercel à revalider ⏳


### Mise à jour — 13/09/2026 — Correctif build Vercel `RecruiterATS` / typage candidatures

**Blocage rencontré :** Vercel échoue dans `app/recruiter/page.tsx` sur `<RecruiterATS applications={applications}>` avec `ReceivedApplication[]` incompatible avec `Application[]`.

**Cause racine :** `app/recruiter/page.tsx` maintenait un type local `ReceivedApplication` trop pauvre (`id`, `recruiterJobId`, `status`, `viewedAt`), tandis que `components/RecruiterATS.tsx` exigeait un contrat plus complet (`jobTitle`, `statusSource`, `proofUrl`, `interviewAt`, `createdAt`, `updatedAt`). Le même contrat était également dupliqué dans `app/recruiter/ats/page.tsx`, créant un risque de dérive.

**Correctif appliqué :**
- `components/RecruiterATS.tsx` expose désormais `RecruiterATSApplication` comme type partagé.
- `app/recruiter/page.tsx` utilise directement ce contrat pour son state `applications`.
- `app/recruiter/ats/page.tsx` utilise le même contrat partagé.
- Les types dupliqués sur ces deux écrans sont supprimés.
- Aucun changement de logique ATS, de statut, de drag-and-drop ou d'API.

**Diagnostic global de `app/recruiter/page.tsx` :**
- **Bloquant build :** contrat TypeScript incompatible avec `RecruiterATS` → corrigé.
- **Architecture :** le type candidature était dupliqué et incohérent entre les écrans → centralisé au niveau du composant ATS.
- **API :** `/api/recruiter/applications` renvoie bien les champs requis par l'ATS (`jobTitle`, `statusSource`, `proofUrl`, `viewedAt`, `interviewAt`, etc.) → cohérent avec le nouveau contrat.
- **UX / donnée :** les compteurs `+3 cette semaine` et `+12 depuis hier` sont actuellement des textes statiques et ne doivent pas être présentés comme des métriques réelles. À corriger dans un prochain checkpoint si ces chiffres doivent devenir dynamiques.
- **Gestion d'erreur :** une erreur sur `/api/recruiter/applications` est actuellement ignorée pour préserver le chargement du dashboard. Cela mérite une amélioration UX dédiée, mais ne bloque pas le build.
- **Comportement métier à surveiller :** le GET `/api/recruiter/applications` marque automatiquement `SUBMITTED → ACKNOWLEDGED` lorsqu'il est consulté. C'est documenté dans l'API et cohérent avec la spec actuelle, mais cela signifie qu'un simple chargement du dashboard peut faire évoluer le pipeline. À valider fonctionnellement avant production.

**État :** CODED ✅ — build Vercel à revalider ⏳


### Mise à jour — 13/09/2026 — Correctif build Vercel `RecruiterATS` / Drag & Drop

**Blocage rencontré :** Vercel échouait dans `components/RecruiterATS.tsx:172` sur `onDragStart`, car le bouton HTML déclenche un `DragEvent<HTMLButtonElement>` alors que `handleDragStart` attendait `DragEvent<HTMLDivElement>`.

**Cause racine :** le gestionnaire de drag était typé pour un `div`, mais il est attaché à un `<button draggable>`. TypeScript refuse correctement cette incompatibilité DOM.

**Correctif V8 :** signature de `handleDragStart` alignée sur `React.DragEvent<HTMLButtonElement>`. Aucun changement de logique ATS, de statut, de drag & drop, d'API ou d'interface.

**Diagnostic global ciblé :** recherche effectuée dans les fichiers TypeScript/TSX pour les usages `handleDragStart` / `onDragStart`. Un seul couple gestionnaire/appel a été trouvé dans `RecruiterATS.tsx`; aucun autre appel similaire à corriger dans le projet inspecté.

**État :** 🔧 CORRIGÉ — validation Vercel à faire.


### Mise à jour — 14/09/2026 — Session Claude (chat) : bug session signup + onboarding "Duolingo/TikTok"

**Bug corrigé (bloquant) :** `completeSignupProfile()` dans `lib/auth.ts` n'envoyait jamais le token
de la session Supabase créée par `verifyEmailOtp()` — le serveur (`getAuthUser`) ne voyait donc
jamais d'utilisateur connecté et répondait "Session requise après vérification de l'e-mail." même
juste après un OTP validé avec succès. Corrigé en récupérant `auth.getSession()` côté client et en
l'attachant en `Authorization: Bearer <token>` sur l'appel à `/api/auth/complete-signup`.

**Nouveautés (page "Créer ton Identité Jobly", ex-"Finalise ton compte") :**
- Nouvel endpoint `GET /api/auth/username/check` : disponibilité en direct, normalisée
  `trim()+toLowerCase()` (donc "Kenzi"/"KENZI"/" kenzi " = même username), comparaison `ilike`
  côté base. Format resserré à 3-15 caractères (lettres, chiffres, `_`, `.` — plus de tiret), aligné
  partout (page d'accueil + route + message d'erreur login).
- Champ username : vérification débouncée (420ms) pendant la saisie, coche bleue canari `#214BFF`
  dans l'input si disponible, message rouge canari `#FF2D2D` "Username indisponible" si pris, texte
  d'aide sur le format toujours visible sous le champ.
- Jauge de force du mot de passe (`PasswordStrengthGauge`) avec la palette Canari demandée :
  Rouge `#FF2D2D` (Faible, rejeté) → Orange `#FF7900` (Moyen, rejeté) → Jaune `#FFDE00` (Bon,
  accepté) → Bleu `#214BFF` (Fort) → dégradé Vert lime `#10B981`/Violet `#8B5CF6` (Excellent, avec
  petite animation ✨). Le bouton reste désactivé tant que le mot de passe n'atteint pas "Bon" ou que
  le username n'est pas confirmé disponible.
- Bouton renommé "Commencer →" et enchaîne maintenant sur un nouveau parcours au lieu d'aller
  directement sur `/ecosystem` :
  1. **Journey 5 pages** (nouvel écran `journey`) : Offres → Career AI → Mon CV → Matching →
     Écosystème, avec bouton "Passer" (gris, en haut) et "Suivant"/"C'est parti →" (bleu canari, en
     bas) + 5 points de progression.
  2. **Écran J'IA** (nouvel écran `jia-welcome`, plein écran, fond navy `#101D42`) : la goutte holographique de J'IA
     respire au centre, le texte apparaît phrase par phrase ("Bienvenue sur Jobly, {username}…" →
     "Je suis J'IA," → "Je serai à ton service tout au long de ta carrière."), puis redirection
     automatique vers `/ecosystem` après ~4,3s.
- Vérifié : `/ecosystem` route déjà directement vers les dashboards de chaque profil sans forcer de
  choix de forfait au préalable — le flow "Freemium d'abord, paywall seulement à l'usage" demandé
  était donc déjà en place côté routing ; rien à changer sur ce point précis dans cette session
  (le déclenchement du paywall *pendant* l'usage du dashboard, lui, n'a pas été vérifié/ajouté ici).

**Non vérifié / à surveiller :** aucun accès réseau dans cet environnement, donc ni `npm run build`
ni test manuel sur device. Le pattern de gestion du bouton retour déjà en place sur cette page
(`goTo`/`goBack` + pile d'historique + listener `popstate`) n'a pas été touché ; les deux nouveaux
écrans (`journey`, `jia-welcome`) héritent de ce même mécanisme puisqu'ils utilisent `goTo()`.

**État :** CODÉ ✅ — build Vercel à revalider ⏳

## 15/09/2026 (suite) — Cause racine "Crée ton accès Jobly" trouvée : colonnes DB manquantes

**Bug corrigé (bloquant, racine réelle) :** le code de `/api/auth/username/check` et
`/api/auth/complete-signup` lit/écrit `User.username`, `User.firstName`, `User.lastName`,
`User.country`, `User.privacyAcceptedAt` et `Profile.firstName`, `Profile.lastName`, `Profile.phone`,
`Profile.country` depuis leur création, mais ni le schéma Prisma ni aucune migration ne créaient ces
colonnes en base. Conséquence en production : `column User.username does not exist` (ou équivalent
Profile) à chaque appel → le check de disponibilité du username échouait systématiquement en silence
(`checkUsernameAvailable` catchée par le `try/catch` du composant → statut retombe sur "idle" → jamais
de coche bleue, jamais de message "déjà pris") et la finalisation d'inscription renvoyait "Impossible
de finaliser le compte." / erreur de connexion.

**Corrigé :**
- `packages/database/prisma/schema.prisma` : ajout des champs manquants sur `User` (`username`,
  `firstName`, `lastName`, `country`, `privacyAcceptedAt`) et `Profile` (`firstName`, `lastName`,
  `phone`, `country`), alignés avec ce que l'API attend déjà.
- Nouvelle migration `packages/database/prisma/migrations/20260915150000_user_profile_signup_columns/migration.sql`
  (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, contrainte unique sur `username`, `NOTIFY pgrst, 'reload schema'`).

**Page de connexion :** marges latérales réduites (`container w-[92%] max-w-[440px] mx-auto px-4`,
tous les champs/boutons en `w-full`) dans `app/page.tsx`, écran `login`.

**Non vérifié / à surveiller :** aucun accès réseau dans cet environnement, donc la migration n'a PAS
été appliquée sur Supabase depuis ici — elle doit être exécutée manuellement (SQL Editor Supabase, ou
`npx prisma migrate deploy` depuis un poste avec accès à la base) avant que la création de compte ne
fonctionne en production. Tant que ces colonnes n'existent pas réellement en base, le bug persistera
même avec ce code à jour.

**État :** CODÉ ✅ — migration SQL à exécuter sur Supabase ⏳ (bloquant tant que non fait) — build Vercel
à revalider ⏳

## 16/09/2026 — Correctif Vercel : exclusion des Supabase Edge Functions du typecheck Next.js

**Blocage Vercel :** le build compilait correctement puis échouait pendant le contrôle TypeScript sur
`supabase/functions/ai-core/index.ts` avec `Cannot find module 'https://esm.sh/@supabase/supabase-js@2'`.

**Cause racine :** `ai-core/index.ts` est une **Supabase Edge Function exécutée avec Deno**. Son import
HTTP `https://esm.sh/...` est valide dans l'environnement Deno/Supabase, mais le `tsconfig.json` utilisé
par le projet Next.js incluait `**/*.ts` et demandait donc à TypeScript/Next de vérifier cette fonction
comme du code Node/Next. TypeScript ne résout pas cet import HTTP.

**Correctif appliqué :**
- `tsconfig.json` du projet `jobly/` : ajout de `supabase/functions/**` dans `exclude`.
- Le `tsconfig.json` racine est également maintenu aligné avec cette exclusion.
- **Aucun changement** dans la logique de `ai-core`, les APIs IA, Supabase ou le frontend.
- Le warning Vercel `npm warn allow-scripts` concernant Prisma/sharp n'est **pas** la cause de cet échec.

**Validation :** correctif statique vérifié dans le package livré. Le build Vercel doit maintenant être
relancé pour confirmer la compilation complète dans l'environnement réel.

**État :** 🔧 CORRIGÉ — 🟡 BUILD VERCEL À REVALIDER — ⏳ PUSH GITHUB À EFFECTUER DEPUIS UN ENVIRONNEMENT AUTHENTIFIÉ.


## CHECKPOINT 16/09/2026 — HARDENING V4 / AUDIT COMPLET

### Correctifs livrés dans le ZIP V4
- Suppression du doublon de projet `/jobly/` : la racine est désormais l'unique source de build Vercel.
- `tsconfig.json` racine : exclusion explicite de `jobly/**` et `supabase/functions/**` pour séparer Next.js du runtime Deno/Supabase Edge.
- Ajout de `.gitignore` de production pour secrets, builds et dépendances locales.
- Centralisation des URLs publiques dans `lib/site.ts` avec `NEXT_PUBLIC_JOBLY_PUBLIC_URL` configurable.
- Ajout de la route publique `/jobs/[id]?source=discovery|recruiter` et de `/api/jobs/[id]` : les liens viraux ne pointent plus vers une route inexistante.
- Les cartes d'offres ouvrent maintenant le détail avant candidature.
- Ajout de `/join?ref=...` comme point d'entrée valide du programme Partner.
- Les 4 briques J'IA (`interview`, `learning`, `companion`, `application`) sont désormais accessibles depuis le dashboard Talent et disposent d'un header/retour/navigation.
- `/recruiter/onboarding` et `/recruiter/mobility` sont accessibles depuis le dashboard Recruiter.
- Création d'un hub `/admin` pour les outils Mobility et Partner.
- `/talent/cvs` indique explicitement que la persistance est actuellement locale au navigateur.
- Les liens de partage et QR publics utilisent désormais la même constante de domaine.

### Contrôle post-correctif
- Le dossier dupliqué `/jobly/` est absent du livrable.
- Les références applicatives directes à `jobly.cm` / `jobly.app` hors `lib/site.ts` ont été supprimées.
- Les 2 anciennes cibles mortes `/jobs/{id}` et `/join` possèdent maintenant une route réelle.
- Le build Next ne doit plus inclure les Edge Functions Deno.
- Limitation : aucun `npm install`/`next build` local complet n'a pu être exécuté dans l'environnement d'audit faute de cache/réseau npm. Le ZIP est prêt pour la validation Vercel, qui reste le contrôle de compilation final.


## ÉTAT COURANT — CHECKPOINT HARDENING V4 (16/09/2026)

Ce bloc prévaut pour l'état courant; les sections historiques antérieures restent inchangées.

- **Build Vercel / TypeScript :** correctif structurel appliqué. La racine Next.js exclut `jobly/**` et les Edge Functions `supabase/functions/**`.
- **Architecture dépôt :** `/jobly/` dupliqué retiré du livrable courant; `packages/database/prisma/schema.prisma` est l'unique schéma Prisma livré.
- **Navigation J'IA :** les quatre écrans `INTERVIEW`, `LEARNING`, `CAREER_COMPANION`, `APPLICATION_COPILOT` sont accessibles depuis le dashboard Talent et disposent d'un retour/navigation.
- **Offres :** détail public `/jobs/[id]?source=...` + API read-only active ajoutés; les cartes Talent ouvrent désormais le détail avant candidature.
- **Partage :** URLs d'offre, QR Mobility et parrainage utilisent `lib/site.ts`; `/join` existe réellement.
- **Recruiter :** onboarding et Mobility disposent d'un point d'entrée depuis le dashboard.
- **Admin :** hub `/admin` ajouté avec contrôle de rôle côté client; les opérations restent protégées côté API.
- **CV Talent :** la persistance locale est explicitement présentée comme temporaire/non synchronisée.
- **Sécurité dépôt :** `.gitignore` ajouté pour secrets/builds/dépendances locales.
- **Lockfile :** non ajouté dans cet environnement car le registre npm n'est pas accessible; ne pas considérer la reproductibilité des dépendances comme totalement verrouillée tant qu'un `package-lock.json` n'est pas généré et commité depuis un environnement réseau.

### Vérification post-correctif
- 0 route interne morte détectée par scan des destinations littérales.
- 0 import `https://esm.sh/...` détecté dans `app/`, `components/`, `lib/` ou `packages/`.
- 0 dossier `/jobly/` dupliqué dans le livrable.
- 1 seul `schema.prisma` livré.
- Aucun secret évident en clair détecté lors du contrôle statique.
- `next build` complet non exécuté localement faute de `node_modules` et d'accès npm; validation Vercel obligatoire pour la compilation finale.

---

## CHECKPOINT 16/09/2026 — TALENT CANARY UI V7

Direction visuelle Talent appliquée à l'ensemble du parcours Talent : blanc + bleu JOBLY + jaune canari, avec fond animé bleu/jaune type fumée conservé. Dashboard refondu selon la maquette de référence, et harmonisation étendue aux offres, candidatures, Career Brain, Career OS, Opportunity Intelligence, profil, CV, J'IA et Mobility Talent. Aucun changement de logique métier/API volontaire.

Audit associé : `AUDIT-TALENT-CANARY-V7-16-09-2026.md`.


## Checkpoint 16/09/2026 — TALENT CANARY V7.1
- Direction visuelle Talent harmonisée sur blanc + bleu JOBLY + jaune canari + navy/neutres.
- Les fonds photo du parcours Talent ont été retirés : le dashboard utilise désormais une composition graphique abstraite canari/bleu.
- Les animations de fond « fumée » Talent sont conservées.
- Authentification et page de choix de l’écosystème volontairement inchangées.
- Recruiter et Partner volontairement inchangés.


## Checkpoint 16/09/2026 — TALENT CANARY V7.2
- Design de référence Talent étendu aux surfaces offres, candidatures, Career Brain, Career OS, opportunités, CV/profil et Mobility Talent.
- Suppression du visuel photo du hero du dashboard Talent : écran désormais construit avec formes abstraites bleu + jaune canari.
- Les animations « fumée » bleu/jaune du fond Talent sont conservées.
- Authentification, page de choix de l’écosystème, Recruiter et Partner non modifiés.

## 2026-09-16 — V7.3 Opportunity Aggregator + PUB AUTO CASCADE
- Ajout d'une couche d'agrégation d'opportunités Talent : emplois, stages et formations externes.
- Ajout de `/api/opportunity-cascade` avec scoring `Prestige 50% + Match profil 50%`.
- Sources formation : recommandations externes existantes (`CourseRecommendation`) + intégration publique freeCodeCamp; les connecteurs nécessitant une authentification restent configurables côté serveur.
- Ajout du composant `OpportunityCascade` exactement entre le compteur d'offres et la liste des offres.
- Auto-cascade 10 opportunités max, 5 secondes par tour, 3 phases visuelles, 8 transitions aléatoires sans répétition consécutive, pause souris/tactile, swipe et flèches, reprise 5 secondes après navigation manuelle.
- Les liens externes restent des liens vers la source originale; aucun contenu de formation externe n'est copié dans JOBLY.
- Sources externes explicitement allowlistées dans `lib/externalTrainingSources.ts`; aucun scraping arbitraire n'est activé. Microsoft Learn est préparé mais reste désactivé tant que son authentification serveur n'est pas configurée. La documentation Microsoft confirme que son API de plateforme est gratuite mais authentifiée; freeCodeCamp expose actuellement une API GraphQL publique de métadonnées de curriculum. 


## CHECKPOINT 16/09/2026 — AUDIT E2E CONTINUITÉ + ONG
- Audit statique V7.3 effectué sur les routes/pages TypeScript/TSX.
- 55 pages/routes détectées et 149 fichiers TS/TSX inspectables.
- 0 destination interne littérale orpheline détectée sur les href/router analysés ; 0 `href="#"`.
- Les écrans Partner Profil et Paiement qui indiquaient « à venir » ont été rendus fonctionnels avec les APIs Partner existantes.
- Ajout de `lib/ngoOpportunitySources.ts` et affichage de 10 portails ONG/international dans Opportunity Intelligence : ReliefWeb, UNjobs, Impactpool, Idealist, Devex, DevNetJobs, UNjobs Cameroun, UN Careers, UNDP Careers, UNICEF Careers.
- Les liens ONG ouvrent les sources originales ; JOBLY ne copie pas leur contenu.
- Rapport complet : `AUDIT-E2E-CONTINUITE-16-09-2026.md`.
- P1 restant : validation runtime Supabase/Vercel, détail exact des cartes Opportunity Intelligence, tests de rôles et E2E mobile.
- **État :** P0 corrigés dans le livrable audit-patched ; build/runtime final à valider dans Vercel/Supabase.

## CHECKPOINT 16/09/2026 — AUDIT E2E P1 + FERMETURE DES PARCOURS
- Passe P1 réalisée sur la base du livrable V7.3 audit-patched.
- Le faux écran `/recruiter/jobs/new` a été supprimé au profit du vrai formulaire de création partagé avec l'édition `/recruiter/jobs/[id]`.
- Les métriques Recruiter `+3 cette semaine` / `+12 depuis hier` sont désormais calculées à partir des données chargées.
- La mention fictive « Profil entreprise vérifié – Orange Cameroun » a été remplacée par des contrôles génériques réellement vérifiables côté UI.
- Le claim « GPS Actif » du dashboard Mobility Partner a été remplacé par un état « Rapports à jour ».
- Le layout Mobility Partner transmet désormais le bearer token Supabase à `/api/mobility/partner/me`.
- Corrections TypeScript ciblées : `typeof JIA_NAME`, typage des entreprises Opportunity Aggregator et compatibilité fetch standard.
- Scan de navigation : 55 pages, 42 APIs, 0 `href="#"`, 0 destination interne littérale orpheline détectée.
- Rapport : `AUDIT-E2E-P1-16-09-2026.md`.
- Limite : le runtime Vercel/Supabase n'est pas exécuté dans cet environnement ; `npm ci/typecheck/build` restent à valider sur environnement avec dépendances et secrets configurés.

## CHECKPOINT 16/09/2026 — FUSION ROADMAP / FERMETURE DES SURFACES RESTANTES

À la demande du fondateur, la feuille de route, la vision Career Operating System et les surfaces existantes ont été recroisées afin de privilégier la fermeture du produit plutôt que l'ouverture de nouveaux chantiers isolés.

### Livré dans ce checkpoint
- Création et connexion de `/career-gps` vers Career OS.
- Création et connexion de `/career-gap` vers les écarts déterministes de Career OS.
- Création et connexion de `/readiness` vers le score de préparation existant.
- Création et connexion de `/opportunity-radar` vers Opportunity Intelligence.
- Création et connexion de `/market-intelligence` avec une V1 honnête basée uniquement sur les données disponibles dans Jobly (aucun chiffre externe inventé).
- Création de `/campus`, `/communities` et `/events` comme surfaces de parcours reliées aux fonctions existantes, sans prétendre disposer encore de backends spécialisés complets.
- Création de `/jobly-id` avec QR portable ; le QR ne contient pas de données sensibles et pointe vers le parcours de parrainage/public existant.
- Ajout d'un bloc Career Intelligence au dashboard Talent donnant accès direct à GPS, Gap, Radar et Jobly ID.
- Ajout de raccourcis correspondants dans Career OS.
- Ajout de raccourcis Mobility et Opportunités dans Bon Plan.

### Arbitrage de fin de projet
Les fonctionnalités documentées mais nécessitant encore une plateforme métier complète (communautés persistantes, catalogue d'événements, intelligence marché externe, Campus spécialisé) disposent maintenant d'une porte d'entrée fonctionnelle et explicite. Elles ne sont pas déclarées « production-complete » tant qu'un backend dédié n'est pas branché.

### État
🔧 CODÉ — navigation fermée et surfaces connectées.
🧪 VALIDATION BUILD/E2E Vercel-Supabase encore requise.

### Prochaine priorité
Ne plus multiplier les pages. Passer en mode **stabilisation finale** : build Vercel, typecheck, validation Supabase, tests des parcours critiques et correction des seuls blocages réellement observés.

## CHECKPOINT 16/09/2026 — FINALISATION TALENT / CAREER / SETTINGS / GMAIL / E2E
- Module Talent CV renforcé : import PDF/DOCX/TXT, création/édition d'un CV Jobly, score ATS déterministe, sauvegarde de versions et impression navigateur / Enregistrer en PDF.
- Nouveau parcours `/talent/settings` avec préférences, sécurité/confidentialité et déconnexion globale Jobly.
- Nouveau parcours `/partner/settings` avec paramètres communs et déconnexion globale Jobly.
- Paramètres Recruiter existants conservés et complétés par un accès depuis le profil.
- Connexion Gmail Recruiter : passage du faux branchement local à une initiation Google OAuth avec scopes Gmail readonly/send. L'accès réel aux messages reste conditionné à la configuration Google Cloud/Supabase et à la validation des scopes.
- Career OS, GPS, Gap, Readiness, Radar et Market Intelligence restent reliés au `/api/career-os` / Opportunity Intelligence existants ; aucun backend spécialisé fictif n'est déclaré comme production-complete.
- Audit statique final relancé après modifications : routes et destinations internes à contrôler avant livraison Vercel.
- Limite : `node_modules` absent dans le livrable source ; le build Next.js/Vercel ne peut pas être certifié localement sans installation des dépendances et secrets/runtime Supabase.

## CHECKPOINT 16/09/2026 — LIVRABLE VERCEL PRÉPARÉ
- Route inventory après finalisation : 66 pages Next.js détectées.
- Scan statique des références internes exécuté : 0 `href="#"`; les références internes littérales analysées ne présentent pas de destination orpheline.
- Le typecheck local n'est pas certifiable car `node_modules` et `package-lock.json` ne sont pas présents dans ce ZIP ; `tsc` global remonte donc uniquement des modules React/Next manquants liés à l'environnement, pas une validation de build.
- Un ZIP Vercel est généré à partir de cette version source ; validation finale Vercel/Supabase obligatoire après configuration des variables d'environnement et de Google OAuth/Gmail.

## CHECKPOINT 16/09/2026 — CORRECTIF BUILD VERCEL opportunityAggregator

- **Blocage Vercel observé à 05:24:** `lib/opportunityAggregator.ts:111` — `profileRes.data` était inféré comme `{}`, ce qui provoquait `Property 'targetRoles' does not exist on type '{}'`.
- **Correctif appliqué:** typage explicite de la ligne Profile via `ProfileRow = Partial<Record<keyof Profile, unknown>>` avant lecture de `targetRoles`, `targetCities`, `contractPreferences`, `remotePreference` et `preferredSectors`.
- **Renforcement associé:** typage explicite de la ligne Company dans le `map` pour éviter une inférence `any` dépendante du client Supabase non généré localement.
- **Cause confirmée:** erreur TypeScript de typage Supabase, pas une erreur de logique de matching.
- **Contexte Vercel:** compilation Next.js réussie (`Compiled successfully`), échec uniquement pendant le typecheck sur cette erreur.
- **Validation locale:** impossible de reproduire un `next build` complet dans l'environnement d'audit faute de dépendances installées et de registre npm accessible ; Vercel reste la validation finale.
- **Action suivante:** relancer le déploiement Vercel. Si un nouveau type error apparaît, corriger le prochain blocage jusqu'au `Build Completed`.

## CHECKPOINT 16/09/2026 — JOURNEY : NAVIGATION PAR GESTE TACTILE
- Le parcours `/?screen=journey` accepte désormais le balayage horizontal sur mobile.
- Swipe gauche : passe à la slide suivante ; depuis la dernière slide, ouvre J'IA.
- Swipe droite : revient à la slide précédente ; aucun dépassement avant la première slide.
- Seuil anti-faux-positifs : mouvement horizontal >= 55 px et nettement supérieur au mouvement vertical ; la vitesse ou une distance plus longue confirme le geste.
- `touchAction: pan-y` conserve le défilement vertical natif.
- Le bouton `Suivant →` reste disponible pour l'accessibilité et les utilisateurs qui préfèrent le clic.
- Indication visuelle discrète ajoutée : « Glisse vers la gauche pour continuer · vers la droite pour revenir ».
- Validation statique du fichier `app/page.tsx` effectuée après modification.

## 2026-09-16 — Dashboard Talent : données réelles + design plein écran
- Le dashboard Talent a été réaligné sur la maquette comme **référence UX uniquement** : aucun chiffre, employeur ou offre de démonstration n'est utilisé comme donnée métier.
- Les offres recommandées proviennent désormais de `/api/jobs` et affichent le `title`, `company`, `location`, `contract`, `remoteMode` et `matchPercent` réellement retournés par le backend.
- Le compteur d'offres provient de `totalActive` de `/api/jobs` ; le nombre de candidatures provient de `/api/applications`.
- Le score affiché sur le dashboard est explicitement **Profil complété** et calculé depuis les données du Talent, et non présenté comme un faux « match global ».
- Le dashboard ne charge plus `TalentBackground` : fond blanc plein écran, sans décor flottant derrière le contenu.
- Palette rendue plus vive : bleu JOBLY renforcé et jaune canari plus franc, avec contrastes et bordures plus visibles.
- La photo de profil réelle (`profilePhotoUrl`) est utilisée dans le header et dans le bloc profil du dashboard ; sinon l'initiale du Talent est affichée.
- La recherche du dashboard est maintenant un vrai champ et ouvre `/jobs?q=...`.
- Les cartes recommandées ouvrent le détail `/jobs/[id]?source=...` au lieu d'une liste générique.
- Les états vides restent accessibles : une absence de données n'empêche pas l'accès aux fonctionnalités.
- Checkpoint : **CODÉ → à valider par build Vercel + test mobile réel**.


## CHECKPOINT 16/09/2026 — V15 + Ecosystem no-scroll
- V15 Cascade corrigée : 4 secondes exactes (1s/1s/2s), 10 positions, anti-répétition des transitions, filtrage EMPLOI/STAGE avant top 10, emplacement après compteur/filtres, fond #FFFBE6, navigation swipe/flèches/dots et ouverture d'offre via alias `/offre/[id]`.
- Les données de cascade proviennent uniquement d'offres identifiables : aucune formation ne peut entrer dans la publicité emploi/stage et les annonces discovery sans URL source ou employeur identifiable sont exclues.
- Écran `/ecosystem` verrouillé à `100dvh` sans scroll ; sélecteur compact en grille pour garder tous les écosystèmes accessibles sur mobile.
- Écran `/jobs` : onglets Recommandées/Récents/Favoris et compteur dynamique `matchingCount`; aucune valeur métier fictive ajoutée.


## 25. CINEMATIC 15/10 V21 — 16/09/2026

### CODÉ
- Nouvelle couche `components/JoblyCinematic.tsx`.
- `/jobs` : feed d'opportunités réel via `/api/jobs` + `/api/applications`, Apply, recherche, bottom sheet.
- `/recruiter` : Match Lab basé sur `/api/recruiter/applications`, swipe et célébration match.
- `/talent/profile` : profil vidéo immersif avec parallax et bottom sheet.
- Navigation 3D/glass, haptics, micro-son, confettis et motion system.
- `public/jobly/cinematic-ui.png` généré pour la direction visuelle.
- `public/jobly/ambient-loop.mp4` généré comme boucle de démonstration.
### À VALIDER
- `npm run typecheck`, `npm run build`.
- E2E connecté Talent + Recruiter.
- Autoplay vidéo sur iOS/Android.
- Remplacement du fallback par les vrais pitchs vidéo backend.- Performance, accessibilité et reduced-motion.


## 26. CINEMATIC V21 — 16/09/2026 — CHECKPOINT
**Décision active :** reconstruction visuelle radicale des trois surfaces cœur (`/recruiter`, `/jobs`, `/talent/profile`) sans casser les APIs existantes.

**Codé localement :** motion/glass/haptic/audio/confetti, navigation glass, bottom sheets, recherche jobs, Apply réel, Match Lab réel, parallax profil.

**Assets générés :** `public/jobly/cinematic-ui.png`, `public/jobly/ambient-loop.mp4`, `public/jobly/icons-3d.svg`.

**Validation :** la syntaxe TSX du nouveau composant a été corrigée et `tsc` atteint ensuite uniquement des erreurs d'environnement parce que les dépendances npm (`react`, `next`, etc.) ne sont pas installées dans le runtime d'exécution. `npm ci` est impossible sans lockfile et `npm install` n'a pas pu terminer dans l'environnement réseau disponible. Build Vercel non déclaré comme validé.

**Limite assumée :** `ambient-loop.mp4` est un asset de démonstration généré à partir du visuel cinématique ; il n'est pas présenté comme un vrai pitch d'un candidat. Le prochain branchement backend devra fournir le média réel du Talent.

**GitHub :** tentative de push via l'intégration GitHub effectuée, mais l'API d'écriture a retourné HTTP 403 (`Resource not accessible by integration`). Aucun push n'est donc prétendu effectué.


---

# 25. CINEMATIC V22 — SHARED ELEMENT + REAL TALENT PHOTO — 16/09/2026

## Décision
Le redesign passe de la simple navigation vers une transition de produit : le talent sélectionné devient le profil.

## Implémentation
- Recruiter : clic sur le nom / talent → overlay de morphologie cinématique avant navigation.
- Données du talent stockées temporairement dans `sessionStorage` pour préserver le contexte pendant la transition.
- `/api/recruiter/applications` expose désormais `userId`.
- Profil : lecture du talent sélectionné et utilisation de `profilePhotoUrl` réel quand il existe.
- Le profil conserve un fallback vidéo de prototype uniquement lorsque le talent n'a pas encore de média réel.
- CTA play, haptics, micro-son, parallax et bottom sheet conservés.
- Aucun champ de pitch vidéo réel n'a été inventé : le backend actuel ne renvoie pas de `pitchVideoUrl`. Le composant est prêt à l'utiliser lorsqu'un vrai champ/API sera disponible.

## Validation technique
- Parse JSX/TypeScript du composant vérifié : plus d'erreur de syntaxe.
- Le check TypeScript complet reste impossible dans l'archive sans `node_modules` ; les erreurs restantes sont des modules/dépendances absents de l'environnement de validation, pas une erreur de syntaxe du composant.
- GitHub push non effectué : l'intégration GitHub disponible a renvoyé HTTP 403 sur l'écriture.

## Statut
**🔧 CODÉ → 🧪 TEST TÉLÉPHONE / VERCEL À FAIRE**

## Prochaine tâche
Brancher le **vrai Video Pitch Talent** dans le modèle/API existant, puis tester la chaîne :
`Recruiter → swipe → 94% match → morph → profil → play pitch → contact`.

---

# CHECKPOINT #26 — TRUE VIDEO PITCH ENGINE V23 — 16/09/2026

## Objectif
Faire passer le redesign Cinematic du prototype avec média de démonstration au **vrai pitch vidéo du Talent**, exploitable par le Recruiter.

## Implémenté
- Nouveau endpoint `POST/GET/DELETE /api/auth/video-pitch`.
- Bucket Supabase `talent-pitches` créé automatiquement s'il n'existe pas.
- Formats acceptés : MP4, WebM, MOV.
- Taille maximale : 25 Mo.
- Validation obligatoire : 5 à 8 secondes.
- Enregistrement caméra + micro directement depuis `/talent/profile` avec arrêt automatique à 8 secondes.
- Import vidéo depuis le téléphone/ordinateur.
- Remplacement et suppression du pitch.
- Nouvelles colonnes `User.pitchVideoUrl`, `pitchVideoStoragePath`, `pitchVideoDurationMs`, `pitchVideoUpdatedAt`.
- `/api/profile` expose le pitch du Talent connecté.
- `/api/recruiter/applications` expose le pitch vidéo réel du candidat.
- Match Lab Recruiter : autoplay muted du vrai pitch, play/pause, haptics et fallback honnête si aucun pitch.
- Profil partagé : lecture du vrai pitch si présent; aucune vidéo de démonstration n'est présentée comme un pitch candidat.
- Migration idempotente : `supabase/20260916090000_talent_pitch.sql`.
- Prisma mis à jour.
- Documentation : `TRUE-VIDEO-PITCH-ENGINE-V23.md`.

## Contrôle qualité
- Le code reste dans la palette sacrée JOBLY.
- Le flux ne fabrique aucune identité vidéo.
- La durée est contrôlée côté client puis imposée côté serveur.
- La suppression retire aussi le fichier Storage précédent.

## Statut
**CODÉ → À TESTER SUPABASE + MOBILE + VERCEL**

## Blocage externe
Le push GitHub automatique reste à effectuer dès que l'intégration GitHub accepte l'écriture; les tentatives précédentes ont renvoyé HTTP 403.

## Prochaine action
Appliquer `supabase/20260916090000_talent_pitch.sql`, puis tester sur téléphone : enregistrer 6 s → publier → ouvrir le compte Recruiter → vérifier que le même pitch réel apparaît dans le Match Lab et dans le profil partagé.

# CHECKPOINT 18/09/2026 — J’IA CEO DIGITAL

## Décision produit figée
J’IA possède deux dimensions :
1. **Career Intelligence** pour les utilisateurs ;
2. **CEO Intelligence** pour l’administrateur/fondateur.

Le rôle CEO est un pilotage digital business 360° et ne doit pas être réduit à un chatbot d’administration.

## Périmètre conçu
- CEO Intelligence
- BI
- Growth
- Commercial
- Finance
- Market Intelligence
- Operations
- Customer Intelligence

## Cockpit administrateur cible
- situation globale ;
- alertes ;
- projections 7/30/90 jours ;
- Profitability Engine ;
- Market Watch ;
- CEO Actions ;
- KPI temps réel ;
- objectifs Jobly, équipes et Partners ;
- rapports hebdomadaires/mensuels ;
- prédictions de rentabilité ;
- veille concurrentielle web sourcée ;
- benchmarking ;
- recommandations commerciales, marketing et B2B/Partners avec KPI de suivi.

## Boucle CEO
**Observer → Comprendre → Prédire → Décider → Exécuter → Mesurer → Corriger → Apprendre.**

## Confidentialité
Business Core strictement séparé de J’IA user-facing. Finances, marges, objectifs, prévisions, stratégie, KPI internes, concurrence, commissions et données permettant de les déduire doivent être protégés par permissions techniques et audit.

## Gouvernance
J’IA assiste l’administrateur. Elle peut analyser, alerter, simuler, recommander et préparer. Les décisions juridiquement ou financièrement engageantes restent sous validation humaine explicite.

## Statut honnête
🟡 **CONÇU / À IMPLÉMENTER** — le mandat CEO est maintenant formellement intégré à la documentation de référence. Le cockpit, Profitability Engine, Market Watch, CEO Actions et reporting automatisé doivent encore être construits puis validés avec des données réelles.

## Prochaine brique de construction
**CEO Intelligence Core → Admin Cockpit → Profitability Engine → Market Watch → CEO Actions → Reporting → contrôle d’accès/audit → validation E2E.**


# CHECKPOINT 19/09/2026 — STABILISATION PRODUCTION + RLS

## Production Vercel
- Déploiement production actuel : `dpl_HxyQM398puLXHEENjA5HEA6DnpQj`.
- Commit : `1b94ecc08b40952393f62dd1109c6c8c95fe3b3e`.
- État Vercel : **READY**, cible **production**, alias `jobly-c0651.vercel.app`, aucune erreur d'alias.
- La page d'accueil et `/jobs` répondent HTTP 200 en production.
- Les API protégées testées sans session refusent correctement l'accès (ex. `/api/me` → 401).
- Aucun cluster d'erreur runtime Vercel détecté sur les dernières 24 h.

## Supabase / sécurité-performance
- Index FK `PromoCode_createdby_idx` ajouté.
- Optimisation des politiques RLS utilisant `auth.uid()` / `auth.role()` avec formes d'initialisation mises en cache.
- Une seconde passe a corrigé les 7 avertissements RLS initplan restants sur AiUsage, Subscription, RecruiterGmailConnection et JiaUpgradeNudge.
- Les seuls avertissements performance restants sont les index actuellement inutilisés et une double policy SELECT intentionnelle sur RecruiterJob ; aucun index n'est supprimé sans données de trafic suffisantes.
- Les 16 tables RLS sans policy restent volontairement protégées pour les flux serveur/service-only ; aucune policy publique n'a été ajoutée aveuglément.
- Deux points de configuration Supabase restent hors migration SQL : déplacement de pg_net hors du schéma public et activation de la protection contre les mots de passe compromis.

## État réel
**Production déployée et techniquement stable sur les parcours anonymes testés.** La validation E2E authentifiée Talent/Recruiter/Partner et le branchement paiement/iClan restent des validations métier distinctes et ne doivent pas être déclarés terminés sans parcours réel.


### Audit navigation — 19/09/2026
- **Correction appliquée :** `components/PageHeader.tsx`
- **Avant :** l'avatar du header envoyait tout profil non-Talent vers `/dashboard`, y compris depuis les espaces Recruteur et Partner.
- **Après :** le header route vers `/talent/profile`, `/recruiter/profile` ou `/partner/profile` selon l'écosystème ; le comportement par défaut reste `/dashboard`.
- **État :** 🔧 CODÉ — NON VALIDÉ
- **Build :** `npm run build` réussi sur le commit de correction via CI GitHub (PR #5).
- **Validation humaine :** non effectuée ; test téléphone réel encore requis.

### Corrections interface demandées — 19/09/2026

#### PAGE D’ACCUEIL
- **Fichier :** `app/page.tsx`
- **Avant :** libellé `Career OS`, trait droit de 90 px, 3 cartes de valeur, footer légal visible.
- **Après :** libellé `Your Career OS`, trait canari `#FFD60A` de 54×5 px légèrement courbé, mention `Powered by J'IA` avec l’esthétique J’IA existante, 4 cartes de valeur, footer légal retiré de l’accueil et espacement resserré.
- **État :** 🔧 CODÉ — NON VALIDÉ
- **Build Vercel :** READY sur le déploiement de la correction.
- **Validation humaine :** test téléphone réel encore requis.

#### PAGE CRÉER MON COMPTE
- **Fichier :** `app/page.tsx`
- **Avant :** sous-titre précédent, contenu centré.
- **Après :** sous-titre `Veuillez remplir vos informations d’identification.`, Nom/Prénom/Téléphone/Adresse e-mail alignés à gauche, phrase `Ton numéro est enregistré...` supprimée.
- **État :** 🔧 CODÉ — NON VALIDÉ
- **Build Vercel :** READY sur le déploiement de la correction.
- **Validation humaine :** test téléphone réel encore requis.

#### RÉCUPÉRATION MOT DE PASSE
- **Fichiers :** `lib/auth.ts`, `app/auth/reset-password/page.tsx`
- **Avant :** le lien Gmail passait par `/auth/callback` avant la page de configuration et la redirection finale pouvait laisser l’expérience bloquée.
- **Après :** le lien de récupération ouvre directement `/auth/reset-password`, la page traite les liens Supabase PKCE (`code`) et `token_hash` de récupération, puis force une navigation complète vers `/ecosystem` après changement du mot de passe.
- **État :** 🔧 CODÉ — NON VALIDÉ
- **Build Vercel :** READY sur le déploiement de la correction.
- **Validation humaine :** test réel Gmail → nouveau mot de passe → retour dans Jobly encore requis.

# CHECKPOINT 20/09/2026 — J’IA DÉFINITIVE / MOTION SYSTEM

## Décision du fondateur

La référence visuelle de J’IA fournie le 20/09/2026 est désormais la **référence visuelle maître** du personnage.

Elle doit conserver :
- une jeune femme africaine adulte, sophistiquée et élégante ;
- une présence de griotte moderne / gardienne de mémoire ;
- cheveux noirs naturellement crépus, coiffure simple ;
- lunettes rondes dorées ;
- blazer bleu et foulard soie ambre/or à motif géométrique discret ;
- pin minimaliste « J’IA » ;
- apparence humaine et organique ;
- aucune esthétique robotique/cyborg ;
- aucun élément corporate inutile (tablette, dashboard, mallette, badge RH, casque, antenne, etc.).

**Règle : les animations ne doivent pas modifier ou dénaturer cette identité.**

## Décision d'interaction

J’IA doit exprimer ses intentions par **des gestes réellement animés du personnage**, et non par des emojis utilisés comme substitut à l'animation.

### Vocabulaire gestuel cible — 24 gestes

**CORE**
1. Saluer / accueillir
2. Analyser / réfléchir
3. Pointer / expliquer
4. Écrire / prendre des notes
5. Valider / cocher
6. Alerter / attention
7. Envoyer / postuler
8. Célébrer / embauché

**ÉMOTIONNELS**
9. Clin d’œil complice
10. Rassurer
11. Encourager
12. Déçue mais motivante
13. Surprise / offre parfaite
14. Curieuse
15. Fatiguée mais continue
16. Fière

**BUSINESS**
17. Présenter un graphique
18. Serrer la main / partenariat
19. Présenter une équipe
20. Expliquer PAY OS
21. Appeler / relation RH
22. Filtrer / trier
23. Sécuriser / confidentiel
24. Dire au revoir / à demain

## Architecture cible

Le moteur J’IA devra suivre :

`CONTEXTE → INTENTION → MESSAGE → GESTE → CIBLE/POSITION → VOIX → ACTION`

Le geste doit être contextualisé. Exemple : lorsque J’IA demande de cliquer sur un bouton, elle doit pouvoir **pointer réellement vers ce bouton**, avec une position recalculée selon l'écran et le viewport mobile.

La voix et l'animation faciale suivent :

`INTENTION → TEXTE LOCALISÉ → VOIX → BOUCHE / EXPRESSION`

Le texte et la voix doivent suivre la langue active de l'utilisateur.

## Principe de comportement

J’IA devient une couche d'assistance transversale du Career OS :
- présence discrète ;
- assistance contextualisée ;
- anticipation ;
- proposition de prochaine action ;
- guidage visuel ;
- accompagnement d'une difficulté ;
- action lorsque le système l'autorise ;
- confirmation du résultat.

Elle ne doit pas bouger en permanence. Chaque animation doit porter une information ou une intention.

## État honnête

**🟡 SPÉCIFIÉ / RÉFÉRENCE VISUELLE FIGÉE — NON IMPLÉMENTÉ**

La référence visuelle et le vocabulaire des 24 gestes sont documentés. Le moteur d'animations, les assets/rigs nécessaires, la synchronisation bouche/voix et les tests téléphone restent à implémenter.

**Important :** cette section ne constitue pas une validation de l'animation. Aucune animation J’IA ne doit être déclarée « validée » avant un test réel sur téléphone.


# CHECKPOINT 20/09/2026 — J’IA MOTION SYSTEM IMPLÉMENTÉ

La première couche exécutable du Motion System J’IA est désormais codée dans components/WaterScene.tsx et components/JiaMaster.ts.

- La référence visuelle fournie par le fondateur est embarquée comme master asset, sans dépendance CDN.
- Les 24 intentions gestuelles définies dans le vocabulaire J’IA disposent désormais d’un preset d’animation sémantique.
- Le parcours d’accueil J’IA active automatiquement les intentions welcome → analyze → reassure ; aucune animation continue non contextualisée n’est introduite après cette séquence.
- Le moteur accepte désormais une intention explicite : gesture, message, target, voice.
- La cible contextuelle peut être affichée comme repère lorsque J’IA guide une action.
- La voix navigateur est préparée via Web Speech API lorsque voice: true est demandé ; la langue suit le document actif FR/EN.
- prefers-reduced-motion est respecté.

**État honnête :** le moteur 2D et le vocabulaire sémantique sont implémentés. Ce n’est pas encore un rig anatomique avec animation indépendante des bras, mains, yeux et bouche. Cette étape reste nécessaire pour atteindre le niveau final de « geste réellement physique » défini dans la spécification.


# CHECKPOINT 20/09/2026 — PROJET VERCEL CANONIQUE VERROUILLÉ

## Règle de continuité — NON NÉGOCIABLE
Le projet Vercel officiel de JOBLY est désormais explicitement verrouillé :

- **Vercel : jobly-c0.6.5.1**
- **Project ID : prj_7B3nK76wDdgQbHK4WFz59DsKKYJQ**
- **Team : PORTFOLIO / portfolio-5555**
- **GitHub : kenzimayaka-glitch/Jobly**
- **Branche : main**
- **Alias attendu : jobly-c0651.vercel.app**

### Règle absolue
**Ne jamais changer de projet Vercel par erreur.** Toute opération de déploiement, configuration, diagnostic, rollback ou validation doit cibler ce projet et aucun autre, sauf instruction explicite du fondateur.

Les projets historiques/doublons suivants sont hors périmètre : jobly_v0.1, jobly, jobly-v23, jobly-v23-test, jobly-v23-schema-test.

### État au moment du checkpoint
- Le dernier déploiement de jobly-c0.6.5.1 est en **ERROR**.
- Commit concerné : d56c7b3f11b63a47b2f246fd0b28e71b00339fdd — fix(jia): normalize generated source newlines.
- Le déploiement précédent **READY** reste disponible comme rollback candidate : dpl_6gHKxWqD1KshbeoFYKZUvknC9w6L, commit b8dc6ecf4247b7ea3ed85b11383000e502c690fc.
- Les déploiements du projet canonique sont bien reliés à kenzimayaka-glitch/Jobly sur main.

**Consigne pour toute IA / développeur : lire ce checkpoint et Statut.md avant toute modification ou action Vercel.**


# CHECKPOINT 20/09/2026 — J’IA VOICE COMMAND / WAKE WORD

## Décision produit figée
Pour qu’une phrase soit interprétée comme une commande d’action J’IA, l’utilisateur doit commencer par prononcer « J’IA ». Toute parole sans ce préfixe est ignorée par le moteur de commande.

J’IA explique elle-même cette règle à l’utilisateur : elle annonce que ses actions commencent par « J’IA », afin que le fonctionnement soit découvert naturellement.

## Voix
- Web Speech API activée côté navigateur lorsque le moteur vocal est disponible.
- J’IA peut parler en français ou en anglais selon la langue active du document.
- Écoute continue après autorisation du navigateur ; une première interaction peut être nécessaire pour déclencher/autoriser le microphone selon les politiques du navigateur.
- Indicateur vocal visible : écoute / vocal / indisponible.

## Commandes vocales V1 reliées
- recherche d’offres compatibles ;
- filtrage CDI / CDD / Stage / Remote ;
- ouverture d’une offre ;
- demande de candidature ;
- transmission de la commande à la couche d’action J’IA.

Le flux utilise un événement interne jobly:jia-command afin de séparer compréhension vocale et exécution métier. Les surfaces métier peuvent ainsi recevoir les mêmes intentions sans dupliquer le moteur vocal.

## Barrière financière — NON NÉGOCIABLE
Le moteur vocal bloque explicitement toute commande de paiement, transfert d’argent ou transaction. J’IA peut expliquer ou guider un parcours financier, mais ne peut jamais exécuter ni confirmer un paiement.

Cette interdiction est appliquée avant l’émission de l’événement d’action : une commande financière n’atteint donc pas la couche métier J’IA.

## Mobilité du personnage
J’IA reste immobile par défaut. Elle se déplace uniquement par glisser-déposer manuel de l’utilisateur. La bulle de dialogue reste attachée au même conteneur et se déplace avec elle.

## Visage / rig
Le rig ne suit plus le curseur et ne fait plus pivoter automatiquement le corps. Les micro-expressions de clignement et de synchronisation vocale restent indépendantes de la position du personnage.

## État honnête
**🔧 CODÉ → 🧪 À VALIDER SUR TÉLÉPHONE + VERCEL**

La commande vocale et son garde-fou financier sont codés. La compatibilité exacte de Speech Recognition dépend du navigateur et doit être validée sur les appareils cibles. Les actions métier supplémentaires devront écouter jobly:jia-command sans contourner la barrière financière.


# CHECKPOINT 20/09/2026 — J’IA SETTINGS / ACCÈS PAR ÉCOSYSTÈME

## Implémenté
- Nouveau composant : `components/JiaPreferences.tsx`.
- Configuration ajoutée aux paramètres **Talent**, **Recruiter** et **Partner**.
- Accès J’IA : activé/désactivé.
- Réponse J’IA : **texte seulement** ou **vocal**.
- Notification J’IA : **texte seulement** ou **vocal**.
- Recommandations proactives : activées/désactivées.
- Préférences séparées par écosystème.
- Persistance Supabase dans `public.jia_preferences`.
- RLS activée : un utilisateur ne peut lire/modifier que ses propres préférences.
- Migration appliquée sur **JOBLY-PROD**.

## Commits
- `86edc371e08dea424fc80e5a611a486d607129dc` — composant J’IA Settings.
- `8520cb1f16a44c5022a1a941a2c5f77e6fb0d868` — intégration Talent/Partner.
- `5900926d67e0e0d38e2ceda20c1413e9d282fd98` — intégration Recruiter.

## État honnête
**🔧 CODÉ + PERSISTANCE DB → 🧪 BUILD / VERCEL / TEST MOBILE À VALIDER**.


---

## CHECKPOINT CTO — 20/09/2026 — J’IA BRAIN V1 TRANSVERSAL

### Réalisé dans ce passage
- Création du noyau serveur `lib/jia/brain.ts` : contexte mémoire + événements récents + CareerAssessment → orchestration IA → intention → confiance → action proposée → trace `JiaIntelligenceTrace`.
- Nouvelle API authentifiée `POST /api/jia/brain` avec consentement obligatoire.
- Nouvelle API authentifiée `GET/PUT /api/jia/preferences` pour centraliser les préférences J’IA par écosystème.
- J’IA Presence reliée au Brain après chaque commande vocale, tout en conservant la règle stricte du wake word « J’IA ».
- Le mode vocal configuré est désormais respecté par la présence J’IA.
- La proactivité Talent respecte désormais `access_enabled` et `proactive_recommendations`, et expose le mode de notification configuré.
- Correction P0 du build : `filteredJobs` était référencé avant sa déclaration dans `JoblyOfferFeed.tsx`.

### Validation technique
- GitHub Actions exécute automatiquement `npm install` puis `npm run build` sur chaque push `main`.
- Les premiers runs de ce passage ont correctement détecté l’erreur TypeScript puis le correctif a été poussé.
- **À ce checkpoint, le dernier build GitHub est encore en cours : ne pas le déclarer VALIDÉ avant conclusion SUCCESS.**
- Vercel reste le projet canonique verrouillé ; aucun changement de projet n’a été effectué.

### Limite de ce checkpoint
La fondation du cerveau transversal est maintenant branchée, mais les fonctions externes qui nécessitent des fournisseurs/permissions non présents (notamment push système hors navigateur et certaines actions métier) ne doivent pas être décrites comme opérationnelles tant qu’elles n’ont pas passé CODÉ → TESTÉ → VALIDÉ → DÉPLOYÉ.


---

### 20/09/2026 — J’IA — CHANTIER COMPLET PRÉPARÉ POUR VALIDATION

Le chantier J’IA a été repris en bloc sur la branche `chore/jia-complete-bulk`, sans déclencher de nouveau build Vercel.

**Corrections intégrées :**
- représentation J’IA agrandie et contenue sans clipping ; suppression du fond blanc par traitement transparent conservée ;
- visage animé : clignement des yeux, regard, sourcils, bouche et lip-sync visibles ;
- mouvements de tête et micro-mouvements pilotés par les gestes sémantiques ; aucun déplacement autonome par défaut ;
- dialogue lisible : fond jaune canari `#FFE135`, texte bleu `#0057B8`, bordure bleue, sans flou ;
- déplacement manuel de J’IA conservé par glisser-déposer ; le dialogue suit le personnage ;
- mode Texte/Vocal réellement respecté ; le micro et la synthèse vocale ne démarrent plus en mode texte ;
- accès J’IA désactivé respecté ;
- prédictions proactives bloquées lorsque J’IA est désactivée ;
- frontière financière renforcée dans le Brain : aucune proposition d’action de paiement/transfert/transaction ne peut être retournée comme action J’IA ;
- Brain transversal, préférences Talent/Recruiter/Partner et API proactives conservés ;
- règle de commande vocale `J’IA` conservée.

**État :** 🔧 CODÉ EN BLOC → 🧪 BUILD/E2E À VALIDER.

**Important :** conformément à la nouvelle règle du fondateur, aucun build Vercel n’est lancé automatiquement. La branche doit être validée puis fusionnée/soumise au build uniquement après autorisation explicite.


## 20/09/2026 — J’IA — DERNIÈRE PASSE BULK EFFECTUÉE

- Guard financier du Brain corrigé : une demande financière ne peut produire aucune action proposée.
- Commande vocale `J’IA, sauvegarde/enregistre...` rendue fonctionnelle sur les offres via favoris persistés côté navigateur.
- Mouvement autonome désactivé dans `WaterScene` : J’IA reste immobile jusqu’au déplacement manuel par l’utilisateur.
- Chantier J’IA regroupé et prêt pour validation technique globale.
- **Aucun build Vercel soumis** conformément à la règle du fondateur.
- État : **CODE BULK FINALISÉ → BUILD + E2E + CHECKING VISUEL À AUTORISER**.


# CHECKPOINT 21/09/2026 — AUDIT TRADUCTION FR ↔ EN — NON CERTIFIÉ

## État
- Audit intégral FR ↔ EN : **EN COURS / NON CERTIFIÉ**.
- L’audit a confirmé que l’existence de dictionnaires/locales ne suffit pas à certifier toute l’application.
- La surface authentification/onboarding a été inspectée et plusieurs chaînes utilisateur précédemment hardcodées ont été identifiées comme devant passer par le système de langue.
- `components/LanguageSync.tsx` a été ajouté pour synchroniser `document.documentElement.lang` avec la langue active stockée dans `jobly-lang`.
- `app/layout.tsx` a été ajusté pour monter ce synchroniseur global.
- Production Vercel reste actuellement **READY**, mais le dernier déploiement READY confirmé pointe encore vers l’ancien commit de design `78ffb8b...`; les corrections de traduction ne sont donc pas certifiées en production.

## Certification bloquée jusqu’à
1. Inventaire exhaustif de toutes les routes, composants et états utilisateur.
2. Audit des chaînes visibles, conditionnelles, dynamiques/API/backend et J’IA.
3. Détection et correction des chaînes hardcodées hors i18n.
4. Vérification des clés manquantes, inutilisées, dupliquées et incohérentes.
5. Vérification du changement FR ↔ EN et conservation du contexte sur toutes les routes.
6. Vérification responsive mobile/desktop des textes traduits.
7. Build complet, tests, régression et nouveau contrôle des chaînes.
8. Déploiement puis vérification de la production sur le commit certifié.

**Règle : aucune certification “terminé/go live” avant validation de l’ensemble de ces points.**


## CHECKPOINT 26/09/2026 — TALENT OFFERS / MATCH ADAPTATIF / UI

### Offres & matching
- Le score de compatibilité est calculé **offre par offre** : seuls les critères réellement détectés dans l’offre participent au score.
- Critères détectés selon le contenu de l’offre : métier/fonction, compétences, expérience, niveau d’études, langues, localisation, secteur, contrat et télétravail.
- Une information candidate inconnue est affichée comme **Non renseignée** et réduit la confiance plutôt que d’être assimilée automatiquement à un échec.
- **Les offres qui vous correspondent** utilise un seuil de 50 % de compatibilité.
- Le détail du score reste cliquable et affiche critères, attendu, données connues du profil et confiance.
- **Adapter mon CV pour cette candidature** ouvre le CV Studio avec l’offre déjà ciblée.

### Interface Talent
- Surface principale : **Offres** ; sous-titre : **J’IA se charge de tout**.
- Sélection principale : **Vos meilleurs offres** ; sous-titre : **Les offres qui correspondent le mieux à votre profil actuel**.
- Compteur dynamique : **X offres disponibles aujourd’hui**, basé sur le nombre réel d’offres retournées.
- Recherche : bouton explicite intégré dans le champ.
- Les deadlines/expirations ne sont plus présentées comme élément prioritaire dans les cartes.
- La logique de fraîcheur à 60 jours n’est plus utilisée pour le classement du flux.
- Dashboard Talent réaligné sur la palette Jobly bleu royal / canari / surfaces claires.
- Le vocabulaire « Opportunités » a été retiré des libellés concernés au profit de « Offres ».

### Logos entreprise
- CompanyLogo utilise un proxy same-origin /api/company-logo/image avant les favicons externes.
- Google Favicon et DuckDuckGo restent des fallbacks.
- Le cache navigateur a été versionné pour invalider les anciennes résolutions défaillantes.

### État
**🔧 CODÉ → 🧪 BUILD / VERCEL / VALIDATION VISUELLE À CONFIRMER.**
