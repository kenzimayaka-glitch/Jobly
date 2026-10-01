# JOBLY — REGISTRE LOGOS ENTREPRISES
## 2026-10-02

### Objectif
Réduire les appels répétés à Logo.dev en rattachant le logo à l'identité canonique de l'entreprise (domaine), avec possibilité de servir une copie Jobly hébergée lorsque le plan Logo.dev l'autorise.

### Audit initial
- `components/CompanyLogo.tsx` interroge déjà le serveur via `/api/company-logo`.
- `app/api/company-logo/route.ts` ne conservait qu'un cache mémoire de 24 h : il était perdu au redémarrage et ne constituait pas un registre persistant.
- Supabase `JOBLY-PROD` ne possédait pas de bucket dédié aux logos d'entreprises.
- Les buckets existants (`profile-photos`, `recruitment-listings`, `talent-cvs`) ne doivent pas être détournés.

### Implémentation
1. `public.company_logo_registry`
   - clé canonique : `domain`
   - nom entreprise
   - URL source Logo.dev
   - URL hébergée Jobly
   - chemin Storage
   - hash SHA-256
   - type MIME
   - statut et dates de contrôle
2. Bucket public `company-logos`
   - images uniquement
   - limite 2 MiB
   - destiné aux copies publiques de logos
3. `lib/supabaseAdmin.ts`
   - client Supabase strictement serveur
   - aucune exposition de `SUPABASE_SERVICE_ROLE_KEY`
4. `/api/company-logo`
   - consulte d'abord le registre persistant
   - renvoie directement le logo Jobly s'il existe
   - sinon réutilise l'URL Logo.dev pendant 30 jours
   - résolution par Brand API quand le domaine est connu
   - résolution par Search API quand seul le nom est connu
   - auto-hébergement binaire optionnel, contrôlé par `LOGO_DEV_SELF_HOST_ENABLED`
5. `.env.example`
   - documentation de `LOGO_DEV_SECRET_KEY`
   - documentation du flag d'auto-hébergement

### Sécurité / conformité
Le stockage binaire est **désactivé par défaut**. La page de tarification Logo.dev actuelle liste explicitement « Self-host logos » dans Pro, mais pas dans Community. Jobly ne doit donc activer `LOGO_DEV_SELF_HOST_ENABLED=true` que lorsque le plan et les conditions applicables l'autorisent.

### Validation
- Migration SQL testée dans une transaction puis rollback : aucune modification persistée.
- Aucun déploiement Vercel.
- Aucun merge dans `main`.
- Branche : `logo-registry-cache-20261002`.

### Suite
Après activation du plan/autorisation de self-hosting :
`LOGO_DEV_SELF_HOST_ENABLED=true`
permettra à Jobly de télécharger une fois le logo, de le stocker dans Supabase Storage et de servir ensuite l'URL Jobly sans nouvelle requête Logo.dev pour chaque affichage.
