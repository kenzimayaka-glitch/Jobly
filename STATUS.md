# JOBLY — STATUS — LOT H — 02/10/2026

## Lot H — Jobly Events

**Branche de chantier :** `feat/lot-h-jobly-events-20261002`

### CODÉ
- Event Core + pricing dynamique.
- Domaines et sous-domaines.
- Publication standard / Jobly / entitlement partenaire.
- Paiement publication et vérification.
- Page `/events`.
- Page `/events/create`.
- Page détail.
- 6 slots « Grands rendez-vous ».
- Mise en avant : 10 000 FCFA / 7 jours.
- API upload média avec limite 10 MB.
- Limite vidéo 30 secondes côté client + serveur sur métadonnées fournies.
- Règles de sécurité / acceptation des droits.
- **Raccordement Career Journey / profil / mobilité** : calcul de pertinence des événements sans création d'un état Career parallèle.
- **Raccordement Offers** : les événements Emploi & Recrutement sont exposés dans la même couche de recommandation événementielle, sans duplication des offres.
- **Raccordement Campus / Mobility / Community / Hub** : contrats de consommation déclarés dans la couche d'écosystème ; aucun événement n'est dupliqué dans ces surfaces.
- Endpoint `/api/events/:id/ecosystem` et affichage du raccordement sur le détail.

### À POURSUIVRE
- Diffusion J’IA réelle vers les communautés concernées.
- Alimentation de l'estimation d'audience par des données réelles de l'écosystème.
- Event Bypass Detector dans Community : texte uniquement, détection des contournements, suppression graduée et sanctions récidivistes.
- Sponsoring / recherche de partenaires.
- E2E paiement + slots.
- Vérification réelle du bucket média.
- Tests UX et navigateur.
- Raccordement opérationnel aux systèmes Community/Campus/Hub lorsqu'ils exposent leurs contrats runtime canoniques.

### GOUVERNANCE
- Migration SQL présente dans le dépôt mais **non appliquée à JOBLY-PROD**.
- Aucun déploiement Vercel.
- Aucun merge vers `main`.
- CI typecheck/build : à observer sur la branche.
- La couche d'écosystème ne crée pas de source de vérité parallèle : **Event reste la source unique de vérité événementielle**.

> Règle : CODÉ ≠ ACCESSIBLE ≠ CONNECTÉ ≠ TESTÉ ≠ VALIDÉ ≠ DÉPLOYÉ.
