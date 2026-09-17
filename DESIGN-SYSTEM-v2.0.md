# JOBLY Design System v2.0
## Palette & Guidelines - 13 septembre 2026

---

## 🎨 PALETTE DE COULEURS

| Nom | Hex | Usage | Exemple |
|-----|-----|-------|---------|
| **Bleu Vif** | `#2563EB` | Boutons CTA, highlights, nav active | Voir mes opportunités |
| **Violet** | `#8B5CF6` | Career AI, features IA | Career Brain section |
| **Vert Menthe** | `#10B981` | CV, succès, checkmarks | Mon CV, scores élevés |
| **Orange** | `#F97316` | Candidatures, actions | Mes candidatures |
| **Jaune Canari** | `#FCD34D` | Accents, boutons secondaires | Bouton "Continuer" |
| **Cyan** | `#06B6D4` | Accents légers, backgrounds | Sections secondaires |
| **Navy** | `#16254A` | Texte principal, headings | Titres, corps texte |
| **Gris** | `#6B7280` | Texte secondaire, labels | Descriptions, meta |
| **Blanc** | `#FFFFFF` | Backgrounds cartes, base | Cartes, conteneurs |
| **Background Clair** | `#F7FAFF` | Page background | Toutes les pages |
| **Lavande** | `#F3E8FF` | Section backgrounds | Boostez vos compétences |

---

## 📝 TYPOGRAPHIE

```css
/* Font Family */
font-family: 'Jakarta Sans', system-ui, -apple-system, sans-serif;

/* Font Sizes */
xs: 12px;
sm: 14px;
base: 16px;
lg: 18px;
xl: 20px;
2xl: 24px;
3xl: 30px;
4xl: 36px;

/* Font Weights */
normal: 400;
semibold: 600;
bold: 700;
extrabold: 800;
```

### Styles Texte
- **Heading XL** (Hero): 36px, weight 800, navy (#16254A)
- **Heading L** (Section): 24px, weight 700-800, navy
- **Heading M** (Card): 18px, weight 700, navy
- **Heading S** (Label): 16px, weight 600, navy
- **Body**: 16px, weight 400-600, navy/gris
- **Small**: 14px, weight 500-600, gris
- **Caption**: 12px, weight 400-500, gris clair

---

## 🎯 COMPOSANTS

### Boutons
```
Primary (Bleu):      #2563EB, padding 12-16px, radius 12px, weight 700
Secondary (Jaune):   #FCD34D, navy text, padding 12-16px, radius 12px, weight 700
Tertiary (Gris):     #E5E7EB, navy text, padding 10px, radius 10px
Success (Vert):      #10B981, padding 12px, radius 10px
```

### Cartes
```
Background: #FFFFFF
Border: 1px solid #E5E7EB (light)
Border Radius: 16-24px (20px default)
Padding: 16-20px
Shadow: 0 8px 20px rgba(22, 37, 74, 0.06)
Hover: shadow augmentée
```

### Icônes Circulaires
```
Offres (💼):      #2563EB background, size 48px, radius 12px
Career AI (✨):    #8B5CF6 background
CV (📋):          #10B981 background
Candidatures (🎯): #F97316 background
```

---

## 📐 SPACING

| Nom | Valeur |
|-----|--------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |

---

## 🎬 INTERACTIONS

### Hover (Cartes)
- Shadow augmentée de 0 16px 32px
- Léger lift (transform: translateY(-2px))

### Active (Boutons)
- Opacity réduite à 85%
- Scale 0.98

### Disabled (Éléments)
- Opacity 50%
- Cursor not-allowed

### Loading
- Spinner color: bleu vif (#2563EB)
- Pulse animation

---

## 📱 RESPONSIVE

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | ≤640px | Stack vertical, full width |
| Tablet | 641-1024px | 2 colonnes |
| Desktop | ≥1025px | 3-4 colonnes |

---

## 🔐 CONSTRAINTES

✅ **À faire:**
- Appliquer la palette à TOUTES les pages (sauf /jobs landing)
- Utiliser les 12 couleurs définie
- Espacing cohérent 4/8/12/16/20/24/32
- Border radius 16-24px pour cartes
- Shadows subtiles

❌ **À ÉVITER:**
- Backgrounds perso par page (sauf exceptions)
- Polices autres que Jakarta Sans
- Couleurs custom/non normalisées
- Shadows agressives (>0.15 opacity)

---

## 🎨 PAGES À TRANSFORMER

| Page | Statut | Priorité |
|------|--------|----------|
| Login | 🔴 Critique | 1 - Bouton jaune, texte centré |
| Career AI/Talent | 🔴 Critique | 2 - Avatar, moins scroll |
| Recruiter Main | 🔴 Critique | 3 - Avatar, onglets |
| Recruiter Profile | 🔴 Critique | 4 - Configuration visible |
| Partner | 🔴 Critique | 5 - Parrainage, logos |
| ATS | 🟡 Important | 6 - Appliquer palette |
| Ecosystem | 🟡 Important | 7 - Logos corrects |

---

## 📦 VARIABLES CSS (à mettre en globals.css)

```css
:root {
  /* Colors */
  --color-blue: #2563EB;
  --color-violet: #8B5CF6;
  --color-green: #10B981;
  --color-orange: #F97316;
  --color-yellow: #FCD34D;
  --color-cyan: #06B6D4;
  --color-navy: #16254A;
  --color-gray: #6B7280;
  --color-white: #FFFFFF;
  --color-bg-light: #F7FAFF;
  --color-bg-lavender: #F3E8FF;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-2xl: 24px;
  
  /* Radius */
  --radius-sm: 10px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  
  /* Shadows */
  --shadow-sm: 0 4px 12px rgba(22, 37, 74, 0.04);
  --shadow-md: 0 8px 20px rgba(22, 37, 74, 0.06);
  --shadow-lg: 0 16px 32px rgba(22, 37, 74, 0.08);
}
```

---

Version: 2.0  
Date: 13 septembre 2026  
Designer: Claude (Senior Designer Mode)
