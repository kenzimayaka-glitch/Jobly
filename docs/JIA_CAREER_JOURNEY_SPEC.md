# J’IA Career Journey — Spécification fonctionnelle consolidée
**Date : 2 octobre 2026**  
**État : SPÉCIFIÉ — non implémenté / non validé**  
**Périmètre : Talent / Career Intelligence / Career Twin / Jobly Campus**

> Ce document consolide les décisions fonctionnelles exprimées autour du copilote de carrière J’IA. Il ne constitue pas une preuve d’implémentation. Avant tout développement, auditer les briques existantes et les réutiliser : aucun moteur, modèle de données, système de mémoire, de notification ou de suivi parallèle ne doit être créé sans nécessité démontrée.

## 1. Vision

J’IA agit comme un copilote de carrière longitudinal. Elle observe le profil et les objectifs du talent, explique les écarts, formule des recommandations argumentées, propose des actions ou missions, assure le suivi avec le consentement de l’utilisateur, puis réévalue les progrès à partir des informations et preuves nouvelles.

Boucle cible :

`PROFIL / CAREER TWIN → OBJECTIF → MATCHING / MARCHÉ → GAP ANALYSIS → AVIS J’IA → PROJECTION → RECOMMANDATION → MISSION / ACTION → SUIVI → DÉCLARATION / PREUVE / TEST FACULTATIF → RÉÉVALUATION → CAREER TWIN ACTUALISÉ → NOUVEAU MATCHING`

J’IA accompagne la décision : le talent reste libre d’accepter, refuser, différer, ignorer ou personnaliser les propositions.

## 2. Principes non négociables

- **Autonomie du talent :** aucune candidature, formation, mission ou orientation n’est imposée.
- **Conseil explicable :** tout avis important expose les facteurs qui le motivent, les limites des données et les alternatives possibles.
- **Aucune promesse :** une projection de carrière est conditionnelle, jamais une garantie d’emploi, de promotion ou de délai.
- **Vérité des données :** J’IA n’invente aucune expérience, compétence, certification, réalisation ou preuve.
- **Déclaration recevable :** le talent peut déclarer une compétence acquise sans fournir de certificat ni passer un test. Cette déclaration peut être utilisée dans son profil et son matching, tout en conservant sa provenance « déclarée ».
- **Preuve distincte de déclaration :** certificat, expérience documentée, portfolio ou évaluation peuvent renforcer la confiance, mais ne sont pas des conditions universelles d’accès ou de progression.
- **Free-first :** privilégier les ressources gratuites pertinentes, puis comparer les options payantes de la moins coûteuse à la plus coûteuse, sans biais commercial.
- **Neutralité commerciale :** aucune formation n’est recommandée pour générer une vente, favoriser un partenaire ou promouvoir Jobly Campus.
- **Pas de surcharge :** proposer une priorité claire et un nombre limité d’actions. Dans les QCM conversationnels, J’IA ne présente jamais plus de 4 choix, ajoute toujours « Autre… » avec un petit champ de saisie, autorise les réponses multiples lorsque pertinent et accepte la voix.
- **Consentement et contrôle :** le suivi, les rappels, les tests et l’utilisation de données personnelles doivent respecter les choix et permissions existants.

## 3. Compréhension de la situation

J’IA peut croiser, selon les permissions et la disponibilité :
- profil et préférences du talent ;
- expériences, compétences, études, certifications et projets ;
- Career Twin, Career GPS, Career Gap et Readiness existants ;
- objectifs et horizon souhaité ;
- offres consultées, matching, candidatures, entretiens et retours vérifiés ;
- données pertinentes du marché ;
- formations et ressources du Jobly Campus, ainsi que ressources externes fiables ;
- mémoire J’IA autorisée et historique des missions.

Les données absentes sont signalées comme « non renseignées » ou « inconnues », et non automatiquement transformées en lacunes certaines.

## 4. Avis J’IA — y compris un avis défavorable

J’IA peut recommander de postuler, de différer une candidature ou de ne pas la prioriser. Elle peut aussi exprimer un avis argumenté sur une orientation, une formation ou une étape de carrière.

Exemple :
> « Au regard des informations actuellement disponibles, je ne te recommande pas de prioriser cette candidature. L’offre demande une expérience de supervision que ton profil ne documente pas encore. Tu peux néanmoins postuler si tu le souhaites. Voici les écarts identifiés et des options pour les réduire. »

