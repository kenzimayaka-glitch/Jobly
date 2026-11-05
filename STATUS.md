# P1 EVENT CORE — CHECKPOINT 05/11/2026

## Corrections réalisées
- Schéma Event Core appliqué à JOBLY-PROD : Event, EventPayment, EventFeaturedCampaign, EventEntitlement ; index et RLS actifs ; aucun accès direct anon/authenticated.
- Bucket Storage `jobly-events` créé, lecture publique des médias et limite de 10 MB ; variable Vercel `JOBLY_EVENTS_BUCKET` ajoutée à l'environnement Production.
- Prix alignés sur le barème : 2 000 FCFA/jour (1–9 j), 1 500 (10–29 j), 1 000 (30–59 j), 800 (60–90 j).
- Upload médias : signature réelle vérifiée côté serveur ; MP4 limité à 30 secondes à partir des métadonnées du fichier.
- Publication et mise en avant : contrôle référence/montant/devise, finalisation SQL atomique, réservation transactionnelle des 6 slots, droits freePublication/freeFeatured, idempotence Payment.
- États de refus/échec : Payment/EventPayment/Campaign clôturés correctement ; événement revenu en brouillon si le paiement de publication échoue.
- Migrations de production tracées dans `supabase/migrations` avec versions alignées sur Supabase.

## Preuves et limites
- Test SQL transactionnel publication payée + campagne gratuite + campagne payante : PASS ; transaction ROLLBACK ; aucun enregistrement de test conservé.
- Tests Event Core, typecheck et build : PASS sur la branche synchronisée à `main` (résultat à actualiser selon le dernier run GitHub).
- Fournisseur ICLAN : accès et endpoints live non configurés dans Vercel Production. Le code du provider contient encore des chemins de test par défaut. Aucun paiement réel ne peut donc être déclaré E2E validé.
- La variable `JOBLY_EVENTS_BUCKET` est présente dans Vercel Production, mais doit être incluse dans le prochain déploiement pour être disponible au runtime.
- Pas de merge vers `main` ni de déploiement Vercel dans cette passe ; PR à soumettre après validation finale CI.

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
