# Jobly — A_CONFIGURER

## Profil actif
JOBLY_ENVIRONMENT_PROFILE=FREE_TEST

- FREE_TEST : développement et validation sans services payants.
- PRODUCTION : environnement commercial.

Le code métier ne change pas entre les profils.

## Variables

| Variable | FREE_TEST | PRODUCTION | Où l'obtenir |
|---|---|---|---|
| JOBLY_ENVIRONMENT_PROFILE | FREE_TEST | PRODUCTION | configuration Jobly |
| NEXT_PUBLIC_SUPABASE_URL | requis | requis | Supabase Project Settings |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | requis | requis | Supabase API |
| SUPABASE_SERVICE_ROLE_KEY | requis serveur | requis serveur | Supabase API |
| JOBLY_VIDEO_PROVIDER | JITSI par défaut | LIVEKIT ou JITSI | choix du provider vidéo |\n| JOBLY_JITSI_DOMAIN | meet.jit.si par défaut | domaine Jitsi retenu | Jitsi |\n| LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET | non requis si JITSI | requis si LIVEKIT | LiveKit |
| FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY | non requis | requis | Firebase |
| APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY | non requis | requis iOS | Apple Developer |
| SMS_PROVIDER_URL / SMS_PROVIDER_TOKEN | noop journalisé | requis | fournisseur SMS |
| CALL_PROVIDER_URL / CALL_PROVIDER_TOKEN | noop journalisé | requis | fournisseur appel |
| SCHEDULER_* | Supabase/externe de secours | requis | scheduler choisi |

## Lot 8 — surveillance et réseau faible

- Les événements de test sont envoyés au serveur lorsqu'une connexion existe.
- Hors ligne, les événements sont conservés localement puis resynchronisés.
- Les réponses de test sont aussi conservées localement si la requête serveur échoue.
- La caméra est optionnelle et nécessite un consentement explicite.
- La vidéo caméra n'est pas envoyée par le composant de proctoring.
- La détection de visage est strictement locale et dépend de la capacité réellement exposée par le navigateur. Si elle n'existe pas, Jobly l'indique et n'invente aucun résultat.
- Le signal d'intégrité est heuristique et multi-signaux : collage, changement d'onglet, sortie plein écran, coupures réseau, réponses anormalement rapides et événements caméra. Il ne constitue pas une preuve et ne peut pas rejeter seul un candidat.
- Les SMS/appels de secours en FREE_TEST sont noop : l'intention est journalisée, aucun envoi n'est prétendu.

## Scheduler

Supabase Cron repose sur pg_cron et peut exécuter des fonctions ou appeler des Edge Functions. Son activation et ses limites doivent être vérifiées sur le projet avant d'en faire le scheduler critique. Les rappels critiques gardent un déclencheur externe de secours.

## Santé / gratuit

Supabase Free inclut actuellement 500 MB de base par projet et peut mettre en pause un projet après environ 7 jours d'activité insuffisante. Le endpoint /api/health surveille l'application ; cela ne remplace pas la surveillance du quota.

## Comptes externes

- Google Play Developer : publication Android.
- Apple Developer : publication iOS, APNs et éventuel appel entrant natif.
- Firebase : FCM.
- LiveKit ou équivalent : visio production.
- Google Cloud : Calendar/Meet si activé.
- Fournisseur SMS/appel : alertes de secours.
- Scheduler externe : rappels critiques si Supabase Cron n'est pas retenu.