Un avis défavorable doit :
- s’appuyer sur les critères réellement détectés et le profil disponible ;
- distinguer les exigences obligatoires des atouts souhaités ;
- préciser les incertitudes et informations manquantes ;
- éviter les jugements sur la valeur de la personne ;
- laisser la décision finale au talent ;
- proposer, lorsque cela est utile, des alternatives ou actions concrètes.

Le score de compatibilité ne doit jamais être présenté comme une décision automatique d’éligibilité.

## 5. Projection de carrière conditionnelle

J’IA peut structurer une trajectoire par étapes, par exemple :
- **Aujourd’hui :** situation et niveau soutenus par les informations connues ;
- **Prochaine étape :** rôle ou compétence cible ;
- **À 3–6 mois :** actions et preuves envisageables ;
- **À 6–12 mois :** approfondissement, expérience ou responsabilités à rechercher ;
- **À 12–24 mois :** rôles cibles possibles, sous réserve des progrès, des opportunités et du contexte du marché.

Chaque projection indique ses hypothèses, les écarts à combler et les facteurs externes qui peuvent changer le parcours. Les horizons sont des repères de planification, pas des prédictions certaines. Le plan est recalculable dès que le talent actualise son profil, ses objectifs ou ses contraintes.

## 6. Recommandations et actions

Le Recommendation Engine doit réutiliser les fondations existantes, notamment `lib/careerEngine.ts` et ses dimensions, écarts, critères et `nextBestAction`, au lieu de créer un second Career Engine.

Les recommandations peuvent porter sur :
- candidature adaptée ou candidature à différer ;
- mise à jour du CV avec J’IA ;
- acquisition ou approfondissement d’une compétence ;
- formation, certification ou ressource d’apprentissage ;
- projet pratique, mission ou expérience ;
- documentation d’une réalisation ou constitution d’un portfolio ;
- préparation d’entretien ;
- exploration d’une autre fonction, d’un secteur ou d’une mobilité ;
- réévaluation du profil.

J’IA doit expliquer pourquoi l’action est proposée, quel écart elle vise, le résultat attendu et comment le talent pourra faire reconnaître son progrès. Elle ne doit pas produire une liste excessive : mettre en avant une prochaine priorité et quelques alternatives au maximum.

### Mise à jour du CV

Lorsque le Career Twin évolue et que le CV ne reflète plus les informations validées ou déclarées par le talent, J’IA peut suggérer sa mise à jour et la réaliser avec son accord. Le talent examine et approuve le contenu avant toute utilisation ou transmission. Aucun fait ne peut être ajouté sans source fournie ou confirmation explicite du talent.

## 7. Formations — Jobly Campus et ressources externes

Jobly Campus constitue une source de formations et de ressources exploitables par J’IA, et non un canal publicitaire.

Pour chaque ressource, le système devrait disposer, lorsque ces informations sont vérifiables :
- titre, organisme et description ;
- compétences ciblées et niveau ;
- lien ou modalités d’accès ;
- gratuité, prix, devise et éventuels frais ;
- durée, format, langue et prérequis ;
- lieu et coordonnées, si présentiel et publiés de manière fiable ;
- certificat ou résultat proposé ;
- source et date de vérification.

Ordre de recherche et de présentation :
1. formations gratuites réellement pertinentes ;
2. autres options gratuites pertinentes ;
3. options payantes classées de la moins coûteuse à la plus coûteuse ;
4. options plus coûteuses uniquement si leur valeur spécifique est justifiée.

La pertinence par rapport au gap et à l’objectif prime sur l’appartenance au Campus, le partenariat ou la commission. Une ressource externe gratuite peut être présentée avant une formation payante du Campus. Les coûts, disponibilités et coordonnées non vérifiés doivent être signalés comme tels. La proximité géographique ne peut être utilisée que si une localisation suffisante est fournie ou autorisée par l’utilisateur.

J’IA peut proposer plusieurs moyens de combler un gap : formation, pratique, projet, expérience, mentorat ou documentation de compétences. Une formation n’est pas automatiquement la réponse.

## 8. Missions J’IA et suivi réel

