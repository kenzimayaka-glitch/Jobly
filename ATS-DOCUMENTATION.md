# Jobly Recruiter ATS — Documentation Système
## Version 1.1.0 — 12 septembre 2026

---

## 📋 Vue d'ensemble du ATS

Le système ATS (Applicant Tracking System) de Jobly permet aux recruteurs de gérer efficacement leur pipeline de candidatures avec un interface drag-drop intuitive.

### Statuts de Candidature

```
DISCOVERED  → SUBMITTED → ACKNOWLEDGED → INTERVIEW → OFFER
                                      ↓
                                   REJECTED
```

| Statut | Label | Couleur | Émoji | Description |
|--------|-------|---------|-------|-------------|
| DISCOVERED | À faire | Slate | ☐ | Candidature détectée, pas encore traitée |
| SUBMITTED | En cours | Bleu | ⟳ | Candidature soumise par le candidat |
| ACKNOWLEDGED | Vu | Violet | 👁️ | Candidature lue par le recruteur |
| INTERVIEW | Interview | Ambré | 👥 | Entretien programmé |
| OFFER | Recruté | Émeraude | ✓ | Offre acceptée, candidat recruté |
| REJECTED | Refusé | Rouge | ✕ | Candidature rejetée |

---

## 🎯 Fonctionnalités Principales

### 1. Vue Kanban Drag-Drop
**Fichier:** `components/RecruiterATS.tsx`

**Caractéristiques:**
- ✅ 4 colonnes principales (À faire, En cours, Interview, Recruté)
- ✅ Glissé-déposé entre colonnes
- ✅ Sauvegarde automatique en base de données
- ✅ Affichage des statistiques par colonne
- ✅ Feedback visuel pendant le déplacement

**Utilisation:**
```jsx
<RecruiterATS
  applications={applications}
  onStatusChange={async (appId, newStatus) => {
    // Appel API pour mettre à jour le statut
    await updateApplicationStatus(appId, newStatus);
  }}
  isLoading={loading}
/>
```

### 2. Page ATS Dédiée
**Route:** `/recruiter/ats`
**Fichier:** `app/recruiter/ats/page.tsx`

**Fonctionnalités:**
- Vue complète du pipeline
- Filtrage par offre d'emploi
- Statistiques globales
- Actualisation des données
- Breadcrumb de navigation

### 3. Intégration Dashboard Recruiter
**Route:** `/recruiter` (dashboard principal)
**Fichier:** `app/recruiter/page.tsx`

**Sections:**
- Aperçu du ATS en bas de page
- Statistiques rapides
- Accès facile aux candidatures

---

## 🎨 Conception des Cartes

### Anatomie d'une Carte Candidat
```
┌─────────────────────────────────────┐
│ [Avatar] Nom Candidat               │
│           Rôle / Poste              │
│                                     │
│ Titre de l'offre...                 │
│ 📅 Date d'entretien (si présente)   │
│ 📎 Preuve jointe (si présente)      │
│                                     │
│ Date de réception                   │
└─────────────────────────────────────┘
```

### Interactions
- **Hover:** Shadow augmentée
- **Drag:** Opacité réduite à 50%
- **Drop:** Mise à jour avec feedback visuel
- **Updating:** Opacité réduite + spinner

---

## 📊 Statistiques

### Affichage des Chiffres
```
┌───────────────────────────────────────────────┐
│ Total  │ À faire │ En cours │ Interview │ Recruté │ Refusé │
│  15    │   8     │    5     │     2     │    1    │   0    │
└───────────────────────────────────────────────┘
```

Les statistiques se mettent à jour en temps réel lors du déplacement de candidats.

---

## 🔄 Flux de Données

### Créer une Candidature
1. Candidat découvre une offre
2. Candidat applique via `/jobs/[id]`
3. Candidature créée avec statut `DISCOVERED`
4. Appear dans la colonne "À faire" du recruiter

### Mettre à Jour le Statut
1. Recruteur glisse-dépose la carte
2. Appel API PATCH `/api/recruiter/applications/[id]`
3. Backend met à jour le statut dans PostgreSQL
4. Frontend rafraîchit l'état local
5. Carte se déplace vers la nouvelle colonne

### Ajouter un Entretien
1. Recruteur sur page de détail offre
2. Clique "Fixer une date d'entretien"
3. API met à jour `interviewAt`
4. Card affiche 📅 dans le ATS

### Déclarer un Résultat
1. Recruteur sur page de détail offre
2. Clique "Acceptée" ou "Refusée"
3. Candidature passe à statut `OFFER` ou `REJECTED`
4. Disparaît des colonnes principales (optionnel)

---

## 🛠️ Implémentation Technique

