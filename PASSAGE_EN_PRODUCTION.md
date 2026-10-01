# Jobly — PASSAGE_EN_PRODUCTION

> NE PAS LANCER COMMERCIALEMENT EN FREE_TEST.

## 1. Basculer le profil

Changer uniquement :
JOBLY_ENVIRONMENT_PROFILE=PRODUCTION

Puis fournir les secrets de production. Aucun changement de logique métier ne doit être nécessaire.

## 2. Hébergement

- Vercel compatible avec l'usage commercial.
- Scheduler fiable pour rappels T-30/T-5, ouverture exacte des tests et clôtures.
- Ne jamais faire dépendre une action critique d'un cron Hobby.

## 3. Supabase

- Vérifier quota, sauvegardes, RLS et Data API.
- Free : 500 MB de base par projet ; les projets Free peuvent être pausés après faible activité sur 7 jours.
- Production : plan payant recommandé/nécessaire pour éviter cette pause et disposer de capacités adaptées.

## 4. Notifications

Configurer et tester email transactionnel, FCM Android, APNs iOS, fournisseur SMS et fournisseur d'appel.
Un provider noop actif interdit le lancement commercial.

## 5. Visio

Configurer LiveKit ou le provider retenu : URL, clé, secret, quota, présence, salle d'attente et enregistrement. L'enregistrement reste soumis au consentement explicite des deux parties.

## 6. Applications natives

Android : compte Google Play Developer, signature, FCM, permissions d'alarme et test sur appareil réel.
iOS : compte Apple Developer, signatures, APNs, mécanisme d'appel entrant validé par Apple et test sur appareil réel.

## 7. Scheduler

Tester réellement les rappels test 30 min/5 min, entretien 30 min/5 min, ouverture exacte d'un test, clôtures automatiques et reprise après incident du scheduler.

## 8. Lot 8 — contrôle obligatoire avant commercialisation

- [ ] aucun faux SMS/appel
- [ ] provider réel configuré et testé
- [ ] événements proctoring protégés par RLS
- [ ] aucun upload vidéo caméra
- [ ] consentement caméra vérifié
- [ ] signal heuristique présenté comme indicateur
- [ ] aucun rejet automatique fondé sur ce signal
- [ ] réponses hors ligne resynchronisées
- [ ] événements hors ligne resynchronisés
- [ ] scénario de coupure réseau exécuté sur appareil réel
- [ ] caméra refusée testée
- [ ] sortie d'onglet testée
- [ ] sortie plein écran testée
- [ ] rapport de signaux testé côté recruteur

## 9. Vérification finale

- [ ] profil PRODUCTION actif
- [ ] migrations appliquées
- [ ] RLS validée
- [ ] notifications email/push testées
- [ ] SMS/appel testés
- [ ] visio testée
- [ ] Android testée
- [ ] iOS testée
- [ ] scheduler testé
- [ ] audit et rétention validés
- [ ] scénario complet Recruiter ↔ Talent exécuté