Une recommandation peut être convertie, avec accord du talent, en mission suivie. Une mission devrait contenir :
- objectif et gap visé ;
- description et étapes concrètes ;
- ressource ou formation associée, le cas échéant ;
- résultat ou preuve facultative attendue ;
- échéance choisie ou acceptée par le talent ;
- état : proposée, acceptée, en cours, terminée, abandonnée ou reportée ;
- progression et historique des interactions ;
- prochaine date de suivi, selon le consentement et les préférences.

Cycle cible :
1. J’IA explique et propose une mission.
2. Le talent l’accepte, la refuse, la modifie ou la reporte.
3. Si acceptée, J’IA l’inscrit dans le suivi existant ou dans une extension validée après audit.
4. J’IA peut envoyer des rappels raisonnables selon les préférences, sans harcèlement ni relance après refus ou désactivation.
5. Le talent déclare son avancement ou sa fin, ou fournit une preuve s’il le souhaite.
6. J’IA demande si le talent accepte une réévaluation.
7. Le Career Twin et les recommandations sont actualisés à partir des nouvelles informations, en conservant leur provenance.

La fermeture d’une question ou l’absence de réponse ne vaut jamais acceptation, accomplissement ou preuve.

## 9. Test multiforme facultatif de compétence

Après une formation, une mission ou une déclaration de compétence, J’IA peut proposer un test pour aider le talent à comprendre son niveau d’application. Le test n’est pas obligatoire et son refus ne bloque ni le profil, ni le CV, ni la candidature.

Formats possibles, sélectionnés selon la compétence :
- QCM conversationnel (maximum 4 choix visibles, « Autre… », réponses multiples si adaptées, saisie et voix) ;
- cas pratique ;
- mise en situation dialoguée ou jeu de rôle ;
- exercice pratique avec réponse structurée ou pièce jointe ;
- explication orale ;
- analyse d’un projet, portfolio ou document fourni, si le système peut réellement le traiter.

Le test peut être adaptatif, avec difficulté ajustée aux réponses. Il doit évaluer des dimensions pertinentes (connaissance, application, raisonnement, résolution de problème, communication), sans fabriquer de précision artificielle. Le résultat décrit ce qui a été évalué, dans quelles conditions et avec quelles limites. Un score n’est pas une certification officielle et ne prouve pas à lui seul une maîtrise universelle.

## 10. Statut et provenance des compétences

Le Career Twin doit distinguer clairement :
- **Déclarée :** compétence affirmée par le talent ;
- **Documentée :** appuyée par un document, un projet ou une expérience renseignée ;
- **Évaluée par J’IA :** examinée au moyen d’un test ou d’une mise en situation ;
- **Démontrée par des preuves concordantes :** plusieurs éléments disponibles soutiennent le niveau indiqué.

Ces statuts ne sont pas des barrières hiérarchiques obligatoires. Une compétence déclarée est recevable dans le profil. Les évaluations et documents enrichissent la provenance et le niveau de confiance, sans effacer la déclaration d’origine. Le talent peut corriger ou retirer ses déclarations selon les capacités de gestion du profil existantes.

Les résultats doivent être formulés avec prudence : « compétence déclarée », « éléments documentés » ou « compétence évaluée sur tel exercice », plutôt que « certifiée » sans certification officielle.

## 11. Boucle d’apprentissage et réévaluation

À la suite d’une mission, d’une formation, d’un test facultatif, d’un projet ou d’une expérience, J’IA peut :
- actualiser les éléments concernés du Career Twin ;
- distinguer déclaration, document, évaluation et inférence ;
- recalculer les gaps, readiness et matching ;
- comparer les résultats avant/après, sans attribuer abusivement tout changement à une seule action ;
- proposer la prochaine priorité ou conclure qu’aucune formation supplémentaire n’est actuellement nécessaire.

Le feedback recruteur ne peut être traité comme vérifié que si sa provenance et son contexte le justifient. Les données insuffisantes ne doivent pas devenir des conclusions certaines.

## 12. Expérience conversationnelle

J’IA communique de manière courte, contextualisée et actionnable. Elle explique la raison de sa recommandation, puis laisse choisir le talent.

Exemple :
> « Tu as déjà une expérience commerciale. Pour viser un poste de Superviseur, le principal écart visible concerne le pilotage d’équipe. Je te propose de commencer par une ressource gratuite sur KoboCollect, puis de réaliser un exercice pratique. Tu peux aussi choisir une autre voie. »

