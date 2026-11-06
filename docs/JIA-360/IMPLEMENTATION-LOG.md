# J’IA 360 — Journal d’implémentation

Date : 6 novembre 2026  
Référence : `docs/JIA-360/MASTER-SPEC.md`  
Issue : https://github.com/kenzimayaka-glitch/Jobly/issues/233  
PR de travail : https://github.com/kenzimayaka-glitch/Jobly/pull/234  
Branche : `feat/jia-360-living-conversation-20261106`

## 1. Documentation publiée dans main

Le cahier directeur a été ajouté directement à `main` :

- Fichier : `docs/JIA-360/MASTER-SPEC.md`
- Commit : `78637f174b402a5f74dd8bb701bc4428f8615eb6`
- URL : https://github.com/kenzimayaka-glitch/Jobly/blob/main/docs/JIA-360/MASTER-SPEC.md

Il conserve la palette, les six modes, les apparitions Stage/Spotlight, les quatre rôles, les connecteurs, la sécurité, les 12 familles à 50 variantes minimum et les critères de recette.

## 2. Incrément technique développé sur la branche

### 2.1 Moteur de présentation

Fichier : `lib/jia/experience-engine.ts`

- Six modes canoniques : Messenger, Gallery, Stage, Workspace, Explorer et Interactive.
- Résolution par intention, rôle disponible, appareil et préférence de présentation verrouillée.
- Prise en charge du mode réduit et désactivation du mouvement décoratif.
- Catalogue de douze familles de variations avec cible de 50 IDs distincts minimum chacune.
- Sélecteur anti-répétition avec aléatoire injectable et sans mutation des tableaux d'entrée.
- Rapport de couverture qui compte les identifiants réellement distincts. Une combinaison théorique ne compte jamais comme variante livrée.

### 2.2 Nouvelle surface conversationnelle

Fichier : `components/jia/JiaConversationSurface.tsx`

- Fenêtre de conversation plein écran sur Android/mobile avec respect des zones de sécurité système.
- Panneau immersif responsive sur desktop et tablette.
- Sélecteur manuel des six modes et retour Auto.
- En mode Auto, sélection semi-aléatoire d’une présentation compatible avec le sujet, avec historique anti-répétition ; bouton « Nouvelle composition » pour relancer une sélection. Le choix manuel verrouille la présentation jusqu’au retour à Auto.
- Compositions différenciées sans transformer le contenu des messages.
- Fil lisible, horodatage, sources séparées du texte et indication de réponse en cours.
- Espace d'accueil avec suggestions contextuelles Talent/Recruteur/Partenaire.
- Actions de confirmation réutilisant l'action existante ; elles ne sont pas simulées.
- Zone de saisie adaptée au clavier mobile, Enter pour envoyer et Maj+Entrée pour retour à la ligne.
- Raccourcis vers les rubriques existantes et vers l'installation bêta de l'extension J’IA sur ordinateur.
- Respect de `prefers-reduced-motion`, animations de transition limitées et fermeture par Échap.
- Défilement automatique vers le dernier message sans modifier l'historique.

### 2.3 Raccordement à l'existant

Fichier : `components/JiaPresence.tsx`

