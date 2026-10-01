# Jobly — couche native Capacitor (Lot 9)

Le web Jobly reste la source fonctionnelle. Capacitor l'enveloppe pour Android/iOS et expose les capacités natives sans dupliquer le parcours.

## Contrat natif implémenté côté web

- lib/recruitment360/native-bridge.ts
- demande de permissions push/local ;
- alerte critique plein écran/notification locale lorsque le plugin est disponible ;
- événement jobly:critical-interview-alert comme pont contrôlé ;
- événement jobly:native-incoming-call pour l'adaptateur d'appel natif.

## Capacités natives requises

### Android
- Capacitor Push Notifications / FCM ;
- Capacitor Local Notifications ;
- canal haute priorité pour l'alerte critique ;
- alarme/notification plein écran selon les permissions Android réellement accordées ;
- test appareil réel.

### iOS
- APNs ;
- notification critique uniquement si Apple accorde l'entitlement correspondant ;
- CallKit/PushKit pour l'écran d'appel entrant si ce mécanisme est retenu ;
- test appareil réel.

Le web ne prétend jamais qu'un écran d'appel natif est disponible si le plugin/entitlement n'est pas présent.

## Initialisation du shell

Après installation des dépendances Capacitor dans l'environnement de développement :

1. pnpm exec cap add android
2. pnpm exec cap add ios
3. pnpm exec cap sync
4. ouvrir Android Studio/Xcode ;
5. configurer les comptes développeur, signatures, FCM/APNs et permissions ;
6. tester sur appareils réels.

Ces commandes génèrent les projets natifs à partir du même code web ; elles ne doivent pas être lancées contre main sans validation CEO.

## Dépendances natives

À installer dans le shell natif :
- @capacitor/core
- @capacitor/cli
- @capacitor/android
- @capacitor/ios
- @capacitor/push-notifications
- @capacitor/local-notifications

L'adaptateur JoblyCallAlert doit être implémenté avec le mécanisme natif retenu et validé par Apple/Android avant publication. Aucune alerte d'appel native n'est simulée dans Jobly web.

## Visio

La salle est réellement intégrée dans Jobly :
- Jitsi en FREE_TEST ;
- LiveKit si JOBLY_VIDEO_PROVIDER=LIVEKIT et credentials disponibles ;
- fallback lien externe uniquement lorsque le provider configuré ne peut pas être utilisé.

Le token LiveKit est signé côté serveur ; la clé secrète n'est jamais exposée au client.