Pour les questions à choix :
- jamais plus de 4 choix standards ;
- toujours « Autre… » et un petit champ de saisie ;
- sélection multiple lorsque le contexte le permet ;
- réponse vocale disponible lorsque l’interface et les permissions le permettent ;
- aucune réponse enregistrée si le talent quitte la question sans répondre.

## 13. Classification produit et monétisation

**Statut : à arbitrer lors du cadrage produit, non verrouillé par cette spécification.**

Avant implémentation, chaque capacité doit être classée FREE ou payante et, si payante, affectée à START, PREMIUM ou PRO avec profondeur fonctionnelle, quota et consommation de crédits IA explicités. La recommandation impartiale, le libre choix du talent et la distinction honnête entre déclaratif et vérification ne doivent pas être altérés par l’abonnement.

Ne pas créer de facturation, quota ou crédit parallèle : réutiliser le catalogue d’entitlements et le mécanisme de crédits existants après audit.

## 14. Architecture cible et réutilisation

Réutiliser autant que possible :
- Career Twin / Career Intelligence existants ;
- `lib/careerEngine.ts`, Career Gap, Career GPS, Readiness et `nextBestAction` ;
- matching et données de candidatures existants ;
- mémoire cognitive J’IA unifiée et traces disponibles ;
- notifications et préférences existantes ;
- Jobly Campus et son éventuel catalogue de formations ;
- systèmes existants de CV, abonnements, entitlements et crédits IA.

Extensions potentielles à confirmer uniquement après audit :
- modèle de ressource de formation normalisée ;
- missions et états de progression ;
- échéances et préférences de suivi ;
- résultats de tests de compétence et provenance des preuves ;
- liens entre mission, ressource, compétence, objectif et Career Twin.

Aucun nouveau modèle ou service ne doit être ajouté si une structure existante couvre déjà le besoin. Les données doivent être protégées par les permissions serveur/RLS existantes et limitées au contexte du talent.

## 15. Critères d’acceptation fonctionnels

- J’IA peut expliquer un avis favorable ou défavorable sur une candidature sans décider à la place du talent.
- Une projection indique hypothèses, conditions et incertitudes, sans promesse.
- Une recommandation de formation est reliée à un gap et à l’objectif ; l’ordre Free-first et le tri de prix sont respectés.
- Une ressource non vérifiée n’est pas présentée comme vérifiée ; une ressource Campus n’est pas favorisée pour des raisons commerciales.
- Le talent peut accepter, refuser, différer ou modifier une mission.
- Le suivi ne démarre qu’après acceptation et respecte les préférences de notification.
- Une compétence peut être déclarée sans certificat ni test et être utilisée comme telle dans le profil et le matching.
- Un test est facultatif, adapté au type de compétence, explicable et non présenté comme certification officielle.
- J’IA peut proposer une mise à jour du CV, mais le talent valide les informations et le document final.
- Une réévaluation met à jour le Career Twin sans transformer une déclaration en preuve vérifiée.
- Les QCM respectent la limite de 4 choix, « Autre… », sélection multiple pertinente et réponse vocale disponible lorsque supportée.
- L’ensemble réutilise les composants existants et ne crée pas de doublons architecturaux.

## 16. Plan de réalisation proposé

1. **Étape 0 — audit ciblé :** vérifier le Career Twin, Career Engine, Campus, formations, missions/tâches, notifications, mémoire, tests et crédits déjà présents.
2. **Étape 1 — modèle fonctionnel :** définir les objets et états manquants uniquement, avec provenance et permissions.
3. **Étape 2 — moteur de décision :** relier gaps, objectifs, matching, avis explicables et recommandations.
4. **Étape 3 — Campus / Learning Intelligence :** normaliser les ressources existantes, appliquer Free-first et la neutralité commerciale.
5. **Étape 4 — missions et suivi :** consentement, progression, rappels configurables et preuve facultative.
6. **Étape 5 — test multiforme facultatif :** évaluation par compétence, feedback explicable et provenance.
7. **Étape 6 — CV et réévaluation :** mise à jour contrôlée du CV et actualisation du Career Twin.
8. **Étape 7 — validation :** tests unitaires, sécurité/permissions, scénarios de refus/abandon, E2E et régression Career/Matching/Campus.

