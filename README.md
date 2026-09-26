# JOBLY — README DE CONTINUITÉ PRODUIT & TECHNIQUE
## JOBLY 20/20 — Your Career OS
### Référence de continuité — 26 septembre 2026

> **AUDIT 360° DU 13/09/2026** — un audit complet de navigation a été réalisé
> (voir `AUDIT-360-JOBLY-13-09-2026.md`) : chaque bouton/lien de l'app a été
> vérifié contre les routes réelles. Les corrections "P0" (boutons morts,
> liens erronés, navigation manquante) ont été appliquées ; voir `Statut.md`
> §22 pour le détail complet et la liste de ce qui reste à faire (P1/P2).

> **MISE À JOUR DU 26/09/2026 — OFFRES & MATCHING**
>
> Le parcours /jobs a été réaligné sur la vision candidat : titre **« Offres »**, sous-titre **« J’IA se charge de tout »**, compteur dynamique **« X offres disponibles aujourd’hui »**, filtre **« Les offres qui vous correspondent »** à partir de **50 %** de compatibilité, et bloc **« Vos meilleurs offres »** avec le sous-titre **« Les offres qui correspondent le mieux à votre profil actuel »**.
>
> Le moteur de matching est désormais **adaptatif à chaque offre** : il ne force plus une grille fixe. Il utilise les exigences effectivement détectées dans l'offre (métier, compétences, expérience, études, langue, localisation, secteur, etc.). Une information absente du profil est marquée **non renseignée** et réduit la confiance de l'analyse plutôt que d'être comptée automatiquement comme un échec.
>
> Le détail du score est cliquable et propose **« Adapter mon CV pour cette candidature »**, qui ouvre le CV Studio avec l'offre ciblée.
>
> Les règles historiques **« fraîcheur 60 jours max »** et **« deadline explicite prioritaire »** ont été retirées du moteur et de l'interface. La disponibilité des offres n'est plus artificiellement limitée à 60 jours.

> **OBJECTIF DE CE DOCUMENT**
>
> Ce README est destiné à toute IA, développeur, CTO ou agent de développement qui reprend JOBLY.
> Il doit permettre de continuer le projet **sans perdre la vision, sans réinventer les décisions et sans repartir de zéro**.
>
> **RÈGLE ABSOLUE :** lire `Statut.md` avant toute modification du code. `Statut.md` est la source de vérité de l'état d'avancement. Ce README est la source de vérité de la vision, des principes d'architecture et des décisions de continuité.

---

# 1. JOBLY EN UNE PHRASE

**JOBLY n'est pas un job board.**

JOBLY est conçu comme un **Career Operating System / système d'exploitation de carrière**, dont l'IA accompagne une personne depuis son entrée sur le marché du travail jusqu'à sa progression, sa mobilité, son recrutement et son évolution professionnelle.

> **JOBLY ne cherche pas seulement un emploi pour toi. JOBLY construit, pilote et optimise ta trajectoire professionnelle.**

Le Job Board n'est donc qu'une surface du produit.

---

# 2. VISION JOBLY 20/20

La vision cible est :

```text
                     JOBLY
                       │
             JOBLY INTELLIGENCE
                       │
       ┌───────────────┼────────────────┐
       │               │                │
    TALENT          MARKET           MOBILITY
    INTEL.          INTEL.            INTEL.
       │               │                │
       └───────────────┼────────────────┘
                       │
                  CAREER BRAIN
                       │
                  CAREER TWIN
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   CAREER GPS     CAREER GAP        READINESS
       │               │                │
       └───────────────┼────────────────┘
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   LEARNING       OPPORTUNITY       MOBILITY
   INTELLIGENCE   INTELLIGENCE      INTELLIGENCE
       │               │                │
       └───────────────┼────────────────┘
                       │
                 APPLY ENGINE
                       │
                 INTERVIEW AI
                       │
               CAREER COMPANION
                       │
          ┌────────────┼────────────┐
          │            │            │
        WORK         MOVE         GROW
          │            │            │
          └────────────┼────────────┘
                       │
                     RETAIN
```

## Les trois intelligences structurantes

### 1. Career Intelligence
Comprendre :
- qui est le Talent ;
- ce qu'il sait faire ;
- ce qu'il lui manque ;
- où il veut aller ;
- quelles étapes lui permettront d'y arriver.

### 2. Mobility Intelligence
Comprendre :
- où le Talent peut travailler ;
- dans quelles villes/pays ;
- avec quel niveau de préparation ;
- avec quels coûts, contraintes et services ;
- quelle trajectoire de mobilité est réaliste.

### 3. Market Intelligence
Comprendre :
- quelles compétences sont demandées ;
- quels métiers progressent ;
- où se trouve la demande ;
- quels écarts existent entre talents et employeurs ;
- comment anticiper le marché.

---

# 3. LE CAREER TWIN — OBJET CENTRAL

Le Talent ne possède pas seulement un CV.

JOBLY construit progressivement un **Career Twin** : une représentation dynamique de sa trajectoire professionnelle.

Il agrège notamment :

```text
IDENTITÉ
PROFIL
EXPÉRIENCES
COMPÉTENCES
FORMATION
CERTIFICATIONS
PROJETS
OBJECTIFS
ASPIRATIONS
PRÉFÉRENCES
MOBILITÉ
CANDIDATURES
ENTRETIENS
RÉSULTATS
PROGRESSION
```

Le Career Twin doit distinguer la provenance de l'information lorsque c'est pertinent :

```text
DECLARED
DOCUMENT
VERIFIED
INFERRED
```

**Règle fondamentale : l'IA ne doit jamais inventer un fait professionnel.**

Une inférence doit rester une inférence et ne doit pas être présentée comme un fait déclaré.

---

# 4. CAREER GPS

Le Talent peut définir une destination professionnelle :

> « Je veux devenir Senior Data Analyst dans 3 ans. »

JOBLY calcule :

```text
ÉTAT ACTUEL
     ↓
OBJECTIF
     ↓
CAREER GAP
     ↓
ÉTAPES
     ↓
MILESTONES
     ↓
PREUVES / EXPÉRIENCE
     ↓
READINESS
     ↓
NIVEAU SUIVANT
```

Le système doit répondre à :

**« Que dois-je faire maintenant ? »**

et non seulement :

**« Voici des informations. »**

Exemple :

```text
Junior Data Analyst
        ↓
Power BI
SQL avancé
2–3 projets
présentation
expérience supplémentaire
        ↓
Data Analyst confirmé
        ↓
ownership
mentoring
stratégie
leadership
        ↓
Senior Data Analyst
```

Le parcours est dynamique : lorsqu'une expérience, compétence, formation ou candidature évolue, JOBLY peut recalculer le chemin.

---

# 5. CAREER GAP ENGINE

JOBLY doit comparer au moins quatre dimensions :

```text
TALENT ACTUEL
     vs
OBJECTIF DE CARRIÈRE
     vs
MARCHÉ
     vs
OFFRE SPÉCIFIQUE
```

Les gaps peuvent donc être :
- Career Gap ;
- Market Gap ;
- Job Gap ;
- Seniority Gap.

L'objectif n'est pas de produire une longue liste de recommandations.

> **JOBLY doit privilégier les quelques actions qui ont le meilleur impact attendu sur la trajectoire.**

---

# 6. READINESS INTELLIGENCE

Les scores ne doivent pas être une décoration.

Prévoir à terme :

- **Career Score** — maturité/progression globale ;
- **Job Readiness** — préparation à un poste donné ;
- **Interview Readiness** — préparation à l'entretien ;
- **Mobility Readiness** — préparation à une mobilité ;
- **Seniority Readiness** — proximité du niveau visé ;
- **Application Score / Opportunity Score** — qualité de l'adéquation à une opportunité.

Chaque score important doit pouvoir expliquer **pourquoi** il existe.

---

# 7. JOBLY DOIT PARFOIS DIRE « NON »

Principe produit majeur :

> **JOBLY maximise la progression de carrière, pas le nombre d'actions.**

Il peut donc recommander :

- Postuler ;
- Attendre ;
- Se former ;
- Améliorer son profil ;
- Faire un projet ;
- Préparer un entretien ;
- Développer une compétence ;
- Développer son réseau ;
- Explorer une autre destination.

Exemple :

> **Ne postule pas encore.**
>
> Tu remplis 58 % des critères et cette offre contribue peu à ton objectif. Voici deux opportunités plus pertinentes et les deux actions à faire pour devenir compétitif.

C'est une différence stratégique par rapport aux job boards.

---

# 8. LEARNING INTELLIGENCE — FREE FIRST

JOBLY ne doit pas transformer le Career Gap en catalogue de formations.

Il doit produire :

```text
OBJECTIF
 ↓
GAP
 ↓
COMPÉTENCE À ACQUÉRIR
 ↓
RESSOURCE
 ↓
PRATIQUE
 ↓
PROJET
 ↓
PREUVE
 ↓
READINESS ↑
```

### Règle économique

**Free-first : utiliser une ressource gratuite lorsqu'elle apporte une valeur suffisante.**

Sources potentielles :
- documentation officielle ;
- ressources universitaires ouvertes ;
- freeCodeCamp ;
- MDN ;
- Khan Academy ;
- MIT OpenCourseWare ;
- YouTube ;
- projets open source ;
- autres ressources gratuites vérifiables.

Les APIs payantes ne doivent pas être une dépendance obligatoire de chaque fonctionnalité IA.

---

# 9. INTERVIEW AI

JOBLY doit préparer le Talent à réussir, pas seulement à obtenir un entretien.

Le système cible :

```text
CV
+
OFFRE
+
ENTREPRISE
+
POSTE
+
SENIORITY
+
CAREER TWIN
        ↓
INTERVIEW SIMULATOR
        ↓
RÉPONSE
        ↓
ANALYSE
        ↓
COACHING
        ↓
NOUVELLE QUESTION
```

Dimensions possibles :
- pertinence ;
- structure ;
- clarté ;
- impact ;
- précision ;
- leadership ;
- comportement ;
- adéquation au poste.

### Interview Memory

JOBLY doit pouvoir détecter des tendances de performance dans les simulations/retours :

> « Tu réponds trop longuement aux questions comportementales. »

> « Tu sous-utilises les résultats chiffrés de tes expériences. »

Ces observations doivent améliorer les simulations suivantes.

---

# 10. APPLICATION INTELLIGENCE

Le parcours cible :

```text
OPPORTUNITY
 ↓
OPPORTUNITY SCORE
 ↓
DÉCISION
 ↓
CV ADAPTÉ
 ↓
CANDIDATURE
 ↓
SUIVI
 ↓
SCREENING
 ↓
INTERVIEW
 ↓
OFFER / REJECTION
 ↓
ANALYSE
 ↓
CAREER TWIN UPDATED
```

La boucle de feedback est essentielle.

Exemple :
- beaucoup de refus avant entretien → problème possible de ciblage/profil/application ;
- beaucoup d'entretiens mais peu d'offres → problème possible d'entretien/positionnement.

JOBLY ne doit jamais présenter ces diagnostics comme des certitudes lorsque les données sont insuffisantes.

---

# 11. OPPORTUNITY RADAR

JOBLY doit devenir proactif.

Opportunités potentielles :
- jobs ;
- missions ;
- stages ;
- remote ;
- formations ;
- événements ;
- networking ;
- scholarships ;
- mobilité.

Le Radar doit être filtré par la trajectoire du Career Twin.

> **3 nouvelles opportunités viennent d'apparaître et correspondent à ton plan de carrière.**

---

# 12. JOBLY MOBILITY

Mobility n'est pas seulement « trouver un travail à l'étranger ».

C'est un **Career Mobility Engine**.

Le modèle cible :

```text
PROFILE
 ↓
CAREER FIT
 ↓
OPPORTUNITY
 ↓
LOCATION FIT
 ↓
MOBILITY FIT
 ↓
ECONOMIC VIABILITY
 ↓
MOBILITY PLAN
 ↓
MOVE
 ↓
SETTLE
 ↓
WORK
 ↓
GROW
 ↓
RETAIN
```

Dimensions possibles :
- pays ;
- ville ;
- salaire ;
- coût de vie ;
- demande métier ;
- langues ;
- expérience ;
- remote ;
- mobilité ;
- transport ;
- logement ;
- installation ;
- potentiel d'évolution.

JOBLY ne doit jamais promettre un visa, un emploi ou une réussite certaine.

---

# 13. LOCATION INTELLIGENCE

La géographie est transversale.

Elle peut alimenter :
- Talent ;
- Jobs ;
- Recruiter ;
- Mobility ;
- Campus ;
- Communities ;
- Events ;
- Housing ;
- Partners.
À terme, une **Career Map / Jobly Nearby** peut réunir les éléments pertinents autour du Talent.
---

# 14. CAREER COMPANION

Career Companion est la continuité après le recrutement.

Il couvre notamment :

```text
ONBOARDING
 ↓
OBJECTIFS
 ↓
COMPÉTENCES
 ↓
RÉALISATIONS
 ↓
CHECK-INS
 ↓
BLOCKERS
 ↓
GAPS
 ↓
NEXT BEST ACTION
 ↓
PROGRESSION
```

Le Career Companion doit se synchroniser conceptuellement avec le Career Brain/Career Twin.

JOBLY accompagne donc le Talent :
**avant l'emploi → pendant la transition → après l'embauche → vers le niveau suivant.**

---

# 15. RECRUITER 20/20

Recruiter ne doit pas être seulement :

> publier une offre.

Architecture cible :

```text
NEED
 ↓
JOB DESCRIPTION
 ↓
AI RECRUITER
 ↓
TALENT SEARCH
 ↓
EXPLAINABLE MATCHING
 ↓
SHORTLIST
 ↓
INTERVIEW
 ↓
HIRE
 ↓
ONBOARDING
 ↓
RETENTION
```

