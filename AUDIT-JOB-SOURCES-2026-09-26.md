# AUDIT — JOB SOURCES / INGESTION CAMEROUN — 26/09/2026

## 1. État réel JOBLY

Audit effectué sur la base de production **JOBLY-PROD** le 26/09/2026.

Offres actives actuellement enregistrées dans `Job` par source :
- Job in Cameroun : 99
- Emplois Cameroun : 66
- JobInfoCamer : 35
- FNE Cameroun : 21
- Emploi.cm : 9
- Cameroon Desks : 2

**Total : 232 offres actives provenant de sources externes.**

Le tableau `Job` contient actuellement 317 lignes au total. Le flux n'est donc plus limité au snapshot historique de 118 offres.

## 2. Nouvelles sources auditées

| Source | Présence Cameroun | API/feed public identifié | Décision |
|---|---|---|---|
| MinaJobs | Oui | **RSS public** | **À intégrer en priorité** |
| FNE | Oui | Page publique d'offres, API publique non identifiée | Conserver + rechercher partenariat/feed officiel |
| Emploi.cm | Oui | API/RSS public non identifié | Audit technique/partenariat avant ingestion |
| JobInfoCamer | Oui | API/RSS public non identifié | Audit technique/partenariat avant ingestion |
| AfricaWork | Oui | Listings publics, API/feed public non identifié | Audit/partenariat avant ingestion |
| Techmap | Oui | **API + feeds**, couverture CM documentée | **À tester comme agrégateur externe** |
| JobsPipe | Couverture potentielle via filtres pays | API normalisée, clé requise | **À tester après accès API** |

### MinaJobs

MinaJobs publie explicitement un flux RSS d'offres et indique que le contenu peut être intégré dans un autre site à condition de renvoyer vers la source originale. Le flux couvre notamment emploi/stage et plusieurs catégories métier.

Source vérifiée :
https://cm2024.minajobs.net/rss

=> C'est actuellement la meilleure candidate pour une première intégration technique à faible friction.

### Techmap

Techmap documente une couverture spécifique du Cameroun (code CM), avec un historique et un flux de données par pays. Sa documentation indique une API JSON/RSS et un plan BASIC gratuit limité pour l'évaluation.

La page de couverture Cameroun indique environ 8 nouvelles offres/jour en moyenne sur la période récente, avec des variations historiques importantes.

=> Bon candidat pour compléter le marché international et les employeurs/ATS que les jobboards camerounais ne couvrent pas.

### JobsPipe

JobsPipe expose une API normalisée unique et permet le filtrage par code pays ISO, dont le mécanisme `job_country_code_or`.

L'API nécessite une clé hors sandbox. La couverture exacte du Cameroun doit être mesurée avant activation ; aucune estimation de volume camerounais n'est déclarée ici sans test réel.

## 3. Ce qu'il ne faut PAS faire

- Ne pas scraper Emploi.cm, JobInfoCamer, FNE ou AfricaWork automatiquement sans vérifier leurs conditions, robots.txt, flux officiels ou accord.
- Ne pas dupliquer une offre déjà présente.
- Ne pas transformer une source externe en offre Jobly-native.
- Ne pas marquer `applicationReady=true` pour une offre externe simplement parce qu'elle possède un lien.
- Ne pas faire exécuter une candidature externe par J'IA sans canal réellement supporté et vérifié.
- Ne pas mélanger les sources externes avec les offres publiées directement par les recruteurs Jobly.

## 4. Architecture d'ingestion cible

```
SOURCES
  ├─ Job in Cameroun
  ├─ Emplois Cameroun
  ├─ JobInfoCamer
  ├─ FNE
  ├─ Emploi.cm
  ├─ Cameroon Desks
  ├─ MinaJobs RSS
  ├─ Techmap API/feed
  └─ JobsPipe API
          ↓
SOURCE ADAPTERS
          ↓
NORMALISATION
          ↓
SOURCE KEY + EXTERNAL ID
          ↓
CONTENT HASH
          ↓
DÉDUPLICATION
          ↓
COMPANY RESOLUTION
          ↓
QUALITY / FRESHNESS
          ↓
AI ENRICHMENT
          ↓
JOBLY MATCHING
          ↓
TALENT / J'IA
```

Le schéma actuel de `Job` possède déjà les champs nécessaires à une ingestion robuste :
`source`, `sourceUrl`, `sourceKey`, `externalId`, `contentHash`, `sourcePublishedAt`, `lastSeenAt`, `applicationReady`, `applicationProfile`, `aiSector`, `aiSkills`, `tags`.

## 5. Déduplication proposée

Clé primaire d'identité :
1. `sourceKey + externalId` si l'identifiant externe est stable ;
2. sinon URL canonique normalisée ;
3. sinon hash de contenu + titre + entreprise + localisation.

Une même offre présente sur plusieurs sources doit pouvoir conserver sa provenance multiple sans apparaître plusieurs fois dans le flux Talent.

## 6. Ordre d'intégration recommandé techniquement

**Phase A — MinaJobs RSS**
- lecture RSS ;
- normalisation ;
- insertion/upsert ;
- lien source conservé ;
- déduplication ;
- marquage `applicationReady=false` par défaut ;
- test du volume réel.

**Phase B — Techmap**
- connexion API/feed ;
- filtre `countryCode=cm` ;
- mesure volume, fraîcheur, doublons ;
- comparaison avec les 232 offres actives existantes.

**Phase C — JobsPipe**
- accès API ;
- filtre pays CM ;
- mesure de couverture ;
- comparaison coût/volume/doublons.

**Phase D — FNE / Emploi.cm / JobInfoCamer / AfricaWork**
- recherche d'un flux/API officiel ;
- contact/partenariat si nécessaire ;
- ingestion uniquement après validation des droits d'utilisation.

## 7. Impact attendu sur le matching

Le moteur actuel de Jobly est déjà adaptatif aux exigences réelles de chaque offre. L'augmentation du volume doit donc alimenter le marché sans modifier la logique de scoring.

Le flux « Les offres qui vous correspondent » conserve son seuil de 50 %.

La priorité technique est la qualité :
**plus d'offres ≠ meilleur produit** si les doublons, annonces expirées ou données pauvres augmentent.

## 8. État

**AUDIT SOURCES : TESTÉ / DOCUMENTÉ**

**MinaJobs RSS : SOURCE PUBLIQUE IDENTIFIÉE — PRÊTE POUR POC**

**Techmap CM : COUVERTURE CONFIRMÉE — API À TESTER**

**JobsPipe : API IDENTIFIÉE — COUVERTURE CM À MESURER**

**FNE / Emploi.cm / JobInfoCamer / AfricaWork : SOURCE IDENTIFIÉE — API/FEED OFFICIEL NON CONFIRMÉ**

Aucun déploiement Vercel n'a été déclenché pendant cet audit.
