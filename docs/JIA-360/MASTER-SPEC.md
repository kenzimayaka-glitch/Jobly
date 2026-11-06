# J’IA 360 — Living Adaptive Conversation
> Cahier directeur produit, UX/UI, architecture et validation  
> Version : 1.0 — 6 novembre 2026  
> Statut : vision et périmètre validés ; réalisation et preuves techniques à produire.

## 1. Vision

J’IA 360 fait de J’IA l’assistante conversationnelle et l’agent opérationnel de Jobly. La conversation n’est pas un chatbot décoratif ni un écran supplémentaire : elle devient une interface adaptative à travers laquelle les utilisateurs peuvent découvrir, comprendre, préparer et exécuter les actions Jobly auxquelles leur rôle et leur abonnement leur donnent accès.

La conversation doit être vivante, immersive, expressive et surprenante. Elle peut changer de composition, de décor et de mode de présentation en pleine session, sans réécrire les messages ni perdre le contexte, les sélections, les documents ou l’état d’une opération.

**Promesse produit : une assistante qui prend vie, une conversation qui se transforme, une plateforme entière pilotable par dialogue.**

## 2. Principes non négociables

1. **Contenu indépendant de la présentation.** Le texte, les messages, les réponses, dates, pièces jointes, sources, sélections, actions, confirmations et historique sont canoniques. Un changement de layout ne les réécrit jamais.
2. **Aucune perte d’état.** Un questionnaire en cours, une offre sélectionnée, une prévisualisation de CV, un formulaire ou une opération en cours survivent aux changements de présentation, aux routes et aux changements de viewport.
3. **Pas d’obstruction.** J’IA ne masque jamais le texte, les cartes, les documents, les boutons ou les commandes. Le contenu se réorganise pour lui faire de la place.
4. **Actions réelles.** Une réponse ne prétend pas qu’une opération a été faite tant que le service concerné n’en a pas confirmé le résultat.
5. **Sécurité avant commodité.** Rôle, permissions, abonnement et quotas sont contrôlés côté serveur pour chaque action.
6. **Identité cohérente.** Le personnage reste reconnaissable dans toutes les scènes, tailles, postures et expressions.
7. **Surprise maîtrisée.** Les variantes sont nombreuses, contextuelles et anti-répétition, jamais aléatoires au point de distraire ou de désorienter.
8. **Non-régression.** Aucune fonctionnalité existante de J’IA ou de Jobly ne doit être supprimée pour simplifier la refonte.
9. **Web et APK.** Une expérience cohérente, responsive et synchronisée est requise sur Web, PWA et APK.
10. **Preuve d’abord.** CODÉ, ACCESSIBLE, CONNECTÉ, TESTÉ, VALIDÉ et DÉPLOYÉ sont des états distincts.

## 3. Direction artistique et palette

### 3.1 Proportions demandées

| Couleur | Proportion cible |
|---|---:|
| Bleu canari | 30 % |
| Jaune canari | 30 % |
| Blanc | 20 % |
| Orange | 5 % |
| Vert | 5 % |
| **Total explicitement réparti** | **90 %** |

Les 10 % restants sont réservés aux nuances, transparences, dégradés, ombres et surfaces dérivées de cette palette. Ils ne doivent pas devenir une sixième couleur dominante. Les valeurs HEX exactes doivent être alignées sur les tokens canoniques Jobly présents dans le dépôt ; ne pas inventer une nouvelle définition des couleurs de marque.

### 3.2 Style

- Moderne, premium, expressif, chaleureux et lisible.
- Cartes et panneaux à coins doux, profondeur légère, transparences maîtrisées et hiérarchie claire.
- Utilisation cohérente des couleurs de marque dans tous les layouts, stickers, composants, états et transitions.
- Contrastes et états interactifs accessibles.
- Les ambiances peuvent changer ; les repères fonctionnels et la cohérence de la marque restent stables.

### 3.3 Nouvelle identité du personnage