L'IA peut aider à :
- améliorer une offre ;
- identifier les critères réellement discriminants ;
- expliquer un matching ;
- comparer les candidats ;
- préparer les questions ;
- détecter certains risques de recrutement ;
- intégrer la dimension mobilité.

---

# 16. RECRUIT + MOVE

Différenciation B2B importante :

```text
TALENT FIT
+
MOBILITY FIT
+
COST OF HIRE
+
RETENTION POTENTIAL
```

L'entreprise peut ainsi réfléchir non seulement à :

> « Qui correspond au poste ? »

mais :

> « Qui peut réellement réussir dans ce poste et dans ce contexte géographique ? »

---

# 17. PARTNER 20/20

Partner actuel :
- profil Partner ;
- code de parrainage ;
- commissions ;
- moyen de paiement/payout.

Vision cible :

**JOBLY Career Network / Career Ambassador**

Le Partner peut devenir un acteur du réseau :
- recommandation de talents ;
- recommandation d'entreprises ;
- événements ;
- communautés ;
- insertion professionnelle ;
- acquisition.

L'IA pourra à terme aider le Partner à identifier les opportunités pertinentes dans son réseau, avec respect des permissions et de la confidentialité.

---

# 18. JOBLY ID / QR

Le QR doit être une identité professionnelle portable.

Principe figé :

> **Ne jamais mettre de données sensibles directement dans le QR.**

Le QR doit pointer vers un identifiant/token opaque et permettre, selon les permissions :
- profil ;
- CV ;
- portfolio ;
- rapport ;
- Jobly ID.

À terme :
- tokens temporaires ;
- permissions granulaires ;
- révocation ;
- régénération ;
- logs.

---

# 19. CAMPUS / COMMUNITIES / EVENTS

Ces surfaces ne sont pas accessoires.

### Campus
Point d'entrée pour :
- étudiants ;
- jeunes diplômés ;
- stages ;
- premières expériences ;
- projets.

### Communities
Networking contextualisé et utile.

### Events
Connexion entre :
- Talents ;
- Recruiters ;
- Campus ;
- Communities ;
- Partners.

Ces interactions peuvent nourrir le Career Twin lorsque cela est pertinent et autorisé.

---

# 20. ABONNEMENTS

La page Abonnements est **encore à intégrer dans l'application actuelle**.

Elle doit être conçue comme une couche économique du Career OS, pas comme un écran isolé.

Architecture cible :

```text
PLAN
 ↓
SUBSCRIPTION
 ↓
PAYMENT
 ↓
ENTITLEMENTS
 ↓
FEATURE ACCESS
```

Hypothèse historique à conserver comme référence jusqu'à nouvel arbitrage :
- Premium mensuel : **1 000 FCFA/mois** ;
- Premium annuel : **3 000 FCFA/an**.

Cette tarification doit être revalidée après estimation du coût réel des fonctions IA.

---

# 21. PAYMENT CORE / iCLAN

**iClan/Eduklan est la frontière fournisseur retenue dans la documentation, mais l'intégration live n'est pas considérée comme production tant que les capacités, credentials, webhooks et flux réels ne sont pas validés.**

Le Payment Core doit rester abstrait :

```text
JOBLY PAYMENT CORE
        │
        ├── iClan / Eduklan
        └── futur provider
```

États cibles :

```text
CREATED
 ↓
PENDING
 ↓
SUCCESSFUL / FAILED
 ↓
REFUNDED
```

Contraintes :
- `external_id` unique ;
- idempotency key ;
- activation Premium uniquement après confirmation serveur ;
- webhook validé ;
- journalisation ;
- réconciliation ;
- séparation UAT / production.

**Ne jamais prétendre qu'iClan est branché en production sans preuve de test réel.**

---

# 22. AUTHENTIFICATION — DÉCISIONS ACTUELLES

### Validé
**Google/Gmail : authentification validée.**

### Reporté
**WhatsApp : reporté**, coût considéré trop élevé / API non attachée.

### Reporté
**Authentification par numéro de téléphone : déjà configurée mais reportée**, coût considéré trop élevé.

### Important
Les canaux présents dans le code ne doivent pas être confondus avec les canaux validés en production.

Une IA doit toujours distinguer :
**présent dans le code ≠ configuré ≠ testé ≠ validé en production.**

---

# 23. STACK ACTUELLE OBSERVÉE

Le ZIP actuel contient notamment :

- Next.js App Router ;
- React ;
- TypeScript ;
- Tailwind ;
- Supabase ;
- PostgreSQL ;
- Prisma ;
- PWA ;
- APIs Next.js/route handlers.

Le `package.json` actuel indique notamment :
- Next.js 15.1.3 ;
- React 19 ;
- TypeScript 5.8.2 ;
- Prisma 6.16.3 ;
- Supabase JS 2.57.0.

Ne pas remplacer la stack sans justification technique explicite.

---

# 24. ROUTES ACTUELLEMENT PRÉSENTES DANS LE ZIP

