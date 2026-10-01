# Jobly — A_CONFIGURER

## Profil actif

Variable :

`JOBLY_ENVIRONMENT_PROFILE=FREE_TEST`

Valeurs :
- `FREE_TEST` : développement et validation sans services payants.
- `PRODUCTION` : environnement commercial.

Le code métier ne doit pas changer entre les deux profils.

## Variables principales

| Variable | FREE_TEST | PRODUCTION | Où l'obtenir |
|---|---|---|---|
| `JOBLY_ENVIRONMENT_PROFILE` | `FREE_TEST` | `PRODUCTION` | configuration Jobly |
| `NEXT_PUBLIC_SUPABASE_URL` | requis | requis | Supabase Project Settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | requis | requis | Supabase API |
| `SUPABASE_SERVICE_ROLE_KEY` | requis serveur | requis serveur | Supabase API |
| `LIVEKIT_URL` | non requis | requis lot 9 | LiveKit |
| `LIVEKIT_API_KEY` | non requis | requis lot 9 | LiveKit |
| `LIVEKIT_API_SECRET` | non requis | requis lot 9 | LiveKit |
| `GOOGLE_CLIENT_ID` | selon OAuth | requis si Calendar/Meet API | Google Cloud |
| `GOOGLE_CLIENT_SECRET` | selon OAuth | requis | Google Cloud |
| `FCM_PROJECT_ID` | non requis | requis pour push Android | Firebase |
| `FCM_CLIENT_EMAIL` | non requis | requis | Firebase |
| `FCM_PRIVATE_KEY` | non requis | requis | Firebase |
| `APNS_KEY_ID` | non requis | requis iOS | Apple Developer |
| `APNS_TEAM_ID` | non requis | requis iOS | Apple Developer |
| `APNS_PRIVATE_KEY` | non requis | requis iOS | Apple Developer |
| `SMS_PROVIDER_* ` | noop | requis | fournisseur SMS |
| `CALL_PROVIDER_* ` | noop | requis | fournisseur appel |
| `SCHEDULER_* ` | Supabase/externe de secours | requis | scheduler choisi |

## Comptes externes

### Google Play
Requis pour publier Android. Pas nécessaire pour tester la PWA.

### Apple Developer
Requis pour distribuer l'app iOS et activer APNs/appel entrant natif. Pas nécessaire pour la PWA.

### Visio
En FREE_TEST, la visio native Jobly n'est pas considérée comme disponible tant que le provider n'est pas configuré. Un lien externe pourra servir de secours dans les lots ultérieurs.

### Firebase / FCM
Nécessaire pour le push Android natif.

### SMS / appel
En FREE_TEST, aucun SMS/appel n'est prétendu envoyé. Les adaptateurs noop devront journaliser l'intention et laisser le push/alarme native prendre le relais lorsqu'ils seront disponibles.

### Scheduler
Les rappels critiques ne doivent pas dépendre d'un cron Vercel Hobby. La disponibilité de pg_cron/équivalent doit être vérifiée sur le plan Supabase utilisé ; sinon un déclencheur externe est requis.

## Profil gratuit

FREE_TEST n'est pas un environnement commercial. Les quotas, pauses de projet et limites fournisseurs doivent être surveillés avant tout lancement.

## Santé

Le lot 1 prépare l'architecture ; l'endpoint de santé et les quotas détaillés seront complétés avec les providers concernés.
