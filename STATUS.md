# P1 EVENT CORE — CHECKPOINT 05/11/2026

## Corrections réalisées
- Schéma Event Core appliqué à JOBLY-PROD : Event, EventPayment, EventFeaturedCampaign, EventEntitlement ; index et RLS actifs ; aucun accès direct anon/authenticated.
- Bucket public `jobly-events` créé pour les médias événementiels (10 MB) ; variable Vercel Production `JOBLY_EVENTS_BUCKET` configurée.
- Bucket privé `jobly-payment-proofs` créé pour les reçus (10 MB, image/PDF) ; aucun accès public ; l'équipe Finance utilise des URL signées de 5 minutes.
- Barème de publication corrigé : 2 000 FCFA/jour (1–9 j), 1 500 (10–29 j), 1 000 (30–59 j), 800 (60–90 j).
- Upload médias : signature réelle vérifiée côté serveur ; MP4 limité à 30 secondes.
- Publication et mise en avant : réservation atomique des 6 slots ; droits `freePublication`/`freeFeatured` ; idempotence et états cohérents.
- **ICLAN retiré du parcours Event Core** : aucune création ni vérification de paiement d'événement ne passe par API fournisseur. Le fournisseur ICLAN de Billing/abonnements hors Event Core n'est pas modifié.
- Paiement manuel : transfert MTN MoMo / Orange Money / banque / autre, référence de transaction et justificatif privé ; validation ou rejet ADMIN/FINANCE depuis `/admin/events/payments`.
- Validation admin atomique : à l'approbation, paiement + publication ou campagne sont activés ensemble ; rejet de publication permet une nouvelle soumission auditée ; rejet de mise en avant clôture le paiement et libère le slot.
- Endpoints fournisseurs Event Core supprimés ; endpoints de soumission, upload de reçu et revue Finance ajoutés.

## Preuves et limites
- Migrations Event Core, paiement manuel et bucket privé appliquées à JOBLY-PROD.
- Test SQL transactionnel manuel : rejet d'une preuve, nouvelle soumission, approbation et publication ; rejet d'une mise en avant et libération du slot : PASS ; rollback complet, aucune donnée de test conservée.
- Table de justificatifs protégée par RLS sans grants anon/authenticated ; bucket justificatifs privé ; RPC ADMIN/FINANCE uniquement.
- CI principale : tests Event Core, P2, Career OS, Afrique P0, Billing, Mobility, Prisma et typecheck : PASS sur le dernier commit. Build de production : en cours de validation au dernier contrôle.
- Les coordonnées bénéficiaires de collecte doivent être renseignées dans `JOBLY_MANUAL_PAYMENT_INSTRUCTIONS` avant exploitation réelle du paiement manuel.
- Aucun merge dans `main` ni déploiement Vercel effectué.

---

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
- Diffusion J’IA réelle vers les communautés concernées : **CODÉE côté notifications in-app + estimation de portée** ; canaux externes restent hors périmètre.
- Alimentation de l'estimation d'audience par des données réelles de l'écosystème.
- Event Bypass Detector dans Community : texte uniquement, détection des contournements, suppression graduée et sanctions récidivistes.
- Sponsoring / recherche de partenaires : **détection + notification de partenaires/recruteurs codée** ; transaction de sponsoring dédiée reste hors schéma actuel.
- E2E paiement + slots.
- Vérification réelle du bucket média.
- Tests UX et navigateur.
- Raccordement opérationnel aux systèmes Community/Campus/Hub lorsqu'ils exposent leurs contrats runtime canoniques.

### GOUVERNANCE
- Migration SQL présente dans le dépôt mais **non appliquée à JOBLY-PROD**.
- Aucun déploiement Vercel.
- Aucun merge vers `main`.
- CI typecheck/build : **PASSÉ** (run 1153).
- La couche d'écosystème ne crée pas de source de vérité parallèle : **Event reste la source unique de vérité événementielle**.

> Règle : CODÉ ≠ ACCESSIBLE ≠ CONNECTÉ ≠ TESTÉ ≠ VALIDÉ ≠ DÉPLOYÉ.
