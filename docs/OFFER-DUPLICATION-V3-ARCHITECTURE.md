# DUPLICATION V3 — Architecture par contradiction et propriété de l'information

## 1. Décision

Le contrôle DUPLICATION ne doit plus comparer des mots, ni des blocs de texte plats.

Il doit répondre à une question plus forte :

> **Les deux informations décrivent-elles le même fait canonique, dans le même périmètre, alors que ce fait devrait être porté par une seule section ?**

La détection devient donc une architecture **factuelle + contextuelle + contradictoire**, avec propriété unique de l'information.

Aucune suppression automatique de texte n'est autorisée par le détecteur.

---

## 2. Preuve issue de l'audit de référence

Audit #41 : 254 offres.

- DUPLICATION : 132/254 (51,97 %)
- APPLICATION_MISCLASSIFIED : 175/254 (68,90 %)
- Parmi les 132 offres DUPLICATION :
  - 122/132 ont également `applicationLeakCount > 0` et `APPLICATION_MISCLASSIFIED`
  - 10/132 n'ont pas cette combinaison
- Moyenne des architectures simulées sur les 132 :
  - Flat text : 84,38
  - Blocs + contexte : 92,20
  - Canonique + arbitrage : 118,13

La contradiction expérimentale est nette : le signal DUPLICATION est fortement couplé à une mauvaise attribution des informations d'application. Une même chaîne textuelle peut donc être comptée comme doublon parce qu'elle a été extraite/classée sans contexte.

Conclusion : **le problème principal est la propriété et le contexte de l'information, pas le vocabulaire seul.**

---

## 3. Architecture cible

```
SOURCE
  ↓
RAW CAPTURE
  ↓
BLOCK SEGMENTATION
  ↓
SECTION CANDIDATES
  ↓
FACT ATOMS
  ↓
NORMALIZATION
  ↓
OWNERSHIP ARBITRATION
  ↓
CONTRADICTION ENGINE
  ↓
DUPLICATION DECISION
  ↓
CANONICAL RECORD + AUDIT EVIDENCE
```

### Couche A — Source / provenance

Chaque information doit conserver :

- `jobId`
- `source`
- `sourceUrl`
- `sourceBlockId`
- `captureMethod`
- `rawText`
- `extractionTimestamp`

Une information sans provenance ne doit pas pouvoir produire une duplication confirmée.

### Couche B — Segmentation en blocs

Ne jamais construire le contrôle à partir de `normalizedContent` concaténé uniquement.

Chaque bloc doit conserver :

- texte
- position
- titre éventuel
- voisinage
- structure HTML si disponible
- signaux lexicaux
- signaux de section

### Couche C — Classification des sections

Sections canoniques :

- PROFILE
- EDUCATION
- EXPERIENCE
- SKILLS
- QUALITIES
- MISSIONS
- BENEFITS
- APPLICATION
- DESCRIPTION

Un bloc peut avoir plusieurs catégories candidates avant arbitrage.

Exemple :

`diplôme` → EDUCATION candidat.

Mais :

`envoyer une copie du diplôme` → APPLICATION prioritaire.

Le mot ne possède donc jamais la catégorie à lui seul.

---

## 4. Fact Atom

Chaque phrase utile est transformée en unité d'information :

```text
FactAtom {
  factId
  jobId
  rawText
  normalizedValue
  factType
  sectionCandidates[]
  owner
  scope
  qualifiers[]
  sourceBlockId
  confidence
  provenance
}
```

Exemples de `factType` :

- EDUCATION_LEVEL
- FIELD_OF_STUDY
- EXPERIENCE_YEARS
- SKILL
- LANGUAGE
- LOCATION
- RESPONSIBILITY
- TASK
- EMPLOYMENT_TYPE
- SALARY
- DEADLINE
- APPLICATION_METHOD
- APPLICATION_DOCUMENT
- CONTACT
- BENEFIT
- PROFILE_REQUIREMENT

---

## 5. Normalisation

Deux formulations ne deviennent comparables qu'après normalisation.

Exemple :

- « Licence en comptabilité »
- « Être titulaire d'une licence en comptabilité »

→ même fait canonique :

`EDUCATION_LEVEL + FIELD_OF_STUDY = licence/comptabilité`

Mais :

