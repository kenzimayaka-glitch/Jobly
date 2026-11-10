# JOBLY — Addendum d'audit fonctionnel : CV ATS, WhatsApp, Gmail et parcours recruteur

**Date :** 10 novembre 2026  
**Dépôt :** `kenzimayaka-glitch/Jobly`  
**Branche auditée :** `e2e/recette`  
**SHA audité :** `36b48154d3cd9a0b5823310635b77496202011a4`  
**Environnement d'exécution E2E autorisé :** JOBLY-E2E (`ofqqrryamslxoqkklraw`).

## 1. Verdict sans ambiguïté

**Non : les recettes actuelles ne prennent pas suffisamment en compte ces promesses.** Elles contiennent des catégories générales « CV », « WhatsApp », « Gmail », « candidatures » et « ATS », et quelques tests statiques vérifient des contrats isolés. Elles ne décrivent pas les parcours complets, leurs retours inter-modules, leurs preuves et leurs cas de contradiction.

Il faut distinguer trois niveaux :

- **Brique codée :** une page, une API ou une fonction existe.
- **Parcours présent dans l'interface :** un utilisateur peut déclencher la fonction.
- **Parcours E2E validé :** le navigateur, les services, la persistance, le second rôle, les droits, les échecs, les reprises et le nettoyage ont été effectivement testés sur JOBLY-E2E.

Les fonctionnalités ci-dessous sont à plusieurs niveaux du premier ou du deuxième type. **Aucune des conclusions ci-dessous n'est une preuve d'exécution E2E runtime de ces parcours.**

## 2. Matrice de couverture promise / code / recette

| Promesse ou décision produit | État du code audité | Couverture des recettes actuelles | Verdict |
|---|---|---|---|
| Importer un CV PDF et préremplir le CV Master | Oui : extraction déterministe, enrichissement IA, aperçu, édition et sauvegarde | Régressions statiques CV ; pas de parcours navigateur complet | Présent, E2E manquant |
| Convertir et télécharger un CV ATS | Oui : projection ATS, aperçu et export PDF soumis aux droits/paiement | Contrats statiques d'export ; pas de contrôle du PDF réellement téléchargé et ré-ouvert | Présent, conversion réelle à qualifier |
| Améliorer le CV avec J'IA | L'API d'import utilise CV Intelligence et renvoie des champs normalisés, mots-clés et éléments d'analyse ; le candidat peut vérifier et modifier les champs | Aucun E2E démontrant la qualité des suggestions, leur affichage, l'acceptation ou le refus | Partiel, E2E manquant |
| Adapter le CV à une offre précise | La préparation de candidature construit un CV ciblé en ordonnant les compétences et expériences par pertinence lexicale | Tests de contrats de préparation ; aucun parcours complet avec comparaison avant/après et approbation | Présent en version déterministe, E2E manquant |
| Postuler via WhatsApp | Le flux ouvre `wa.me` avec un message prérempli et un lien CV partageable ; l'utilisateur doit envoyer le message lui-même | Tests de canaux manuels et tests statiques de partage, pas de parcours Talent → WhatsApp → recruteur → CV | Partiel, recette absente |
| Recevoir automatiquement des candidatures WhatsApp dans Jobly | Aucun webhook ou endpoint métier WhatsApp entrant identifié ; `fetchFromWhatsApp()` renvoie une liste vide | Aucun scénario d'ingestion WhatsApp | Non établi / non implémenté dans le code audité |
| Ouvrir le CV reçu par WhatsApp | Le lien de partage ouvre une page CV publique par token, avec téléchargement PDF, expiration et révocation | Tests statiques de contrat CV Share ; pas de clic recruteur réel ni de test de téléchargement et d'expiration en E2E | Brique présente, E2E manquant |
| Postuler via une plateforme externe | La fiche redirige vers le site du promoteur et transmet le contexte à J'IA ; le candidat réalise l'action sur le site externe | Tests statiques source-only / lien promoteur ; pas de retour de plateforme ni de rapprochement de candidature | Parcours manuel partiel |
| Envoyer une candidature par Gmail côté Talent | Connexion Gmail Talent, revue, génération d'un CV PDF ciblé joint, envoi Gmail, preuve message/thread et statut | Tests statiques du canal et de l'envoi ; pas d'envoi sandbox E2E | Présent, E2E manquant |
| Ajouter la signature / promotion Jobly aux e-mails | Le mail de candidature Talent inclut un pied de mail HTML avec visuel promo et lien Jobly ; les modèles de réponse Recruteur contiennent aussi une mention promotionnelle | Pas de recette de rendu, contenu, URL, image, version texte, consentement ou non-duplication | Présent partiellement |
| Récupérer les candidatures reçues dans Gmail Recruteur | Bouton « Importer depuis Gmail » ; scan manuel de messages PDF récents, analyse et création d'applications | Pas de test dédié d'import Gmail entrant et pas d'E2E | Présent, mais parcours incomplet |
| Cliquer CV depuis l'espace Recruteur | L'écran « Candidatures unifiées » a une action CV qui ouvre `cvUrl` ; pour les imports Gmail, l'API récupère la pièce jointe Gmail | Aucun parcours E2E d'import → liste → clic CV → contrôle de propriété | Présent, E2E manquant |
| Traiter, communiquer et décider | ATS, statuts, entretien, acceptation/refus, modèles d'e-mail et vues par rôle | Contrats Recruteur statiques et un parcours croisé d'une candidature synthétique simple ; pas le workflow complet avec communications | Partiel, E2E manquant |
| Suivre la décision côté Talent | Les APIs portent `status` et `statusSource`, et exposent les changements du Recruteur | Le parcours croisé historique prouve une transition synthétique simple, pas tous les canaux ni les statuts | Partiel, E2E manquant |

