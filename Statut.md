# JOBLY — STATUT DU PROJET

> Ce fichier est la SEULE source de vérité sur l'avancement.
> Ne pas créer de nouveau document stratégique/checkpoint/handover en dehors de ce fichier.
> Règle d'or : un statut ne passe à l'étape suivante que s'il a été TESTÉ par un humain sur un vrai téléphone — pas juste "codé" ou "revu".
> Règle anti-dérive : tant que la section 2 n'est pas ✅, aucune nouvelle spec/écran/animation ne doit être ajoutée ailleurs qu'en section 9 (Backlog).

Dernière mise à jour : 10/09/2026 — recentrage sur la tâche active, backlog isolé, décisions consolidées

---

## 0. Légende des statuts
- ❌ NON COMMENCÉ
- 🔧 CODÉ (pas encore testé)
- 🧪 EN VALIDATION (tests en cours)
- ✅ VALIDÉ EN PRODUCTION

---

## 1. État réel du MVP (12 briques)

| # | Brique | Statut | Note |
|---|--------|--------|------|
| 1 | Foundation (repo, Docker, CI) | 🔧 | Repo existe, build Vercel Ready |
| 2 | Auth (inscription/connexion/session) | 🧪 | Codée ; écran réel testé sur téléphone → non conforme à la charte (voir 5.1). Correction visuelle bloquante avant validation fonctionnelle. |
| 3 | Career Brain (profil, skills, expériences) | ❌ | Pas commencé |
| 4 | Jobs / ingestion des offres | 🔧 | Pipeline codé (queue, scheduler, adaptateur RSS), non validé en prod |
| 5 | Matching | ❌ | Pas commencé |
| 6 | Applications (candidature, suivi) | ❌ | Pas commencé |
| 7 | AI Core (CV analyzer, coach) | ❌ | Pas commencé — ne pas commencer avant que 1-6 soient validés |
| 8 | Billing / paiements | ❌ | Spécifié seulement |
| 9 | Engagement (push, bannières, ads) | ❌ | Spécifié seulement |
| 10 | Chat / WhatsApp | ❌ | Spécifié seulement |
| 11 | QR / Jobly ID | ❌ | Spécifié seulement |
| 12 | Production (monitoring, sécurité, backups) | ❌ | Pas commencé |

**Résumé : 1 brique en validation bloquée sur un écart visuel, 1 codée non validée, 1 partielle, 9 non commencées.**

---

## 2. Prochaine tâche UNIQUE (ne rien faire d'autre tant que ce n'est pas fait)

🎯 **Corriger l'écran Auth (premier écran, nouvel utilisateur) puis valider l'authentification de bout en bout sur téléphone réel.**

Sous-tâches, dans l'ordre :
1. Corriger l'écran Auth actuel selon les écarts listés en section 5.1 (couleurs, typographie, layout, icônes, boutons).
2. Redéployer sur `joblyv01.vercel.app`.
3. Capture téléphone à l'appui : confirmer la conformité à la charte (section 5).
4. Tester : création de compte → succès.
5. Tester : connexion → succès.
6. Tester : déconnexion + reconnexion → succès.
7. Tester : OAuth (Google/WhatsApp selon décision en section 3) → succès.
8. Tester : récupération de mot de passe par OTP → succès.
9. Cocher cette tâche comme ✅ ici, puis seulement passer à la brique 4 (Discovery).

**Ne pas** : travailler sur l'écran de seconde utilisation, les animations, le Career Brain, le matching, les paiements, ou tout document stratégique tant que ceci n'est pas ✅. Tout ce qui concerne la seconde utilisation est en section 9 (Backlog) — à ne pas ouvrir avant la validation ci-dessus.

---

## 3. Décisions figées (ne jamais redemander à l'IA de les reproposer)

