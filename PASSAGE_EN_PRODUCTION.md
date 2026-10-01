# Jobly — PASSAGE_EN_PRODUCTION

> **NE PAS LANCER COMMERCIALEMENT EN `FREE_TEST`.**

## 1. Basculer le profil

Changer uniquement :

`JOBLY_ENVIRONMENT_PROFILE=PRODUCTION`

Les secrets de production doivent être fournis dans l'environnement serveur correspondant.

## 2. Hébergement

- Utiliser un hébergement Vercel compatible avec l'usage commercial.
- Vérifier que les tâches planifiées nécessaires sont supportées.
- Ne jamais faire dépendre l'ouverture exacte d'un test ou un rappel critique d'un cron Hobby.

## 3. Base Supabase

- Vérifier le plan et le quota.
- Vérifier sauvegardes, capacité, RLS et Data API.
- Les nouvelles tables publiques doivent être explicitement exposées seulement si nécessaire ; Supabase ne les expose plus automatiquement par défaut dans le nouveau modèle de plateforme.

## 4. Notifications

Configurer :
- fournisseur email transactionnel ;
- FCM Android ;
- APNs iOS ;
- fournisseur SMS ;
- fournisseur d'appel de secours.

## 5. Visio

Configurer LiveKit ou le provider retenu :
- URL ;
- clé ;
- secret ;
- quotas ;
- enregistrement ;
- consentement des deux parties.

En FREE_TEST, l'enregistrement reste désactivé.

## 6. Google Calendar / Meet

Configurer OAuth Google Cloud si la génération de liens/événements Google Calendar est activée.

## 7. Applications natives

### Android
- compte Google Play Developer ;
- signature Android ;
- FCM ;
- permissions/alarme ;
- publication.

### iOS
- compte Apple Developer ;
- certificats/signatures ;
- APNs ;
- mécanisme d'appel entrant validé par Apple ;
- publication App Store.

## 8. Scheduler

Choisir et tester un scheduler fiable pour :
- rappel test 30 min ;
- rappel test 5 min ;
- rappel entretien 30 min ;
- rappel entretien 5 min ;
- ouverture exacte des tests ;
- clôtures automatiques.

## 9. Vérification avant lancement

- [ ] profil PRODUCTION actif ;
- [ ] aucun provider noop actif ;
- [ ] quotas surveillés ;
- [ ] RLS validée ;
- [ ] migrations appliquées ;
- [ ] notifications email/push testées ;
- [ ] SMS/appel testés ;
- [ ] visio testée ;
- [ ] Android testée ;
- [ ] iOS testée ;
- [ ] scheduler testé ;
- [ ] audit et rétention validés ;
- [ ] scénario complet Recruiter ↔ Talent exécuté.

La mise en production commerciale ne peut être déclarée prête qu'après ces contrôles.