### Types TypeScript
```typescript
type ApplicationStatus = 
  | "DISCOVERED" 
  | "SUBMITTED" 
  | "ACKNOWLEDGED" 
  | "INTERVIEW" 
  | "OFFER" 
  | "REJECTED";

type Application = {
  id: string;
  recruiterJobId: string | null;
  jobTitle: string | null;
  candidateName?: string;
  candidateRole?: string;
  status: ApplicationStatus;
  statusSource: "CANDIDATE" | "RECRUITER";
  proofUrl: string | null;
  viewedAt: string | null;
  interviewAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### API Endpoints Utilisés

#### GET /api/recruiter/applications
Récupère toutes les candidatures du recruteur
```javascript
const res = await fetch("/api/recruiter/applications", {
  headers: { Authorization: `Bearer ${token}` }
});
const { applications } = await res.json();
```

#### PATCH /api/recruiter/applications/[id]
Met à jour une candidature
```javascript
const res = await fetch(`/api/recruiter/applications/${appId}`, {
  method: "PATCH",
  headers: { 
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}` 
  },
  body: JSON.stringify({ 
    status: "INTERVIEW",
    interviewAt: "2026-09-20T10:00:00Z" 
  })
});
```

### Drag-Drop HTML5 Natif
Le composant utilise l'API HTML5 drag-drop native (pas de bibliothèque externe):

```javascript
// Drag Start
onDragStart={(e) => {
  e.dataTransfer.effectAllowed = "move";
  setDraggedApp(appId);
}}

// Drag Over
onDragOver={(e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}}

// Drop
onDrop={async (e, targetStatus) => {
  e.preventDefault();
  await updateStatus(draggedApp, targetStatus);
}}
```

---

## 🎯 Cas d'Usage

### Cas 1: Trier les Candidats par Priorité
1. Ouvrir `/recruiter/ats`
2. Glisser les candidats "chauds" vers "Interview"
3. Programmer les entretiens

### Cas 2: Suivi des Entretiens
1. Placer les candidats en "Interview"
2. Remplir la date d'entretien
3. Tracker jusqu'à décision finale

### Cas 3: Rapport de Recrutement
1. Filtrer par offre
2. Lire les stats totales (8 candidats, 2 entretiens, 1 recruté)
3. Exporter ou prendre notes

---

## 🚀 Prochaines Améliorations

### Phase 2 (Prochaine Sprint)
- [ ] Recherche/filtrage par nom de candidat
- [ ] Tri par date d'ajout ou pertinence
- [ ] Bulk actions (déplacer plusieurs candidats)
- [ ] Notes privées sur chaque candidature
- [ ] Affichage des scores Career Brain Match

### Phase 3 (Roadmap)
- [ ] Calendrier d'entretiens intégré
- [ ] Notifications pour entretiens à venir
- [ ] Modèles d'email de refus/acceptation
- [ ] Export du pipeline (PDF/CSV)
- [ ] Partage du pipeline avec co-recruteurs
- [ ] Historique des changements de statut
- [ ] Intégration Slack/Email notifications

### Phase 4 (Stabilité)
- [ ] Offline support (sync après reconnexion)
- [ ] Archivage des candidatures fermées
- [ ] Benchmarking : délai moyen par statut
- [ ] A/B testing sur page de candidature

---

## 📱 Responsive Design

### Mobile (≤640px)
- Kanban horizontal scrollable
- Colonnes compactées
- Stats en ligne simple
- Cartes condensées

### Tablet (641px-1024px)
- 2 colonnes visibles
- Scroll horizontal pour autres
- Stats en 2 lignes

### Desktop (≥1025px)
- 4 colonnes entièrement visibles
- Stats en une ligne
- Vue complète sans scroll

---

## 🔐 Sécurité & Permissions

### Restrictions
- Un recruteur ne voit que ses propres candidatures
- Les candidatures d'autres recruteurs sont filtrées
- RLS (Row Level Security) sur PostgreSQL appliquée
- Token d'authentification requis sur tous les appels API

### Rate Limiting
- 100 mises à jour par minute max
- Évite les abus de drag-drop rapide

---

## 🐛 Débogage

### Logs Disponibles
- `console.log(applications)` → liste des candidatures
- DevTools → Network tab pour voir les appels API
- React DevTools → état du composant

### Erreurs Courantes
1. **"Non authentifié"** → Token expiré, redirection /auth
2. **"Erreur de mise à jour"** → Vérifier les droits API
3. **"Candidatures indisponibles"** → API réseau indisponible

---

## 📞 Support

Questions sur le ATS ? Consulter:
1. Ce fichier (documentation technique)
2. `RECRUITER-UPDATES-12-09-2026.md` (détails UI)
3. `Statut.md` (avancement du projet)
4. Code source : `components/RecruiterATS.tsx`

---

**Built with ♥ by MAYAKA**  
**Last updated:** 12 septembre 2026 — 16:00 UTC