La refonte visuelle doit améliorer le rendu qui ne satisfait plus le fondateur. La direction conserve l’essence déjà exprimée : femme africaine adulte, présence chaleureuse et confiante, apparence organique et humaine, lunettes rondes dorées, blazer bleu, foulard jaune/or et pin J’IA comme pistes d’identité. La réalisation graphique exacte et le modèle 3D final devront être soumis à validation visuelle avant de remplacer définitivement les assets.

Exigences du modèle final :
- Vue complète en pied et cadrages rapprochés propres.
- Anatomie, proportions, mains et doigts crédibles.
- Squelette/rig cohérent, articulations et expressions faciales.
- Silhouette, visage, coiffure et signes d’identité stables d’une scène à l’autre.
- Tenues et accessoires cohérents ; aucune variation aléatoire qui change l’identité.
- Fallback fiable si WebGL, vidéo, GPU ou assets indisponibles.

## 4. Conversation adaptative : layouts

Les modes de présentation de référence sont :

| Mode | Usage |
|---|---|
| Messenger | Fil conversationnel classique, lisible et compact |
| Gallery | Galerie de cartes, offres, entreprises et recommandations |
| Stage | Présentation de J’IA comme présentatrice virtuelle |
| Workspace | Travail sur profil, CV, lettres, documents et candidatures |
| Explorer | Cartes, destinations, secteurs, formations et opportunités |
| Interactive | Questions, choix, parcours guidés et mini-expériences |

Le layout peut changer :
- Automatiquement, selon le sujet, l’intention, le rôle, le contenu et l’appareil.
- Sur proposition explicite de J’IA.
- À la demande de l’utilisateur.
- Par rotation semi-aléatoire contrôlée, à condition que la composition soit compatible avec le contexte.

Le changement peut réafficher les anciens messages dans une nouvelle composition. Il ne doit appeler le modèle de langage pour réécrire le contenu. Les textes doivent être rendus à partir de leur stockage canonique.

Commandes utilisateur prévues :
- Changer d’ambiance ou de présentation.
- Demander une nouvelle composition.
- Verrouiller la présentation courante.
- Revenir à Messenger.
- Choisir le niveau d’animation.
- Choisir la présence de l’avatar : adaptative, permanente ou compacte.

## 5. J’IA Stage et Spotlight

### 5.1 J’IA Stage

J’IA peut apparaître comme présentatrice dans une scène dédiée ou une zone latérale/supérieure adaptative. Elle peut introduire un sujet, expliquer un résultat, guider un parcours, présenter des offres ou commenter un document.

### 5.2 J’IA Spotlight

Apparition ponctuelle pour attirer l’attention sur un contenu pertinent : une offre, une recommandation, une étape de candidature, un document ou une réussite.

Comportements attendus :
- Entrée depuis un bord de l’écran, fondu, apparition progressive ou transition de scène.
- Présence en pied, portrait ou format compact selon l’espace disponible.
- Gestes de présentation, désignation et explication.
- Déplacement fluide entre les zones de présentation.
- Retrait, réduction ou retour en position d’écoute après l’intervention.
- Les cartes, textes et composants se réorganisent pour lui réserver l’espace nécessaire.

**Interdictions :** masquer un texte ou une action, bloquer la saisie, couvrir une information légale/sensible, perturber une validation, interrompre une requête ou déplacer un contrôle au moment où l’utilisateur l’active.

## 6. Motion, émotions, stickers et emojis

### 6.1 Familles de comportements

- Repos naturel, respiration, clignements et micro-mouvements.
- Accueil, écoute, attention et acquiescement.
- Réflexion, recherche, comparaison et découverte.
- Présentation, pointage, explication et guidage.
- Lecture, écriture, analyse de CV et travail.
- Encouragement, réassurance, fierté, surprise et célébration.
- Alerte, prudence et annonce d’une erreur avec attitude rassurante.
- Au revoir et clôture de parcours.

