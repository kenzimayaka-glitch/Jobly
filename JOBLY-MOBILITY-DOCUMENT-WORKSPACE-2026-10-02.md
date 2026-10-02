# JOBLY MOBILITY — DOCUMENT WORKSPACE & PROCESS SHARING — 2026-10-02

## Principe
Mobility devient un dossier partagé de traitement, inspiré de la logique SharePoint sans reproduire SharePoint. Le dossier est partagé entre Talent, Recruiter/entreprise, Institution/programme autorisé et Jobly. J'IA orchestre et explique, sans devenir l'autorité documentaire.

## Conditions d'éligibilité supplémentaires
- utilisateur Jobly depuis au moins 3 mois ;
- pack payant actif au moment de la demande ;
- emploi obtenu ;
- salaire recruteur disponible ;
- convention employeur Mobility ;
- garantie recruteur ;
- coût Mobility <= 50 % du salaire approuvé.

## Pièces obligatoires
1. CNI ou passeport en cours de validité.
   - CNI recto ;
   - CNI verso ;
   - ou passeport : page d'identité ;
   - date d'expiration obligatoire.
2. Plan de localisation.
3. Lettre d'engagement sur l'honneur.

Chaque pièce suit PENDING → UNDER_REVIEW → VERIFIED / REJECTED / EXPIRED.

## Niveau d'introduction
Les pièces sensibles ne sont pas demandées au premier écran.

Parcours :
P01 Emploi obtenu → P02 Pré-éligibilité → P03 Diagnostic → P04 Coûts → P05 Salaire / règle 50 % → P06 Dossier documentaire → P07 Vérification → P08 Décision finale → P09 Programme/Solutions → P10 Financement → P11 Mobilisation → P12 Arrivée → P13 Prise de poste → P14 Clôture.

Les conditions structurelles sont d'abord vérifiées. Si le Talent échoue sur l'ancienneté ou le pack payant, Jobly ne demande pas inutilement ses documents.

## Dossier partagé
Barre de progression :
Demande → Éligibilité → Pièces → Vérification → Garantie → Financement → Départ → Arrivée → Prise de poste → Clôture.

Chaque étape possède état, acteur attendu, date, délai éventuel, commentaire et historique. MobilityProcessEvent constitue la timeline du traitement.

## Bibliothèque documentaire
MobilityDocument est générique et couvre CNI, PASSPORT, LOCATION_PLAN, HONOR_COMMITMENT, avec nom, MIME, taille, Storage path, recto/verso, expiration, propriétaire, statut, vérificateur, date et motif de rejet.

Les fichiers restent dans Supabase Storage privé ; la base conserve les métadonnées et le chemin sécurisé.

## Visibilité
Talent : ses pièces, statuts, corrections, timeline, acteur attendu, prochaine action, décisions, financement, remboursement et historique.

Recruiter : uniquement les dossiers de ses recrutements et les éléments nécessaires à sa garantie et à ses validations.

Institution : uniquement les dossiers rattachés à ses programmes et les informations nécessaires à l'éligibilité institutionnelle, allocations, transactions, KPI et audit. CNI/passeport non exposés automatiquement.

Jobly : accès opérationnel selon permissions et audit.

## J'IA
J'IA explique les pièces manquantes, les rejets, les échéances, le dossier et l'acteur attendu. Elle ne valide pas juridiquement un document, ne modifie pas les pièces et ne contourne aucune règle.

## Expérience
Le Talent doit toujours savoir : où en est ma demande, qui doit agir, ce qui manque, pourquoi c'est bloqué et quelle est la prochaine étape.

Exemple :
🟢 Demande déposée
🟢 Éligibilité initiale
🟠 CNI — recto reçu / verso manquant
⚪ Vérification
⚪ Garantie entreprise
⚪ Financement
⚪ Départ
⚪ Arrivée
⚪ Prise de poste

Bouton principal : « Voir / compléter mon dossier ».

## Sécurité
Storage privé, URLs signées courtes, ownership serveur, accès institutionnel limité au programme, accès recruteur limité à ses dossiers, journalisation des consultations sensibles, aucune URL publique permanente pour les pièces d'identité, séparation métadonnées/fichiers.

## Modèle cible
MobilityRequest → MobilityDocument[] → MobilityProcessEvent[] → EligibilityDecision → FundingAllocation → FundingTransaction → RepaymentPlan → MobilityEvent[].

Mobility devient ainsi un dossier opérationnel partagé, et non un simple formulaire.