## 3. CV Builder + ATS : ce qui existe réellement

### 3.1 Parcours codé

La surface Talent canonique auditée est `/talent/cvs` (« CV Builder + ATS »). Elle permet :

1. Importer un PDF.
2. Extraire des informations avec `/api/talent/cv/import`.
3. Vérifier les champs extraits et les modifier.
4. Enregistrer le CV Master dans le profil et le CV original dans le stockage privé.
5. Afficher des versions Jobly et ATS.
6. Télécharger une version ATS ou une version nommée « CV optimisé », après vérification des droits et, selon la formule, paiement ponctuel.
7. Gérer les liens de partage du CV.

L'API d'import fait une extraction déterministe du PDF et appelle le moteur `CV_INTELLIGENCE`. Elle peut retourner des mots-clés, score, forces, écarts et suggestions. La page canonique conserve principalement les champs extraits et calcule son propre score déterministe à partir de la complétude du CV. L'audit n'a pas trouvé de parcours E2E prouvant que toutes les recommandations IA sont présentées au candidat, comprises, acceptées/refusées puis conservées.

### 3.2 Écart important entre les deux exports annoncés

Dans `app/api/talent/cv/export/route.ts`, la branche `ATS` et la branche `OPTIMIZED` passent toutes deux par le même `buildPdf(cv)`. Le paramètre `service` change la règle de paiement et le nom du fichier, mais le constructeur PDF observé est identique. Il ne suffit donc pas de constater deux boutons ou deux noms de fichiers pour conclure que deux conversions différentes sont livrées.

Le PDF construit par cette route ne reprend actuellement que le nom, titre, contacts, profil, compétences, expérience et formation. Le CV Master comporte d'autres données possibles, par exemple langues, réalisations et intérêts. L'E2E doit contrôler que le fichier téléchargé conserve toutes les sections prévues et qu'il reste lisible par extraction de texte.

**Anomalie de recette à traiter comme P1 fonctionnel :** tant que la sortie ATS et la sortie optimisée ne démontrent pas une différence attendue (ou qu'une décision produit confirme qu'elles doivent être identiques), on ne peut pas déclarer les deux fonctionnalités distinctes validées.

### 3.3 Amélioration générale et adaptation à une offre : deux scénarios différents

- **Amélioration du CV Master :** corriger la structure, les formulations, les mots-clés pertinents, les informations manquantes et la lisibilité, sans fabriquer d'expérience, de diplôme, de compétence ou de résultat.
- **Adaptation à une offre :** sélectionner et ordonner les éléments réels du profil selon les exigences de l'offre cible. Le code `lib/applicationCv.ts` réalise actuellement un tri de pertinence lexicale des compétences et expériences ; il ne faut pas le décrire comme une réécriture IA complète.