### 6.2 Stickers et emojis

J’IA peut communiquer avec des stickers, des emojis et des réactions contextuelles : accueil, idée, réflexion, motivation, soutien, réussite, encouragement, félicitations, surprise ou attention. Ils complètent les messages et les gestes physiques du personnage ; ils ne remplacent pas le langage corporel animé.

### 6.3 Variations sans répétition

Les apparitions, gestes et expressions doivent rester anatomiquement crédibles, sobres quand le contexte l’exige, et synchronisées avec les paroles et le contenu présenté. Les mouvements autonomes purement décoratifs ne doivent pas détourner l’attention.

## 7. Moteur de variations — 50 variantes minimum par famille

Le fondateur demande **au moins 50 variations réellement distinctes pour chaque grande famille** ajoutée à l’expérience. Ce minimum est une cible de catalogue et de recette, non une simple multiplication de couleurs ou de durées.

Familles minimales à couvrir :

| Famille de variations | Minimum attendu |
|---|---:|
| Compositions/layouts de conversation | 50 |
| Ambiances, scènes et décors | 50 |
| Apparitions et sorties de J’IA | 50 |
| Positions, cadrages et échelles de l’avatar | 50 |
| Gestes et séquences corporelles | 50 |
| Expressions faciales et micro-expressions | 50 |
| Transitions entre présentations | 50 |
| Entrées et mises en scène des messages | 50 |
| Stickers, emojis et réactions | 50 |
| Présentations des offres et cartes d’entreprises | 50 |
| Questionnaires et choix interactifs | 50 |
| Présentations de documents, CV et résultats | 50 |

**Objectif de référence : 600 variantes minimum réparties dans les 12 familles.** Les 50 variantes de chaque famille doivent être documentées, identifiées, compatibles avec les appareils cibles et réellement différentes en composition, séquence, comportement ou interaction. Une simple couleur différente ne compte pas comme une variation distincte.

Le moteur combine des variantes compatibles ; il ne doit pas générer toutes les combinaisons mathématiquement possibles ni choisir une combinaison non validée. Les valeurs de 6,25 millions de combinaisons évoquées dans les échanges décrivent uniquement un potentiel théorique de quatre catalogues de 50 valeurs ; elles ne constituent ni un livrable ni une promesse de compatibilité.

### 7.1 Règles de sélection

- Pondération par intention, rôle, type de contenu, taille d’écran, préférences et accessibilité.
- Historique anti-répétition par utilisateur et famille de variation.
- Éviter les répétitions immédiates et les séquences trop prévisibles.
- Respect d’un layout verrouillé et des préférences enregistrées.
- Tirage limité au catalogue réellement disponible et validé.
- Fallback déterministe et lisible lorsque les ressources sont absentes ou réduites.
- Ne pas faire varier au hasard les décisions métier, les données, les permissions ou les actions.
- La variation visuelle ne modifie jamais le texte ou l’état métier.

## 8. Composants riches dans le fil

Le moteur conversationnel doit pouvoir afficher des blocs typés et interactifs, notamment :
- Texte, médias, liens et sources.
- Cartes d’offres, d’entreprises et de programmes.
- Comparaisons, recommandations et filtres.
- Boutons d’action et confirmations.
- Questions à choix unique ou multiple.
- Champs de texte, formulaires, dates et pièces jointes.
- Prévisualisation et édition guidée de profil/CV.
- Lettres de motivation et documents.
- Progression d’une opération, résultat et preuve de confirmation.
- Cartes et visualisations contextuelles.
- Stickers, animations et présentations.

Les questionnaires doivent accepter plusieurs types de réponses, conserver les sélections, expliquer les champs manquants et enchaîner les questions de façon contextuelle sans redemander une information déjà connue et fiable.

## 9. J’IA comme agent opérationnel de Jobly

J’IA doit utiliser les véritables services et règles métier de Jobly. Il faut réutiliser les modules et API existants plutôt que construire une deuxième implémentation parallèle.

