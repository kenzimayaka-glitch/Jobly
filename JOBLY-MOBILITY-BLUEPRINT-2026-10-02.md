# JOBLY MOBILITY — BLUEPRINT ARCHITECTURE & VISION
## Version 1.0 — 02/10/2026
## Document canonique de conception — avant implémentation

> **Statut : DOCUMENT DE CONCEPTION.**
>
> Aucun partenaire réel, aucun programme réel, aucun fonds réel et aucune transaction réelle ne sont actuellement connectés. Ce document décrit l'infrastructure que Jobly doit construire afin de pouvoir accueillir ultérieurement des partenaires et programmes sans réécrire le cœur de Mobility.

---

# 1. DÉCISION FONDAMENTALE

Jobly Mobility ne doit pas être conçu comme un simple module de recherche d'emploi à l'étranger, ni comme un simple système de prêt, ni comme un catalogue de partenaires.

**Jobly Mobility est l'infrastructure professionnelle qui transforme un emploi obtenu mais géographiquement/logistiquement difficile à rejoindre en une mobilité réellement exécutable.**

Promesse fonctionnelle :

> **De l'emploi obtenu à l'emploi réellement rejoint.**

Le problème traité est la friction située entre :

**recrutement confirmé → déplacement → installation → prise de poste.**

Cette friction peut concerner :

- la distance ;
- le temps de trajet ;
- le coût du transport ;
- le logement ;
- le coût de la vie ;
- l'installation ;
- le transport local ;
- les dépenses nécessaires avant le premier salaire ;
- les formalités et besoins logistiques ;
- l'absence de ressources immédiatement disponibles ;
- l'incertitude du recruteur sur la capacité réelle du Talent à rejoindre son poste.

Mobility doit donc être pensé comme une **couche inter-écosystèmes**.

---

# 2. MOBILITY N'EST PAS UN ÉCOSYSTÈME ISOLÉ

Mobility se situe au croisement de plusieurs objets Jobly :

**Talent → Candidature → Recrutement → Emploi obtenu → Mobility → Installation → Prise de poste → Career Journey.**

Mobility doit pouvoir consommer les informations déjà connues par Jobly au lieu de les redemander.

Sources potentielles :

- Career Brain ;
- Career Twin ;
- profil Talent ;
- candidature ;
- offre d'emploi ;
- employeur/recruteur ;
- salaire officiellement approuvé ;
- localisation du poste ;
- localisation du Talent ;
- Career Journey ;
- Institutional Hub ;
- programmes de financement ;
- partenaires ;
- services de transport/logement lorsqu'ils existent.

Règle :

> **Une information déjà fiable et disponible dans Jobly doit être pré-remplie. Une information calculée par J'IA doit être distinguée d'une information déclarée ou vérifiée.**

---

# 3. VISION ÉCONOMIQUE ET INSTITUTIONNELLE

À terme, Jobly doit pouvoir devenir une infrastructure africaine de financement et de coordination de la mobilité professionnelle.

Jobly ne doit pas supposer qu'un Talent finance toujours sa mobilité lui-même.

Le financement pourra ultérieurement provenir de :

- programmes de développement ;
- institutions internationales ;
- fondations ;
- collectivités ;
- réseaux de collectivités ;
- universités ;
- entreprises ;
- organismes publics d'emploi ;
- institutions financières ;
- employeurs ;
- mécanismes hybrides.

Mais **ces partenaires n'existent pas encore dans le produit réel**.

Le cœur doit donc être générique.

Le système ne doit jamais contenir de logique du type :

`if partner === "GIZ"`

Il doit contenir des objets configurables :

**Institution → Programme → Règles → Éligibilité → Financement → Bénéficiaire → Exécution → Résultat → Reporting.**

---

# 4. EXEMPLE DE VISION FUTURE — SANS PARTENAIRE RÉEL AUJOURD'HUI

Exemple conceptuel uniquement :

Une institution pourrait demain créer un programme visant la mobilité de 100 jeunes par an.

Le programme pourrait définir :

- population cible ;
- territoire ;
- nombre de bénéficiaires ;
- budget ;
- plafond par bénéficiaire ;
- dépenses couvertes ;
- critères d'éligibilité ;
- période ;
- mécanisme de financement ;
- indicateurs ;
- reporting ;
- traçabilité.

Le Talent ne devrait pas avoir besoin de connaître la mécanique institutionnelle pour commencer.

Il voit :

> **Votre mobilité peut être accompagnée.**

J'IA identifie ensuite les solutions disponibles et autorisées.

L'institution, de son côté, voit :

- nombre de demandes ;
- bénéficiaires ;
- montants engagés ;
- montants débloqués ;
- dépenses ;
- mobilité réalisée ;
- prise de poste ;
- résultats ;
- indicateurs ;
- justificatifs ;
- historique ;
- audit trail.

---

# 5. PRINCIPLE « PROGRAMME-FIRST »

L'objet central du futur financement n'est pas le partenaire.

C'est le **Programme**.

