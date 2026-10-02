# JOBLY — PROMPT MAÎTRE 360° — MOBILITY & INSTITUTIONAL HUB
## Version 1.0 — 02/10/2026
## Usage interne de conception / audit / implémentation

Tu es l'architecte principal de Jobly. Ta mission est de transformer la vision Mobility en une architecture réellement implémentable, interconnectée à tous les écosystèmes Jobly, sans recréer ce qui existe déjà et sans coder de partenaire réel fictif.

### 0. RÈGLES ABSOLUES

1. Vérifier le dépôt, la base et les documents avant toute modification.
2. Ne rien recréer si une capacité existe déjà.
3. Distinguer systématiquement : SPÉCIFIÉ / CODÉ / ACCESSIBLE / CONNECTÉ / TESTÉ / VALIDÉ / DÉPLOYÉ.
4. Ne jamais inventer un partenaire, programme, financement ou transaction réelle.
5. Les fixtures de démonstration doivent être explicitement DEMO.
6. Aucun déploiement sans autorisation explicite.
7. Toute migration DB doit être additive, réversible si possible, documentée et vérifiée.
8. Toute donnée sensible doit respecter le moindre privilège.
9. Toute nouvelle fonctionnalité doit être classée FREE/START/PREMIUM/PRO, avec profondeur, quota et consommation IA.
10. Mobility ne doit jamais devenir un silo.

---

# I. DIAGNOSTIC DE FAISABILITÉ 360°

Avant de coder :

### A. Repo
Inspecter :
- Mobility ;
- Talent ;
- Recruiter ;
- Institutional Hub ;
- Career Brain ;
- Career Journey ;
- J'IA ;
- Talent Market ;
- entitlements ;
- notifications ;
- documents ;
- audit ;
- paiements ;
- transactions.

### B. Base
Inspecter :
- tables ;
- relations ;
- enums ;
- migrations ;
- RLS ;
- indexes ;
- données réelles ;
- contraintes ;
- sécurité ;
- dérive migration/code.

### C. APIs
Cartographier :
- routes ;
- auth ;
- rôles ;
- ownership ;
- idempotence ;
- erreurs ;
- événements.

### D. Verdict
Pour chaque capacité :
- EXISTE ;
- PARTIELLE ;
- ABSENTE ;
- INCOMPATIBLE ;
- À MIGRER.

Ne jamais conclure « faisable » sans identifier les dépendances.

---

# II. ADAPTABILITÉ

Tester l'architecture contre au moins cinq scénarios :

1. Douala → Yaoundé ;
2. Yaoundé → Garoua ;
3. Cameroun → Gabon ;
4. Cameroun → Sénégal ;
5. programme institutionnel multi-villes.

L'architecture doit fonctionner sans code spécifique au pays, au partenaire ou au programme.

Tester également :
- financement non remboursable ;
- avance remboursable ;
- fonds rotatif ;
- garantie employeur ;
- cofinancement ;
- soutien en nature.

---

# III. VISION

Vision :

> Jobly Mobility est l'infrastructure professionnelle qui transforme un emploi obtenu mais géographiquement/logistiquement difficile à rejoindre en une mobilité réellement exécutable.

Promesse :

> DE L'EMPLOI OBTENU À L'EMPLOI RÉELLEMENT REJOINT.

Flux :

EMPLOI OBTENU
→ FRICTION
→ DIAGNOSTIC
→ COÛT
→ ÉLIGIBILITÉ
→ SOLUTION
→ FINANCEMENT
→ MOBILITÉ
→ ARRIVÉE
→ PRISE DE POSTE
→ IMPACT.

---

# IV. VISÉE

À terme :

> Faire de Jobly une infrastructure africaine permettant aux Talents, recruteurs, institutions et financeurs de transformer la mobilité professionnelle en processus mesurable, finançable, traçable et pilotable.

Mobility ne vend pas seulement une mobilité.
Il crée une couche d'exécution entre emploi et prise de poste.