Ces deux objectifs auront des critères, des rapports et des contrôles de non-régression séparés.

## 4. WhatsApp : ne pas confondre authentification, candidature et réception

### 4.1 Candidature manuelle via WhatsApp — brique présente

Dans `components/JoblyOfferFeed.tsx`, lorsqu'une offre expose un numéro de candidature et pas d'e-mail, Jobly :

1. normalise le numéro ;
2. crée un lien CV par `POST /api/cv-share` ;
3. prépare un message avec nom du Talent, poste, entreprise et URL du CV ;
4. ouvre `https://wa.me/...` avec le texte prérempli.

**Le candidat doit encore appuyer sur Envoyer dans WhatsApp.** Jobly n'envoie pas le message par WhatsApp Business et ne reçoit pas de confirmation opérateur.

Le flux audité crée un `CVShare`, mais ne crée pas lui-même une ligne `Application`. Il ne fait donc pas automatiquement apparaître cette candidature dans « Mes candidatures » ou dans l'ATS Recruteur. C'est un écart important entre l'action WhatsApp et le processus de recrutement interne.

Autre limite observée : le numéro est converti à partir du préfixe camerounais `237` ou d'un numéro local de neuf chiffres ; les formats des autres pays ne sont pas normalisés de façon générale dans ce chemin. La couverture pan-africaine du numéro WhatsApp reste à tester et à corriger.

### 4.2 Clic du Recruteur sur le CV — brique présente

Le partage CV :

- produit un token non devinable ;
- expire au bout de 30 jours ;
- peut être révoqué par son propriétaire ;
- expose une page de CV par token ;
- permet de télécharger un PDF ;
- incrémente les compteurs de consultation et de téléchargement.

Ce parcours est celui que le recruteur peut ouvrir depuis le message WhatsApp préparé. **Il ne transforme pas à lui seul la visite en candidature ATS.**

### 4.3 Réception WhatsApp automatique — non établie

L'authentification WhatsApp (demande/vérification OTP) est un ancien sujet distinct. La documentation de décisions la classe comme reportée pour coût et absence de fournisseur raccordé ; cette décision ne doit pas être confondue avec l'ouverture manuelle d'un lien `wa.me`.

Aucun endpoint webhook ou flux d'import de candidatures WhatsApp Business entrant n'a été identifié dans l'arbre de routes actuel. Le helper `fetchFromWhatsApp()` renvoie une liste vide. Si la promesse est que Jobly reçoit automatiquement le message ou le CV WhatsApp et ouvre une candidature dans l'ATS, **cette fonctionnalité n'est pas démontrée dans le code audité**.

## 5. Plateformes externes : redirection, pas soumission automatisée

Le flux `EXTERNAL` ouvre le site du promoteur et remet le contexte de l'offre à J'IA. Le code garde explicitement la soumission finale à la charge du Talent. La collection des adaptateurs Jobly de soumission observée est vide.

Le comportement actuel est donc :
- Jobly présente l'offre et son lien de candidature ;
- le Talent continue sur la plateforme externe ;
- J'IA peut conserver le contexte pour l'assister ;
- aucune confirmation universelle de soumission n'est renvoyée par le site externe à Jobly.