Un partenaire peut posséder plusieurs programmes.

Un programme peut avoir :

- un propriétaire institutionnel ;
- un ou plusieurs financeurs ;
- une population cible ;
- un territoire ;
- un budget ;
- des règles ;
- des plafonds ;
- des périodes ;
- des KPI ;
- des modèles de financement ;
- des règles de remboursement ;
- des règles de cofinancement ;
- des exigences documentaires ;
- des règles de validation ;
- des règles de reporting.

Le système doit donc séparer :

**Institution ≠ Programme ≠ Fonds ≠ Transaction ≠ Bénéficiaire.**

---

# 6. TYPES DE FINANCEMENT À SUPPORTER

Le moteur doit être capable de représenter plusieurs modèles.

## 6.1 Subvention non remboursable

Le bénéficiaire reçoit une aide sans obligation de remboursement individuel.

Flux :

`Programme → Fonds → Talent → Mobilité → Prise de poste`

## 6.2 Avance remboursable

Le Talent reçoit une avance et la rembourse selon des règles.

Flux :

`Programme → Avance → Talent → Mobilité → Emploi → Remboursement`

## 6.3 Fonds rotatif

Le mécanisme financier est conçu pour permettre plusieurs bénéficiaires successifs.

Attention :

> Un « fonds rotatif » ne signifie pas automatiquement que chaque financement individuel est juridiquement remboursable.

Le modèle économique exact doit être configurable.

## 6.4 Garantie employeur

Le recruteur/employeur peut garantir une avance selon un mécanisme défini.

## 6.5 Cofinancement

Plusieurs sources peuvent contribuer à une même mobilité, uniquement si les règles du programme l'autorisent.

## 6.6 Financement en nature

Le support peut être fourni sous forme de :

- transport ;
- logement ;
- navette ;
- hébergement temporaire ;
- services d'installation.

Le moteur doit donc distinguer :

**cash funding** et **in-kind support**.

---

# 7. NIVEAU 1 — MOBILITY ELIGIBILITY ENGINE

Le premier niveau fonctionnel à construire est l'**Eligibility Engine**.

Condition d'entrée actuelle :

> **Talent Premium + emploi obtenu + besoin de mobilité identifié.**

Le Talent a obtenu un emploi.

Il estime ne pas disposer des ressources nécessaires pour rejoindre le poste.

Il déclenche :

> **Demander une aide Mobility.**

J'IA calcule alors l'éligibilité.

---

# 8. DONNÉES D'ENTRÉE DE L'ÉLIGIBILITY ENGINE

## 8.1 Talent

- identité ;
- plan actif ;
- situation de mobilité ;
- lieu actuel ;
- informations disponibles dans Career Brain ;
- informations déclarées ;
- informations vérifiées.

## 8.2 Emploi

- application ;
- emploi concerné ;
- employeur ;
- destination ;
- date prévue de prise de poste ;
- salaire.

## 8.3 Salaire

Le salaire de référence doit être :

> **le salaire officiellement approuvé par le Recruiter pour l'emploi obtenu.**

J'IA ne doit pas inventer, extrapoler ou modifier ce salaire.

## 8.4 Mobilité

- origine ;
- destination ;
- distance ;
- durée ;
- transport ;
- logement ;
- installation ;
- coût de la vie ;
- dépenses locales ;
- besoin avant premier salaire.

---

# 9. CALCUL DU COÛT MOBILITY

Le coût total doit être décomposable.

Minimum conceptuel :

`Coût total = transport + logement + installation + déplacement local + autres dépenses éligibles`

Le système doit conserver les composantes, pas seulement le total.

Exemple :

- transport interurbain : 25 000 FCFA ;
- logement temporaire : 120 000 FCFA ;
- installation : 80 000 FCFA ;
- transport local : 30 000 FCFA ;
- autres dépenses : 0 FCFA.

Total :

**255 000 FCFA.**

Chaque montant doit avoir :

- valeur ;
- devise ;
- source ;
- nature ;
- statut ;
- date d'estimation ;
- éventuelle vérification.

---

# 10. RÈGLE DU SEUIL DE 35 %

Règle métier actuelle :

> **La charge Mobility ne doit pas dépasser 35 % du salaire officiellement approuvé par le Recruiter.**

Formule :

`Mobility burden = coût total Mobility / salaire approuvé`

Éligibilité :

`Mobility burden <= 35%`

Inéligibilité :

`Mobility burden > 35%`

Exemple :

Salaire approuvé : 300 000 FCFA.

Plafond à 35 % :

**105 000 FCFA.**

Si le coût éligible est 90 000 FCFA :

**éligible selon la règle de seuil.**

Si le coût éligible est 150 000 FCFA :

**inéligible selon la règle actuelle.**

Cette règle doit être une règle configurable du moteur à terme, mais **35 % est la règle de niveau 1 actuellement décidée**.

---

# 11. DISTINCTION CRITIQUE : COÛT INITIAL VS REMBOURSEMENT

Le système ne doit pas confondre :

