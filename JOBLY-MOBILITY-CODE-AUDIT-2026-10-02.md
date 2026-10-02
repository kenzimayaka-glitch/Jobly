# JOBLY MOBILITY — AUDIT DU CODE EXISTANT
## 02/10/2026 — main @ 6214c36d79bbb2fcf220c579845c7685628aa6c2

## Verdict exécutif

Le dépôt contient déjà un **MVP Mobility substantiel**. Il ne faut donc pas recréer Mobility.

Le code actuel couvre principalement :

**GPS + villes camerounaises + estimation + MobilityRequest + Premium gate + garantie recruteur + subvention + partenaires spécialisés + logement + rapports + Pass + une première Mobility Intelligence.**

La nouvelle vision est plus large :

**emploi obtenu → diagnostic → coût complet → règle d'éligibilité 35 % → décision explicable → programme → financement → exécution → arrivée → prise de poste → impact institutionnel.**

L'écart principal est donc une **extension architecturale**, pas une reconstruction.

---

## 1. SURFACES EXISTANTES

### Talent
- /bons-plans/mobility
- /bons-plans/mobility/talent/request
- /bons-plans/mobility/talent/status
- /bons-plans/mobility/talent/pass

### Recruiter
- /recruiter/mobility

### Partner
- /bons-plans/mobility/partner/dashboard
- /bons-plans/mobility/partner/demandes
- /bons-plans/mobility/partner/dossiers
- /bons-plans/mobility/partner/financements
- /bons-plans/mobility/partner/logements
- /bons-plans/mobility/partner/rapports
- /bons-plans/mobility/partner/trajets
- /bons-plans/mobility/partner/validations

### Admin
- /admin/mobility
- /admin/partners/create

---

## 2. APIs EXISTANTES

- /api/mobility/estimate
- /api/mobility/request
- /api/mobility/jia/intelligence
- /api/mobility/recruiter/guarantee
- /api/mobility/partner/me
- /api/mobility/partner/reports
- /api/mobility/partner/housing
- /api/mobility/partner/validate
- /api/mobility/admin/generate-pass

---

## 3. LIBS EXISTANTES

### lib/mobility.ts

Contient :
- MOBILITY_STEPS ;
- génération de Pass ;
- résolution de ville ;
- calcul de distance.

### lib/mobilityServer.ts

Contient :
- client Supabase admin ;
- authentification ;
- création/récupération User ;
- gate Premium ;
- contrôle de rôle.

### lib/gps.ts

Contient :
- villes camerounaises ;
- Haversine ;
- transport ;
- logement ;
- déménagement ;
- coût total ;
- coût mensuel ;
- Mobility Fit.

### lib/jia/mobilityIntelligence.ts

Contient :
- lecture des MobilityRequest ;
- nombre de demandes ;
- demandes actives ;
- Mobility Fit moyen ;
- coût déclaré total ;
- prochaines actions ;
- état CONNECTED/NO_REQUESTS.

---

## 4. MODÈLE DB ACTUEL

Migration principale :

supabase/20260913080000_mobility_v2.sql

Elle introduit notamment :

### MobilityRequest
- id
- userId
- departCity
- arriveeCity
- departLat
- departLng
- arriveeLat
- arriveeLng
- companyLat
- companyLng
- distanceKm
- housingType
- salary
- costTotal
- costMonthly
- mobilityFit
- subventionPercent
- status
- currentStep
- recruiterGuaranteed
- passCode
- passUsages
- cniWatermarked
- createdAt
- updatedAt

### PartnerExtended
- id
- partnerUserId
- type
- code
- lat
- lng
- createdAt

Types actuels :
- FINANCE
- HOUSING
- TRANSPORT

### PartnerHousing
- logement ;
- adresse ;
- coordonnées ;
- coût mensuel ;
- disponibilité ;
- distance entreprise.

---

## 5. SECOND SCHÉMA MOBILITY

Migration :

