# Jobly Africa — Source Registry / Engine V1

## Audit technique du dépôt main

Audité sur la branche `main` avant modification.

### Architecture existante observée

```
discover-jobs Edge Function
  ├─ sources.ts : adapters structurés (RSS/API/WordPress)
  ├─ index.ts   : fetch HTTP + listing parsing + enrichissement + normalisation
  ├─ Supabase Job : canonical offer
  └─ JobOfferPipeline : raw/rendered/extracted/canonical ledger
```

Le dépôt possède déjà les briques nécessaires : `discover-jobs`, `sources.ts`, `JobOfferPipeline`, `rawHtml`, `normalizedContent` et les workflows d'audit/validation.

Le défaut principal était la **liste des sources codée en dur dans `discover-jobs/index.ts`**. Cela empêchait de transformer le ratissage Afrique en catalogue exploitable.

## V1 livrée sur cette branche

### 1. Registry typé

`supabase/functions/discover-jobs/source-registry.ts`

Le registre contient :

- 54 pays africains avec code ISO, région et langues principales ;
- les sources actuellement opérationnelles du moteur ;
- les sources mondiales/institutionnelles déjà présentes ;
- le catalogue V3 des sources découvertes ;
- statut `active/discovered/blocked/degraded/retired` ;
- méthode `http/api/rss/browser/unknown` ;
- besoin de rendu JS ;
- adapter structuré éventuel ;
- priorité ;
- périmètre pays ;
- notes de qualification.

Les sources découvertes sont volontairement **désactivées** tant qu'elles n'ont pas passé le test accessibilité → rendu → extraction → fraîcheur → déduplication → qualité.

### 2. Source Engine

`supabase/functions/discover-jobs/source-engine.ts`

Responsabilités :

- sélectionner les sources actives pour un pays ;
- ordonner par priorité ;
- valider la cohérence d'une définition ;
- produire un run plan ;
- fournir les métriques de registre ;
- classer un résultat de crawl en `healthy/degraded/failed`.

### 3. discover-jobs découplé

`index.ts` ne possède plus sa liste métier de sources.

Il consomme :

```ts
const SOURCE_COUNTRY = Deno.env.get("JOBLY_SOURCE_COUNTRY") || "CM";
const SOURCES = buildSourceRunPlan(SOURCE_COUNTRY);
```

Le comportement Cameroun actuel reste donc conservé par défaut.

Pour l'Afrique, le pays devient une variable du moteur plutôt qu'une duplication de fonction.

### 4. Smoke audit GitHub Actions

`.github/workflows/verify-source-registry.yml`

Le workflow vérifie automatiquement le registre sans déploiement. GitHub Actions permet les workflows déclenchés par push, PR ou manuellement ; ici aucun step de déploiement n'est présent.

## Point volontairement non résolu

Les URLs actuellement codées pour ReliefWeb, UNjobs et Impactpool sont des URLs Cameroun. Elles sont donc limitées à `CM` dans V1.

Il faut créer ensuite un **country URL resolver** avant de les activer pour les 53 autres pays.

## Prochaine couche

```
Source Registry
      ↓
Source Engine
      ↓
Country URL Resolver
      ↓
Fetcher
      ↓
HTTP / Browser / API / RSS
      ↓
Rendered Extraction
      ↓
Normalizer
      ↓
Eligibility
      ↓
Deduplication
      ↓
Quality Gate
      ↓
Jobly Africa
```

Le registry est donc maintenant une source de vérité technique, tandis que `sources.ts` reste la couche d'adapters.

## Important

Cette V1 **ne lance aucun crawl de masse, ne modifie aucune donnée utilisateur et ne déclenche aucun déploiement Vercel/Supabase**.