### 9.1 Talent

- Lire, compléter et modifier le profil.
- Gérer les compétences, expériences, formations, certifications, langues et préférences.
- Lire, créer/améliorer et prévisualiser les CV et documents lorsque les services existants le permettent.
- Rechercher, filtrer, comparer et recommander des offres.
- Afficher les offres dans la conversation.
- Préparer les candidatures, adapter les documents, demander validation, soumettre les candidatures internes autorisées et suivre leur statut.
- Accompagner les entretiens, les apprentissages, la carrière, Mobility, Community et les événements.

### 9.2 Recruteur

- Créer, modifier et publier des offres selon les droits.
- Rechercher et consulter les candidats accessibles.
- Préqualifier à partir de critères professionnels définis et explicables.
- Organiser les candidatures et les étapes ATS.
- Préparer les entretiens, les communications et les rapports.
- Accéder aux statistiques et recommandations autorisées.

### 9.3 Administrateur

- Lire les indicateurs et rapports auxquels son rôle donne droit.
- Contrôler les offres et la qualité de la plateforme.
- Gérer les comptes, abonnements et paramètres autorisés.
- Préparer des opérations administratives avec validation requise.
- Surveiller les opérations et signaler les anomalies.

Les données CEO confidentielles, finances, marges, prévisions et informations institutionnelles privées doivent rester isolées dans le périmètre CEO Copilot et ne pas être exposées à J’IA utilisateur ou à des rôles Admin non autorisés.

### 9.4 Partenaire

- Consulter les programmes et services accessibles.
- Gérer les demandes, bénéficiaires et accompagnements selon le périmètre autorisé.
- Orienter et mettre en relation les bénéficiaires.
- Suivre les résultats et produire des rapports accessibles.

Les capacités exactes disponibles doivent être déterminées par audit du module correspondant ; ne pas afficher une action qui n’a pas de backend réel.

## 10. Offres et candidatures

Les offres doivent s’afficher dans la conversation comme des cartes reliées à la source de vérité Jobly : titre, entreprise, localisation, type de contrat, rémunération si connue, date, fraîcheur, canal de candidature, pertinence et lien officiel.

Actions possibles selon le contexte : consulter, comparer, enregistrer, filtrer, demander une explication, préparer une candidature et suivre son état.

- Candidature interne Jobly : soumission via le service métier existant, après contrôle de permission, préparation et confirmation explicite du Talent.
- Candidature externe : réutiliser les parcours sécurisés déjà présents. Le navigateur externe peut imposer authentification, CAPTCHA, consentement ou contraintes spécifiques. Le Talent garde le contrôle des réponses et de l’envoi final lorsque le site l’exige ; ne pas prétendre qu’une candidature externe a été envoyée si le service ne peut pas le prouver.
- Aucun faux statut de réussite ; conserver une trace vérifiable de l’état obtenu.

## 11. Internet Brain et cerveau hors ligne

Conserver le cerveau hors ligne, la mémoire, les préférences, les capacités vocales et les cycles cognitifs existants. Internet Brain complète ces capacités pour rechercher des informations et des opportunités externes.

Les réponses doivent distinguer :
- Données Jobly.
- Informations provenant d’Internet, accompagnées de sources et dates.
- Informations anciennes ou non vérifiées.
- Hypothèses et résultats confirmés.
- Actions proposées, en attente, exécutées ou échouées.

Aucune offre, source, disponibilité ou confirmation ne doit être inventée.

## 12. Abonnements, permissions et sécurité