- « Envoyer une copie du diplôme »

→

`APPLICATION_DOCUMENT = diplôme`

Ce n'est **pas** le même fait que la qualification EDUCATION.

---

## 6. Ownership Matrix

Chaque type de fait possède une section propriétaire par défaut.

| Fact | Owner principal |
|---|---|
| diplôme / niveau requis | EDUCATION |
| domaine d'étude | EDUCATION |
| années d'expérience | EXPERIENCE |
| compétence | SKILLS |
| qualité personnelle | QUALITIES |
| responsabilité | MISSIONS |
| avantage | BENEFITS |
| mode de candidature | APPLICATION |
| pièce à fournir | APPLICATION |
| email de candidature | APPLICATION |
| délai | APPLICATION / DEADLINE |
| présentation générale | PROFILE / DESCRIPTION |

L'ownership est contextuel et peut être surchargé par des déclencheurs.

---

## 7. Contradiction Engine

Le moteur ne demande pas seulement :

> « Est-ce que ces deux textes se ressemblent ? »

Il teste plusieurs hypothèses contradictoires.

### Test 1 — Contradiction sémantique

Si A et B ont le même mot mais des faits différents :

→ NO_DUPLICATION.

Exemple :

- EDUCATION : « Licence en comptabilité »
- SKILLS : « Maîtrise de la comptabilité »

Même domaine lexical, faits différents.

### Test 2 — Contradiction de rôle

Si la même expression apparaît mais joue un rôle différent :

→ NO_DUPLICATION.

Exemple :

- EDUCATION : « diplôme »
- APPLICATION : « joindre une copie du diplôme »

### Test 3 — Contradiction de portée

Si A décrit une exigence et B une action ou un document associé :

→ NO_DUPLICATION.

Exemple :

- « Bac+3 requis »
- « joindre le diplôme lors de la candidature »

### Test 4 — Équivalence factuelle

Si A et B peuvent être réduits au même FactAtom :

→ DUPLICATION_CANDIDATE.

### Test 5 — Propriété unique

Si les deux FactAtoms ont le même contenu canonique et que leur propriétaire attendu est identique :

→ DUPLICATION_CONFIRMED après vérification de provenance.

### Test 6 — Contradiction d'application

Si un texte contient des déclencheurs comme :

- envoyer
- joindre
- fournir
- transmettre
- dossier
- candidature
- postuler
- email
- téléphone
- CV
- lettre

alors le fait doit être testé prioritairement contre APPLICATION avant toute décision de duplication.

---

## 8. Score de décision

Le score ne doit jamais être basé uniquement sur une similarité lexicale.

```
duplicateConfidence =
  factEquivalence
+ sameScope
+ sameCanonicalOwner
+ independentPresentation
+ provenanceConfidence
- roleConflict
- applicationContext
- sectionConflict
- genericWordOnly
```

Décisions :

### NO_DUPLICATION

Un test contradictoire démontre que les informations ont des rôles, portées ou propriétaires différents.

### CONTEXT_ANALYSIS

Les informations sont proches mais l'ownership ne peut pas être établi avec suffisamment de confiance.

### DUPLICATION_CANDIDATE

Même fait canonique probable, mais preuve insuffisante pour confirmer.

### DUPLICATION_CONFIRMED

Même fait canonique + même portée + propriété unique démontrée + aucune contradiction contextuelle.

---

## 9. Règle essentielle

**Un mot partagé n'est jamais une duplication.**

**Une phrase similaire n'est pas automatiquement une duplication.**

**Une information identique dans deux sections peut être une duplication uniquement si les deux occurrences représentent réellement le même FactAtom et qu'elles ne remplissent pas deux fonctions différentes.**

---

## 10. Traitement spécial des sections APPLICATION

APPLICATION est une zone protégée.

Toute information contenant un document, un canal ou une action de candidature doit être arbitrée avant le contrôle DUPLICATION.

Exemple :

```
EDUCATION
Licence en comptabilité

APPLICATION
Envoyer une copie de la licence
```

Résultat :

```
EDUCATION_LEVEL → EDUCATION
APPLICATION_DOCUMENT → APPLICATION
NO_DUPLICATION
```

---

## 11. Vocabulaire

Le vocabulaire doit être multidimensionnel :

