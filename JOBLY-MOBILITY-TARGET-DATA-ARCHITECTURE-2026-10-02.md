# JOBLY MOBILITY — MODÈLE D'ARCHITECTURE CIBLE
## 02/10/2026

## 1. Chaîne de vérité
Talent → Application → RecruitmentDecision → RecruitmentOffer → MobilityRequest → EligibilityDecision → FundingProgram → FundingAllocation → FundingTransaction → MobilityEvent → Start Confirmation → Impact.

### Source de vérité du salaire
RecruitmentOffer.salaryProposed avec status ACCEPTED, sous réserve des règles de validation du recrutement.

Le champ MobilityRequest.salary historique ne doit plus devenir la source primaire lorsque le salaire Recruiter est disponible.

## 2. Extension de MobilityRequest
Champs cibles :
- applicationId
- salaryApproved
- salarySource
- salaryCurrency
- eligibilityThresholdPercent
- eligibilityBurdenPercent
- eligibilityStatus
- eligibilityReason
- eligibilityCalculatedAt
- eligibilityVersion.

Les champs historiques restent conservés pendant migration.

## 3. MobilityCostItem
Catégories :
- TRANSPORT
- HOUSING
- INSTALLATION
- LOCAL_TRANSPORT
- COST_OF_LIVING
- OTHER

Chaque item :
- amount
- currency
- source
- confidence
- estimatedAt
- verifiedAt
- eligibilityStatus.

## 4. EligibilityDecision
Une décision est versionnée et immuable après validation.

Contenu :
- requestId
- salaryReference
- totalCost
- threshold
- burden
- status
- reason
- missingInformation
- engineVersion
- calculatedAt
- actor / trigger.

## 5. Institution
Organisation institutionnelle indépendante de Partner commercial.

Champs conceptuels :
- id
- name
- type
- country
- status
- verificationStatus
- createdAt.

## 6. InstitutionMember
- institutionId
- userId
- role
- status
- permissions.

Le scope institutionnel est obligatoire.

## 7. MobilityProgram
- institutionId
- name
- description
- status
- geography
- targetPopulation
- capacity
- budget
- currency
- startDate
- endDate
- rules
- reportingConfig.

## 8. MobilityFundingRule
- programId
- fundingType
- maximumAmount
- eligibleCategories
- repaymentRequired
- guaranteeRequired
- repaymentDuration
- repaymentFrequency
- salaryDeductionAllowed
- coFundingAllowed.

Aucune règle ne doit être codée spécifiquement pour un partenaire.

## 9. FundingAllocation
Représente l'engagement d'un programme envers une demande.

- programId
- requestId
- amount
- currency
- fundingType
- status
- approvedBy
- approvedAt.

## 10. FundingTransaction
Journal financier logique.

- allocationId
- type
- amount
- currency
- status
- externalReference
- executedAt
- evidenceId.

Une transaction ne doit jamais être créée uniquement parce qu'une page est affichée.

## 11. RepaymentPlan
- allocationId
- model
- principal
- currency
- durationMonths
- installmentAmount
- startDate
- status
- guaranteeId.

Le modèle doit distinguer :
- non-remboursable ;
- remboursement ;
- fonds rotatif ;
- cofinancement.

## 12. RecruiterGuarantee
- requestId
- recruiterUserId
- employerId / organizationId
- guaranteedAmount
- duration
- deductionModel
- consent
- status
- evidenceId.

## 13. MobilityEvent
Exemples :
- REQUEST_CREATED
- DIAGNOSTIC_STARTED
- ELIGIBILITY_CALCULATED
- PROGRAM_MATCHED
- FUNDING_APPROVED
- FUNDING_RELEASED
- DEPARTURE_CONFIRMED
- ARRIVAL_CONFIRMED
- START_CONFIRMED
- REPAYMENT_STARTED
- REPAYMENT_COMPLETED
- MOBILITY_COMPLETED.

## 14. ImpactMetric
Exemples :
- beneficiaries
- funded
- mobilized
- arrived
- started
- retained
- average cost
- average time to start
- geographic flows
- inclusion indicators selon programme.

## 15. Architecture des permissions
Talent : ses dossiers.
Recruiter : ses recrutements et dossiers liés.
Institution : programmes et bénéficiaires de son organisation.
Financeur : uniquement les programmes/allocations auxquels il est autorisé.
Admin : gouvernance Jobly.

Aucune API institutionnelle ne doit utiliser authenticated comme seul contrôle.

## 16. Architecture géographique
Country → Region → City → Coordinates.

CAMEROON_CITIES reste un provider initial.

## 17. Compatibilité
Le modèle actuel MobilityRequest reste le noyau de transition.

Migration progressive :
historique → enrichissement → Eligibility Engine → Program Engine → Funding Engine → Institutional Hub.

Pas de big-bang.