- coût total de mobilité ;
- montant financé ;
- montant remboursable ;
- durée de remboursement ;
- mensualité ;
- retenue salariale ;
- montant garanti par l'employeur.

La phrase actuelle :

> « remboursement garanti par le recruteur qui coupe le salaire durant 3 mois »

doit donc devenir un modèle de données explicite.

Exemple :

**Montant financé : 300 000 FCFA**

**Durée : 3 mois**

**Retenue mensuelle théorique : 100 000 FCFA**

Mais ce calcul n'est qu'un exemple technique. Les règles contractuelles, légales et de paie devront être paramétrables et validées avant utilisation réelle.

---

# 12. DÉCISION D'ÉLIGIBILITÉ

Le moteur doit produire une décision explicable.

Structure conceptuelle :

- eligible ;
- reason ;
- salaryReference ;
- mobilityCost ;
- burdenPercent ;
- thresholdPercent ;
- blockingFactors ;
- missingInformation ;
- calculationTimestamp ;
- calculationVersion.

Exemple :

> **Éligible**
>
> Coût Mobility estimé : 90 000 FCFA.
>
> Salaire approuvé : 300 000 FCFA.
>
> Charge Mobility : 30 %.
>
> Seuil : 35 %.

Ou :

> **Non éligible**
>
> Coût Mobility estimé : 150 000 FCFA.
>
> Salaire approuvé : 300 000 FCFA.
>
> Charge Mobility : 50 %.
>
> Seuil autorisé : 35 %.

---

# 13. J'IA N'EST PAS L'AUTORITÉ FINANCIÈRE

J'IA :

- collecte ;
- comprend ;
- calcule ;
- explique ;
- compare ;
- détecte ;
- propose.

J'IA ne doit pas :

- inventer un salaire ;
- inventer un financement ;
- créer un partenaire fictif ;
- modifier les règles d'un programme ;
- garantir un financement ;
- déclarer un paiement comme effectué sans transaction ;
- déclarer un partenariat comme réel.

La décision finale doit appartenir à l'acteur habilité selon le modèle du programme.

---

# 14. MOBILITY JOURNEY — TALENT

Le parcours cible doit être conçu comme une progression complète.

## PAGE 01 — Emploi obtenu

Contenu :

- félicitations ;
- intitulé du poste ;
- employeur ;
- destination ;
- salaire approuvé ;
- date de prise de poste ;
- signalement d'une difficulté potentielle de mobilité.

CTA :

> **Préparer mon arrivée**

CTA secondaire :

> **Tout va bien, je peux rejoindre le poste**

---

## PAGE 02 — Diagnostic Mobility

J'IA explique :

> « Je vais vérifier si le déplacement, le logement et l'installation sont compatibles avec votre situation. »

Informations pré-remplies :

- lieu actuel ;
- destination ;
- emploi ;
- salaire ;
- date.

Le Talent corrige si nécessaire.

---

## PAGE 03 — Origine / destination

Afficher :

- ville ;
- pays ;
- carte ;
- distance ;
- estimation du temps.

Pour le futur africain :

**ville → pays → région.**

---

## PAGE 04 — Besoins

Questions :

- transport nécessaire ?
- logement temporaire ?
- logement durable ?
- installation ?
- transport local ?
- autres dépenses ?

J'IA ne doit demander que ce qui est nécessaire.

---

## PAGE 05 — Mobility Budget

Afficher chaque composante.

Le Talent peut comprendre :

> **Pourquoi ce montant ?**

Chaque estimation doit être explicable.

---

## PAGE 06 — Salary Fit

Afficher :

- salaire approuvé ;
- coût Mobility ;
- pourcentage ;
- seuil ;
- résultat.

---

## PAGE 07 — Éligibilité

Trois états minimum :

**ÉLIGIBLE**

**NON ÉLIGIBLE**

**INFORMATION MANQUANTE**

Ne jamais transformer une donnée inconnue en faux « non ».

---

## PAGE 08 — Solutions

Aujourd'hui, aucun programme réel.

L'écran doit donc pouvoir afficher :

> **Aucun programme de financement connecté pour le moment.**

Lorsque des programmes existeront :

- programmes éligibles ;
- aide potentielle ;
- type ;
- montant ;
- dépenses couvertes ;
- conditions ;
- délais ;
- acteur décisionnaire.

---

## PAGE 09 — Dossier

J'IA pré-remplit.

Le Talent fournit seulement les données manquantes.

---

## PAGE 10 — Validation

Afficher :

- état ;
- acteur attendu ;
- documents ;
- décisions ;
- date.

---

## PAGE 11 — Mobilité

Après approbation :

- départ ;
- transport ;
- logement ;
- installation ;
- rappels ;
- incidents.

---

## PAGE 12 — Arrivée

Confirmation :

> **Vous êtes arrivé à destination.**

---

## PAGE 13 — Prise de poste

Confirmation :

> **Votre prise de poste est confirmée.**

---

## PAGE 14 — Clôture

Le dossier devient :

