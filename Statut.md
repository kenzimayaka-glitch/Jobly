# LOT C — BONS PLANS + COMMUNITY — 02/10/2026

## Périmètre architectural validé
Bons plans et Community cohabitent comme deux surfaces métier distinctes :
- **Bons plans** : découverte de contenus utiles (opportunités, formations, événements, services, avantages, initiatives locales/professionnelles).
- **Community** : communautés, adhésion, publications et échanges autour de ces sujets.
- **J’IA** : couche d'orchestration et de compréhension contextuelle, sans créer de nouvelle mémoire ou un nouveau cerveau social.

## Implémentation initiale — 🟡 CODÉ / ⬜ À TESTER / ⬜ À VALIDER
- Prisma : modèles BonPlan, BonPlanInteraction, BonPlanComment, Community, CommunityMembership, CommunityPost, CommunityPostComment, CommunityPostReaction.
- Migration SQL dédiée créée sur la branche, avec index, contraintes, RLS et grants.
- API Bons plans : lecture filtrée par pays/ville/catégorie + création authentifiée.
- API interactions Bons plans : LIKE / SAVE / SHARE.
- API Community : découverte filtrée + création authentifiée.
- API adhésion Community.
- API publications Community : lecture publique des publications publiées + publication réservée aux membres.
- Aucun changement du profil, du moteur d'offres ou du cerveau J’IA.
- Aucun déploiement Vercel et aucune modification de main.

## Prochaine validation
1. prisma validate / génération client.
2. Test SQL de migration sur environnement non productif.
3. Tests API : auth, filtres, création, adhésion, publication, idempotence interactions.
4. UI Bons plans + Community.
5. Intégration J’IA via JiaEvent uniquement après validation du socle.

---

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
- Retour rapide : à partir de la **20ᵉ offre parcourue**, une flèche flottante discrète permet de remonter en haut des offres.
- Entreprise : le libellé générique est remplacé par le **nom réel de l’entreprise** lorsqu’il est connu ; clic → fiche entreprise.
- Fiche entreprise : recherche prioritaire via **Google Places / Google Maps** lorsque la clé est configurée, puis site officiel et Google Actualités ; adresse, géolocalisation, téléphone, site, activité, statut, avis et actualités sont affichés uniquement lorsqu’ils sont réellement disponibles ; sinon **« Aucune donnée disponible »**.
- Liste des offres : CTA **« Voir l’offre »** présent sur chaque offre hors Top Match ; le Top Match conserve son parcours dédié.
- Actualisation : bouton **« Actualiser les offres »** renforcé, avec état de chargement visible.

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