- Vérifier côté serveur le rôle, l’identité, les permissions et les entitlements avant chaque action.
- Quotas et limites configurables par l’administration ; aucune limite commerciale codée en dur dans l’agent.
- Expliquer clairement une limite d’abonnement et proposer, lorsqu’elle existe, l’option adaptée sans blocage artificiel.
- Isoler les données de chaque utilisateur.
- Séparer strictement les privilèges Talent, Recruteur, Partenaire, Admin et CEO.
- Demander une validation explicite pour les modifications sensibles, transmissions externes et soumissions.
- Enregistrer les actions dans un journal d’audit.
- Prévenir les doublons et rejouabilités non désirées par idempotence.
- Ne pas transmettre à Internet Brain ou à un site externe des données sensibles sans nécessité et permission appropriée.
- Respecter les garde-fous financiers existants ; J’IA ne doit pas confirmer ou exécuter un paiement en dehors du flux autorisé.

## 13. Architecture cible

Les composants logiques à construire ou consolider sont :

| Composant | Responsabilité |
|---|---|
| Canonical Conversation Store | Messages, pièces jointes, choix, actions et état métier persistants |
| Conversational UI Engine | Conversion des données canoniques en composants riches |
| Living Layout Engine | Sélection et changement des présentations |
| J’IA Stage / Spotlight | Apparitions, présentations et placement adaptatif |
| Avatar Engine | Identité, rig, expressions et rendu du personnage |
| Motion & Emotion Engine | Gestes, mouvements, stickers et transitions |
| Variation Registry / Selector | Catalogue 50+ et sélection anti-répétition |
| Context & Role Engine | Contexte, rôle, permissions, abonnement et appareil |
| Action Connectors | Accès aux services/API Jobly |
| Internet Brain | Recherche et sources externes |

### 13.1 Séparation stricte des données et du rendu

Un message canonique contient au minimum :
- ID stable, conversation, auteur/rôle, horodatage et ordre.
- Texte exact et/ou payload typé.
- Pièces jointes et métadonnées de source.
- Références d’actions et identifiants d’opération.
- Payload de questionnaire et état de sélection.
- État de livraison/exécution vérifiable.

Le layout, les animations, les positions, les variantes et les préférences visuelles sont stockés séparément du contenu canonique. Un changement de rendu ne met à jour que les préférences ou le contexte de présentation.

Les changements de layout doivent être atomiques du point de vue de l’interface : préserver le focus, la sélection, la saisie, le scroll raisonnable et les opérations en cours.

## 14. Web, PWA et APK

- Responsive desktop/mobile.
- APK Android utilisant les mêmes contrats fonctionnels et la même source de données.
- Synchronisation de l’historique et des préférences.
- Reprise d’une conversation et d’une opération entre appareils.
- Entrées texte, voix, documents et pièces jointes selon les permissions.
- Rendu adaptatif de l’avatar et désactivation sûre des animations coûteuses.
- Compatibilité clavier, lecteur d’écran, réduction de mouvement et contrastes.
- Ne pas charger les moteurs 3D ou vidéo sur des routes/appareils où ils ne sont pas nécessaires.

## 15. État initial observé dans main — 6 novembre 2026

Éléments présents à réutiliser, sous réserve de tests sur le commit concerné :

- JiaPresence est monté globalement depuis app/layout.tsx.
- components/JiaPresence.tsx gère la présence contextuelle, les préférences, la voix, les événements J’IA, les appels Brain, la proactivité et la bulle de dialogue.
- lib/jia/brain.ts fournit le cerveau serveur et un résultat essentiellement textuel (message, intent, confidence, proposedAction, provider, sources et traceId).
- components/JIA/JIA.tsx contient un rig à calques, des expressions/mouvements et une liste nommée JIA_100.
- components/JIA/JIA3D.tsx contient un rendu GLTF / React Three Fiber.
- components/JIA/clips.ts possède des manifests de clips et un choix de prises qui évite de répéter immédiatement le même clip disponible.
- lib/jia/gestures.ts définit un vocabulaire sémantique de gestes.
- components/jia/JiaConversationalQcm.tsx existe ; il affiche actuellement au plus quatre choix plus « Autre » et conserve la sélection dans l’état local du composant.
- lib/jia/external-application.ts et les parcours associés existent.
- PR #220 est fusionnée : assistance aux candidatures externes, extension Chrome bêta, partage PWA et raccordement du contexte d’offre.
- PR #221 est fusionnée : assistance Android WebView, contrôle de l’origine et insertion limitée aux réponses explicitement approuvées par le candidat ; le candidat garde la relecture et l’envoi final.