**COMPLETED**

avec :

- montant final ;
- dépenses ;
- mobilité ;
- arrivée ;
- prise de poste ;
- résultat.

---

# 15. CAREER JOURNEY

Mobility ne doit pas devenir un second Career Journey.

Mobility produit des étapes spécialisées.

Career Journey peut recevoir :

- mission de préparation ;
- départ ;
- arrivée ;
- installation ;
- prise de poste.

Principe :

> **Mobility calcule et orchestre la mobilité ; Career Journey transforme les étapes en progression du Talent.**

---

# 16. RECRUITER JOURNEY

Le Recruiter doit voir uniquement ce dont il a besoin.

Après recrutement :

**Candidat retenu → mobilité en préparation.**

Vue cible :

- Talent ;
- poste ;
- destination ;
- date de prise de poste ;
- état Mobility ;
- besoins bloquants ;
- support employeur ;
- garantie éventuelle ;
- arrivée ;
- prise de poste.

Le Recruiter ne doit pas voir les informations privées qui ne sont pas nécessaires à son rôle.

---

# 17. RECRUITER SUPPORT

Le recruteur peut éventuellement proposer :

- transport ;
- logement temporaire ;
- avance ;
- allocation ;
- navette ;
- accompagnement d'installation.

Ces éléments doivent être représentés comme des **engagements de support**, avec :

- type ;
- montant ou nature ;
- date ;
- statut ;
- responsable ;
- preuve ;
- conditions.

---

# 18. INSTITUTIONAL HUB

Institutional Hub doit être la couche de gouvernance et de pilotage.

Il ne doit pas être codé autour d'une institution particulière.

Un utilisateur institutionnel doit pouvoir voir les objets auxquels son organisation a droit.

Concept :

**Institution → Programmes → Bénéficiaires → Fonds → Transactions → Résultats → Rapports.**

---

# 19. ESPACE INSTITUTIONNEL — PAGES CIBLES

## Dashboard

KPI :

- programmes actifs ;
- budget ;
- demandes ;
- bénéficiaires ;
- financements ;
- mobilités réalisées ;
- prises de poste ;
- impact.

## Programmes

- liste ;
- création ;
- configuration ;
- règles ;
- statut ;
- budget ;
- bénéficiaires ;
- KPI.

## Demandes

- dossiers ;
- filtres ;
- éligibilité ;
- état ;
- documents.

## Bénéficiaires

- identité minimale nécessaire ;
- programme ;
- destination ;
- financement ;
- état Mobility ;
- résultat.

## Financements

- engagé ;
- approuvé ;
- débloqué ;
- utilisé ;
- restant.

## Transactions

Journal immuable logique :

- id ;
- date ;
- dossier ;
- programme ;
- source ;
- destination ;
- montant ;
- devise ;
- type ;
- statut ;
- référence ;
- auteur ;
- preuve.

## Reporting

- KPI ;
- filtres ;
- période ;
- territoire ;
- programme ;
- catégorie ;
- export ;
- rapport.

## Audit

- qui ;
- quoi ;
- quand ;
- avant ;
- après ;
- raison ;
- source.

---

# 20. TYPES D'INSTITUTIONS

Le moteur doit être neutre.

Types potentiels :

- organisme international ;
- bailleur ;
- fondation ;
- ministère ;
- organisme public ;
- commune ;
- réseau de communes ;
- université ;
- école ;
- ONG ;
- entreprise ;
- employeur ;
- institution financière ;
- autre.

Cette liste doit être extensible.

---

# 21. EXEMPLES D'USAGES FUTURS

## Organisme international

Objectif :

> financer et mesurer l'impact d'un programme de mobilité.

## Mairie

Objectif :

> soutenir l'accès à l'emploi des jeunes du territoire.

## Réseau de collectivités

Objectif :

> déployer un programme multi-territoires.

## Université

Objectif :

> suivre l'insertion et la mobilité des diplômés.

## Organisme public d'emploi

Objectif :

> mesurer le passage formation → emploi → mobilité → insertion.

## Entreprise

Objectif :

> faciliter la prise de poste de ses recrues.

---

# 22. AFRICA-READY

Mobility doit être conçu dès maintenant pour ne pas être limité structurellement au Cameroun.

Le premier jeu de données actuel peut rester camerounais pour le MVP, mais les modèles ne doivent pas coder la géographie comme une contrainte définitive.

Le modèle futur doit supporter :

- pays ;
- région ;
- ville ;
- coordonnées ;
- devise ;
- coût de la vie ;
- transport ;
- logement ;
- règles locales ;
- programmes transfrontaliers.

Exemple :

**Douala → Yaoundé**

puis :

**Yaoundé → Garoua**

puis :

**Cameroun → Gabon**

puis :

**Cameroun → Sénégal**

sans changement conceptuel du moteur.

---

# 23. PROGRAMME AFRICAIN

Un programme futur peut définir :

**Pays autorisés**

**Pays d'origine**

**Pays de destination**

**Villes**

