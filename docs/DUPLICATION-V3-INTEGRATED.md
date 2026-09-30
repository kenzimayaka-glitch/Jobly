# DUPLICATION V3 — Architecture intégrée par granularité et contradiction

Date : 30 septembre 2026  
Branche : `analysis/duplication-v3-integrated-20260930`  
Périmètre : audit 360° des offres actives, analyse en lecture seule.

## Objectif

Remplacer l'interprétation binaire de `DUPLICATION` par des constats traçables. Un mot commun ne déclenche jamais une duplication. La décision s'appuie sur des unités sémantiques, leur section, les discriminants de l'offre, la récurrence par source et des contre-preuves.

## Chaîne intégrée

`Snapshot offres → sections normalisées → unités sémantiques → comparaison intra/inter-offres → contradiction → décision → rapport JSON + résumé Actions`.

Le script `scripts/duplication-v3-contradiction.mjs` consomme les résultats du rapport 360° (`audit-output/offers-audit.json`) et produit `audit-output/duplication-v3-report.json`. Le pipeline conserve désormais `normalizedContent` dans le rapport d'audit pour que la V3 puisse examiner les sections plutôt que le seul score ou le texte aplati.

## Principes de décision

- **DUPLICATION** : plusieurs unités sémantiques convergentes et plusieurs discriminants concordants, sans contradiction forte de section.
- **TEMPLATE_REUSE / NO_DUPLICATION** : blocs récurrents d'une même source avec discriminants d'offre divergents; à réexaminer si des éléments contraires apparaissent.
- **CROSS_SECTION_LEAK / REVIEW** : contenu partagé entre sections fonctionnellement incompatibles; la propriété du contenu doit être confirmée.
- **SHARED_BLOCK_OR_VOCABULARY / REVIEW** : un seul bloc partagé, insuffisant pour conclure.
- **INTRA_SECTION_REPEAT / REVIEW** et **CROSS_SECTION_REUSE / REVIEW** : répétitions internes conservées comme pistes, jamais automatiquement comptées comme duplication confirmée.

Les similarités lexicales ne sont que des générateurs de candidats. Le rapport conserve les unités appariées, leurs sections, leurs chemins, les discriminants (titre, entreprise, lieu, URL), les compteurs de correspondances et la justification.

## Vocabulaire et granularité

Les alias de sections couvrent notamment formation/éducation, expérience, compétences, missions/responsabilités, profil/exigences, avantages, candidature/contact, échéance et description. Le vocabulaire par section apporte du contexte; il ne constitue pas une preuve exclusive. Un terme peut appartenir à plusieurs sections.

## Validation

`node scripts/duplication-v3-contradiction.mjs --self-test` exécute les cas de contrôle intégrés. Le workflow 360° exécute ce test puis analyse le snapshot produit dans le même run et publie les deux rapports comme artifact. La validation sur les 254 offres historiques exige leur snapshot exact; le workflow courant interroge le stock actif au moment de son exécution et ne doit pas être présenté comme une reproduction de l'audit #41.

## Garde-fous

- Aucune écriture Supabase : les données normalisées sont seulement lues par l'audit existant.
- Aucun changement de `main`, aucune fusion et aucun déploiement Vercel.
- Les résultats V3 ne remplacent pas les indicateurs historiques avant comparaison documentée.
- Tout `REVIEW` doit rester visible et ne doit pas être artificiellement converti en duplication confirmée.

## Limites connues

Le script utilise des règles explicables et une similarité de tokens, pas un modèle d'embeddings ni une validation humaine. Les seuils sont des règles de triage à calibrer sur un jeu annoté; le rapport ne prétend pas établir la vérité métier sans examen des preuves.