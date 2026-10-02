# JOBLY — A_CONFIGURER

## Profil de configuration

### FREE_TEST
- `JOBLY_ENV_PROFILE=FREE_TEST`
- `JOBLY_PUBLIC_URL` : URL publique de Jobly utilisée dans le bloc immuable et les QR.
- `JOBLY_LISTING_PUBLIC_LINK_TTL_HOURS` : durée des liens publics, 1 à 720 h.
- `JOBLY_FREE_JPEG_MAX_PIXELS` : plafond de sécurité pour le rendu JPEG gratuit. Valeur par défaut : 18 000 000 pixels.
- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : clé publique Supabase côté serveur pour vérifier les sessions.
- `SUPABASE_SERVICE_ROLE_KEY` : clé serveur uniquement. Ne jamais l'exposer au navigateur.
- Bucket Supabase privé `recruitment-listings` : créé par migration.

## Services externes

| Service | FREE_TEST | PRODUCTION |
|---|---|---|
| Supabase DB/Storage | possible sous les limites du plan gratuit | plan commercial recommandé |
| Vercel | build/test seulement dans ce chantier | hébergement commercial selon usage |
| PDF/XLSX/JPEG | rendu local serveur | même code |
| Public listing | lien temporaire | lien temporaire configurable |
| LiveKit | non requis pour Lot 11 | à configurer pour Lot 9 |
| FCM/APNs | non requis pour Lot 11 | à configurer pour Lot 9 |
| SMS/appel | noop en FREE_TEST | fournisseur payant pour production |
| Google Calendar/Meet | optionnel | identifiants Google si utilisé |

## Lot 11

Le générateur utilise `pdfkit`, `exceljs`, `qrcode` et `sharp`, déjà présents dans `package.json`.

Le 8K JPEG est contrôlé par `JOBLY_FREE_JPEG_MAX_PIXELS`. Si le profil gratuit dépasse ce plafond ou si le rendu 8K échoue, Jobly retombe automatiquement sur 2160×4320 et l'interface l'indique.

## À ne jamais mettre dans le client

- `SUPABASE_SERVICE_ROLE_KEY`
- aucune clé fournisseur privée
- aucun token de lien public permanent

## Limites honnêtes

Un fichier téléchargé peut toujours être modifié par son destinataire. La référence officielle reste la page web Jobly avec son lien public temporaire.
