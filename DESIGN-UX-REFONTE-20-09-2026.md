# JOBLY — REFONTE UX/UI CANARY — 20/09/2026

## Mission
Refonte transversale du langage UX/UI pour faire de Jobly un produit cohérent de bout en bout, en prenant le parcours d'authentification comme référence visuelle.

## Design direction
- Primaire : Jaune Canari #FFE135
- Secondaire : Bleu Canari #0057B8
- Surface : Blanc
- Texte principal : Navy #0A1931
- Texte secondaire : #5F6F86
- Bordures : #DCE7F4
- Rayons : 12 / 18 / 24px
- Ombres : légères, profondes uniquement sur les surfaces importantes
- Typographie : Plus Jakarta Sans

## Principes
1. Chaque écran doit servir un parcours : Découverte → Compréhension → Action → Confirmation → Résultat → Prochaine action.
2. Le CTA principal est identifiable immédiatement.
3. Les composants réutilisent le même langage visuel.
4. Mobile-first, avec zones tactiles et navigation persistante.
5. Loading / empty / error / success doivent être conçus comme des états produits, pas comme des placeholders.
6. J'IA accompagne le parcours sans prendre le dessus sur le contenu.

## Changements livrés
- Nouveau socle global JOBLY 2026 dans app/globals.css.
- Tokens de couleur, surfaces, cartes, CTA, focus et états harmonisés.
- BottomNav harmonisée avec la palette Canari.
- PageHeader harmonisée avec la palette Canari et la hiérarchie produit.
- J'IA réduite pour diminuer son emprise visuelle sur mobile et desktop, tout en conservant son moteur et son identité.
- Les fonctionnalités et routes existantes ne sont pas remplacées par cette refonte.

## Règle de validation
SPÉCIFIÉ → DESIGNÉ → CODÉ → ACCESSIBLE → CONNECTÉ → TESTÉ → VALIDÉ → DÉPLOYÉ.

## État
Les modifications sont poussées directement sur main. La validation Vercel reste conditionnée à la fin des builds déclenchés automatiquement par les commits.