**Mobilité nationale**

**Mobilité transfrontalière**

**Population cible**

**Secteurs**

**Employeurs**

**Durée**

**Budget**

**Plafonds**

**Règles**

Le programme ne doit jamais être codé dans une page Talent spécifique.

---

# 24. MODÈLE DE DONNÉES CIBLE

Le système devra progressivement disposer d'objets distincts.

## MobilityRequest

- id ;
- talentId ;
- applicationId ;
- jobId ;
- recruiterId ;
- origin ;
- destination ;
- salaryReference ;
- mobilityCost ;
- burdenPercent ;
- eligibility ;
- status ;
- journey ;
- timestamps.

## MobilityCostBreakdown

- requestId ;
- category ;
- amount ;
- currency ;
- source ;
- confidence ;
- estimatedAt ;
- verifiedAt.

## Institution

- id ;
- type ;
- name ;
- country ;
- status ;
- users.

## MobilityProgram

- id ;
- institutionId ;
- name ;
- description ;
- status ;
- geography ;
- capacity ;
- budget ;
- rules.

## FundingAllocation

- id ;
- programId ;
- requestId ;
- amount ;
- currency ;
- type ;
- status.

## FundingTransaction

- id ;
- allocationId ;
- amount ;
- currency ;
- direction ;
- status ;
- reference ;
- timestamp.

## RepaymentPlan

- id ;
- allocationId ;
- model ;
- amount ;
- duration ;
- frequency ;
- guarantee ;
- status.

## RecruiterGuarantee

- id ;
- recruiterId ;
- requestId ;
- employer ;
- amount ;
- terms ;
- status ;
- consent ;
- audit.

## MobilityEvent

- id ;
- requestId ;
- type ;
- actor ;
- timestamp ;
- metadata.

## Evidence / Document

- id ;
- requestId ;
- type ;
- source ;
- verificationStatus ;
- storageReference ;
- createdAt.

## AuditEvent

- id ;
- actor ;
- objectType ;
- objectId ;
- action ;
- before ;
- after ;
- timestamp.

---

# 25. STATUTS

Les statuts doivent être explicites.

Request :

**DRAFT → SUBMITTED → ANALYZING → ELIGIBLE / INELIGIBLE / NEEDS_INFO → PENDING_APPROVAL → APPROVED / REJECTED → FUNDED → IN_TRANSIT → ARRIVED → STARTED → COMPLETED**

Annulation :

**CANCELLED**

Blocage :

**BLOCKED**

Erreur :

**FAILED**

Les anciens statuts historiques peuvent être conservés pour compatibilité mais ne doivent pas empêcher le modèle cible.

---

# 26. PROGRAMME — STATUTS

**DRAFT**

**CONFIGURED**

**READY**

**ACTIVE**

**PAUSED**

**CLOSED**

**ARCHIVED**

Aucun programme réel ne doit être affiché comme ACTIVE tant qu'aucun partenaire réel ne l'a créé/validé.

---

# 27. PARTENAIRE — STATUTS

**INVITED**

**ONBOARDING**

**KYC_PENDING**

**VERIFIED**

**ACTIVE**

**SUSPENDED**

**CLOSED**

---

# 28. RÈGLE DE DÉMONSTRATION

Pour développer et tester sans partenaires :

- utiliser des fixtures ;
- les marquer explicitement DEMO ;
- ne jamais les confondre avec des partenaires réels ;
- ne jamais produire de faux chiffres institutionnels en production ;
- ne jamais simuler une transaction comme réelle.

---

# 29. ENTITLEMENTS

La fonctionnalité Mobility actuellement existante est réservée au Premium.

Cette règle doit être conservée comme **gate produit actuel**.

À terme, les niveaux d'accès doivent être documentés séparément :

- accès au diagnostic ;
- accès au plan ;
- accès aux programmes ;
- accès au financement ;
- accès aux fonctionnalités avancées.

Toute nouvelle fonctionnalité payante doit respecter la règle Jobly :

**FREE / START / PREMIUM / PRO + profondeur fonctionnelle + quota + consommation IA.**

---

# 30. J'IA — RÔLE DANS MOBILITY

J'IA doit fonctionner comme un orchestrateur.

Boucle conceptuelle :

**PERCEIVE → UNDERSTAND → MEMORY → WORLD MODEL → REASON → PLAN → PROPOSE → ACT → VERIFY → EVALUATE → LEARN**

Application Mobility :

1. détecter l'emploi obtenu ;
2. détecter la différence géographique ;
3. identifier les informations manquantes ;
4. estimer les coûts ;
5. calculer l'éligibilité ;
6. expliquer ;
7. rechercher les solutions autorisées ;
8. préparer le dossier ;
9. suivre les validations ;
10. accompagner le départ ;
11. vérifier l'arrivée ;
12. vérifier la prise de poste ;
13. produire l'impact.

---

# 31. TRANSPARENCE J'IA

Toute décision importante doit pouvoir être expliquée.

Exemple :

> **Pourquoi suis-je inéligible ?**