Chaque étape doit être validée avant la suivante. Toute réalisation reste sur une branche de travail/PR ; aucun merge sur `main`, aucune modification de production et aucun déploiement Vercel sans autorisation explicite.

---
**Règle de vérité :** SPÉCIFIÉ → CODÉ → ACCESSIBLE → CONNECTÉ → TESTÉ → VALIDÉ → DÉPLOYÉ. À ce stade, le présent document ne fait que formaliser la spécification.

## 17. Capacités complémentaires validées — Career Journey enrichi

Les propositions complémentaires ci-dessous sont validées pour intégration au périmètre fonctionnel. Elles restent soumises à l’audit des briques existantes et à la classification produit avant implémentation.

### 17.1 Career Radar — veille de carrière contextualisée
J’IA peut comparer les compétences, expériences et objectifs du talent avec les offres accessibles et les tendances de marché observables. Elle distingue les signaux observés des données manquantes et ne présente jamais une tendance comme une prédiction certaine.

### 17.2 Parcours professionnels alternatifs
Lorsqu’un objectif paraît éloigné ou que plusieurs voies sont possibles, J’IA peut présenter quelques trajectoires alternatives, leurs prérequis, écarts, contraintes et étapes. Le talent choisit librement la voie à explorer ; aucune trajectoire n’est imposée ni classée comme verdict global.

### 17.3 Portfolio de réalisations
J’IA peut aider le talent à consigner des projets, responsabilités, objectifs, actions, résultats et contributions concrètes. Avec validation du talent, ces éléments peuvent enrichir le Career Twin, le CV ou un portfolio. J’IA ne transforme pas une affirmation en fait vérifié et conserve la provenance de chaque élément.

### 17.4 Revue périodique de progression
Selon la préférence de fréquence et le consentement du talent, J’IA peut proposer une revue hebdomadaire ou mensuelle : missions réalisées ou en attente, compétences nouvellement déclarées ou documentées, évolution des écarts et du matching, ainsi que prochaines priorités. Les rappels sont désactivables et l’absence de réponse ne vaut pas validation.

### 17.5 Simulateur de décisions de carrière
Le talent peut explorer des scénarios du type « Et si je visais un poste de Responsable commercial ? ». J’IA compare alors les exigences du scénario avec le profil disponible, les écarts, les expériences et contraintes à considérer, ainsi que différentes étapes possibles. Les résultats sont exploratoires et conditionnels, sans prédiction ni décision à la place du talent.

### 17.6 Détection de compétences sous-représentées
J’IA peut repérer dans les expériences, projets et responsabilités renseignés des compétences potentiellement absentes ou insuffisamment visibles dans le CV ou le Career Twin. Elle les présente comme des suggestions à confirmer par le talent avant toute modification du profil, du CV ou du matching.

### 17.7 Prévention de la surcharge et replanification
À partir du volume de missions, des échéances acceptées, des reports et des indications explicitement fournies par le talent, J’IA peut signaler qu’un plan semble trop chargé et proposer de réduire, différer ou réordonner les actions. Elle ne réalise aucun diagnostic psychologique et ne déduit pas un état de santé mentale.

### 17.8 Conseil « prêt à postuler »
J’IA doit pouvoir conclure qu’aucune formation ou mission supplémentaire n’est actuellement nécessaire pour tenter une candidature, lorsque les éléments disponibles montrent un alignement suffisant avec les critères essentiels. Elle peut alors proposer de postuler, d’adapter le CV ou de préparer l’entretien, tout en rappelant les incertitudes et en laissant la décision au talent. La recommandation ne constitue jamais une garantie de sélection.

### Règles communes
- Ces capacités s’appuient sur les données autorisées et disponibles, avec indication des informations manquantes.
- Toute suggestion concernant le profil ou le CV exige la confirmation du talent avant enregistrement ou utilisation externe.
- Les scénarios et signaux sont explicables, révisables et non déterministes.
- Aucune capacité ne doit créer un moteur, une mémoire, un système de tâches ou une notification en doublon si une brique existante peut être étendue.
- Le périmètre Free/START/PREMIUM/PRO, la profondeur fonctionnelle, les quotas et les crédits IA restent à arbitrer après audit, selon les entitlements existants.