- **Création de compte : WhatsApp OU Google** *(révisé le 10/09/2026 — remplace la version précédente qui incluait la création par téléphone/mot de passe)*.
- **Connexion (comptes existants) : numéro de téléphone OU e-mail + mot de passe** *(révisé le 10/09/2026 — l'e-mail a été ajouté comme canal de connexion)*.
- Récupération de compte = OTP par téléphone.
- Principe produit : **1 numéro de téléphone = 1 compte Jobly**. Un appareil reconnu peut proposer un accès simplifié à la reconnexion (détail complet en section 9 — non implémenté).
- Aucune donnée sensible dans les QR — identifiant opaque uniquement.
- L'IA ne doit jamais inventer un fait professionnel (expérience, chiffre, compétence).
- Prix cible Premium : 1 000 FCFA/mois ou 3 000 FCFA/an (à revalider après chiffrage du coût IA réel — voir section 6).
- Stack : Next.js (frontend) / NestJS ou API Supabase (backend) / PostgreSQL + Prisma / Redis / stockage S3-compatible.
- Domaine historique : jobly.eu.org.

---

## 4. Sources de jobs identifiées (statut d'autorisation à vérifier avant toute ingestion)

| Source | Statut autorisation |
|---|---|
| Cameroon Desk (RSS) | À vérifier |
| Doopinet / doopin.net | À vérifier |
| Minajobs | À vérifier |
| i-ce.cm | À vérifier |
| Emploi.cm | À vérifier |
| Louma-jobs.com | À vérifier |
| jobdeals.com | À vérifier |

Règle non négociable : ne jamais activer une source en scraping non autorisé. Vérifier contrat/flux/API avant toute ingestion réelle.

---

## 5. Charte graphique (référence rapide)

- Bleu principal : `#2563EB`
- Jaune (ambition) : `#FBBF24`
- Vert (progression) : `#10B981`
- Violet (IA) : `#8B5CF6`
- Orange (dynamisme) : `#F97316`
- Navy (texte) : `#16254A`
- Blanc : `#FFFFFF`
- Typo : Jakarta Sans (ou équivalent géométrique)
- Cartes très arrondies, beaucoup d'espace blanc, gradients réservés aux moments IA/héro
- Élément signature : le "Career Score"
- Micro-footer : `Built with ♥ by MAYAKA`, discret et animé, sans prendre de place excessive

### 5.1 Audit visuel C0.5 — 10/09/2026

🧪 **EN VALIDATION — correction visuelle obligatoire avant tout test fonctionnel.**

La capture du déploiement `joblyv01.vercel.app` montre que l'écran Auth actuellement livré ne respecte pas suffisamment la charte. Écarts constatés :

- **Layout :** hero trop haut, formulaire repoussé trop bas — composition à resserrer pour tenir sur mobile sans étirement inutile.
- **Couleurs :** bleu affiché désaturé/pastel au lieu du bleu officiel `#2563EB` ; gradients à réserver aux zones héro/IA.
- **Typographie :** tailles/graisses/espacements à recalibrer autour de Jakarta Sans, hiérarchie plus nette (eyebrow, titre, description, labels, champs).
- **Zones de texte :** champs/blocs trop grands pour une interface mobile compacte ; normaliser paddings, rayons, espacements.
- **Icônes :** pas encore de système cohérent — même épaisseur de trait, mêmes tailles, mêmes zones tactiles.
- **Boutons :** CTA principal en bleu Jobly conforme ; variantes WhatsApp/Google clairement secondaires.
- **Animation :** signatures prévues non démontrées dans la capture — à réintroduire avec parcimonie, sans ralentir l'accès à la connexion.
- **Textes :** reprendre les textes depuis la source de design validée, ne pas improviser de nouvelles formulations pendant la correction.

**Règle de correction :** ne pas valider C0.5 tant que l'écran réel ne correspond pas au design de référence. Le prochain build doit être jugé sur téléphone, capture à l'appui.

**Source manquante à récupérer :** ce fichier ne contient que la charte rapide (palette, typo, rayons, gradients) — pas les mesures exactes, le set d'icônes complet, les timings d'animation, ni la maquette/illustration de référence. Ces éléments doivent être récupérés depuis le document de référence du projet avant de prétendre à une reproduction scrupuleusement identique.

---

## 6. Point ouvert critique — coût IA vs prix Premium

❗ Non fait à ce jour : chiffrer le coût réel par utilisateur (appels modèle pour matching, génération CV/lettre, coaching) et le comparer aux 1 000 FCFA/mois visés.
**À faire avant d'écrire le moindre code d'IA générative (brique 7).**

---

## 7. Ce qui est volontairement repoussé (ne pas y toucher maintenant)

- Organisation commerciale (5 équipes, BTL, Partner Network, commissionnement)
- Paiements Mobile Money
- WhatsApp, publicité, vidéos courtes (hors canal d'auth déjà décidé en section 3)
- Jobly ID / QR avancé
- **Parcours visuel complet (splash, initialisation, écran de seconde utilisation, animations) — voir section 9, backlog**
- Toute roadmap au-delà du MVP

Ces sujets ne doivent pas revenir dans une session de travail avant que la tâche active (section 2) soit ✅.

---

## 8. Consigne à copier-coller au début de CHAQUE session avec l'IA

> "Voici Statut.md, l'état actuel du projet Jobly. Ne redéfinis pas la stratégie, n'invente pas de nouveau document, ne propose pas de nouvelle organisation ni de nouvel écran. Fais uniquement la tâche indiquée en section 2. Si une idée hors-sujet apparaît, note-la en une ligne dans la section 9 (Backlog) et n'y travaille pas. À la fin, mets à jour Statut.md avec ce qui a changé et la prochaine tâche unique."

---

## 9. Backlog (non prioritaire — ne pas travailler dessus avant que la section 2 soit ✅)

### 9.1 Parcours visuel d'entrée (5 états)
Défini le 10/09/2026, sur base du pack `Photo d'illustration Journey.zip` (65 visuels) et de `JOBLY_Charte_Graphique_et_Vision_Produit.pdf` :
1. Splash/démarrage — logo, signature "Your AI Career Agent.", illustration carrière, anneau de chargement, bulles animées.
2. Initialisation — carte de chargement, progression, bulles animées.
3. Première utilisation — création de compte via WhatsApp ou Google uniquement.
4. Connexion — téléphone ou e-mail + mot de passe, mot de passe oublié, CGU/confidentialité.
5. Seconde utilisation — écran intermédiaire animé avant l'espace utilisateur.

Note : l'image de connexion montrant Apple est une inspiration de mise en page uniquement — Apple n'est pas un canal Jobly.

### 9.2 Écran de seconde utilisation — reconnaissance du compte
Principe : 1 numéro = 1 compte, appareil reconnu → l'utilisateur ne ressaisit que son mot de passe.
Séquence d'accueil non bloquante (~1s par message) : « Bonjour [Prénom] » → « Bon retour sur Jobly » → « Saisis ton mot de passe et rejoins-nous » → « Une brillante carrière t'attend. » Le champ mot de passe reste actif pendant toute la séquence ; validation anticipée = accès immédiat.

Points de sécurité UX déjà actés : ne jamais afficher le mot de passe en clair, ne jamais considérer la présence de l'appareil seule comme une authentification, prévoir une option "Changer de compte".

Statut : **spécification validée, implémentation non commencée.**

### 9.3 Maquette cible — seconde utilisation
Format mobile sans scroll, fond blanc/bleu pâle avec bulles translucides et icônes carrière/IA flottantes (inspiration Journey), carte blanche semi-élevée pour le mot de passe, contrôle afficher/masquer, timing ~1s/message, respect de `prefers-reduced-motion`. États à prévoir : chargement, mot de passe incorrect, succès, compte non reconnu.

Statut : **maquette cible définie, implémentation non commencée.**

### 9.4 Prototype rejeté
Un prototype `jobly-second-use-prototype.html` a été codé pour valider composition/animations, puis **rejeté comme référence visuelle** : sa direction artistique s'éloignait de la charte et du pack Journey (retour attendu : blanc dominant, bleu `#2563EB` comme action principale, Navy `#16254A` pour le texte, accents multicolores utilisés avec retenue, gradients réservés aux moments marque/IA/héro).

Décision : ne pas reprendre ce prototype comme base. Le principe UX (compte reconnu + mot de passe immédiat + animation non bloquante) reste valide ; c'est uniquement la direction visuelle qui est écartée.

### 9.5 Journal des décisions visuelles (archive)
- 10/09/2026 : parcours d'entrée défini en 5 états obligatoires.
- 10/09/2026 : canaux d'auth mis à jour (voir section 3, version en vigueur).
- 10/09/2026 : pack Journey retenu comme référence d'inspiration.
- 10/09/2026 : spécification de l'écran de seconde utilisation validée.
- 10/09/2026 : premier prototype de l'écran de seconde utilisation rejeté pour non-conformité à la charte.


## 5.14. Correction écran Auth + build Vercel — 10/09/2026

- Écran Auth premier usage corrigé sur la base des références visuelles fournies.
- Interface mobile **non scrollable** (`100dvh`, `overflow:hidden`).
- Visuel humain : utilisation du **même visage féminin de la référence fournie**, extrait comme asset `public/auth-hero-person.jpg`.
- Logo : asset issu de la référence fournie (`public/jobly-logo-reference.jpg`).
- WhatsApp et Google restent les canaux de création/entrée mis en avant.
- Connexion existante : téléphone **ou** e-mail + mot de passe.
- Apple retiré du parcours Jobly.
- Système d'icônes SVG cohérent ; aucun emoji utilisé comme icône fonctionnelle.
- Couleurs alignées sur la palette Jobly : bleu `#2563EB`, navy `#16254A`, vert `#10B981`, jaune `#FBBF24`, violet `#8B5CF6`.
- Footer `Built with ♥ by MAYAKA` conservé et discret.
- `lib/auth.ts` accepte maintenant téléphone OU e-mail pour `signInWithPassword`.
- Le flux WhatsApp continue d'utiliser les routes JOBLY existantes.
- Le build est préparé pour Vercel à partir du socle C0.7.0 fourni.

**Important :** la validation visuelle finale reste à faire sur le téléphone réel après déploiement Vercel. Aucun statut de brique ne doit passer à ✅ avant ce test humain.