La recette doit vérifier que Jobly ne présente jamais cette redirection comme une candidature envoyée. Le scénario de retour (preuve fournie par le Talent, ajout au suivi, statut explicite « effectué à l'extérieur ») n'est pas défini par le handler actuel et doit être testé après arbitrage produit.

## 6. Gmail : deux flux distincts

### 6.1 Gmail Talent — envoyer une candidature

Le compte Gmail Talent utilise le scope d'envoi `gmail.send`, pas un scope de lecture de boîte. Le Talent relit la candidature préparée puis Jobly génère un PDF ciblé, l'attache à l'e-mail et conserve un identifiant de message/thread ainsi qu'une preuve d'envoi dans la candidature.

L'e-mail de candidature contient un pied de mail marketing Jobly : visuel promotionnel, lien vers Jobly et mention « Propulsé par Jobly — Your Career OS ». Ce point doit être une assertion de recette à part entière (HTML et texte brut, bonne URL, bonne image, aucun doublon et aucun changement des coordonnées du candidat).

Le scope Talent observé ne permet pas de conclure que Jobly lit les réponses reçues dans la boîte Gmail ou synchronise automatiquement les retours des employeurs.

### 6.2 Gmail Recruteur — importer les CV reçus

L'écran `/recruiter/candidatures` comporte un bouton « Importer depuis Gmail », un score ATS, un bouton CV, une lecture de lettre et les actions Valider/Refuser.

Le handler d'import observé :
- cherche au plus 25 messages contenant une pièce jointe PDF reçus dans les 90 derniers jours ;
- lit le message et la pièce jointe ;
- ignore les doublons déjà repérés par `sourceMessageId` ;
- extrait le texte du PDF ;
- essaie de rattacher le message à une offre du recruteur par le sujet ou le texte du CV ;
- calcule un score lexical ATS quand une offre est trouvée ;
- crée une candidature `SUBMITTED` d'origine Gmail et une identité Talent si l'e-mail n'existe pas déjà ;
- conserve l'ID du message/thread et le lien de récupération de la pièce jointe.

Ce flux est une **importation déclenchée manuellement**, pas une synchronisation permanente de la boîte de réception. Le code ne prouve pas qu'il reconnaît toutes les candidatures : un CV PDF non lié à une offre peut être importé « À affecter ».

### 6.3 Deux écarts concrets dans l'import Gmail

1. **Candidature non affectée :** l'import crée `recruiterJobId = null` lorsqu'aucune offre n'est reconnue. Or `GET /api/recruiter/applications` ne renvoie que les candidatures rattachées aux offres possédées par le recruteur. La page recharge cette liste après l'import ; les éléments « À affecter » risquent donc de disparaître de l'inbox standard au lieu d'être disponibles dans une file de triage. C'est un défaut de parcours P1 à corriger avant validation.
2. **Contrôle d'accès aux pièces jointes :** la route de récupération vérifie la propriété de l'offre quand `recruiterJobId` est présent. Quand il est nul, elle vérifie seulement que l'appelant possède au moins une offre RecruiterJob, et non que cette candidature Gmail non affectée appartient à son compte ou à sa boîte importatrice. L'autorisation est donc incomplète et doit être durcie avant tout PASS. L'audit n'a pas réalisé de tentative d'accès croisé sur données runtime ; il s'agit d'une anomalie de code à contre-tester, pas d'une fuite exploitée revendiquée.

## 7. « Signature marketing » : ce que le code fait et ne fait pas

Deux formes de promotion ont été identifiées :

- candidature Gmail Talent : pied de mail HTML avec image Jobly et lien de promotion ; version texte avec « Propulsé par Jobly » ;
- réponses Recruteur acceptation/refus : modèles texte qui ajoutent « Recrutement géré via Jobly - Trouvez votre job sur ... ».

Le chemin générique `/api/recruiter/gmail/send` envoie le texte fourni ; il n'ajoute pas à lui seul une signature universelle. Je n'ai pas identifié dans l'arbre audité un éditeur de signature marketing par compte, ni un moteur de campagnes/newsletters/bulk-email marketing. Si par « signature marketing » tu désignes une signature configurable ou des campagnes, ce n'est pas la même brique que les pieds de mail ci-dessus et elle n'est pas démontrée ici.

## 8. Processus Recruteur : état réel et points de contradiction

Les statuts disponibles dans le code et le document ATS comprennent :
`DISCOVERED → SUBMITTED → ACKNOWLEDGED → INTERVIEW → OFFER`, avec `REJECTED` comme issue négative. La source de décision `statusSource` distingue le Talent du Recruteur ; la règle métier code donne la priorité à la décision du Recruteur.

L'espace Recruteur a au moins deux surfaces qui doivent être testées ensemble :
- `/recruiter/ats` : tableau Kanban avec glisser-déposer et colonnes principales ;
- `/recruiter/candidatures` : liste unifiée, import Gmail, ouverture CV, lecture de lettre, e-mails Valider/Refuser.

Contradictions observées :
- Le composant Kanban déclare les statuts `ACKNOWLEDGED` et `REJECTED`, mais son ordre de colonnes n'affiche que `DISCOVERED`, `SUBMITTED`, `INTERVIEW` et `OFFER`. Il faut vérifier que les candidatures « Vues » et « Refusées » restent consultables/traitables.
- La route de liste peut faire passer toutes les candidatures `SUBMITTED` à `ACKNOWLEDGED` dès l'ouverture de la liste de traitement, avant le clic sur chaque candidature. La recette doit vérifier que le statut « Vu » reflète la règle produit réellement retenue, et non simplement le chargement d'une liste complète.
- Dans la page « Candidatures unifiées », le bouton « Valider » envoie le modèle d'e-mail d'acceptation et fait passer la candidature à `INTERVIEW`, pas à `OFFER`. La décision finale doit être testée séparément dans le pipeline.
- L'e-mail de décision est envoyé avant la mise à jour du statut. Si l'e-mail réussit mais que le PATCH échoue, une reprise peut renvoyer un second e-mail ; le messageId/threadId de cette réponse n'est pas enregistré sur la candidature dans ce parcours. Il faut une preuve durable et une politique d'idempotence/reprise.
- Le modèle `relaunch` existe dans `lib/viralityService.ts`, mais la page unifiée expose principalement Valider/Refuser ; une relance n'est pas un parcours UI démontré.

## 9. Recettes à ajouter — identifiants obligatoires

Ces scénarios sont à rattacher aux LOT-02, LOT-04, LOT-05 et LOT-16 du catalogue maître. Ils ne remplacent pas les anciens tests.

### LOT-02 — CV Master, conversion ATS et amélioration

- **CV-ATS-01 Import et extraction :** PDF texte, PDF image/scanné, PDF malformé, fichier trop volumineux, caractères accentués, données manquantes ; contrôler l'aperçu avant sauvegarde.
- **CV-ATS-02 Exactitude :** comparer chaque champ extrait à la source ; aucune invention de diplôme, employeur, date, compétence ou résultat ; tracer les champs estimés/inconnus.
- **CV-ATS-03 Amélioration IA :** présenter forces, lacunes et mots-clés ; permettre de voir chaque suggestion, l'accepter/refuser/modifier ; comparer avant/après et conserver la provenance des faits.
- **CV-ATS-04 Score :** distinguer score de complétude du CV et score de correspondance à une offre ; le score affiché doit être explicable, stable et non trompeur.
- **CV-ATS-05 Export ATS :** télécharger le vrai PDF, extraire son texte, vérifier ordre de lecture, sections, accents, dates, contacts, pagination et champs non perdus.
- **CV-ATS-06 Export optimisé :** prouver que la version optimisée a une différence fonctionnelle documentée par rapport à la version ATS ; contrôler paiement, formule, montant, devise, accès de deux heures et propriétaire.
- **CV-ATS-07 Adaptation à l'offre :** partir d'une offre précise, produire un CV ciblé sans inventer, faire approuver le résultat, puis vérifier que le PDF attaché à la candidature correspond exactement à la version approuvée.
- **CV-ATS-08 Persistance et sécurité :** sauvegarder, se reconnecter, réouvrir CV Master et original privé, refuser l'accès à un autre Talent, tester lien signé/expiration/révocation.

### LOT-04 — Candidature par chaque canal

- **APP-EMAIL-01 :** offre e-mail → CV/lettre ciblés → revue et confirmation Talent → Gmail simulé → PDF en pièce jointe → messageId/threadId → statut SUBMITTED → apparition côté Recruteur.
- **APP-WA-01 :** offre avec numéro → normalisation pays → création share token → message prérempli wa.me → utilisateur peut annuler ou envoyer ; aucun statut « envoyé » fictif avant confirmation.
- **APP-WA-02 :** à partir d'un lien réellement envoyé dans un test contrôlé, ouvrir la page CV comme Recruteur anonyme, télécharger le PDF, contrôler compteurs, expiration à 30 jours et révocation immédiate.
- **APP-WA-03 :** confirmer que le parcours WhatsApp crée ou ne crée pas une Application selon la décision produit ; si la promesse est le suivi ATS, le lien seul ne suffit pas et un pont de création/confirmation est nécessaire.
- **APP-EXT-01 :** ouvre la plateforme du promoteur, conserve le contexte J'IA, revient sur Jobly et enregistre explicitement une preuve/étape externe si cette fonction est retenue ; sinon Jobly doit clairement dire que la candidature n'est pas suivie automatiquement.
- **APP-CHANNEL-01 :** email/WhatsApp/plateforme/source-only ; aucun canal manuel ou externe ne doit entrer dans le chemin d'envoi Gmail groupé.

### LOT-05 — Recruteur, ATS et traitement des candidatures

- **REC-ATS-01 :** recevoir une candidature liée à une offre propre, voir le candidat et l'offre exacte, ouvrir lettre et CV, enregistrer la consultation, vérifier que Talent voit « Vu ».
- **REC-ATS-02 :** faire avancer le pipeline de `SUBMITTED` à `ACKNOWLEDGED`, `INTERVIEW`, `OFFER` ou `REJECTED` ; tester les dates d'entretien, la source de décision et le reflet côté Talent.
- **REC-ATS-03 :** tester toutes les colonnes, filtres et compteurs, y compris statuts sans colonne actuelle ; aucune candidature ne doit devenir invisible.
- **REC-ATS-04 :** tester Valider/Refuser/Relancer avec modèle, signature/pied de mail, destinataire, objet, contenu, preuve Gmail et absence de double envoi après timeout.
- **REC-ATS-05 :** tester candidat d'un autre recruteur, offre étrangère, CV non partagé, lien expiré/révoqué et accès PDF non autorisé.

### LOT-16 — Gmail et communications

- **GMAIL-T-01 Talent OAuth :** scope send-only, consentement, refresh, révocation, mauvais compte et déconnexion.
- **GMAIL-T-02 Candidature :** expéditeur, destinataire, sujet, lettre, CV PDF ciblé, pied de mail marketing HTML + texte, image et URL de promotion, messageId/threadId et retry sans double envoi.
- **GMAIL-R-01 Import entrant :** connexion Recruteur, 25 résultats maximum, fenêtre 90 jours, PDF joint, expéditeur, objet, thread, doublon, pièce illisible, non-PDF, fausse candidature et pièce jointe manquante.
- **GMAIL-R-02 Affectation :** correspondance automatique exacte, cas ambigus, aucun match et file « À affecter » persistante et visible dans le bon compte Recruteur.
- **GMAIL-R-03 CV entrant :** bouton CV depuis la liste, récupération Gmail, MIME PDF, nom de fichier, pas de cache public, accès refusé pour un autre recruteur.
- **GMAIL-R-04 Réponse marketing :** acceptation, refus, relance ; vérifier pied de mail, identité expéditrice, personnalisation entreprise, contenu FR/EN si disponible, messageId et synchronisation du statut.
- **GMAIL-R-05 Déconnexion/reprise :** access token expiré, refresh token révoqué, Gmail déconnecté après import, retry d'import, reprise après erreur partielle.
- **COMM-EMAIL-01 :** déterminer si une signature marketing configurable/campagne e-mail est un produit distinct ; ne pas considérer le pied de mail statique actuel comme une campagne marketing complète.

### Parcours transverse T1 — De l'offre à la décision

Créer une offre synthétique Recruteur → la rendre visible à un Talent → le Talent importe/optimise son CV → choisit Gmail, WhatsApp ou plateforme externe → effectue et confirme son action → le bon document est accessible au recruteur → le recruteur qualifie, consulte, contacte, planifie un entretien et décide → l'état et le message reviennent au Talent → contrôle d'accès par un autre recruteur → retry/erreur partielle → nettoyage strict des IDs du run.

Le scénario doit être exécuté par canal séparément, puis dans un parcours comparatif. Aucun message, candidature ou e-mail réel ne doit partir pendant la recette ; utiliser des doubles fournisseurs et destinataires `.invalid`.

## 10. Priorité des écarts avant de déclarer ces fonctions vertes

| Priorité | Écart / risque | Condition de clôture |
|---|---|---|
| P1 | Les exports ATS et Optimized ont le même constructeur PDF et le même contenu de sections actuellement observé | Décision produit explicite + tests de sortie PDF et différence attendue |
| P1 | Les recommandations CV Intelligence ne sont pas démontrées visibles et validables dans le parcours canonique | UI d'acceptation/refus + recette de non-invention et provenance |
| P1 | WhatsApp crée un lien CV mais pas de ligne Application, donc pas de suivi ATS automatique | Décider le pont de suivi ; tester enregistrement et statut ou expliquer clairement la limite |
| P1 | Normalisation WhatsApp centrée Cameroun dans ce chemin | Tests et règles de numérotation par pays supporté |
| P1 | Import Gmail non affecté : non visible dans la liste standard qui filtre les offres possédées | File d'intake « À affecter » persistante et scoping du propriétaire |
| P1 | Autorisation pièce jointe Gmail sans recruiterJobId ne vérifie pas le propriétaire/intake de la candidature | Lier chaque import au recruteur/compte mailbox et tester deux tenants |
| P1 | Emails de décision envoyés avant persistance du statut, sans preuve durable du message sur la candidature | Idempotence/outbox, persistance messageId et reprise sans double envoi |
| P1 | Statuts ACKNOWLEDGED/REJECTED non affichés comme colonnes Kanban | Visibilité/traitement vérifiés sur chaque statut |
| P1 | GET de traitement peut marquer en bloc toutes les candidatures SUBMITTED comme ACKNOWLEDGED | Définir et tester précisément l'événement déclencheur du statut « Vu » |
| P2 | Pied de mail marketing statique sans signature configurable ni campagnes démontrées | Clarifier la promesse attendue et tester les templates réellement livrés |
| P2 | Candidatures externes non confirmées automatiquement au retour du promoteur | Définir l'étape manuelle et éviter tout faux statut |

## 11. Sources code et décisions consultées

- `app/talent/cvs/page.tsx` — CV Builder + ATS canonique.
- `app/api/talent/cv/import/route.ts`, `app/api/talent/cv/export/route.ts`, `app/api/talent/cv/payment/route.ts` — extraction, export et paiement.
- `lib/applicationCv.ts`, `lib/applicationEngine.ts` — CV ciblé et choix du canal.
- `components/JoblyOfferFeed.tsx` — WhatsApp manuel et plateformes externes.
- `app/api/cv-share/route.ts`, `app/api/cv-share/[token]/route.ts`, `app/api/cv-share/[token]/pdf/route.ts`, `components/CvShareView.tsx` — partage CV.
- `lib/candidateGmail.ts`, `app/api/applications/[id]/submit/route.ts` — Gmail Talent et e-mail de candidature.
- `lib/gmailServer.ts`, `app/api/recruiter/gmail/import/route.ts`, `app/api/recruiter/gmail/attachment/route.ts`, `app/api/recruiter/applications/route.ts` — import Gmail Recruteur.
- `app/recruiter/candidatures/page.tsx`, `app/recruiter/ats/page.tsx`, `components/RecruiterATS.tsx`, `app/api/recruiter/applications/[id]/route.ts` — traitement et statuts.
- `lib/viralityService.ts`, `app/api/recruiter/gmail/send/route.ts` — modèles d'e-mail et pied de mail promotionnel.
- `Statut.md` — décisions historiques, notamment CV→ATS, optimisation CV IA, règle de priorité des décisions Recruteur, redirection externe et WhatsApp Auth reporté.
- `ATS-DOCUMENTATION.md` — états et workflow historique du Recruiter ATS.
- `docs/e2e/MASTER-RECETTES-FONCTIONNELLES.md`, `docs/e2e/CONTINUITE-RECETTE-E2E.md` — programme E2E actuel.

**Limite de cette entrée :** audit statique du code et des décisions documentées à ce SHA. Aucun message WhatsApp/e-mail réel, aucun appel fournisseur, aucune écriture JOBLY-PROD, aucune importation Gmail runtime et aucun test de fuite inter-recruteurs n'ont été exécutés.
