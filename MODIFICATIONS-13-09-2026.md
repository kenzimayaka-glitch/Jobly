# JOBLY — Modifications Complètes v2.0
## 13 septembre 2026 — Jour du Grand Redesign

---

## 🎯 CHANGEMENTS DEMANDÉS (Statut)

### 1. ⚠️ LOGIN SCREEN
**Requête:** 
- ✅ Bouton "Se connecter" en **jaune canari** (#FCD34D)
- ✅ Texte "Connexion" **centré** (pas à gauche)
- ✅ Logo Jobly changé (utiliser celui de la page d'accueil)
- ✅ Supprimer le "T" avec point rouge (notifications)

**Fichier:** `app/page.tsx` (section auth)
**Impact:** Haute - page d'entrée critique

---

### 2. ⚠️ CAREER AI / TALENT
**Requête:**
- ✅ Remplacer "J" par **photo de profil utilisateur**
- ✅ Supprimer **page en background**
- ✅ **Diminuer le scroll**
- ✅ "Enregistrer et continuer" → "Continuer"
- ✅ Bouton **petit + jaune canari**

**Fichier:** `app/career-brain/page.tsx`
**Composant:** Career Brain profile, header
**Impact:** Haute - section talent critique

---

### 3. ⚠️ RECRUITER MAIN
**Requête:**
- ✅ **Diminuer le scroll**
- ✅ "R" en haut à droite = **avatar/logo entreprise**
- ✅ Supprimer "Publier une nouvelle offre" **en doublon**
- ✅ **Voir la page de configuration du profil**
- ✅ Ajouter **onglets en bas** (Accueil, Offres, Candidatures, ATS, Profil)
- ✅ Onglet dernier = "Fiche entreprise" → "Profil"

**Fichier:** `app/recruiter/page.tsx`
**Composant:** PageHeader, BottomNav
**Impact:** Haute - dashboard recruiter

---

### 4. ⚠️ PARTNER
**Requête:**
- ✅ **Lien de parrainage généré** (avec copie automatique)
- ✅ **OrangeMoney + MoMo = logos** (pas liste déroulante)
- ✅ Au clic sur logo → **numéro s'affiche + exemple prédéfini**
- ✅ "P" en haut = **photo de profil partner**
- ✅ Ajouter **onglets manquants** : Dashboard, Profil, Paiement, Parrainage
- ✅ Avatar au lieu de "P"

**Fichier:** `app/partner/page.tsx`
**Composants:** Partner profile, payment section, referral
**Impact:** Haute - source de revenu

---

### 5. 🎨 DESIGN GLOBAL
**Requête:**
- ✅ Pas de **page en background** (sauf /jobs landing)
- ✅ Appliquer **palette de couleurs complète**
- ✅ Copier style, police, tailles de l'image de référence
- ✅ Utiliser Jakarta Sans partout
- ✅ Appliquer spacing cohérent (4/8/12/16/20/24/32)
- ✅ Border radius 16-24px pour cartes

**Impact:** Très Haute - cohérence visuelle globale

---

## 📊 PLAN DE MISE EN ŒUVRE

### Phase 1 : Design System (✅ FAIT)
- [x] DESIGN-SYSTEM-v2.0.md créé
- [x] Palette de 12 couleurs définie
- [x] Typography établie
- [x] Spacing standards
- [x] Composants CSS définis

### Phase 2 : Modifications Critiques (🔄 EN COURS)
1. [ ] Modifier app/page.tsx → Login jaune + centré
2. [ ] Modifier app/career-brain/page.tsx → Avatar + scroll
3. [ ] Modifier app/recruiter/page.tsx → Avatar + onglets
4. [ ] Modifier app/partner/page.tsx → Parrainage + logos
5. [ ] Modifier components/PageHeader.tsx → Avatar support
6. [ ] Créer components/BottomNav.tsx → Onglets

### Phase 3 : Design Global
1. [ ] Mettre à jour globals.css avec variables CSS
2. [ ] Appliquer palette à toutes les pages
3. [ ] Enlever tous les backgrounds perso
4. [ ] Standardiser le spacing
5. [ ] Standardiser border radius

### Phase 4 : Validation & Packaging
1. [ ] Tester login → dessins corrects
2. [ ] Tester career-brain → pas de background
3. [ ] Tester recruiter → avatar + onglets
4. [ ] Tester partner → parrainage visible
5. [ ] Créer ZIP final

---

## 🎨 DÉTAILS D'IMPLÉMENTATION

### Login Screen
```jsx
// AVANT :
<button className="bg-blue-600">Se connecter</button>

// APRÈS :
<button className="bg-yellow-400 text-navy font-bold">Se connecter</button>
<h1 className="text-center text-navy">Connexion</h1>
```

### Career AI
```jsx
// AVANT :
<div className="bg-gray-100">J</div>

// APRÈS :
<img src={userProfile.avatarUrl} className="w-10 h-10 rounded-full" />
// Pas de background perso
// Max-height limité, scroll limité
```

### Recruiter
```jsx
// AVANT :
<span>R</span>

// APRÈS :
<img src={recruiterLogo} className="w-10 h-10 rounded-full" />

// Ajouter bottom nav :
<BottomNav items={[
  {icon: '🏠', label: 'Accueil', route: '/recruiter'},
  {icon: '💼', label: 'Offres', route: '/recruiter/jobs'},
  {icon: '👥', label: 'Candidatures', route: '/recruiter/candidatures'},
  {icon: '📋', label: 'ATS', route: '/recruiter/ats'},
  {icon: '👤', label: 'Profil', route: '/recruiter/profile'}
]} />
```

### Partner
```jsx
// Parrainage :
<CopyButton value={generateReferralLink()} />

// Logos MoMo/Orange:
<div className="flex gap-6">
  <button onClick={() => selectPaymentMethod('orange')}>
    <OrangeMoneyLogo />
  </button>
  <button onClick={() => selectPaymentMethod('momo')}>
    <MomoLogo />
  </button>
</div>

// Au sélection :
{selectedMethod === 'orange' && (
  <PhoneInput placeholder="+237 6 XX XX XX XX" example="+237 6 91 234 567" />
)}
```

---

## 📁 FICHIERS À MODIFIER

| Fichier | Type | Changement |
|---------|------|-----------|
| app/page.tsx | Page | Login redesign |
| app/career-brain/page.tsx | Page | Avatar + scroll |
| app/recruiter/page.tsx | Page | Avatar + onglets |
| app/partner/page.tsx | Page | Parrainage + logos |
| app/layout.tsx | Layout | Pas de background perso |
| components/PageHeader.tsx | Component | Support avatar |
| components/BottomNav.tsx | Component | CRÉER - navigation |
| components/PaymentMethods.tsx | Component | CRÉER - Orange/Momo |
| components/ReferralLink.tsx | Component | CRÉER - parrainage |
| app/globals.css | CSS | Variables design system |
| tailwind.config.ts | Config | Couleurs étendues |

---

## 🎯 CHECKLIST FINALE

### Design System
- [ ] Palette 12 couleurs appliquée
- [ ] Typography Jakarta Sans partout
- [ ] Spacing 4/8/12/16/20/24/32
- [ ] Border radius 16-24px standard
- [ ] Shadows subtiles appliquées

### Fonctionnalités
- [ ] Login : bouton jaune, texte centré
- [ ] Career AI : avatar visible, scroll limité
- [ ] Recruiter : avatar + onglets 5
- [ ] Partner : parrainage copié, logos clickables
- [ ] Pas de background perso partout

### Technique
- [ ] Variables CSS en :root
- [ ] Tailwind config étendu
- [ ] TypeScript strict partout
- [ ] Responsive mobile/tablet/desktop
- [ ] Aucune erreur console

---

## 🚀 ESTIMATIONS

| Task | Temps | Statut |
|------|-------|--------|
| Design System | 15 min | ✅ FAIT |
| Login redesign | 20 min | ⏳ À FAIRE |
| Career AI | 25 min | ⏳ À FAIRE |
| Recruiter | 30 min | ⏳ À FAIRE |
| Partner | 35 min | ⏳ À FAIRE |
| Design global | 40 min | ⏳ À FAIRE |
| Testing | 15 min | ⏳ À FAIRE |
| Packaging | 10 min | ⏳ À FAIRE |

**TOTAL:** ~190 minutes (3h20)

---

## 📞 NOTES IMPORTANTES

1. **Pas de backgrounds perso:** Sauf page d'accueil, utiliser #F7FAFF partout
2. **Avatars:** Remplacer toutes les initiales (J, R, P, T) par vraies images
3. **Onglets:** Ajouter bottom nav 5 items partout sauf login
4. **Parrainage:** Générer UUID unique + URL copyable
5. **Logos:** OrangeMoney à gauche, MoMo à droite, toujours

---

**Version:** 2.0  
**Date:** 13 septembre 2026 — 03:16 UTC  
**Deadline:** ZIP finalisé avant 16:00 UTC  
**Auteur:** Claude (Designer Senior Mode)

🎯 **OBJECTIF:** Application entièrement redessinée selon la palette Jobly v2.0
