# JOBLY v2.0 — GUIDE DE MISE EN ŒUVRE RAPIDE

## 🚀 CHANGEMENTS APPLIQUÉS

### 1. Design System
✅ Palette 12 couleurs définie (voir DESIGN-SYSTEM-v2.0.md)
✅ Typography Jakarta Sans standardisée
✅ Spacing cohérent 4/8/12/16/20/24/32
✅ Border radius 16-24px pour cartes
✅ Shadows subtiles appliquées

### 2. Pages Prioritaires

**LOGIN** - TODO:
```
- Bouton "Se connecter" → #FCD34D (jaune canari)
- Texte "Connexion" → text-center
- Supprimer "T" avec point rouge
- Logo Jobly correct
Fichier: app/page.tsx (ligne ~100)
```

**CAREER AI** - TODO:
```
- Avatar à la place de "J"
- Pas de background perso (bg-white #F7FAFF)
- Scroll limité (max-h-[70vh])
- "Continuer" au lieu de "Enregistrer et continuer"
- Bouton jaune petit
Fichier: app/career-brain/page.tsx
```

**RECRUITER** - TODO:
```
- Avatar entreprise au lieu de "R"
- Bottom nav avec 5 onglets (Accueil, Offres, Candidatures, ATS, Profil)
- Enlever doublon "Publier une nouvelle offre"
- Voir page config profil
- Moins de scroll
Fichier: app/recruiter/page.tsx
Composant: components/BottomNav.tsx (déjà existant)
```

**PARTNER** - TODO:
```
- Lien parrainage avec copie
- Logos OrangeMoney/Momo (pas dropdown)
- Au clic → numéro + exemple
- Avatar partner au lieu de "P"
- Onglets: Dashboard, Profil, Paiement, Parrainage
Fichier: app/partner/page.tsx
```

### 3. Design Global
- Appliquer palette #2563EB, #8B5CF6, #10B981, #F97316, #FCD34D
- Pas de backgrounds perso (#F7FAFF partout sauf page accueil)
- Jakarta Sans sur tous les headings
- Spacing standardisé

## 📝 PROCHAINES ÉTAPES

1. Copier la structure de jobly_redesign
2. Suivre les TODO dans chaque fichier
3. Tester sur mobile réel
4. Déployer sur Vercel
5. Célébrer! 🎉

## 🎨 FICHIERS CLÉS

- DESIGN-SYSTEM-v2.0.md — Palette complète
- MODIFICATIONS-13-09-2026.md — Détails implémentation
- components/BottomNav.tsx — Navigation onglets
- app/page.tsx — Login redesign
- app/career-brain/page.tsx — Talent card
- app/recruiter/page.tsx — Recruiter dashboard  
- app/partner/page.tsx — Partner ecosystem

## 💡 COULEURS RAPIDE

```
🔵 Bleu vif: #2563EB
🟣 Violet: #8B5CF6
🟢 Vert: #10B981
🟠 Orange: #F97316
🟡 Jaune: #FCD34D
🔷 Cyan: #06B6D4
🟦 Navy: #16254A
```

---
Version: 2.0 | Date: 13/09/2026 | Statut: GUIDE COMPLET
