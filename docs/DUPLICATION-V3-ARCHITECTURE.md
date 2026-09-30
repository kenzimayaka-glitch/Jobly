# DUPLICATION V3 — Architecture par granularité + contradiction

Date: 2026-09-30
Branche: fix/duplication-v3-contradiction-20260930
Base: alignment/20260918-full-compliance
Référence: JOBLY-PROD, sans modification de données.

## 1. Problème corrigé
Le contrôle historique réduisait la duplication à un booléen. Cette approche confond mot commun et contenu commun, template source et duplication métier, et réutilisation légitime avec fuite sémantique.

## 2. Unité d'analyse
OFFRE → SECTION → UNITE → VALEUR NORMALISEE → VOCABULAIRE → RELATION → CONTRADICTION → DECISION.
Une unité est une phrase, puce, paire clé/valeur ou valeur structurée. Un simple token ne peut jamais déclencher DUPLICATION.

## 3. Vocabulaire par section
Le vocabulaire est un signal de contexte, jamais une preuve.
Education: diplôme, licence, master, formation, université, école, spécialité.
Experience: expérience, années, poste, responsabilité, mission.
Skills: compétence, maîtrise, logiciel, outil, langue.
Responsibilities: missions, responsabilités, superviser, gérer, coordonner.
Requirements: profil, candidat, qualification, prérequis, exigence.
Application: candidature, email, téléphone, CV, dossier.
Deadline: date limite, clôture, soumission.
Un terme peut appartenir à plusieurs vocabulaires. La combinaison section + unité + relation décide.

## 4. Matrice de compatibilité
COMPATIBLE / SUSPICIOUS / INCOMPATIBLE avant toute conclusion.
Exemples légitimes: education ↔ requirements, skills ↔ requirements.
Exemples suspects: deadline ↔ education, contact/application ↔ responsibilities, application ↔ benefits.

## 5. Preuves
1. exact normalized match
2. phrase overlap
3. semantic-token overlap
4. section-context mismatch
5. structured-value collision
6. source/template recurrence
7. uniqueness de l'information
8. contradiction avec la fonction de la section
Un mot commun seul = signal négligeable.

## 6. Méthode par contradiction
Pour chaque candidat, chercher d'abord une explication légitime: template de source, vocabulaire normal, section compatible, répétition éditoriale, différence de contexte.
Si l'explication résiste → TEMPLATE_REUSE ou SHARED_VOCABULARY.
Si aucune explication ne résiste → DUPLICATION.
Si les preuves sont insuffisantes → REVIEW, jamais DUPLICATION forcée.

## 7. Classes
NONE
SHARED_VOCABULARY
TEMPLATE_REUSE
CROSS_SECTION_REUSE
CROSS_SECTION_LEAK
DUPLICATE_OFFER
REVIEW

## 8. Infos Concours Education
Cette source reste dans le périmètre. Son sourceKey, ses sections, son vocabulaire et ses blocs récurrents doivent être mesurés comme pour toute autre source.
Un bloc identique sur beaucoup d'offres de la même source devient TEMPLATE_REUSE si les champs discriminants diffèrent.
Un bloc métier identique entre offres avec forte convergence des informations discriminantes peut devenir DUPLICATE_OFFER.

## 9. Sortie
Chaque finding doit contenir offerId ou pair d'offres, classe, décision, confiance, sections, preuves et contre-preuves.
Le rapport global donne offres analysées, unités, candidats, cas prouvés, templates, reviews, ventilation par sourceKey et par paire de sections.

## 10. Garde-fous
Aucune écriture Supabase. Aucune modification de données. Aucun déploiement. Aucun changement de main.

## 11. Critère de réussite
Le but n'est pas de faire baisser mécaniquement 132. Le but est d'expliquer les 132 cas: vraie duplication, template légitime ou review.
Le nombre final de DUPLICATION doit être une conséquence de la preuve et non d'un seuil arbitraire.