- La nouvelle surface utilise le même `/api/jia/brain`, les mêmes sources, le même flux de voix et les propositions d'action existantes.
- Les messages écrits et les transcriptions vocales alimentent le même fil en mémoire.
- Les réponses de J’IA sont affichées sans réécriture ; les sources sont des métadonnées séparées.
- Les propositions d'action existantes conservent leur confirmation et leur endpoint serveur.
- Le contexte de candidature externe déjà fusionné (#220/#221) peut ouvrir la nouvelle conversation avec son prompt prérempli.
- Lorsqu'une scène Stage est active, le widget flottant est démonté et le modèle GLTF J’IA est rendu dans la scène ; cela évite de faire tourner deux instances 3D simultanément.
- Le mode classique flottant demeure disponible lorsque la conversation immersive est fermée.
- Les changements de composants J’IA 360 sont inclus dans les déclencheurs du workflow Android WebView afin de valider également le build APK et le smoke test du shell.

## 3. Tests ajoutés

- `scripts/jia-experience-engine.test.mjs` et `scripts/jia-workspace.test.mjs`.
- Commande : `pnpm test:jia-experience`.
- CI : étape dédiée de `.github/workflows/ci.yml`, étendue au contrat des actions workspace.

Les tests couvrent les six modes, la palette, les douze familles, l'anti-répétition, la résolution par intention/appareil, ainsi que l'orientation des commandes Talent, l'isolation des autres rôles et la structure des questionnaires pratiques.

## 4. Statut et limites actuels

Cette livraison est une première expérience UI raccordée au Brain existant ; elle n'est pas encore le chantier J’IA 360 complet.

- **Historique :** le modèle canonique `JiaConversation` / `JiaConversationMessage`, l'API d'historique paginé et les écritures idempotentes sont ajoutés dans la branche. Les messages et blocs (réponses, lettre, résultat) sont sauvegardés via les endpoints authentifiés et restaurés par rôle. La migration `20261106080000_jia_canonical_conversations` est présente dans la PR mais n'a pas été appliquée à JOBLY-PROD ; l'exécution réelle, la reprise après panne et la synchronisation multi-appareils restent à valider sur une base de préproduction.
- **Layouts et variations :** six modes réellement utilisables existent. L'audit d'assets compte les ressources présentes : 6 layouts, 1 scène, 3 tenues, 4 placements, 54 fichiers vidéo correspondant à 39 noms de séquences distincts, 17 expressions faciales distinctes, 0 transition effectivement raccordée, 1 entrée de message, 0 sticker, 1 présentation d'offres, 2 parcours de questionnaire et 2 présentations document/CV. Aucune famille n'atteint actuellement 50 variantes distinctes et raccordées ; les autres familles restent à produire/valider. Les clips ne sont pas encore tous passés en contrôle visuel manuel.
- **Offres Talent :** les requêtes explicites d'offres appellent `GET /api/jobs` avec la session Supabase du membre. J’IA affiche les offres réellement renvoyées par Jobly, le score de correspondance, la localisation, le contrat, l'échéance, la source et l'état de préparation de la candidature. Le flux par défaut reste classé par le moteur d'adéquation Jobly ; la vue Afrique utilise le scope serveur existant.
- **Préparation de candidature :** le bouton d'une offre éligible appelle `POST /api/applications`. Jobly contrôle l'offre, le canal de contact, la fraîcheur, le profil, le quota et les doublons ; il crée une candidature au statut de revue utilisateur et renvoie une lettre préparée. Le bloc affiche explicitement « préparée — pas encore envoyée » : aucun envoi automatique n'est déclenché.
- **Candidatures :** les demandes de suivi appellent `GET /api/applications` et affichent les compteurs et statuts provenant du compte connecté.
- **Profil/CV :** les demandes correspondantes appellent `GET /api/profile`. J’IA expose les données réelles du profil, les compétences, les dernières expériences/formations et le lien du CV original lorsqu'une URL signée est disponible. La carte conversationnelle permet d'éditer le nom affiché, le téléphone, l'intitulé, le résumé, la localisation et les compétences avec les endpoints Jobly existants ; les expériences et formations détaillées restent gérées dans leurs écrans dédiés. Le remplacement du CV original PDF se fait aussi depuis la carte, après sélection du fichier et confirmation explicite.
- **Questionnaires :** les exercices MCQ facultatifs utilisent maintenant une banque de six questions par famille (Excel, vente, communication, transversal) et trois niveaux. Le parcours adaptatif Premium pose jusqu'à cinq questions et augmente ou réduit la difficulté selon la réponse ; si l'entitlement Premium refuse l'option, J’IA revient au parcours standard de trois questions. Les tentatives et réponses sont sauvegardées via `ATTEMPT`. Le score est formatif, calculé localement et n'est pas transmis comme preuve `AI_EVALUATED`, certification ou décision de recrutement.
- **Connecteurs Recruteur/Partenaire/Admin :** la branche ajoute des lectures conversationnelles des offres recruteur, candidatures reçues (sans marquer « Vu »), profils Talent publics, dossier et affectations Mobility, commissions, rapports Mobility et intelligence transversale Admin. Chaque lecteur appelle une API Jobly existante ; l'API des affectations continue de refuser les prestataires non vérifiés/inactifs. Le tableau Admin reste séparé du Copilot CEO privé. Les mutations métier détaillées du recruteur et du partenaire ne sont pas encore intégrées comme actions conversationnelles.
- **Limites :** l'édition inline du profil couvre les champs essentiels et compétences ; les expériences/formations détaillées restent dans les écrans Talent. Le remplacement du CV garde les contrôles Jobly. Aucun email n'est envoyé sans confirmation explicite. La migration conversationnelle n'est pas encore déployée sur une base distante de préproduction.
- **Rôles :** Talent, Recruteur, Partenaire et Admin ont désormais des intentions dédiées et une autorisation serveur à partir du rôle/profil Jobly. Admin n'hérite pas des données Recruteur/Partenaire, et l'espace J’IA général n'ouvre jamais le Copilot CEO privé.
- **Avatar :** Stage réutilise le modèle GLTF actuel. Le nouveau design final, la revue anatomique du rig, les 50 variantes de gestes et les apparitions multi-scènes restent à réaliser.
- **Android :** l'interface fonctionne dans le WebView de l'APK par son adaptation mobile et ses safe areas. Aucun composant natif Android/Jetpack Compose n'a été modifié dans ce lot.

## 5. Gouvernance de livraison

- La documentation de référence est dans `main`.
- L'interface et le moteur sont sur la branche et la PR #234, non fusionnée.
- Aucun schéma Supabase ni donnée de production n'a été modifié.
- Aucun déploiement Vercel de production n'a été déclenché.
- Les tests spécialisés J’IA et le workflow global doivent être vérifiés sur le SHA final de la branche avant de sortir la PR du statut draft.
- Aucune déclaration de fonctionnalité complète n'est faite tant que les tests, la persistance serveur, les connecteurs métiers et les E2E Web/APK requis ne sont pas prouvés.

## 6. Prochaine tranche UX/technique

1. Étendre les blocs métier aux questionnaires adaptatifs autorisés par les droits, au document/CV structuré et aux parcours de modification avec confirmation explicite.
2. Ajouter les connecteurs de lecture et d'action du rôle Recruteur, puis Partenaire, en vérifiant à chaque fois l'autorisation serveur.
3. Définir la persistance serveur sécurisée des conversations, des pièces jointes et de l'état des opérations.
4. Vérifier le parcours complet de préparation et de revue des candidatures par tests E2E (aucun envoi sans acte utilisateur explicite).
5. Ajouter la sélection de layout adaptative à partir des résultats réels du Brain, sans demander au LLM de réécrire les messages.
6. Construire les bibliothèques de variations réellement produites et valider les 50 assets distincts par famille.
7. Réaliser les tests Playwright desktop/mobile et Android WebView sur appareils/émulateur, puis revoir les conflits de fusion avant sortie du statut draft.

---
Ce journal décrit l'état réel du code et les limites prouvées au moment de sa rédaction ; il ne constitue pas une certification de production.


## 8. Envoi de candidature depuis la conversation — confirmation explicite

- Le bloc de candidature préparée transporte maintenant l’identifiant réel de l’enregistrement `Application`.
- La lettre est modifiable dans le bloc avant transmission.
- Le bouton de transmission n’apparaît que pour le canal `EMAIL` et affiche une confirmation native rappelant que l’email sera réellement envoyé via le Gmail connecté avec le CV en pièce jointe.
- Après confirmation, J’IA appelle uniquement `POST /api/applications/{id}/submit`, qui conserve les vérifications serveur existantes : propriétaire de la candidature, statut, quota, canal EMAIL, CV, adresse destinataire et connexion Gmail.
- Le bloc n’affiche « envoyée » qu’après une réponse du service Jobly avec `submitted: true`. Une preuve en attente est explicitement distinguée.
- Les autres canaux ne sont jamais présentés comme envoyés : ils restent à poursuivre via la source ou le module approprié.


## 7. Incrément — actions Talent depuis la conversation

- Édition dans la carte Profil : nom affiché, téléphone, intitulé professionnel, résumé, localisation et compétences. Les écritures réutilisent `PUT /api/profile` avec la session de l'utilisateur ; les champs visibles sont actualisés dans le message après réponse positive des API.
- Remplacement du CV original PDF directement depuis cette carte, avec confirmation utilisateur, limite de 3 Mo côté client/serveur et vérification de la signature du fichier côté serveur.
- Le serveur n'efface l'ancien fichier CV qu'après avoir enregistré le chemin du nouveau document dans `User`, afin d'éviter la perte du CV précédent si l'update échoue.
- Les réponses sélectionnées au questionnaire et le brouillon de lettre de candidature sont remontés dans le bloc du message. Ils restent ainsi associés à leur contenu pendant les changements de présentation ; ils ne sont pas encore sauvegardés comme historique conversationnel serveur.
- Aucune migration, écriture de données de production, fusion ou mise en production n'est incluse dans cet incrément.


## 9. Incrément — persistance, écosystèmes et audit adaptatif (branche PR #234)

- Le schéma Prisma et la migration de branche ajoutent les conversations et messages canoniques, avec RLS activé, accès direct `anon/authenticated` révoqué et privilèges de données réservés au service-role côté serveur.
- `GET/POST /api/jia/conversations` vérifie la session, le consentement, l'appartenance au compte et l'écosystème autorisé ; l'historique est paginé, les messages idempotents, les sources normalisées et les états des cartes mis à jour sur le message propriétaire.
- L'interface restaure le fil par écosystème et enregistre les messages et états de cartes. Les changements de rôle isolent les files d'attente ; les résultats de sauvegarde du profil/CV, d'envoi de candidature et de tentative de questionnaire sont réécrits dans le bloc correspondant.
- Les lecteurs conversationnels Recruteur, Partenaire et Admin utilisent les API existantes. Les candidatures reçues passent par `markViewed=0` ; les profils montrés au recruteur sont ceux qui ont activé la visibilité publique ; les affectations Mobility restent réservées au prestataire vérifié et actif ; l'intelligence Admin reste distincte du Copilot CEO.
- L'exercice adaptatif Premium utilise une banque de questions bornée et un parcours qui ajuste la difficulté ; il ne fabrique pas de certification ni de preuve IA.
- Un audit automatisé lit réellement le rig, les manifests et les clips présents. Il signale les familles incomplètes au lieu de déduire des variantes du produit cartésien. La spécification demande toujours 50 variantes distinctes pour chacune des 12 familles ; ce critère n'est donc pas vert.
- Aucun changement de schéma ou de donnée JOBLY-PROD n'a été appliqué ; la migration reste dans la branche. Aucun déploiement de production n'a été déclenché.