supabase/20260918210000_mobility_request_schema.sql

Elle redéclare MobilityRequest avec notamment :
- id uuid ;
- salary numeric ;
- costTotal numeric ;
- costMonthly numeric ;
- mobilityFit integer ;
- subventionPercent numeric.

### Point de vigilance

Deux migrations historiques décrivent MobilityRequest avec des détails différents.

Avant toute migration DB supplémentaire, il faut vérifier l'état réel de JOBLY-PROD et réconcilier les migrations au lieu de les appliquer aveuglément.

---

## 6. FLOW TALENT ACTUEL

La page de demande :

1. récupère la dernière candidature acceptée ;
2. tente de préremplir la ville d'arrivée ;
3. permet de choisir départ ;
4. permet de choisir destination ;
5. permet de choisir logement ;
6. permet de saisir le salaire ;
7. affiche une carte ;
8. prépare une preuve CNI watermarkée ;
9. crée MobilityRequest ;
10. stocke également la demande dans localStorage ;
11. redirige vers le suivi.

### Écart avec la vision

Le flow actuel part de :

**« Prépare ton départ »**

alors que le flow cible doit partir de :

**« Tu as obtenu un emploi. Vérifions si tu peux réellement le rejoindre. »**

---

## 7. CALCUL ACTUEL

Le moteur actuel utilise :

- distance GPS ;
- transport borné ;
- logement fixe selon type ;
- déménagement fixe selon type ;
- deux mois de logement ;
- mensualité = total / 3 ;
- Mobility Fit.

### Limites

Il ne prend pas encore en compte de manière structurée :
- coût de la vie ;
- installation détaillée ;
- transport local ;
- dépenses avant premier salaire ;
- sources ;
- confiance ;
- version de calcul ;
- programme ;
- règles de financement.

---

## 8. SEUIL ACTUEL VS NOUVELLE RÈGLE

Le code actuel de création refuse seulement lorsque :

**costTotal > salary**

Donc plafond effectif actuel :

**100 % du salaire.**

La règle métier nouvellement définie est :

**35 % du salaire approuvé par Recruiter.**

Cette différence doit être traitée comme une migration métier explicite.

---

## 9. SALAIRE ACTUEL

La page Talent demande actuellement un salaire librement saisi.

La nouvelle architecture doit rattacher le salaire de référence à :

**Job/RecruiterJob → Application → offre obtenue → salaire approuvé.**

Une saisie Talent peut rester un contrôle secondaire, mais elle ne doit pas devenir la référence financière lorsqu'une donnée Recruiter fiable existe.

---

## 10. GARANTIE RECRUTEUR ACTUELLE

API existante :

/api/mobility/recruiter/guarantee

Elle positionne :
- recruiterGuaranteed = true ;
- currentStep >= 3 ;
- status = GUARANTEED.

### Écart

Le modèle cible doit représenter explicitement :
- qui garantit ;
- quel montant ;
- quelle obligation ;
- quelle durée ;
- quelle méthode de remboursement ;
- quel consentement ;
- quelle preuve ;
- quel état.

La garantie ne doit pas être un simple booléen.

---

## 11. SUBVENTION ACTUELLE

API :

/api/mobility/partner/validate

Elle accepte un pourcentage et positionne :

- subventionPercent ;
- currentStep = 4 ;
- status = SUBSIDY_VALIDATED.

### Écart

Le futur moteur doit distinguer :

- programme ;
- règle ;
- allocation ;
- subvention ;
- avance ;
- financement en nature ;
- transaction ;
- remboursement.

Un simple pourcentage ne suffit pas pour l'Institutional Hub.

---

## 12. PARTNER ACTUEL

Le modèle actuel connaît des partenaires spécialisés.

Il ne possède pas encore le modèle institutionnel complet :

**Organization → Program → Funding → Beneficiary → Impact.**

Ce socle doit être ajouté sans casser Partner existant.

---

## 13. RAPPORTS ACTUELS

