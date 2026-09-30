# Jobly — Vocabulary & Context Rules for Offer Duplication v2

## Objective

The DUPLICATION control must distinguish a shared word from a shared information unit.

A word appearing in two sections is not a duplication by itself.

The engine resolves duplication in four levels:

| Level | Comparison | Decision |
|---|---|---|
| L1 | Same isolated word | IGNORE |
| L2 | Similar expression / phrase | CONTEXT_ANALYSIS |
| L3 | Same information / same requirement | DUPLICATION_CANDIDATE |
| L4 | Ownership of the information | FINAL_DECISION |

## Information model

Each vocabulary entry follows:

expression → naturalCategory → compatibleCategories → forbiddenCategories → priority → contextualTriggers → exceptions

Categories currently covered:
- PROFILE
- EDUCATION
- EXPERIENCE
- SKILLS
- QUALITIES
- MISSIONS
- BENEFITS
- APPLICATION
- DESCRIPTION

## Initial vocabulary

| Expression family | Natural category | Compatible | Context that changes ownership | Priority |
|---|---|---|---|---|
| diplôme, diplôme universitaire, certification | EDUCATION | PROFILE, APPLICATION | copie, joindre, fournir, envoyer, dossier, candidature | APPLICATION |
| licence, master, doctorat, BTS, DUT | EDUCATION | PROFILE | application verbs / pièces demandées | APPLICATION |
| formation, niveau d'études | EDUCATION | PROFILE, APPLICATION | preuve, diplôme, copie, dossier | APPLICATION |
| expérience, années d'expérience | EXPERIENCE | PROFILE, APPLICATION | justificatif, CV, candidature | APPLICATION |
| compétence, maîtrise, connaissance | SKILLS | PROFILE, MISSIONS | exigé, requis, maîtriser, savoir utiliser | SKILLS / MISSIONS by sentence |
| gestion, management, communication | CONTEXTUAL | SKILLS, MISSIONS, EXPERIENCE, PROFILE | never classify from the word alone | CONTEXT |
| responsabilité, mission, tâches | MISSIONS | EXPERIENCE, PROFILE | actual past activity → EXPERIENCE | MISSIONS / EXPERIENCE |
| qualités, rigueur, autonomie, dynamisme | QUALITIES | PROFILE, APPLICATION | required / recherché → QUALITIES | QUALITIES |
| salaire, rémunération, avantages | BENEFITS | APPLICATION | package / offre / proposé → BENEFITS | BENEFITS |
| envoyer, joindre, fournir, déposer | APPLICATION | — | candidature / dossier / CV / diplôme | APPLICATION |
| CV, lettre de motivation, dossier | APPLICATION | PROFILE | document requested for application → APPLICATION | APPLICATION |
| lieu, ville, Yaoundé, Douala, Cameroun | CONTEXTUAL | PROFILE, APPLICATION, DESCRIPTION | work location → APPLICATION/DESCRIPTION | CONTEXT |
| entreprise, société, employeur | DESCRIPTION | PROFILE | candidate employer history → EXPERIENCE | CONTEXT |

## Ownership rules

### Rule A — lexical overlap

comptabilité in EDUCATION and SKILLS is not a duplication.

Example: Education: Licence en comptabilité / Skills: Maîtrise de la comptabilité.

Decision: NO_DUPLICATION.

### Rule B — semantic overlap

If two sections express related but different facts, do not flag automatically.

Example: Profile: Expérience dans la gestion / Skills: Gestion de projet.

Decision: NO_DUPLICATION.

### Rule C — identical information

If two sections contain materially the same fact, flag the pair.

Example: Education: Licence en comptabilité / Profile: Licence en comptabilité.

Decision: DUPLICATION_CANDIDATE.

### Rule D — application ownership

Application instructions override lexical ownership.

Example: Education vocabulary: diplôme / Application: Envoyer une copie du diplôme.

Decision: APPLICATION owns the phrase; no duplication with EDUCATION merely because diplôme occurs there.

## Confidence

- HIGH: same normalized fact/requirement and same semantic owner.
- MEDIUM: strong phrase similarity but context is required.
- LOW: isolated lexical overlap or ambiguous generic term.

Automatic deletion is prohibited.

Only HIGH-confidence duplication candidates may become actionable after the ownership check.

## Source handling

Infos Concours Education is not an automatic duplication exception and is not automatically erroneous.

Its content must pass through the same section-level vocabulary and ownership rules as every other source.

The source key is evidence about provenance, not evidence that two sections duplicate one another.

## Required audit output

For every candidate:

offerId, sourceKey, sectionA, sectionB, expression, matchLevel, similarity, informationSame, owner, confidence, decision, reason

Allowed decisions:
- NO_DUPLICATION
- CONTEXT_ANALYSIS
- DUPLICATION_CANDIDATE
- DUPLICATION_CONFIRMED

The audit must preserve the original content and must not modify or delete offers.

## Scope for the current investigation

Apply this logic first to the already identified 132 DUPLICATION offers.

Do not rerun the complete 254-offer audit merely to change the classification logic.

After the 132-offer pass, compare the resulting categories against the previous 132 flags:

1. false positives;
2. legitimate duplicates;
3. ambiguous cases;
4. source-specific patterns;
5. especially infosconcourseducation.

Then update the detector before any corrective data mutation.