Réponse structurée :

- salaire de référence ;
- coût calculé ;
- charge ;
- seuil ;
- donnée manquante éventuelle ;
- règle appliquée ;
- version de la règle.

Pas de :

> « J'IA pense que vous n'êtes pas éligible. »

---

# 32. PRIVACY

Mobility peut manipuler :

- identité ;
- localisation ;
- salaire ;
- documents ;
- informations financières ;
- données d'emploi.

Le principe doit être :

**minimum necessary access.**

Talent :

- voit ses données.

Recruiter :

- voit les informations nécessaires au recrutement et à la prise de poste.

Institution :

- voit les bénéficiaires et indicateurs autorisés par le programme.

Financeur :

- voit les données nécessaires au financement et au reporting.

Jobly :

- administration selon privilèges.

---

# 33. TRAÇABILITÉ

Tout événement important doit être traçable.

Exemples :

- demande créée ;
- coût recalculé ;
- éligibilité calculée ;
- programme sélectionné ;
- validation ;
- financement engagé ;
- financement débloqué ;
- départ ;
- arrivée ;
- prise de poste ;
- remboursement ;
- clôture.

---

# 34. CE QUI EXISTE DÉJÀ DANS LE CODE — AUDIT DU 02/10/2026

L'audit direct du `main` actuel montre que Mobility n'est pas vide.

Il existe déjà un socle important.

### Surfaces Talent

- `/bons-plans/mobility`
- `/bons-plans/mobility/talent/request`
- `/bons-plans/mobility/talent/status`
- `/bons-plans/mobility/talent/pass`

### Surfaces Partner

- dashboard ;
- demandes ;
- dossiers ;
- financements ;
- logements ;
- rapports ;
- trajets ;
- validations.

### Surface Recruiter

- `/recruiter/mobility`

### Surface Admin

- `/admin/mobility`

### APIs

- `/api/mobility/estimate`
- `/api/mobility/request`
- `/api/mobility/jia/intelligence`
- `/api/mobility/recruiter/guarantee`
- `/api/mobility/partner/me`
- `/api/mobility/partner/reports`
- `/api/mobility/partner/housing`
- `/api/mobility/partner/validate`
- `/api/mobility/admin/generate-pass`

### Services

- `lib/mobility.ts`
- `lib/mobilityServer.ts`
- `lib/jia/mobilityIntelligence.ts`
- `lib/gps.ts`

### Composants

- `MobilityKanban`
- `MapPreview`
- `LeafletMap`
- navigation Talent/Partner.

### Base de données

Migration :

`supabase/20260913080000_mobility_v2.sql`

Migration :

`supabase/20260918210000_mobility_request_schema.sql`

---

# 35. CE QUE LE CODE ACTUEL FAIT RÉELLEMENT

Le code actuel est centré sur un modèle beaucoup plus simple que la vision cible.

Il gère principalement :

**ville de départ → ville d'arrivée → GPS → logement → estimation → MobilityRequest → garantie recruteur → subvention → Pass.**

Le socle actuel connaît :

- villes camerounaises ;
- coordonnées GPS ;
- distance ;
- transport ;
- logement ;
- déménagement ;
- salaire ;
- coût total ;
- coût mensuel ;
- mobilityFit ;
- pourcentage de subvention ;
- garantie recruteur ;
- Pass ;
- rapports ;
- partenaires spécialisés.

Il s'agit donc d'un **MVP Mobility opérationnel orienté dossier**, et non encore de l'infrastructure complète Programme/Institution/Funding/Impact décrite dans ce document.

---

# 36. LIMITATION ACTUELLE DU CALCUL DE COÛT

`lib/gps.ts` utilise actuellement :

- transport calculé à partir de la distance ;
- prix fixe selon type de logement ;
- coût fixe de déménagement selon logement ;
- deux mois de logement dans le total ;
- mensualité calculée sur trois mois ;
- Mobility Fit dérivé de distance et logement/salaire.

Ce calcul est utile comme prototype, mais il ne couvre pas encore :

- coût de la vie ;
- installation détaillée ;
- transport local ;
- dépenses avant premier salaire ;
- sources externes ;
- confiance de l'estimation ;
- distinction obligatoire entre coût réel et estimation ;
- règles propres à un programme.

---

# 37. LIMITATION ACTUELLE DU SEUIL

Le code actuel de création de demande vérifie que :

**coût total <= salaire**

soit un plafond de 100 % du salaire.

La vision validée du niveau 1 impose :

**coût total <= 35 % du salaire approuvé par Recruiter.**

Il existe donc un **écart fonctionnel majeur** entre le code actuel et la règle métier nouvellement définie.

Ce point doit être corrigé lors de l'implémentation du nouveau moteur.

---

# 38. LIMITATION ACTUELLE DU SALAIRE

L'interface Talent actuelle permet de saisir directement le salaire.

La vision cible impose :

> **Le salaire de référence doit être celui officiellement approuvé par le Recruiter pour le job obtenu.**

