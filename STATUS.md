# JOBLY — STATUS — LOT H — 02/10/2026

## Lot H — Jobly Events

**Branche de chantier :** \`feat/lot-h-jobly-events-20261002\`

### CODÉ
- Event Core + pricing dynamique.
- Domaines et sous-domaines.
- Publication standard / Jobly / entitlement partenaire.
- Paiement publication et vérification.
- Page \`/events\`.
- Page \`/events/create\`.
- Page détail.
- 6 slots « Grands rendez-vous ».
- Mise en avant : 10 000 FCFA / 7 jours.
- API upload média avec limite 10 MB.
- Limite vidéo 30 secondes côté client + serveur sur métadonnées fournies.
- Règles de sécurité / acceptation des droits.

### À POURSUIVRE
- Branchements runtime Community, Campus, Mobility, Offers, Career Journey et Hub institutionnel.
- Event distribution J’IA réelle.
- Estimation d'audience alimentée par les données réelles de l'écosystème.
- Event Bypass Detector dans Community : texte uniquement, détection des contournements, suppression graduée et sanctions récidivistes.
- Sponsoring / recherche de partenaires.
- E2E paiement + slots.
- Vérification réelle du bucket média.
- Tests UX et navigateur.

### GOUVERNANCE
- Migration SQL présente dans le dépôt mais **non appliquée à JOBLY-PROD**.
- Aucun déploiement Vercel.
- Aucun merge vers \`main\`.
- CI typecheck/build à observer sur la branche.
