# JOBLY — PASSAGE_EN_PRODUCTION

## Règle

**NE PAS LANCER COMMERCIALEMENT EN `FREE_TEST`.**

Le passage en production ne demande pas de réécrire le code : il consiste à changer le profil et les services externes, puis à vérifier les quotas et les comptes.

## Checklist

### 1. Profil
- [ ] `JOBLY_ENV_PROFILE=PRODUCTION`
- [ ] vérifier `JOBLY_PUBLIC_URL`
- [ ] conserver un TTL public explicite pour les listings
- [ ] supprimer les valeurs de test

### 2. Supabase
- [ ] plan adapté au trafic et au stockage
- [ ] sauvegardes et monitoring
- [ ] bucket `recruitment-listings` privé
- [ ] RLS et grants ré-audités

### 3. Vercel / hébergement
- [ ] plan commercial adapté à l'usage
- [ ] vérifier le temps/mémoire des fonctions de génération
- [ ] conserver le repli JPEG 8K
- [ ] ne pas dépendre de cron Hobby pour les fonctions critiques

### 4. Listings officiels
- [ ] vérifier PDF/XLSX/JPEG/WEB
- [ ] vérifier QR
- [ ] vérifier consentements
- [ ] vérifier expiration/révocation des liens
- [ ] conserver la page web comme référence officielle

### 5. Lot 9 — services futurs
- [ ] compte LiveKit ou équivalent
- [ ] fournisseur Google Calendar si Meet généré automatiquement
- [ ] FCM Android
- [ ] APNs/iOS
- [ ] compte Google Play
- [ ] compte Apple Developer
- [ ] fournisseur SMS/appel

### 6. Sécurité
- [ ] aucune clé secrète dans `NEXT_PUBLIC_*`
- [ ] aucun service payant présenté comme actif si non configuré
- [ ] tester les permissions recruteur/talent
- [ ] révoquer les anciens liens publics de test

## Message de lancement

> Ne pas lancer commercialement en `FREE_TEST`.
>
> Le profil de production doit être activé avant toute utilisation commerciale et les quotas/services externes doivent être vérifiés.