Le champ ne doit donc plus être considéré comme une donnée librement déclarée lorsque l'emploi est issu d'un recrutement Jobly vérifiable.

Une valeur déclarée par le Talent peut rester utile comme donnée secondaire, mais ne doit pas remplacer la référence Recruiter approuvée.

---

# 39. LIMITATION ACTUELLE DE L'ÉLIGIBILITÉ

Le moteur actuel ne possède pas encore un véritable objet de décision d'éligibilité.

Il faut créer une décision explicable et versionnée.

---

# 40. LIMITATION ACTUELLE DES PROGRAMMES

Le code actuel possède des partenaires Mobility spécialisés :

- FINANCE ;
- HOUSING ;
- TRANSPORT.

Mais il ne possède pas encore le modèle générique complet :

**Institution → Programme → Rules → Funding Allocation → Transactions → Impact.**

C'est précisément une zone à construire.

---

# 41. LIMITATION ACTUELLE DE L'INSTITUTIONAL HUB

Les surfaces Partner et rapports existent.

Mais la vision institutionnelle cible est plus large :

- organisation ;
- programme ;
- budget ;
- bénéficiaires ;
- KPI ;
- transactions ;
- audit ;
- rapports ;
- gouvernance ;
- droits d'accès.

Le futur Institutional Hub doit donc absorber Mobility comme une capacité institutionnelle, et non être remplacé par un simple dashboard Partner.

---

# 42. LIMITATION ACTUELLE DES RAPPORTS

Le endpoint actuel de rapports exporte essentiellement :

- ID ;
- départ ;
- arrivée ;
- distance ;
- coût ;
- subvention ;
- statut ;
- date.

La vision institutionnelle exige à terme :

- budget ;
- allocation ;
- consommation ;
- bénéficiaires ;
- géographie ;
- profil cible ;
- prise de poste ;
- résultat ;
- impact ;
- transactions ;
- justificatifs ;
- audit.

---

# 43. LIMITATION ACTUELLE DE LA SÉCURITÉ — À CORRIGER AVANT EXPOSITION RÉELLE

L'audit direct révèle plusieurs points à traiter avant d'utiliser les surfaces institutionnelles/partenaires en environnement réel.

### 43.1 Rapports

L'API `/api/mobility/partner/reports` vérifie qu'un utilisateur est partenaire ou recruteur/admin, puis sélectionne les `MobilityRequest` sans filtrage apparent par organisation, partenaire, programme ou dossiers autorisés.

Cela doit être remplacé par une autorisation **scope-based**.

### 43.2 Garantie recruteur

`/api/mobility/recruiter/guarantee` met à jour un dossier par `requestId` sans démontrer dans le code actuel que le recruteur est propriétaire/autorisé sur le recrutement concerné.

Il faut lier :

**Recruiter → Application → Job → Talent → MobilityRequest.**

### 43.3 Validation partenaire

Même problème conceptuel pour `/api/mobility/partner/validate`.

Un partenaire doit seulement pouvoir agir sur les dossiers/programmes qui lui sont attribués.

### 43.4 Pass

La génération du Pass est actuellement très fortement orientée Admin et utilise un état `PAID`.

Le futur modèle doit séparer :

**validation programme ≠ financement ≠ paiement ≠ Pass transport.**

---

# 44. RÈGLE D'ARCHITECTURE À ADOPTER

Aucun partenaire ne doit avoir un accès global à Mobility.

Le contrôle doit être :

**User → Organization → Role → Program → Scope → Resource.**

Même principe pour Recruiter :

**User → Recruiter Organization → Job → Application → MobilityRequest.**

---

# 45. MIGRATION ARCHITECTURALE

Il ne faut pas supprimer immédiatement les tables existantes.

Approche :

1. conserver `MobilityRequest` ;
2. conserver les données historiques ;
3. introduire les nouveaux objets ;
4. rattacher progressivement les demandes existantes ;
5. maintenir la compatibilité ;
6. migrer les calculs vers le nouveau moteur ;
7. retirer seulement les champs devenus obsolètes après migration sûre.

---

# 46. COMPATIBILITÉ AVEC LE TALENT MARKET

Le Talent Market multi-pays déjà codé n'est pas à recréer.

Il devient une **source amont de mobilité**.

Exemple :

**Talent découvre un emploi au Sénégal → recrutement → besoin de mobilité → Mobility Eligibility → financement → départ → prise de poste.**

Donc :

**Talent Market ≠ Mobility.**

Talent Market peut alimenter Mobility.

---

# 47. COMPATIBILITÉ AVEC CAREER BRAIN

Career Brain doit fournir :

- localisation connue ;
- aspirations ;
- historique ;
- contraintes connues ;
- préférences ;
- objectifs.

Mobility enrichit ensuite Career Brain avec :

- mobilité réalisée ;
- destination ;
- coûts ;
- temps ;
- contraintes ;
- résultats.

---

# 48. COMPATIBILITÉ AVEC J'IA

