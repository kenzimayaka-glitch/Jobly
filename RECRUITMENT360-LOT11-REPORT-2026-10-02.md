# JOBLY — RAPPORT LOT 11 — LISTINGS OFFICIELS
## 02/10/2026

## 1. Exécution

Le Lot 11 a été implémenté sur la branche `recruitment360-lot10-11-9-20261002`, sans merge vers `main` et sans déploiement Vercel.

### Formats
- PDF A4 serveur.
- XLSX serveur : récapitulatif + une feuille par poste, protection de feuille.
- WEB : page publique non indexée, mobile, bouton PDF, iframe.
- JPEG 1:2 : 640×1280, 2160×4320, 4320×8640.
- Trois thèmes : OFFICIAL_CONCOURS, MODERNE, SOBRE.
- QR serveur.
- Cascade : 1 colonne → 2 colonnes → réduction de police → découpage numéroté.
- Repli FREE_TEST 8K → 2160×4320.

## 2. Sécurité / intégrité

- Consentement candidat stocké sur Application.
- API de consentement limitée au propriétaire de la candidature.
- Exports dans un bucket Supabase privé.
- Liens publics avec hash MD5, expiration, révocation et étape/thème.
- Bloc Jobly réinjecté côté serveur.
- Checksum SHA-256 du bloc.
- Toute modification d'un bloc existant avec URL/QR/checksum différent provoque `JOBLY_BLOCK_INTEGRITY_FAILED`.
- Les exports ne sont pas insérables directement par anon/authenticated.
- Les suppressions du bloc immuable ne sont pas accordées à anon/authenticated.
- Audit `OFFICIAL_LISTING_EXPORT` enregistré.

## 3. Preuves DB exécutées

Sur `JOBLY-PROD` :
- RLS = true sur RecruitmentListingPublicLink et RecruitmentListingExport.
- `anon_delete_block = false`.
- `auth_delete_block = false`.
- `anon_insert_export = false`.
- `auth_insert_export = false`.
- `auth_create_v2 = true`.
- `anon_create_v2 = false`.
- `anon_get_public = true`.
- `auth_get_public = true`.
- Les colonnes stage/theme du lien public existent.
- Les migrations appliquées incluent :
  - 20261001231752 recruitment360_lot11_official_listing_exports_v3
  - 20261001231915 recruitment360_lot11_public_link_stage_v2

Aucun lien public de test n'a été créé sur une annonce réelle pendant cette passe.

## 4. Fichiers principaux

- `lib/recruitment360/officialListing.ts`
- `lib/recruitment360/publicListing.ts`
- `app/api/recruitment360/listings/route.ts`
- `app/api/public/recruitment-listing/[token]/pdf/route.ts`
- `app/public/recruitment-listing/[token]/page.tsx`
- `app/api/applications/official-listing-consent/route.ts`
- `app/recruiter/listings/page.tsx`
- `scripts/official-listing-jpeg-smoke.ts`
- `A_CONFIGURER.md`
- `PASSAGE_EN_PRODUCTION.md`
- migrations Lot 11 versionnées

## 5. Validation automatisée préparée

Le workflow `.github/workflows/recruitment360-lot11.yml` exécute :
1. npm install
2. typecheck
3. build
4. smoke JPEG avec 5/40/120/400 noms
5. dimensions exactes aux trois tailles
6. lecture QR 640×1280
7. invariance des blocs fixes entre pages
8. repli FREE_TEST 8K

Le workflow est volontairement sans étape de déploiement.

## 6. Limites honnêtes

Le runner CI n'a pas été exécuté depuis cette session : aucun outil connecté disponible ici ne permet de déclencher manuellement ce workflow sur cette branche. Par conséquent, le build/typecheck et les scénarios JPEG ne sont pas déclarés « passés ».

Le parcours campagne multi-postes dépend encore de la modélisation Lot 10 existante. Le moteur Lot 11 est multi-postes au niveau du modèle d'export, mais le schéma actuel JOBLY-PROD ne contient pas encore de table Campaign/Post dédiée.

La validation sur appareil mobile réel reste requise.

## 7. Checklist CEO

### Recruiter
- [ ] Ouvrir Recruiter → Offres → « Générer un listing officiel ».
- [ ] Choisir CV / TEST / INTERVIEW / DECISION.
- [ ] Générer PDF.
- [ ] Générer XLSX.
- [ ] Générer WEB.
- [ ] Générer JPEG 640, 2160 puis 8K.
- [ ] Vérifier le repli 8K en FREE_TEST.
- [ ] Ouvrir la page publique.
- [ ] Tester l'iframe.
- [ ] Tester le bouton PDF.

### Talent
- [ ] Donner puis retirer le consentement officiel sur une candidature.
- [ ] Vérifier qu'un candidat sans consentement apparaît par numéro de dossier.
- [ ] Vérifier qu'un candidat non retenu ne peut pas être ajouté via l'API.

### Intégrité
- [ ] Tenter de supprimer/modifier le bloc Jobly par API.
- [ ] Vérifier le rejet.
- [ ] Générer un erratum et vérifier l'historique.
- [ ] Révoquer un lien puis vérifier qu'il ne s'ouvre plus.
- [ ] Vérifier l'expiration.

## Verdict du lot

**🔧 CODÉ + INTÉGRÉ + DB contrôlée — 🟡 NON CERTIFIÉ 10/10 tant que CI/E2E/validation mobile ne sont pas passés.**


## 8. Audit ciblé J’IA × Lots 10–11 — 02/10/2026

### Compatibilité J’IA
- J’IA peut désormais expliquer le fonctionnement d’un listing officiel et les étapes CV / TEST / INTERVIEW / DECISION.
- J’IA est explicitement empêchée, au niveau doctrine/prompt, d’ajouter, retirer ou publier un candidat dans un listing.
- Le consentement de publication est traité comme une condition d’affichage du nom : sans consentement, le numéro de dossier reste la représentation publiée.
- Les recommandations de recrutement groupé doivent rester rattachées au poste concerné ; J’IA ne doit pas mélanger les candidats ou scores entre postes.
- Les corrections proposées par J’IA restent des propositions : l’action réelle reste sous contrôle du recruteur et du serveur.

### Incompatibilités trouvées et corrigées
1. Éligibilité TEST / INTERVIEW / DECISION : l’ancien garde pouvait considérer l’existence d’un test, d’un entretien ou d’une décision comme suffisante pour publier un candidat. Correction : ces étapes exigent désormais aussi un signal explicite de rétention/shortlist côté serveur.
2. RPC de création de lien public : le RPC SECURITY DEFINER était exécutable par authenticated et recevait un p_actor_user_id fourni par l’appelant. Un utilisateur authentifié pouvait donc tenter de se faire passer pour un acteur autorisé. Correction appliquée sur JOBLY-PROD : EXECUTE retiré à PUBLIC/anon/authenticated et accordé uniquement à service_role. La migration correspondante est versionnée dans le dépôt.

### Vérification DB après correction
- recruitment360_lot11_create_public_link_v2 : public=false, anon=false, authenticated=false, service_role=true.
- recruitment360_lot11_get_public_listing reste accessible publiquement pour la consultation d’un token valide, avec expiration/révocation côté fonction.
- Aucun déploiement Vercel ni merge main.

**Verdict audit J’IA × Lots 10–11 : 🟢 garde-fous principaux alignés après correction ciblée ; 🟡 certification E2E globale encore requise.**