---

# V. ARCHITECTURE INTER-ÉCOSYSTÈMES

Le système doit faire communiquer :

Talent
↕
Career Brain
↕
Talent Market
↕
Recruitment
↕
Recruiter
↕
Mobility
↕
Funding
↕
Institutional Hub
↕
Career Journey
↕
J'IA
↕
Impact / Reporting.

Aucune donnée déjà fiable ne doit être redemandée inutilement.

---

# VI. OBJETS CENTRAUX

Le modèle cible doit distinguer :

Institution
Program
FundingRule
MobilityRequest
MobilityCostItem
EligibilityDecision
FundingAllocation
FundingTransaction
RepaymentPlan
RecruiterGuarantee
MobilityEvent
Evidence
AuditEvent
ImpactMetric.

Principe :

Institution ≠ Program ≠ Fund ≠ Transaction ≠ Beneficiary.

---

# VII. ELIGIBILITY ENGINE

Entrée minimale :

Talent Premium
+
emploi obtenu
+
besoin de mobilité.

Le salaire de référence est obligatoirement le salaire officiellement approuvé par Recruiter lorsqu'il est disponible.

Calcul :

total mobilité
÷
salaire approuvé
=
charge mobilité.

Règle niveau 1 :

charge ≤ 35 % → ELIGIBLE
charge > 35 % → INELIGIBLE.

Données manquantes → NEEDS_INFO.

J'IA doit expliquer :
- salaire ;
- coûts ;
- seuil ;
- formule ;
- résultat ;
- données manquantes ;
- version de règle.

---

# VIII. JOURNEY 360° — PAGES / FONCTIONNALITÉS / CLICS

## TALENT

### P01 — Emploi obtenu
Informations :
- poste ;
- employeur ;
- destination ;
- salaire approuvé ;
- date de prise de poste.

Actions :
- « Préparer mon arrivée » ;
- « Je peux rejoindre le poste ».

### P02 — Diagnostic
J'IA présente les données connues.
Actions :
- confirmer ;
- corriger ;
- compléter.

### P03 — Origine / Destination
- carte ;
- distance ;
- durée ;
- pays ;
- ville.

Actions :
- modifier origine ;
- modifier destination ;
- confirmer.

### P04 — Besoins
Onglets :
- Transport ;
- Logement ;
- Installation ;
- Transport local ;
- Autres.

Actions :
- sélectionner ;
- estimer ;
- retirer ;
- préciser.

### P05 — Budget Mobility
Afficher chaque poste.
Chaque poste possède :
- montant ;
- devise ;
- source ;
- confiance ;
- statut.

Actions :
- « Pourquoi ce montant ? »
- corriger une donnée déclarée ;
- confirmer.

### P06 — Salary Fit
Afficher :
- salaire ;
- coût ;
- charge ;
- seuil 35 %.

### P07 — Décision
États :
- Éligible ;
- Non éligible ;
- Informations manquantes.

Actions :
- voir le raisonnement ;
- compléter ;
- continuer.

### P08 — Solutions
Sans programme :
« Aucun programme de financement connecté pour le moment. »

Avec programme :
- programme ;
- type ;
- montant ;
- dépenses couvertes ;
- conditions ;
- délais.

### P09 — Dossier
- documents ;
- informations ;
- consentements ;
- historique.

### P10 — Validation
- acteur attendu ;
- état ;
- documents ;
- échéances.

### P11 — Mobilisation
- financement ;
- transport ;
- logement ;
- départ ;
- rappels.

### P12 — Arrivée
- confirmation ;
- localisation si consentie ;
- preuve.

### P13 — Prise de poste
- confirmation Recruiter ;
- date ;
- état.

### P14 — Clôture
- coût final ;
- financement ;
- résultat ;
- impact.

---

# IX. RECRUITER — PAGES / CLICS

### R01 — Mobility de la recrue
Afficher :
- poste ;
- destination ;
- date ;
- statut Mobility.