```
expression
  → catégories candidates
  → catégorie prioritaire
  → déclencheurs contextuels
  → catégories interdites
  → type de fait
  → exceptions
```

Une expression peut donc appartenir à plusieurs catégories.

Exemple :

`diplôme`

- candidat : EDUCATION
- candidat : APPLICATION
- priorité APPLICATION si : envoyer / joindre / fournir / transmettre / dossier
- priorité EDUCATION si : titulaire / niveau / requis / formation

Le vocabulaire devient ainsi un **arbitre**, pas un simple dictionnaire.

---

## 12. Architecture de données recommandée

Ne pas modifier immédiatement le schéma métier principal.

Créer d'abord une couche d'audit dérivée :

```
offer_audit_blocks
offer_audit_facts
offer_audit_fact_relations
offer_audit_decisions
```

### offer_audit_blocks

Conserve la segmentation et la provenance.

### offer_audit_facts

Conserve les FactAtoms normalisés.

### offer_audit_fact_relations

Conserve les comparaisons :

- SAME_FACT
- RELATED_FACT
- DIFFERENT_FACT
- ROLE_CONFLICT
- SCOPE_CONFLICT
- OWNER_CONFLICT

### offer_audit_decisions

Conserve :

- ancienne alerte
- nouvelle décision
- confidence
- raisons
- FactAtoms concernés
- règles ayant produit la décision

Ainsi, chaque décision est explicable et reproductible.

---

## 13. Pipeline V3

```
raw offer
  ↓
segment blocks
  ↓
classify section candidates
  ↓
extract facts
  ↓
normalize facts
  ↓
resolve ownership
  ↓
compare only compatible facts
  ↓
run contradiction tests
  ↓
assign decision + confidence
  ↓
emit audit evidence
```

Le contrôle DUPLICATION ne doit donc plus fonctionner sur toutes les paires de mots ou de phrases.

Il doit comparer des **FactAtoms compatibles**.

---

## 14. Réduction du coût

Pour éviter une explosion combinatoire :

1. comparer d'abord par `factType`
2. puis par `scope`
3. puis par `canonicalValue`
4. puis seulement effectuer l'analyse sémantique
5. appliquer la contradiction
6. produire la décision

On passe ainsi d'une comparaison brute texte×texte à une comparaison ciblée :

```
FactType → Scope → CanonicalValue → Context → Contradiction
```

---

## 15. Première phase de validation

La référence historique des 254 offres reste figée.

On ne relance pas inutilement l'audit complet.

Sur les 132 anciennes alertes :

1. reconstruire les FactAtoms
2. appliquer V3
3. produire une décision par offre
4. comparer avec l'ancien `dupCount`
5. mesurer :
   - faux positifs
   - vrais positifs
   - ambiguïtés
   - erreurs d'ownership
   - fuites APPLICATION
6. conserver les exemples contradictoires comme tests de régression.

Objectif : obtenir une matrice de vérité avant toute modification du détecteur de production.

---

## 16. Critère de passage en production

Le nouveau moteur ne doit pas être activé globalement tant que les tests de contradiction ne démontrent pas :

- aucun mot partagé classé seul comme duplication
- aucune information APPLICATION reclassée comme EDUCATION uniquement à cause d'un mot commun
- aucun doublon confirmé sans provenance
- aucun changement silencieux du contenu métier
- toutes les décisions explicables par FactAtoms + règles
- les anciennes anomalies restent traçables

---

## 17. Architecture finale à construire

Le système cible est donc :

```
                    ┌─────────────────────┐
                    │      RAW OFFER      │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │  BLOCK SEGMENTATION │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ SECTION CANDIDATES  │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │     FACT ATOMS      │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │   NORMALIZATION     │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ OWNERSHIP ARBITER   │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ CONTRADICTION ENGINE│
                    └──────────┬──────────┘
                               ↓
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
       NO_DUPLICATION   CONTEXT_ANALYSIS   DUPLICATION_*
                                                 ↓
                                      ┌─────────────────┐
                                      │ AUDIT EVIDENCE  │
                                      └─────────────────┘
```

**Principe directeur : la granularité produit les faits ; l'ownership attribue les faits ; la contradiction empêche les faux doublons ; la provenance rend la décision vérifiable.**