**Mise à jour le 13/09/2026 (audit 360° navigation) : cette liste était périmée
(plusieurs routes existantes n'y figuraient pas). Voir aussi
`AUDIT-360-JOBLY-13-09-2026.md` et `Statut.md` §22 pour le détail des
corrections apportées ce jour.**

### Public / core
- `/`
- `/ecosystem`
- `/dashboard`
- `/jobs`
- `/candidatures`
- `/career-brain`
- `/auth/callback`
- `/notifications` — **créée le 13/09/2026** : la cloche de `PageHeader` (présente sur toutes les pages) n'avait jusqu'ici aucune action. Écran honnête ("aucune notification pour l'instant"), aucun moteur de notifications réel construit derrière.

### Recruiter
- `/recruiter`
- `/recruiter/profile`
- `/recruiter/jobs` — **créée le 13/09/2026** : l'onglet "Offres" du Bottom Nav Recruiter pointait vers cette route qui n'existait pas (404 systématique). Liste maintenant les offres réelles via `/api/recruiter/jobs`.
- `/recruiter/jobs/[id]` (`new` = création)
- `/recruiter/ats`
- `/recruiter/candidatures` — **statut : STUB**, affiche toujours "Aucune candidature" quel que soit l'état réel. Non corrigé aujourd'hui (hors périmètre P0), voir `Statut.md` §22.
- `/recruiter/onboarding` — **statut : PAGE ORPHELINE**, codée mais non reliée depuis aucun parcours. Non corrigé aujourd'hui, voir `Statut.md` §22.

### Partner
- `/partner`
- `/partner/payment` — **statut : STUB** ("brique Billing à venir"), alors que la sélection Orange Money/MoMo fonctionnelle vit sur `/partner`. Non corrigé aujourd'hui.
- `/partner/profile` — **statut : STUB** ("à venir"). Non corrigé aujourd'hui.
- `/partner/referral`

### Legal
- `/legal/terms`
- `/legal/privacy`

### APIs observées
- `/api/auth/whatsapp/request`
- `/api/auth/whatsapp/verify`
- `/api/profile`
- `/api/recruiter/profile`
- `/api/recruiter/jobs`
- `/api/recruiter/jobs/[id]`
- `/api/partner/profile`
- `/api/partner/commissions`
- `/api/jobs` — ajoutée le 12/09/2026 (Matching V1, spec 12.1) — voir `Statut.md`
- `/api/applications`, `/api/applications/[id]` — ajoutées le 12/09/2026 (Candidatures V1, spec 12.2) — voir `Statut.md`
- `/api/recruiter/applications`, `/api/recruiter/applications/[id]` — ajoutées le 12/09/2026 (côté recruteur, statut "Vu" automatique) — voir `Statut.md`

**Une route existante n'est pas automatiquement une fonctionnalité validée. Vérifier `Statut.md`.**

---

# 25. SOCLE DATABASE OBSERVÉ

Le projet contient notamment dans Prisma :

- User ;
- Profile ;
- Experience ;
- Skill ;
- Education ;
- Company ;
- Job ;
- Match ;
- Application ;
- Subscription ;
- Partner ;
- Commission ;
- QRShare ;
- AuditLog.

Les rôles prévus incluent :

```text
TALENT
RECRUITER
PARTNER
ADMIN
SUPPORT
FINANCE
MODERATOR
ANALYST
```

Le ZIP contient également :
- `supabase/PROFILE-FOUNDATION.sql`
- `supabase/RECRUITER-PARTNER-FOUNDATION.sql`
- `supabase/PRODUCTION-DEPLOYMENT.sql`

**Attention : Prisma et Supabase SQL ont connu des phases de divergence historique. Ne supposer aucune migration appliquée sans vérification dans la base réelle.**

### Mise à jour 12/09/2026 — préparation Matching V1 / Applications V1

Migration `20260912100000_matching_applications_v1` codée (non déployée) : ajoute `Profile.targetCities/contractPreferences/remotePreference`, `Job.remoteMode/minExperienceYears`, `Application.proofUrl/viewedAt/interviewAt/statusSource`. Détail complet dans `Statut.md`, section 4.

### Mise à jour 12/09/2026 — unification RecruiterJob / Job

`RecruiterJob` (offres publiées par un recruteur JOBLY) n'existait qu'en SQL brut, sans lien avec `Application`. Migration `20260912110000_recruiterjob_unification` codée (non déployée) : ajoute le modèle Prisma `RecruiterJob`, rend `Application.jobId` optionnel et ajoute `Application.recruiterJobId` — une candidature porte sur l'une des 2 sources, jamais les deux. Décision du fondateur : l'écran Offres mélange les 2 sources. Détail dans `Statut.md`, section 4 et 20.

---

# 26. DESIGN SYSTEM — NE PAS DÉRIVER

Référence visuelle actuelle :
- bleu Jobly : `#2563EB`
- jaune : `#FBBF24`
- vert : `#10B981`
- violet IA : `#8B5CF6`
- orange : `#F97316`
- Navy : `#16254A`
- blanc : `#FFFFFF`

Principes :
- mobile-first ;
- Android/PWA premium ;
- plein écran ;
- forte lisibilité ;
- cartes arrondies ;
- zones tactiles confortables ;
- espace blanc ;
- gradients réservés aux moments marque/IA/héro ;
- Jakarta Sans ou équivalent géométrique ;
- animations utiles et non bloquantes.

**Ne pas modifier le design simplement pour implémenter une fonctionnalité.**

---

# 27. PRINCIPES IA

JOBLY doit utiliser l'IA là où elle apporte une décision ou une amélioration réelle.

Ne pas faire :
> « Ajouter un chatbot parce que le produit doit avoir de l'IA. »

Faire :
> « Quelle décision l'IA permet-elle de mieux prendre ? »

Chaque fonctionnalité IA devrait idéalement préciser :
1. entrée ;
2. contexte ;
3. raisonnement/scoring ;
4. sortie ;
5. action recommandée ;
6. feedback ;
7. données mises à jour.

---

# 28. FREE-FIRST / 0 € AUTANT QUE POSSIBLE

Stratégie :

```text
RÈGLES DÉTERMINISTES
        +
DONNÉES EXISTANTES
        +
OPEN SOURCE / GRATUIT
        +
QUOTAS GRATUITS
        +
FALLBACKS
        ↓
IA COMMERCIALE UNIQUEMENT SI NÉCESSAIRE
```

Ne jamais architecturer une fonction essentielle de JOBLY autour d'une API payante sans :
- estimation de coût ;
- quota ;
- fallback ;
- stratégie de dégradation.

---

# 29. RÈGLES DE GOUVERNANCE POUR TOUTE IA QUI REPREND LE PROJET

### Une IA ne doit jamais :

1. repartir de zéro ;
2. supprimer une décision validée sans l'indiquer ;
3. créer une architecture concurrente sans raison ;
4. inventer des fonctionnalités déjà présentées comme validées ;
5. confondre code et validation ;
6. déclarer une intégration fournisseur « production » sans preuve ;
7. inventer des données professionnelles ;
8. casser la charte pour aller plus vite ;
9. créer un écran sans comprendre le moteur métier auquel il appartient ;
10. remplacer une décision par une préférence personnelle.

### Une IA doit toujours :

1. lire `Statut.md` ;
2. inspecter le code actuel ;
3. rechercher les décisions dans la documentation avant d'arbitrer ;
4. distinguer **spécifié / conçu / codé / testé / validé / déployé** ;
5. identifier les dépendances avant de coder ;
6. proposer la plus petite modification cohérente ;
7. mettre à jour `Statut.md` après une modification significative ;
8. préserver les décisions de design et de sécurité ;
9. tester avant de déclarer une brique terminée ;
10. signaler explicitement toute contradiction trouvée.

### Règle de questionnement (ajoutée le 12/09/2026)

Le fondateur n'est pas développeur. Quand une IA a besoin d'un arbitrage pour avancer :

- ne jamais poser de question ouverte si un choix simple suffit ;
- poser **une seule question à la fois**, avec **2 à 4 options courtes, numérotées** ;
- attendre la réponse avant de poser la question suivante ;
- ne jamais avancer sur une zone d'incertitude sans arbitrage explicite du fondateur.
---
# 30. MÉTHODE DE CONCEPTION 20/20

Avant de créer un écran :

```text
VISION
 ↓
USE CASE
 ↓
MOTEUR MÉTIER
 ↓
DONNÉES
 ↓
IA / RÈGLES
 ↓
ACTION UTILISATEUR
 ↓
ÉCRAN
 ↓
FEEDBACK
 ↓
MISE À JOUR CAREER OS
```

Ainsi, les écrans sont les surfaces du système, pas le système lui-même.

---

# 31. ORDRE STRATÉGIQUE DE CONSTRUCTION

## Phase 0 — Foundation
Auth / User / Profile / données / sécurité / design.

## Phase 1 — Career OS minimal
Career Brain → Career Score → Goals → Career Gap → Roadmap.

## Phase 2 — Opportunity
Jobs → Matching → Opportunity Score → Applications → Tracking.

## Phase 3 — Career Performance
Interview AI → Learning Intelligence → Portfolio → Career Companion.

## Phase 4 — Mobility
Location Intelligence → Mobility Fit → Mobility Planner → services.

## Phase 5 — Ecosystem
Recruiter → Recruiter Intelligence → Partner → Career Network.

## Phase 6 — Monetization
Subscriptions → Payment Core → iClan.

## Phase 7 — Market Intelligence
Skills Demand → Salary Intelligence → Talent/Employer Intelligence → forecasts/scenarios.

> **Ajustement du 12/09/2026 :** décision du fondateur de construire une version simple de Matching + Applications (Phase 2, sans IA générative) **avant** la Phase 6 (Monetization) — pour valider la boucle de valeur candidat avant de construire la facturation. Spécification technique complète de cet écran dans `Statut.md`, section 12.1.

**L'ordre d'exécution réel doit cependant toujours être ajusté à `Statut.md` et aux dépendances techniques.**

---

# 32. CE QUE JOBLY DOIT DEVENIR

À maturité :

```text
JOBLY
│
├── Career Brain
├── Career Twin
├── Career GPS
├── Career Gap
├── Readiness Intelligence
├── Opportunity Intelligence
├── Learning Intelligence
├── Interview AI
├── Application Intelligence
├── Career Companion
│
├── Jobly Mobility
│   ├── Location Intelligence
│   ├── Mobility Fit
│   ├── Mobility Planner
│   └── Settlement ecosystem
│
├── Recruiter
│   ├── ATS
│   ├── Talent Search
│   ├── AI Recruiter
│   └── Recruit + Move
│
├── Partner
│   ├── Referral
│   ├── Commission
│   └── Career Network
│
├── Campus
├── Communities
├── Events
├── Jobly ID / QR
│
├── Subscriptions
├── Payment Core
└── Market Intelligence
```

---

# 33. PHILOSOPHIE FINALE

> **JOBLY — Your AI Career Agent.**

JOBLY doit chercher à devenir la couche qui relie :
**personne + compétence + opportunité + entreprise + formation + mobilité + progression.**

Le succès du produit ne doit pas être mesuré uniquement par :
- nombre d'offres ;
- nombre de clics ;
- nombre de candidatures.

Mais progressivement par :
- progression de carrière ;
- qualité des opportunités ;
- réussite des candidatures ;
- amélioration des compétences ;
- réussite des entretiens ;
- mobilité réussie ;
- intégration professionnelle ;
- progression vers le niveau suivant.

---

# 34. INSTRUCTION DE REPRISE POUR UNE AUTRE IA

Copier-coller ce bloc au début d'une nouvelle session :

> Tu reprends le projet JOBLY.
>
> Lis intégralement `README.md` puis `Statut.md` avant toute action.
>
> JOBLY n'est pas un simple Job Board : c'est un Career Operating System / AI Career Agent.
>
> Le centre conceptuel est le Career Brain / Career Twin. Les moteurs futurs comprennent Career GPS, Career Gap, Readiness, Opportunity Intelligence, Learning Intelligence, Interview AI, Application Intelligence, Mobility Intelligence et Market Intelligence.
>
> Ne repars jamais de zéro. Ne remplace aucune décision validée sans la signaler. Ne confonds jamais « codé » avec « testé » ou « validé ». Inspecte le code avant de modifier. Respecte la charte et l'architecture existantes.
>
> Google/Gmail est le canal d'authentification actuellement validé. WhatsApp est reporté car coûteux et son API n'est pas attachée. L'authentification par numéro est configurée mais reportée pour raison de coût.
>
> Recruiter et Partner ont été construits récemment en déviation consciente de l'ancien ordre de travail. Leurs dashboards/journeys sont considérés comme construits ; leur validation fonctionnelle détaillée doit rester distincte du simple fait qu'ils existent.
>
> La page Abonnements n'est pas encore intégrée. Le Payment Core/iClan n'est pas encore considéré comme une intégration production.
>
> Avant toute nouvelle fonctionnalité, détermine :
> 1. quel moteur JOBLY elle sert ;
> 2. quelles données l'alimentent ;
> 3. quelle action elle déclenche ;
> 4. quelles données/observations elle renvoie au Career OS ;
> 5. quelles dépendances elle possède ;
> 6. comment elle sera testée.
>
> Priorité économique : free-first / open-source / gratuit lorsque possible.
>
> Ta mission n'est pas d'inventer un nouveau JOBLY. Ta mission est de continuer **ce JOBLY**, avec sa vision 20/20, sa mémoire décisionnelle et son architecture.

---

# 35. HIÉRARCHIE DES SOURCES

En cas de contradiction :

1. **Décision explicitement validée la plus récente par le fondateur**
2. `Statut.md`
3. documentation maître / Bible technique
4. autres documents de conception
5. checkpoints historiques
6. code actuel
7. hypothèse de l'IA

Une hypothèse ne doit jamais écraser une décision validée.



# FEATURES VIRALES — 13/09/2026

Une couche Free-first de centralisation et de viralité a été ajoutée autour du cœur Jobly.

### Services communs

- `lib/gmailService.ts` — connexion Gmail MVP, import simulé, envoi simulé, détection referral et préparation WhatsApp.
- `lib/atsService.ts` — scoring ATS déterministe sans API payante.
- `lib/viralityService.ts` — templates email, share packs et génération de données d'affiche.
- `lib/cronService.ts` — moteur de contrôle des relances >3 jours.
- `lib/jobImportService.ts` — import MVP d'une offre depuis URL.

### Parcours

- Recruiter : Gmail, candidatures unifiées, import URL, partage viral, signature, relances, affiche QR.
- Talent : import Gmail / Google Drive simulé et bibliothèque `/talent/cvs`.
- Partner : détection de gains passifs simulée.
- WhatsApp Apply : interface préparée, API volontairement non activée car payante.

### Règle de validation

Ces fonctionnalités sont **CODÉES** dans ce pack. Elles ne doivent être marquées **VALIDÉES** qu'après `npm install`, `npm run typecheck`, `npm run build` et parcours E2E sur téléphone.


# CHECKPOINT DE REPRISE — 13/09/2026

## État courant

Les **8 fonctionnalités virales P1/P2 sont intégrées dans le code**. Elles sont
CODÉES mais pas encore déclarées VALIDÉES E2E tant que `npm install`,
`npm run typecheck` et `npm run build`, puis les tests mobiles, n'ont pas réussi.

### Services centraux existants

```text
lib/gmailService.ts
lib/atsService.ts
lib/viralityService.ts
lib/cronService.ts
lib/jobImportService.ts
```

### Les 8 fonctionnalités

1. Recruiter Gmail Connect + Candidatures Unifiées + ATS
2. Multiposting inversé par URL
3. Talent Gmail + Google Drive Importer
4. Pack de partage LinkedIn / Facebook / WhatsApp
5. Signature Jobly + auto-relance simulée
6. Referral passif par email
7. Affiche virale 1080×1080 + QR
8. WhatsApp Apply préparé pour V2 payante, sans API payante

## CONSIGNE POUR L'IA QUI REPREND

**Ne recommence pas ces fonctionnalités.**

Commence par :

```bash
npm install
npm run typecheck
npm run build
```

Puis corrige uniquement les erreurs réelles jusqu'à obtenir :

```text
npm install  → succès
typecheck    → 0 erreur
build        → succès
```

Ensuite effectue une validation mobile feature par feature.

Si `npm install` échoue sur `registry.npmjs.org`, traiter cela comme un problème
d'accès réseau de l'environnement d'exécution et non comme une preuve que Jobly
est cassé.

## Blocs déjà validés par le fondateur

Ne pas réouvrir inutilement :
**Supabase production, AUTH V2, Matching, Applications, Notifications,
Recruiter, Partner, Google/Gmail Auth et Vercel.**

WhatsApp/phone auth sont volontairement reportés.

## Après validation

Le prochain grand chantier est :

**P3 — Payment Core + Abonnements réels.**

Le Payment Core doit être provider-agnostic.

## GitHub

Le repo officiel est :

`https://github.com/kenzimayaka-glitch/Jobly`

Aucun push GitHub ne doit être affirmé sans accès Git réel.

# CHECKPOINT MOBILITY V2 — 13/09/2026

Mobility V2 a été intégrée avant P3 à la demande du fondateur. Les parcours Talent et Partner utilisent des bottom navs contextuels et le GPS est centralisé dans `lib/cities.ts` + `lib/gps.ts`.

### État
Les fonctionnalités sont **CODÉES** mais restent à valider par `npm install`, `npm run typecheck`, `npm run build` et E2E mobile. Ne pas les déclarer production-ready avant cette validation.

### Reprise IA
Ne pas redévelopper Mobility V2. Commencer par installer les dépendances, compiler, corriger les vraies erreurs, puis tester les routes `/bons-plans/mobility/*`, `/recruiter/mobility`, `/admin/mobility` et `/pass/[code]`.

### Ordre produit
Mobility V2 → validation technique → **P3 Payment Core + Abonnements réels**.

# CHECKPOINT DE FUSION GLOBALE — 13/09/2026 — 08:44 UTC

La livraison actuelle est une fusion du **Final Code Mobility V2** avec les éléments P1/P2 viraux et les assets du redesign historique encore nécessaires au code.

### État de la livraison

- 41 routes/pages.
- 25 routes API.
- 4 migrations Prisma.
- 4 scripts SQL Supabase.
- 8 fonctionnalités virales P1/P2 : **CODÉES, non E2E validées**.
- Mobility V2 : **CODÉE, non BUILD/E2E validée**.
- Google/Gmail Auth : **VALIDÉE** selon le fondateur.
- WhatsApp/Phone : **REPORTÉS**.
- Payment Core / Abonnements / iClan : **non intégrés**.

### Règle de continuité

`Statut.md` reste la source de vérité d'exécution. La dernière section de ce fichier décrit le snapshot de fusion et prévaut sur les passages historiques antérieurs.

### Validation

L'installation des dépendances a été tentée mais a dépassé le délai d'exécution. Le `typecheck` et le `build` n'ont donc pas été déclarés réussis.

### Après fusion

Ne pas repartir de zéro et ne pas redévelopper les fonctionnalités déjà présentes. Commencer par `npm install`, puis `npm run typecheck`, `npm run build`, puis les parcours E2E mobile. Après validation, reprendre sur **P3 Payment Core + Abonnements réels**, sauf nouvelle décision du fondateur.

## CHECKPOINT P2/P3 — BILLING — 13/09/2026

Prix verrouillés : Free 0 ; Start 1 800/mois ou 5 000/an ; Premium 3 500/mois ou 15 500/an ; Pro 5 000/mois ou 25 800/an. P2/P3 : catalogue, abonnement, entitlements, Payment Core, idempotence, remboursements/réconciliation et webhook iClan signé sont codés. iClan réel et les stores restent à intégrer/valider.

## P3 iClan/Eduklan UAT — 13/09/2026
The supplied Eduklan UAT contract is now implemented: token acquisition, MTN MoMo/Orange Money payment initiation, provider verification and server-side entitlement activation on verified SUCCESSFUL status. UAT secrets are runtime-only and are not committed.

## P5.0 — Free-First AI Foundation — 13/09/2026

P5 est préparé avec un modèle de crédits serveur et une architecture AI Gateway commune aux quatre briques : Interview AI, Learning Intelligence, Application Copilot et Career Companion. Aucun provider IA de production n'est activé avant benchmark coût/qualité.

## P5 — AI Career Agent

P5 est construit avec un AI Gateway serveur Free-First, quotas par plan, comptabilité AiUsage, fallback déterministe et quatre surfaces : Interview, Learning, Application Copilot et Career Companion. Aucun provider IA de production n'est activé avant benchmark et validation.


# 25. P5.6 — QUOTA IA ATOMIQUE + PII MINIMIZATION — 13/09/2026

## Correctifs livrés
- `reserve_ai_credit(...)` déplace le contrôle de quota dans PostgreSQL.
- Verrou transactionnel par utilisateur avec `pg_advisory_xact_lock`.
- Une réservation + insertion `AiUsage` se fait dans la même transaction DB.
- `requestHash` est idempotent afin d'éviter une double facturation d'une même requête.
- Index unique `("userId","requestHash")`.
- Le gateway ne fait plus de `SELECT usage` suivi d'un `INSERT` non atomique.
- Les entrées envoyées au pipeline IA sont whitelistées par opération et limitées en taille.
- Emails et numéros de téléphone sont masqués dans les champs textuels transmis au contexte IA.
- Le contexte d'expérience transmis au pipeline est également nettoyé des PII évidentes.

## Validation honnête
- Audit statique du gateway : effectué.
- Correction du risque de race condition : codée.
- Correction PII/minimisation : codée.
- `npm install`, `typecheck`, `build` et migration Supabase réelle : non certifiés dans cet environnement.
- Provider IA externe de production : toujours désactivé.

## Prochaine étape
Appliquer la migration `20260913140000_p5_6_atomic_ai_quota` sur Supabase, puis exécuter les tests de concurrence quota et le build complet avant d'activer un provider IA non-production.

### Correctif Vercel — `CameroonCityKey` (13/09/2026)

Le build Vercel bloquait sur `app/api/mobility/estimate/route.ts` car `CameroonCityKey` était importé dans `lib/gps.ts` depuis `lib/cities.ts` sans être ré-exporté. Le correctif minimal est désormais appliqué dans `lib/gps.ts` avec `export type { CameroonCityKey };`. La logique GPS/mobilité existante n'a pas été remplacée.

**Statut :** correctif codé dans le package de référence ; validation Vercel à effectuer après push.


### Correctif Vercel — `Profile.targetRoles` (13/09/2026)

Le build TypeScript bloquait dans `app/api/opportunities/route.ts` car le résultat `Profile.maybeSingle()` était inféré comme `{}` et ne permettait pas l'accès à `targetRoles`, `targetCities` et autres préférences. Un type local `ProfileRow` a été ajouté afin de conserver la logique existante tout en donnant à TypeScript le contrat attendu.

**Statut :** correctif codé ; validation Vercel à effectuer après push.


### Correctif Vercel — `payments/[id]/verify` params Promise (13/09/2026)

Correction Next.js 15 du handler de vérification Payment : `params` est await avant lecture de `id`. La logique de vérification provider et des transitions de paiement est inchangée.

**Statut :** correctif codé ; validation Vercel à effectuer après push.


### Correctif Vercel — `Career Brain / ScoreRing` (13/09/2026)

Le build TypeScript bloquait dans `app/career-brain/page.tsx` car `ScoreRing` était typé uniquement avec des tailles `sm | md | lg`, alors que l'application utilise aussi des tailles numériques et la prop `value`. `components/ScoreRing.tsx` accepte maintenant les presets ou une taille numérique en pixels, ainsi que `score` ou `value`, sans modifier la logique du Career Score.

**Statut :** correctif codé ; validation Vercel à effectuer après push.


### Correctif Vercel — `RecruiterATS` / typage candidatures (13/09/2026)

Le build TypeScript bloquait dans `app/recruiter/page.tsx` car son tableau `ReceivedApplication[]` ne correspondait pas au contrat attendu par `RecruiterATS`. Le type de candidature ATS est maintenant centralisé dans `components/RecruiterATS.tsx` sous `RecruiterATSApplication`, puis réutilisé par le dashboard recruteur et la vue pipeline ATS. Les types dupliqués sont supprimés sans modification de la logique métier.

**Diagnostic complémentaire :** les compteurs hebdomadaires/journaliers affichés sur le dashboard restent actuellement statiques ; la gestion d'erreur des candidatures est silencieuse ; et l'API marque les candidatures `SUBMITTED` comme `ACKNOWLEDGED` lors du GET selon la spec actuelle. Ces points ne bloquent pas le build mais sont à traiter/valider avant une version production 20/20.

**Statut :** correctif codé ; validation Vercel à effectuer après push.


### Mise à jour — 13/09/2026 — Correctif build Vercel `RecruiterATS` / Drag & Drop

**Blocage rencontré :** Vercel échouait dans `components/RecruiterATS.tsx:172` sur `onDragStart`, car le bouton HTML déclenche un `DragEvent<HTMLButtonElement>` alors que `handleDragStart` attendait `DragEvent<HTMLDivElement>`.

**Cause racine :** le gestionnaire de drag était typé pour un `div`, mais il est attaché à un `<button draggable>`. TypeScript refuse correctement cette incompatibilité DOM.

**Correctif V8 :** signature de `handleDragStart` alignée sur `React.DragEvent<HTMLButtonElement>`. Aucun changement de logique ATS, de statut, de drag & drop, d'API ou d'interface.

**Diagnostic global ciblé :** recherche effectuée dans les fichiers TypeScript/TSX pour les usages `handleDragStart` / `onDragStart`. Un seul couple gestionnaire/appel a été trouvé dans `RecruiterATS.tsx`; aucun autre appel similaire à corriger dans le projet inspecté.

**État :** 🔧 CORRIGÉ — validation Vercel à faire.

## 16/09/2026 — Correctif Vercel / Supabase Edge Functions

Le build Vercel échouait après compilation sur `supabase/functions/ai-core/index.ts` car Next.js/TypeScript
tentait de résoudre son import Deno `https://esm.sh/@supabase/supabase-js@2`.

`supabase/functions/**` est désormais explicitement exclu du `tsconfig.json` Next.js. Cette zone reste
gérée par l'environnement Supabase Edge/Deno et n'est pas du code à typer comme une partie de l'application
Next.js.

**État :** correctif codé et vérifié dans le package ; build Vercel à revalider.


## Checkpoint technique — 16/09/2026 — Hardening V4

Le livrable courant est centré sur la racine du dépôt. Le dossier historique `/jobly/` dupliqué a été retiré du package de déploiement. Next.js et les fonctions Supabase Edge sont séparés au niveau TypeScript. Les URLs publiques sont centralisées dans `lib/site.ts`; les liens d'offres et de parrainage disposent de routes réelles (`/jobs/[id]` et `/join`). Les quatre briques J'IA sont accessibles depuis le parcours Talent. Les outils Recruiter Mobility/Onboarding et les outils Admin disposent de points d'entrée.

La persistance des CV Talent reste locale au navigateur et est affichée comme telle dans l'interface; une synchronisation Storage/DB devra être traitée comme chantier fonctionnel séparé.


## État courant — Hardening V4 — 16/09/2026

Le ZIP courant est nettoyé pour le déploiement : une seule application à la racine, séparation Next.js/Deno, URLs publiques centralisées, détail d'offre public, entrée de parrainage valide, navigation J'IA complète, accès Recruiter/Admin aux écrans existants et protection du dépôt par `.gitignore`.

La sauvegarde des CV Talent reste volontairement locale et signalée comme telle. Le lockfile npm doit encore être généré depuis un environnement ayant accès au registre npm avant de considérer les dépendances comme totalement reproductibles.

## Direction UI Talent — V7 (16/09/2026)
Le parcours Talent utilise désormais une direction visuelle cohérente inspirée de la maquette de référence : blanc dominant, bleu JOBLY et jaune canari, avec animations de fond bleu/jaune douces. Cette couche est isolée afin de ne pas imposer le thème Talent aux univers Recruiter et Partner.


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

### Opportunity Aggregator / PUB AUTO CASCADE — V7.3
JOBLY Talent peut présenter dans une cascade unique les opportunités d'emploi, de stage et de formation externe. La sélection est limitée à 10 éléments et combine prestige de la source/organisme (50%) et correspondance avec le profil (50%). Les formations externes sont référencées vers leur plateforme source; le composant `OpportunityCascade` gère l'animation, les contrôles manuels et les liens.

#### Sources externes de formation
Les sources sont allowlistées dans `lib/externalTrainingSources.ts`. freeCodeCamp est utilisé via son API publique de métadonnées; Microsoft Learn est prévu comme connecteur authentifié et ne s'active qu'après configuration du jeton serveur. JOBLY conserve les liens vers les plateformes d'origine et ne copie pas leur contenu.


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

## Audit E2E P1 — 16/09/2026
- Fermeture du parcours de création d'offre Recruiter : `/recruiter/jobs/new` utilise désormais le formulaire réel partagé avec l'édition.
- Suppression des métriques et validations fictives dans les écrans audités.
- Correction de l'authentification du layout Mobility Partner.
- Scan statique : 55 pages, 42 APIs, aucune destination interne littérale orpheline détectée et aucun `href="#"`.
- Rapport détaillé : `AUDIT-E2E-P1-16-09-2026.md`.
- La validation finale de build/runtime doit être exécutée dans Vercel/Supabase avec les dépendances et variables d'environnement réelles.

## CHECKPOINT 16/09/2026 — FUSION ROADMAP / FERMETURE DU PRODUIT

Pour accélérer la clôture du projet, les surfaces structurantes de la vision Career Operating System ont été raccordées au socle existant :

- `/career-gps` → Career OS
- `/career-gap` → Career Gap déterministe
- `/readiness` → Readiness
- `/opportunity-radar` → Opportunity Intelligence
- `/market-intelligence` → signaux calculables depuis les données Jobly
- `/campus`, `/communities`, `/events` → points d'entrée fonctionnels reliés aux parcours existants
- `/jobly-id` → identité Jobly + QR portable sans données sensibles dans le QR
- Dashboard Talent → accès direct aux surfaces Career Intelligence
- Career OS → accès direct GPS / Gap / Readiness / Radar
- Bon Plan → accès direct Mobility / Opportunités

Ces surfaces ferment les portes de navigation sans transformer une fondation en fonctionnalité backend spécialisée inexistante. Les validations BUILD/E2E finales restent obligatoires avant de déclarer le produit production-ready.
**Stratégie de fin de projet :** stabiliser et valider avant d'ajouter de nouvelles briques.
## 2026-09-16 — Stabilisation finale des parcours cœur
- Talent dispose d'un espace CV avec import, création, édition, score ATS déterministe, versions et impression/PDF navigateur.
- Talent et Partner disposent désormais d'un espace Paramètres dédié ; Recruiter conserve ses paramètres et y accède depuis son profil.
- Les trois écosystèmes utilisent une déconnexion globale Jobly via Supabase Auth.
- Recruiter Gmail initie désormais un OAuth Google avec scopes Gmail ; la lecture/envoi effectifs nécessitent la configuration Google Cloud/Supabase correspondante.
- Career reste conçu comme un flux Profil → Diagnostic → Gap → Readiness → Opportunités → Candidature → Suivi ; les écrans Career existants sont reliés aux briques actuellement disponibles.
- Le livrable doit être validé par `npm ci`, `npm run typecheck`, `npm run build` et les tests Supabase/Vercel avant production.

### État du livrable 16/09/2026
- 66 routes/pages Next.js présentes dans le livrable source.
- Audit statique des destinations internes : aucune destination littérale orpheline détectée et aucun `href="#"`.
- La validation `npm run typecheck` / `npm run build` doit être effectuée dans Vercel ou un environnement ayant installé les dépendances, car le ZIP source ne contient pas `node_modules` ni de lockfile.
- Gmail OAuth nécessite la configuration Google Cloud + Supabase et les scopes Gmail demandés ; ne jamais mettre les secrets OAuth dans le dépôt.

## Correctif Vercel — 16/09/2026
Le build Vercel a compilé Next.js avec succès puis a bloqué sur le typecheck dans `lib/opportunityAggregator.ts` car `profileRes.data` était inféré comme `{}`. Le correctif introduit un type explicite `ProfileRow` avant lecture des préférences Talent et renforce le typage de la liste Company. Le prochain contrôle attendu est un nouveau build Vercel.

## UX mobile — Journey
Le parcours d'introduction `/?screen=journey` supporte la navigation tactile par balayage horizontal : swipe gauche pour avancer, swipe droite pour revenir. Le bouton `Suivant →` reste disponible et la dernière slide ouvre J'IA, comme auparavant. Le geste privilégie le horizontal sans bloquer le défilement vertical natif.

## Dashboard Talent — données dynamiques et design plein écran (16/09/2026)
Le dashboard Talent utilise désormais les données réellement retournées par Jobly (`/api/profile`, `/api/jobs`, `/api/applications`) pour les compteurs, candidatures, profil et opportunités recommandées. Les chiffres et noms de sociétés de maquettes ne sont pas utilisés comme données métier. Le design est plein écran, sans `TalentBackground`, avec une palette JOBLY plus vive et la photo de profil réelle lorsqu'elle existe. Une absence de donnée produit un état vide/actionnable au lieu de bloquer la fonctionnalité.


## CHECKPOINT 16/09/2026 — V15 + Ecosystem no-scroll
- V15 Cascade corrigée : 4 secondes exactes (1s/1s/2s), 10 positions, anti-répétition des transitions, filtrage EMPLOI/STAGE avant top 10, emplacement après compteur/filtres, fond #FFFBE6, navigation swipe/flèches/dots et ouverture d'offre via alias `/offre/[id]`.
- Les données de cascade proviennent uniquement d'offres identifiables : aucune formation ne peut entrer dans la publicité emploi/stage et les annonces discovery sans URL source ou employeur identifiable sont exclues.
- Écran `/ecosystem` verrouillé à `100dvh` sans scroll ; sélecteur compact en grille pour garder tous les écosystèmes accessibles sur mobile.
- Écran `/jobs` : onglets Recommandées/Récents/Favoris et compteur dynamique `matchingCount`; aucune valeur métier fictive ajoutée.


## 16. DESIGN SYSTEM — CINEMATIC 15/10 V21 — 16/09/2026

La couche `/recruiter`, `/jobs` et `/talent/profile` a été reconstruite autour d'une expérience vidéo-first et glassmorphic.
- Palette de la couche : `#FFE135`, `#7A9BB5`, `#2E3F4F`, `#FFFEFB`.
- Framer Motion : springs `stiffness 200 / damping 12`, stagger 80ms, swipe.
- Haptics progressive enhancement et micro-sons Web Audio.
- Bottom sheets, confettis, glow, giant outline typography et navigation glass.
- Assets générés : `public/jobly/cinematic-ui.png` et `public/jobly/ambient-loop.mp4`.
- Le fallback vidéo est un asset de prototype généré ; il doit être remplacé automatiquement par le vrai pitch média du Talent dès que le champ média backend est disponible.


## 17. CHECKPOINT CINEMATIC V21 — 16/09/2026

- Experience layer implemented in `components/JoblyCinematic.tsx`.
- Generated visual: `public/jobly/cinematic-ui.png`.
- Generated prototype video loop: `public/jobly/ambient-loop.mp4`.
- Generated 3D/glass navigation icon sheet: `public/jobly/icons-3d.svg`.
- The prototype deliberately keeps the real `/api/jobs`, `/api/applications`, and `/api/recruiter/applications` paths instead of replacing the product data layer.
- Production validation remains pending because the local runtime cannot install the repository dependencies and GitHub write access returned 403.


## CINEMATIC V22 — Shared Element
La transition Recruiter → Talent Profile est désormais traitée comme une continuité visuelle : le talent sélectionné est conservé pendant la navigation et son `profilePhotoUrl` réel est affiché lorsqu'il est disponible. Le backend expose `userId` dans les candidatures Recruiter pour permettre le raccord de contexte.

**Limite actuelle :** le backend présent dans ce snapshot ne fournit pas encore de champ `pitchVideoUrl`; le composant prévoit ce champ sans inventer de média réel. Le prochain travail est le branchement du vrai Video Pitch.

## CINEMATIC V23 — TRUE VIDEO PITCH ENGINE — 16/09/2026

Le redesign passe du prototype vidéo au **vrai signal vidéo du Talent**. Depuis `/talent/profile`, un Talent peut enregistrer une prise caméra/micro de 5–8 secondes ou importer un MP4/WebM/MOV de 25 Mo maximum. Le serveur `/api/auth/video-pitch` stocke le fichier dans le bucket Supabase `talent-pitches` et persiste `pitchVideoUrl`, `pitchVideoStoragePath`, `pitchVideoDurationMs` et `pitchVideoUpdatedAt` sur `User`. Le Match Lab Recruiter et le profil partagé consomment désormais ce vrai `pitchVideoUrl`; lorsqu'un Talent n'a pas encore de pitch, JOBLY l'indique explicitement au lieu de montrer le média de démonstration comme s'il était réel.

Référence détaillée : `TRUE-VIDEO-PITCH-ENGINE-V23.md`.

# J’IA — CEO DIGITAL DE JOBLY — 18/09/2026

J’IA possède désormais deux missions complémentaires dans la vision Jobly : **l’intelligence de carrière pour les utilisateurs** et **le CEO digital de Jobly pour l’administrateur/fondateur**. Le second rôle est un mandat de pilotage business 360°, distinct du chatbot user-facing.

## Mission CEO
J’IA doit assister l’administrateur dans la lecture, le pilotage et l’optimisation de Jobly : **CEO Intelligence, BI, Growth, Commercial, Finance, Market Intelligence, Operations et Customer Intelligence**.

Elle doit notamment surveiller les objectifs globaux de Jobly, les équipes et Partners, les KPI temps réel, l’acquisition, activation, rétention, conversion, revenus, coûts, marges, commissions, rentabilité, santé opérationnelle et signaux marché.

## CEO Cockpit
Le cockpit administrateur cible comprend :
- situation globale et priorités ;
- alertes ;
- projections 7 / 30 / 90 jours ;
- Profitability Engine ;
- Market Watch ;
- CEO Actions ;
- KPI temps réel ;
- objectifs Jobly / équipes / Partners ;
- rapports hebdomadaires et mensuels ;
- benchmarking et veille concurrentielle web sourcée ;
- recommandations commerciales, marketing et B2B/Partners.

Boucle de pilotage : **Observer → Comprendre → Prédire → Décider → Exécuter → Mesurer → Corriger → Apprendre.**

J’IA peut analyser, alerter, simuler, recommander et préparer une exécution. Les décisions juridiquement ou financièrement engageantes restent soumises à validation humaine explicite.

## Business Core confidentiel
Le CEO Core est séparé de l’intelligence exposée aux utilisateurs Talent/Recruiter/Partner. J’IA user-facing ne doit jamais divulguer finances, marges, objectifs, prévisions, stratégie, KPI internes, concurrence, commissions ou données permettant de les déduire. Le contrôle d’accès doit être technique, par rôle/permission, et audité.

## Rapports décisionnels
Les rapports doivent rester chiffrés, traçables et honnêtes : graphiques, tendances, prédictions de rentabilité explicitement présentées comme projections, veille concurrentielle sourcée, benchmarking et recommandations avec KPI de suivi.

## État d’implémentation
Cette vision CEO est désormais une **brique officielle de Jobly**, mais le cockpit CEO complet, Profitability Engine, Market Watch et orchestration des CEO Actions ne sont pas déclarés comme déjà codés tant qu’ils ne sont pas réellement implémentés et validés. Les fondations J’IA existantes doivent être réutilisées : mémoire, événements, contexte, gateway, garde-fous et audit.


## 2026-09-18 — J’IA Enterprise Brain + CEO Copilot

J’IA dispose désormais d’une mémoire institutionnelle persistante séparée de la mémoire personnelle des Talents.

### Mémoire institutionnelle
La table `JiaEnterpriseMemory` conserve des connaissances canoniques par domaine :
- VISION ;
- PRODUCT ;
- TECHNICAL ;
- COMMERCIAL ;
- ORGANIZATION ;
- GOVERNANCE.

La première base couvre la vision JOBLY 20/20, Career Twin, Campus, l’architecture technique, l’architecture J’IA, le modèle Recruiter/Recruit + Move, CEO Intelligence, les règles de confidentialité et l’organigramme fonctionnel connu.

### CEO Copilot
Le compte administrateur expose désormais **J’IA · CEO Copilot**. Les conversations sont persistées dans `JiaCEOConversation` / `JiaCEOMessage`, protégées par rôle ADMIN, et auditées via `CEOAuditLog`.

J’IA reçoit dans chaque échange :
- la mémoire institutionnelle JOBLY ;
- l’historique récent de la conversation ;
- le snapshot CEO calculé à partir des données Jobly réelles.

La réponse distingue faits, métriques, projections, hypothèses et informations manquantes. Aucun secret de provider n’est exposé.

### Principe de maturité
La présence d’une connaissance dans la mémoire ne signifie pas qu’une fonctionnalité est validée en production. J’IA conserve la distinction **CODÉ → TESTÉ → VALIDÉ → DÉPLOYÉ**.

### Sécurité
Le CEO Copilot est réservé au rôle ADMIN. Les informations CEO/confidentielles ne doivent jamais être exposées aux surfaces Talent, Recruiter ou Partner.

# CHECKPOINT 20/09/2026 — J’IA : IDENTITÉ VISUELLE DÉFINITIVE & MOTION SYSTEM

## Référence visuelle maître

La version de J’IA fournie par le fondateur le 20/09/2026 devient la **référence visuelle définitive** de J’IA pour le produit.

Caractéristiques à préserver :
- jeune femme africaine adulte, fin vingtaine ;
- beauté sophistiquée et présence de mannequin, sans esthétique enfantine ;
- expression chaleureuse, confiante et regard direct ;
- présence de **griotte moderne / gardienne de mémoire**, pas d’assistante corporate générique ;
- cheveux noirs naturellement crépus, coiffure simple et élégante ;
- lunettes rondes à monture dorée ;
- blazer bleu taillé ;
- foulard soie ambre/or avec motif géométrique textile discret ;
- pin minimaliste « J’IA » ;
- apparence entièrement humaine et organique ;
- aucun élément robotique, mécanique ou cybernétique ;
- aucun casque, antenne, tablette, dashboard, graphique, mallette ou badge RH ;
- composition utilisable en illustration complète et en avatar recadré.

**Règle de non-régression :** ne pas réinterpréter l'identité visuelle de J’IA lors d'une implémentation technique. Les animations doivent être construites autour du personnage, pas l'inverse.

## J’IA n’utilise pas des emojis pour exprimer ses intentions

Le système cible un **avatar animé réel** : lorsque J’IA veut saluer, pointer, réfléchir, valider ou célébrer, elle réalise physiquement le geste correspondant.

Les emojis peuvent rester des éléments textuels génériques de l'interface lorsque le produit en a besoin, mais **ils ne constituent pas le langage gestuel de J’IA**.

## J’IA Motion System

Les gestes sont définis comme un vocabulaire sémantique :

### CORE
1. Saluer / accueillir
2. Analyser / réfléchir
3. Pointer / expliquer
4. Écrire / prendre des notes
5. Valider / cocher
6. Alerter / attention
7. Envoyer / postuler
8. Célébrer / embauché

### ÉMOTIONNELS
9. Clin d’œil complice
10. Rassurer
11. Encourager
12. Déçue mais motivante
13. Surprise / offre parfaite
14. Curieuse
15. Fatiguée mais continue
16. Fière

### BUSINESS
17. Présenter un graphique
18. Serrer la main / partenariat
19. Présenter une équipe
20. Expliquer PAY OS
21. Appeler / relation RH
22. Filtrer / trier
23. Sécuriser / confidentiel
24. Dire au revoir / à demain

## Architecture cible

Le comportement de J’IA suit :

`CONTEXTE → INTENTION → MESSAGE → GESTE → CIBLE/POSITION → VOIX → ACTION`

Un même geste peut être réutilisé dans plusieurs parcours avec un message et une cible différents.

Pour les actions contextualisées, J’IA doit pouvoir :
- identifier l'élément concerné ;
- se positionner sans masquer l'action ;
- pointer physiquement vers la cible ;
- expliquer ce qu'il faut faire ;
- guider l'utilisateur jusqu'à l'action ;
- confirmer le résultat.

Sur mobile, la position et la taille de la cible doivent être recalculées selon le viewport.

## Voix, bouche et expression

Quand la voix est activée, la chaîne cible est :

`INTENTION → TEXTE LOCALISÉ → VOIX → ANIMATION FACIALE / BOUCHE`

Le texte affiché et la langue parlée doivent suivre la langue de l'utilisateur.

## Principe produit

J’IA doit être une **couche d'accompagnement contextuel du Career OS**, pas une mascotte animée en permanence.

Elle peut :
- accueillir ;
- expliquer ;
- anticiper un besoin ;
- proposer la prochaine action ;
- montrer où cliquer ;
- accompagner une difficulté ;
- exécuter ou déclencher l'action lorsque le système l'autorise ;
- confirmer le résultat.

Les animations doivent avoir une fonction sémantique. **Pas de mouvement gratuit ou permanent.**

## Statut

**SPÉCIFIÉ / RÉFÉRENCE VISUELLE FIGÉE → MOTION SYSTEM À IMPLÉMENTER ET À TESTER**

La référence visuelle est définie. Les 24 gestes constituent le vocabulaire cible ; leur implémentation technique, synchronisation voix/bouche et validation sur téléphone restent à réaliser.


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

# CHECKPOINT 20/09/2026 — J’IA PRODUCTION VISIBILITY / HARDENING

- Cause identifiée : la présence globale J’IA était explicitement masquée sur `/`, alors que la présence dédiée n’était pas rendue par la landing page ; cette condition a été retirée de `components/JiaPresence.tsx`.
- J’IA est désormais prévue comme présence globale hors écran `/ecosystem`, avec déplacement autonome, déplacement manuel, dialogue prédictif et geste sémantique via le composant global.
- Le rendu canonique a été durci dans `components/JiaRig.tsx` : suppression du fond blanc par flood-fill connecté avec tolérance aux artefacts JPEG, sans supprimer les blancs internes du personnage.
- Correctif GitHub : `483cf899f58c72af5a510692f1e84ff71bb760e6`.
- **État honnête : CODED sur `main` ; déploiement Vercel de ce correctif à confirmer.** La production actuellement observée reste sur un déploiement antérieur tant qu’un nouveau déploiement `READY` n’a pas été créé.
- Règle de validation : ne pas déclarer J’IA visuellement corrigée en production avant vérification du déploiement et du rendu réel.


## CHECKPOINT 20/09/2026 — J’IA GLOBAL VISIBILITY CORRECTION
- Recheck du code 2026-09-20: `components/JiaPresence.tsx` masquait encore J’IA sur `/` malgré la documentation précédente.
- Correction appliquée sur `main`: J’IA est désormais autorisée sur la landing page; seule `/ecosystem` reste masquée pour éviter le doublon avec sa scène dédiée.
- Commit correctif: `9bd4774e4593591655da99146d0eedd1a3d8ed82`.
- État Vercel: le dernier déploiement production vérifié reste `b8dc6ecf4247b7ea3ed85b11383000e502c690fc`; il ne contient pas encore ce correctif.
- Validation finale non déclarée: le déploiement automatique n’a pas créé de nouveau build après le push, et l’action de déploiement Vercel connectée retourne actuellement une erreur d’outil. Aucun rendu production corrigé n’est donc prétendu.


# RÈGLE ABSOLUE DE CONTINUITÉ — PROJET VERCEL CANONIQUE

**Projet Vercel unique à utiliser pour JOBLY : jobly-c0.6.5.1.**

- Projet Vercel : **jobly-c0.6.5.1**
- ID : prj_7B3nK76wDdgQbHK4WFz59DsKKYJQ
- Équipe : PORTFOLIO / portfolio-5555
- Dépôt source : **kenzimayaka-glitch/Jobly**
- Branche de production : **main**
- Alias attendu : **jobly-c0651.vercel.app**

### Interdiction de changer de projet
Toute intervention Vercel, tout diagnostic de déploiement et toute validation de production doivent être effectués **exclusivement sur ce projet**, sauf décision explicite du fondateur.

Les anciens projets/doublons (jobly_v0.1, jobly, jobly-v23, jobly-v23-test, jobly-v23-schema-test) ne doivent jamais être utilisés comme cible de déploiement ou comme source de vérité.

**Avant toute action Vercel : vérifier le nom du projet, l'ID et le dépôt kenzimayaka-glitch/Jobly. En cas de doute, ne pas changer de projet.**


## J’IA — COMMANDE VOCALE ET WAKE WORD

J’IA peut servir d’interface vocale du Career OS. Pour déclencher une action, l’utilisateur commence sa phrase par « J’IA ». J’IA lui explique elle-même cette règle.

Le moteur vocal V1 reconnaît notamment les intentions de recherche d’offres, filtrage, ouverture et candidature, puis les transmet via l’événement interne jobly:jia-command aux surfaces métier concernées.

**Sécurité financière :** les commandes de paiement, transfert d’argent ou confirmation de transaction sont bloquées avant toute émission d’action. J’IA ne dispose pas d’une capacité d’exécution de paiement.

**Interaction personnage :** J’IA reste immobile par défaut et l’utilisateur peut la déplacer au doigt. Sa bulle reste attachée au personnage.

**Compatibilité :** la reconnaissance vocale dépend des capacités du navigateur et de l’autorisation microphone ; la Web Speech API est utilisée lorsqu’elle est disponible.


# CHECKPOINT 20/09/2026 — J’IA SETTINGS / ACCÈS PAR ÉCOSYSTÈME

J’IA dispose désormais d’une configuration dédiée dans les paramètres de chaque écosystème : **Talent, Recruiter et Partner**.

Pour chaque écosystème, l’utilisateur peut choisir :
- **Accès J’IA** : autorisée / désactivée ;
- **Réponse J’IA** : texte seulement / vocal ;
- **Notifications J’IA** : texte seulement / vocal ;
- **Recommandations proactives** : activées / désactivées.

Les préférences sont isolées par écosystème et persistées dans Supabase (`public.jia_preferences`) avec RLS par utilisateur.

J’IA peut expliquer elle-même ces choix et orienter l’utilisateur vers la bonne option. Le choix reste modifiable à tout moment. Les permissions vocales et notifications du téléphone/navigateur restent toujours sous le contrôle du système.


## CHECKPOINT J’IA — CHANTIER COMPLET PRÉPARÉ

La branche `chore/jia-complete-bulk` regroupe le correctif J’IA en bloc : personnage complet sans clipping, transparence conservée, visage animé (yeux/sourcils/bouche/lip-sync), mouvements sémantiques de tête, déplacement manuel uniquement, dialogue jaune canari + bleu lisible, modes Texte/Vocal réellement respectés, préférences Talent/Recruiter/Partner, Brain transversal, proactivité et garde-fou financier renforcé.

**Aucun build Vercel n’est déclenché automatiquement.** Le chantier attend l’autorisation explicite du fondateur pour fusion/build et validation E2E.

# CHECKPOINT 21/09/2026 — AUDIT TRADUCTION FR ↔ EN

La traduction devient un critère transversal de finition du produit.

## Exigence
Audit de **100 % de l’application** : routes, écrans, composants, états dynamiques, formulaires, CTA, navigation, notifications, modales, dashboards, Talent, Recruiter, Partner, CV, ATS, Career OS/GPS, Opportunities, Mobility, J’IA, paramètres, abonnements, paiements et contenus générés.

## Règles
- français naturel et professionnel ;
- anglais naturel et professionnel ;
- terminologie métier cohérente ;
- aucune chaîne utilisateur dans la mauvaise langue ;
- aucun texte hardcodé contournant volontairement le système de langue ;
- clés manquantes, inutilisées ou incohérentes à identifier ;
- contenus dynamiques/API et messages J’IA inclus ;
- responsive mobile/desktop contrôlé après traduction ;
- l’attribut HTML de langue doit suivre la langue réellement active.

## Méthode de certification
**page → composant → texte → clé → FR → EN → contexte → affichage mobile/desktop → build → tests → recontrôle.**

L’audit est **EN COURS / NON CERTIFIÉ** tant que l’inventaire et les tests complets ne sont pas terminés.


# CHECKPOINT 21/09/2026 — AUDIT TRADUCTION FR ↔ EN

L’audit de traduction transversal est **EN COURS / NON CERTIFIÉ**.

- Authentification/onboarding inspectés en profondeur.
- Des chaînes hardcodées hors i18n ont été identifiées et la correction du mécanisme global de langue a commencé.
- `components/LanguageSync.tsx` synchronise désormais l’attribut HTML de langue avec `jobly-lang`.
- La certification exige encore l’audit de toutes les routes, composants, états conditionnels, contenus dynamiques/API, J’IA, messages générés, clés i18n et affichages mobile/desktop.
- Build, tests de régression et déploiement de la version traduite restent à effectuer avant toute certification.
- **Ne pas déclarer Jobly terminé sur la base de ce checkpoint.**


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

## CHECKPOINT 26/09/2026 — HARDENING FINAL DU MATCHING

Avant le prochain build unique, le moteur d'offres a reçu une passe de durcissement :
- absence totale de données d'expérience ≠ 0 année : le critère devient **Non renseigné / UNKNOWN** et réduit la confiance au lieu de pénaliser artificiellement le candidat ;
- extraction des compétences attendues renforcée à partir des tags, du vocabulaire de compétences métier/technique et des sections d'exigences ;
- les compétences détectées sont comparées aux compétences réellement présentes dans le profil candidat ;
- la langue explicitement portée par l'offre est désormais incluse dans le matching ;
- les types de données non textuels dans `aiSkills` sont ignorés plutôt que transformés en valeurs parasites ;
- le dashboard Talent consomme désormais `totalAvailable` et ne met en avant que les offres à **50 % ou plus** dans son carrousel de correspondances.

Le flux marché conserve le total de toutes les offres disponibles ; le filtre **Les offres qui vous correspondent** applique le seuil de 50 % sans masquer artificiellement le marché global.

**État : 🔧 CORRIGÉ → 🧪 TYPECHECK / BUILD / VALIDATION VISUELLE À CONFIRMER.**

## CHECKPOINT 26/09/2026 — PRÉPARATION DU BUILD UNIQUE FINAL

Après le durcissement du matching, l'état de référence du projet est désormais le commit `e5d0bddf51ef2581c963b4c68716ce0e4698459d` sur `main`.

- Les corrections de matching et de dashboard sont regroupées dans `main`.
- Aucun nouveau projet Vercel n'a été créé : le projet canonique reste `jobly-c0.6.5.1`.
- Les anciens déploiements ERROR ne constituent pas des versions séparées à fusionner : leurs changements sont déjà cumulés dans l'historique de `main`.
- L'objectif est désormais **un seul build final**, puis un seul déploiement de cette référence consolidée.
- La tentative de déclenchement via le connecteur Vercel n'a pas pu être exécutée : le catalogue expose `deploy_to_vercel`, mais le serveur connecté retourne actuellement `Tool deploy_to_vercel not found`.
- Le build complet n'est pas encore certifié depuis cet environnement : le dépôt ne peut pas être cloné ici et aucun workflow GitHub exploitable n'est associé au commit de référence.

**État honnête : 🔧 CODE + DOCUMENTATION CONSOLIDÉS → 🧪 BUILD UNIQUE / LOGS / VALIDATION VISUELLE / DÉPLOIEMENT À EFFECTUER DÈS QUE LE CONNECTEUR VERCEL EST RÉTABLI.**

**Règle de déploiement : aucun déploiement supplémentaire ne doit être lancé avant cette étape de validation.**


# CHECKPOINT 26/09/2026 — JOB SOURCES / INGESTION CAMEROUN

Un audit dédié des sources d'offres a été réalisé et documenté dans `AUDIT-JOB-SOURCES-2026-09-26.md`.

État réel JOBLY-PROD au 26/09/2026 : **232 offres externes actives** réparties entre Job in Cameroun (99), Emplois Cameroun (66), JobInfoCamer (35), FNE Cameroun (21), Emploi.cm (9) et Cameroon Desks (2). Le tableau `Job` contient 317 lignes au total.

Nouvelle piste prioritaire : **MinaJobs dispose d'un RSS public et indique explicitement que son contenu peut être intégré avec lien retour vers la source**. Techmap documente également une couverture spécifique du Cameroun et une API/flux structurés. JobsPipe propose une API normalisée filtrable par pays, mais la couverture CM doit être mesurée avec un accès réel.

Règle : ne pas ajouter de scraping non autorisé. L'architecture cible est multi-source → normalisation → déduplication → enrichissement entreprise → matching Jobly/J'IA. Aucun déploiement Vercel n'est déclenché automatiquement.

---

# DÉCISION PRODUIT — PARCOURS CANDIDATURE WHATSAPP → TALENT → RECRUITER
## 26/09/2026 — Parcours et onboarding Recruiter figés

Cette section constitue la référence produit pour le parcours de candidature via WhatsApp et la conversion d'un recruteur externe en utilisateur Recruiter Jobly.

### 1. Parcours côté Talent — candidature

**Principe fondamental : WhatsApp est un canal de candidature intégré à Jobly, pas un remplacement de Jobly.**

- Toute offre visible dans Jobly nécessite un compte Jobly.
- Le Talent possède déjà son compte Jobly avant de candidater.
- Si une offre ne propose pas de formulaire/email mais fournit un numéro WhatsApp, le Talent peut cliquer sur **Postuler via WhatsApp**.
- Le lien WhatsApp doit conserver le contexte sécurisé de l'offre et de la candidature.
- La candidature doit être enregistrée dans Jobly comme une vraie **Application**, liée au Talent et au Job, avec sa provenance **WhatsApp**.
- Le Talent ne recrée jamais son profil pour cette candidature.
- Le recruteur reçoit le contexte de candidature via WhatsApp, mais Jobly conserve la candidature et son historique dans son propre système.

Flux de référence :

```
Talent Jobly
  ↓
Offre Jobly
  ↓
Postuler via WhatsApp
  ↓
WhatsApp
  ↓
Application Jobly créée / enregistrée
  ↓
Lien CV sécurisé transmis au recruteur
```

### 2. Étape B — recruteur non inscrit

Le recruteur qui n'a pas encore de compte Jobly arrive sur le CV du Talent qui vient de postuler.

**À cette étape, il ne voit PAS l'analyse J’IA du candidat qui a postulé.**

Il voit :

- le CV du candidat ayant postulé ;
- la possibilité de consulter/télécharger ce CV en fermant la boîte de dialogue ;
- l'existence d'autres Talents Jobly correspondant à l'offre.

En cliquant **Voir**, il découvre **uniquement les autres candidats qui matchent l'offre et qui n'ont pas postulé**.

Pour ces autres profils, Jobly peut afficher :

- profil public autorisé ;
- score de matching ;
- explication du matching ;
- forces ;
- points à développer / écarts ;
- projection J’IA ;
- informations publiques autorisées.

Le candidat qui a effectivement postulé n'est donc pas mélangé à cette découverte : son CV reste le contenu principal de la page.

### 3. Bouton « Fermer »

Le bouton **Fermer** ferme uniquement l'interface de découverte/interstitiel.

Le recruteur revient au CV du candidat ayant postulé et peut :

- lire le CV ;
- le télécharger.

Aucune création de compte n'est imposée pour simplement consulter le CV transmis dans ce parcours.

### 4. Coordonnées des autres profils

Lorsqu'un recruteur non inscrit clique sur **Voir les coordonnées** d'un autre Talent correspondant :

```
Voir les coordonnées
        ↓
Interface Jobly
        ↓
Créer un compte / Se connecter
```

C'est **à ce moment précis** que Jobly demande la création du compte.

Le parcours ne doit pas transformer WhatsApp en produit payant : la valeur payante concerne l'accès recruteur, l'intelligence de recrutement et les coordonnées/actions protégées, pas l'envoi de la candidature WhatsApp.

### 5. Code d'accès à usage unique — preuve de provenance de l'offre

Lorsqu'il choisit de créer/se connecter depuis ce parcours, Jobly affiche une interface avec un **code numérique unique à 6 chiffres** (exemple : `042361`) et une petite icône de copie.

Texte de référence :

> **VOTRE CODE D'ACCÈS**
>
> `042361`  📋
>
> *Ceci est votre code d'accès, copiez-le.*
>
> **Inscrivez-vous et choisissez « Recruteur ».**

**L'affichage de cette interface déclenche le téléchargement/lancement du parcours d'installation Jobly.**

Le code :

- est généré côté serveur ;
- est lié au contexte sécurisé de l'offre et de la candidature à l'origine du parcours ;
- est temporaire ;
- est à usage unique ;
- ne doit pas être considéré comme une preuve juridique de propriété de l'entreprise ;
- sert de preuve technique que le compte Recruiter revendique l'offre depuis son parcours de provenance Jobly.

Le code ne doit pas être placé en clair dans l'URL. Le serveur doit conserver une représentation sécurisée du secret et invalider le code après utilisation.

### 6. Installation et inscription Recruiter

Après le téléchargement :

1. le recruteur installe Jobly ;
2. il crée son compte ;
3. il choisit **Recruiter** ;
4. Jobly détecte le contexte de provenance conservé par le parcours ;
5. Jobly affiche une interface demandant le **code d'accès à 6 chiffres** ;
6. le recruteur saisit le code ;
7. Jobly vérifie que le code est valide, non expiré et non utilisé ;
8. si la vérification réussit, l'offre est automatiquement rattachée à son espace Recruiter.

Le recruteur ne doit **jamais recréer l'offre**.

### 7. Retour immédiat vers le CV

Après validation du code et connexion, Jobly doit préserver le contexte initial.

Le recruteur revient directement au **CV du Talent qui avait postulé**.

Il ne doit pas arriver sur un dashboard vide ni devoir rechercher l'offre manuellement.

### 8. Espace Recruiter après vérification

L'offre à l'origine du parcours apparaît automatiquement dans Recruiter.

Le recruteur retrouve immédiatement :

- l'offre concernée ;
- la candidature du Talent qui avait postulé via WhatsApp ;
- le CV et les documents disponibles ;
- les futures candidatures reçues pour cette offre ;
- les autres candidatures déjà enregistrées dans Jobly ;
- les fonctions de matching et d'analyse autorisées.

À partir du compte Recruiter, il peut consulter l'analyse du candidat ayant postulé, ce qui était volontairement masqué avant création du compte.

### 9. Coordonnées et abonnement

Après création du compte, le recruteur peut consulter les autres candidatures et profils selon ses droits.

Les coordonnées des profils protégés restent soumises aux **entitlements/abonnement** prévus par Jobly.

Décision actuelle :

- les profils et le matching peuvent démontrer la valeur du produit ;
- l'accès aux coordonnées protégées est une fonctionnalité recruteur soumise aux droits ;
- les **meilleurs profils non-applicants** peuvent être soumis au niveau d'abonnement Premium/Pro défini par le catalogue Jobly ;
- l'upsell doit rester contextuel et discret.

### 10. Analyse J’IA — règle de séparation

J’IA ne doit pas décider si un recruteur doit embaucher.

Elle doit distinguer :

**Matching**
- à quel point le profil correspond à l'offre ;
- pourquoi ;
- forces ;
- gaps/points à développer.

**Projection**
- trajectoires professionnelles possibles ;
- évolution potentielle à 3–6, 6–12, 12–18 mois lorsque les données permettent une projection ;
- conditions/actions susceptibles de favoriser cette trajectoire ;
- hypothèses et niveau de confiance.

Le même socle d'intelligence sert Talent et Recruiter, avec des données et actions adaptées aux permissions de chacun.

### 11. Identification du recruteur — limite du code

Le code d'accès permet à Jobly de rattacher techniquement le nouveau compte au **contexte de l'offre**.

Il ne doit pas être présenté comme une preuve légale que la personne est propriétaire de l'entreprise.

Le modèle doit donc distinguer :

- **Identité du compte vérifiée** ;
- **Contexte d'offre revendiqué via code** ;
- **Entreprise vérifiée**, si une vérification complémentaire existe ;
- **Autorisation sur l'offre** ;
- **Propriétaire/administrateur de l'offre**, lorsque ce statut est réellement établi.

Le code sert donc à établir la continuité sécurisée du parcours et l'autorisation de récupération de l'offre, sans inventer une preuve juridique d'identité employeur.

### 12. Sécurité du claim

Le mécanisme cible doit empêcher :

- la réutilisation d'un code ;
- l'utilisation d'un code expiré ;
- la modification du contexte dans l'URL ;
- la revendication arbitraire d'une autre offre ;
- l'accès à des coordonnées ou documents non autorisés.

Objet logique cible :

```
AccessClaim
- id
- codeHash
- jobId
- applicationId
- sourceTokenId
- expiresAt
- usedAt
- usedByUserId
- status
```

Le nom exact du modèle peut évoluer avec le schéma existant, mais les garanties fonctionnelles sont figées.

### État de la décision

**🟦 DÉCISION PRODUIT FIGÉE → SPÉCIFIÉE → IMPLÉMENTATION À RÉALISER → TESTS À EFFECTUER**

Cette section documente le comportement cible. Elle ne signifie pas que tout le parcours est déjà codé, testé, validé ou déployé.


# CHECKPOINT 26/09/2026 — J’IA RECRUTEMENT : MATCHING → PROJECTION → FEEDBACK

## Modèle d'intelligence figé

J’IA ne doit pas être réduite à un simple indicateur « ce candidat correspond / ne correspond pas ». Le modèle cible sépare explicitement :

1. **Matching Engine — Est-ce que le profil correspond à l'offre ?**
   - métier/fonction ;
   - compétences ;
   - expérience ;
   - formation ;
   - langues ;
   - localisation ;
   - secteur ;
   - critères réellement présents dans l'offre.
   - Une donnée inconnue est **Non renseignée** et ne doit pas être transformée automatiquement en échec.

2. **Explainability — Pourquoi ?**
   - forces ;
   - gaps / points à développer ;
   - éléments de preuve ;
   - distinction entre données connues, déclarées, documentées, vérifiées et inférées.

3. **Projection Engine — Comment le profil pourrait-il évoluer ?**
   - projection conditionnelle à **3–6 mois, 6–12 mois et 12–18 mois** lorsque les données le permettent ;
   - trajectoire possible ;
   - conditions et actions pouvant favoriser cette trajectoire ;
   - hypothèses ;
   - éléments observés ;
   - niveau de confiance ;
   - date de la projection.
   
   Cette projection n'est **pas** une prédiction d'embauche et J’IA ne doit jamais décider à la place du recruteur.

4. **Recommendation Engine — Que peut-on faire ensuite ?**
   - Talent : développer une compétence, adapter le CV, préparer un entretien, combler un gap, acquérir une expérience, explorer une autre offre, etc. ;
   - Recruiter : approfondir un point en entretien, demander une information manquante, examiner une compétence, poursuivre ou non le processus selon sa propre décision.

5. **Reputation / Feedback Engine — Que montrent les interactions professionnelles vérifiées ?**
   - retours de recruteurs ;
   - évaluations vérifiées ;
   - tendances de points forts ;
   - axes d'amélioration ;
   - évolution du Career Twin.

## Chaîne cible

```text
CANDIDATURE
↓
MATCHING J’IA
↓
FORCES / GAPS
↓
ANALYSE J’IA
↓
PROJECTION
3–6 / 6–12 / 12–18 mois
↓
RECOMMANDATIONS
↓
DÉCISION HUMAINE
↓
RECRUTÉ / NON RETENU
↓
FEEDBACK PROFESSIONNEL
↓
⭐ 1–5
↓
CAREER TWIN MIS À JOUR
↓
NOUVELLE PROJECTION J’IA
```

### Règle centrale

**J’IA explique, projette, recommande et apprend du parcours. Le recruteur décide.**

Les projections doivent rester conditionnelles et explicables :

`projection → preuves observées → hypothèses → conditions → confiance`

J’IA ne doit pas utiliser de caractéristiques sensibles ou de proxys sensibles pour prendre ou recommander une décision de recrutement.

## Feedback recruteur après non-recrutement

Lorsqu'un Talent n'est pas retenu, Jobly peut demander au recruteur un **feedback professionnel** et une **évaluation de 1 à 5 étoiles** afin qu'une interaction professionnelle réelle puisse produire une valeur de carrière même sans embauche.

### Conditions d'accès

Le feedback + étoiles sont réservés aux recruteurs **Premium et Pro**, et uniquement lorsqu'une **interaction réelle et vérifiée** avec le candidat est enregistrée.

Exemples d'interactions vérifiables :
- candidature reçue et examinée ;
- CV ouvert ;
- entretien réalisé dans Jobly ;
- candidature clôturée ;
- autre interaction de recrutement effectivement journalisée.

Un abonnement Premium/Pro ne suffit donc pas à lui seul.

### Anti-abus

Le système doit limiter :
- comptes créés uniquement pour noter ;
- notation sans interaction réelle ;
- volumes anormaux ;
- répétitions ou schémas coordonnés ;
- comportements susceptibles de fausser artificiellement la réputation.

Les évaluations suspectes peuvent être placées en vérification avant publication.

### Présentation au Talent

La réputation ne doit pas devenir une valeur humaine globale ni un classement arbitraire. La présentation cible est contextualisée, par exemple :
- **Crédibilité professionnelle : 4,6/5** ;
- nombre d'évaluations vérifiées ;
- nombre de recruteurs ayant évalué ;
- forces récurrentes ;
- axes d'amélioration récurrents.

Le Talent doit pouvoir consulter les retours, en tirer des enseignements et contester un feedback manifestement faux ou abusif.

Les feedbacks vérifiés peuvent enrichir le **Career Twin**. J’IA peut ensuite identifier des tendances sans transformer une évaluation individuelle en vérité absolue.

## État

**🟦 SPÉCIFIÉ / DÉCISION FIGÉE**

Cette architecture n'est pas déclarée CODÉE, TESTÉE, VALIDÉE ou DÉPLOYÉE tant que l'implémentation, les permissions, l'anti-abus, les tests E2E et la production n'ont pas été vérifiés selon la règle **CODÉ → TESTÉ → VALIDÉ → DÉPLOYÉ**.


# CHECKPOINT 26/09/2026 — RECRUITMENT WORKFLOW : COMMUNICATION → ENTRETIEN → DÉCISION → FEEDBACK

## Décision produit figée

JOBLY étend le parcours Recruiter au-delà de la réception et de l'analyse des candidatures : **le recruteur doit pouvoir piloter toute la relation de recrutement avec le Talent depuis Jobly**, tout en laissant la décision humaine au recruteur.

Le parcours cible est :

```text
CANDIDATURE
↓
MATCHING J’IA
↓
ANALYSE
↓
SÉLECTION RECRUTEUR
↓
┌────────────────┬────────────────┐
│                │                │
EMAIL         WHATSAPP        ENTRETIEN
│                │                │
│                │       Présentiel / Visio
│                │                │
└────────────────┴────────┬───────┘
                         ↓
                  RAPPELS J’IA
                    1h / 5 min
                         ↓
                  DÉCISION HUMAINE
                    ↙         ↘
                VALIDÉ       REFUSÉ
                   ↓             ↓
              NOTIFICATION   FEEDBACK
                   ↓             ↓
              CAREER TWIN ←─────┘
                         ↓
                  NOUVELLE ANALYSE
                         ↓
                    PROJECTION
```

## 1. Communication recruteur → Talent

Tout recruteur Jobly peut communiquer avec un Talent dans le cadre d'une interaction de recrutement réelle.

### Email

Le recruteur peut :
- envoyer un message individuel ;
- sélectionner plusieurs candidats et envoyer un message en bulk ;
- choisir une intention parmi des modèles J’IA préconfigurés ;
- envoyer une invitation d'entretien ;
- confirmer une étape ;
- valider une candidature ;
- informer d'un refus ;
- transmettre un feedback professionnel.

J’IA doit proposer des modèles prêts à l'emploi, configurés selon le contexte de la candidature, tout en laissant le recruteur garder le contrôle du contenu final.

Chaque communication email doit laisser une trace dans Jobly.

Le Talent reçoit :
- l'email ;
- une notification Jobly ;
- lorsque pertinent, les informations utiles dans sa timeline de candidature.

Le recruteur et le Talent Jobly disposent d'une trace de l'échange selon leurs permissions.

Les emails peuvent intégrer une **présence de marque Jobly discrète et clairement identifiable**, sans masquer le contenu du recruteur ni donner l'impression que Jobly parle à sa place.

### WhatsApp

Pour WhatsApp, le principe est **prérempli mais non automatique** :
- le recruteur sélectionne le Talent ;
- J’IA prépare le message adapté au contexte ;
- Jobly redirige vers le WhatsApp du Talent avec le message prérempli ;
- le recruteur doit cliquer lui-même sur **Envoyer**.

Jobly ne doit donc pas envoyer automatiquement un message WhatsApp au nom du recruteur sans action explicite de celui-ci.

WhatsApp reste un canal de communication/candidature, pas un mode d'authentification Jobly.

## 2. Entretien

### Entretien en présentiel

Le recruteur peut définir :
- date ;
- heure ;
- lieu ;
- adresse ou point de rendez-vous ;
- détails pratiques ;
- consignes éventuelles.

J’IA génère ensuite une communication claire contenant ces informations.

Le Talent reçoit la proposition et la trace apparaît dans sa timeline de candidature.

### Entretien en visioconférence

Le recruteur peut choisir un entretien vidéo.

Lorsque l'intégration Google autorisée est réellement disponible, Jobly/J’IA peut :
- créer le lien Google Meet ;
- associer date et heure ;
- enregistrer l'événement dans le calendrier du Talent ;
- enregistrer l'événement dans le calendrier du recruteur ;
- conserver le lien et les métadonnées de l'entretien dans Jobly.

**Règle technique : Jobly ne doit jamais inventer un lien Google Meet.** La création réelle du lien nécessite une intégration Google autorisée et les permissions correspondantes.

Sans intégration/autorisation disponible, Jobly doit demander ou permettre au recruteur de fournir une solution de visioconférence au lieu de prétendre avoir créé un Meet.

## 3. Rappels J’IA

Pour les entretiens planifiés, J’IA devient un assistant de préparation et de ponctualité.

### Rappel 1 heure avant

Message cible :

> **Votre entretien commence dans 1h. Assurez-vous d’être dans un endroit calme, avec une connexion stable et suffisamment de batterie. Si ce n’est pas possible, préparez-vous à rejoindre l’entretien dans de meilleures conditions.**

Le rappel peut être délivré selon les préférences configurées :
- notification Jobly ;
- email ;
- éventuellement vocal si le mode vocal est activé.

### Rappel 5 minutes avant

J’IA rappelle au Talent et/ou au recruteur, selon le contexte et les permissions :

> **Votre entretien commence dans 5 minutes. Connectez-vous maintenant et rejoignez la salle d’attente.**

Pour une visioconférence, le rappel doit permettre l'accès direct à l'événement/lien lorsque celui-ci existe réellement.

## 4. Validation ou refus de candidature

Le recruteur conserve la décision finale.

Après sélection d'une ou plusieurs candidatures, Jobly doit permettre :
- **Valider la candidature** ;
- **Refuser la candidature** ;
- envoyer immédiatement la communication correspondante ;
- notifier le Talent ;
- enregistrer l'événement dans la timeline ;
- déclencher, lorsque le recruteur y a droit et qu'une interaction réelle existe, le feedback professionnel.

Le même principe de communication s'applique à l'email et au parcours WhatsApp.

## 5. Communication bulk

Le bulk est destiné aux actions répétitives et légitimes du recruteur.

Exemple :
- le recruteur sélectionne 12 candidats ;
- clique sur **Invitation entretien** ;
- J’IA prépare 12 messages contextualisés ;
- chaque Talent reçoit son message individuel ;
- Jobly enregistre chaque envoi comme événement distinct.

Le système doit éviter un simple copier-coller identique lorsque les données individuelles permettent une personnalisation utile.

## 6. Timeline de candidature

Chaque candidature doit pouvoir évoluer vers une timeline structurée :

```text
Candidature reçue
↓
CV consulté
↓
Entretien proposé
↓
Invitation envoyée
↓
Entretien confirmé
↓
Rappel 1h
↓
Entretien
↓
Décision
↓
Feedback
↓
Candidature clôturée
```

Les événements doivent être horodatés et rattachés à l'Application concernée.

## 7. J’IA dans le workflow recruteur

J’IA peut :
- proposer le bon modèle de communication ;
- personnaliser le contenu ;
- rappeler les prochaines étapes ;
- expliquer les informations manquantes ;
- préparer l'entretien ;
- déclencher les rappels autorisés ;
- synthétiser l'historique de candidature ;
- intégrer le feedback vérifié dans le Career Twin.

J’IA **ne décide pas de recruter ou de rejeter** et ne doit pas présenter une projection comme une certitude.

## 8. Feedback et étoiles

Le **feedback professionnel** peut être produit par tout recruteur Jobly lorsqu'une interaction réelle et vérifiable avec le Talent existe, notamment après :
- examen de candidature ;
- échange ;
- entretien ;
- validation ou refus.

Les **évaluations 1–5 étoiles et fonctions avancées de réputation** restent soumises aux règles Premium/Pro déjà figées, avec interaction réelle vérifiée et protections anti-abus.

Ainsi :
- feedback professionnel ≠ privilège exclusivement Premium/Pro ;
- notation ⭐1–5 / réputation avancée = entitlement Premium/Pro ;
- aucune notation sans interaction vérifiée.

Les feedbacks vérifiés peuvent alimenter le Career Twin et les analyses futures, sans devenir une vérité absolue sur le Talent.

## 9. Permissions, confidentialité et traçabilité

Le système doit distinguer :
- action proposée par J’IA ;
- action décidée par le recruteur ;
- communication préparée ;
- communication effectivement envoyée ;
- notification Jobly ;
- événement d'entretien ;
- feedback ;
- décision finale.

Les coordonnées et données privées restent protégées par les permissions et entitlements.

Les communications et événements doivent être journalisés de façon exploitable pour la timeline et l'audit.

## 10. État

**🟦 SPÉCIFIÉ / DÉCISION FIGÉE — 26/09/2026**

Cette fonctionnalité n'est pas déclarée CODÉE, TESTÉE, VALIDÉE ou DÉPLOYÉE.

### Pré-requis techniques à réaliser

1. Modèle d'événements/timeline de candidature.
2. Service de communication email individuel/bulk.
3. Templates J’IA contextualisés.
4. Notifications Jobly associées aux communications.
5. Intégration WhatsApp préremplie avec action explicite d'envoi.
6. Workflow d'entretien présentiel.
7. Intégration Google Calendar/Google Meet réellement autorisée.
8. Création et persistance sécurisée des événements.
9. Rappels J’IA 1h/5min.
10. Décision validation/refus et clôture de candidature.
11. Feedback professionnel et règles Premium/Pro pour les étoiles.
12. Anti-abus et permissions.
13. Tests E2E mobile/desktop et tests des communications.
14. Vérification réelle avant toute certification production.

**Règle : CODÉ → TESTÉ → VALIDÉ → DÉPLOYÉ.**


# CHECKPOINT 26/09/2026 — CYCLE DE RECRUTEMENT COMPLET : OFFRE → CANDIDATURE → ÉVALUATION → DÉCISION → SUITE

## Décision produit consolidée

Le cycle de recrutement JOBLY est désormais défini comme un **workflow complet et configurable par offre**, et non comme une succession d'écrans indépendants. Une offre possède un pipeline ; chaque candidature possède sa progression réelle dans ce pipeline ; chaque étape peut avoir ses propres tâches, événements, évaluations, communications et règles d'automatisation.

### Chaîne cible de bout en bout

~~~
BESOIN RECRUTEUR
↓
CRÉATION DE L’OFFRE
↓
PUBLICATION / DIFFUSION
↓
CANDIDATURE
(Jobly / WhatsApp intégré)
↓
MATCHING J’IA
↓
ANALYSE / EXPLICABILITÉ
↓
PRÉSÉLECTION RECRUTEUR
↓
PIPELINE CONFIGURÉ POUR L’OFFRE
↓
ÉTAPE N
  ├─ communication
  ├─ tâche / test / entretien
  ├─ résultat
  ├─ analyse J’IA
  ├─ décision recruteur
  └─ feedback
↓
SI VALIDÉ → ÉTAPE SUIVANTE
SI REFUSÉ → FEEDBACK / CLÔTURE
SI PAUSE → DOSSIER CONSERVÉ
↓
...
↓
DÉCISION FINALE
↓
OFFRE D’EMBAUCHE
↓
ACCEPTATION / REFUS
↓
ONBOARDING
↓
CAREER COMPANION / CAREER TWIN
~~~

## 1. Pipeline configurable par offre

Le pipeline appartient au **Job**. L’Application enregistre l’état réel du candidat dans chaque étape.

Architecture cible :

~~~
JOB
 ↓
RECRUITMENT PIPELINE
 ↓
STAGE
 ↓
CONFIGURATION / CONDITIONS / ACTIONS

APPLICATION
 ↓
APPLICATION STAGE
 ↓
STATUS / DATES / EVENTS / RESULTS / FEEDBACK
~~~

Le recruteur peut définir, selon le poste :
- les étapes ;
- leur ordre ;
- les étapes obligatoires ou optionnelles ;
- les étapes répétables ;
- les conditions de passage ;
- les communications ;
- les tests et évaluations ;
- les délais ;
- les rappels ;
- le niveau d’automatisation.

Exemple :

~~~
Candidature
→ Présélection
→ Test métier
→ Entretien RH
→ Test technique
→ Entretien manager
→ Entretien final
→ Validation
→ Offre d’embauche
→ Embauche
~~~

Une candidature peut être à une étape différente d’une autre candidature pour la même offre.

## 2. Types d’étapes

Le moteur doit pouvoir supporter au minimum :
- SCREENING ;
- INTERVIEW ;
- VIDEO_INTERVIEW ;
- ONSITE_INTERVIEW ;
- TECHNICAL_TEST ;
- ASSESSMENT ;
- PRESENTATION ;
- REFERENCE_CHECK ;
- SALARY_DISCUSSION ;
- FINAL_INTERVIEW ;
- OFFER ;
- CUSTOM.

Une étape peut contenir des **tasks/events** sans transformer chaque micro-action en nouvelle étape.

## 3. Tests candidats

JOBLY peut proposer plusieurs familles de tests :
- QCM métier ;
- cas pratique ;
- test technique ;
- mise en situation ;
- test rédactionnel ;
- test commercial ;
- test linguistique ;
- présentation ;
- étude de cas ;
- test personnalisé créé par le recruteur.

Le recruteur définit les critères et pondérations lorsque l’évaluation est structurée. Exemple :

~~~
TEST — Commercial Terrain

Découverte du besoin       25 %
Argumentation              25 %
Traitement des objections  20 %
Conclusion commerciale     20 %
Communication              10 %
~~~

J’IA ne doit pas inventer les critères d’évaluation du poste. Elle peut proposer une structure, mais le recruteur conserve la configuration finale.

## 4. Administration du test

Le candidat reçoit une invitation contextualisée, avec durée, échéance, règles et accès au test.

Deux modes doivent être distingués :

**ENTRAÎNEMENT** : J’IA peut aider et expliquer.

**ÉVALUATION** : J’IA peut expliquer les règles mais ne répond pas à la place du candidat et ne doit pas fournir les réponses attendues pendant l’évaluation.

Le système doit gérer :
- début ;
- progression ;
- soumission ;
- délai ;
- expiration ;
- absence de soumission ;
- tentative(s) autorisée(s) ;
- reprise si explicitement permise ;
- traçabilité.

## 5. Analyse J’IA du résultat

Après soumission, J’IA sépare :

**Correction objective**
- réponse donnée ;
- réponse attendue lorsque celle-ci existe ;
- résultat par question/critère.

**Analyse**
- forces ;
- lacunes ;
- éléments à approfondir ;
- preuves provenant des réponses ;
- niveau de confiance ;
- informations manquantes.

**Synthèse recruteur**

Exemple cible :

> **82/100 — poursuivre vers l’entretien manager.**
> - Découverte du besoin : 90 %
> - Argumentation : 85 %
> - Objections : 78 %
> - Conclusion : 75 %
> - Communication : 88 %
> - Point à approfondir : traitement des objections complexes.

Le recruteur peut ensuite consulter les réponses détaillées et le corrigé lorsque celui-ci est disponible.

Un score de test reste une **preuve contextualisée**, datée et liée à un test précis ; il ne doit pas être transformé en vérité globale sur la valeur professionnelle du Talent.

## 6. Décision humaine à chaque étape

J’IA peut analyser et proposer une prochaine action, mais le recruteur décide lorsque l’étape est configurée comme nécessitant une validation humaine.

Actions cibles :
- **VALIDER** ;
- **REFUSER** ;
- **REVENIR À UNE ÉTAPE PRÉCÉDENTE** ;
- **METTRE EN PAUSE** ;
- **DEMANDER UNE VÉRIFICATION** ;
- éventuellement **RÉOUVRIR** une étape selon les permissions.

Chaque décision doit enregistrer qui l’a prise, quand, sur quelle candidature et à quelle étape.

## 7. Trois niveaux d’automatisation

Le recruteur peut configurer le comportement après une décision :

### MANUEL
J’IA prépare ; le recruteur déclenche l’action suivante.

### ASSISTÉ
J’IA prépare et demande confirmation avant l’exécution.

### AUTOMATIQUE
Une règle préconfigurée exécute la suite **après la décision humaine requise**.

Exemple :

~~~
Test terminé
↓
Analyse J’IA
↓
Recruteur : VALIDER
↓
Feedback automatique
↓
Notification Talent
↓
ApplicationStage = COMPLETED
↓
Étape suivante activée
↓
Invitation générée
↓
Rappel planifié
~~~

L’automatisation ne doit jamais transformer une recommandation J’IA en décision de recrutement sans l’autorisation prévue par le workflow.

## 8. Feedback automatisé

Après validation ou refus, Jobly peut préparer un feedback adapté au contexte.

Le recruteur peut conserver, modifier ou envoyer le message selon le niveau d’automatisation autorisé.

Types :
- validation d’étape ;
- passage à l’étape suivante ;
- demande d’information ;
- refus ;
- clôture ;
- point à approfondir.

Le feedback envoyé et le message effectivement transmis doivent être journalisés séparément du simple brouillon J’IA.

## 9. Passage à l’étape suivante

Après validation, Jobly doit pouvoir :
1. clôturer l’étape courante ;
2. enregistrer le résultat ;
3. enregistrer la décision ;
4. générer le feedback ;
5. notifier le Talent ;
6. ouvrir l’étape suivante ;
7. préparer/envoyer la communication selon les règles ;
8. planifier les rappels ;
9. mettre à jour la timeline.

Les conditions peuvent être configurées par le recruteur. Exemple :

~~~
Test ≥ 80 → Entretien manager
60–79      → Entretien technique
< 60       → Fin du processus
~~~

Ces seuils sont des **règles du recruteur**, pas des décisions autonomes de J’IA.

## 10. Gestion des cas réels du recrutement

Le cycle doit également prévoir :
- retrait du candidat ;
- candidature abandonnée ;
- candidature expirée ;
- mise en pause ;
- reprise ;
- étape annulée ;
- entretien replanifié ;
- candidat absent ;
- test non rendu ;
- test expiré ;
- réouverture exceptionnelle ;
- plusieurs recruteurs sur une même candidature ;
- modification du pipeline en cours de recrutement avec conservation de l’historique ;
- correction/annulation d’une décision selon permissions.

## 11. États à ne pas confondre

JOBLY doit distinguer :

~~~
ÉTAT DE L’OFFRE
≠
ÉTAT DE LA CANDIDATURE
≠
ÉTAT DE L’ÉTAPE
≠
ÉTAT DU CANDIDAT
~~~

Cette séparation est essentielle pour éviter qu’une clôture d’étape soit interprétée comme une clôture de candidature ou d’offre.

## 12. Timeline et traçabilité

La timeline est la source chronologique du parcours :

~~~
Candidature reçue
→ CV consulté
→ Matching
→ Présélection
→ Test proposé
→ Test commencé
→ Test soumis
→ Analyse J’IA
→ Décision recruteur
→ Feedback
→ Étape suivante
→ Entretien
→ Décision
→ Feedback
→ Offre
→ Acceptation / Refus
→ Clôture
~~~

Chaque événement doit pouvoir distinguer :
- proposition J’IA ;
- décision humaine ;
- action exécutée ;
- message préparé ;
- message envoyé ;
- notification ;
- résultat ;
- feedback ;
- changement d’étape.

## 13. Fin du cycle

Le cycle de recrutement ne s’arrête pas à « candidature validée ».

La fin cible est :

~~~
DÉCISION FINALE
↓
OFFRE D’EMBAUCHE
↓
ACCEPTÉE / REFUSÉE
↓
ONBOARDING
↓
CAREER COMPANION
↓
CAREER TWIN MIS À JOUR
~~~

En cas de refus final, le Talent reçoit une communication adaptée et les feedbacks vérifiés peuvent enrichir son Career Twin selon les permissions et règles de confidentialité.

## 14. Boucle de progression

Le résultat d’un recrutement peut enrichir le parcours sans devenir une vérité absolue :

~~~
CANDIDATURE
→ ÉVALUATIONS
→ ENTRETIENS
→ DÉCISION
→ FEEDBACK
→ CAREER TWIN
→ NOUVELLE ANALYSE
→ RECOMMANDATIONS
→ FUTURES CANDIDATURES
~~~

J’IA doit distinguer les faits observés, les données déclarées, les documents, les vérifications et les inférences.

## 15. Garde-fous

- J’IA n’embauche pas et ne rejette pas seule lorsque le workflow requiert une décision humaine.
- J’IA ne doit pas utiliser de caractéristiques sensibles ou de proxys sensibles pour prendre/recommander une décision de recrutement.
- J’IA ne doit pas inventer de résultats, réponses, entretiens ou liens de visioconférence.
- Les scores sont contextualisés et explicables.
- Les communications automatiques doivent respecter les préférences et permissions.
- Les données privées restent protégées.
- Les décisions et actions sont auditables.

## État

**🟦 SPÉCIFIÉ / DÉCISION FIGÉE — 26/09/2026**

Cette architecture complète le checkpoint précédent **COMMUNICATION → ENTRETIEN → DÉCISION → FEEDBACK** et devient la référence produit du **cycle de recrutement de bout en bout**.

Elle n'est pas déclarée CODÉE, TESTÉE, VALIDÉE ou DÉPLOYÉE tant que l'implémentation, les tests unitaires/intégration/E2E, les permissions, la persistance, les communications et la vérification réelle en production ne sont pas terminés.

**Règle : CODÉ → TESTÉ → VALIDÉ → DÉPLOYÉ.**