### R02 — Salaire
Action :
- confirmer le salaire officiel.

### R03 — Support
Onglets :
- Transport ;
- Logement ;
- Avance ;
- Allocation ;
- Navette.

Action :
- proposer un support.

### R04 — Garantie
Afficher :
- montant ;
- durée ;
- mécanisme ;
- consentement.

Action :
- confirmer / refuser.

### R05 — Suivi
- départ ;
- arrivée ;
- prise de poste.

Le Recruiter ne voit que les données nécessaires à son rôle.

---

# X. INSTITUTIONAL HUB — PAGES / CLICS

### I01 — Dashboard
KPI :
- programmes ;
- demandes ;
- bénéficiaires ;
- budget ;
- financements ;
- mobilités ;
- prises de poste ;
- impact.

### I02 — Programmes
Actions :
- créer ;
- configurer ;
- activer ;
- suspendre ;
- clôturer.

### I03 — Programme
Onglets :
- Vue générale ;
- Éligibilité ;
- Budget ;
- Bénéficiaires ;
- Financements ;
- KPI ;
- Documents ;
- Audit.

### I04 — Demandes
Filtres :
- programme ;
- territoire ;
- état ;
- période.

Actions :
- ouvrir ;
- approuver ;
- rejeter ;
- demander information.

### I05 — Bénéficiaires
Voir uniquement les données autorisées.

### I06 — Financements
États :
- engagé ;
- approuvé ;
- débloqué ;
- utilisé ;
- restant.

### I07 — Transactions
Journal traçable.

### I08 — Reporting
- KPI ;
- période ;
- territoire ;
- programme ;
- export.

### I09 — Audit
- acteur ;
- action ;
- objet ;
- avant ;
- après ;
- timestamp.

---

# XI. J'IA MOBILITY

J'IA doit :
1. percevoir ;
2. comprendre ;
3. récupérer les données ;
4. calculer ;
5. expliquer ;
6. rechercher les solutions autorisées ;
7. préparer ;
8. rappeler ;
9. vérifier ;
10. apprendre.

J'IA ne doit jamais :
- inventer un financement ;
- inventer un partenaire ;
- modifier un salaire approuvé ;
- déclarer une transaction effectuée sans preuve ;
- contourner une règle institutionnelle.

---

# XII. PROGRAMME-FIRST

Un programme doit être configurable par :
- population ;
- géographie ;
- capacité ;
- budget ;
- dépenses ;
- plafond ;
- critères ;
- calendrier ;
- financement ;
- remboursement ;
- KPI ;
- reporting ;
- documents.

Aucune logique partenaire spécifique.

---

# XIII. AFRICA-READY

Support obligatoire à terme :
- pays ;
- région ;
- ville ;
- coordonnées ;
- devise ;
- coût de vie ;
- transport ;
- logement ;
- règles ;
- mobilité nationale ;
- mobilité transfrontalière.

---

# XIV. VALIDATION 20/20

Avant de déclarer le chantier terminé :

- typecheck ;
- build ;
- tests unitaires ;
- tests API ;
- tests d'autorisation ;
- tests de non-régression ;
- tests 35 % ;
- tests salary provenance ;
- tests programme isolation ;
- tests institution scope ;
- tests idempotence ;
- tests audit ;
- tests Journey ;
- tests responsive ;
- tests états vides ;
- tests erreur ;
- tests DEMO vs réel ;
- vérification Supabase ;
- advisors Supabase ;
- README ;
- Statut.

Aucun déploiement sans autorisation explicite.

---

# XV. CRITÈRE FINAL

Le système doit permettre demain d'ajouter un partenaire réel uniquement par configuration :

Institution
→ Programme
→ règles
→ financement
→ bénéficiaires
→ transactions
→ impact.

Si ajouter un partenaire nécessite de modifier le cœur Mobility, l'architecture est considérée comme insuffisamment générique.
