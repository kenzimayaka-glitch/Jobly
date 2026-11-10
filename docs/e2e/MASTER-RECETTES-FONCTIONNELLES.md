# JOBLY — Catalogue maître des recettes E2E fonctionnelles

**Version :** 1.0 — 10 novembre 2026  
**Dépôt :** kenzimayaka-glitch/Jobly  
**Branche de recette :** e2e/recette  
**Commit de base audité :** d66091a5f372fdebe75356bcc5cfc1baf40007ba  
**Environnement runtime autorisé :** JOBLY-E2E — ofqqrryamslxoqkklraw  
**Production :** JOBLY-PROD hors périmètre ; aucune écriture, migration, Auth Admin, Storage, Edge Function, cron ou déploiement.

---


## Décision fonctionnelle — matching top 5 et accès premium aux profils

**Règle globale pour tous les recruteurs et toutes les offres Jobly :** seuls les talents dont le score de matching est **>= 90 %** sont éligibles. Jobly retient au maximum les cinq meilleurs par offre, triés par score décroissant avec départage déterministe.

- **Compte gratuit :** affiche les cinq cartes de matching sous forme d'aperçus **visuellement floutés et anonymisés**. Seuls les scores de matching (et éventuellement le rang 1 à 5) restent nets et lisibles. Aucun nom, photo réelle, identifiant, CV, coordonnée ou détail personnel identifiable ne doit être transmis au navigateur ; les aperçus floutés sont des placeholders/silhouettes non identifiants.
- **Aucun accès visible ou fonctionnel au profil en gratuit :** aucune carte floutée n'est cliquable ; aucun lien, bouton, hover-preview, action clavier, route de détail ou téléchargement ne permet d'ouvrir le profil. Un CTA d'abonnement séparé peut expliquer le déblocage, sans révéler ni rendre les profils consultables.
- **Compte avec abonnement :** l'accès aux profils des cinq talents exige un abonnement Jobly actif et l'entitlement explicite correspondant. Expiration, annulation, suspension, impayé ou absence de droit verrouille les profils.
- Protection serveur/API sur toutes les surfaces Jobly (découverte, matching d'une offre, conversion WhatsApp, espace recruteur, recherche, pagination, exports, préchargements et caches). Le floutage CSS/UI ne remplace jamais le refus d'accès serveur.
- Règle identique pour les offres récupérées par conversion WhatsApp et celles créées directement sur Jobly. Le seuil de 90 % est inclusif.

**Scénarios obligatoires :**
- **REC-MATCH-01 — seuil et classement :** scores 89,99 %, 90 %, au-dessus ; seuls >=90 % sont classés ; maximum cinq par offre ; ordre et égalités déterministes.
- **REC-MATCH-02 — gratuit :** cinq cartes floutées/anonymisées, scores seuls lisibles, aucun accès au profil ; vérifier l'absence de données identifiantes dans HTML/DOM, état client, réponses API, cache, pagination, recherche, préchargements et exports.
- **REC-MATCH-05 — floutage visuel :** contrôler le rendu flouté des cinq cartes, score net, sur desktop et mobile ; les éléments floutés sont des placeholders sans données réelles.
- **REC-MATCH-06 — aucun chemin d'ouverture :** vérifier l'absence de lien, bouton, aperçu au survol, focus/action clavier, route de détail et téléchargement utilisables en gratuit.
- **REC-MATCH-07 — contournement :** inspection DOM et appels directs API/URL, cache, pagination, recherche et exports ; aucune donnée réelle de profil ne doit être transmise ou récupérable.
- **REC-MATCH-03 — abonnement :** abonnement actif + entitlement ouvre les profils ; expiration, annulation, suspension, impayé ou révocation ferme l'accès.
- **REC-MATCH-04 — portée globale :** mêmes règles sur toutes les surfaces Jobly et pour tous les recruteurs, y compris les offres créées sans parcours WhatsApp.

Ces scénarios sont **À CODER / À EXÉCUTER** ; aucune implémentation ni recette PASS n'est revendiquée par cette décision documentaire.

## Décisions fonctionnelles — parcours WhatsApp, réclamation d'offre et import Gmail

- **Candidature créée au clic sur Postuler :** créer/persister la candidature dès le clic Talent, avant le lancement de WhatsApp. L'état « initiée via WhatsApp » ne vaut pas preuve d'envoi : le Talent doit encore envoyer manuellement le message dans WhatsApp. Tracer séparément l'initiation, l'ouverture du lien CV et toute preuve ultérieure. Double clic/retry idempotent ; ne jamais afficher « envoyée » sans preuve.
- **Réclamation manuelle si numéro différent :** aucun rattachement automatique de l'offre ou des candidatures au compte inscrit avec un autre numéro. Une demande de réclamation et une vérification manuelle sont possibles ; aucun rattachement avant validation explicite et auditée. Le protocole et les preuves de vérification restent à spécifier.
- **Compteur du panneau animé :** afficher le nombre de talents dont le score est strictement supérieur au score du Talent qui a déclenché le partage, pour l'offre concernée. Aucun nom, profil ni identifiant n'est révélé par le compteur. Cette information ne change pas le classement top 5, le seuil >=90 % ni le verrou premium.
- **Gmail recruteur — les deux options :** (1) sélection individuelle de messages à importer ; (2) recherche automatique des candidatures pertinentes après autorisation explicite du recruteur, puis présentation dans une file d'importation/affectation. Les deux modes exigent contrôle/validation de l'import, isolation par recruteur, déduplication, rattachement d'offre et accès sécurisé aux pièces jointes. Aucun envoi de mail n'est autorisé par ce choix.
- **Durée du lien CV :** décision produit en attente. Le délai technique observé précédemment est de 30 jours, mais n'est pas confirmé comme durée cible.

**Recettes additionnelles :**
- **APP-WA-06 — création au clic :** une candidature créée avant l'ouverture de WhatsApp ; statut d'initiation distinct d'un envoi confirmé ; événement d'ouverture du lien CV séparé ; retries sans doublon.
- **REC-CONV-08 — réclamation manuelle :** numéro différent, demande de vérification, accès et rattachement refusés avant validation, audit de la décision, puis rattachement contrôlé si validé.
- **REC-MATCH-08 — compteur relatif :** nombre exact de talents dont le score est strictement supérieur au score du candidat déclencheur ; aucune identité révélée ; calcul propre à l'offre.
- **GMAIL-R-06 — import sélectif :** sélectionner des messages, prévisualiser, confirmer, importer et dédupliquer.
- **GMAIL-R-07 — import automatique :** autoriser la recherche, analyser les messages pertinents, présenter la file d'importation/affectation, demander validation, dédupliquer et isoler les données.

Ces éléments sont **À CODER / À EXÉCUTER** ; ils ne constituent pas des PASS runtime.

## 0. Décision de refonte

La recette n'est plus organisée autour des seuls fichiers techniques, ni autour de la simple disponibilité d'une API. Elle doit démontrer que chaque promesse produit peut être accomplie par le bon utilisateur, depuis l'interface, avec une donnée persistée, une conséquence métier vérifiable et un résultat cohérent dans les autres espaces concernés.

**Règle directrice : une fonctionnalité n'est pas livrée parce que le code compile ou que son endpoint répond 200.** Elle est livrée lorsque le parcours réel est utilisable, compréhensible, autorisé, persistant, récupérable en cas d'erreur et vérifiable par son bénéficiaire.

Les tests statiques, unitaires et de contrat déjà verts sont conservés comme régressions. Ils ne sont ni supprimés, ni requalifiés en E2E. Les preuves anciennes restent rattachées à leurs rapports d'origine. La nouvelle couverture complète les 11 anciens lots au lieu de les effacer.

## 1. Résultat de l'audit du dépôt

Audit effectué sur l'arbre Git de la branche e2e/recette au commit d66091a5f372fdebe75356bcc5cfc1baf40007ba, avec lecture des fichiers E2E, des workflows, de la configuration de test, du schéma Prisma et des familles de routes principales.

| Surface examinée | Inventaire constaté |
|---|---:|
| Entrées du dépôt dans l'arbre Git | 1 632 |
| Handlers API sous app/api | 212 |
| Pages et layouts applicatifs | 114 |
| Fichiers de tests / régression recensés | 46 |
| Migrations Supabase SQL | 66 |
| Familles fonctionnelles identifiables | 19 nouveaux lots fonctionnels, en plus du socle |

Le schéma de données confirme des domaines persistants distincts : utilisateurs et profils, CV et candidatures, offres et pipeline de collecte, Career Journey, conversations/mémoire J'IA, paiements et reçus SMS, abonnements et droits, événements, mobilité et financement, partenaires/commissions, Admin 360, sessions appareil et synchronisation hors ligne.

### 1.1 Parcours et routes fonctionnelles recensés

L'inventaire des pages et handlers fait apparaître, entre autres :

- Identité, onboarding, profil, préférences, sessions multi-appareils, récupération, photo et visibilité.
- Talent : CV, import/export, preuves de carrière, CV partageable, vidéo-pitch, showcase, candidatures et canaux externes.
- Marché : offres, détail, recherche, opportunités, correspondance, cascade, entreprises, sources, ingestion, réindexation et fraîcheur Afrique.
- Recruteur et Recruitment360 : offres, candidatures, talents, Gmail, décisions, documents, listings officiels, rapports et exports.
- J'IA : conversations, cerveau cognitif, mémoire, contexte, actions, Internet Brain, prédiction, outils, proactivité, watchers, extensions et Android.
- Career Journey / Career OS : évaluations, missions, portefeuille, radar, réévaluation et preuves.
- Abonnements, paiements, Mobile Money, configuration des opérateurs, appareils SMS, reçus, rapprochement, vérification, remboursement, codes promo et droits.
- Mobility : demandes, programmes, éligibilité, institutions, fournisseurs, pièces, financement, allocations, décaissements et garanties recruteur.
- Events : création, publication, médias, paiements manuels, mise en avant et nettoyage des médias.
- Community, Bons Plans et Campus : membres, publications, commentaires, réactions, signalements, modération, répertoire institutionnel et opportunités.
- Partenaires/distributeurs : onboarding, profil, KYC, referrals, services, commissions et rapports.
- Admin 360 : comptes gérés, espaces de travail, support, modération, finance, analytics, rapports et exports.
- PWA/offline : bootstrap, snapshots, synchronisation, sessions appareil, sauvegarde/restauration.
- Opérations : cron, watchers, analytics programmées, récolte, webhooks et workflows CI.

### 1.2 Ce que les preuves actuelles démontrent — et ne démontrent pas

| Élément | État probant au commit audité |
|---|---|
| LOT-00 historique | PASS / CLOS selon le document de continuité. Réutiliser la preuve, ne pas répéter les opérations Storage/migrations déjà acquises sans anomalie nouvelle. |
| LOT-01 Auth | PARTIAL / NON CLOS : socle API/session déjà prouvé, mais contrôle multi-appareils avancé et clôture complète restent ouverts. |
| LOT-02 Talent / LOT-03 Recruteur / LOT-04 Afrique | Les 54 assertions transmises sont des PASS statiques uniquement. Elles ne prouvent pas les parcours runtime métier, les écritures ni leur nettoyage. |
| Runtime global actuel | Lecture seule limitée à Talent, Recruteur/Recruitment360 et inventaire Afrique. Aucun parcours UI complet d'écriture pour les autres domaines. |
| Candidatures groupées | Fonction présente dans le code ; soumission côté interface séquentielle après confirmation unique. Aucune recette runtime multi-candidatures prouvée. |
| J'IA, Mobile Money, Mobility, Events, Community, Campus, Partner, Admin, Offline | Des contrats et tests ciblés existent ; ils ne démontrent pas le cycle utilisateur complet sur le runtime E2E. |
| Build/Typecheck | Le workflow Jobly CI — Typecheck & Build a réussi sur d66091a. |
| Verify offer pipeline | Échec sur d66091a à l'étape de garde du launcher, dû à un test trop large qui attrapait le texte d'un commentaire contenant pnpm.cmd, pas à un lancement pnpm.cmd réel. Le test a été resserré dans le commit dfb4320e5e7e8618ccd231c44a4046ddeaa73423 ; ce correctif reste à réexécuter en CI. |
| JOBLY-E2E runtime complet | Non revendiqué dans cet audit. Aucun accès JOBLY-PROD et aucune action fournisseur réelle n'ont été réalisés. |

### 1.3 Régressions existantes à conserver

Les familles de tests déjà présentes sont conservées, notamment :

- Authentification, identité, session et mots de passe.
- CV, candidature, canaux externes, propriété et droits.
- Recruteur / Recruitment360 et séparation de propriété.
- Mission Afrique : date de publication, fraîcheur, échéance, registre de sources, extraction, normalisation, traitement et watermark.
- J'IA : accès par rôle, mémoire, sessions, cycle conversationnel, Internet Brain, extension, Android, responsive et inventaire des variations.
- Paiement SMS : parsing, opérateur, sens du paiement, rapprochement exact, device, configuration, partage client et corroboration IA.
- Billing, entitlements, Mobility, Event Core, Community/Bons Plans/Campus, offline-first et sécurité.
- Storage privé et contrats de média.

Le runner bulk actuel regroupe ces tests en sept groupes statiques. Le fait que les sept groupes passent ne doit jamais être interprété comme la validation runtime des 19 lots fonctionnels décrits ci-dessous.

---

## 2. Trois passes d'audit contradictoire

### Passe 1 — Du besoin utilisateur vers le code

Pour chaque famille de valeur, vérifier la présence de l'écran ou de l'entrée utilisateur, du handler/API, du service métier, du modèle ou de la fonction de persistance et du retour visible. La cartographie confirme que l'application contient beaucoup plus de parcours que les trois parcours runtime actuels.

### Passe 2 — Du code et des données vers l'expérience

Partir des handlers API, des modèles et migrations pour rechercher les fonctions qui ne sont pas atteignables depuis une interface ou dont le parcours n'est pas exercé. Contrôler les états intermédiaires, les droits, les relations entre tables, les traces, les quotas et la cohérence entre rôles.

Questions obligatoires :
- Une route existe-t-elle sans action visible ou sans retour utilisateur exploitable ?
- Une page affiche-t-elle un état de succès sans preuve de persistance ?
- Une écriture est-elle autorisée au mauvais rôle, au mauvais propriétaire ou au mauvais espace ?
- Un statut peut-il être avancé par le candidat alors qu'il relève du recruteur, ou par un reçu non vérifié ?
- Une offre, un paiement, une décision ou un média peut-il être dupliqué, perdu ou laissé orphelin après un retry ?

### Passe 3 — Raisonnement par contradiction

Chaque scénario doit être attaqué comme si le résultat annoncé était faux :

1. Le parcours réussit à l'écran, mais la ligne en base n'existe pas.
2. La ligne existe, mais elle appartient à un autre utilisateur ou à une autre organisation.
3. Le premier appel réussit, la réponse réseau est perdue, puis l'utilisateur réessaie.
4. Deux actions concurrentes créent deux paiements, candidatures, commissions ou décisions.
5. Une partie d'un lot échoue : les éléments réussis restent-ils exacts et les éléments en échec sont-ils récupérables ?
6. Le rôle Talent voit-il une décision recruteur qui n'a pas été persistée ? Le Recruteur voit-il une candidature appartenant à une offre qu'il ne possède pas ?
7. Le service externe refuse, expire ou rappelle deux fois le webhook : l'état reste-t-il cohérent ?
8. L'utilisateur se déconnecte, change de compte, passe hors ligne ou revient sur un autre appareil : aucune donnée privée ne fuit-elle ?
9. La date, le pays, la devise, le propriétaire, le statut ou la source sont ambigus : le système refuse-t-il de deviner ?
10. Le nettoyage est interrompu : le manifeste du run permet-il de reprendre sans toucher aux données préexistantes ?

**Résultat des trois passes :** la couverture précédente est insuffisante pour affirmer que Jobly est prêt fonctionnellement. Les parcours manquants les plus importants sont les parcours de bout en bout qui traversent plusieurs rôles et plusieurs modules, et non une nouvelle série de tests de disponibilité d'API.

---

## 3. Nouveau découpage : 19 lots fonctionnels

Le découpage ci-dessous devient la cible de recette. Chaque lot contient une recette principale de valeur, ses contrôles négatifs et les preuves de persistance. Les fichiers déjà existants restent des suites de régression associées.

| Lot | Valeur vérifiée | Principaux domaines du code | Priorité |
|---|---|---|---|
| 00 | Socle, sécurité, base, Storage et fixtures | auth serveur, RLS, migrations, Storage privé | acquis à préserver |
| 01 | L'utilisateur entre, crée/relie son identité et retrouve son compte en sécurité | auth, onboarding, sessions, device-sessions, préférences | P0 |
| 02 | Le Talent construit un profil et un CV réellement exploitables | profile, talent/cv, showcase, CV share, backup | P0 |
| 03 | Le Talent trouve des opportunités réelles et cohérentes au Cameroun et en Afrique | jobs, opportunities, matches, sources, ingestion | P0 |
| 04 | Le Talent transforme une ou plusieurs offres en candidatures maîtrisées | applications, channels, batch, letter import, submit | P0 |
| 05 | Le Recruteur publie, reçoit, évalue et décide ; le Talent voit la même décision | recruiter, ATS, Recruitment360, Gmail, reports | P0 |
| 06 | Le Talent transforme son profil en progression et preuves de carrière | career journey, career brain, career OS | P1 |
| 07 | J'IA accompagne et exécute des actions autorisées à travers Jobly | J'IA brain, memory, tools, actions, Internet Brain | P1 |
| 08 | Un paiement ouvre les droits exacts de l'offre/du plan acheté | payment, subscription, billing, promo, entitlements, webhook | P1 |
| 09 | Un reçu Mobile Money est analysé, rapproché et audité sans faux paiement | SMS parser, devices, matching, reconcile, Android receiver | P1 |
| 10 | Une demande de mobilité passe de l'éligibilité au financement et au service | mobility, institution, partner, guarantees, funding | P1 |
| 11 | Un organisateur publie un événement et un participant suit son parcours | events, media, payments, featuring, cleanup | P1 |
| 12 | Les membres publient et interagissent dans Community, Bons Plans et Campus | community, bon-plans, campus, moderation | P1 |
| 13 | Un partenaire acquiert, accompagne et suit ses commissions | partner, distributor, commissions, KYC, reports | P1 |
| 14 | Les opérations Admin 360 sont cloisonnées, traçables et exportables | admin accounts, workspaces, support, analytics, finance | P1 |
| 15 | Jobly reste utilisable hors ligne et sur appareils connectés | offline, backup, PWA, device sessions, Android, extension | P1 |
| 16 | Les communications, vérifications et médias arrivent au bon destinataire | Gmail, WhatsApp, video pitch, notifications, preferences | P1 |
| 17 | L'expérience publique et mobile permet réellement d'entrer et d'utiliser Jobly | home, public listings, onboarding, responsive, i18n, legal | P1 |
| 18 | Les traitements planifiés et callbacks sont fiables, observables et récupérables | cron, workflows, Edge Functions, harvest, webhooks | P1 |

### LOT-00 — Socle (préserver les acquis)

Ne pas recommencer les contrôles déjà prouvés de base de données et Storage sans changement concerné. Garder le baseline, les contrôles RLS/grants, les buckets privés, l'isolation des fichiers et les preuves de nettoyage déjà obtenues. Une nouvelle migration doit avoir son propre test d'application, de répétition/idempotence, de permissions et de rollback sur une base isolée.

### LOT-01 — Identité et accès

**Recette de valeur :** un nouveau Talent s'inscrit ou un utilisateur existant se connecte, complète son onboarding, ouvre son espace, renouvelle sa session, se déconnecte puis retrouve un accès conforme à son rôle.

Tester :
- Email/username, mot de passe, OTP, Google OAuth/callback simulé, récupération et reprise après onboarding incomplet.
- Liaison d'identité existante uniquement après vérification du mot de passe ; pas de création de doublon User/Auth.
- Rôles Talent, Recruteur, Partenaire et Admin ; refus des endpoints et données d'un autre rôle.
- Sessions appareil, limite et révocation sur sessions E2E temporaires créées par le run ; ne jamais révoquer les appareils préexistants.
- Préférences, consentements, sécurité du mot de passe et profil-photo privé/public avec consentement explicite.
- Déconnexion, expiration, refresh token, changement de compte et demandes concurrentes.

**Preuve exigée :** UI + Auth + User/Profile en base + rôle + refus inter-rôle + nettoyage/absence d'altération d'une fixture préexistante.

### LOT-02 — Talent 360, CV et identité professionnelle

**Recette de valeur :** le Talent complète son profil, importe un PDF, vérifie l'extraction, corrige les données, enregistre son CV, le partage de manière contrôlée et peut récupérer/exporter ses informations selon ses droits.

Tester :
- Profil, compétences, expériences, formations, préférences, discoverability et showcase.
- Import PDF authentifié, validation du vrai MIME/signature, taille, extraction et aperçu ; rien n'est enregistré avant confirmation.
- Sauvegarde du CV original dans le bucket privé du propriétaire, lecture par URL signée et suppression uniquement par son propriétaire.
- Export CV : paiement/entitlement exact, statut confirmé, montant/devise et propriétaire attendus.
- Career evidence : seules les preuves confirmées/consenties apparaissent.
- CV share/QR/Jobly ID : accès par token, expiration, révocation, portée, PDF, absence de fuite après expiration.
- Photo, vidéo-pitch, backup chiffré et restauration : intégrité, compte propriétaire, consentement et limites.

**Contradiction :** faux PDF, fichier d'un autre utilisateur, lien expiré, session expirée au moment de l'import, double upload, export non payé, partage révoqué et restauration d'une archive altérée.

### LOT-03 — Marché d'opportunités et Mission Afrique

**Recette de valeur :** une source qualifiée alimente une offre exploitable ; le Talent la trouve dans le bon marché, ouvre le bon détail, comprend la source et sait réellement comment postuler.

Tester :
- Registre sources : clés uniques, statut actif/inactif/discovery-only, pays, URL et mode de collecte.
- Qualification séparée de l'enregistrement : une entrée recensée mais non qualifiée ne doit pas être crawlée.
- Capture, parsing, extraction du pays, du type d'opportunité, des contacts, des dates et de la deadline.
- Pipeline : capture → traitement → normalisation → classification → déduplication → offre visible ou motif de quarantaine/rejet.
- Fraîcheur : date source réelle valable deux mois calendaires ; fallback de première collecte 30 jours et explicitement estimé ; date manquante jamais inventée ; deadline expirée exclue ; date future rejetée.
- Modèle d'affichage propre à la source : le champ affiché doit correspondre à sa donnée source, sans inventer salaire, expérience, score ou contact.
- Flux local et Afrique, filtres pays/type/source, pagination, compteurs, recherche, détail de la même offre et cohérence du total.
- Sources sans contact direct : elles restent affichables comme opportunités source-only, sans être présentées comme candidatables directement.
- Retry, reprise de capture, idempotence, doublons, quarantaines, captures PENDING et métriques par pays/source.

**Preuve exigée :** objets bruts, pipeline, offre normalisée, détail API/UI, compteur, dates et contact vérifiables, puis nettoyage uniquement des données du run. Le test statique de registre actuellement présent annonce 248 clés, 101 candidates HTTP et le registre des 54 pays ; cette déclaration statique ne prouve pas que toutes ces sources sont effectivement actives ou que leurs offres sont publiées.

### LOT-04 — Candidature simple, externe et groupée

**Recette de valeur :** depuis une offre, le Talent sait si la candidature est directe ou source-only, prépare les éléments, contrôle le contenu, confirme ce qu'il souhaite envoyer et suit l'état dans son espace.

Tester :
- Canaux email, téléphone, WhatsApp et formulaire externe ; pas de faux statut « candidature envoyée » si le canal est externe et non confirmé.
- Préparation d'une lettre personnalisée et CV associé ; J'IA assiste, mais le Talent relit et confirme.
- Import d'une lettre, édition, remplacement et conservation de la version approuvée.
- Consentement aux listings officiels et lien de candidature externe.
- Déduplication par offre et Talent ; quotas par plan ; abandon avant envoi ; reprise d'une tentative interrompue.
- Panier groupé : 0, 1, limite du plan, 20 et limite+1 ; association exacte des offres et items ; une confirmation du Talent ; envoi séquentiel tel que le code actuel l'implémente.
- Succès partiel, erreur d'un item, retry d'un item, double clic, appels concurrents, limite hebdomadaire et historique du batch.
- Cohérence des statuts entre Application, ApplicationBatch, ApplicationBatchItem, liste Talent et boîte Recruteur.

**Fournisseur email :** simulateur/test double seulement, destinataire .invalid, aucun Gmail réel, aucun SMS ni formulaire externe réel. Une recette ne doit pas transformer un statut préparé en preuve d'envoi.

### LOT-05 — Recruteur et Recruitment360

**Recette de valeur :** un Recruteur crée son entreprise, publie une offre, reçoit des candidatures appartenant à ses offres, fait progresser un candidat et voit ses décisions apparaître côté Talent.

Tester :
- Onboarding/profil entreprise, logo, préférences et entitlement recruteur.
- Offre brouillon, édition, publication, fermeture, visibilité dans le marché et contrôle de propriété.
- Recherche/découvrabilité Talent et droits d'accès au profil/CV.
- Réception candidature, lecture passive, marquage « vu » uniquement lors de l'action UI prévue, documents et historique.
- Score, shortlist, notes, transitions INTERVIEW/OFFER/REJECTED, décision et éventuelle réponse du candidat.
- Documents, listings officiels, partage public par token, rapports et exports Excel/PDF.
- Gmail connect/status/import/attachment/send en simulateur ; permissions et plans Premium/Pro.
- Refus d'un recrutement ou d'une offre d'un autre Recruteur ; statut candidat non modifiable par le Talent lorsqu'il appartient au Recruteur.
- Cohérence cross-role de la décision et des compteurs après actualisation/reconnexion.

### LOT-06 — Career Journey et Career OS

**Recette de valeur :** le Talent passe une évaluation, obtient un diagnostic compréhensible, reçoit des missions, apporte des preuves, fait évoluer son portefeuille et peut réévaluer sa progression.

Tester :
- Assessments et formats de questions ; réponses et résultats persistés au bon compte.
- Radar, objectifs, missions, mises à jour, preuves déclarées/documentées/vérifiées et provenance.
- Portfolio et recommandations ; aucun document privé présenté comme preuve sans consentement.
- Reassess et fréquence START/périodique ; quotas et abuse limits.
- Career Brain / Career OS : résultats accessibles depuis l'espace Talent, sans réutiliser le contexte d'un autre compte.
- Cohérence entre les preuves issues du CV, le diagnostic et les actions affichées.

### LOT-07 — J'IA 360 opérationnelle

**Recette de valeur :** J'IA comprend la demande dans le bon espace, explique ce qu'elle peut faire, utilise le contexte approprié et exécute uniquement les actions autorisées, après confirmation lorsqu'elles produisent un effet métier.

Tester :
- Conversation créée, reprise, historique, pagination, messages persistés et séparation stricte entre Talent, Recruteur, Partenaire et Admin/CEO.
- Mémoire personnelle distincte de la mémoire CEO ; changement de compte, session et conversation sans fuite de contexte.
- Cycle cognitif hors ligne, outils/verbs disponibles, résultat utile même quand Internet est indisponible.
- Internet Brain : demandes explicites d'information externe, sources, fraîcheur, confiance et refus d'inventer une recherche non exécutée.
- Actions Jobly : CV, offre, candidature, Career Journey, Mobility, paiement, Community, Events et espace Recruiter ; chaque action est liée à l'utilisateur, au bon module et aux droits serveur.
- Demande de confirmation avant écriture, envoi, publication, décision ou paiement ; aucune action en arrière-plan silencieuse.
- Proactivité, notifications, watchers et préférences : activation explicite, pause, désabonnement et absence de doublons.
- Interface adaptative, modes de présentation, avatar, contrôles tactiles et fallback quand WebGL/voix ne sont pas disponibles.

**Critère de succès :** pas seulement une réponse conversationnelle ; l'action demandée doit atteindre le bon module, laisser une preuve et être visible au bon utilisateur.

### LOT-08 — Abonnements, paiements et droits

**Recette de valeur :** le client choisit une offre, paie dans un environnement de test, reçoit le bon droit et conserve un historique de transaction cohérent.

Tester :
- Plans FREE/START/PREMIUM/PRO, essais, intervalle mensuel/annuel, date de fin et entitlement associé.
- Payment intent et montant/devise/acteur/produit/module exacts.
- Callback/webhook iClan simulé : signature, événement dupliqué, événement hors ordre, replay, statut et audit.
- Succès, pending, échec, annulation, expiration, remboursement et rapprochement.
- Code promo, limites, atomicité du changement de plan et droits après renouvellement.
- Refus d'un montant, devise, bénéficiaire ou référence qui ne correspond pas à l'intent.
- Aucune fonctionnalité payante débloquée sur un reçu non vérifié ou une réponse client seule.

**Fournisseur :** sandbox/test double exclusivement ; aucun transfert financier.

### LOT-09 — Mobile Money et reçus SMS

**Recette de valeur :** une confirmation MTN/Orange est reçue ou partagée explicitement, décodée sans inventer de données, rapprochée d'un seul paiement en attente puis auditée.

Tester :
- Configuration marchand active, shortcode, devise, montant, format numéro et compte marchand.
- Pairing appareil, token à affichage unique, allowlist expéditeur, chiffrement local et révocation.
- SMS synthétiques succès, attente, échec, sortant, expéditeur inconnu, date ambiguë, référence incomplète et fraude.
- Extraction montant/devise, transaction ID, date/heure avec fuseau explicite, payeur, marchand, opérateur, sender ID, direction et statut.
- Match exact sur intent, utilisateur, module, montant/devise, numéro marchand/payeur et référence ; une seule commande compatible.
- Aucun rapprochement sur le seul montant ; ambiguïté ou conflit = revue/rejet, pas succès.
- SMS client partagé : corroboration/lookup seulement, pas autorité autonome pour finaliser l'entitlement.
- Idempotence, reprise des reçus RECEIVED, doublons, conflits et audit masqué ; contenu SMS privé non persisté en clair.
- Android : autorisation explicite, réception du seul SMS partagé, pas de lecture générale de la boîte, envoi chiffré au endpoint et retry WorkManager.

### LOT-10 — Mobility et financement

**Recette de valeur :** un Talent soumet une demande de mobilité, le système calcule son éligibilité, les acteurs habilités instruisent le dossier, les fonds sont simulés/attribués et le partenaire exécute le service.

Tester :
- Demande, programme, pays, devise et calcul de coût complet.
- Seuil métier de 50 % inclus/exclu selon les règles canoniques ; âge du compte, contrat employeur, garantie recruteur, devise, salaire et montants incohérents.
- Pièces, KYC, consentement et provenance ; document manquant/illisible.
- Rôle Talent, Recruteur, Institution, Partner et Admin sur chaque endpoint.
- Institution : programmes, providers, décision, allocation et disbursement simulé.
- Partner : affectation, service, logement, validation, rapport et mise à jour d'étape.
- Pass, garantie, échéancier de remboursement, état financier et audit.
- Double allocation, retry, fonds insuffisants, fournisseur non vérifié, mauvaise institution et tentative d'accès non autorisée.

**Aucune opération de financement ou de décaissement réel ne doit être faite pendant l'E2E.**

### LOT-11 — Events

**Recette de valeur :** un organisateur crée et publie un événement, ajoute des médias privés, configure son paiement et un participant suit le parcours d'inscription/paiement.

Tester :
- Brouillon, mise à jour, publication, dates, capacité et propriétaire.
- Upload media privé, contrôle MIME/taille/durée, chemin de stockage, URL signée, accès publié uniquement.
- Achat/inscription, canal manuel autorisé, preuve de paiement, revue Admin, statut payé et confirmation visible.
- Mise en avant/featured campaign, prix, durée, entitlement et expiration.
- Paiement en attente, preuve invalide, duplication, resoumission et idempotence.
- Suppression/expiration des médias abandonnés par un cron protégé.
- Aucun stockage public accidentel et aucune URL signée après expiration.

### LOT-12 — Community, Bons Plans et Campus

**Recette de valeur :** un membre rejoint une communauté, publie, commente/réagit, signale un contenu ; un modérateur traite le signalement ; un Talent explore les Bons Plans et opportunités Campus valides.

Tester :
- Communautés disponibles, adhésion, départ, bannissement et impossibilité de réactiver un membre banni.
- Publication, commentaires, réactions, signalement, modération, visibilité et compteurs persistés.
- Bons Plans : création/publication, dates future/expirée, interactions, commentaires, compteurs et modération.
- Campus : répertoire des institutions actives, appartenance institutionnelle, opportunités et fraîcheur canonique.
- Requêtes anonymes/refus, limites de contenu, spam, doublons, langues FR/EN et visibilité par rôle.

### LOT-13 — Partenaire et distributeur

**Recette de valeur :** un partenaire s'onboarde, est vérifié, recommande un Talent ou un service, suit son portefeuille et voit sa commission évoluer avec un événement métier traçable.

Tester :
- Onboarding, profil, KYC et statut d'activation.
- Referral/BA/distributor, commission preview, rattachement à un seul événement/source de conversion.
- États GENERATED → PENDING → VALIDATED → PAYABLE → PAYMENT_EXECUTED/PAID ou REJECTED.
- Idempotence des conversions et commissions, déduplication, annulation et litige.
- Affectation services Mobility, rapports, rôles, données personnelles et refus d'accès croisé.
- Paiement commission en simulateur uniquement.

### LOT-14 — Admin 360 et opérations de gestion

**Recette de valeur :** l'Admin autorisé ouvre uniquement ses espaces, gère des comptes, traite un ticket ou un signalement, suit la finance et exporte un rapport vérifiable.

Tester :
- Root Admin singleton, identité Admin distincte des rôles opérationnels, workspace membership et permissions.
- Comptes gérés, activation/désactivation, actions auditables, aucun changement de rôle invisible.
- Support : création, message, attribution, statut, clôture et historique.
- Modération Community, Bons Plans, Events, paiements manuels et preuves privées.
- Finance, paiements, commissions, analytics, zéro observé vs donnée manquante.
- Export et partage de rapport, token, expiration, scope, confidentialité et révocation.
- Refus d'accès à un workspace non membre ; absence d'héritage implicite d'un rôle Talent/Recruteur/Partner.

### LOT-15 — Offline, PWA, appareils et extensions

**Recette de valeur :** le même Talent peut consulter un snapshot protégé hors ligne, reprendre son réseau, synchroniser uniquement les opérations sûres et restaurer une sauvegarde sans fuite entre comptes.

Tester :
- Service worker : aucune mise en cache privée des API/Auth/pages sensibles.
- Bootstrap explicite, snapshot chiffré, durée, compte propriétaire et expiration.
- Synchronisation dédupliquée et limitée aux opérations sûres ; opérations interdites refusées.
- Déconnexion, changement de compte, session révoquée, appareil perdu et limite de sessions.
- Backup chiffré, intégrité, restauration et CV privé.
- PWA installable, navigation, reprise réseau, affichage mobile/tablette/desktop.
- Android WebView : origine HTTPS autorisée, messages bridge validés, iframe/origine étrangère refusée.
- Extension Chrome : activation manuelle, permissions opt-in, lecture de labels seulement, aucune valeur sensible/password ni soumission automatique.

### LOT-16 — Communications, vérifications et notifications

**Recette de valeur :** une notification ou une vérification part vers le bon canal, est reliée au bon utilisateur et son résultat est consultable.

Tester :
- Gmail candidat et recruteur : OAuth, état de connexion, callback, import et envoi simulé.
- WhatsApp : demande, expiration, code incorrect, vérification et limitation anti-abus.
- Video pitch : upload, format, visibilité, lecture par détenteur autorisé.
- Notifications : création, lecture, préférences, désabonnement et absence de doublons.
- Email/SMS/WhatsApp : bon destinataire, bon template, consentement, retries et journal sans secret.
- Échec fournisseur, timeout, token expiré et reprise ; aucun message réel durant E2E.

### LOT-17 — Vitrine publique, UX, internationalisation et accessibilité

**Recette de valeur :** un visiteur comprend Jobly, voit les vrais compteurs/opportunités, rejoint le bon espace et peut réaliser les actions principales sur téléphone comme sur desktop.

Tester :
- Home, CTA, compteurs live, offres Afrique, preuve de valeur et absence de chiffres statiques trompeurs.
- Pages jobs/offres, listing recruteur public, token d'accès, PDF public autorisé et expiration.
- Onboarding Talent/Recruteur/Partner/Institution et redirections après connexion.
- FR/EN, formats de date/devise, pays et contenu sans mélange de langues.
- UI responsive pour petits téléphones, grands téléphones, tablette et desktop ; clavier, focus, labels, contraste et lisibilité.
- Aucun CTA principal sans destination ou sans réponse ; erreurs, empty states et chargement.
- Privacy/Terms, consentements et cohérence du parcours de retrait/révocation.

### LOT-18 — Automatisations, cron, webhooks et exploitation

**Recette de valeur :** un traitement planifié effectue le bon travail une fois, reprend après incident et laisse une preuve contrôlable.

Tester :
- Harvest, processor, normalizer et reprise de files ; limite de sources, batch, retry, backoff et idempotence.
- Cron analytics, J'IA watch et nettoyage Event media ; secret/OIDC correct, utilisateur non autorisé refusé.
- iClan webhook : signature, event ID unique, doublon, replay, événement hors ordre et audit.
- Edge Functions : versions déployées sur JOBLY-E2E, secrets isolés, logs sans clés ni payload privé.
- Traitement partiel, timeout, reprise, dead letter/erreur persistée et alerte.
- Chaque job indique son environnement, sa source, ses volumes, ses erreurs et son heure d'exécution.
- Aucun workflow de recette ne doit appeler le scheduler, endpoint d'ingestion ou webhook de JOBLY-PROD.

---

## 4. Parcours transversaux obligatoires

Ces scénarios croisent les lots et ne peuvent pas être remplacés par un lot isolé.

### T1 — Le parcours central emploi

Talent s'inscrit → complète son profil/CV → découvre une offre réelle de la zone demandée → ouvre le détail exact → J'IA prépare une candidature adaptée → le Talent relit et confirme → une candidature ou un batch est persisté → le Recruteur propriétaire la voit → le Recruteur décide → le Talent retrouve la même décision et son historique.

### T2 — Une offre Afrique devient une candidature utile

Source qualifiée → capture → date/contact/pays validés → déduplication → traitement → modèle d'affichage adapté à la source → offre visible au bon pays → contact ou formulaire clairement qualifié → candidature possible ou explication source-only sans fausse promesse.

### T3 — Paiement et entitlement

Un utilisateur choisit une offre → paiement simulé → callback confirmé → rapprochement unique → droit exact activé → écran mis à jour → retry du même événement sans double droit ni double paiement.

### T4 — J'IA agit dans le bon module

Une demande naturelle → identification du rôle et du contexte → explication de l'action proposée → confirmation → appel API autorisé → persistance métier → preuve visible dans le module d'origine et conversation → refus sûr si l'autorisation ou le résultat manque.

### T5 — Mobility multi-acteurs

Talent → Recruteur/garantie → Institution/éligibilité et financement → Partner/prestation → Talent/état final → Admin/rapport ; chaque transition porte l'acteur, l'heure, les preuves et les limites financières.

### T6 — Continuité multi-appareils et hors ligne

Le Talent travaille en ligne → snapshot explicite → perte réseau → consultation hors ligne → retour réseau → synchronisation idempotente → second appareil → changement de compte → aucune fuite ni double écriture.

---

## 5. Contrat d'exécution de chaque recette

Chaque cas de test doit avoir un identifiant stable et fournir :

1. **Valeur attendue** : ce que l'utilisateur accomplit, pas seulement l'endpoint appelé.
2. **Persona et préconditions** : compte, rôle, plan, données, appareil, pays/devise et état de départ.
3. **Action UI** : clics/formulaires et résultat visible.
4. **API et règle métier** : route, payload attendu, statuts et validations.
5. **Persistance** : lignes/relations/statuts créés ou modifiés et propriétaire exact.
6. **Effet croisé** : vue du second rôle ou du module consommateur, lorsque pertinent.
7. **Contradictions** : refus, limites, doublon, concurrence, timeout, retry et succès partiel.
8. **Intégrations** : sandbox ou faux fournisseur déterministe ; aucune communication/transaction réelle.
9. **Nettoyage** : manifeste par runId, suppression limitée aux IDs du run et vérification d'absence.
10. **Rapport** : commit, environnement, horodatages, compteurs, checks, erreurs, nettoyage et chemins de journaux.

### Statuts à utiliser

- **STATIC_PASS** : contrat statique ou test unitaire réussi.
- **API_RUNTIME_PASS** : l'API a été appelée sur le runtime E2E et les règles ont été vérifiées.
- **FULL_E2E_PASS** : UI réelle + API + persistance + effet croisé + contrôles négatifs + nettoyage prouvés.
- **BLOCKED** : prérequis absent ou environnement externe impossible à isoler ; l'étape non testée reste ouverte.
- **FAIL** : comportement attendu non respecté.
- **NOT_RUN** : scénario conçu mais pas encore exécuté.

Un lot n'est **CLOS** que si ses scénarios obligatoires sont FULL_E2E_PASS, ses anomalies P0/P1 sont résolues ou explicitement acceptées, et ses données de run sont nettoyées. Un build vert ne ferme aucun lot fonctionnel.

## 6. Garde-fous de données et de sécurité

- JOBLY-E2E uniquement ; projet attendu ofqqrryamslxoqkklraw, vérifié par le runner avant toute écriture.
- JOBLY-PROD et ses comptes, clés, migrations, tables, Storage, cron, Edge Functions et déploiements sont interdits.
- Fixtures partagées existantes : ne pas réinitialiser, recréer, supprimer, réutiliser un mot de passe ou modifier un profil hors scénario expressément autorisé.
- Utiliser des données synthétiques propres à chaque run avec runId et manifeste de nettoyage. Ne jamais supprimer par un filtre large sur un rôle, une date ou un statut.
- Email de test en domaine .invalid ; providers Gmail, Mobile Money, iClan, WhatsApp et transferts simulés ; aucun vrai destinataire, numéro marchand ou flux financier.
- Aucun envoi de candidature réel, aucune décision recruteur réelle, aucun upload public par défaut.
- Chaque test négatif doit prouver le refus sans mutation.
- Aucun secret, token, numéro complet, contenu SMS privé ou donnée personnelle inutile dans les journaux.
- Les recettes parallèles ne peuvent partager ni les mêmes identifiants d'écriture, ni les mêmes fichiers rapport ; concurrence bornée et ressources isolées.
- Une seule commande globale doit orchestrer les lots exécutables ; elle génère un rapport maître, des rapports par lot et ouvre le rapport pertinent dans Notepad. Ne pas exiger trois CMD simultanés de l'opérateur.

## 7. Priorisation de reprise

### Vague A — Le cœur de la promesse Jobly (P0)

1. Préserver LOT-00 et réutiliser ses preuves.
2. Clôturer le socle LOT-01 sans toucher aux appareils préexistants.
3. Tester le parcours intégré LOT-02 → LOT-03 → LOT-04 → LOT-05.
4. Exécuter les vraies recettes de candidatures multiples et du cycle de décision recruteur.
5. Revalider que le flux Afrique donne des offres fraîches, cohérentes et réellement candidatables lorsque le contact est vérifié.

**La Vague A doit répondre à la question : un Talent peut-il trouver une opportunité, postuler sans friction et obtenir une réponse visible du Recruteur ?**

### Vague B — Les services qui différencient Jobly (P1)

LOT-06 Career Journey/Career OS ; LOT-07 J'IA 360 ; LOT-08 Billing ; LOT-09 Mobile Money ; LOT-10 Mobility.

### Vague C — L'écosystème et la continuité (P1)

LOT-11 Events ; LOT-12 Community/Bons Plans/Campus ; LOT-13 Partner ; LOT-14 Admin 360 ; LOT-15 Offline/appareils ; LOT-16 Communications ; LOT-17 vitrine/UX ; LOT-18 automatisations.

L'ordre détaillé peut être optimisé par indépendance technique, mais aucun module commercialement présenté ne doit disparaître du catalogue sous prétexte qu'il est moins facile à tester.

## 8. Correspondance avec les 11 anciens lots — continuité conservée

| Ancien lot | Nouveau périmètre de rattachement |
|---|---|
| Ancien LOT-00 | Nouveau LOT-00 ; preuves PASS préservées |
| Ancien LOT-01 | Nouveau LOT-01 et contrôles transversaux de sécurité |
| Ancien LOT-02 | Nouveaux LOT-02, LOT-03, LOT-04 et LOT-06 |
| Ancien LOT-03 | Nouveau LOT-05 |
| Ancien LOT-04 | Nouveau LOT-03 |
| Ancien LOT-05 | Nouveau LOT-07 |
| Ancien LOT-06 | Nouveau LOT-10 |
| Ancien LOT-07 | Nouveaux LOT-08 et LOT-09 |
| Ancien LOT-08 | Nouveaux LOT-11, LOT-12 et LOT-13 |
| Ancien LOT-09 | Nouveaux LOT-06 et LOT-14 |
| Ancien LOT-10 | Nouveaux LOT-15, LOT-16 et LOT-17 |
| Ancien LOT-11 | Contrôles de clôture des LOT-00 à LOT-18, en particulier LOT-17/18 |

Aucune preuve, aucun rapport et aucun historique des anciens lots ne doivent être supprimés ou réétiquetés. Les nouveaux IDs sont des découpages fonctionnels supplémentaires.

## 9. Point de reprise concret

1. Récupérer le dernier commit de e2e/recette et confirmer le correctif du faux échec de garde du launcher.
2. Exécuter une fois les suites statiques existantes ; ne pas répéter les groupes déjà verts sans changement de code.
3. Reprendre LOT-02/03 en runtime pour établir la base UI Talent/Recruteur, puis ajouter les écritures synthétiques isolées.
4. Construire en premier le nouveau scénario FULL_E2E du parcours central T1, avec le batch multi-candidatures.
5. Ajouter ensuite les lots manquants par ordre de valeur, en refusant le PASS sur simple présence de fichiers ou de routes.

**État de ce catalogue :** conçu et cartographié ; les nouveaux parcours FULL_E2E des lots 02 à 18 ne sont pas encore prouvés par des rapports runtime. Il ne constitue pas une déclaration de livraison des fonctionnalités. La prochaine preuve attendue est une exécution sur JOBLY-E2E, pas une nouvelle compilation présentée comme une livraison produit.

---

## 10. Références de code principales

- Auth et identité : app/api/auth, app/api/profile, app/api/device-sessions.
- Talent/CV : app/api/talent/cv, app/api/cv-share, app/api/account/backup.
- Offres et Afrique : app/api/jobs, app/api/opportunities, app/api/opportunity-cascade, supabase/functions/discover-jobs, job-harvest-process, job-offer-ai-normalize.
- Candidatures : app/api/applications, components/JoblyOfferFeed.tsx.
- Recruteur : app/api/recruiter, app/api/recruitment360, components/RecruiterATS.tsx.
- Career : app/api/career-journey, app/api/career-os, app/api/career-brain.
- J'IA : app/api/jia, app/api/ai, app/api/admin/jia, lib/jia.
- Paiements : app/api/payments, app/api/subscription, app/api/entitlements, app/api/webhooks/iclan, app/api/payments/sms.
- Mobility : app/api/mobility, app/api/institution/mobility.
- Events : app/api/events, app/api/admin/events, lib/events.ts.
- Community/Bons Plans/Campus : app/api/community, app/api/bon-plans, app/api/campus.
- Partner/Distributor : app/api/partner, app/api/mobility/partner.
- Admin : app/api/admin, app/admin.
- Offline : app/api/offline, app/api/account/backup, app/api/device-sessions, components/OfflineCoordinator.tsx.
- Communications : app/api/recruiter/gmail, app/api/talent/gmail, app/api/auth/whatsapp, app/api/auth/video-pitch, app/api/notifications.
- Opérations : app/api/cron, supabase/functions, .github/workflows.


---

## 11. Couverture renforcée — CV ATS, WhatsApp, Gmail et recrutement

**Complément obligatoire au catalogue :** les scénarios détaillés et les écarts code/produit sont consignés dans [l'addendum d'audit CV ATS / WhatsApp / Gmail / Recruteur](./AUDIT-CV-ATS-WHATSAPP-GMAIL-RECRUTEUR-2026-11-10.md). Cette section complète explicitement les LOT-02, LOT-04, LOT-05 et LOT-16. Elle ne remplace aucun test historique.

### 11.1 Matrice de lecture à appliquer

| Promesse | Composant de recette obligatoire | Condition pour déclarer la fonction verte |
|---|---|---|
| CV PDF → CV Master → ATS | LOT-02 | Extraction exacte, correction humaine, persistance, PDF réellement lisible par extraction de texte |
| Améliorer le CV avec J'IA | LOT-02 | Forces/lacunes/suggestions visibles ; chaque modification acceptée ou refusée ; aucune donnée professionnelle inventée |
| CV optimisé pour une offre | LOT-02 + LOT-04 | CV ciblé relié à une offre ; version approuvée réutilisée dans la candidature et la pièce jointe |
| WhatsApp manuel | LOT-04 | Numéro normalisé pour le pays, message prérempli, lien CV privé, action Envoyer sous contrôle du Talent et retour d'état honnête |
| Clic Recruteur sur CV WhatsApp | LOT-04 + LOT-05 | Consultation et PDF, compteurs, expiration/révocation, droits et absence de fuite |
| WhatsApp entrant automatique | LOT-04 + LOT-16 | Webhook/Business API, ingestion idempotente et création d'une candidature détenue par le bon recruteur ; NOT IMPLEMENTED tant que ce pont n'existe pas |
| Offre externe | LOT-03 + LOT-04 | Redirection vers le promoteur, contexte J'IA, retour Jobly et statut manuel explicite ; aucune fausse confirmation d'envoi |
| Gmail Talent sortant | LOT-04 + LOT-16 | Consentement/scope, revue, lettre, CV PDF joint, pied marketing, preuve Gmail, retry sans double envoi |
| Gmail Recruteur entrant | LOT-05 + LOT-16 | Import PDF, tri, affectation, déduplication, ATS score, file « À affecter », ouverture CV avec contrôle du recruteur propriétaire |
| Signatures marketing e-mail | LOT-16 | Contrôle des variantes texte/HTML, visuels, liens et identité expéditrice ; distinguer pied fixe d'une campagne marketing |
| Pipeline de recrutement | LOT-05 | Toutes les étapes/statuts visibles, entretien, décision, communication, preuves et synchronisation côté Talent |

### 11.2 Scénarios atomiques à garder dans le backlog E2E

- CV-ATS-01 à CV-ATS-08.
- APP-EMAIL-01, APP-WA-01 à APP-WA-03, APP-EXT-01 et APP-CHANNEL-01.
- REC-ATS-01 à REC-ATS-05.
- GMAIL-T-01 à GMAIL-T-02, GMAIL-R-01 à GMAIL-R-05 et COMM-EMAIL-01.

Le détail des préconditions, assertions, cas contradictoires et preuves attendues est donné dans l'addendum. Chaque cas doit avoir une preuve UI + API + persistance lorsque le parcours l'exige, un scénario négatif d'accès et un nettoyage borné au run.

### 11.3 Écarts P1 à ne pas masquer par un build vert

1. ATS et CV Optimized utilisent actuellement le même constructeur PDF : démontrer la différence attendue ou obtenir une décision produit qui les définit comme une seule sortie.
2. Les suggestions IA du CV ne sont pas démontrées dans l'interface canonique ; un score de complétude n'est pas un score de compatibilité ATS externe.
3. Le flux WhatsApp crée un CVShare mais pas une Application ; il ne prouve donc pas à lui seul l'entrée dans le pipeline ATS.
4. Les numéros WhatsApp sont normalisés autour du Cameroun dans le code du flux observé.
5. Les imports Gmail sans offre reconnue ne sont pas ramenés dans la liste standard du recruteur ; la file « À affecter » doit être persistante.
6. La route d'accès aux pièces jointes Gmail ne prouve pas la propriété du recruteur pour les imports sans recruiterJobId.
7. Les e-mails de décision peuvent être envoyés avant la mise à jour durable du statut ; prévoir idempotence, preuve de message et reprise sans double envoi.
8. Les états ACKNOWLEDGED et REJECTED doivent rester visibles dans le Kanban ; le GET de traitement ne doit pas créer un faux « Vu » en masse au simple chargement d'une liste.

**Règle :** tant que les anomalies correspondantes ne sont pas corrigées ou arbitrées et contre-testées, les parcours CV ATS, WhatsApp, Gmail et Recruitment ATS restent PARTIAL / NON CLOS.
