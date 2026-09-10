# JOBLY

Jobly est une application d'accompagnement de carrière centrée sur la recherche d'opportunités et l'IA.

## État actuel

La priorité active est **C0.5 — Auth**. L'authentification est codée mais la validation fonctionnelle est bloquée par une **correction visuelle de l'écran Auth** (premier écran, nouvel utilisateur), constatée après test réel sur téléphone. Voir `Statut.md`, sections 1, 2 et 5.1 pour le détail et la liste des écarts à corriger.

## Règle de travail

`Statut.md` est la source de vérité unique. Une brique n'est considérée comme validée qu'après test humain sur un vrai téléphone. Tant que la tâche active (section 2 de `Statut.md`) n'est pas ✅, aucune nouvelle fonctionnalité ni aucun nouvel écran ne doit être développé — les idées hors-sujet vont dans le Backlog (section 9 de `Statut.md`), pas en développement.

## Charte graphique de référence

- Bleu principal : `#2563EB`
- Jaune : `#FBBF24`
- Vert : `#10B981`
- Violet IA : `#8B5CF6`
- Orange : `#F97316`
- Navy texte : `#16254A`
- Blanc : `#FFFFFF`
- Typographie : Jakarta Sans ou équivalent géométrique
- Cartes très arrondies, espace blanc généreux
- Gradients réservés aux moments héro/IA

## Déploiement actuellement testé

`joblyv01.vercel.app`

## Documentation

Voir `Statut.md` pour :
- l'état détaillé des 12 briques du MVP (section 1),
- la tâche unique en cours (section 2),
- les décisions figées et leur historique de révision (section 3),
- le backlog des sujets mis en attente — dont le parcours visuel complet et l'écran de seconde utilisation (section 9).


## C0.8.0 — Écran Auth corrigé

Cette livraison corrige l'écran Auth selon les références visuelles Jobly fournies :
- mobile sans scroll ;
- photo humaine de référence ;
- WhatsApp + Google ;
- connexion téléphone/e-mail + mot de passe ;
- Apple supprimé ;
- palette et typographie Jobly ;
- animations de fond discrètes et respect de `prefers-reduced-motion`.

Le projet est structuré pour être chargé directement sur Vercel.