### 15.1 Limites/gaps visibles à traiter

- JiaPresence garde une présence de type bulle/launcher et masque J’IA sur certaines routes, notamment admin ; la couverture Admin doit être repensée avec permissions, sans ouvrir le périmètre CEO privé.
- Le modèle d’écosystème dans JiaPresence couvre actuellement TALENT, RECRUITER et PARTNER ; il faut ajouter une résolution de rôle fiable et non une déduction uniquement depuis le pathname.
- La bulle temporaire et le recentDialogue local limité ne remplacent pas un fil de conversation persistant et riche.
- Le Brain actuel retourne surtout une réponse textuelle et une action proposée ; les blocs riches typés, payloads interactifs, états persistants et résultats d’action doivent être spécifiés/ajoutés.
- Le QCM actuel a une limite d’affichage de quatre choix plus Autre et garde ses sélections en état local ; il doit évoluer sans perdre sa simplicité.
- Deux voies de rendu du personnage existent (rig à sprites et GLTF) ; l’audit doit identifier les usages réels, assets, performances, fallbacks et stratégie canonique avant de les faire évoluer. Éviter de créer un avatar parallèle.
- La tenue jaune est documentée comme ne disposant pas de bras/membres animables séparément ; la vue en pied avec mains doit être vérifiée sur le modèle et les assets.
- Le catalogue nommé JIA_100 et les prises de clips existantes ne prouvent pas encore 50 variantes validées dans chacune des 12 familles demandées.
- Les anciennes règles de présence réduite, de non-variation autonome et d’usage des emojis doivent être réconciliées avec cette nouvelle décision : variations contextuelles maîtrisées autorisées ; stickers/emojis comme langage complémentaire ; gestes physiques conservés.
- La référence visuelle stricte du 20/09/2026 doit être actualisée : conserver l’essence du personnage mais soumettre le nouveau rendu à validation visuelle, car le rendu actuel ne satisfait plus le fondateur.

## 16. Phasage de réalisation

### Lot 0 — Audit et contrats
- Cartographier routes, composants, événements, brain, actions, préférences, données, permissions, subscriptions, assets et animations.
- Déterminer les sources de vérité existantes pour conversations, messages, fichiers et actions.
- Tracer les parcours Talent/Recruteur/Admin/Partenaire et leurs permissions effectives.
- Définir les contrats de message typé et de présentation.
- Identifier les usages actifs du rig et du GLTF.
- Établir les tests de non-régression avant modification.

### Lot 1 — Fondations conversationnelles
- Séparer stockage canonique et représentation.
- Définir les blocs riches versionnés.
- Préserver et restaurer l’état des questions, cartes et opérations.
- Définir les préférences de layout et motion.
- Construire le registre des présentations et le sélecteur sans répétition.
- Ajouter tests unitaires et tests de contrat.

### Lot 2 — Living Layout et expérience de base
- Intégrer les layouts Messenger, Gallery, Workspace et Interactive.
- Réorganiser l’interface sans recouvrir les contenus.
- Permettre au minimum trois changements de présentation en une session sans perte d’état.
- Ajouter commandes de verrouillage, retour et changement de présentation.

### Lot 3 — Avatar, Stage et Spotlight
- Finaliser le design du personnage et valider le modèle complet.
- Unifier le chemin de rendu après audit.
- Finaliser rig anatomique, mains, expressions et gestes.
- Implémenter les apparitions et disparitions adaptatives.