Le rapport CSV/XLSX expose principalement :

- id ;
- départ ;
- arrivée ;
- distance ;
- coût ;
- subvention ;
- statut ;
- date.

La vision Institutional Hub nécessite un reporting beaucoup plus riche.

---

## 14. MOBILITY INTELLIGENCE ACTUELLE

La première version de J'IA Mobility est déjà connectée à MobilityRequest.

Elle produit :
- nombre de demandes ;
- demandes actives ;
- Mobility Fit moyen ;
- coût déclaré total ;
- opportunités ;
- liste des demandes.

C'est un bon socle.

Mais elle n'est pas encore un Eligibility/Funding/Orchestration Engine.

---

## 15. PASS ACTUEL

Le Pass :
- possède un code ;
- possède un QR ;
- peut être généré par Admin ;
- possède trois usages configurés dans le flow actuel.

### Écart

Le Pass doit devenir un objet de service facultatif, séparé du financement.

---

## 16. PROBLÈMES DE SÉCURITÉ À CORRIGER

### Rapports

Le endpoint partenaire/reports semble retourner l'ensemble des MobilityRequest à un partenaire/recruteur autorisé sans scope organisationnel suffisamment fin.

### Garantie recruteur

Le endpoint de garantie doit vérifier que le recruteur est réellement lié au dossier.

### Validation partenaire

La validation doit être limitée aux programmes/dossiers autorisés.

### Données sensibles

Salaire, localisation et documents doivent être soumis au principe de moindre privilège.

---

## 17. CE QUI NE DOIT PAS ÊTRE RECRÉÉ

Ne pas recréer :

- GPS ;
- calcul Haversine ;
- villes ;
- MobilityRequest ;
- Premium gate ;
- Partner ;
- logement ;
- rapports ;
- Pass ;
- Mobility Intelligence.

Il faut **faire évoluer** ces composants.

---

## 18. CE QUI DOIT ÊTRE AJOUTÉ

Priorité :

1. Application/job linkage ;
2. Recruiter-approved salary ;
3. Mobility Cost Breakdown ;
4. Eligibility Decision ;
5. 35 % rule ;
6. Mobility Journey ;
7. Mobility Program ;
8. Institution ;
9. Funding Allocation ;
10. Funding Transaction ;
11. Repayment Plan ;
12. Recruiter Guarantee détaillée ;
13. Evidence ;
14. Audit Events ;
15. Institutional KPI ;
16. Impact Reporting ;
17. Africa geography abstraction.

---

## 19. ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### F1 — CORE

Ne dépend d'aucun partenaire réel.

### F2 — FUNDING

Ne dépend d'aucun partenaire réel.

### F3 — INSTITUTIONAL HUB

Ne dépend d'aucun partenaire réel.

### F4 — J'IA

Orchestre les composants.

### F5 — AFRICA

Étend la géographie.

### F6 — PARTNER ONBOARDING

Seulement après que l'infrastructure soit prête.

---

## 20. CONDITION DE PASSAGE À UN PARTENAIRE RÉEL

Avant le premier partenaire réel, Jobly doit pouvoir :

- créer une institution ;
- créer un programme ;
- définir des règles ;
- définir un budget ;
- définir une population ;
- recevoir une demande ;
- calculer l'éligibilité ;
- attribuer un financement ;
- tracer une transaction ;
- suivre le bénéficiaire ;
- confirmer la mobilité ;
- confirmer la prise de poste ;
- générer un rapport ;
- produire un audit trail.

Aucune logique ne doit être spécifique à un partenaire.

---

## 21. STATUT DE L'AUDIT

**Architecture actuelle : SOCLE EXISTANT + GAP MAJEUR VERS LA VISION CIBLE.**

**Action immédiate : ne pas recréer Mobility. Étendre et réconcilier le socle existant avec le Blueprint canonique.**

**Déploiement : aucun déploiement effectué dans cette passe.**

**Base : main.**
