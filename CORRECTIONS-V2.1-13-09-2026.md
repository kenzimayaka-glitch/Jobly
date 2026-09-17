# JOBLY CORRECTIONS v2.1 — 13 septembre 2026
## Appliquées par Claude Senior Designer Mode

---

## ✅ DESIGN SYSTEM
- Police **Plus Jakarta Sans** importée via Google Fonts, appliquée sur tout le site
- Couleur jaune canari : `#FFC72C` ajoutée comme `jobly-yellow` dans Tailwind
- Couleur navy mise à jour : `#0A1931` (plus sobre)
- Background global : `#ffffff` (blanc pur) au lieu de `#F7FAFF`
- `tailwind.config.ts` : palette complète 12 couleurs + shadows cards standardisées

---

## ✅ PAGE D'ACCUEIL / LOGIN (app/page.tsx)

### Fixes appliqués :
1. **Bouton "Se connecter"** → Jaune Canari `#FFC72C`, texte navy, shadow jaune
2. **Bouton "Recevoir le code SMS"** → Aussi jaune canari
3. **Titre "Connexion"** → `text-center` ✓
4. **Sous-titre connexion** → "Veuillez renseigner vos identifiants de connexion."
5. **Boutons FR/EN** → Visibles **uniquement** sur l'écran welcome, pas sur login/otp
6. **Sous-titre welcome** → Phrase complète : "Rejoignez des milliers de talents et obtenez votre emploi idéal en quelques clics. CV, opportunités, coaching — tout est prêt pour vous."

---

## ✅ PAGEHEADER (components/PageHeader.tsx)

1. **Point rouge (badge notification)** → Supprimé entièrement
2. **Prop `avatarUrl`** ajoutée → affiche la vraie photo de profil si disponible
3. **Initial "T/J/R/P"** → remplacée par photo ronde si `avatarUrl` fourni, sinon initiale avec dégradé bleu/violet (plus de fond plat bleu)

---

## ✅ BOTTOM NAV (components/BottomNav.tsx)

1. **Items configurables** → Prop `items?: NavItem[]` pour personnaliser par type d'utilisateur
2. **RECRUITER_NAV** exporté : Accueil / Offres / Candidatures / ATS / Profil
3. **PARTNER_NAV** exporté : Dashboard / Profil / Paiement / Parrainage
4. **Nouveaux icônes** : people, ats, user, chart, card, link

---

## ✅ CAREER AI / TALENT (app/career-brain/page.tsx)

1. **"J" remplacé** → `user.avatarUrl` passé à PageHeader
2. **Boutons "Enregistrer et continuer →"** × 5 → **"Continuer →"**, taille réduite, **jaune canari**
3. **Background** → blanc pur

---

## ✅ RECRUITER (app/recruiter/page.tsx)

1. **"R" en haut** → `companyName.charAt(0)` (initial dynamique + avatarUrl ready)
2. **BottomNav** ajouté → 5 onglets : Accueil, Offres, Candidatures, ATS, Profil
3. **Doublon "Publier une nouvelle offre"** → 2e bouton supprimé
4. **Bug token ATS** → `token` mis en state, corrigé dans le handler ATS
5. **Background** → blanc pur
6. **app/recruiter/profile/page.tsx** → BottomNav ajouté
7. **app/recruiter/candidatures/page.tsx** → Page créée

---

## ✅ PARTNER (app/partner/page.tsx)

1. **"P" en haut** → `avatarUrl` passé à PageHeader
2. **Dropdown opérateur** → **Supprimé** → 2 logos cliquables côte à côte (Orange Money / MTN MoMo)
3. **Au clic Orange** → champ téléphone avec exemple `+237 6 90 00 00 00`
4. **Au clic MoMo** → champ téléphone avec exemple `+237 6 70 00 00 00`
5. **Lien parrainage** → Format corrigé : `https://jobly.app/join?ref=${code}`
6. **BottomNav** ajouté → 4 onglets : Dashboard, Profil, Paiement, Parrainage
7. **Pages créées** :
   - `app/partner/profile/page.tsx`
   - `app/partner/payment/page.tsx`
   - `app/partner/referral/page.tsx` (copie lien + explication)

---

## ✅ ANDROID BACK BUTTON
- `overscroll-behavior: none` + `-webkit-overflow-scrolling: touch` dans globals.css
- Prévient la fermeture de l'app par la touche retour Android (comportement PWA)

---

## 🔧 FICHIERS MODIFIÉS

| Fichier | Type |
|---------|------|
| `tailwind.config.ts` | Config |
| `app/globals.css` | CSS |
| `components/PageHeader.tsx` | Composant |
| `components/BottomNav.tsx` | Composant |
| `app/page.tsx` | Page Login |
| `app/career-brain/page.tsx` | Page Talent |
| `app/recruiter/page.tsx` | Page Recruiter |
| `app/recruiter/profile/page.tsx` | Page Recruiter |
| `app/recruiter/candidatures/page.tsx` | **NOUVELLE** |
| `app/partner/page.tsx` | Page Partner |
| `app/partner/profile/page.tsx` | **NOUVELLE** |
| `app/partner/payment/page.tsx` | **NOUVELLE** |
| `app/partner/referral/page.tsx` | **NOUVELLE** |

---

**Version :** 2.1  
**Date :** 13 septembre 2026  
**Statut :** ✅ TOUTES LES CORRECTIONS APPLIQUÉES  
