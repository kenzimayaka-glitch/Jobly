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

- `scripts/jia-experience-engine.test.mjs`
- Commande : `pnpm test:jia-experience`
- CI : étape dédiée ajoutée à `.github/workflows/ci.yml`.

Les tests couvrent les six modes, le partage de la palette, les douze familles, la mesure des IDs distincts, l'anti-répétition, la résolution par intention/appareil, le verrouillage manuel et la réduction des animations.

## 4. Statut et limites actuels

Cette livraison est une première expérience UI raccordée au Brain existant ; elle n'est pas encore le chantier J’IA 360 complet.

- **Historique :** conservé dans l'état React du composant racine pour la session courante et les changements de layout/routes. Il n'est pas encore persisté dans une conversation serveur, restauré après fermeture/rechargement ou synchronisé entre appareils.
- **Layouts :** les six modes ont une première présentation utilisable. Les 50 variantes réelles par famille ne sont pas encore constituées ; le moteur contrôle leur inventaire et la non-répétition.
- **Offres et données riches :** l'écran sait afficher du texte et des sources. Les cartes d'offres Jobly, leur chargement depuis les services métiers et leurs actions conversationnelles restent à connecter.
- **Actions :** le panneau réutilise les propositions et confirmations existantes. Il n'ajoute pas à ce stade tous les connecteurs Talent/Recruteur/Admin/Partenaire.
- **Rôles :** la surface est adaptée aux écosystèmes actuellement exposés par JiaPresence (Talent, Recruteur, Partenaire). L'activation Admin exige d'abord le raccordement backend et les contrôles d'accès Admin ; elle ne doit pas être déduite d'un simple pathname.
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

1. Ajouter le chargement réel de cartes d'offres dans le fil avec liens et actions autorisées.
2. Concevoir les composants typés (offre, questionnaire, profil/CV, progression, confirmation) tout en gardant les mêmes IDs et payloads canoniques lors d'un changement de layout.
3. Définir la persistance serveur sécurisée des conversations et de l'état des opérations.
4. Ajouter la sélection de layout adaptative à partir des résultats réels du Brain, sans demander au LLM de réécrire les messages.
5. Construire les bibliothèques de variations documentées, visualisées et validées.
6. Réaliser les tests Playwright desktop/mobile et tests Android WebView sur appareils/émulateur.

---
Ce journal décrit l'état réel du code et les limites prouvées au moment de sa rédaction ; il ne constitue pas une certification de production.