### Lot 4 — Variations et Motion
- Construire les 12 catalogues de 50 variations minimum.
- Documenter ID, aperçu, durée, contexte, compatibilité, accessibilité et fallback de chaque variation.
- Implémenter anti-répétition et sélection contextuelle.
- Ajouter stickers, emojis et réactions.

### Lot 5 — Composants riches et questionnaires
- Cartes d’offres et d’entreprises.
- QCM, choix unique/multiple, champs et fichiers.
- Prévisualisation/édition de profil, CV et documents.
- Progression, confirmations et résultats vérifiés.

### Lot 6 — Connecteurs opérationnels et quatre rôles
- Réutiliser les APIs et services existants.
- Connecter Talent, Recruteur, Admin et Partenaire selon les permissions réelles.
- Contrôler chaque action côté serveur.
- Préserver le CEO Copilot séparé.
- Vérifier les abonnements/quotas.

### Lot 7 — Internet Brain et continuité omnicanale
- Intégrer sources, dates et fraîcheur.
- Synchroniser conversations, préférences et opérations Web/APK.
- Préserver les parcours de candidature externes actuels et leurs garde-fous.

### Lot 8 — Validation et livraison
- E2E Web desktop/mobile et APK.
- Test des changements de layout et de l’état conversationnel.
- Test des 12 catalogues et de la non-répétition.
- Test des permissions, quotas et opérations sensibles.
- Accessibilité et performances.
- Non-régression générale.
- Rapport de preuves ; merge et déploiement restent des étapes distinctes.

## 17. Critères d'acceptation

La refonte ne peut être déclarée terminée que si les preuves démontrent :

1. Les quatre rôles disposent d'une expérience adaptée à leurs droits.
2. Une conversation peut changer au moins trois fois de présentation dans une session.
3. Après chaque changement, texte, ordre, pièces jointes, sélections, actions, historique et progression sont identiques.
4. Les anciens messages peuvent être réaffichés sans réécriture.
5. Aucun texte, bouton, offre ou document n'est recouvert.
6. Les apparitions Stage/Spotlight sont synchronisées et adaptatives.
7. L'identité de J’IA demeure cohérente ; les mains et gestes passent la revue visuelle.
8. Chaque famille dispose de 50 variantes distinctes, répertoriées et validées.
9. Le moteur évite les répétitions immédiates et respecte les préférences de l'utilisateur.
10. Les offres visibles proviennent de données réelles.
11. Les candidatures internes sont réellement exécutées après confirmation, et les candidatures externes respectent les garde-fous du site.
12. Les modifications de profil/CV sont réellement persistées.
13. Les questionnaires sont interactifs et conservent leurs sélections.
14. Les permissions, rôles, abonnements et quotas sont vérifiés côté serveur.
15. Internet Brain cite des sources vérifiables et distingue le confirmé de l'incertain.
16. Le cerveau hors ligne, la mémoire et les fonctions existantes ne régressent pas.
17. Web/PWA/APK sont synchronisés et testés.
18. Les performances, la réduction de mouvement et l'accessibilité sont validées.
19. Les tests de non-régression sont verts sur le commit exact livré.
20. Les preuves de merge et de déploiement sont publiées séparément.

## 18. Gouvernance et statut

- Ce document est la source de référence produit et technique pour le chantier J’IA 360.
- Il supersède les anciennes règles uniquement lorsqu’elles contredisent explicitement les décisions plus récentes du fondateur sur l’expérience adaptative, les variations contrôlées et les stickers/emojis.
- Il ne prétend pas que les fonctionnalités décrites sont déjà codées.
- Toute fonctionnalité réutilisée doit être vérifiée sur le commit courant.
- Aucune suppression de fonctionnalité existante pour simplifier le chantier.
- Toute évolution de périmètre doit être documentée et approuvée.
- Le statut reste : **SPÉCIFIÉ — AUDIT EN COURS — IMPLÉMENTATION À DÉMARRER/POURSUIVRE — NON VALIDÉ E2E**.

---
Fin du cahier directeur J’IA 360.