La `lib/jia/mobilityIntelligence.ts` actuelle construit déjà une vue de :

- demandes ;
- distance ;
- coût ;
- coût mensuel ;
- Mobility Fit ;
- statut ;
- étape ;
- subvention.

Cette intelligence doit évoluer vers :

**diagnostic + eligibility + funding match + orchestration + impact.**

---

# 49. COMPATIBILITÉ AVEC RECRUITER

Le salaire doit provenir de l'emploi réellement obtenu.

Le Recruiter doit pouvoir :

- confirmer le salaire ;
- confirmer la date de prise de poste ;
- confirmer la destination ;
- confirmer éventuellement un support ;
- fournir une garantie si le modèle retenu l'autorise.

---

# 50. COMPATIBILITÉ AVEC INSTITUTIONAL HUB

Institutional Hub doit être le point d'entrée des futurs partenaires institutionnels.

Mais il doit rester vide de partenaires réels tant qu'aucun partenariat n'est établi.

État initial :

**Aucun partenaire connecté.**

État cible :

**Institution → Programme → Pilotage → Impact.**

---

# 51. PREMIÈRE VERSION À IMPLÉMENTER

Le premier chantier concret ne doit pas être « GIZ ».

Il doit être :

## F1 — MOBILITY CORE

### A. Job linkage
Relier la demande Mobility à l'emploi obtenu.

### B. Recruiter salary
Récupérer le salaire officiellement approuvé.

### C. Origin/destination
Structurer origine/destination.

### D. Cost engine
Décomposer le coût.

### E. Eligibility engine
Appliquer 35 %.

### F. Decision
Créer une décision explicable.

### G. Talent Journey
Présenter le parcours.

### H. Recruiter view
Présenter le statut opérationnel.

### I. Audit
Tracer chaque décision.

---

# 52. DEUXIÈME VERSION

## F2 — FUNDING ARCHITECTURE

Créer les abstractions :

- Institution ;
- Program ;
- FundingRule ;
- FundingAllocation ;
- Transaction ;
- RepaymentPlan ;
- Guarantee ;
- Evidence.

Aucun partenaire réel.

---

# 53. TROISIÈME VERSION

## F3 — INSTITUTIONAL MOBILITY

Créer dans Institutional Hub :

- programmes ;
- bénéficiaires ;
- financements ;
- transactions ;
- KPI ;
- reporting ;
- audit.

Toujours sans partenaire réel.

---

# 54. QUATRIÈME VERSION

## F4 — J'IA MOBILITY

- diagnostic ;
- calcul ;
- explication ;
- matching ;
- orchestration ;
- anticipation ;
- rappels ;
- anomalies.

---

# 55. CINQUIÈME VERSION

## F5 — AFRICA

- pays ;
- devises ;
- géographies ;
- coûts ;
- mobilité transfrontalière ;
- règles ;
- programmes multi-pays.

---

# 56. CRITÈRE DE FIN DU CHANTIER

Mobility ne sera pas considéré comme architecturalement terminé tant que le système ne pourra pas représenter, sans code spécifique à un partenaire :

**un Talent + un emploi obtenu + un besoin de mobilité + un calcul de coût + une règle d'éligibilité + une décision + un programme + un financement + une exécution + une arrivée + une prise de poste + un résultat + un reporting institutionnel.**

---

# 57. RÈGLE ABSOLUE DE CONCEPTION

> **Construire l'infrastructure avant de construire les partenariats.**

Le premier partenaire réel doit être une **configuration du système**, pas une nouvelle architecture.

Le premier programme réel doit être une **instance du modèle Programme**, pas une fonctionnalité spéciale.

Le premier financement réel doit être une **instance du Funding Engine**, pas un paiement codé en dur.

---

# 58. RÈGLE ABSOLUE DE VÉRITÉ

Toujours distinguer :

**SPÉCIFIÉ**

**CODÉ**

**ACCESSIBLE**

**CONNECTÉ**

**TESTÉ**

**VALIDÉ**

**DÉPLOYÉ**

Et, pour les partenaires :

**CONFIGURÉ**

**CONTRACTUALISÉ**

**ACTIF**

**FINANCÉ**

**OPÉRATIONNEL**

Un partenaire ou programme ne doit jamais être considéré comme réel parce qu'une fixture existe.

---

# 59. DÉCISION DE CONCEPTION AU 02/10/2026

La vision Mobility est désormais :

> **une infrastructure de mobilité professionnelle et de financement de l'accès effectif à l'emploi, intégrée à l'ensemble des écosystèmes Jobly, construite avant tout partenariat réel et conçue pour devenir multi-programmes, multi-institutions et panafricaine.**

Le Talent Market multi-pays et J'IA Watch restent des composants réutilisables, mais ne définissent plus à eux seuls Mobility.

**Le cœur est :**

**EMPLOI OBTENU → FRICTION → DIAGNOSTIC → ÉLIGIBILITÉ → SOLUTION → MOBILITÉ → ARRIVÉE → PRISE DE POSTE → IMPACT.**

