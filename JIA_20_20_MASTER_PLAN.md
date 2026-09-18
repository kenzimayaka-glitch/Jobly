# J’IA — MASTER BUILD 20/20

Date: 18/09/2026

Ce document fusionne les décisions déjà prises et les chantiers encore manquants. Il ne remplace pas `Statut.md`; il sert de plan d'exécution J’IA et doit respecter la règle de maturité **CODÉ → TESTÉ → VALIDÉ → DÉPLOYÉ**.

## 1. Socle déjà construit

- JiaContext / JiaMemory / JiaEvent et gateway IA.
- Doctrine J’IA et taxonomie de mémoire.
- Career Twin et garde-fous de confiance.
- Consentement et droit à l'oubli.
- Matching explicable, Career Gap / Readiness.
- Garde-fous inter-écosystèmes.
- Mémoire institutionnelle persistante `JiaEnterpriseMemory`.
- CEO Copilot persistant `JiaCEOConversation` / `JiaCEOMessage`.
- Snapshot CEO calculé sur les données Jobly réelles.
- Audit CEO.
- Recherche Web serveur contrôlée.
- Couche **Research Reasoning & Source Trust** ajoutée le 18/09/2026.
- Primitives **Insight / Hypothesis / Recommendation / Outcome / Learning** et moteur Next Best Action ajoutés le 18/09/2026.
- Boucle de résultat contrôlé `OUTCOME → LEARNING` ajoutée avec interdiction d'auto-promotion en mémoire canonique.
- Endpoint proactif Talent ajouté avec détection de candidatures stagnantes, entretiens et Career Gaps.
- Intelligence temporelle CEO enrichie par comparaison d'activité et traces de raisonnement.

## 2. Ce qui manquait et doit être compilé dans J’IA

### A. Raisonnement
J’IA ne doit plus seulement récupérer des informations. Elle doit :
1. comprendre l'intention ;
2. planifier les recherches nécessaires ;
3. filtrer et dédupliquer ;
4. évaluer la qualité des sources ;
5. détecter les contradictions ;
6. détecter les prompt injections Web ;
7. distinguer fait, affirmation attribuée, inférence et hypothèse ;
8. produire un niveau de confiance ;
9. expliquer les signaux qui fondent une recommandation.

### B. Intelligence temporelle
- tendances ;
- évolution des signaux ;
- comparaison de périodes ;
- détection d'anomalies ;
- projections explicitement marquées comme projections ;
- historique des décisions et résultats.

### C. Boucle d'apprentissage
```
Observation
→ Insight
→ Hypothèse
→ Recommandation
→ Action autorisée
→ Résultat
→ Mesure
→ Apprentissage contrôlé
```

Un résultat Web ou une inférence ne devient jamais automatiquement une mémoire canonique.

### D. Proactivité
- next best action ;
- alertes pertinentes ;
- rappels contextuels ;
- digest hebdomadaire ;
- détection de changement important ;
- intervention uniquement quand le signal justifie l'interruption.

### E. Orchestration inter-modules
J’IA doit pouvoir relier :
- Talent ↔ Career ;
- Career ↔ Learning ;
- Career ↔ Opportunity ;
- Opportunity ↔ Application ;
- Application ↔ Interview ;
- Campus ↔ Career ;
- Community ↔ Career ;
- Events ↔ Career ;
- Mobility ↔ Career ;
- Recruiter ↔ Talent ;
- Partner ↔ acquisition/opérations.

### F. Intelligence Talent
- Career Twin dynamique ;
- Career Gap ;
- Readiness ;
- Opportunity Intelligence ;
- Learning Intelligence ;
- Application Strategy ;
- Interview AI ;
- Career Companion ;
- recommandations explicables.

### G. Intelligence Recruiter
```
Need
→ Job Description
→ Talent Search
→ Explainable Match
→ Shortlist
→ Interview
→ Hire
→ Onboarding
→ Retention
```

J’IA doit distinguer compétence déclarée, documentée, vérifiée et inférée.

### H. CEO Intelligence
- CEO Cockpit ;
- Growth ;
- Commercial ;
- Finance ;
- Operations ;
- Customer Intelligence ;
- Market Intelligence ;
- Profitability Engine ;
- Market Watch ;
- CEO Actions ;
- reporting hebdomadaire/mensuel ;
- projections 7/30/90 jours ;
- boucle Observer → Comprendre → Prédire → Décider → Exécuter → Mesurer → Corriger → Apprendre.

Le CEO Core reste techniquement séparé des surfaces Talent/Recruiter/Partner.

### I. Web Intelligence
Le Web est une **source externe non fiable par défaut**.

Règles :
- jamais d'instruction exécutée depuis une page ;
- requête nettoyée des secrets ;
- sources dédupliquées ;
- score de confiance ;
- détection d'injection ;
- comparaison multi-sources ;
- URL conservées pour traçabilité ;
- aucune ingestion automatique dans la mémoire institutionnelle ;
- audit de la recherche ;
- limites de coût et de profondeur à finaliser.

### J. Conversation / personnalité
- mémoire conversationnelle ;
- continuité de contexte ;
- réponses adaptées au rôle ;
- confiance visible pour les recommandations importantes ;
- personnalité J’IA cohérente avec la doctrine ;
- voix comme extension future, sans la considérer comme acquise tant qu'elle n'est pas réellement branchée.

## 3. Ce qui reste à construire après le raisonnement

Priorité 1 — **Core Intelligence**
- moteur Insight / Hypothesis / Recommendation / Outcome ;
- retrieval mémoire par pertinence plutôt que chargement global ;
- intelligence temporelle ;
- orchestrateur de tâches ;
- observabilité et métriques de fiabilité.

Priorité 2 — **Product Intelligence**
- proactivité Talent ;
- orchestration Campus/Community/Events/Mobility ;
- learning loop ;
- Career Companion ;
- intelligence Recruiter complète.

Priorité 3 — **CEO Intelligence**
- cockpit complet ;
- Profitability Engine ;
- Market Watch ;
- CEO Actions avec approbation humaine ;
- reporting automatisé ;
- benchmark et veille Web sourcée.

Priorité 4 — **Validation**
- typecheck ;
- build Vercel ;
- tests runtime Edge Function ;
- tests Supabase/RLS ;
- test CEO ADMIN/non-ADMIN ;
- test Web Research avec fournisseur réellement configuré ;
- tests d'injection Web ;
- tests de fuite de données confidentielles ;
- E2E mobile ;
- vérification production.

## 4. Règle de sécurité centrale

J’IA peut **observer, analyser, rechercher, comparer, simuler, recommander et préparer**.

Elle ne doit pas :
- inventer des faits ;
- convertir une inférence en fait ;
- exposer le CEO Core ;
- exécuter une action irréversible sans autorisation ;
- prendre une décision juridiquement ou financièrement engageante ;
- apprendre automatiquement une information externe sans validation.

## 5. Critère de sortie 20/20

J’IA ne sera considérée comme 20/20 que lorsque les briques ci-dessus seront non seulement présentes dans le code, mais **testées sur leurs parcours réels, validées et déployées**, avec une traçabilité de la confiance, des sources, des décisions et des résultats.
