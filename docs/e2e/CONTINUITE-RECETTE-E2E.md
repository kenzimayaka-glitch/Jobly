> ## ÉTAT MAÎTRE ACTUALISÉ — V2.195 — 10 novembre 2026
>
> **Précision UX et sécurité du matching gratuit — complète et précise la V2.194 :**
> - Pour un recruteur gratuit, les cinq cartes de matching présentent des aperçus de profils **visuellement floutés et anonymisés**. Le floutage doit être évident sur desktop et mobile ; aucun nom, photo réelle, CV, identifiant, coordonnée ou détail personnel ne doit rester lisible.
> - **Seuls les scores de matching restent nets et lisibles** (et, si affiché, le rang 1 à 5). Le recruteur gratuit ne dispose d'aucun moyen visible ou fonctionnel d'ouvrir un profil : aucun lien, bouton de consultation, aperçu au survol, action clavier, navigation de détail ou téléchargement ne doit être proposé ou fonctionner.
> - Le floutage est un traitement de présentation, pas une protection de sécurité : ne jamais transmettre au navigateur les vraies données ensuite masquées par CSS, canvas ou composant UI. Les cartes gratuites utilisent des placeholders/silhouettes non identifiants ; la réponse serveur ne contient que le score et les métadonnées non identifiantes strictement nécessaires.
> - Les routes/API de profil, CV, recherche, exports, préchargements, pagination et caches doivent refuser l'accès tant que l'abonnement actif et l'entitlement correspondant ne sont pas validés côté serveur. Modifier une URL, appeler directement une API ou réutiliser un cache ne doit pas lever le verrou.
> - Un CTA d'abonnement distinct peut expliquer comment débloquer la fonctionnalité, mais il ne doit jamais exposer un profil ni rendre une carte floutée cliquable.
> - Avec abonnement actif et entitlement, les cinq profils autorisés deviennent consultables normalement ; révocation, expiration, annulation, suspension ou impayé reverrouille immédiatement la consultation.
>
> **Recettes supplémentaires :**
> - REC-MATCH-05 : vérifier visuellement le floutage des cinq cartes, sur desktop/mobile, avec score net et aucune donnée personnelle lisible.
> - REC-MATCH-06 : vérifier l'absence de lien, bouton, focus clavier, hover-preview, navigation ou téléchargement permettant d'ouvrir un profil pour un compte gratuit.
> - REC-MATCH-07 : inspecter réponses API, HTML/DOM, état client, préchargements, cache, pagination, recherche et exports ; aucune donnée réelle de profil ne doit être livrée au compte gratuit, même si l'interface est inspectée ou contournée.
>
> **Statut :** décision documentaire ; implémentation et recettes UI/API runtime encore À CODER / À EXÉCUTER. Aucun PASS n'est revendiqué.
>
> ---
>
> ## ÉTAT MAÎTRE ACTUALISÉ — V2.193 — 10 novembre 2026
>
> **Décision produit — accès aux cinq meilleurs talents :** dans la liste des talents correspondant à une offre, les **cinq profils les mieux classés par score de matching** sont une fonctionnalité réservée aux recruteurs disposant d'un abonnement Jobly actif incluant explicitement ce droit. Ils ne sont jamais consultables en version gratuite.
>
> - En version gratuite, afficher les scores de matching uniquement ; ne retourner ni afficher les identités, photos, CV, coordonnées, détails de profil ni autres données identifiantes des cinq talents premium. Le verrou doit être appliqué côté serveur/API, et pas seulement par masquage dans l'interface.
> - L'interface gratuite peut afficher un écran de verrouillage non révélateur indiquant que les cinq meilleurs talents sont réservés à un abonnement, avec présentation de l'offre d'abonnement/CTA. Aucun détail permettant de réidentifier ou déduire les profils verrouillés ne doit fuiter dans le HTML, les réponses API, les données préchargées ou les journaux client.
> - Un recruteur abonné ne voit ces cinq profils que si son compte possède un entitlement actif et valide correspondant à cette fonctionnalité. Un abonnement expiré, annulé, suspendu, impayé ou un plan sans ce droit doit être traité comme non éligible. L'interface et l'API doivent appliquer la même règle.
> - Le classement des cinq profils est calculé pour l'offre concernée, à partir du score de matching existant et des critères de pertinence autorisés. Le classement ne doit pas mélanger les offres, ni exposer des profils non publics/non consentis. En cas d'égalité, utiliser un ordre secondaire déterministe et documenté.
> - La règle porte sur la consultation des cinq meilleurs talents. Les autres profils et leurs actions restent soumis aux droits et règles d'accès déjà définis ; cette décision ne leur accorde aucun accès supplémentaire.
>
> **Scénarios E2E à ajouter à LOT-05 et LOT-08 :**
> - REC-CONV-06 : avec un compte recruteur gratuit, appeler directement les API et ouvrir l'interface de matching ; vérifier que seuls les scores individuels sont retournés et qu'aucune donnée personnelle/identifiante n'est retournée, même en contournant l'interface. Vérifier le message de verrouillage et le CTA abonnement.
> - REC-CONV-07 : vérifier qu'un abonnement actif avec entitlement donne accès aux cinq profils de l'offre précise, et que l'expiration, l'annulation, la suspension, le défaut de paiement ou un plan sans entitlement révoque immédiatement cet accès côté API et UI.
> - REC-CONV-08 : vérifier le calcul et l'ordre des cinq meilleurs talents, les égalités, la séparation entre offres, le consentement/visibilité des profils et l'absence de fuite via cache, pagination, HTML ou réponse API.
>
> **État d'implémentation :** décision documentée ; aucun changement de code applicatif ni test runtime n'a encore été effectué pour cette règle. Les scénarios sont À CODER / À EXÉCUTER, pas PASS.
>
> ---
>
> ## ÉTAT MAÎTRE ACTUALISÉ — V2.192 — 10 novembre 2026
>
> **Précision du résultat attendu après inscription et rapprochement du numéro :**
>
> - Lorsque le numéro saisi pendant l'inscription recruteur correspond, après normalisation, au numéro de contact WhatsApp enregistré sur l'offre d'origine, et que le contexte signé est valide, l'offre est automatiquement rattachée au compte et apparaît dans **Mes offres**. Elle devient administrable dans Jobly comme si le recruteur l'avait créée/publiée depuis son espace Jobly : consultation, modification autorisée, gestion de sa visibilité et réception/gestion des candidatures. Le recruteur ne doit pas devoir recréer manuellement son offre.
> - La provenance d'origine reste enregistrée pour l'audit (offre découverte/partagée via le parcours WhatsApp, identifiant d'offre source, date et contexte de partage). Dans l'expérience de gestion, cette offre est désormais une offre Jobly administrée par ce recruteur ; l'historique technique ne doit toutefois pas être falsifié.
> - La candidature du talent qui a déclenché le parcours apparaît automatiquement dans **Mes candidatures** du recruteur et est reliée à cette offre précise. Le CV partagé doit rester consultable dans Jobly et son PDF téléchargeable. L'enregistrement utilise une clé d'idempotence fondée sur l'offre, le talent et le contexte de partage : réouverture du lien, reprise d'inscription, retry réseau ou double clic ne créent ni une deuxième offre ni une deuxième candidature.
> - Le rapprochement réussi ne doit jamais relier les autres offres ayant simplement le même numéro par approximation : le contexte signé identifie l'offre précise qui a déclenché l'inscription. Les autres offres ne seront importées/associées que par une règle distincte, explicite et autorisée.
> - En cas de numéro différent, absent ou invalide, le compte recruteur peut exister, mais l'offre et la candidature déclencheuse ne sont pas rattachées à son espace. Aucun accès aux candidatures ou documents d'une autre offre n'est accordé.
>
> **Critères d'acceptation additionnels :**
> - REC-CONV-04 : après rapprochement valide, vérifier l'apparition de l'offre dans **Mes offres**, son administration depuis le compte recruteur et la conservation de sa provenance WhatsApp dans les données d'audit ; aucun nouvel enregistrement manuel de l'offre ne doit être nécessaire.
> - REC-CONV-05 : vérifier l'apparition unique du talent déclencheur dans **Mes candidatures**, le lien correct vers l'offre, l'accès CV et le téléchargement PDF ; répéter l'ouverture, l'inscription et les requêtes sans produire de doublons.
>
> **Rappel décisionnel :** pas d'OTP supplémentaire ; le déclencheur d'attribution reste l'égalité des numéros normalisés ET la validation du contexte Jobly signé. Cette décision ne transforme pas `wa.me` en accusé de livraison WhatsApp et ne transforme pas le lien CV en pièce jointe native.
>
> ---
>
# Jobly — Référence de continuité de la recette E2E

> ## ÉTAT MAÎTRE ACTUALISÉ — V2.194 — 10 novembre 2026
>
> **Correction de la règle premium — remplace explicitement la V2.193 :** la version gratuite peut consulter les **scores de matching uniquement** des cinq meilleurs talents ; elle ne peut jamais voir ni ouvrir leurs profils. L'abonnement Jobly actif avec l'entitlement correspondant est requis pour consulter les profils.
>
> **Règle globale à tous les recruteurs et à toutes les offres Jobly :**
> - Seuls les talents dont le score de matching est **>= 90 %** sont éligibles au classement.
> - Pour chaque offre, classer les talents éligibles par score décroissant et retenir au maximum les **cinq meilleurs**. Le classement est propre à l'offre ; les égalités sont départagées de manière déterministe.
> - **Version gratuite :** afficher uniquement le score de matching de chacun des talents classés. Ne transmettre ni nom, photo, identifiant de profil, CV, coordonnées, historique, détails personnels ou autre donnée permettant leur identification. Aucun profil ne peut être ouvert. Les scores sont visibles parce qu'ils constituent l'accroche commerciale.
> - **Abonnement actif + entitlement :** autorise l'ouverture des profils des cinq talents. Expiration, annulation, suspension, impayé ou plan sans le droit requis verrouille les profils.
> - Appliquer la règle côté serveur/API sur toutes les surfaces Jobly : matching, découverte, espace recruteur, parcours WhatsApp, recherche, pagination, exports, préchargements et caches. Aucun profil verrouillé ne doit être transmis au navigateur gratuit.
> - Cette règle est identique pour tous les recruteurs, que l'offre provienne du parcours WhatsApp ou ait été créée directement sur Jobly.
>
> **Recettes obligatoires :** seuils 89,99 %, 90 % et >90 % ; classement top 5 par offre ; compte gratuit voit les scores mais aucune identité/profil ; abonnement actif déverrouille les profils ; expiration/révocation/suspension/impayé reverrouille ; absence de fuite dans HTML/API/cache/pagination/recherche/export ; répétition sur toutes les surfaces et tous les parcours. Statut : À CODER / À EXÉCUTER, aucun PASS runtime revendiqué.
>
> ---
>


> ## ÉTAT MAÎTRE ACTUALISÉ — V2.191 — 10 novembre 2026
>
> **Rectification de périmètre :** dans le parcours de conversion du recruteur décrit dans l'échange du 10 novembre, la destination est **Jobly**. La mention de « NAXA » était une erreur de formulation de l'assistant ; elle ne constitue ni une décision produit ni une dépendance technique. Les liens de CV, l'espace de consultation, le matching des talents, la création du compte et le pipeline décrits ci-dessous appartiennent à Jobly.
>
> **Parcours de candidature Talent via WhatsApp — décision fonctionnelle confirmée par le propriétaire produit :**
>
> 1. Le candidat consulte une offre dont le canal de candidature est WhatsApp uniquement. Avant de préparer les documents, J'IA lui présente les choix de CV : (a) utiliser le CV normal sans transformation ; (b) optimiser le CV pour la lisibilité et les filtres ATS ; (c) améliorer le contenu et la rédaction ; (d) cumuler optimisation ATS et amélioration. Les transformations ne doivent jamais inventer de diplôme, expérience, compétence, date, résultat ou autre fait. Le candidat peut prévisualiser et valider le CV préparé ; la version normale reste disponible.
> 2. J'IA vérifie les exigences de l'offre. Si une lettre de motivation est demandée, J'IA rédige une lettre ciblée sur l'entreprise et le poste, la génère en PDF, la présente au candidat pour relecture et validation explicite. Aucune candidature ne peut partir avec une lettre non validée. Si la lettre n'est pas demandée, cette étape est omise.
> 3. Le bouton **Postuler** reste indisponible tant que le CV choisi/préparé n'est pas prêt et validé et, lorsque requise, tant que la lettre PDF n'est pas prête et validée. Le candidat peut revenir modifier son choix ou ses documents avant l'envoi.
> 4. Au clic sur **Postuler**, Jobly ouvre WhatsApp vers le numéro de téléphone de candidature de l'offre, avec un message personnalisé selon l'entreprise, l'intitulé du poste et l'identité du candidat. Le message présente le CV sous un nom de fichier lisible, par exemple `CV_BITSEKI_Bienvenu.pdf`, mais cette désignation est un lien sécurisé vers l'espace CV hébergé par **Jobly**, pas une pièce jointe PDF native. Le lien doit donner accès au CV validé et, si applicable, à la lettre validée, selon les permissions et la durée de validité du partage. L'interface ne doit pas prétendre que WhatsApp a envoyé le message : l'envoi final reste effectué par le candidat dans WhatsApp.
> 5. Le recruteur qui ouvre le lien est conduit vers l'espace Jobly associé au partage. Une interface centrale animée et visible indique le nombre de profils correspondant à l'offre, avec texte/illustration de fond et deux choix : **Fermer** ou **Voir**. Fermer masque l'interface et laisse consulter le CV reçu et le télécharger. Voir ouvre la liste publique des talents correspondant à l'offre, avec scores de matching. Les données affichées doivent respecter les paramètres de visibilité et le consentement des talents.
> 6. Avant authentification, le recruteur peut consulter les profils et scores autorisés, mais ne peut exécuter aucune action de recrutement. Toute tentative d'action le redirige vers l'accueil/inscription, en conservant un contexte d'attribution signé, opaque et à durée limitée.
> 7. Après inscription, Jobly récupère le contexte de provenance et rapproche le numéro de téléphone normalisé saisi par le recruteur pendant l'inscription du numéro normalisé figurant sur l'offre d'origine. **La règle demandée est une égalité des numéros, pas un OTP supplémentaire.** La comparaison doit être stricte après normalisation internationale (indicatif pays, suppression des séparateurs, format E.164) ; ne pas comparer des chaînes brutes ni supposer le Cameroun pour tous les pays. Le contexte signé identifie l'offre précise ; le numéro concordant confirme que le compte utilise le même numéro que celui publié sur cette offre. Le compte reçoit alors le rattachement de l'offre et la candidature déclencheuse dans son espace Recruteur, comme une offre/candidature suivie sur Jobly.
> 8. Si le numéro est absent, invalide ou différent, ne pas rattacher automatiquement l'offre ni ses candidatures au compte. Conserver le contexte et proposer une procédure de résolution sans exposer les données privées. Si plusieurs offres partagent le numéro, le contexte d'origine doit déterminer l'offre concernée ; le numéro seul ne doit jamais servir à choisir arbitrairement.
> 9. Une fois l'offre et la candidature rattachées, Jobly propose au recruteur soit d'importer ses autres candidatures depuis Gmail, soit de piloter le processus complet de recrutement dans Jobly. Le choix peut être reporté ; il ne doit pas bloquer l'accès à la candidature qui a déclenché l'inscription. L'import Gmail exige une file d'intake visible, une association explicite ou assistée aux offres, une isolation stricte par recruteur et une déduplication.
>
> **Précisions de sécurité et de vérité produit :** l'égalité des numéros ne prouve pas à elle seule la propriété juridique du numéro ; elle est ici la règle d'association explicitement choisie. L'attribution doit donc aussi exiger un jeton de provenance signé, à usage contrôlé, lié à l'offre et au partage CV. Aucun autre compte ne doit pouvoir réclamer l'offre en devinant son numéro. Les profils publics doivent être limités aux informations publiables ; les actions (contacter, télécharger un CV complet, changer un statut, exporter) restent derrière authentification et contrôle de rôle. Les consultations et téléchargements doivent être journalisés. La fermeture de l'animation ne doit pas empêcher la consultation du CV.
>
> **Limite technique WhatsApp à conserver dans les critères d'acceptation :** le parcours utilise un lien HTTPS Jobly rendu dans le message sous un libellé de type nom de PDF. Ce n'est pas une pièce jointe native WhatsApp. Ne pas promettre un envoi automatique de fichier : l'utilisateur valide et envoie le message depuis WhatsApp. La route de partage doit néanmoins afficher un nom de document clair, proposer l'aperçu et le téléchargement PDF réel depuis Jobly.
>
> **Scénarios E2E à ajouter au catalogue / LOT-02, LOT-04 et LOT-05 :**
> - CV-WA-01 : présenter les quatre choix CV (normal, ATS, amélioration, cumul), vérifier la conservation du CV source, l'absence de faits inventés, l'aperçu et la validation explicite.
> - CV-WA-02 : offre exigeant une lettre ; génération PDF ciblée, aperçu, refus/modification, validation et blocage de Postuler avant validation.
> - CV-WA-03 : offre sans lettre ; vérifier que l'étape est omise et que Postuler ne s'active qu'après validation du CV.
> - APP-WA-04 : construire le message avec numéro destinataire, entreprise, poste et candidat ; lien libellé `CV_NOM_PRENOM.pdf` ; vérifier qu'il pointe vers Jobly et non vers un faux fichier PDF.
> - APP-WA-05 : ouvrir le partage côté recruteur, animation/nombre de matching, Fermer puis lecture/téléchargement du CV ; Voir puis liste des talents et scores ; aucune action anonyme ne doit réussir.
> - REC-CONV-01 : tenter une action anonyme, inscription avec numéro identique normalisé, retour sur l'offre précise, rattachement de l'offre et de la candidature déclencheuse.
> - REC-CONV-02 : numéros différents, invalides, absents, indicatifs/pays, formats avec séparateurs et plusieurs offres partageant le même numéro ; aucun rattachement ambigu ou inter-tenant.
> - REC-CONV-03 : après rattachement, choix Gmail ou gestion complète Jobly ; import simulé, déduplication, file d'intake, affectation d'offre, ouverture de CV et progression de statut.
>
> **État d'implémentation :** décision produit documentée ; aucune modification de code applicatif et aucun test runtime de ce nouveau parcours n'ont encore été effectués. Les routes CVShare/WhatsApp et Gmail/ATS existantes ne prouvent pas l'exécution de cette chaîne. Les scénarios ci-dessus sont À CODER / À EXÉCUTER, pas PASS.
>
> **Garde-fous inchangés :** travail documentaire sur `e2e/recette` uniquement ; JOBLY-E2E autorisé pour les futures recettes isolées ; JOBLY-PROD, merge de PR #266, déploiement et envois réels interdits dans cette étape. Le numéro de téléphone doit être normalisé côté serveur et testé avec des données synthétiques.


> ## ÉTAT MAÎTRE ACTUALISÉ — V2.190 — 10 novembre 2026
>
> **Addendum d'audit des parcours CV ATS / WhatsApp / Gmail / Recruteur :** créé dans `docs/e2e/AUDIT-CV-ATS-WHATSAPP-GMAIL-RECRUTEUR-2026-11-10.md` (commit `f42c0d0aba148fbd956a6fd55da291ad0be73dbe`). Le catalogue `docs/e2e/MASTER-RECETTES-FONCTIONNELLES.md` est complété par une matrice et des scénarios atomiques sur LOT-02, LOT-04, LOT-05 et LOT-16 (commit `d73e732c03683fe7f8fd3f4f90f7f560f9420177`). Les 19 lots et leurs anciennes preuves restent conservés.
>
> **Verdict explicite :** les recettes précédentes ne couvraient pas suffisamment les promesses détaillées de conversion/amélioration CV ATS, adaptation à une offre, candidature WhatsApp avec clic Recruteur sur CV, marketing/footer d'e-mails, import de candidatures Gmail et processus de recrutement multi-étapes. Des contrats statiques existaient, mais aucun E2E runtime de ces chaînes complètes n'est prouvé à cette date.
>
> **Constats code — CV :**
> - La surface canonique observée est `/talent/cvs` : import PDF, extraction déterministe + CV Intelligence, édition, sauvegarde profil/original privé, vues Jobly/ATS et téléchargement.
> - L'interface calcule un score de lisibilité/complétude ; il ne doit pas être présenté comme une validation par un ATS externe.
> - L'API d'export fait passer les services ATS et OPTIMIZED par le même constructeur `buildPdf(cv)` ; la sélection change le paiement et le nom de fichier, pas le moteur PDF observé. Le PDF exporté ne rend actuellement que profil, compétences, expérience et formation en plus de l'identité/contact. Différence et complétude à prouver.
> - Le CV Intelligence renvoie des suggestions/forces/écarts, mais la page canonique ne démontre pas leur exposition et leur acceptation/refus. Le tri `lib/applicationCv.ts` est une adaptation déterministe par mots-clés, distincte d'une réécriture complète IA.
>
> **Constats code — WhatsApp et plateformes :**
> - Le flux WhatsApp candidat ouvre `wa.me` avec un message prérempli et un lien CVShare à token de 30 jours, révocable ; le candidat doit envoyer lui-même le message. Il ne crée pas une ligne `Application`, donc ne rejoint pas automatiquement l'ATS et le suivi « Mes candidatures ».
> - Le chemin de normalisation WhatsApp observé est centré sur les numéros camerounais `237` ou locaux à 9 chiffres ; couverture des autres pays à vérifier.
> - Aucun webhook/endpoint métier WhatsApp Business entrant n'a été trouvé dans les routes auditées ; `fetchFromWhatsApp()` renvoie une liste vide. Ne pas confondre ce manque avec les routes OTP WhatsApp d'authentification, historiquement reportées pour coûts/fournisseur non connecté.
> - Les offres EXTERNAL ouvrent le site du promoteur et passent le contexte à J'IA ; aucun adaptateur Jobly de soumission automatique ni callback universel de confirmation n'est observé. Ne jamais marquer une candidature externe envoyée sans preuve.
>
> **Constats code — Gmail, marketing et Recruteur :**
> - Gmail Talent est un flux sortant `gmail.send` : candidature revue, PDF ciblé en pièce jointe, message/thread enregistrés ; le corps e-mail contient un pied promotionnel Jobly (visuel et lien). Ce scope ne prouve pas la lecture des réponses Gmail.
> - Gmail Recruteur propose un import manuel de 25 messages max avec PDF reçus dans les 90 derniers jours. L'interface `/recruiter/candidatures` présente importer depuis Gmail, score ATS, bouton CV, lettre, Valider/Refuser. Les e-mails de décision incluent un pied « Recrutement géré via Jobly ».
> - Les imports sans offre reconnue peuvent être créés avec `recruiterJobId=null`, mais la liste standard filtre par les offres possédées : ces candidatures « À affecter » risquent de disparaître après import. La recette doit exiger une file d'intake propriétaire persistante.
> - La route de pièce jointe Gmail vérifie le propriétaire de l'offre lorsqu'elle existe ; pour `recruiterJobId=null`, le contrôle se réduit à « le recruteur possède au moins une offre ». L'appartenance au compte/import doit être durcie. C'est un défaut d'autorisation à contre-tester, pas une fuite inter-tenant runtime démontrée.
> - Les mails de décision sont envoyés avant le PATCH du statut ; le parcours n'enregistre pas de preuve messageId sur l'Application. En cas d'échec après envoi, le retry peut dupliquer l'e-mail.
> - Le Kanban déclare ACKNOWLEDGED/REJECTED mais n'affiche que quatre colonnes ; le GET de traitement peut marquer en bloc les candidatures SUBMITTED comme ACKNOWLEDGED. Les critères de statut « Vu » doivent être précisés.
> - « Signature marketing » : pieds promotionnels statiques présents sur certains e-mails, mais aucun éditeur de signature par compte ni moteur de campagne/newsletter n'est établi par les routes auditées. Clarifier le périmètre de cette promesse si elle désigne autre chose que le footer Jobly.
>
> **Décisions historiques conservées :** `Statut.md` distingue l'authentification WhatsApp (reportée pour coûts et fournisseur non raccordé) de l'ouverture manuelle WhatsApp pour postuler. Il demande aussi CV optimisé par IA, adaptation CV pour l'offre, suivi candidat/recruteur et priorité à la décision du Recruteur en cas de conflit. Ces décisions restent à tester et ne doivent pas être effacées.
>
> **Recettes ajoutées au backlog :** CV-ATS-01 à CV-ATS-08 ; APP-WA-01 à APP-WA-03 ; APP-EXT-01 ; APP-EMAIL-01 ; REC-ATS-01 à REC-ATS-05 ; GMAIL-T-01 à GMAIL-T-02 ; GMAIL-R-01 à GMAIL-R-05 ; COMM-EMAIL-01. Le scénario transversal exige désormais : offre → CV Master → conversion/adaptation approuvée → canal choisi → import/réception → clic CV → traitement Recruteur → communication → décision visible côté Talent.
>
> **Priorités :** corriger/arbitrer P1 l'export ATS vs Optimized, le raccord WhatsApp à Application si le suivi ATS est promis, la normalisation pays, la file Gmail non affectée et son isolation propriétaire, l'idempotence de mail de décision et la cohérence Kanban/statuts. Aucun test runtime, envoi réel, appel WhatsApp, import Gmail ou test d'accès croisé sur données JOBLY-E2E n'a été exécuté pendant cet audit. Ces points restent PARTIAL / À EXÉCUTER.
>
> **Garde-fous inchangés :** JOBLY-E2E uniquement, JOBLY-PROD interdit, aucune fusion de PR #266, aucun déploiement, aucun email/SMS/WhatsApp réel. La PR #266 reste brouillon vers `main`.


> ## ÉTAT MAÎTRE ACTUALISÉ — V2.189 — 10 novembre 2026
>
> **Refonte fonctionnelle globale des recettes :** catalogue maître créé dans [docs/e2e/MASTER-RECETTES-FONCTIONNELLES.md](./MASTER-RECETTES-FONCTIONNELLES.md), commit `ba80f705bda04e759f887748b3bcd4de35be2ef9`. Il définit 19 lots fonctionnels (LOT-00 à LOT-18), les parcours transversaux, les critères de preuve et les tests contradictoires. Les 11 anciens lots, leurs résultats et l'historique de ce document sont conservés ; le nouveau découpage les complète et les rattache sans les effacer.
>
> **Audit en trois passes effectué sur la branche `e2e/recette` au commit `d66091a5f372fdebe75356bcc5cfc1baf40007ba` :** inventaire de 1 632 entrées Git, 212 handlers API, 114 pages/layouts, 46 fichiers de tests et 66 migrations Supabase ; lecture des familles de tests et des parcours E2E, des workflows, du schéma de données et des routes fonctionnelles représentatives ; confrontation valeur utilisateur → UI/API/service/données, puis données/API → expérience, puis scénarios contradictoires (perte de réponse, doublons, concurrence, droits, échec partiel, changement de compte, hors-ligne, nettoyage interrompu). Le catalogue décrit les écarts établis et les recettes manquantes. Il ne prétend pas que chaque ligne des 1 632 fichiers a été relue individuellement.
>
> **Écart central confirmé :** le runner global runtime existant ne valide que l'accueil HTTP, Talent, Recruteur/Recruitment360 et l'inventaire Afrique en lecture seule. La majorité des tests actuellement regroupés en bulk sont des tests unitaires, statiques ou de contrat. Ils restent à conserver et ne deviennent pas des preuves E2E. Les parcours runtime avec écritures métier dédiées et nettoyage restent à concevoir/exécuter pour plusieurs domaines, notamment CV complet, candidatures groupées, décisions/exports Recruteur, J'IA, paiements, Mobile Money, Mobility, Events, Community/Campus, Partner, Admin et Offline.
>
> **Candidatures groupées :** capacité présente dans le code, panier/plafond et confirmation unique ; les envois de chaque candidature sont séquentiels dans l'implémentation actuelle. Aucune preuve runtime E2E de plusieurs candidatures n'a été obtenue. Ne pas appeler cela une soumission réellement parallèle.
>
> **Preuves CI au commit d'audit :** Jobly CI Typecheck & Build PASS ; gates J'IA, Mobile Money, Android, registre des sources Afrique et autres workflows recensés PASS. Le workflow `Verify offer pipeline` échouait à son test de garde parce que la regex détectait le texte `pnpm.cmd` dans un commentaire alors que le lanceur appelle directement le CLI Next via Node. Correctif du test de garde commité dans `dfb4320e5e7e8618ccd231c44a4046ddeaa73423` ; validé ensuite par `Verify offer pipeline` run #42871252928 (**SUCCESS**), incluant garde-fous Afrique, typecheck, build et smoke J'IA Watch B3.1. Le workflow standard `Jobly CI — Typecheck & Build` run #42871252136 était encore en cours au dernier contrôle ; ne pas le déclarer clos avant son résultat final. Le workflow Africa Shadow Crawl avait sa validation readiness PASS mais le job de crawl était SKIPPED : aucune collecte réseau réelle ne peut être revendiquée à partir de ce run.
>
> **Référence branche / gouvernance :** PR #266 toujours ouverte en brouillon vers `main`. `main` reste au SHA `979f2ccfec9258bc30989af18433cf6adb1b4698`. Aucun merge, aucune mise en production et aucune opération JOBLY-PROD n'ont été effectués dans cette refonte. JOBLY-E2E (`ofqqrryamslxoqkklraw`) demeure le seul environnement de recette autorisé.
>
> **Prochaine priorité de travail :** valider le correctif de garde en CI, réutiliser les suites statiques existantes sans les rejouer inutilement, puis construire et exécuter le parcours produit transversal T1 du catalogue : Talent/profil-CV → offre locale/Afrique → préparation et confirmation d'une candidature groupée → boîte Recruteur → décision → même résultat visible côté Talent, avec fournisseurs simulés, persistance vérifiée et nettoyage du seul `runId`. Après ce parcours, avancer lot par lot selon les 19 recettes. L'objectif est maintenant de livrer la valeur utilisateur manquante démontrée par les recettes, pas d'ajouter des couches d'infrastructure sans bénéfice produit.
> ## ÉTAT MAÎTRE ACTUALISÉ — V2.188 — 10 novembre 2026
> ## ÉTAT MAÎTRE ACTUALISÉ — V2.182 — 9 novembre 2026
> ## ÉTAT MAÎTRE ACTUALISÉ — V2.171 — 9 novembre 2026
>
> **Dernières preuves LOT-01 :** Le run runtime du 9 novembre à 12:24:48 (SHA `e52448af3e6a0c46f2af558db6028a00294d2696`) confirme OTP 4/4 PASS, Google OAuth simulé 4/4 PASS et récupération 3/3 PASS. Le multi-appareils a passé son préflight (fixture `talent-multidevice`, 0 appareil actif initial), puis échoué avec `page.evaluate: Execution context was destroyed, most likely because of a navigation` avant les contrôles A/B. Le statut global est FAIL ; aucune preuve de révocation B=401/A=200 n'est disponible. `cleanup=NOT_REQUIRED`, `preexistingDeviceRowsUnchanged=true`, mais `remoteAuthDeviceStateMayBeModified=true` : ne pas assimiler ce rapport à une preuve de session temporaire créée/nettoyée. Correctif du harnais E2E préparé sur `e2e/recette` : capture du jeton via snapshot de contexte pour localStorage, retry de lecture pour sessionStorage pendant les navigations et verrou de non-régression. Commits `90f8611941f5548a8169d422a29743fa9e8834da` et `6ce4fdb18d2123b1ef27a36fab0227eb6cd03598`. Le correctif n'a pas encore été exécuté localement ; LOT-01 reste PARTIAL / NON CLOS en attente d'un nouveau rapport runtime PASS.
> **`main` :** SHA `979f2ccfec9258bc30989af18433cf6adb1b4698`, inchangé. **PR #266 :** ouverte, brouillon, non fusionnée. **PR #267 :** ouverte, brouillon, non fusionnée.
> **Environnement :** JOBLY-E2E uniquement pour les migrations, lectures SQL et contrôles Storage ; aucun accès JOBLY-PROD et aucun déploiement. Les tests HTTP CI tournent sur un serveur Next.js de build local au runner avec configuration Supabase fictive, jamais sur le site de production.
>
> **Important — instructions historiques neutralisées :** les instructions plus anciennes de ce document qui autorisaient ou demandaient une réinitialisation des mots de passe, une recréation de fixtures ou l'exécution de `e2e/reset-existing-fixture-passwords.mjs` sont obsolètes et ne doivent pas être suivies. Le script local `e2e/reset-existing-fixture-passwords.mjs` reste à préserver et ne doit pas être exécuté. Aucune fixture partagée ne doit être modifiée sans nouvelle autorisation explicite et spécifique.
>
> **Nouvelle méthode de continuité :** ce fichier Markdown dans Git est la seule référence maître. Chaque nouvelle conversation Jobly doit le lire intégralement avant d'agir. Après chaque réponse consacrée à la recette E2E, l'assistant met à jour ce fichier dans la même séquence de travail, sur `e2e/recette`, puis fournit le commit GitHub vérifiable et le chemin du fichier. Chaque entrée distingue les faits établis, leur preuve, les actions non exécutées et les blocages ; aucun résultat non testé ne peut être présenté comme PASS. Ne pas passer par la Bibliothèque/Word pour cette continuité.
>
> **Garde-fous actuels :** les consignes historiques de réinitialisation des mots de passe et de recréation/restauration des fixtures partagées restent neutralisées. L'ancien provisionneur global de fixtures reste désactivé et ne doit pas être réactivé. Seul le nouveau provisionneur local et isolé décrit au §146 est autorisé, strictement pour JOBLY-E2E et après ses précontrôles. Ne pas exécuter `e2e/reset-existing-fixture-passwords.mjs`, ne pas restaurer de secret/runtime et ne pas lancer `scripts/e2e-local-recipe.mjs` tant que les prérequis effectifs du préflight, les fixtures et l'isolation n'ont pas été revus.
> **État courant et ordre des lots :** E2E-001 PASS statique 6/6 ; LOT-00 PASS clos. LOT-01 : Auth de base 12/12, API 40/40, UI publique 14/14, UI authentifiée 29/29, régression Auth 30/30 acquis. Dernier runtime Auth avancée : build/serveur PASS ; OTP 4/4, Google 4/4, récupération 3/3 PASS. Le garde réseau a intercepté la navigation Google réelle avant réseau. Seul le multi-appareils reste BLOCKED sur 3 appareils actifs préexistants ; aucune session ni donnée n'a été modifiée. Pour clôturer : fixture distincte explicitement autorisée avec au plus un appareil actif préexistant, ou décision écrite de périmètre excluant ce contrôle. Ne pas révoquer les appareils existants.


## AUDIT CIBLÉ — CANDIDATURES GROUPÉES / SOUMISSION MULTIPLE — 10 novembre 2026

**Question auditée :** la recette E2E avait-elle prévu de démontrer qu'un candidat peut postuler à plusieurs offres en une même opération ou simultanément ?

### Verdict

- **Fonction produit existante : OUI.** Le flux Talent comporte un panier de candidatures groupées, un plafond UI/plan et une revue finale avant confirmation.
- **Préparation d'un lot : OUI.** `POST /api/applications/batch` crée un `ApplicationBatch` et ses `ApplicationBatchItem`, avec une limite de 20 offres et les contrôles de quota bulk/hebdomadaire. Le test statique dans `scripts/talent-cv-application-regression.test.mjs` vérifie la portée propriétaire, le plafond, les quotas et les états du lot.
- **Soumission réellement simultanée : NON dans le code UI observé.** `components/JoblyOfferFeed.tsx::submitBulkApplications` parcourt `preparedBulk` avec une boucle `for...of` et appelle successivement `POST /api/applications/:id/submit`. C'est une action groupée côté candidat, mais les envois sont séquentiels, pas lancés en parallèle par `Promise.all`.
- **Recette E2E runtime de plusieurs candidatures : NON PRÉVUE / NON PROUVÉE.** Le LOT-02 runtime courant est GET-only et exclut le bulk-check, la préparation et la soumission. La deuxième passe documentaire prévoit une seule candidature synthétique non envoyée, avec vérification de persistance et nettoyage, sans Gmail/SMS ni candidature réelle.
- **Ancien parcours croisé Talent → Recruteur : UNE seule candidature.** `e2e/authenticated-role-smoke.mjs` prépare un seul objet via `POST /api/applications`, le vérifie dans les espaces Talent et Recruteur, fait vérifier les transitions métier, puis nettoie cette candidature et l'offre synthétiques. Il ne couvre pas `ApplicationBatch`, un panier multi-offres, une soumission en lot, les échecs partiels ou la concurrence.
- **La recette Afrique bulk actuelle : hors sujet pour cette capacité.** Elle valide l'ingestion/traitement et la visibilité de deux offres dans le flux Talent ; elle ne crée ni candidature ni batch.

### Sources de code examinées

- `app/api/applications/batch/route.ts` : création/liste/mise à jour de lot ; plafond 20 ; contrôles de quotas ; insertion `ApplicationBatchItem` en `DRAFT`.
- `app/api/applications/bulk-check/route.ts` : vérification des quotas avant confirmation.
- `components/JoblyOfferFeed.tsx` : constitution du panier, préparation des candidatures une par une, revue finale et soumission séquentielle via les routes individuelles.
- `app/api/applications/[id]/submit/route.ts` : soumission individuelle, verrou d'état `SUBMITTING`, envoi Gmail et enregistrement de la preuve. Cette route ne doit pas être appelée contre de vraies adresses dans une recette.
- `scripts/talent-cv-application-regression.test.mjs` : contrat statique du batch ; aucune exécution runtime multi-candidatures.
- `e2e/runtime-lot02-readonly.mjs` : lecture seule ; aucune préparation/soumission.
- `e2e/authenticated-role-smoke.mjs` : une candidature synthétique unique, jamais envoyée, et nettoyage vérifié.

### À ajouter au programme E2E — LOT-02B « Candidatures groupées »

Prévoir un scénario runtime JOBLY-E2E indépendant, avec offres et candidatures synthétiques propres au run, et nettoyage DB vérifié :
1. Sélectionner plusieurs offres éligibles et vérifier la limite du panier (dont 0, 1, limite, limite+1) et les quotas.
2. Créer un batch ; vérifier le nombre, l'appartenance Talent, la correspondance exacte des offerId et l'état initial de chaque item.
3. Préparer plusieurs candidatures ; vérifier qu'une offre invalide ou un échec partiel ne corrompt pas le reste du lot.
4. Exercer le comportement réel de l'interface : une confirmation groupée, avec envois séquentiels comme dans le code actuel, et statuts `SENDING`, `COMPLETED` ou `PARTIAL_FAILURE`.
5. Tester doublon de même offre, double clic/retry, deux requêtes concurrentes sur la même candidature et reprise après réponse partielle ; vérifier l'absence de double candidature et de double envoi.
6. Vérifier la liste Talent et la visibilité côté Recruteur pour chaque élément du lot.
7. Simuler le fournisseur d'envoi dans E2E : aucun appel Gmail réel, aucun e-mail/SMS externe ; vérifier les états de preuve et les erreurs.
8. Nettoyer toutes les candidatures, items, batches et offres créés par ce run, puis prouver leur absence en base.

**Critère d'interprétation :** la recette ci-dessus validera le parcours groupé actuel (confirmation unique, traitements séquentiels). Un vrai envoi simultané en parallèle serait un changement de comportement produit distinct ; il ne faut pas le déclarer supporté ni le tester comme acquis tant que le code UI reste séquentiel.

**État au moment de l'audit :** LOT-02B absent des runners et du balayage global ; aucune preuve runtime de candidatures groupées ou simultanées. Aucun envoi réel ni aucune mutation de données n'a été déclenché pendant cet audit.

## DÉCISION DE PILOTAGE — 10 novembre 2026 — LOT-01 différé, reprise LOT-02

**Décision opérateur :** ne plus répéter la recette Auth avancée du LOT-01 pour tenter de résoudre le même blocage réseau ; poursuivre le programme avec le LOT-02. Cette décision autorise une exception de séquencement pour l'avancement, mais ne transforme pas LOT-01 en PASS et ne clôt pas ses critères restants.

### État probant de LOT-01 à cette date

- OTP simulé : **PASS 4/4** dans le rapport runtime reçu.
- Google OAuth simulé : **PASS 4/4** ; la navigation vers Google a été bloquée avant tout accès réseau.
- Récupération du mot de passe simulée : **PASS 3/3**.
- Révocation multi-appareils : **BLOCKED / NON VALIDÉE**. Le rapport du 10 novembre à 00:59:04Z, SHA `dea887d4b1311d1206bd7c38f661676a9d8f0362`, échoue au premier appel réseau Supabase avec `TypeError: fetch failed`, avant obtention de la baseline et avant création de sessions par ce scénario. `cleanup=NOT_REQUIRED` et `remoteAuthDeviceStateMayBeModified=false`. La cause réseau exacte n'est pas démontrée ; aucune preuve ne permet d'attribuer cet échec à la logique de révocation.
- Verdict conservé : **LOT-01 PARTIAL / NON CLOS**. Ne pas relancer ce scénario dans le cadre du démarrage LOT-02. Le correctif de retry GET et de diagnostic ajouté après le SHA du rapport n'a pas été validé par une nouvelle exécution et reste non prouvé.

### Exception de séquencement acceptée

Les contrôles déjà acquis du socle Auth (connexions, sessions, API par rôle et UI authentifiée) sont réutilisés comme prérequis pratiques pour avancer sur Talent. Le point multi-appareils reste une anomalie différée à reprendre dans une campagne dédiée ; il n'est ni marqué PASS ni supprimé du périmètre de sécurité final. Cette exception de pilotage ne constitue pas une clôture formelle de la dépendance LOT-01.

### Reprise LOT-02 — Talent, offres, recherche et candidatures

**Première passe : lecture seule, fixture TALENT existante, JOBLY-E2E exclusivement.** Parcours à couvrir :
1. Connexion UI Talent avec la fixture existante et ouverture de l'espace Talent.
2. Lecture du profil et de la liste des candidatures existantes, sans modification.
3. Chargement des flux offres `scope=local` et `scope=africa` ; vérifier structure, compteurs, pays/source et cohérence entre éléments retournés et total annoncé.
4. Recherche/filtrage UI, ouverture d'une offre du flux, puis vérification que le détail correspond au même identifiant et à la même source.
5. Lecture du CV original : accepter uniquement `404/CV_NOT_FOUND` si aucun CV n'existe, ou `200` avec lien signé privé de 60 secondes si un original existe. Ne pas télécharger, remplacer ou supprimer le CV.
6. Lecture Career Journey et vérification des éléments de preuve visibles ; aucune écriture.

**Deuxième passe, séparée et non encore autorisée par cette entrée :** préparation d'une candidature synthétique appartenant au run, vérification de sa persistance et de son état candidat, puis nettoyage ciblé avec lecture de contrôle. Aucun envoi d'e-mail/Gmail, SMS ou candidature à un employeur réel. Ne pas lancer cette étape tant que son mécanisme de nettoyage et l'absence d'effet externe ne sont pas établis.

**Preuves LOT-02 :** les fichiers `scripts/external-application-assistant.test.mjs` et `scripts/talent-cv-application-regression.test.mjs` couvrent des contrats statiques ; ils ne remplacent pas le parcours runtime navigateur/API. Aucun nouveau résultat runtime LOT-02 n'est revendiqué par cette mise à jour.

### Garde-fous inchangés

JOBLY-E2E uniquement ; fixtures existantes uniquement ; aucun reset, rotation ou reprovisionnement de comptes ; aucun accès en écriture à JOBLY-PROD ; pas de modification de `main`, pas de merge, pas de déploiement. Après LOT-02, reprendre LOT-03 selon ses propres preuves et ne pas déclencher LOT-07 avant les deux parcours Talent/Recruteur.

---

## RÉSULTATS DE CAMPAGNE PARALLÈLE — 10 novembre 2026 — LOT-02 / LOT-03 / LOT-04

**Exécution opérateur reçue :** trois suites Node.js lancées simultanément depuis le worktree `Jobly-e2e-recette-lot01`, après préflight propre sur le SHA `24fda53f9e36b9dbbfe30e2ad28d6923129456cf`, branche de recette `e2e/recette`.

| Lot | Suite exécutée | PASS | FAIL | Exit code | Verdict |
|---|---|---:|---:|---:|---|
| LOT-02 Talent | `external-application-assistant.test.mjs` + `talent-cv-application-regression.test.mjs` | 31/31 | 0 | 0 | **PASS statique** |
| LOT-03 Recruteur / Recruitment 360 | `recruiter-role-regression.test.mjs` | 7/7 | 0 | 0 | **PASS statique** |
| LOT-04 Mission Afrique | `africa-p0.test.mjs` + `supabase-batch-query.test.mjs` + `p2-jobly-offer-watermark.test.mjs` | 16/16 | 0 | 0 | **PASS statique** |

**Bilan : 54 contrôles PASS, 0 FAIL, 0 skipped, 0 cancelled ; les trois processus ont retourné `EXIT_CODE=0`.** LOT-04 a émis un avertissement Node `MODULE_TYPELESS_PACKAGE_JSON` relatif au module TypeScript partagé ; il n'a pas fait échouer les tests et n'est pas classé comme anomalie fonctionnelle.

### Portée exacte — ne pas surclasser les lots

- Les trois commandes exécutées sont des tests automatisés de régression / contrats de code. Elles ne se sont pas connectées à JOBLY-E2E, n'ont pas exécuté de navigateur, n'ont pas créé d'offre ni de candidature, n'ont pas testé la persistance en base et ne valident pas une collecte ou ingestion réelle.
- LOT-02 : les contrats de sécurité CV, import/export, propriété, candidature, canaux externes et états sont **PASS statique**. Le parcours Talent runtime (session navigateur, offres locale/Afrique, recherche, détail, CV lié à la fixture et candidature de bout en bout) reste **À EXÉCUTER**.
- LOT-03 : les contrats de propriété recruteur, accès aux candidatures et autorisations Recruitment 360 sont **PASS statique**. Les scénarios runtime score, shortlist, documents, décision et export sur données E2E dédiées restent **À EXÉCUTER**.
- LOT-04 : les contrats de fraîcheur, dates de publication, dates limites, fallback de date, requêtes par lots et watermark sont **PASS statique**. La collecte multi-sources, la reprise, l'ingestion et la persistance de bout en bout restent **À EXÉCUTER**.
- Aucun changement de donnée JOBLY-E2E ou JOBLY-PROD n'est attribué à cette campagne ; aucun appel externe ni déploiement n'a été effectué sur la base des rapports transmis.

### Suite recommandée

1. LOT-02 runtime Talent sur fixture existante, en lecture seule d'abord ; séparer toute création de candidature synthétique et démontrer son nettoyage avant exécution.
2. LOT-03 runtime Recruteur sur fixture/données synthétiques propres au run, avec nettoyage et preuve en base.
3. LOT-04 runtime isolé sur jeu de sources strictement borné dans JOBLY-E2E ; ne jamais déclencher l'ingestion de Production pendant cette recette.
4. Maintenir LOT-01 **PARTIAL / NON CLOS** et son contrôle multi-appareils différé, sans bloquer les travaux ci-dessus.

**Aucun des lots 02, 03 ou 04 n'est déclaré globalement clos par ces seuls résultats statiques.**

---

## AUDIT DE SÉCURITÉ AVANT RECETTES RUNTIME PARALLÈLES — 10 novembre 2026

**Décision technique :** ne pas démarrer trois runners E2E runtime existants en même temps depuis le même worktree.

### Risques identifiés dans le code

- `e2e/run-authenticated-role-recipe.mjs` utilise actuellement un port fixe `3217`, construit puis démarre son propre serveur Next et l'arrête à la fin. Plusieurs instances concurrentes entreraient en collision sur le port et sur les artefacts `.next`.
- `e2e/authenticated-role-smoke.mjs` parcourt plusieurs rôles dans le même run ; le scénario Recruteur crée un brouillon d'offre synthétique (et le parcours contient des étapes de mutation/nettoyage). Il ne constitue pas un runner Recruteur strictement en lecture seule.
- Le chargement initial de `/jobs` appelle les GET des offres et candidatures et un POST `/api/applications/bulk-check` avec `selectedCount: 0`. Le bouton d'actualisation, lui, déclenche `POST /api/jobs/ingest/sources` puis un POST `mode=reprocess` ; ces deux actions doivent être interdites dans la recette Talent.
- La route `POST /api/jobs/ingest/sources` lance la collecte par défaut et peut créer ou mettre à jour des lignes Company/Job/JobOfferPipeline. Ses modes `reindex` et `reprocess` effectuent également des mises à jour. Ne jamais appeler cette route pendant la recette parallèle.
- Les endpoints de lecture Recruteur et Recruitment360 peuvent être vérifiés en GET ; ne pas envoyer d'action score, shortlist, document, décision ou e-mail tant qu'un jeu de données synthétique dédié au run et son nettoyage ne sont pas encadrés.
- Les authentifications des fixtures peuvent inscrire/actualiser des métadonnées de session Auth. Talent et Recruteur sont des comptes distincts, mais ces effets Auth doivent rester signalés dans les rapports.

### Séquence runtime sûre à préparer

1. LOT-02 : runner ciblé TALENT, navigation/offres locale et Afrique, détail, candidatures existantes, CV original et Career Journey ; intercepter tout POST ingestion et ne modifier aucun objet métier.
2. LOT-03 : runner ciblé RECRUITER, lecture du profil, offres, candidatures, liste Talent et espaces Recruitment360 ; GET uniquement, aucun brouillon, score, shortlist, décision, import Gmail ou envoi e-mail.
3. LOT-04 : audit en lecture seule des tables JOBLY-E2E `Job`, `JobHarvestCapture` et `JobOfferPipeline`, avec comptage par statut/source/pays et recalcul de fraîcheur ; aucune collecte, ingestion, réindexation, reprocess ou mutation.
4. Pour une future exécution simultanée, chaque runner devra disposer d'un port/build/report distinct ou partager explicitement un serveur unique ; les rapports ne doivent jamais se chevaucher. Tant que ces runners ciblés ne sont pas préparés et vérifiés, exécuter les parcours runtime en séquence plutôt que lancer les runners existants en parallèle.

**Statut :** audit du code effectué ; runners runtime parallèles spécialisés **NON PRÉPARÉS / NON EXÉCUTÉS**. Les 54 PASS précédents restent des PASS statiques seulement.

---

## RECETTES RUNTIME PARALLÈLES — runners isolés LOT-02 / LOT-03 / LOT-04 — 10 novembre 2026

**État :** scripts créés et relus sur `e2e/recette`; **aucune exécution runtime opérateur n'est encore prouvée**.

**Arrêt du serveur partagé après lecture des trois rapports :** exécuter `call e2e\\stop-readonly-runtime-server.cmd` depuis le worktree. Le script vérifie le PID enregistré, le type `node.exe` et le retour HTTP 401 du serveur local, puis ne termine que ce PID. Rapport d'arrêt : `artifacts\\e2e\\parallel-runtime-server-stop.json`.

**Dernier commit code des runners :** `aa12c03725a49700f3afa9446b318ee0fa7f5d3c`.

### Architecture d'exécution

- Un seul serveur Next de recette est construit puis démarré en mode production local sur `127.0.0.1:3217`. Les trois campagnes interrogent ce même serveur ; elles ne lancent pas trois builds/serveurs concurrents.
- Le lanceur refuse un worktree non propre, un SHA différent de `origin/e2e/recette`, un port 3217 déjà occupé, une URL Supabase autre que JOBLY-E2E, une fixture d'un autre projet ou une clé serveur qui échoue au probe REST en lecture seule.
- Avant le build, il exécute `node --check` sur les runners et `node --test scripts/runtime-readonly-lots.test.mjs` pour verrouiller les garde-fous.
- Les variables et fixtures sont chargées depuis le dépôt source passé en argument (par défaut Windows : `%USERPROFILE%\Jobly`). Aucun fichier de secrets n'est copié dans le worktree ni affiché dans les rapports.
- La clé privée/secret E2E n'est utilisée que dans le processus serveur et le contrôle REST LOT-04. Le runner LOT-04 envoie la clé dans `apikey` uniquement, pas en bearer token. Aucun secret n'est journalisé.
- Les trois runners écrivent dans des fichiers distincts : `lot2-runtime-readonly.json`, `lot3-runtime-readonly.json`, `lot4-runtime-readonly.json`, avec journaux process distincts.

### Commandes Windows

1. Synchroniser le worktree de recette propre sur `origin/e2e/recette`, puis lancer le serveur partagé depuis un CMD :

```cmd
cd /d "%USERPROFILE%\Jobly-e2e-recette-lot01" && git fetch origin && git checkout --detach origin/e2e/recette && e2e\start-readonly-runtime-server.cmd
```

Le script compile une fois, démarre le serveur local et écrit :
- `artifacts\e2e\parallel-runtime-server.json`
- `artifacts\e2e\parallel-runtime-server.log`
- `artifacts\e2e\parallel-runtime-server.pid.json`

N'ouvrir les trois campagnes que si le rapport serveur indique `status=PASS`, `build=PASS`, `localServer=PASS` et `anonymousProtectedApiStatus=401`.

2. Ouvrir trois CMD distincts, puis lancer une seule commande par fenêtre :

- LOT-02 : `call e2e\run-runtime-lot02-readonly.cmd`
- LOT-03 : `call e2e\run-runtime-lot03-readonly.cmd`
- LOT-04 : `call e2e\run-runtime-lot04-readonly.cmd`

### Périmètre strict de chaque campagne

**LOT-02 Talent**
- Auth réelle de la fixture TALENT JOBLY-E2E.
- GET profil, candidatures, flux local/Afrique, recherche, détail d'une offre, CV original et Career Journey.
- Aucun POST ingestion, aucun appel bulk-check, aucune création/préparation/envoi de candidature.
- Le GET du CV peut créer un lien signé temporaire de lecture ; le fichier n'est ni téléchargé ni modifié.
- Rapport : `artifacts\e2e\lot2-runtime-readonly.json`; journal : `lot2-runtime-readonly-process.log`.

**LOT-03 Recruteur**
- Auth réelle de la fixture RECRUITER JOBLY-E2E.
- GET profil, offres propres, candidatures avec `markViewed=0`, liste Talent et listes Recruitment360.
- Test GET d'un identifiant de recrutement non détenu : HTTP 403 attendu.
- Aucune création de brouillon, modification de statut, mise en shortlist, notation, décision, document, import Gmail ou envoi d'e-mail.
- Rapport : `artifacts\e2e\lot3-runtime-readonly.json`; journal : `lot3-runtime-readonly-process.log`.

**LOT-04 Mission Afrique**
- GET REST en lecture seule des tables `JobHarvestCapture` et `JobOfferPipeline` de JOBLY-E2E.
- Agrégations par statut, source, pays, code de rejet et calcul en mémoire de la fraîcheur depuis `publishedAt`, `discoveredAt` et `deadline`.
- Pagination bornée à 10 000 lignes par table ; si ce plafond est atteint, le rapport sort PARTIAL/BLOCKED sur la complétude, sans présenter les chiffres comme exhaustifs.
- Aucun appel aux sources externes, aucune collecte, ingestion, réindexation, reprocess, mise à jour ou suppression.
- Rapport : `artifacts\e2e\lot4-runtime-readonly.json`; journal : `lot4-runtime-readonly-process.log`.

### Limites et précautions

- LOT-02 et LOT-03 se connectent avec deux comptes fixtures distincts. Les sessions Auth peuvent actualiser des métadonnées d'appareil ; leurs rapports conservent donc `remoteAuthDeviceStateMayBeModified=true`. Aucune donnée métier n'est écrite.
- LOT-04 n'ouvre pas de session utilisateur ; `remoteAuthDeviceStateMayBeModified=false`.
- Ces recettes sont des contrôles **API runtime en lecture seule**, pas un test Playwright de tous les clics/écrans, ni une preuve de soumission de candidature, de shortlist, de décision, d'export ou d'ingestion.
- Si le port 3217 est occupé, arrêter et identifier uniquement le serveur Jobly connu ; ne pas lancer un `taskkill` générique sur tous les processus Node.
- Le serveur reste démarré après les trois campagnes ; ne pas relancer le build avant d'avoir terminé les trois rapports.
- JOBLY-PROD, `main`, merge et déploiement restent hors périmètre. LOT-01 reste PARTIAL et différé.

---

**Version :** 2.177
**Date de consolidation :** 9 novembre 2026  
**Dépôt :** `kenzimayaka-glitch/Jobly`  
**Branche de recette :** `e2e/recette`  
**PR de référence :** [#266](https://github.com/kenzimayaka-glitch/Jobly/pull/266) — ouverte, brouillon  
**Projet de test autorisé :** JOBLY-E2E — `ofqqrryamslxoqkklraw`  
**Environnement interdit :** JOBLY-PROD, ses données, ses clés, ses comptes et ses déploiements.

> Ce document est le point de reprise de référence. Il sépare les preuves effectivement obtenues, les scénarios présents dans le code mais non validés, les blocages locaux et les actions qui nécessitent l'accord de l'utilisateur. Il doit être mis à jour à chaque nouvelle exécution significative.


## 0. AUDIT DE CONTINUITÉ — MODE OPÉRATOIRE ACTIF ET PLAN DE PROGRESSION — V2.138

**Audit réalisé le 9 novembre 2026 à partir de la version distante de e2e/recette.** Cette section devient la première référence opérationnelle. Elle prévaut sur toute ancienne commande ou tout ancien statut dans les sections historiques ; celles-ci restent conservées pour la traçabilité, pas comme instructions de reprise.

### 0.1 Verdict de l'audit

Le correctif HTTP 503 et le smoke public/anonyme sont validés : browser-only PASS 14/14, build/serveur PASS et Playwright exit 0 (§115). Ne pas le rejouer sans changement pertinent.

Le smoke authentifié post-migration a obtenu **PASS 29/29** pour Talent, Recruteur et Partenaire (§123), avec API propres 200 et refus inter-rôles 403. Le retest renforcé du 9 novembre a ensuite prouvé le clic réel sur le bouton commun `/settings` : les trois rôles ont été déconnectés, redirigés vers `/` et ont obtenu HTTP 401 sur `/api/profile` (§128). **La porte UI authentifiée est PASS.** Le seul point de clôture encore ouvert pour LOT-01 est le périmètre Auth avancé décrit au §124.5 et §128.5.

Le document est volumineux et plusieurs sections apparaissent dans un ordre qui ne suit pas les numéros ; certains anciens snapshots LOT-00/LOT-01 restent visibles après des preuves plus récentes. Pour éviter toute ambiguïté :
- la clôture LOT-00 est celle des §§93.15 à 93.19 : **PASS / CLOS** ; les états antérieurs PARTIAL des sections 88 à 92 sont historiques et supersédés ;
- LOT-01 reste **PARTIAL / NON CLOS** malgré Auth 12/12 et API 40/40 ;
- le diagnostic structurel du §87 reste pertinent pour le runner global scripts/e2e-local-recipe.mjs (détail actualisé au §87.7) ;
- le prochain rapport demandé est uniquement le rapport du mode --browser-only décrit au §112.6.

### 0.2 Audit des deux runners : décision d'utilisation

**Runner ciblé — smoke public terminé :** e2e/run-authenticated-role-recipe.mjs en mode --browser-only a obtenu PASS 14/14 (§115). Ne pas le relancer sans changement pertinent. Le mode --role-browser-only a aussi obtenu PASS 29/29 après la migration SQL (§123). Le smoke a été renforcé dans le commit 7232828 pour cliquer le bouton visible de déconnexion et doit être relancé une dernière fois selon §124.4.
- Il exige un worktree séparé, propre et exactement aligné sur origin/e2e/recette.
- Il lit le manifeste .e2e-fixtures.json et les paramètres .env.local dans le dépôt source sans les copier ni les afficher.
- Le mode --browser-only construit l'application, démarre un serveur local sur le port 3217, exécute uniquement e2e/browser-smoke.mjs et conserve remoteDataMayBeModified=false.
- Il n'exécute pas authenticated-role-smoke.mjs ; il évite donc de rejouer les 40 API PASS.
- Il valide la fraîcheur, le projet, l'URL locale et le SHA du rapport ; le smoke produit maintenant un JSON FAIL structuré en cas d'assertion interrompue.
- **Limite :** le runner exécute pnpm build mais pas pnpm typecheck. Comme le contrôle CI Jobly CI — Typecheck & Build a été annulé sur le commit de code, le typecheck doit être lancé explicitement dans le worktree avant le smoke.

**Runner global — ne pas utiliser pour la prochaine action :** scripts/e2e-local-recipe.mjs.
La relecture du code courant a confirmé quatre raisons :
1. executeLot() renvoie PARTIAL après les tests et gates sans disposer d'une preuve runtime reconnue ; pour LOT-01, l'agrégateur ajoute le statut Auth et navigateur mais ne promeut jamais le lot en PASS (il ne fait que le passer en FAIL si Playwright échoue). Le vert complet est donc structurellement impossible avec le code actuel, même si les contrôles de base passent.
2. Les propriétés dependsOn du catalogue sont conservées dans le rapport, mais runStage() exécute les lots d'une phase sans vérifier que leurs dépendances ont réellement le statut PASS. L'ordre par phases n'est pas un vrai verrou de dépendance.
3. Le runner global relance le smoke Auth et le smoke API authentifié ; il répéterait donc des contrôles déjà PASS alors que la correction actuelle porte sur home-stats et le harnais navigateur.
4. Hors CI, son préflight peut entrer dans la branche restauration/provisionnement des fixtures si le manifeste/runtime local ne correspond pas aux critères attendus. Ce chantier interdit toute restauration/provisionnement automatique sans autorisation et contrôle dédiés.

**Décision :** ne pas lancer scripts/e2e-local-recipe.mjs, scripts/e2e-local-recipe ou une « recette complète » qui l'appelle avant correction de ses gates, mise en œuvre effective des dépendances, neutralisation du chemin provisionneur pour ce parcours et approbation d'une campagne globale. Le runner ciblé est le seul chemin autorisé pour l'action suivante.

### 0.3 Critères de clôture LOT-01 — ne pas confondre sous-lots et lot complet

| Porte obligatoire | Critère de PASS | Preuve de référence / état |
|---|---|---|
| TypeScript + build | pnpm typecheck et pnpm build PASS sur le SHA testé | TypeScript non incrémental passé avant lancement du runner selon §114 ; build du run 9 novembre PASS (§115) |
| Auth réelle | 12/12 PASS, 3 rôles, rôle signé correct et session renouvelée | 12/12 PASS, TALENT/RECRUITER/PARTNER, rapport source à 22:30:34Z et âge 140 min lors du browser-only (§115) |
| API par rôle | 40/40 PASS, zéro FAIL/BLOCKED, cycle croisé et nettoyage 3/3 | PASS §§107/109 ; à réutiliser, sans relance puisque le correctif actuel n'a pas changé ces endpoints |
| UI publique/anonyme | 14/14 PASS, zéro FAIL/BLOCKED, rapport frais et SHA/projet/URL exacts | **PASS 14/14** le 9 novembre à 00:50:21.900Z, commit `3dbce55…`, JOBLY-E2E, `http://127.0.0.1:3217`, exit 0 (§115) |
| UI authentifiée | Au moins un parcours navigateur contrôlé pour Talent, Recruteur et Partenaire : connexion, session, navigation conforme au rôle, refus inter-rôle et déconnexion ; toute donnée créée pour test doit être synthétique, propre au run et nettoyée | **PASS 29/29** le 9 novembre 2026, run du commit `da9ce9e2207c9b08ae56d56f02178fdd61cd46c5` (§128) ; clic réel sur le bouton `/settings`, redirection `/`, HTTP 401 pour chacun des trois rôles |
| Auth avancée | OTP, Google OAuth, reset du mot de passe et révocation multi-appareils : test runtime en environnement contrôlé, ou décision de périmètre écrite qui les exclut explicitement de cette clôture | Non démontré ; ne pas les assimiler à PASS par présence de boutons ou tests statiques |
| Sécurité et non-régression | Tests Security Core PASS, aucune erreur navigateur non traitée, aucun effet externe, nettoyage confirmé | Security Core CI success ; le build CI est annulé ; aucun effet externe sur le browser-only |

**Règle de décision :** LOT-01 n'est PASS que lorsque toutes les portes classées obligatoires sont PASS ou qu'une exception de périmètre est explicitement acceptée et documentée. Un browser-only 14/14 valide uniquement la porte UI publique/anonyme.

### 0.4 Séquence d'exécution retenue

1. Ne pas rejouer les portes déjà PASS sans changement pertinent : Auth de base 12/12, API 40/40 et son nettoyage, navigateur public 14/14, UI authentifiée 29/29. Ces sous-périmètres sont acquis selon leurs rapports sources (§§96–128).
2. Point de reprise unique : retester la campagne Auth avancée avec e2e/run-authenticated-role-recipe.mjs --auth-advanced-only, sur un worktree détaché propre et aligné sur origin/e2e/recette, selon le §140. Le runner vérifie la cible JOBLY-E2E, le manifeste existant, l'environnement privé, la fraîcheur du rapport, le SHA et l'URL locale. Il construit l'application et démarre son serveur local ; ne pas exécuter le runner global.
3. Scénarios simulés : OTP, Google OAuth et récupération doivent chacun être PASS sur un nouveau rapport runtime. Les simulations n'émettent aucun e-mail/SMS/OTP fournisseur et ne contactent pas Google. unexpectedSupabaseRequests doit être vide, externalActions=false, sans erreur de page ni secret/token imprimé.
4. Multi-appareils : le dernier préflight a trouvé trois appareils actifs préexistants (§138). Le scénario doit rester BLOCKED tant qu'une fixture distincte, dédiée et explicitement autorisée ne permet pas deux sessions nouvelles sans toucher aux appareils existants, ou tant qu'une décision écrite de périmètre ne l'exclut pas explicitement. Ne jamais supprimer/révoquer une session préexistante.
5. Verdict LOT-01 : ne pas convertir mécaniquement PARTIAL en PASS. Le lot ne sera vert que lorsque les trois scénarios simulés auront un PASS runtime frais et que le point multi-appareils aura été validé sur fixture dédiée ou explicitement exclu par décision acceptée. TypeScript et build doivent aussi être PASS sur le SHA de la recette. Les sous-périmètres déjà PASS ne sont pas à additionner à un run différent.
6. Après LOT-01 : dérouler les lots selon leurs dépendances et les preuves manquantes. LOT-02 et LOT-03 restent les parcours cœur P0 ; LOT-07 suit LOT-02/03 en sandbox ; LOT-04 peut avancer indépendamment après LOT-00 ; LOT-05 suit LOT-01 ; LOT-06 suit LOT-02/03 ; LOT-08 suit LOT-01 ; LOT-09 suit LOT-01/02 ; LOT-10 est la régression transversale finale. LOT-11 OpenAPI reste réservé à la fin selon le §76.
### 0.5 Règles permanentes de lecture et de reprise

- Toujours identifier le SHA, le projet, le mode de runner, l'horodatage et le code de sortie d'un rapport.
- Ne jamais cumuler les rapports de runs différents ; ne pas additionner les nombres de tests de deux exécutions.
- Ne pas refaire un test PASS sans changement pertinent, expiration de sa fenêtre de fraîcheur ou demande motivée.
- Aucun mot de passe, secret, token ou contenu de manifeste dans le chat, les logs publics ou Git.
- Aucune réinitialisation, recréation, restauration de fixture ou exécution de provisionneur automatique.
- JOBLY-PROD, main, merge et déploiement restent hors périmètre.
- Après chaque retour opérateur, mettre à jour les preuves et l'action suivante dans ce document ; une seule commande opérateur prioritaire à la fois.

---


---

## 118. LOT-01 — diagnostic des 17 erreurs HTTP 500 et correction de l'enregistrement des sessions

**Mise à jour : 9 novembre 2026 — version 2.147.** Le smoke authentifié partagé par l'opérateur a bien validé les connexions et les rôles signés, mais les 17 vérifications API sont tombées en HTTP 500. L'analyse a été poursuivie jusqu'aux journaux Postgres de JOBLY-E2E ; la cause commune a été identifiée et corrigée.

### 118.1 Résultat du smoke reçu

Rapport créé le 9 novembre 2026 à 01:25:12.030Z, terminé à 01:26:13.561Z, commit testé 9ac84c7eacfb82531ea2fc90863d358740b9288d :
- 29 contrôles exécutés : 12 PASS, 17 FAIL, 0 BLOCKED ;
- pour chacun des trois rôles : formulaire de connexion PASS 200, page de rôle PASS 200, rôle signé Supabase PASS 200 et purge de session du contexte isolé confirmée par HTTP 401 ;
- 17 contrôles API — API propre au rôle et refus inter-rôles — ont tous renvoyé HTTP 500 ;
- aucune erreur JavaScript navigateur, aucun secret ou jeton imprimé, aucun effet externe et aucune mutation métier distante déclarée.

Les connexions et la reconnaissance des rôles étaient donc correctes. Les échecs étaient communs à la chaîne serveur/API, et non 17 défauts métier indépendants.

### 118.2 Cause racine confirmée dans JOBLY-E2E

Les journaux Postgres du projet ofqqrryamslxoqkklraw sur la fenêtre 01:24–01:28 UTC ont enregistré exactement **17** erreurs :
- contrainte : UserDeviceSession_authSessionId_key ;
- SQLSTATE : 23505 ;
- détail : le même authSessionId était déjà présent dans une autre ligne ;
- fonction fautive : register_jobly_device_session(), pendant l'insertion d'une seconde ligne de session.

Le helper serveur recevait un même jeton/session Auth avec plusieurs identifiants d'appareil selon les chemins de requête. La fonction cherchait d'abord par userId + deviceId ; lorsqu'elle ne trouvait pas ce deviceId, elle tentait un nouvel INSERT, sans rechercher auparavant l'authSessionId déjà enregistré. La contrainte unique levait alors 23505, et getAuthUser() transformait l'erreur RPC en HTTP 500 sur les routes protégées.

Le nombre et la période des erreurs Postgres correspondent exactement aux 17 échecs API du rapport opérateur.

### 118.3 Correction SQL appliquée uniquement à JOBLY-E2E

Migration Supabase appliquée avec succès au seul projet ofqqrryamslxoqkklraw :
- version : 20261109015439 ;
- nom : jobly_device_session_same_session_idempotency ;
- fichier commité : supabase/migrations/20261109015439_jobly_device_session_same_session_idempotency.sql ;
- commit Git : 04031e1d91ef7fab0913f3323d6f95f2e769ec4f.

La fonction recherche maintenant en premier la session Auth immuable. Si elle existe déjà pour l'utilisateur :
1. elle réutilise sa ligne et son deviceId canonique, même si un appel suivant transmet un autre deviceId ;
2. elle actualise uniquement les métadonnées normales lastSeenAt/deviceLabel/userAgent, selon le throttle existant ;
3. elle refuse explicitement une session attachée à un autre utilisateur ;
4. elle ne tente jamais de créer une seconde ligne pour le même authSessionId.

Les verrous transactionnels sont pris par utilisateur et par session Auth pour rendre également ce comportement robuste aux requêtes concurrentes. Les limites de trois appareils et les règles de révocation sont conservées.

Vérification après migration :
- fonction présente et corps idempotent confirmé ;
- service_role : EXECUTE autorisé ;
- authenticated : EXECUTE refusé ;
- anon : EXECUTE refusé.

### 118.4 Test d'idempotence en base — PASS

Un test SQL ciblé a été exécuté sur une session synthétique existante de chacun des trois rôles, en présentant volontairement un deviceId différent de celui déjà enregistré. Résultats :
- TALENT : allowed=true, exactement une ligne conservée, deviceId d'origine préservé ;
- RECRUITER : allowed=true, exactement une ligne conservée, deviceId d'origine préservé ;
- PARTNER : allowed=true, exactement une ligne conservée, deviceId d'origine préservé.

Ce test a seulement actualisé au besoin les métadonnées de session synthétique ; aucun profil, CV, offre, candidature, Partner, commission ou paiement n'a été modifié. Il ne remplace pas la recette HTTP/navigateur de bout en bout.

### 118.5 État CI et sécurité

Au dernier contrôle GitHub du HEAD 04031e1d91ef7fab0913f3323d6f95f2e769ec4f, les contrôles Typecheck/production build, security-core-migration, architecture et verify étaient encore IN_PROGRESS. Aucun PASS CI n'est anticipé dans cette entrée.

Aucun accès JOBLY-PROD, aucune migration de production, aucun merge main, aucun déploiement. LOT-00, Auth 12/12, API 40/40 et UI publique 14/14 restent les preuves antérieures conservées ; ils ne doivent pas être rejoués sans changement pertinent.

### 118.6 Commande opérateur — relance ciblée après correction

À coller en une seule ligne dans CMD, depuis n'importe quel dossier. Le préflight protège le worktree isolé : il supprime uniquement tsconfig.tsbuildinfo s'il est l'unique élément non suivi ; toute autre modification entraîne un arrêt sans nettoyage. Le typecheck est non incrémental, puis le runner fait build + serveur + smoke navigateur authentifié des trois rôles. Il ne rejoue ni les 14 tests publics ni les 40 API indépendants.

\`\`\`cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $wt='C:\Users\ASUS\Jobly-e2e-recette-v3'; $src='C:\Users\ASUS\Jobly'; $attemptStart=Get-Date; $exitCode=2; try { $st=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0){throw 'Lecture du statut Git impossible.'}; if($st -eq '?? tsconfig.tsbuildinfo'){ $cache=Join-Path $wt 'tsconfig.tsbuildinfo'; if(!(Test-Path -LiteralPath $cache -PathType Leaf)){throw 'Cache TypeScript attendu absent ; arrêt.'}; Remove-Item -LiteralPath $cache -Force; Write-Host 'CACHE TYPECHECK PRECEDENT SUPPRIME'; } elseif($st){Write-Host $st;throw 'ARRET : autres modifications du worktree. Aucun fichier local écrasé.'}; $clean=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $clean){Write-Host $clean;throw 'Worktree non propre ; arrêt.'}; Write-Host 'WORKTREE_CLEAN'; & git -C $wt fetch origin; if($LASTEXITCODE -ne 0){throw 'git fetch origin en échec.'}; & git -C $wt checkout --detach origin/e2e/recette; if($LASTEXITCODE -ne 0){throw 'Checkout distant en échec.'}; $head=& git -C $wt rev-parse HEAD; $remote=& git -C $wt rev-parse origin/e2e/recette; if($head -ne $remote){throw 'HEAD ne correspond pas à origin/e2e/recette.'}; Set-Location $wt; New-Item -ItemType Directory -Force -Path 'artifacts\e2e' | Out-Null; $syntaxLog='artifacts\e2e\role-browser-static-check.log'; $typeLog='artifacts\e2e\role-browser-typecheck.log'; & node --check 'e2e\run-authenticated-role-recipe.mjs' *> $syntaxLog; if($LASTEXITCODE -ne 0){throw 'Syntaxe du runner invalide.'}; & node --check 'e2e\authenticated-browser-role-smoke.mjs' >> $syntaxLog 2>&1; if($LASTEXITCODE -ne 0){throw 'Syntaxe du smoke authentifié invalide.'}; & pnpm exec tsc --noEmit --incremental false *> $typeLog; if($LASTEXITCODE -ne 0){throw 'Typecheck en échec : runner non lancé.'}; $post=(& git status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $post){Write-Host $post;throw 'Le typecheck a laissé des changements : runner non lancé.'}; Write-Host 'TYPECHECK_PASS_WORKTREE_CLEAN'; & node 'e2e\run-authenticated-role-recipe.mjs' $src --role-browser-only; $exitCode=$LASTEXITCODE; Write-Host ('RUNNER_EXIT='+$exitCode) } catch { Write-Host ('ARRET : '+$_.Exception.Message); $exitCode=2 } finally { $reports=@('artifacts\e2e\role-browser-static-check.log','artifacts\e2e\role-browser-typecheck.log','artifacts\e2e\authenticated-role-runner-summary.json','artifacts\e2e\browser-role-smoke-diagnostic.json','artifacts\e2e\browser-role-smoke-process.log','artifacts\e2e\lot1-auth-role-ui-smoke.json'); foreach($f in $reports){$p=Join-Path $wt $f; if(Test-Path -LiteralPath $p -PathType Leaf){$i=Get-Item -LiteralPath $p; if($i.LastWriteTime -ge $attemptStart.AddSeconds(-2)){Start-Process -FilePath notepad.exe -ArgumentList ([char]34+$p+[char]34)}else{Write-Host ('ANCIEN RAPPORT NON OUVERT : '+$p)}}else{Write-Host ('RAPPORT NON GENERE : '+$p)}} }; exit $exitCode"
\`\`\`

Six fichiers doivent s'ouvrir dans Notepad :
- role-browser-static-check.log ;
- role-browser-typecheck.log ;
- authenticated-role-runner-summary.json ;
- browser-role-smoke-diagnostic.json ;
- browser-role-smoke-process.log ;
- lot1-auth-role-ui-smoke.json.

Résultat attendu : 29/29 PASS, 0 FAIL, 0 BLOCKED, trois rôles PASS, rôle signé confirmé, refus inter-rôles HTTP 403, retour 401 après suppression du stockage Auth isolé, remoteBusinessDataMayBeModified=false. Les écritures normales dans UserDeviceSession restent des métadonnées de session de comptes synthétiques et sont consignées séparément.

**Statut LOT-01 : PARTIAL / NON CLOS** jusqu'à réception et inspection du rapport de cette nouvelle exécution. Le bouton visible de déconnexion et les scénarios OTP, Google OAuth, récupération du mot de passe et révocation multi-appareils restent à traiter séparément ou à exclure par décision de périmètre écrite.

---

## 117. LOT-01 — correction des gardes de rôle Partner et commande d'exécution mise à jour

**Mise à jour : 9 novembre 2026 — version 2.144.** Le smoke public/anonyme PASS 14/14 (§115) est conservé. L'audit des API par rôle a ensuite mis en évidence des contrôles incomplets sur plusieurs routes Partenaire ; les gardes sont ajoutés avant toute lecture Partner sensible ou création de profil.

### 117.1 Défaut confirmé et correction

Les routes suivantes authentifiaient l'utilisateur, mais ne contrôlaient pas toujours que public.User.role était PARTNER :
- app/api/partner/profile/route.ts : GET appelait ensurePartner() et pouvait créer un profil Partner pour un utilisateur authentifié non-Partenaire ; PUT pouvait modifier les paramètres de paiement.
- app/api/partner/commissions/route.ts : GET pouvait retourner un résultat vide pour un utilisateur non-Partenaire au lieu d'un refus explicite.
- app/api/partner/ba-onboarding/route.ts : GET exposait potentiellement les données KYC/accord si une ligne Partner était attachée ; POST lisait le formulaire avant contrôle du rôle.
- app/api/partner/distributor/route.ts : le type DISTRIBUTOR était contrôlé, mais pas le rôle métier PARTNER lui-même.

Corrections commises sur e2e/recette :
- profile GET/PUT : rôle vérifié avant ensurePartner() et avant parsing du corps PUT — commit aca6c40217e654434a9ac626de323f02290d1525 ;
- commissions GET : rôle vérifié avant recherche de Partner — commit 7b0cf3c82aa3ead3c2087f67bf263254e68f88ba ;
- onboarding GET/POST : rôle vérifié avant lecture KYC, parsing multipart ou accès Storage — commit aa82bd0101d50809a6a09ccf58b3d0498f479226 ;
- distributor GET : rôle vérifié avant recherche des données Distributor — commit b0ce326fcd89a4ac6905c951301a12f0f5943211.

Les routes app/api/partner/jia/intelligence/route.ts disposaient déjà d'un contrôle explicite PARTNER. app/api/partner/distributor/commission-preview/route.ts est un calcul public stateless de barème, sans accès à des données de compte ou de commission individuelle ; il est maintenu public.

### 117.2 Régression ajoutée au smoke navigateur rôles

Le smoke e2e/authenticated-browser-role-smoke.mjs vérifie maintenant, pour TALENT et RECRUITER, que les GET vers les API Partenaire protégées répondent HTTP 403 :
- /api/partner/profile ;
- /api/partner/ba-onboarding ;
- /api/partner/commissions ;
- /api/partner/distributor ;
- /api/partner/jia/intelligence.

Les contrôles cross-role Talent/Recruteur existants et les accès propres des trois rôles restent inclus. La couverture élargie a été commise en 1864202b5090835fb2b586c4edcf8854eb0169b9, puis complétée en 5383283577af75414f9a7e4614498e318839ba10.

Aucun compte, profil, CV, Partner, candidature ou paiement n'est créé ou modifié par le smoke. Les requêtes après connexion restent GET ; les métadonnées usuelles de session/appareil peuvent être rafraîchies par l'authentification. Le clic sur le bouton de déconnexion visible, OTP, Google OAuth, récupération du mot de passe et révocation multi-appareils restent hors de cette exécution.

### 117.3 État CI au moment de la consolidation

Le dernier HEAD de code observé est 5383283577af75414f9a7e4614498e318839ba10. État GitHub Actions vérifié après attente : Typecheck and production build = CANCELLED (non-PASS), architecture = SUCCESS, security-core-migration = SUCCESS, verify = IN_PROGRESS. Le build/typecheck CI n'est donc pas validé ; le contrôle local au §117.4 reste obligatoire. La branche e2e/recette reste distincte de main ; aucun merge ni déploiement n'a été effectué.

### 117.4 Commande opérateur mise à jour — exécution du rôle navigateur seul

À coller en une seule ligne dans CMD. Le try/catch/finally ouvre les fichiers Notepad même en cas d'arrêt du préflight. Seul tsconfig.tsbuildinfo est supprimé, et uniquement s'il constitue le seul élément non suivi. Tout autre écart arrête la commande sans nettoyage. Le typecheck est non incrémental afin de ne pas régénérer ce cache. Le runner exécute build + serveur + --role-browser-only, sans rejouer le smoke public 14/14 ni l'API 40/40.

\`\`\`cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $wt='C:\Users\ASUS\Jobly-e2e-recette-v3'; $src='C:\Users\ASUS\Jobly'; $attemptStart=Get-Date; $exitCode=2; try { $st=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0){throw 'Lecture du statut Git impossible.'}; if($st -eq '?? tsconfig.tsbuildinfo'){ $cache=Join-Path $wt 'tsconfig.tsbuildinfo'; if(!(Test-Path -LiteralPath $cache -PathType Leaf)){throw 'Cache TypeScript attendu absent ; arrêt.'}; Remove-Item -LiteralPath $cache -Force; Write-Host 'CACHE TYPECHECK PRECEDENT SUPPRIME'; } elseif($st){Write-Host $st;throw 'ARRET : autres modifications du worktree. Aucun fichier local écrasé.'}; $clean=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $clean){Write-Host $clean;throw 'Worktree non propre ; arrêt.'}; Write-Host 'WORKTREE_CLEAN'; & git -C $wt fetch origin; if($LASTEXITCODE -ne 0){throw 'git fetch origin en échec.'}; & git -C $wt checkout --detach origin/e2e/recette; if($LASTEXITCODE -ne 0){throw 'Checkout distant en échec.'}; $head=& git -C $wt rev-parse HEAD; $remote=& git -C $wt rev-parse origin/e2e/recette; if($head -ne $remote){throw 'HEAD ne correspond pas à origin/e2e/recette.'}; Set-Location $wt; New-Item -ItemType Directory -Force -Path 'artifacts\e2e' | Out-Null; $syntaxLog='artifacts\e2e\role-browser-static-check.log'; $typeLog='artifacts\e2e\role-browser-typecheck.log'; & node --check 'e2e\run-authenticated-role-recipe.mjs' *> $syntaxLog; if($LASTEXITCODE -ne 0){throw 'Syntaxe du runner invalide.'}; & node --check 'e2e\authenticated-browser-role-smoke.mjs' >> $syntaxLog 2>&1; if($LASTEXITCODE -ne 0){throw 'Syntaxe du smoke authentifié invalide.'}; & pnpm exec tsc --noEmit --incremental false *> $typeLog; if($LASTEXITCODE -ne 0){throw 'Typecheck en échec : runner non lancé.'}; $post=(& git status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $post){Write-Host $post;throw 'Le typecheck a laissé des changements : runner non lancé.'}; Write-Host 'TYPECHECK_PASS_WORKTREE_CLEAN'; & node 'e2e\run-authenticated-role-recipe.mjs' $src --role-browser-only; $exitCode=$LASTEXITCODE; Write-Host ('RUNNER_EXIT='+$exitCode) } catch { Write-Host ('ARRET : '+$_.Exception.Message); $exitCode=2 } finally { $reports=@('artifacts\e2e\role-browser-static-check.log','artifacts\e2e\role-browser-typecheck.log','artifacts\e2e\authenticated-role-runner-summary.json','artifacts\e2e\browser-role-smoke-diagnostic.json','artifacts\e2e\browser-role-smoke-process.log','artifacts\e2e\lot1-auth-role-ui-smoke.json'); foreach($f in $reports){$p=Join-Path $wt $f; if(Test-Path -LiteralPath $p -PathType Leaf){$i=Get-Item -LiteralPath $p; if($i.LastWriteTime -ge $attemptStart.AddSeconds(-2)){Start-Process -FilePath notepad.exe -ArgumentList ([char]34+$p+[char]34)}else{Write-Host ('ANCIEN RAPPORT NON OUVERT : '+$p)}}else{Write-Host ('RAPPORT NON GENERE : '+$p)}} }; exit $exitCode"
\`\`\`

Rapports à examiner dans Notepad :
- role-browser-static-check.log ;
- role-browser-typecheck.log ;
- authenticated-role-runner-summary.json ;
- browser-role-smoke-diagnostic.json ;
- browser-role-smoke-process.log ;
- lot1-auth-role-ui-smoke.json.

Critère recherché : résumé roleBrowserSmoke=PASS, les trois rôles PASS, zéro FAIL/BLOCKED, environnement/projectRef/SHA exacts, remoteBusinessDataMayBeModified=false et aucun secret ni jeton dans les rapports. remoteAuthDeviceStateMayBeModified peut être vrai en raison de l'enregistrement normal des sessions synthétiques ; ce n'est pas une mutation de profil métier. Si un rôle échoue, corriger le contrôle concerné uniquement et ne pas relancer les 40 API.

LOT-01 demeure PARTIAL / NON CLOS jusqu'à exécution et examen du rapport. Même après ce smoke, les vérifications de déconnexion UI visible et les scénarios Auth avancée doivent être traités séparément ou explicitement exclus par décision documentée.

---
## 116. LOT-01 — ajout du smoke navigateur authentifié pour les trois rôles

**Section historique — mise à jour initiale V2.143 ; corrections Partner applicables décrites au §117.** Le smoke public/anonyme reste PASS 14/14 (§115). Un parcours navigateur authentifié séparé est maintenant commis sur la branche e2e/recette ; il doit encore être exécuté localement. Aucun résultat d'authentification via formulaire n'est revendiqué avant lecture du rapport.

### 116.1 Implémentation commise

- Nouveau script e2e/authenticated-browser-role-smoke.mjs, commits 5581f0c6d37298d653807281ba85eeb1de7adb33, puis durcissement 631af8086078c4043faf37c7fd6be605c49e4925 et précision du rapport 2b922f8c17e940bab290d16b67d223c200f84b6f.
- Nouveau mode --role-browser-only dans e2e/run-authenticated-role-recipe.mjs, commits 705b712d5444799af2617d8bf3564eaeab9f16f7 et 3473a6e78006b67092e9446be61f3042a55f0cd8.
- HEAD distant relevé sur e2e/recette : 3473a6e78006b67092e9446be61f3042a55f0cd8, PR #266 toujours OPEN/draft, base main conservée à 979f2ccfec9258bc30989af18433cf6adb1b4698.
- Au contrôle du 9 novembre, les checks GitHub du HEAD étaient encore en cours, notamment Typecheck and production build et security-core-migration ; aucun résultat CI PASS n'est anticipé ici.

### 116.2 Couverture visée par le smoke authentifié

Le script lit le manifeste existant depuis le dépôt source, exige les trois fixtures TALENT/RECRUITER/PARTNER avec username, email, password et authUserId, et ne les affiche jamais. Il ouvre trois contextes Playwright distincts et utilise le formulaire Jobly réel :

1. Clic du CTA de connexion, saisie du username/mot de passe existants et vérification du POST /api/auth/username/login.
2. Vérification de la destination dédiée : Talent /talent/profile, Recruteur /recruiter/jobs, Partenaire /partner/payment.
3. Lecture du profil Auth Supabase /auth/v1/user et confirmation de app_metadata.e2e_fixture=true et du rôle signé attendu.
4. Vérification de l'API propre au rôle en GET.
5. Vérification des refus inter-rôles : le premier script attendait initialement 404 si la ressource Partner était absente. Cette attente est supersédée : le §117 ajoute des gardes de rôle explicites et les cinq endpoints Partner protégés doivent maintenant répondre 403 à TALENT et RECRUITER.
6. Suppression des seuls jetons stockés dans le contexte navigateur isolé, puis vérification qu'une API protégée répond de nouveau HTTP 401.

Le smoke n'envoie aucun email/SMS, ne soumet ni candidature ni paiement, ne crée aucune offre, ne modifie aucun profil/CV/préférence/KYC et ne provisionne aucune fixture. Les requêtes applicatives après connexion sont des GET. Les appels authentifiés peuvent toutefois mettre à jour les métadonnées normales de session/appareil dans JOBLY-E2E ; le rapport distingue ce point de toute mutation métier. Les jetons restent en mémoire et ne sont jamais écrits dans le rapport ou les logs.

### 116.3 Limites de sécurité et interprétation

- La preuve de déconnexion porte sur la suppression de l'état Auth dans le contexte isolé et le retour HTTP 401 ; le clic sur le bouton visible « Se déconnecter » n'est pas inclus dans ce smoke.
- L'API /api/partner/ba-onboarding renvoie 404 si aucun objet Partner n'existe ; cette réponse prouve l'absence de ressource, pas un garde d'autorisation explicite fondé sur le rôle. Le résultat ne doit pas être présenté comme preuve d'un guard Partner formel.
- OTP, Google OAuth, récupération du mot de passe et révocation multi-appareils ne sont pas exercés ici.
- La simple présence de ces scripts ne valide pas le parcours : le sous-lot ne sera PASS qu'après exécution sur le projet E2E et inspection du rapport frais.

### 116.4 Commande opérateur — exécution isolée

À coller en une seule ligne dans CMD. Le préflight n'efface que tsconfig.tsbuildinfo si c'est l'unique élément non suivi ; tout autre changement entraîne un arrêt. Le typecheck utilise --incremental false et le statut Git est revérifié avant lancement. Le runner fait ensuite build + serveur local + authentification browser-only, sans relancer le smoke public 14/14 ni le smoke API 40/40.

\`\`\`cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $wt='C:\Users\ASUS\Jobly-e2e-recette-v3'; $src='C:\Users\ASUS\Jobly'; $attemptStart=Get-Date; $exitCode=2; $st=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0){throw 'Lecture du statut Git impossible.'}; if($st -eq '?? tsconfig.tsbuildinfo'){ $cache=Join-Path $wt 'tsconfig.tsbuildinfo'; if(!(Test-Path -LiteralPath $cache -PathType Leaf)){throw 'Cache TypeScript attendu absent ; arrêt.'}; Remove-Item -LiteralPath $cache -Force; Write-Host 'CACHE TYPECHECK PRECEDENT SUPPRIME'; } elseif($st){Write-Host $st;throw 'ARRET : autres modifications du worktree. Aucun fichier local écrasé.'}; $clean=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $clean){Write-Host $clean;throw 'Worktree non propre ; arrêt.'}; try { Write-Host 'WORKTREE_CLEAN'; & git -C $wt fetch origin; if($LASTEXITCODE -ne 0){throw 'git fetch origin en échec.'}; & git -C $wt checkout --detach origin/e2e/recette; if($LASTEXITCODE -ne 0){throw 'Checkout distant en échec.'}; $head=& git -C $wt rev-parse HEAD; $remote=& git -C $wt rev-parse origin/e2e/recette; if($head -ne $remote){throw 'HEAD ne correspond pas à origin/e2e/recette.'}; Set-Location $wt; New-Item -ItemType Directory -Force -Path 'artifacts\e2e' | Out-Null; $syntaxLog='artifacts\e2e\role-browser-static-check.log'; $typeLog='artifacts\e2e\role-browser-typecheck.log'; & node --check 'e2e\run-authenticated-role-recipe.mjs' *> $syntaxLog; if($LASTEXITCODE -ne 0){throw 'Syntaxe du runner invalide.'}; & node --check 'e2e\authenticated-browser-role-smoke.mjs' >> $syntaxLog 2>&1; if($LASTEXITCODE -ne 0){throw 'Syntaxe du smoke authentifié invalide.'}; & pnpm exec tsc --noEmit --incremental false *> $typeLog; if($LASTEXITCODE -ne 0){throw 'Typecheck en échec : runner non lancé.'}; $post=(& git status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $post){Write-Host $post;throw 'Le typecheck a laissé des changements : runner non lancé.'}; Write-Host 'TYPECHECK_PASS_WORKTREE_CLEAN'; & node 'e2e\run-authenticated-role-recipe.mjs' $src --role-browser-only; $exitCode=$LASTEXITCODE; Write-Host ('RUNNER_EXIT='+$exitCode) } finally { $reports=@('artifacts\e2e\role-browser-static-check.log','artifacts\e2e\role-browser-typecheck.log','artifacts\e2e\authenticated-role-runner-summary.json','artifacts\e2e\browser-role-smoke-diagnostic.json','artifacts\e2e\browser-role-smoke-process.log','artifacts\e2e\lot1-auth-role-ui-smoke.json'); foreach($f in $reports){$p=Join-Path $wt $f; if(Test-Path -LiteralPath $p -PathType Leaf){$i=Get-Item -LiteralPath $p; if($i.LastWriteTime -ge $attemptStart.AddSeconds(-2)){Start-Process -FilePath notepad.exe -ArgumentList ([char]34+$p+[char]34)}else{Write-Host ('ANCIEN RAPPORT NON OUVERT : '+$p)}}else{Write-Host ('RAPPORT NON GENERE : '+$p)}} }; exit $exitCode"
\`\`\`

Rapports attendus dans Notepad :
- role-browser-static-check.log ;
- role-browser-typecheck.log ;
- authenticated-role-runner-summary.json ;
- browser-role-smoke-diagnostic.json ;
- browser-role-smoke-process.log ;
- lot1-auth-role-ui-smoke.json.

Le résultat recherché est roleBrowserSmoke=PASS, trois rôles PASS, zéro FAIL/BLOCKED, rapport lié au commit exact et aucune donnée métier modifiée. Si un rôle échoue, corriger uniquement la cause prouvée puis relancer ce mode ciblé.

**État LOT-01 après cette entrée :** UI publique/anonyme PASS 14/14 (§115), Auth 12/12 et API 40/40 conservés ; UI authentifiée par formulaire et rôle est **implémentée mais NON TESTÉE**. LOT-01 reste **PARTIAL / NON CLOS**. Aucun accès JOBLY-PROD, merge main ou déploiement.

---

## 115. LOT-01 — smoke navigateur public/anonyme validé 14/14

**Rapports opérateur reçus : 9 novembre 2026. Sous-lot UI public/anonyme : PASS.** Cette section remplace l'attente de relance browser-only des §§0.4 et 114. Elle ne clôt pas le LOT-01 complet.

### 115.1 Identification et rattachement du run

- Environnement : `JOBLY-E2E`, projectRef `ofqqrryamslxoqkklraw`.
- Commit annoncé dans les rapports navigateur : `3dbce55ffc10ef0a8fdac73e2d9f815b3f6a04d7`.
- URL testée : `http://127.0.0.1:3217`.
- Rapport navigateur : `createdAt=2026-11-09T00:50:21.900Z`, `runId=local`.
- Rapport runner : `createdAt=2026-11-09T00:45:25.578Z`, `mode=browser-only`, `status=PASS`.
- Début Playwright : `2026-11-09T00:50:06.097Z`, `exitCode=0`, `spawnError=null`, rapport du run présent.
- Rapport processus : `createdAt=2026-11-09T00:50:23.265Z`, `processExitCode=0`, `reportGenerated=true`, `spawnError=null`.

Les horodatages sont cohérents avec le cycle du runner : création du résumé au démarrage, build/serveur ensuite, puis lancement Playwright et écriture du rapport détaillé.

### 115.2 Résultats vérifiés

| Contrôle | Résultat | Détail |
|---|---|---|
| Build Next.js | PASS | Rapport runner |
| Serveur local | PASS | Sonde `/api/profile` : HTTP 401 attendu, serveur prêt |
| TypeScript préalable | PASS selon la séquence §114 | Le runner a été lancé après `tsc --noEmit --incremental false` et la vérification de propreté ; ces gates devaient réussir pour atteindre cette étape |
| Smoke navigateur public/anonyme | PASS | 14 exécutés, 14 PASS, 0 FAIL, 0 BLOCKED |
| Page errors | PASS | Tableau vide |
| Statistiques accueil | PASS | `/api/public/home-stats` HTTP 200 ; 28 offres et 1 talent rapportés par la réponse |
| Responsive mobile | PASS | viewport/document/body : 390/390/390 px ; aucun débordement horizontal |
| Auth lifecycle associé | PASS | Rapport `auth-session-smoke.json` : 12/12, TALENT/RECRUITER/PARTNER ; âge 140 minutes au contrôle |
| Effets externes/distants | Aucun | `remoteDataMayBeModified=false`, `externalActions` non sollicitées, `secretsPrinted=false` |

Les 14 contrôles couvrent les écrans publics d'accueil, connexion et inscription sans soumission, visibilité du mot de passe, affichage mobile, six refus HTTP 401 sur API protégées en mode anonyme et la présence de la preuve Auth 12/12 fraîche. Le contrôle HTTP 200 de home-stats valide également le correctif route serveur/RPC du §112.

### 115.3 Limites à conserver

- Le smoke ne réalise pas de connexion réelle via le formulaire web ; AUTH-006/007 réutilisent la preuve distincte du cycle Supabase Auth 12/12.
- Aucune soumission d'inscription, OTP, Google OAuth, récupération de mot de passe, candidature, paiement, email ou SMS n'a été effectuée.
- Aucun parcours navigateur connecté Talent, Recruteur ou Partenaire n'a encore été validé.
- Les refus API 401 sont testés sans session ; ils ne démontrent pas la séparation des droits entre rôles connectés.
- Le nombre « 1 talent » est la valeur observée par l'agrégat de ce projet E2E et de ce run, pas une assertion de volume minimal.

**Verdict :** la porte UI publique/anonyme de LOT-01 est **PASS 14/14**, sur le commit annoncé et le projet JOBLY-E2E. Les portes UI authentifiées, Auth avancée/périmètre, agrégateur final et les autres exigences du §0.3 restent à traiter. LOT-01 demeure **PARTIAL / NON CLOS**.

### 115.4 Prochaine étape ciblée

Ne pas relancer le smoke public 14/14 ni l'API authentifiée 40/40 sans changement pertinent. L'étape suivante est un audit des écrans de connexion et des routes/layouts par rôle, puis l'ajout d'un smoke Playwright authentifié dédié, strictement sur les trois fixtures synthétiques JOBLY-E2E existantes :
1. connexion via l'interface web pour TALENT, RECRUITER et PARTNER, sans jamais journaliser les mots de passe ni capturer de champs sensibles ;
2. vérification de l'identité/session et de l'arrivée sur la navigation attendue pour le rôle ;
3. vérification de quelques routes protégées autorisées et refus inter-rôle (403/404 selon le contrat) ;
4. déconnexion et vérification qu'une route protégée redevient inaccessible ;
5. aucune mutation de CV/profil préexistant, aucune candidature, aucun paiement, aucun message externe ; toute donnée synthétique nécessaire doit être créée pour le run puis nettoyée avec preuve.

Le smoke authentifié doit générer un rapport distinct, par rôle, sans modifier le smoke public déjà PASS. L'ancien runner global `scripts/e2e-local-recipe.mjs` reste interdit jusqu'à correction et revue de ses gates, dépendances et chemins de provisionnement.

---

## 114. LOT-01 — diagnostic et correction du cache TypeScript qui bloquait le runner

**Rapport opérateur reçu : 9 novembre 2026 à 00:38:36.594Z.** Statut `BLOCKED`, mode `browser-only`, cible JOBLY-E2E / `ofqqrryamslxoqkklraw`. `build=NOT_RUN`, `localServer=NOT_RUN`, `authenticatedRoleSmoke=NOT_RUN`, `browserSmoke=NOT_RUN`; `remoteDataMayBeModified=false`, `secretsPrinted=false`.

### 114.1 Cause exacte établie

Le préflight initial de la commande avait trouvé un worktree propre. Le script `pnpm typecheck` a ensuite créé `tsconfig.tsbuildinfo` dans le worktree parce que `tsconfig.json` active `incremental: true`. Le runner vérifie à nouveau `git status --porcelain` dans son propre préflight et a trouvé le fichier non suivi `?? tsconfig.tsbuildinfo`, ce qui a provoqué son arrêt de sécurité.

Ce résultat ne signale pas une anomalie applicative ni un échec de compilation : la compilation TypeScript s'est terminée assez loin pour laisser son cache, mais ce rapport ne donne pas le code de sortie séparé du typecheck. Le runner lui-même n'a pas lancé le build, le serveur ou Playwright.

### 114.2 Nouvelle règle de commande

La séquence est corrigée de deux façons :
1. Au départ, si le seul élément du worktree est exactement le fichier `?? tsconfig.tsbuildinfo` laissé par le run précédent, supprimer uniquement ce cache. Si un autre fichier apparaît, arrêter sans le modifier. Vérifier ensuite que le worktree est propre.
2. Remplacer `pnpm typecheck` par son équivalent sans incrémentalité `pnpm exec tsc --noEmit --incremental false`. Vérifier de nouveau `git status --porcelain --untracked-files=all` après le typecheck ; le runner ne démarre que si le worktree est encore parfaitement propre.

### 114.3 Commande CMD corrigée

À coller en une seule ligne dans CMD :

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $wt='C:\Users\ASUS\Jobly-e2e-recette-v3'; $src='C:\Users\ASUS\Jobly'; $st=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0){throw 'Lecture du statut Git impossible.'}; if($st -eq '?? tsconfig.tsbuildinfo'){ $cache=Join-Path $wt 'tsconfig.tsbuildinfo'; if(!(Test-Path -LiteralPath $cache -PathType Leaf)){throw 'Le cache attendu est absent ; arrêt.'}; Remove-Item -LiteralPath $cache -Force; Write-Host 'CACHE TYPECHECK GENERE PRECEDEMMENT SUPPRIME'; } elseif($st){Write-Host $st; throw 'ARRET : autres modifications détectées ; aucun fichier modifié ou supprimé.'}; $st2=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $st2){Write-Host $st2;throw 'Le worktree doit être propre avant fetch/checkout.'}; Write-Host 'WORKTREE_CLEAN'; & git -C $wt fetch origin; if($LASTEXITCODE -ne 0){throw 'git fetch a échoué.'}; & git -C $wt checkout --detach origin/e2e/recette; if($LASTEXITCODE -ne 0){throw 'Checkout distant impossible.'}; $h=& git -C $wt rev-parse HEAD; $r=& git -C $wt rev-parse origin/e2e/recette; if($h -ne $r){throw 'Le HEAD local ne correspond pas à origin/e2e/recette.'}; Set-Location $wt; & node --check 'e2e\run-authenticated-role-recipe.mjs'; if($LASTEXITCODE -ne 0){throw 'Syntaxe du runner invalide.'}; & node --check 'e2e\browser-smoke.mjs'; if($LASTEXITCODE -ne 0){throw 'Syntaxe du smoke navigateur invalide.'}; & pnpm exec tsc --noEmit --incremental false; if($LASTEXITCODE -ne 0){throw 'Typecheck en échec : runner non lancé.'}; $post=(& git status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $post){Write-Host $post;throw 'Le typecheck a laissé des changements : runner non lancé.'}; Write-Host 'TYPECHECK_PASS_WORKTREE_CLEAN'; $started=Get-Date; & node 'e2e\run-authenticated-role-recipe.mjs' $src --browser-only; $code=$LASTEXITCODE; Write-Host ('RUNNER_EXIT='+$code); $files=@('artifacts\e2e\authenticated-role-runner-summary.json','artifacts\e2e\browser-smoke-diagnostic.json','artifacts\e2e\browser-smoke-process.log','artifacts\e2e\lot1-auth-ui-smoke.json'); foreach($f in $files){$p=Join-Path $wt $f; if(Test-Path -LiteralPath $p -PathType Leaf){$i=Get-Item -LiteralPath $p; if($i.LastWriteTime -ge $started.AddSeconds(-2)){Start-Process -FilePath notepad.exe -ArgumentList ([char]34+$p+[char]34)}else{Write-Host ('RAPPORT ANTERIEUR NON OUVERT : '+$p)}}else{Write-Host ('RAPPORT NON GENERE : '+$p)}}; exit $code"
```

Le mode `--browser-only` reste seul activé. Aucun smoke API 40/40 n'est rejoué, aucune fixture n'est réinitialisée/provisionnée, aucun email/SMS n'est envoyé et aucune écriture métier distante n'est attendue. Les rapports sont ouverts dans Notepad uniquement s'ils ont été générés/actualisés pendant cette tentative.

### 114.4 Critère de reprise et preuve à fournir

Transmettre les lignes `WORKTREE_CLEAN`, `TYPECHECK_PASS_WORKTREE_CLEAN`, `RUNNER_EXIT` et les quatre rapports ouverts. Si un fichier autre que `tsconfig.tsbuildinfo` est détecté au départ, si le typecheck échoue ou s'il laisse un artefact, la commande s'arrête avant le runner ; ne pas forcer la suite.

LOT-01 reste **PARTIAL / NON CLOS**. La correction de cette commande n'est pas un résultat de recette et ne vaut pas PASS navigateur.

---

## 113. LOT-01 — commande opérateur corrigée après les anomalies browser-only

**Mise à jour : 9 novembre 2026 — version 2.140.** Cette section remplace comme instruction active le bloc de commande historique du §112.6. Elle ne constitue pas une nouvelle preuve d'exécution : la relance n'a pas encore été effectuée.

### 113.1 Corrections intégrées

La commande corrigée prend en compte les anomalies précédemment remontées :
- HTTP 503 de `GET /api/public/home-stats` : la route appelle désormais `adminClient()` côté serveur et l'ACL de la RPC `get_public_home_stats()` est accordée uniquement à `service_role` sur JOBLY-E2E ;
- référence `failureText` non définie : correction déjà commise dans le runner ;
- absence de rapport navigateur lors d'une assertion interrompue : le smoke écrit désormais un rapport JSON FAIL structuré ;
- sortie de processus peu lisible et rapports éventuellement périmés : la nouvelle commande n'ouvre que les fichiers dont l'horodatage correspond à la nouvelle tentative ;
- annulation antérieure du contrôle CI Typecheck & Build : `pnpm typecheck` est exécuté localement avant le runner, qui réalise ensuite son propre build.

### 113.2 Commande unique CMD — copie et exécution (remplacée par §114.2 et §114.3)

**Cette commande historique est supersédée. Ne plus l'exécuter : son `pnpm typecheck` incrémental produit `tsconfig.tsbuildinfo`, que le runner refuse ensuite.**

La commande ci-dessous doit être collée en une seule ligne dans CMD. Elle utilise uniquement le worktree isolé `C:\Users\ASUS\Jobly-e2e-recette-v3` et lit les variables/fixtures locales depuis `C:\Users\ASUS\Jobly` sans les copier, les afficher ou les modifier.

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $wt='C:\Users\ASUS\Jobly-e2e-recette-v3'; $src='C:\Users\ASUS\Jobly'; $st=& git -C $wt status --porcelain --untracked-files=all; if($LASTEXITCODE -ne 0){throw 'Lecture du statut Git impossible.'}; if($st){$st;throw 'ARRET : worktree non propre. Ne pas checkout, nettoyer ou écraser.'}; Write-Host 'WORKTREE_CLEAN'; & git -C $wt fetch origin; if($LASTEXITCODE -ne 0){throw 'git fetch a échoué.'}; & git -C $wt checkout --detach origin/e2e/recette; if($LASTEXITCODE -ne 0){throw 'Checkout distant impossible.'}; $h=& git -C $wt rev-parse HEAD; $r=& git -C $wt rev-parse origin/e2e/recette; if($h -ne $r){throw 'Le HEAD local ne correspond pas à origin/e2e/recette.'}; Set-Location $wt; & node --check 'e2e\run-authenticated-role-recipe.mjs'; if($LASTEXITCODE -ne 0){throw 'Syntaxe du runner invalide.'}; & node --check 'e2e\browser-smoke.mjs'; if($LASTEXITCODE -ne 0){throw 'Syntaxe du smoke navigateur invalide.'}; & pnpm typecheck; if($LASTEXITCODE -ne 0){throw 'pnpm typecheck a échoué : smoke non lancé.'}; $started=Get-Date; & node 'e2e\run-authenticated-role-recipe.mjs' $src --browser-only; $code=$LASTEXITCODE; Write-Host ('RUNNER_EXIT='+$code); $files=@('artifacts\e2e\authenticated-role-runner-summary.json','artifacts\e2e\browser-smoke-diagnostic.json','artifacts\e2e\browser-smoke-process.log','artifacts\e2e\lot1-auth-ui-smoke.json'); foreach($f in $files){$p=Join-Path $wt $f; if(Test-Path $p){$i=Get-Item $p; if($i.LastWriteTime -ge $started.AddSeconds(-2)){Start-Process -FilePath notepad.exe -ArgumentList ([char]34+$p+[char]34)}else{Write-Host ('RAPPORT ANTERIEUR NON OUVERT : '+$p)}}else{Write-Host ('RAPPORT NON GENERE : '+$p)}}; exit $code"
```

### 113.3 Garde-fous et comportement

- Le statut Git est contrôlé avant tout fetch/checkout avec les fichiers non suivis inclus. Si le worktree n'est pas propre, la commande s'arrête et affiche les changements ; aucun checkout, nettoyage ou écrasement n'est effectué.
- Après le fetch, le worktree est détaché sur `origin/e2e/recette` et le SHA `HEAD` est comparé au SHA distant.
- Les deux `node --check` et `pnpm typecheck` doivent réussir avant le smoke. En cas d'échec, le runner ne démarre pas.
- Seul le mode `--browser-only` est exécuté. Le smoke API authentifié 40/40 n'est pas rejoué ; aucune fixture n'est réinitialisée ou provisionnée.
- Le runner ouvre automatiquement dans Notepad uniquement les rapports produits/actualisés pendant cette tentative : `authenticated-role-runner-summary.json`, `browser-smoke-diagnostic.json`, `browser-smoke-process.log` et `lot1-auth-ui-smoke.json`. Les rapports absents ou antérieurs sont signalés sans ouvrir un ancien fichier comme preuve du nouveau run.
- Le mode browser-only reste non mutatif sur les données métier distantes : `remoteDataMayBeModified=false`, aucun email/SMS ou autre effet externe.
- La cible attendue est le smoke public/anonyme 14/14 sans FAIL/BLOCKED. Ce résultat est une attente de recette, pas un PASS acquis.

### 113.4 Ce qui doit être retourné après exécution

Transmettre les quatre rapports lorsqu'ils sont produits, ainsi que les lignes console `WORKTREE_CLEAN`, `RUNNER_EXIT` et tout message `RAPPORT NON GENERE` / `RAPPORT ANTERIEUR NON OUVERT`. En cas de worktree sale ou d'échec de typecheck, transmettre le message d'arrêt ; ne pas forcer le checkout ni lancer le runner.

LOT-01 reste **PARTIAL / NON CLOS** jusqu'à obtention et vérification des preuves navigateur, puis des parcours authentifiés par rôle et des autres critères du §0.3. Aucun accès JOBLY-PROD, merge, push sur `main` ou déploiement n'est autorisé par cette procédure.

---

## 112. LOT-01 — correction de l'API home-stats et fiabilisation du diagnostic browser-only

**Rapport opérateur reçu : 9 novembre 2026.** Le résumé porte `createdAt=2026-11-09T00:13:27.807Z`, le processus Playwright `startedAt=2026-11-09T00:19:13.807Z`, `mode=browser-only`, JOBLY-E2E / `ofqqrryamslxoqkklraw`, `build=PASS`, `localServer=PASS`, `browserSmoke=BLOCKED`, `exitCode=1`, aucun rapport Playwright initial, `authenticatedRoleSmoke=NOT_RUN`, `remoteDataMayBeModified=false`, `secretsPrinted=false`.

### 112.1 Diagnostic confirmé

Le log fourni par l'opérateur montre une assertion réelle :
`GET /api/public/home-stats` renvoie HTTP 503 alors que le smoke exige HTTP 200. Node 26.13.0 s'arrête sur cette assertion dans `e2e/browser-smoke.mjs` ; le rapport Playwright n'a donc pas été généré lors de ce run.

Le résumé affiche également `reason="failureText is not defined"`. La relecture du runner confirme une seconde anomalie indépendante : la génération de `browser-smoke-diagnostic.json` référençait `failureText` sans variable déclarée. Cette erreur masquait le détail de la première panne dans le résumé.

Les diagnostics de configuration confirment l'isolation correcte : URL/ref du projet JOBLY-E2E cohérents, publishable key présente, clé serveur `sb_secret` vérifiée pour ce projet (probe HTTP 200). Aucun secret n'a été imprimé et aucune donnée distante métier n'a été modifiée par ce lancement.

### 112.2 Cause Supabase établie par lecture SQL

Sur le seul projet JOBLY-E2E, la fonction `public.get_public_home_stats()` existe ; son propriétaire est `postgres`, elle est `SECURITY DEFINER` et son `search_path` est vide (configuration fixée à `search_path=""`). Avant correction, son ACL était `{postgres=X/postgres}` : ni `anon`, ni `authenticated`, ni `service_role` ne disposaient du droit EXECUTE.

La migration `20261108165510_jobly_e2e_lot00_least_privilege_public_api.sql` retire explicitement les droits EXECUTE publics et précise que cette RPC ne doit plus être appelée par le rôle anonyme ; la route d'accueil de la branche utilisait pourtant encore `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. L'HTTP 503 vient de cette incohérence d'architecture : route publique utilisant un rôle non autorisé, alors que la stratégie attend un appel de serveur privilégié. Il ne faut pas rouvrir EXECUTE à `anon` ou `authenticated`.

### 112.3 Correctifs de code commis sur `e2e/recette`

- `app/api/public/home-stats/route.ts`, commit `0316a5f26ea88bc82a43aa702f0b0487350b96a7` : la route utilise désormais `adminClient()` côté serveur et n'appelle plus la RPC avec la publishable key. La réponse HTTP continue de ne renvoyer que les trois agrégats validés (`offersCount`, `talentsCount`, `updatedAt`).
- `e2e/run-authenticated-role-recipe.mjs`, commit `616b01513aacc77bf0faa2471cbf82701ebce949` : la référence non définie à `failureText` est remplacée par un test explicite de présence du fichier `failure.txt`.
- `e2e/browser-smoke.mjs`, commit `badf7b30174ed6cd0d8d66ab8af7fa6443f4868e` : une assertion interrompue écrit maintenant `lot1-auth-ui-smoke.json` avec l'identifiant du contrôle courant, les contrôles passés, le contrôle FAIL, les contrôles Auth restés BLOCKED, le statut HTTP observé et la trace de l'erreur. Le processus retourne toujours un code non nul pour que le runner classe correctement le lot en FAIL.

### 112.4 Migration de droits appliquée et vérifiée — JOBLY-E2E uniquement

Fichier source commis : `supabase/migrations/20261109002250_home_stats_rpc_service_role_only.sql` (blob `fc154f3917fdbf271710c8b2574017eb2fafc9e5`). La migration révoque les droits de `PUBLIC`, `anon`, `authenticated` et `service_role`, puis accorde EXECUTE uniquement à `service_role`.

La migration a été appliquée avec succès au projet `ofqqrryamslxoqkklraw` ; version enregistrée dans Supabase : `20261109002250`, nom `home_stats_rpc_service_role_only`. Requête SQL de vérification après application :
- ACL : `{postgres=X/postgres,service_role=X/postgres}` ;
- `anon_execute=false` ;
- `authenticated_execute=false` ;
- `service_role_execute=true` ;
- fonction toujours `SECURITY DEFINER`, `search_path=""`.

La règle de moindre privilège est ainsi conservée : seuls les appels serveur disposant de la clé privée peuvent invoquer la fonction. Aucun droit RPC n'a été donné aux visiteurs ou aux sessions client. Aucun accès JOBLY-PROD.

### 112.5 CI et état des preuves

Sur le commit `3dff5d1c37e35205bf91d2f51042ba050aafd876`, le contrôle GitHub a ensuite terminé : `Jobly CI — Typecheck & Build` = `cancelled` (ce n'est pas un PASS), `Jobly Security Core — isolated migration tests` = `success`. Plusieurs workflows annexes ont également terminé avec succès, d'autres sont restés en cours ; ils ne remplacent pas le contrôle de build annulé. Le build après les corrections n'est donc pas encore validé par CI ; le runner ciblé exécute le build mais pas pnpm typecheck, d'où l'ajout du typecheck local à la commande §112.6. La comparaison réalisée au commit `7061d69cc7151a94af4bfbe3e175c31d020f014f` avec le point de départ `016544e944c1445561cb7821f80cf72880bd907e` donnait 16 commits en avance et 0 en retard ; deux commits documentaires ont ensuite mis à jour uniquement ce fichier de continuité. La comparaison confirme également que `main` conserve le SHA `979f2ccfec9258bc30989af18433cf6adb1b4698`. Aucun PASS de build CI n'est revendiqué.

Acquis : root cause identifiée par ACL, code corrigé sur la branche, migration appliquée au projet E2E, ACL vérifiée. Non acquis : l'appel HTTP de la route après correction et le smoke Playwright complet. Le prochain lancement doit les vérifier. Ne pas relancer le smoke API authentifié 40/40 : il est déjà PASS (§107 et §109).

### 112.6 Prochaine exécution — navigateur seul, sans mutation métier distante

**Instruction historique supersédée par le §113 (V2.140) : ne pas exécuter l'ancien bloc de commande ci-dessous.** Il est conservé uniquement pour la traçabilité. La commande courante inclut la validation HEAD, le contrôle strict des rapports frais et l'ouverture conditionnelle Notepad.

Le worktree doit être propre avant le checkout. Si la vérification affiche autre chose que `WORKTREE_CLEAN`, arrêter sans écraser ni nettoyer les fichiers locaux.

```cmd
powershell -NoProfile -Command "$s = git -C 'C:\Users\ASUS\Jobly-e2e-recette-v3' status --porcelain; if ($LASTEXITCODE -ne 0) { exit 2 }; if ($s) { $s; exit 3 }; Write-Output 'WORKTREE_CLEAN'"
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 fetch origin
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 checkout --detach origin/e2e/recette
if errorlevel 1 exit /b 1
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 exit /b 1
node --check e2e\browser-smoke.mjs
if errorlevel 1 exit /b 1
pnpm typecheck
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly --browser-only
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\browser-smoke-diagnostic.json
notepad artifacts\e2e\browser-smoke-process.log
notepad artifacts\e2e\lot1-auth-ui-smoke.json
pause
```

Cette commande exécute d'abord le typecheck, puis le runner fait un nouveau build, démarre le serveur local et le smoke navigateur uniquement. Elle ne rejoue pas `authenticated-role-smoke.mjs`, ne réinitialise aucune fixture, n'envoie aucun email/SMS, et conserve `remoteDataMayBeModified=false`. Les quatre rapports Notepad ci-dessus sont les éléments à transmettre.

### 112.7 Garde-fous inchangés

- Branche cible `e2e/recette` uniquement ; `main` reste `979f2ccfec9258bc30989af18433cf6adb1b4698`, inchangée.
- Aucun merge, aucune mise en production Vercel/Netlify, aucune modification JOBLY-PROD.
- Aucun reset/provisioning/password update des fixtures.
- Smoke API authentifié PASS 40/40 conservé ; ne pas le rejouer pour ce correctif.
- LOT-01 navigateur reste à valider après relance ; LOT-01 global et lots suivants ne sont pas déclarés clos.

---

## 111. LOT-01 — diagnostic du premier lancement browser-only : rapport Playwright absent

**Rapport opérateur reçu : 9 novembre 2026 à 00:00:16.624Z. Statut : BLOCKED avant rapport navigateur ; correctif de diagnostic commis, cause d'exécution à identifier.**

### 111.1 Résultat exact reçu

Le résumé `authenticated-role-runner-summary.json` indique :
- `mode=browser-only`, JOBLY-E2E, ref `ofqqrryamslxoqkklraw` ;
- `status=BLOCKED` ;
- `build=PASS`, `localServer=PASS` ;
- sonde `/api/profile` : HTTP 401 attendu, reçue après 4 tentatives ;
- `authenticatedRoleSmoke=NOT_RUN`, `browserSmoke=NOT_RUN`, `browserChecks=null`, `browserAuthEvidence=null` ;
- `remoteDataMayBeModified=false`, `secretsPrinted=false` ;
- cause publiée : `Le rapport Playwright lot1-auth-ui-smoke.json n’a pas été généré.`

**Interprétation :** l'isolement projet et la mise en route du site local ont réussi ; l'exécution navigateur ne peut pas encore être déclarée FAIL sur un élément d'interface, car aucun rapport de contrôle n'existe. Ce résultat est BLOCKED et non un échec fonctionnel de Jobly. Aucun smoke API authentifié n'a été relancé et aucune écriture distante n'a été effectuée.

### 111.2 Faiblesse du harnais découverte à la relecture

Dans `e2e/browser-smoke.mjs`, `chromium.launch({ headless: true })` était situé avant le bloc `try/catch`. Une erreur de lancement Chromium pouvait donc interrompre le processus avant que le script écrive `failure.txt` et sans donner au runner un détail exploitable dans son JSON.

Le runner browser-only attendait simplement la présence de `lot1-auth-ui-smoke.json`. Il ne conservait pas la sortie standard/erreur du processus, son code de sortie ou sa cause d'arrêt. Il ne vérifiait pas non plus si un rapport préexistant provenait réellement de cette exécution. Ces défauts rendaient le diagnostic incomplet et pouvaient faire prendre un ancien rapport pour une nouvelle preuve.

Aucune preuve ne permet encore d'affirmer que Chromium est la cause réelle ; c'est une hypothèse prioritaire rendue maintenant observable, pas un diagnostic final.

### 111.3 Correctifs commis

- Runner `e2e/run-authenticated-role-recipe.mjs`, commit `1a3f53f3df3ed9553623ec7fa5ec03eee49f4fb9` : nouveau lanceur capturant stdout/stderr, enregistrement de `browser-smoke-process.log`, code de sortie et spawnError.
- Smoke `e2e/browser-smoke.mjs`, commit `997f7f00718cba203a90ba73249a311d12b22677` : lancement Chromium déplacé dans le try/catch existant ; les erreurs de launch sont désormais écrites dans `failure.txt`.
- Runner `e2e/run-authenticated-role-recipe.mjs`, commit `d4dd83fa01bf246fc994822a79ff29b93dfaa360` : rapport accepté uniquement si son horodatage est celui du run courant et si environnement, project ref, URL locale et SHA correspondent exactement. Un rapport ancien est explicitement rejeté.

Le résumé ajoute les informations `browserExecution` et `browserFailure`. Le diagnostic complémentaire `browser-smoke-diagnostic.json` est également écrit lorsque le processus Playwright se termine après lancement.

### 111.4 Prochaine exécution unique — diagnostic enrichi

Le worktree doit d'abord être propre ; si cette garde échoue, ne rien écraser. Sinon, récupérer la branche et lancer le même mode navigateur isolé (pas le mode API) :

```cmd
powershell -NoProfile -Command "$s = git -C 'C:\Users\ASUS\Jobly-e2e-recette-v3' status --porcelain; if ($LASTEXITCODE -ne 0) { exit 2 }; if ($s) { $s; exit 3 }; Write-Output 'WORKTREE_CLEAN'"
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 fetch origin
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 checkout --detach origin/e2e/recette
if errorlevel 1 exit /b 1
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 exit /b 1
node --check e2e\browser-smoke.mjs
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly --browser-only
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\browser-smoke-diagnostic.json
notepad artifacts\e2e\browser-smoke-process.log
pause
```

Cette commande ne rejoue pas `authenticated-role-smoke.mjs`, maintient `remoteDataMayBeModified=false` et n'envoie aucun email/SMS. Elle rebuild le code actuel, redémarre le serveur local et exécute uniquement le navigateur public/anonyme.

Si `browser-smoke-diagnostic.json` n'existe pas, transmettre le résumé et le log processus. Le log processus est la preuve d'erreur prioritaire ; le fichier `failure.txt` du smoke peut être absent si le processus s'est arrêté avant son gestionnaire d'erreur.

### 111.5 Ce qui reste inchangé

- PASS build + serveur du run 00:00 conservés comme preuve de cette tentative ; le run enrichi doit les confirmer à nouveau après le nouveau SHA.
- PASS API 40/40 et nettoyage 3/3 acquis (§107 et §109), ne pas les rejouer.
- JOBLY-PROD, `main`, merge et déploiement hors périmètre.
- Le smoke navigateur est non mutatif : GET publics/anonymes uniquement ; aucune soumission, login, paiement, candidature ou message externe.

**Conclusion §111 :** le harnais est maintenant instrumenté pour exposer le vrai point d'arrêt et empêcher les rapports périmés. La prochaine exécution doit produire soit un rapport navigateur, soit une cause lisible dans le log capturé ; aucun résultat Playwright n'est inventé.

---

## 110. LOT-01 — smoke navigateur isolé : audit de couverture et runner browser-only

**Mise à jour : 9 novembre 2026. Statut : MODE CIBLÉ COMMIS ; première exécution BLOCKED avant rapport ; diagnostic complémentaire commis au §111.**

### 110.1 Audit du smoke navigateur existant

Fichier relu sur `e2e/recette` : `e2e/browser-smoke.mjs`, blob initial `87d7acbadce230d5b343ee6025e246e0016408d2`, désormais mis à jour au §110.3.

Couverture effectivement implémentée :
- accueil public rendu et logo visible ;
- appel GET `/api/public/home-stats` en HTTP 200, validation des compteurs et de l'horodatage ;
- navigation vers le formulaire de connexion, champs username/password et bouton Google visibles ;
- contrôle Afficher/Masquer du mot de passe ;
- navigation vers l'inscription et présence des champs nom, prénom, téléphone et email, sans soumission ;
- accueil mobile à 390 × 844, contrôle de débordement horizontal et de chevauchement du hero ;
- six GET anonymes vers les API protégées (profil, jobs, candidatures, bonus IA, CV original et Career Journey), chacun devant retourner HTTP 401 ;
- aucune erreur JavaScript navigateur non interceptée.

Le code de la page d'accueil actuelle `app/page.tsx` a été relu : les sélecteurs du smoke (CTA accueil, visuel, champs autocomplete et contrôle d'affichage du mot de passe) sont présents. Cela constitue une vérification statique de cohérence des sélecteurs, pas encore un résultat Playwright.

Limites explicites :
- aucun login réel dans le navigateur ;
- aucune soumission d'inscription, aucun OTP, aucun Google OAuth réel ;
- aucune réinitialisation de mot de passe ;
- aucune candidature, aucun paiement, email, SMS ou appel fournisseur externe ;
- AUTH-006/007 réutilisent un rapport Auth séparé ; ils ne se connectent pas à nouveau depuis le navigateur.

### 110.2 Runner browser-only — aucune répétition du smoke API

Le runner `e2e/run-authenticated-role-recipe.mjs` accepte désormais un troisième argument facultatif :
- mode par défaut `api` : comportement antérieur inchangé ;
- mode `--browser-only` : build local, serveur Next isolé, installation/vérification Playwright + Chromium, puis exécution exclusive de `e2e/browser-smoke.mjs`.

Dans le mode navigateur :
- le smoke `e2e/authenticated-role-smoke.mjs` n'est pas lancé ;
- `remoteDataMayBeModified=false` reste conservé ;
- les endpoints applicatifs appelés par le smoke sont en GET, les formulaires ne sont jamais soumis ;
- les captures desktop/mobile sont conservées dans `artifacts/e2e` ;
- le résumé `authenticated-role-runner-summary.json` donne `browserSmoke` et les compteurs `browserChecks`, tandis que `authenticatedRoleSmoke=NOT_RUN` rappelle que les 40 API ne sont pas rejouées.

Le rapport Auth 12/12 est sélectionné dans cet ordre : artefact déjà présent dans le worktree, puis artefact du dépôt source. Le chemin est transmis au smoke via `E2E_AUTH_SESSION_REPORT_PATH` ; le script valide encore le projet exact, les 3 rôles, les 12 contrôles PASS et une fraîcheur inférieure ou égale à 6 heures. Si aucun rapport récent n'est trouvé, les contrôles AUTH-006/007 restent BLOCKED, sans invalider les vérifications visuelles exécutées.

### 110.3 Correctifs commis

| Fichier | Commit | Changement |
|---|---|---|
| `e2e/run-authenticated-role-recipe.mjs` | `fc0443d2e753224a3d44bc0c65c1a4fdd760d7b8` | Ajout du mode Playwright browser-only, provisioning Playwright/Chromium et synthèse navigateur sans appel API authentifié |
| `e2e/browser-smoke.mjs` | `8a5495216ed97e3adc79133f22b0a0b25bf620e0` | Acceptation d'un chemin explicite pour le rapport Auth antérieur |
| `e2e/run-authenticated-role-recipe.mjs` | `22182ffd3757d8c30eb2a8f71cffd310cb7596ee` | Priorité au rapport Auth déjà présent dans le worktree et traçabilité du SHA dans le rapport navigateur |
| `e2e/run-authenticated-role-recipe.mjs` | `1a3f53f3df3ed9553623ec7fa5ec03eee49f4fb9` | Capture stdout/stderr du processus Playwright et conservation du code de sortie/log |
| `e2e/browser-smoke.mjs` | `997f7f00718cba203a90ba73249a311d12b22677` | Déplacement du lancement Chromium dans le bloc try/catch pour enregistrer ses erreurs |
| `e2e/run-authenticated-role-recipe.mjs` | `d4dd83fa01bf246fc994822a79ff29b93dfaa360` | Rapport Playwright rejeté s'il est ancien ou ne correspond pas au projet, à l'URL et au SHA du run courant |

### 110.4 Commande ciblée — LOT-01 navigateur uniquement

Depuis CMD, après récupération du code distant :

```cmd
powershell -NoProfile -Command "$s = git -C 'C:\Users\ASUS\Jobly-e2e-recette-v3' status --porcelain; if ($LASTEXITCODE -ne 0) { exit 2 }; if ($s) { $s; exit 3 }; Write-Output 'WORKTREE_CLEAN'"
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 fetch origin
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 checkout --detach origin/e2e/recette
if errorlevel 1 exit /b 1
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 exit /b 1
node --check e2e\browser-smoke.mjs
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly --browser-only
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\lot1-auth-ui-smoke.json
pause
```

Si le worktree n'est pas propre, la commande s'arrête et aucun changement local n'est écrasé. La première exécution peut télécharger Playwright/Chromium dans `.e2e-tools` ; ces outils ne sont pas ajoutés aux dépendances applicatives ni à Git.

Rapports attendus :
- `artifacts/e2e/authenticated-role-runner-summary.json` ;
- `artifacts/e2e/lot1-auth-ui-smoke.json` ;
- captures `auth-home-desktop.png`, `auth-login-desktop.png`, `auth-signup-desktop.png`, `auth-home-mobile.png`.

Ouvrir les deux rapports avec Notepad immédiatement après la commande. En cas d'erreur, transmettre seulement le résumé et `failure.txt` si généré ; ne pas envoyer les fichiers .env ou le manifeste fixtures.

### 110.5 Étape suivante après ce PASS

Le smoke public et responsive est le premier jalon UI. Une fois son rapport validé, ajouter une recette navigateur authentifiée distincte :
1. login Talent par fixture existante, consultation liste/recherche/détail des offres, espace candidatures et CV sans écraser un document préexistant ;
2. login Recruteur, liste d'offres et candidatures, ouverture Recruitment360, score/shortlist et export sur données E2E synthétiques appartenant au run, puis nettoyage API/DB ;
3. refus d'accès inter-rôles et retour arrière/session expirée.

Ces parcours ne sont pas contenus dans le smoke anonyme de cette section et ne doivent pas être considérés comme déjà PASS.

**Conclusion §110 :** le code de recette possède un chemin navigateur isolé et non mutatif, qui évite de rejouer les 40 API authentifiées. Le premier lancement a confirmé build et serveur PASS, mais Playwright n'a pas produit de rapport. Aucun PASS navigateur nouveau n'est revendiqué ; voir le diagnostic §111.

---

## 109. LOT-01 — résumé global du runner authentifié : PASS

**Rapport opérateur reçu : `createdAt=2026-11-08T23:39:07.147Z`. Statut global transmis : PASS.**

### 109.1 Environnement et configuration — PASS

- `environment=JOBLY-E2E`, `projectRef=ofqqrryamslxoqkklraw`.
- Source locale : `.env.local` ; l'URL n'y est pas définie et a été dérivée du manifeste E2E validé.
- `supabaseUrlDerivedFromFixture=true`, `supabaseUrlMatchesE2E=true`, `fixtureProjectRefMatchesE2E=true`.
- Clé publishable présente ; clé serveur de type `sb_secret`.
- Probe PostgREST sur le projet exact : HTTP 200 ; `serverKeyVerifiedForE2E=true`.
- Aucun secret imprimé.

### 109.2 Build et serveur local — PASS

- Build Next.js : **PASS**.
- Serveur local : **PASS**.
- Sonde de disponibilité : HTTP 401 attendu sur `/api/profile`, reçu à la quatrième tentative ; aucune erreur réseau ; processus serveur encore actif à la vérification.
- Base URL locale : `http://127.0.0.1:3217`.

### 109.3 Smoke API et nettoyage — PASS

- `authenticatedRoleSmoke=PASS`.
- 40 contrôles : 40 PASS, 0 BLOCKED, 0 FAIL.
- TALENT, RECRUITER et PARTNER : tous `EXECUTED`.
- Nettoyages : `RECRUITER-DRAFT-CLEANUP`, `CROSS-ROLE-APPLICATION-LIFECYCLE-CLEANUP-API` et `CROSS-ROLE-APPLICATION-LIFECYCLE-CLEANUP-DB` : **3/3 PASS**.
- `cleanup.allPass=true`, `externalActions=false`.

### 109.4 Lecture de `remoteDataMayBeModified`

Le rapport donne `remoteDataMayBeModified=true`. Ce champ signifie que le runner a franchi la frontière où les scénarios authentifiés peuvent effectuer des mutations synthétiques sur JOBLY-E2E ; il ne signifie pas que des données sont restées en place. Les trois contrôles de nettoyage passent, et le rapport détaillé §107 confirme que l'offre et la candidature synthétiques sont absentes de la base après le test. Aucun email, SMS ou action externe n'a été déclenché.

### 109.5 Réconciliation des horodatages et limite de traçabilité

Deux rapports opérateur sont désormais disponibles :
- rapport de synthèse global : `2026-11-08T23:39:07.147Z` ;
- rapport détaillé smoke API : `2026-11-08T23:48:30.438Z` (§107).

Le rapport global porte un horodatage antérieur au rapport détaillé. Les deux résultats sont cohérents (40/40, mêmes rôles et mêmes identifiants de nettoyage), mais aucun runId commun n'est fourni ; ils sont donc consignés comme deux preuves opérateur concordantes, sans affirmer qu'ils proviennent du même processus. Cela n'invalide pas leurs résultats individuels.

### 109.6 Conclusion et prochaine étape

**Acquis :** configuration E2E, vérification de la clé serveur, build Next.js, démarrage du serveur local et smoke API authentifié : **PASS**. Le nettoyage des données synthétiques est également PASS.

**Non acquis par ces rapports :** clôture globale de LOT-01 (parcours UI/navigation et autres critères de sa matrice), clôture de LOT-02 Talent et LOT-03 Recruitment360, ainsi que les autres lots. Ne pas rejouer les 40 contrôles API déjà verts en l'absence de modification ou de régression.

**Prochaine progression :** reprendre la matrice UI et métier à partir des critères non couverts, en commençant par Talent et Recruitment360 ; sélectionner les scénarios manquants et les exécuter seuls. Garder JOBLY-E2E uniquement. Aucun accès JOBLY-PROD, aucun changement de `main`, aucune fusion et aucun déploiement.

**Conclusion §109 :** le sous-périmètre runner + API authentifiée est **PASS**. La recette E2E globale demeure en cours.

---

## 108. Récupération du résumé global du runner — terminée

**Mise à jour : 9 novembre 2026. Statut : RAPPORT REÇU ; ne pas relancer le runner.**

L'opérateur a transmis `artifacts/e2e/authenticated-role-runner-summary.json` directement dans la conversation. L'étape de récupération sans CMD est donc close.

Le résultat du runner est consigné au §109. Aucun nouveau contrôle manuel ou test de répétition n'est requis pour le sous-périmètre déjà vert.

## 107. LOT-01 — smoke API authentifié des trois rôles et cycle croisé : PASS 40/40

**Rapport opérateur reçu : 8 novembre 2026 à 23:48:30.438Z. Statut : PASS — sous-périmètre API authentifié et cycle croisé exécutés.**

### 107.1 Bilan général transmis

Rapport artifacts/e2e/authenticated-role-smoke.json :
- environnement : JOBLY-E2E ;
- projet : ofqqrryamslxoqkklraw ;
- base URL locale : http://127.0.0.1:3217 ;
- statut : PASS ;
- contrôles : 40/40 PASS, 0 BLOCKED, 0 FAIL ;
- rôles : TALENT, RECRUITER et PARTNER tous EXECUTED ;
- externalActions=false.

La preuve confirme que la nouvelle configuration du §106 a permis d'atteindre le smoke API authentifié ; ce rapport ne contient aucun mot de passe, token ou clé.

### 107.2 Couverture Talent — PASS

- Connexion Auth réelle et vérification du jeton getUser : PASS.
- Profil et candidatures : HTTP 200, PASS.
- Flux d'offres local et flux Afrique : HTTP 200, structure et compteurs jugés cohérents, PASS.
- Détail d'offre active : HTTP 200, PASS.
- CV original : HTTP 404 traité comme comportement correct car aucun CV original n'est enregistré ; le contrôle lui-même est PASS.
- Career Journey : HTTP 200 en lecture seule, sans création d'état, PASS.

### 107.3 Couverture Recruteur / Recruitment360 — PASS

- Connexion Auth réelle, vérification du jeton, profil, liste des offres, candidatures, talents et lectures Recruitment360 : PASS.
- Identifiant de recrutement non détenu refusé avec HTTP 403 : PASS.
- Ajout de document sur une candidature inexistante refusé avec HTTP 404 avant insertion : PASS.
- Brouillon synthétique : création HTTP 201, détail HTTP 200, modification HTTP 200, suppression API HTTP 200 : PASS.

### 107.4 Couverture Partenaire — PASS

- Connexion Auth réelle et vérification du jeton : PASS.
- Profil Partenaire, commissions et onboarding ambassadeur : HTTP 200, PASS.

### 107.5 Parcours croisé Talent → Recruteur — PASS de bout en bout

Les contrôles suivants sont tous PASS :
1. Création d'une offre locale synthétique via l'API Recruteur (HTTP 201).
2. Canal de candidature e-mail fictif .invalid et applicationReady=true confirmés.
3. Profil Talent lu et candidature préparée sans soumission ni envoi externe ; statut USER_REVIEW.
4. Même candidature retrouvée dans l'espace Talent et l'inbox du Recruteur.
5. Transition Recruteur vers INTERVIEW, puis décision OFFER avec statusSource=RECRUITER.
6. Tentative Talent de remplacer la décision refusée fonctionnellement : le statut final reste OFFER et la source reste RECRUITER.
7. Suppression API de l'offre synthétique : PASS HTTP 200.
8. Vérification directe en base : offre et candidature absentes après nettoyage ; contrôles CROSS-ROLE-APPLICATION-LIFECYCLE-CLEANUP-API et CROSS-ROLE-APPLICATION-LIFECYCLE-CLEANUP-DB tous deux PASS.

Les mutations temporaires de ce scénario étaient limitées au projet JOBLY-E2E et les preuves fournies confirment leur suppression. Aucun email, SMS, candidature réelle ou action externe n'a été déclenché.

### 107.6 Portée exacte et limites

- Acquis : smoke API authentifié TALENT/RECRUITER/PARTNER 40/40 ; droits de lecture sensibles couverts par les cas présents ; parcours croisé candidature/entretien/décision ; suppression API et vérification de l'absence en base.
- Toujours non démontré par ce rapport seul : le résumé distinct authenticated-role-runner-summary.json, qui donne le statut explicite du build et du probe du serveur local ; smoke navigateur/UI complet ; matrice intégrale de sécurité et de navigation ; clôture globale de LOT-01, LOT-02 ou LOT-03.
- Ne pas rejouer les 40 contrôles déjà verts sans changement de code ou anomalie nouvelle. Conserver le rapport comme preuve de référence.
- main reste 979f2ccfec9258bc30989af18433cf6adb1b4698, inchangée ; aucune fusion et aucun déploiement.
- LOT-00 reste clôturé comme établi dans le document ; aucune migration ni donnée JOBLY-PROD n'est concernée.

### 107.7 Prochaine étape utile

La prochaine action n'est pas de répéter le smoke Auth/API. Récupérer le résumé global déjà généré pendant la même exécution pour consigner séparément build, localServer, authenticatedRoleSmoke, cleanup et remoteDataMayBeModified. Ensuite, poursuivre les scénarios UI/métier non couverts des lots Talent et Recruitment360, en conservant les 40 contrôles API comme PASS acquis.

**Conclusion §107 :** le principal blocage de la recette API authentifiée est levé. Le sous-périmètre API par rôle et le cycle croisé sont PASS 40/40. Ne pas étendre ce résultat à toute la recette E2E ni déclarer les lots complets sans leurs preuves propres.

---

## 106. LOT-01 — URL E2E absente des variables locales : résolution par identité du manifeste

**Mise à jour : 9 novembre 2026. Statut : CORRECTIF RUNNER COMMIS SUR `e2e/recette` ; exécution intégrée encore requise.**

### 106.1 Nouveau rapport opérateur — 8 novembre 2026 à 23:35:34.200Z

Résumé reçu :
- `environment=JOBLY-E2E`, `projectRef=ofqqrryamslxoqkklraw` ;
- `status=BLOCKED`, `build=NOT_RUN`, `localServer=NOT_RUN`, `authenticatedRoleSmoke=NOT_RUN` ;
- `configDiagnostics.sourceFiles=[".env.local"]` ;
- `supabaseUrlPresent=false`, `supabaseUrlMatchesE2E=false`, `configuredProjectRef="missing-or-invalid"` ;
- clé publishable reconnue ; type de clé serveur `sb_secret` ;
- `remoteDataMayBeModified=false`, `secretsPrinted=false`.

Cette preuve distingue la cause du §105 : le parseur n'est plus le problème principal. Next.js charge bien `.env.local`, mais aucune des variables `NEXT_PUBLIC_SUPABASE_URL` ou `SUPABASE_URL` n'est définie dans cet environnement. Le runner s'arrêtait donc sur une URL absente avant le build. Pas de requête Auth, pas de test API et aucune donnée distante touchée.

### 106.2 Décision de résolution — source d'identité = manifeste E2E

Il n'est pas nécessaire de demander à l'opérateur de modifier son fichier local ou de recopier une URL déjà déterminée par le projet. Le manifeste `.e2e-fixtures.json` contient les champs d'identité `environment` et `projectRef`, et le runner utilise déjà ce même manifeste pour sélectionner les trois fixtures.

Le runner charge donc et valide le manifeste **avant** de construire l'environnement :
- `environment` doit être exactement `JOBLY-E2E` ;
- `projectRef` doit être exactement `ofqqrryamslxoqkklraw` ;
- en absence d'URL dans les variables locales, l'URL est dérivée sous la forme `https://{projectRef}.supabase.co` ;
- si une URL est explicitement présente mais différente de JOBLY-E2E, le runner refuse de la remplacer et s'arrête avant le build.

Cette règle est fail-closed : elle ne transforme jamais une URL explicite d'un autre projet en URL E2E ; elle ne complète que l'absence, à partir d'une identité de fixture elle-même strictement validée.

### 106.3 Vérification de la clé serveur contre le projet

Le seul préfixe `sb_secret_` indique le type de clé, pas à lui seul le projet auquel elle appartient. Avant le build, le runner envoie maintenant une requête GET lecture seule vers `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec la clé en header `apikey` et `Accept: application/openapi+json`. Le corps de réponse est immédiatement annulé ; aucune table métier, aucun compte Auth ni aucune ligne utilisateur n'est interrogé.

Un HTTP succès confirme que la clé serveur est acceptée par le PostgREST du projet E2E exact. Un refus/une erreur réseau arrête le runner avant build et avant toute mutation. Cette forme d'usage du header `apikey` pour les clés secrètes est conforme à la documentation Supabase : [API keys — test d'une clé secrète sur le point d'entrée REST](https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys) ; [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

Le résumé ajoute :
- `supabaseUrlConfiguredInEnv` et `supabaseUrlDerivedFromFixture` ;
- `fixtureProjectRefMatchesE2E` ;
- `serverKeyVerifiedForE2E` et `serverKeyProbeStatus`.

Aucune valeur de clé ni aucun corps OpenAPI n'est inscrit dans le rapport.

### 106.4 Correctif commis

Fichier : `e2e/run-authenticated-role-recipe.mjs`  
Commit : `5b39cdea1b5810f2d9fe49fc8111ac3897d8c1df`

Le smoke `e2e/authenticated-role-smoke.mjs` reste au commit `73aee328bc2f11ff15628cac13a7d3bd932f8e1e` : il utilise uniquement la configuration vérifiée et injectée par le runner. Le chargeur commun `@next/env` du §105 est conservé.

### 106.5 Statut et prochaine exécution utile

- Le rapport 23:35:34 ne déclenche ni build ni serveur ; il n'est pas un échec des API métier.
- Le commit corrige le runner, mais n'est pas encore exécuté localement ; ne pas annoncer BUILD PASS, API PASS ou LOT-01 PASS.
- JOBLY-PROD, `main`, merge et déploiement restent hors périmètre.
- Aucune fixture n'est recréée, aucun mot de passe n'est changé et aucun runtime privé n'est demandé.

La prochaine exécution doit être faite directement avec le runner complet depuis le worktree v3 propre, après récupération de `origin/e2e/recette`. Aucun contrôle manuel supplémentaire de l'URL dans `.env.local` n'est requis. Le rapport de synthèse déterminera si le blocage est définitivement levé ou si la clé serveur échoue au probe E2E ; dans ce dernier cas, le blocage sera alors précisément identifié comme clé locale liée à un autre projet ou rejetée par JOBLY-E2E.

**Conclusion §106 :** la configuration ne dépend plus de la présence d'une URL dans `.env.local`. L'identité du projet vient du manifeste de fixtures vérifié et la clé serveur est contrôlée contre le point REST du projet correspondant, avant tout build et toute écriture.

---

## 105. LOT-01 — sortie du blocage de chargement de configuration : chargeur Next.js unifié

**Mise à jour : 9 novembre 2026. Statut : CORRECTIFS COMMIS SUR `e2e/recette` ; exécution runtime à refaire une seule fois.**

### 105.1 Dernier rapport opérateur — 8 novembre 2026 à 23:28:52.247Z

Le runner a produit :
- `environment=JOBLY-E2E`, `projectRef=ofqqrryamslxoqkklraw` ;
- `status=BLOCKED` ; `build=NOT_RUN`, `localServer=NOT_RUN`, `authenticatedRoleSmoke=NOT_RUN` ;
- configuration URL reçue vide au contrôle strict ;
- `remoteDataMayBeModified=false`, `secretsPrinted=false`.

Conclusion : le contrôle bloquait avant le build. Aucune connexion API, aucun test authentifié, aucune mutation distante et aucun changement de compte/profil n'ont été lancés pendant cette tentative. Ne pas la comptabiliser comme un échec de l'API métier.

### 105.2 Cause logicielle établie à la relecture

Deux mécanismes de chargement indépendants coexistaient :
- le runner faisait sa propre lecture ligne par ligne de `.env`, `.env.local` et `.env.e2e.local`, sans appliquer exactement la résolution de variables de Next.js et sans consigner quels fichiers/variables avaient effectivement été reconnus ;
- le smoke API avait un deuxième parseur local. Son motif de détection des lignes utilisait une expression régulière doublement échappée (`\\\\s` dans le littéral), ce qui ne reconnaissait pas les espaces comme attendu. Le smoke n'avait donc pas une source de configuration unique et fiable.

Le rapport ne permet pas d'affirmer quelle ligne précise du fichier opérateur a produit la valeur vide. Le correctif élimine cette ambiguïté au lieu de demander une nouvelle série de vérifications manuelles.

### 105.3 Correctif runner — chargeur officiel de Next.js

Fichier : `e2e/run-authenticated-role-recipe.mjs`  
Commit : `fddbecc05c6d1e3b025a3ff7bef21cd6c181d3af`

Le runner utilise désormais `loadEnvConfig` de `@next/env`, résolu depuis les dépendances de Next.js déjà installées dans le worktree :
- mode de chargement aligné sur le build `production` ;
- variables Supabase gérées isolées des valeurs héritées du terminal, puis chargées depuis le dépôt source transmis au runner ;
- ordre de priorité des fichiers d'environnement conservé selon Next.js ;
- valeurs vides ignorées afin qu'une entrée vide prioritaire ne masque pas une valeur E2E valide située dans `.env.local` ;
- fichier optionnel `.env.e2e.local` conservé comme surcharge, avec le parseur `dotenv` utilisé par Next ;
- aucun secret, token ou URL complète n'est imprimé.

Le résumé `artifacts/e2e/authenticated-role-runner-summary.json` expose maintenant `configDiagnostics`, limitée aux noms de fichiers chargés, à la présence/conformité de l'URL, au project ref détecté, à la présence de la clé publishable et au type de clé serveur (`sb_secret`, `legacy_jwt` ou `missing`). Cela permettra de distinguer un problème de chemin, un fichier absent et une configuration qui ne cible pas JOBLY-E2E, sans afficher de secret.

### 105.4 Correctif smoke — une seule source d'environnement

Fichier : `e2e/authenticated-role-smoke.mjs`  
Commit : `73aee328bc2f11ff15628cac13a7d3bd932f8e1e`

Le smoke ne reparcourt plus les fichiers `.env`. Il consomme uniquement `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` injectée par le runner, et refuse la clé si l'URL présente dans l'environnement d'exécution ne correspond pas exactement à JOBLY-E2E. Le garde-fou de project ref et la vérification du format JWT legacy restent actifs. La clé `sb_secret_` demeure serveur uniquement.

Référence technique : [documentation officielle Next.js 15 — variables d'environnement et `@next/env`](https://nextjs.org/docs/15/app/guides/environment-variables).

### 105.5 Périmètre et statut de sécurité

- Aucune modification de `.env.local`, `.e2e-fixtures.json` ou des mots de passe ; aucun reset, recréation ou provisionnement de compte.
- Aucun accès JOBLY-PROD ; aucun changement à `main`, aucun merge et aucun déploiement.
- Aucune donnée distante n'est touchée tant que le runner n'a pas atteint le démarrage du smoke API ; le résumé conserve `remoteDataMayBeModified=false` avant cette frontière.
- Le build et le smoke ne sont pas encore déclarés PASS : les commits sont poussés mais n'ont pas encore été exécutés dans le worktree opérateur.

### 105.6 Prochaine action utile — une seule exécution intégrée

Depuis le worktree v3 existant, contrôler qu'il est propre avant toute actualisation. S'il contient des changements, arrêter et ne rien écraser. S'il est propre, récupérer la branche, se placer sur son HEAD, vérifier la syntaxe et lancer directement le runner complet :

```cmd
powershell -NoProfile -Command "$s = git -C C:\Users\ASUS\Jobly-e2e-recette-v3 status --porcelain; if ($LASTEXITCODE -ne 0) { exit 2 }; if ($s) { $s; exit 3 }; Write-Output 'WORKTREE_CLEAN'"
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 fetch origin
if errorlevel 1 exit /b 1
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 checkout --detach origin/e2e/recette
if errorlevel 1 exit /b 1
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 exit /b 1
node --check e2e\authenticated-role-smoke.mjs
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\authenticated-role-smoke.json
pause
```

Le résumé est le rapport maître de cette tentative. Si `authenticatedRoleSmoke=NOT_RUN`, transmettre uniquement le résumé : l'ancien rapport détaillé peut être celui de l'exécution précédente. Si le smoke a été lancé, transmettre les deux rapports pour vérifier aussi le nettoyage des données synthétiques.

**Conclusion §105 :** le blocage du parseur est corrigé dans le code et la procédure redessinée pour éviter les préflights manuels répétitifs. Le prochain jalon n'est plus une autre vérification de fichier : c'est le build et le smoke authentifié complets en une seule exécution, avec arrêt avant toute écriture si les garde-fous ne sont pas satisfaits.

---

## 99. LOT-01 — cycle de session Auth des trois rôles : PASS 12/12

**Exécution locale rapportée : 8 novembre 2026 à 22:30:34.603 UTC. Statut : PASS — cycle de session complet des trois fixtures.**

Rapport `artifacts/e2e/auth-session-smoke.json` transmis par l'opérateur :
- `environment=JOBLY-E2E`, `projectRef=ofqqrryamslxoqkklraw` ;
- scénario : `authenticated-role-session-lifecycle` ;
- statut général : `PASS` ;
- nombre de contrôles : **12/12 PASS** ;
- `accounts` : TALENT, RECRUITER et PARTNER tous `PASS` ;
- `externalMessagesSent=false` ; aucun message externe n'a été envoyé.

Pour chaque rôle, les quatre contrôles réussissent :
1. Connexion réelle Supabase Auth (`signInWithPassword`) ;
2. Access token vérifié côté serveur (`getUser`) ;
3. Claims `app_metadata.e2e_fixture` et `app_metadata.e2e_role` vérifiés ;
4. Renouvellement de session et rotation du refresh token validés (`refreshSession`).

Les douze identifiants de contrôle `JOBLY-E2E-AUTH-{TALENT,RECRUITER,PARTNER}-{001..004}` sont tous au statut PASS. Le rapport ne contient aucun mot de passe, clé ou token de session.

**Conclusion limitée :** le smoke de connexion initial (§96) et le cycle de session complémentaire sont PASS. Cela valide l'authentification Supabase, l'identité/les claims de rôle et le refresh token des trois fixtures existantes. Cela ne valide pas encore les autorisations métier des API, les accès interdits entre rôles, les parcours Talent/Recruteur/Partenaire ni l'ensemble de LOT-01.

### État de recette après cette preuve
- Smoke de connexion initial : **PASS 3/3** (§96).
- Cycle de session et renouvellement : **PASS 12/12** (§99).
- LOT-01 Auth (sessions) : **PASS pour ce sous-périmètre**.
- LOT-01 global : **EN COURS** ; parcours fonctionnels et sécurité API encore à exécuter.
- LOT-00 : **PASS / CLOS**.
- `main` : `979f2ccfec9258bc30989af18433cf6adb1b4698`, inchangée ; PR #266/#267 restent ouvertes en brouillon et non fusionnées selon le dernier état documenté.
- Aucun accès JOBLY-PROD, aucun merge, aucun déploiement et aucun reset/provisionnement de fixture.

**Prochaine étape de la matrice :** audit/relecture du script `e2e/authenticated-role-smoke.mjs` avant son exécution, en particulier ses créations/suppressions de données synthétiques JOBLY-E2E, ses dépendances de runtime privé et ses vérifications de refus d'accès inter-rôles. Ne pas lancer de script qui effectue des mutations tant que son périmètre et son nettoyage ne sont pas vérifiés.

---

## 100. LOT-01 — audit de sûreté du scénario API authentifié par rôle

**Mise à jour : 8 novembre 2026. Statut : AUDIT STATIQUE EFFECTUÉ ; exécution non lancée.**

Script relu sur `e2e/recette` : `e2e/authenticated-role-smoke.mjs`, blob `4fc2fd7a16ca7d28a4f685e380c9b067ba08908d`. Ce scénario constitue la prochaine couverture du LOT-01 après le PASS du cycle Auth §99.

### Couverture prévue
- TALENT : lecture du profil, candidatures, flux local/Afrique, détail d'offre active, CV original et Career Journey.
- RECRUITER : lecture du profil, offres, candidatures, talents et Recruitment360 ; test d'un identifiant de recrutement non détenu (403 attendu) et d'un document associé à une candidature inexistante (404 attendu).
- PARTNER : lecture du profil, commissions et onboarding ambassadeur.
- Parcours synthétique Talent → Recruteur : création d'une offre locale publiée fictive, préparation d'une candidature `USER_REVIEW` sans envoi externe, contrôle de visibilité côté Talent/Recruteur, transition INTERVIEW puis OFFER, tentative de conflit Talent et vérification que la décision Recruteur reste prioritaire.

### Mutations contrôlées et prérequis
- Le scénario Recruteur crée un brouillon via API, le relit/modifie puis tente de le supprimer via API dans un `finally`.
- Le parcours croisé crée une offre publiée E2E, renseigne uniquement un contact `example.invalid`, prépare une candidature synthétique non envoyée, teste les transitions et nettoie l'offre/candidature. Si la suppression API échoue, le script prévoit une suppression de repli strictement filtrée sur les IDs et propriétaires du run, via l'admin JOBLY-E2E, puis vérifie l'absence des lignes.
- La route `/api/applications` confirme dans le code que la candidature préparée reste `USER_REVIEW`; le message/email n'est pas envoyé. Le test fournit `letterText`, ce qui force `skipAi` et évite l'appel au fournisseur IA.
- À la date de l'audit initial, le script lisait `.e2e-fixture-runtime.json`. Cette dépendance a été supprimée au §101 : la clé serveur JOBLY-E2E est désormais lue depuis l'environnement local, et aucun runtime privé séparé n'est requis.
- L'audit initial avait constaté que `lib/server-auth.ts::adminClient()` ne lisait que `SUPABASE_SERVICE_ROLE_KEY`. Ce défaut est corrigé au §101 : le client accepte désormais `SUPABASE_SECRET_KEY` de façon serveur-only, avec fallback legacy.

### Préflight local sans secret ajouté

Un diagnostic strictement local a été ajouté pour ne pas démarrer l'API avec une configuration incomplète :
- fichier : `e2e/authenticated-role-preflight-safe.mjs` ;
- commit : `4840f28485ee3662ef52ffbb1ba58b5722571abc` ;
- blob : `18a576b18ae946615b89c69bb2904c4f8ec5badb`.

Ce diagnostic contrôle la configuration E2E, la présence du nom de variable `SUPABASE_SERVICE_ROLE_KEY` attendu par le serveur, la présence/structure du manifeste local, l'existence éventuelle du runtime, l'égalité entre `HEAD` local et `origin/e2e/recette` ainsi que la dépendance Next.js. Il n'affiche aucune valeur de secret, aucun mot de passe, email ou UID ; il n'effectue aucun appel réseau et aucune mutation distante. Il n'invente ni ne restaure `.e2e-fixture-runtime.json`.

Commande CMD :

```cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin && git show origin/e2e/recette:e2e/authenticated-role-preflight-safe.mjs > e2e\authenticated-role-preflight-safe.current.mjs && node --check e2e\authenticated-role-preflight-safe.current.mjs && set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw" && node e2e\authenticated-role-preflight-safe.current.mjs
notepad artifacts\e2e\authenticated-role-preflight-safe.json
```

Envoyer uniquement `artifacts/e2e/authenticated-role-preflight-safe.json`. Selon ce rapport, soit préparer un worktree propre sur le commit exact `e2e/recette`, soit vérifier la configuration du serveur avant d'exécuter le scénario API. Ne pas lancer `authenticated-role-smoke.mjs` tant que `readiness.roleApiServer` n'est pas `READY_TO_PREPARE`.

### Garde-fous pour la reprise
- Exécution locale seulement avec le code exact de `e2e/recette` et un serveur Next.js construit/démarré depuis cette même source ; la copie habituelle étant en retard et très modifiée, ne pas lancer le scénario depuis une source locale non synchronisée.
- Avant tout démarrage, vérifier sans révéler de valeur : URL/ref JOBLY-E2E, disponibilité locale de `SUPABASE_SERVICE_ROLE_KEY`, présence éventuelle d'un runtime déjà existant et son projet déclaré. Ne jamais afficher la valeur d'une clé ni copier le runtime depuis un autre contexte.
- Ne pas lancer `scripts/e2e-local-recipe.mjs`, le provisionneur ni le reset de mots de passe. Ne pas déclencher le workflow complet des 11 lots pour n'exécuter que ce scénario.
- En l'état, aucun test API de rôle n'est déclaré PASS ; aucune donnée E2E n'a été créée par cet audit statique.

**Résultat au moment de l'audit :** script non exécuté. Les correctifs de configuration et le runner isolé sont consignés au §101 ; l'exécution reste en attente du worktree propre.

---

## 101. LOT-01 — correction du préflight API : clé serveur moderne et worktree isolé

**Mise à jour : 8 novembre 2026. Statut : CORRECTIFS COMMIS ; recette API non encore exécutée.**

### 101.1 Rapport de préflight local reçu

Rapport `artifacts/e2e/authenticated-role-preflight-safe.json` daté du 8 novembre 2026 à 22:34:39.380 :
- URL Supabase et projet : conformes à JOBLY-E2E (`ofqqrryamslxoqkklraw`) ;
- `.env.local` présent ; la clé `SUPABASE_SECRET_KEY` existe, mais `SUPABASE_SERVICE_ROLE_KEY` est absente ;
- manifeste `.e2e-fixtures.json` présent et structure des trois rôles valide ;
- `.e2e-fixture-runtime.json` absent ;
- branche locale `e2e/recette`, HEAD local `e92feb8abc1a2491cab7dd81e834080b80982681`, distant à cette date `5391f2ca6e68b0f1130e6293c4ef2aebc9947fc6` ;
- `node_modules/next` présent ;
- aucune requête réseau, mutation distante, modification de compte ou de profil ; aucun secret imprimé.

### 101.2 Correction du client serveur Supabase

Documentation Supabase consultée : les clés `sb_secret_…` sont la nouvelle clé serveur élevée destinée à remplacer `service_role`, et doivent rester exclusivement dans les composants backend. `lib/server-auth.ts::adminClient()` accepte désormais `SUPABASE_SECRET_KEY` en priorité, avec compatibilité descendante `SUPABASE_SERVICE_ROLE_KEY`. La clé n'est jamais préfixée `NEXT_PUBLIC_` ni exposée au client.

Fichier : `lib/server-auth.ts`  
Commit : `b773b8924749a11b5ce97e91b89247e7ae8d680b`  
Blob : `a2b4e84d7cec2fc47e3bb14943e1c1a78c58cc8f`

### 101.3 Correction du test API authentifié

`e2e/authenticated-role-smoke.mjs` :
- accepte un chemin explicite `E2E_FIXTURE_PATH`, pour lire le manifeste local d'origine sans en copier le contenu dans le worktree ;
- lit `SUPABASE_SECRET_KEY` ou l'ancienne `SUPABASE_SERVICE_ROLE_KEY` depuis l'environnement, avec secours de lecture `.env.e2e.local` / `.env.local` / `.env` uniquement lorsque leur URL correspond exactement au projet E2E ;
- vérifie le format `sb_secret_` ou, pour l'ancien JWT, le `ref` et le rôle `service_role` ;
- ne dépend plus du fichier `.e2e-fixture-runtime.json` ; aucun provisionnement ou reset requis.

Commits successifs : `d18f8417b592b666fd8b2d4349589f3cd107a432`, puis correctif du parseur `34b08496e744aaaf93795ef7911d851ffb665e3f`. Blob actuel : `7d85bb578d564b0385c4c8f7ac1fea637306d67d`.

Le préflight `e2e/authenticated-role-preflight-safe.mjs` a également été mis à jour : une secret key `sb_secret_` est désormais reconnue comme clé serveur valide et l'absence de `.e2e-fixture-runtime.json` ne bloque plus le parcours croisé. Blob : `8cb6304551451228d37ab52cb5179aba31fd1f5c`.

### 101.4 Runner local isolé

Nouveau lanceur : `e2e/run-authenticated-role-recipe.mjs`. Commits : `2cadd79c92241a1c7d305633177e6c4645b34ef1`, `a1218f3b67dc68d1e5dc674974d653f3b672043f` (traçabilité des mutations/nettoyages), `14cae46928f7e972269e7d3c6654caab441a48dd` (fallback public E2E), `69fc1f4f2f48df347d456efee2e1372d0f3456b1` (exécution du binaire Node sans shell Windows), `d6231753439fec4c4fbcb9ea934cef55207d58da` (démarrage direct de Next et diagnostic du serveur). Blob actuel : `dc9e36cdd66793bc419002887bd1ab06094ee676`.

Fonctionnement :
- exige un worktree détaché propre dont `HEAD` est exactement égal à `origin/e2e/recette` ; refuse le clone local modifié ou un serveur déjà présent sur le port 3217 ;
- lit les variables de `.env.local` et les fixtures depuis le chemin source fourni, sans copier ces fichiers vers le worktree et sans imprimer les valeurs ;
- vérifie strictement l'URL E2E, la publishable key et le format de la clé serveur ;
- exécute `pnpm build`, puis démarre directement `node_modules/next/dist/bin/next` via `process.execPath` sur `127.0.0.1:3217` (sans passer par `pnpm start`, `shell` ou séparateur d'arguments), attend le HTTP 401 attendu de `/api/profile` sans session, puis lance le smoke API ;
- arrête le serveur dans le bloc `finally` ; produit un résumé sans secrets, et expose les statuts de nettoyage du smoke.

Le parcours API peut insérer temporairement des offres/candidatures synthétiques dans JOBLY-E2E ; les routes et le script tentent leur suppression et vérifient ensuite l'absence des enregistrements. `externalActions=false` : aucun email/SMS ni envoi de candidature réel n'est prévu ; la candidature reste en `USER_REVIEW`. Le rapport de recette devra confirmer les contrôles de nettoyage. Une interruption brutale peut toutefois nécessiter une vérification du résiduel JOBLY-E2E avant toute relance.

### 101.5 Exécution opérateur

Ne pas utiliser `pull`, `switch`, `reset`, `stash` ou `clean` dans le dépôt local existant. Depuis CMD :

```cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin
if errorlevel 1 exit /b 1
if exist "C:\Users\ASUS\Jobly-e2e-recette\" (
  echo Le dossier C:\Users\ASUS\Jobly-e2e-recette existe deja ; choisir un autre dossier sans le supprimer.
  exit /b 1
)
git worktree add --detach C:\Users\ASUS\Jobly-e2e-recette origin/e2e/recette
if errorlevel 1 exit /b 1
cd /d C:\Users\ASUS\Jobly-e2e-recette
if errorlevel 1 exit /b 1
pnpm install --frozen-lockfile --ignore-scripts
if errorlevel 1 exit /b 1
node --check e2e\authenticated-role-smoke.mjs
if errorlevel 1 exit /b 1
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\authenticated-role-smoke.json
```

Résultats attendus : résumé `artifacts/e2e/authenticated-role-runner-summary.json` et rapport détaillé `artifacts/e2e/authenticated-role-smoke.json`. Transmettre uniquement ces deux rapports. Ne jamais copier le contenu de `.env.local`, `.e2e-fixtures.json`, une clé ou un token dans le chat. Le worktree distinct reste en place jusqu'à revue des résultats ; ne pas le supprimer automatiquement.

**État après correctifs :** la première tentative API s'est arrêtée avant le smoke (serveur local non confirmé) ; aucun test API n'a encore été exécuté. Smoke Auth 3/3 (§96) et cycle de session 12/12 (§99) restent PASS. LOT-01 global reste EN COURS. main reste 979f2ccfec9258bc30989af18433cf6adb1b4698, inchangée ; PR #266/#267 non fusionnées ; aucun accès JOBLY-PROD ni déploiement.

---

## 102. LOT-01 — diagnostic et correction du démarrage du serveur local

**Mise à jour : 8 novembre 2026. Statut : CORRECTIF RUNNER COMMIS ; nouvelle exécution opérateur requise.**

### 102.1 Rapport reçu — 22:42:02.526 UTC

Rapport artifacts/e2e/authenticated-role-runner-summary.json :
- environment=JOBLY-E2E, projectRef=ofqqrryamslxoqkklraw ;
- build=PASS ;
- localServer=NOT_RUN, authenticatedRoleSmoke=NOT_RUN ;
- status=BLOCKED ; motif : le serveur local n'a pas répondu HTTP 401 à /api/profile dans le délai ;
- secretsPrinted=false et remoteDataMayBeModified=false.

**Interprétation vérifiable :** le build a terminé, mais le runner n'a pas validé le serveur HTTP. Ce résumé ne permet pas de dire si Next a quitté, si le port n'a pas écouté ou si une réponse HTTP autre que 401 a été reçue. Il ne justifie pas de conclure à un défaut de la route métier. Le smoke authentifié n'a pas été lancé ; aucune donnée distante n'a été modifiée par cette tentative.

### 102.2 Correction du runner

Fichier : e2e/run-authenticated-role-recipe.mjs  
Commit : d6231753439fec4c4fbcb9ea934cef55207d58da  
Blob : dc9e36cdd66793bc419002887bd1ab06094ee676

- Le serveur est désormais démarré directement avec process.execPath et le binaire node_modules/next/dist/bin/next, options explicites start --hostname 127.0.0.1 --port 3217. Le lancement ne passe plus par pnpm start -- ... ni par un shell Windows.
- Le probe HTTP journalise uniquement le statut reçu, le nombre de tentatives, la classe d'erreur réseau éventuelle et l'état/code de sortie du processus ; aucun corps de réponse n'est stocké.
- Une réponse HTTP inattendue (autre que 401) bloque immédiatement avant le smoke. Un processus arrêté ou un échec de spawn est diagnostiqué explicitement.
- remoteDataMayBeModified reste false jusqu'au lancement effectif du smoke API. Aucune clé ou fixture n'est affichée ou copiée.

### 102.3 Nouvelle exécution isolée

La première copie de travail C:\Users\ASUS\Jobly-e2e-recette et le dépôt local ne sont pas modifiés ni supprimés. Créer un second worktree distinct afin d'utiliser exactement le nouveau commit distant :

~~~cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin
if errorlevel 1 exit /b 1
if exist "C:\Users\ASUS\Jobly-e2e-recette-v2\" (
  echo Le dossier C:\Users\ASUS\Jobly-e2e-recette-v2 existe deja ; choisir un autre nom sans le supprimer.
  exit /b 1
)
git worktree add --detach C:\Users\ASUS\Jobly-e2e-recette-v2 origin/e2e/recette
if errorlevel 1 exit /b 1
cd /d C:\Users\ASUS\Jobly-e2e-recette-v2
if errorlevel 1 exit /b 1
pnpm install --frozen-lockfile --ignore-scripts
if errorlevel 1 exit /b 1
node --check e2e\authenticated-role-smoke.mjs
if errorlevel 1 exit /b 1
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\authenticated-role-smoke.json
~~~

Si le worktree -v2 existe déjà, ne pas le supprimer ni l'écraser : choisir un nouveau suffixe. Ne pas exécuter de pull, reset, stash ou clean dans le dépôt de travail existant. Après exécution, transmettre les deux rapports expurgés. Si le résumé reste BLOCKED, ses nouveaux champs localServerProbe permettront d'isoler le problème sans relancer de mutations métier.

**État actuel :** correctif poussé sur e2e/recette ; build PASS de l'ancienne tentative conservé comme preuve, mais aucun PASS du serveur ni des API n'est acquis. LOT-01 reste EN COURS. main, JOBLY-PROD et les déploiements restent hors périmètre.

## 103. LOT-01 — analyse du premier smoke API authentifié et correction des limites de débit

**Mise à jour : 8 novembre 2026. Statut : 36/40 PASS constatés ; correctifs anti-abus commis ; revalidation requise.**

### 103.1 Rapport opérateur — 23:03:19.622 UTC

Rapport artifacts/e2e/authenticated-role-smoke.json :
- environnement : JOBLY-E2E, ref ofqqrryamslxoqkklraw, serveur local http://127.0.0.1:3217 ;
- statut : FAIL, résumé 36/40 contrôles PASS ; 3 FAIL ; 1 BLOCKED ;
- les trois rôles TALENT, RECRUITER et PARTNER sont EXECUTED ; tous les contrôles de connexion Auth 200 et de session reportés passent ;
- les parcours profil, candidatures, détails Recruteur/Recruitment360, partenaire, CV absent, Career Journey et transitions de candidature réussissent ;
- le brouillon Recruteur est créé, relu, modifié et supprimé ; le parcours croisé crée une offre et une candidature synthétiques, vérifie le statut USER_REVIEW, la décision OFFER, la protection de cette décision, puis confirme le nettoyage par API et par vérification DB ;
- externalActions=false : aucun email, SMS ou envoi externe n'a été déclenché.

Contrôles en échec :
1. TALENT-JOBS-FEED-READ : HTTP 503 ;
2. TALENT-AFRICA-FEED-READ : HTTP 503 ;
3. RECRUITER-TALENTS-LIST : HTTP 503.

Contrôle dépendant bloqué :
- TALENT-JOB-DETAIL-READ : aucune offre active n'a pu être obtenue à partir des deux feeds en erreur. Il s'agit d'une conséquence des erreurs de flux et non d'un quatrième défaut indépendant démontré.

### 103.2 Cause code établie

**Flux local et Afrique — app/api/jobs/route.ts / lib/server-security.ts**
- La route appelle enforceApiRateLimit() avec requireIp: true et s'exécute en NODE_ENV=production.
- Le smoke HTTP local n'envoyait ni x-real-ip ni x-forwarded-for. Le résolveur refuse donc de poursuivre le contrôle IP en mode production et renvoie HTTP 503.
- Le garde-fou utilisait JOBLY_RATE_LIMIT_SECRET ou SUPABASE_SERVICE_ROLE_KEY, mais ne connaissait pas SUPABASE_SECRET_KEY. L'environnement de recette utilise la clé moderne ; le helper devait donc accepter ce même secret serveur, en conservant le secret dédié JOBLY prioritaire et le fallback legacy.

**Liste Top Talent Recruteur — app/api/recruiter/talents/route.ts / lib/apiRateLimit.ts**
- Le limiteur vérifiait exclusivement SUPABASE_SERVICE_ROLE_KEY avant son appel RPC et renvoyait exactement le message générique observé lorsque cette variable était absente.
- Le préflight de l'environnement confirme que la variable présente est SUPABASE_SECRET_KEY. Le helper doit reconnaître cette clé serveur moderne, avec fallback legacy.

### 103.3 Correctifs commis sur e2e/recette

1. lib/server-security.ts : clé de HMAC = JOBLY_RATE_LIMIT_SECRET en priorité, puis SUPABASE_SECRET_KEY, puis SUPABASE_SERVICE_ROLE_KEY.
   - Commit : 329fc5d549f67576df8b0283e6f84611913dd7a6
   - Blob : 7ebe75f662c1cd08b9718a0d77d405c1339fe265

2. lib/apiRateLimit.ts : reconnaît SUPABASE_SECRET_KEY avant le fallback legacy SUPABASE_SERVICE_ROLE_KEY.
   - Commit : 5304ee898a5c43bc3351f3e1ed73f9125cfa98f5
   - Blob : 25cabf9dfaf8284da928eed0529455986e0437dd

3. e2e/authenticated-role-smoke.mjs : chaque requête locale de recette transmet x-real-ip: 127.0.0.1, l'adresse réelle de boucle locale du client Node vers le serveur local. Cela permet d'exercer le garde-fou IP en mode production sans désactiver la politique requireIp.
   - Commit : 476932ad05a2cbfa7658e1f96081f3bdec5917ab
   - Blob : e88be1a96660a1866522f2f7a4f3924c4626eb57

### 103.4 Tests de non-régression ajoutés

- scripts/jobly-security-core.test.mjs : vérifie le fallback vers SUPABASE_SECRET_KEY quand JOBLY_RATE_LIMIT_SECRET et SUPABASE_SERVICE_ROLE_KEY sont absentes.
  - Commit : 38b9167fee6e149c6a338485218458d9a810c997
  - Blob : 46e0c5dea537c9dc30bf315d0a8bd8207c733cf5
- scripts/api-rate-limit-secret-key.test.mjs : vérifie le limiteur Recruteur avec la clé moderne seule, l'appel RPC et le hachage des identifiants.
  - Commit : 32d2d56989d2d3cc579bf29b80e608ccd418eb9d
  - Blob : 43343a1d72fb2147682b23b6c2e1bfc807836774
- package.json : test:security-core exécute maintenant les deux fichiers de test.
  - Commit : 475c4acc80f161cb5944877deff7e6401e9dcfe6
  - Blob : 12d475887f97796f15aa2af1c0e64410e6e6d301

**Important :** les tests unitaires viennent d'être ajoutés et référencés dans le script ; leur exécution n'est pas encore prouvée. Aucun statut PASS n'est attribué par anticipation.

### 103.5 Nouvelle exécution propre — worktree v3

La précédente copie Jobly-e2e-recette-v2 et le dépôt local existant doivent rester intacts. Depuis CMD, créer un troisième worktree distinct :

~~~cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin
if errorlevel 1 exit /b 1
if exist "C:\Users\ASUS\Jobly-e2e-recette-v3\" (
  echo Le dossier C:\Users\ASUS\Jobly-e2e-recette-v3 existe deja ; choisir un autre nom sans le supprimer.
  exit /b 1
)
git worktree add --detach C:\Users\ASUS\Jobly-e2e-recette-v3 origin/e2e/recette
if errorlevel 1 exit /b 1
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
if errorlevel 1 exit /b 1
pnpm install --frozen-lockfile --ignore-scripts
if errorlevel 1 exit /b 1
node --check e2e\authenticated-role-smoke.mjs
if errorlevel 1 exit /b 1
node --check scripts\jobly-security-core.test.mjs
if errorlevel 1 exit /b 1
node --check scripts\api-rate-limit-secret-key.test.mjs
if errorlevel 1 exit /b 1
pnpm test:security-core
if errorlevel 1 exit /b 1
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\authenticated-role-smoke.json
~~~

Ne pas supprimer ou écraser un dossier existant. S'il existe déjà, choisir un autre suffixe. Ne pas utiliser pull, switch, reset, stash ou clean dans le dépôt de travail initial. Le runner relit les fixtures et la clé exclusivement depuis C:\Users\ASUS\Jobly, valide le ref JOBLY-E2E, et garde le serveur sur loopback.

Transmettre les deux rapports Notepad. Critères pour le prochain passage : tests ciblés exécutés avec code retour 0 ; les trois contrôles auparavant en 503 reviennent à 200 ; le détail offre est évalué indépendamment si un feed contient une offre active ; les checks CLEANUP restent PASS ; externalActions=false.

**État à ce stade :** les trois défauts de configuration/harnais identifiés sont corrigés dans le code, mais aucune nouvelle exécution n'a encore validé les correctifs. LOT-01 reste EN COURS ; aucun merge sur main, aucun accès JOBLY-PROD et aucun déploiement.

---

## 104. LOT-01 — correction de la résolution Node 26 du test du limiteur Recruteur

**Mise à jour : 8 novembre 2026. Statut : correctif du module commis ; nouvelle exécution du test ciblé requise.**

### 104.1 Rapport opérateur — pnpm test:security-core

Dans le worktree isolé C:\Users\ASUS\Jobly-e2e-recette-v3, le test combiné a renvoyé :
- 10 contrôles PASS sur le fichier scripts/jobly-security-core.test.mjs ;
- le fichier scripts/api-rate-limit-secret-key.test.mjs a échoué au chargement, avant l'exécution de son scénario ;
- erreur exacte : ERR_MODULE_NOT_FOUND, résolution de next/server depuis lib/apiRateLimit.ts, Node.js a suggéré next/server.js ;
- Node v26.13.0 ; avertissement MODULE_TYPELESS_PACKAGE_JSON non fatal ;
- aucun scénario du serveur API n'a été lancé par cette commande ; aucune mutation Supabase liée à ce test unitaire.

Ne pas ajouter "type": "module" dans le package.json racine : ce changement global de mode de module est inutile pour corriger cet import et risquerait de modifier le comportement de chargement de la configuration/build Next.

### 104.2 Correction du point d'entrée

Dans Next.js 15.5.25, le fichier packages/next/server.js exporte NextResponse et NextRequest via son point d'entrée serveur CommonJS, avec exports nommés compatibles avec l'import ESM Node. Le test direct Node peut donc cibler le fichier .js explicite.

Fichier : lib/apiRateLimit.ts
Commit : f7ff6b6402a8db475d23fc33bd1782786646f614
Blob : 44e4b70458fee878a775da27f5907ab8614254d0
Changement : from "next/server" devient from "next/server.js" ; aucune modification fonctionnelle du limiteur.

### 104.4 Résultat opérateur confirmé — tests ciblés PASS

Rapport transmis après correction : pnpm test:security-core exécuté dans C:\Users\ASUS\Jobly-e2e-recette-v3 le 8 novembre 2026 :
- tests=11, pass=11, fail=0, cancelled=0, skipped=0.
- scripts/api-rate-limit-secret-key.test.mjs : PASS ; clé moderne seule acceptée par le limiteur Recruteur.
- scripts/jobly-security-core.test.mjs : 10/10 PASS, dont le fallback secret moderne du flux, hachage HMAC, 429, échec fermé 503 et garde-fous connexes.
- Les avertissements MODULE_TYPELESS_PACKAGE_JSON pour les imports TypeScript restent des avertissements de performance ; ils n'ont provoqué aucun échec. Aucun changement "type": "module" n'est requis.
- Le fichier de test ne réalise que des appels RPC mockés et ne modifie pas Supabase.

**Conclusion :** les tests unitaires du correctif anti-abus sont validés. Cela ne remplace pas la recette HTTP : les trois API qui renvoyaient 503 restent à revalider avec le serveur local.

### 104.5 Étape suivante — smoke API uniquement

Sur le worktree v3 propre, après contrôle de l'état Git et mise à jour détachée vers origin/e2e/recette, exécuter le runner node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly. Capturer la console dans artifacts\e2e\authenticated-role-run-console.txt, puis ouvrir le log, le résumé runner et le rapport détaillé avec Notepad. Les tests unitaires ne doivent pas être rejoués inutilement ; leur preuve 11/11 est conservée ci-dessus. Le runner refait son propre build et son smoke API, avec la clé et les fixtures lues depuis le dépôt source sans les copier ni les imprimer.

Critères : feeds local/Afrique HTTP 200 ; liste talents Recruteur HTTP 200 ; détail offre évalué si un feed comporte une offre active ; contrôles CLEANUP PASS ; externalActions=false. Si le runner échoue, conserver tous les rapports et s'arrêter avant toute nouvelle relance jusqu'à analyse.

### 104.3 Reconnexion CMD et reprise dans le worktree v3 existant

Ouvrir une nouvelle fenêtre CMD avec Windows + R, saisir cmd, puis Entrée. Ne pas recréer le worktree v3, ne pas supprimer le dossier et ne pas réinstaller les dépendances tant que le contrôle ne le demande pas.

Exécuter :

~~~cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin
if errorlevel 1 goto :stop
powershell -NoProfile -Command "$s = git -C 'C:\Users\ASUS\Jobly-e2e-recette-v3' status --porcelain; if ($s) { Write-Output $s; exit 2 }"
if errorlevel 1 goto :worktree_dirty
git -C C:\Users\ASUS\Jobly-e2e-recette-v3 checkout --detach origin/e2e/recette
if errorlevel 1 goto :stop
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
if errorlevel 1 goto :stop
pnpm test:security-core > artifacts\e2e\security-core-rate-limit-tests.txt 2>&1
set "UNIT_EXIT=%ERRORLEVEL%"
notepad artifacts\e2e\security-core-rate-limit-tests.txt
if not "%UNIT_EXIT%"=="0" goto :unit_failed
node --check e2e\authenticated-role-smoke.mjs
if errorlevel 1 goto :stop
node --check e2e\run-authenticated-role-recipe.mjs
if errorlevel 1 goto :stop
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly
set "RUN_EXIT=%ERRORLEVEL%"
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\authenticated-role-smoke.json
echo.
echo Recette terminee. UNIT_EXIT=%UNIT_EXIT% RUN_EXIT=%RUN_EXIT%
pause
goto :eof

:unit_failed
echo Les tests unitaires echouent encore. Aucun smoke API n'a ete lance.
echo UNIT_EXIT=%UNIT_EXIT%
pause
goto :eof

:worktree_dirty
echo Le worktree v3 contient des modifications ; rien n'a ete ecrase.
echo Envoyer le resultat de git status pour choisir une reprise sans perte.
pause
goto :eof

:stop
echo Une commande de preflight a echoue. Arret sans reset ni suppression.
pause
goto :eof
~~~

Le garde status --porcelain empêche le checkout si le worktree v3 contient des modifications. En cas d'état non propre, aucune tentative de nettoyage automatique ne doit être faite. Le log des tests unitaires reste accessible dans artifacts\e2e\security-core-rate-limit-tests.txt ; les deux rapports du runner sont ouverts séparément avec Notepad. La fenêtre reste ouverte grâce à pause.

**Statut courant :** 36/40 reste le résultat de la précédente exécution API ; le correctif de résolution Node vient d'être commis et n'est pas encore validé par exécution. N'annoncer aucun PASS nouveau avant réception du log unitaire et des rapports API.

---

## 98. Point de reprise — LOT-01 Auth après demande de poursuite

**État actualisé au §99 : smoke Auth initial PASS 3/3 ; cycle de session complémentaire PASS 12/12.**

À la demande de poursuivre la recette, la matrice E2E a été relue sur `e2e/recette`. Le prochain scénario exécutable reste `e2e/auth-session-smoke.mjs` (§97), déjà présent dans la branche et relu par blob Git `86568783a7a0f9023553dfdbf53af736cea4cc12`.

La commande CMD a été vérifiée et communiquée pour récupérer le script individuellement, exécuter `node --check`, définir exclusivement les paramètres publics du projet JOBLY-E2E, lancer le test et ouvrir `artifacts/e2e/auth-session-smoke.json` avec Notepad. Cette mise à jour ne constitue pas une preuve d'exécution : aucun nouveau rapport, code retour ni log opérateur n'a été reçu.

### État à reprendre
- Smoke de connexion initial (`fixture-password-verification.json`) : **PASS 3/3** (§96).
- Cycle de session Auth (`auth-session-smoke.json`) : **PASS 12/12** (§99).
- LOT-01 global : **EN COURS**, non clôturé.
- LOT-00 : **PASS / CLOS**.
- `main` : `979f2ccfec9258bc30989af18433cf6adb1b4698`, inchangée ; PR #266/#267 toujours en brouillon et non fusionnées selon le dernier état documenté.
- Aucun accès JOBLY-PROD, aucun merge, aucun déploiement, aucun reset/provisionnement de fixture.

**Preuve obtenue :** le rapport `artifacts/e2e/auth-session-smoke.json` reçu le 8 novembre 2026 à 22:30:34 UTC valide 12/12 contrôles (§99). Ne pas transmettre `.e2e-fixtures.json`, les mots de passe, les clés ou les tokens.

---
## 97. LOT-01 — cycle de session Auth par rôle : prochaine exécution

**État au moment de la préparation : NOT RUN. Exécution ultérieure réussie et enregistrée au §99 : PASS 12/12.**

Après le smoke initial de connexion 3/3 (§96), le prochain test autonome est `e2e/auth-session-smoke.mjs`.

Référence du script :
- Blob : `86568783a7a0f9023553dfdbf53af736cea4cc12`.
- URL : https://github.com/kenzimayaka-glitch/Jobly/blob/e2e/recette/e2e/auth-session-smoke.mjs

Pour chacun des rôles TALENT, RECRUITER et PARTNER, le script exécute quatre contrôles :
1. Connexion réelle via `signInWithPassword` ;
2. Vérification serveur du jeton via `getUser` ;
3. Vérification des claims `app_metadata.e2e_fixture` et `app_metadata.e2e_role` signés par Supabase ;
4. Renouvellement de session via `refreshSession`, avec validation de l'identité et du nouvel access token.

Critère : 12/12 contrôles PASS, trois comptes de rôle PASS, `environment=JOBLY-E2E`, `projectRef=ofqqrryamslxoqkklraw` et `externalMessagesSent=false`. Le script ferme la session locale de chaque client. Il utilise la clé publique publishable seulement ; aucune clé service/secret. Il ne crée, ne supprime ni ne modifie aucun compte, mot de passe ou profil. Aucun email/SMS externe n'est envoyé.

### Commande CMD — récupération épinglée, syntaxe, test et rapport

```cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin && git show origin/e2e/recette:e2e/auth-session-smoke.mjs > e2e\auth-session-smoke.current.mjs && node --check e2e\auth-session-smoke.current.mjs && set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw" && set "NEXT_PUBLIC_SUPABASE_URL=https://ofqqrryamslxoqkklraw.supabase.co" && set "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y" && node e2e\auth-session-smoke.current.mjs
notepad artifacts\e2e\auth-session-smoke.json
```

La clé configurée dans la commande est une clé publique `sb_publishable_`, non un secret. Ne jamais remplacer cette valeur par `SUPABASE_SECRET_KEY` ou `service_role`. Si la récupération ou `node --check` échoue, arrêter et ne pas lancer le test. Transmettre uniquement `artifacts/e2e/auth-session-smoke.json`.

**Résultat final :** le smoke initial Auth (§96) est PASS 3/3 et le cycle de session est désormais PASS 12/12 (§99). Aucun merge, aucun push sur `main`, aucun accès JOBLY-PROD et aucun déploiement.

---
## 96. LOT-01 — smoke Auth des trois fixtures existantes : PASS 3/3

**Exécution locale rapportée : 8 novembre 2026 à 22:27:12.088 UTC. Statut : PASS — vérification de connexion/session/identité des trois fixtures.**

Rapport `artifacts/e2e/fixture-password-verification.json` communiqué par l'opérateur :
- environnement : `JOBLY-E2E` ; projet : `ofqqrryamslxoqkklraw` ; `stage=completed` ; `status=PASS` ;
- TALENT : `PASS` — connexion réelle, session vérifiée côté serveur, UID et rôle fixture confirmés ;
- RECRUITER : `PASS` — mêmes contrôles confirmés ;
- PARTNER : `PASS` — mêmes contrôles confirmés ;
- résultat : **3/3 PASS**.

Garde-fous explicitement confirmés dans le rapport : `credentialsPrinted=false`, `serviceRoleUsed=false`, `passwordsChanged=false`, `accountsCreatedOrDeleted=false`, `profilesModified=false`. Aucun mot de passe ni credential n'a été transmis dans le rapport.

Cette preuve valide le smoke de connexion et l'identité Auth des trois comptes fixtures existants. Elle ne suffit pas à elle seule à déclarer l'ensemble de LOT-01 terminé : les parcours fonctionnels par rôle, les autorisations sur les API et les scénarios de session/navigation restent à exécuter selon la matrice de recette. Aucun reset, provisionnement ou changement de profil n'est requis pour ce résultat.

**État après cette exécution :** LOT-00 reste PASS clôturé ; smoke Auth LOT-01 = **PASS 3/3** ; LOT-01 global reste en cours. `main` reste à `979f2ccfec9258bc30989af18433cf6adb1b4698`, inchangée ; PR #266 et #267 restent ouvertes en brouillon, non fusionnées. Aucun accès JOBLY-PROD, merge ni déploiement.

---
## 95. LOT-01 — correction du vérificateur Auth après diagnostic local du manifeste

**Mise à jour : 8 novembre 2026. Statut : CORRECTIF DU VÉRIFICATEUR COMMIS ; test Auth réel à exécuter.**

### 95.1 Diagnostic local reçu — structure du manifeste validée

Le rapport local `fixture-config-safe-diagnostic.json` fourni par l'opérateur indique, sans exposer les secrets :
- fichier lisible et JSON valide ;
- `environment` et `projectRef` correspondent à `JOBLY-E2E` (`ofqqrryamslxoqkklraw`) ;
- `accounts` est un tableau de trois entrées ;
- TALENT, RECRUITER et PARTNER : `entryFound=true`, `passwordUsable=true`, `authUserIdPresent=true` ;
- seuls les noms de champs sont affichés ; aucune valeur de mot de passe, d'UID ou d'adresse n'a été transmise.

Le premier rapport Auth `NON_TESTABLE` ne signale donc pas une fixture manquante ou un refus de mot de passe. Dans l'ancien code, après la validation du manifeste, le vérificateur lisait localement `e2e/provision-fixtures.mjs` et tentait d'en extraire `PROJECT_URL` et `PUBLISHABLE_KEY` par expression régulière. Une erreur à cette étape était masquée par un message générique de configuration, tandis que les trois contrôles conservaient leur statut initial. La copie locale du dépôt étant en retard, cette dépendance à un autre fichier local rendait le contrôle fragile.

### 95.2 Correctif appliqué sur `e2e/recette`

Fichier : `e2e/verify-existing-fixtures.mjs`  
Commit : `5e7ea03f867d98257e1f79252de12fbcf7176bdf`  
Blob : `11d144a64b1afcab8b23c1fae4ffa7db240ada60`  
URL : https://github.com/kenzimayaka-glitch/Jobly/blob/e2e/recette/e2e/verify-existing-fixtures.mjs

- La clé **publique publishable** du projet JOBLY-E2E est maintenant épinglée dans le vérificateur. Ce n'est pas une clé service/privée.
- La lecture/inspection de la copie locale de `e2e/provision-fixtures.mjs` est supprimée : le vérificateur n'a plus besoin que ce fichier local soit synchronisé.
- Le rapport comporte désormais un champ `stage` pour localiser le stade d'exécution et un motif plus explicite en cas d'arrêt avant le test Auth.
- L'usage du service role reste désactivé. Le script ne crée, ne supprime ni ne modifie aucun compte, mot de passe ou profil ; il effectue uniquement `signInWithPassword`, vérifie l'utilisateur côté serveur puis ferme la session locale.

La relecture GitHub confirme le nouveau blob, la présence de la clé publishable JOBLY-E2E et du stade `auth_verification`. Le test réel d'authentification et le `node --check` sur le poste opérateur ne sont pas encore exécutés : aucun PASS Auth n'est revendiqué.

### 95.3 Commande unique de reprise locale

Dans CMD, récupérer le vérificateur corrigé depuis le ref distant, contrôler sa syntaxe, exécuter le test sur le manifeste local et ouvrir le rapport :

```cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin && git show origin/e2e/recette:e2e/verify-existing-fixtures.mjs > e2e\verify-existing-fixtures.current.mjs && node --check e2e\verify-existing-fixtures.current.mjs && node e2e\verify-existing-fixtures.current.mjs "C:\Users\ASUS\Jobly\.e2e-fixtures.json" && notepad artifacts\e2e\fixture-password-verification.json
```

Transmettre uniquement `artifacts/e2e/fixture-password-verification.json`. Ne jamais partager `.e2e-fixtures.json`, une clé ou les valeurs des credentials. Ne pas lancer le provisionneur ni le script de réinitialisation.

**État après correction :** le format des trois fixtures est établi ; LOT-01 Auth reste en attente du rapport émis par le vérificateur corrigé. LOT-00 reste clôturé PASS. `main` reste à `979f2ccfec9258bc30989af18433cf6adb1b4698`, inchangée ; PR #266 et #267 restent ouvertes en brouillon, non fusionnées. Aucun accès JOBLY-PROD, merge ni déploiement.

---
## 94. LOT-01 — vérificateur de fixtures Auth non testable : diagnostic local sans secret requis

**Mise à jour : 8 novembre 2026, rapport reçu à 22:22:39 UTC. Statut : NON_TESTABLE — aucun test de connexion Auth n'a été exécuté.**

Le rapport `artifacts/e2e/fixture-password-verification.json` confirme :
- environnement `JOBLY-E2E`, projet `ofqqrryamslxoqkklraw` ;
- TALENT, RECRUITER et PARTNER restent tous `NON_TESTABLE`, avec la raison `Identifiants locaux non disponibles` ;
- raison générale : `Contrôle non exécuté : erreur de lecture ou de configuration locale` ;
- `credentialsPrinted=false`, `serviceRoleUsed=false`, `passwordsChanged=false`, `accountsCreatedOrDeleted=false`, `profilesModified=false`.

Interprétation : ce résultat n'est **ni un PASS ni un FAIL de mot de passe**. Aucun refus d'authentification Supabase n'a été observé ; les identifiants n'ont pas atteint le test de connexion. Aucune fixture ni aucun profil n'a été modifié.

Le script `e2e/verify-existing-fixtures.mjs` attend un manifeste JSON contenant `environment`, `projectRef` et un tableau `accounts` avec, pour chaque rôle, `key`, `role`, `email`, `password` et `authUserId`. Cette structure doit être contrôlée localement sans imprimer les valeurs secrètes. Prochaine étape : produire uniquement les indicateurs booléens de lisibilité/JSON/champs attendus avec un diagnostic local ; ensuite seulement relancer le vérificateur sécurisé si les indicateurs sont conformes.

Garde-fous inchangés : ne pas exécuter `e2e/reset-existing-fixture-passwords.mjs`, ne pas lancer le provisionneur, ne pas modifier les mots de passe ou les comptes, ne pas partager le contenu du manifeste ni aucune clé. `main`, JOBLY-PROD et les déploiements restent hors périmètre.

---
## 93. LOT-00 — lanceur Storage local introuvable : diagnostic de chemin requis, aucune application

**Mise à jour : 8 novembre 2026, 22:54 (Africa/Douala). Statut : BLOCKED — résolution du chemin local non établie.**

Cette entrée remplace les instructions de réparation locale précédentes lorsqu'elles supposent que le chemin du dépôt, le dossier temporaire ou le dossier cible existent nécessairement. Ne pas répéter la procédure PowerShell précédente à l'identique.

### 93.1 Référence distante vérifiée — preuve GitHub

Le fichier source est bien présent sur la branche `e2e/recette` du dépôt `kenzimayaka-glitch/Jobly` :

- Chemin : `scripts/e2e/run-lot00-storage-hardening.cmd`.
- Blob Git officiel lu directement via GitHub : `8672167fc66c639f433d5d0296847dd5f200d315`.
- URL : https://github.com/kenzimayaka-glitch/Jobly/blob/e2e/recette/scripts/e2e/run-lot00-storage-hardening.cmd
- Le contenu distant correspond au lanceur décrit au §92.3 : il récupère les scripts depuis `origin/e2e/recette`, vérifie leurs blobs, vérifie leur syntaxe Node, puis seulement ensuite peut lancer l'application explicitement limitée à JOBLY-E2E.

Blobs des trois fichiers que ce lanceur vérifie :
- `lot00-storage-bucket-hardening.mjs` : `5bf79cd06db9ae466d6ffce9a2833be12a8823fd`.
- `lot00-storage-credential-diagnostic.mjs` : `f100bf22f423a813e0f20f8a65c9025314b095b8`.
- `lot00-storage-access-smoke.mjs` : `68e14ba5b1efbf84ee3970a36bb070cc3b4dc558`.

La présence du lanceur sur GitHub est donc établie. Cela ne prouve pas que le clone local se trouve à `C:\Users\ASUS\Jobly`, que `scripts\e2e` existe dans ce clone, ni que le fichier a été écrit sur le poste Windows.

### 93.2 Résultats locaux effectivement communiqués

- L'opérateur a communiqué une empreinte locale tronquée commençant par `546290...`. Elle n'est pas exploitable pour une comparaison exacte avec le blob Git officiel.
- Après la procédure de réparation PowerShell proposée, l'opérateur a signalé : **« Impossible de trouver le fichier »**.
- Le chemin exact cité par Windows, la commande précise qui a échoué et la sortie complète n'ont pas été transmis. Il est donc impossible d'affirmer si l'échec concerne le dossier du dépôt, le dossier `scripts\e2e`, le répertoire temporaire, le fichier source Git ou le fichier destination.
- La procédure PowerShell précédente utilisait une redirection de sortie via `cmd.exe` et `%TEMP%`, sans établir séparément l'existence de tous les chemins avant l'écriture. Cette procédure n'est pas validée et ne doit pas être considérée comme une réparation réussie.

**Conclusion locale :** le lanceur n'est pas confirmé comme installé ou remplacé sur le poste. Aucun nouveau hash local complet n'est disponible. Le fichier n'est donc pas déclaré PASS.

### 93.3 Méthode de reprise corrigée — diagnostic avant toute écriture

La prochaine intervention doit être divisée en deux étapes strictes :

1. **Préflight read-only des chemins**, sans créer ni remplacer aucun fichier. Vérifier et afficher séparément :
   - existence de `C:\Users\ASUS\Jobly` ;
   - présence de `.git` et résultat de `git -C ... rev-parse --show-toplevel` ;
   - existence de `scripts\e2e` ;
   - existence et utilisabilité du répertoire désigné par `%TEMP%` ;
   - présence de l'objet Git distant `origin/e2e/recette:scripts/e2e/run-lot00-storage-hardening.cmd` et hash calculé depuis cet objet.
   
   Si le dépôt ou le dossier cible manque, ne pas rediriger la sortie vers ce chemin et ne pas supposer que le chemin Windows indiqué est le bon. Faire d'abord identifier le chemin réellement ouvert dans l'Explorateur/CMD.

2. **Écriture atomique seulement après préflight PASS** : extraire l'objet Git distant vers un fichier temporaire dans un dossier dont l'existence a été vérifiée ; calculer le hash du temporaire ; vérifier qu'il vaut exactement `8672167fc66c639f433d5d0296847dd5f200d315` ; remplacer ensuite la destination dans le dépôt confirmé ; recalculer et comparer le hash final. En cas d'échec à une étape, arrêter sans lancer le script Storage.

La preuve de réussite attendue est constituée des trois valeurs complètes et identiques : hash de l'objet distant, hash du fichier temporaire extrait et hash du fichier local final. Un message « fichier trouvé » ou une copie du contenu dans le chat ne remplace pas ces contrôles.

### 93.15 Configuration Storage JOBLY-E2E appliquée et vérifiée — PASS

**Exécution réelle : 8 novembre 2026, 22:12:15 UTC.** Le rapport opérateur contient `status=PASS`, projet `ofqqrryamslxoqkklraw`, et les trois contrôles de hash/syntaxe PASS avant application :
- script Storage corrigé : `4521e64aed66cfb6ce93d1372b1a1b62f29cd84f` ;
- diagnostic credentials : `f100bf22f423a813e0f20f8a65c9025314b095b8` ;
- helper d'accès : `68e14ba5b1efbf84ee3970a36bb070cc3b4dc558`.

Le diagnostic confirme que `.env.local` fournit une valeur non vide pour `SUPABASE_SECRET_KEY`. Aucun secret n'est reproduit dans le rapport ou cette référence.

**Cinq buckets : configuration PASS, API Storage relue après application :**

| Bucket | Visibilité | Limite | MIME effectifs |
|---|---|---:|---|
| `talent-cvs` | privé | 3 MiB | PDF |
| `recruitment-listings` | privé | 50 MiB | PDF, XLSX, HTML, JPEG |
| `mobility-documents` | privé | 10 MiB | PDF, JPEG, PNG, WebP |
| `jobly-events` | privé | 10 MiB | JPEG, PNG, WebP, GIF, PDF, MP4 |
| `profile-photos-private` | privé, créé lors de cette exécution | 5 MiB | JPEG, PNG, WebP, GIF |

Le type HTML est stocké une seule fois comme `text/html`, conformément à la normalisation MIME de Supabase. Aucun doublon `text/html; charset=utf-8` n'est attendu dans les métadonnées persistées.

**Smoke d'accès réel : 5/5 PASS.** Pour chacun des cinq buckets :
- upload temporaire : PASS ;
- relecture via URL signée : PASS (HTTP 200) ;
- lecture anonyme via URL publique : refusée (HTTP 400) ;
- suppression de l'objet de test : PASS.

Le rapport donne `storageAccessSmoke=5/5 PASS`, `rollback=[]`, `status=PASS`. Il ne signale aucune photo legacy migrée, aucune photo publique explicitement consentie retenue par cette opération, et aucun objet orphelin supprimé.

**Vérification indépendante immédiate par SQL read-only sur JOBLY-E2E**, jointe à `storage.objects` :
- les cinq buckets existent ;
- les cinq sont privés ;
- leurs plafonds et allowlists correspondent aux cibles ci-dessus ;
- `object_count=0` pour chacun après le cleanup des objets de test.

Cette relecture distante confirme que la configuration est persistée et que les uploads temporaires ont été nettoyés. Elle n'a modifié aucune donnée. Le bucket historique `profile-photos` public n'a pas été basculé par cette opération ; sa politique de consentement et ses objets restent régis par les travaux de confidentialité photo consignés au §89.

**Conclusion du sous-lot Storage : PASS**, avec preuve applicative et relecture distante. **LOT-00 global reste PARTIAL** tant que le préflight final des fixtures/environnement et les correspondances des fixtures ne sont pas clôturés. Aucun lancement de la recette 11 lots n'est autorisé par cette réussite Storage seule.

Garde-fous : JOBLY-E2E uniquement ; aucune mutation JOBLY-PROD ; `main` demeure `979f2ccfec9258bc30989af18433cf6adb1b4698` ; PR #266/#267 ouvertes en brouillon et non fusionnées ; aucun déploiement ; aucune fixture réinitialisée.

### 93.16 Correspondance des fixtures JOBLY-E2E — contrôle SQL final PASS

Contrôle read-only direct effectué sur le projet `ofqqrryamslxoqkklraw`, en utilisant les marqueurs `auth.users.raw_app_meta_data.e2e_fixture = 'true'` et la relation `public."User"."authUserId"`.

Résultat agrégé :
| Contrôle | Résultat |
|---|---:|
| Identités Auth E2E | 3 |
| Identités avec exactement un profil | 3/3 |
| Profils manquants | 0 |
| Profils en doublon | 0 |
| Liaison `authUserId` et rôle métier conformes | 3/3 |
| Rôles attendus invalides | 0 |

Détail des correspondances :
- Talent : un profil `TALENT`, lié à l'identité Auth correspondante.
- Recruteur : un profil `RECRUITER`, lié à l'identité Auth correspondante.
- Partenaire : un profil `PARTNER`, lié à l'identité Auth correspondante.

Les trois identités ont un e-mail confirmé, ne sont pas actuellement bannies et ne sont pas supprimées. Les métadonnées Auth contiennent les marqueurs de fixture E2E et de rôle attendus. Les identifiants sont pseudonymisés dans les rapports de travail ; aucune adresse e-mail ni donnée personnelle n'est nécessaire à cette preuve.

**Résultat : correspondance structurelle des fixtures PASS 3/3.** Aucun compte ni profil n'a été créé, modifié ou supprimé.

### 93.18 Requête finale de cohérence des fixtures — PASS

Une requête read-only finale a été exécutée le 8 novembre 2026 directement sur JOBLY-E2E, en filtrant les identités dont `auth.users.raw_app_meta_data.e2e_fixture = 'true'`, puis en comptant les profils associés via `public."User"."authUserId"`.

Résultat agrégé retourné par Supabase :
```json
{
  "fixture_auth_count": 3,
  "exactly_one_profile": 3,
  "missing_profile": 0,
  "duplicate_profiles": 0,
  "role_and_link_match": 3,
  "invalid_expected_role": 0
}
```

Cette requête confirme sans exposer les identités complètes que les trois fixtures déclarées existent, ont chacune un et un seul profil, que le rôle réel correspond au rôle E2E attendu et que le lien `authUserId` est présent. Aucune écriture n'a été exécutée.

### 93.17 Clôture effective LOT-00 — PASS

Les critères du LOT-00 pour le préflight environnement/jeux de données sont maintenant satisfaits par des preuves concrètes :

| Domaine | Preuve | Statut |
|---|---|---|
| Projet et contexte local | Projet JOBLY-E2E exact ; dépôt et remote confirmés | PASS |
| Runtime local | Node 26.13.0, npm 11.20.0, pnpm 10.28.0 | PASS |
| Accès administratif au projet de test | `.env.local` lu par le runner ; clé privée acceptée ; opération Storage effectuée sur le ref E2E exact | PASS |
| Sécurité SQL/RLS/ACL/RPC | Matrice 180/180 tables avec RLS et contrôles de moindre privilège déjà appliqués et revérifiés (preuves §§88 et 92) | PASS |
| Storage | 5/5 buckets configurés ; tests upload, lecture signée, refus anonyme et cleanup 5/5 ; relecture SQL indépendante conforme (§93.15) | PASS |
| Correspondances Auth ↔ profils | 3/3 fixtures avec un profil unique et rôle métier concordant (§93.16) | PASS |

**Décision : LOT-00 = PASS / CLOS** pour son périmètre : environnement, identité projet, sécurité de base, Storage et cohérence structurelle des données de test.

**Limite explicitement transférée à LOT-01 — Auth :** le manifeste local `.e2e-fixtures.json` et les anciens mots de passe ne sont pas disponibles. Il n'y a donc aucune preuve actuelle de `signInWithPassword` pour Talent, Recruteur et Partenaire. Ces connexions restent `NON_TESTABLE`, et non FAIL. Elles seront le premier scénario de LOT-01 après récupération des identifiants depuis une sauvegarde sûre. Ne pas réinitialiser les mots de passe, ne pas recréer les comptes et ne pas exécuter de provisionneur pour contourner cette limite.

Aucun lot métier LOT-01 à LOT-10 n'est déclaré PASS par cette clôture. La recette globale reste en cours. Garde-fous inchangés : `main` SHA `979f2ccfec9258bc30989af18433cf6adb1b4698`, PR #266/#267 non fusionnées, JOBLY-PROD interdit, aucun déploiement et aucune fixture modifiée.

### 93.20 Manifeste de fixtures retrouvé — prêt pour le premier test LOT-01 Auth

Le 8 novembre 2026, l'opérateur a indiqué le chemin local du manifeste de fixtures :
`C:\Users\ASUS\Jobly\.e2e-fixtures.json`.

Ce chemin est maintenant la source explicitement fournie pour le test Auth. **Le contenu du fichier n'a pas été partagé** : ses mots de passe restent locaux et ne doivent pas être copiés dans le chat, un rapport ou Git.

Le vérificateur distant contrôlé est `e2e/verify-existing-fixtures.mjs`, blob `82e9931b1d16f5250666fd374b432b1558f1ea51`. Il accepte le chemin du manifeste comme premier argument, valide qu'il cible exclusivement JOBLY-E2E et contient les trois comptes attendus, puis tente `signInWithPassword` pour Talent, Recruteur et Partenaire, vérifie chaque session côté serveur avec `getUser`, et ferme chaque session locale. Il utilise seulement la clé publishable JOBLY-E2E ; aucune clé service_role, création de compte, mise à jour de profil ou réinitialisation de mot de passe n'est effectuée.

**Statut à cette étape :** chemin de manifeste signalé par l'opérateur ; contenu pas encore validé par le script ; connexions Auth non encore exécutées. Aucun PASS Auth ne doit être annoncé avant le rapport `artifacts/e2e/fixture-password-verification.json`.

Commande de reprise recommandée depuis CMD, sans synchroniser le clone de 167 commits :
```cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin && git show origin/e2e/recette:e2e/verify-existing-fixtures.mjs > e2e\verify-existing-fixtures.current.mjs && node e2e\verify-existing-fixtures.current.mjs "C:\Users\ASUS\Jobly\.e2e-fixtures.json" && notepad artifacts\e2e\fixture-password-verification.json
```
Si `git fetch` ou `git show` échoue, arrêter là ; ne pas lancer une ancienne copie locale. Cette commande ne fait ni `pull`, ni `merge`, ni modification Auth. Elle crée une copie de travail distincte du vérificateur et écrit seulement son rapport.

### 93.19 Confirmation finale de clôture — LOT-00 totalement vert

À la suite de la question de l'opérateur (« le LOT-00 est-il totalement vert ? »), l'état a été clarifié puis confirmé : **oui, LOT-00 est entièrement PASS et CLOS pour l'ensemble des critères qui lui sont attribués dans cette recette**.

Le sous-lot Storage est PASS sur cinq buckets avec cinq smoke tests complets ; le préflight d'environnement et les contrôles de sécurité sont PASS ; les trois fixtures Auth existantes correspondent chacune à un profil métier unique et au rôle attendu.

La connexion interactive `signInWithPassword` avec les anciens mots de passe n'est pas un critère laissé en échec dans LOT-00 : elle constitue le premier scénario fonctionnel du LOT-01 — Auth. Elle reste `NON_TESTABLE` tant que le manifeste sécurisé `.e2e-fixtures.json` ou une sauvegarde valide n'est pas retrouvé. Aucun mot de passe ne doit être réinitialisé et aucun compte ne doit être recréé pour maintenir artificiellement un PASS.

**État maître à retenir : LOT-00 = 100 % PASS / CLOS. LOT-01 = prochain lot à traiter. Recette globale = EN COURS.**


### 93.4 Limites de la première tentative — historique supersédé

Cette entrée décrit uniquement la tentative initiale de réparation du lanceur : aucun appel Supabase/Storage n'avait alors été effectué. Son statut BLOCKED était exact au moment de cette première tentative, mais il est désormais **historique et remplacé** par les preuves ultérieures des §§93.15 à 93.18. Ne pas reprendre cette conclusion comme état courant.

Garde-fous toujours en vigueur : JOBLY-E2E uniquement (`ofqqrryamslxoqkklraw`) ; JOBLY-PROD interdit ; `main` inchangée ; PR #266 et #267 ouvertes en brouillon, non fusionnées ; aucun déploiement ; aucune réinitialisation ou modification de fixtures ; aucun secret dans le chat, les rapports ou Git.

### 93.5 Précision opérateur — redémarrage Windows et session CMD perdue

Après l'inscription du §93, l'opérateur a précisé que l'ordinateur avait redémarré et que la session CMD n'était plus positionnée/ouverte sur le dépôt Jobly.

Cette information explique plausiblement l'état de la console : un redémarrage ferme la fenêtre CMD et réinitialise son répertoire courant. Cela ne démontre ni la suppression du clone local, ni la disparition du fichier source distant, ni une défaillance de l'authentification GitHub. La cause exacte du message Windows « Impossible de trouver le fichier » n'est toujours pas démontrée ; ne pas la requalifier comme suppression du lanceur.

**Reprise locale après redémarrage — navigation seulement, sans écriture :**

1. Ouvrir une nouvelle fenêtre CMD.
2. Se repositionner dans le clone local connu :
   `cd /d C:\Users\ASUS\Jobly`
3. Vérifier que l'invite commence par `C:\Users\ASUS\Jobly>`. Si CMD affiche « chemin d'accès introuvable », arrêter et ne pas créer un nouveau dépôt ni exécuter le lanceur ; le chemin réel du clone doit d'abord être retrouvé.
4. Une fois dans le répertoire, vérifier le dépôt et le remote :
   `git rev-parse --show-toplevel`
   `git remote -v`
   `git status --short --branch`

Ces commandes sont des contrôles de contexte uniquement. Ne pas faire `pull`, `switch`, `reset`, `stash` ou `clean`. Si Git réclame une authentification, ne saisir aucun secret dans le chat ; traiter la demande sur le poste local seulement. Ne lancer aucun script Storage lors de cette reprise de session.

Le diagnostic du fichier local ne reprend qu'après confirmation du répertoire du dépôt et de son remote. Ensuite seulement, effectuer le préflight read-only des chemins défini au §93.3 et le remplacement atomique si tous les prérequis sont présents.

### 93.6 Reprise de session confirmée — dépôt retrouvé, Node.js à contrôler

Après redémarrage de Windows, l'opérateur a rouvert CMD et transmis le rapport `feedback-lot00-session-recovery.txt`. Les éléments suivants sont maintenant établis :

- Dossier courant : `C:\Users\ASUS\Jobly`.
- Racine Git : `C:/Users/ASUS/Jobly`.
- Remote fetch/push : `https://github.com/kenzimayaka-glitch/Jobly.git`.
- Branche locale : `e2e/recette`.
- État de synchronisation indiqué par Git : `e2e/recette...origin/e2e/recette [behind 167]`.
- Le répertoire de travail est fortement modifié : le script `e2e/reset-existing-fixture-passwords.mjs` apparaît modifié ; de nombreux rapports sont non suivis ; `scripts/e2e/` et `supabase/.temp/` apparaissent non suivis.

**Interprétation :** la session CMD est rétablie et le clone Git est retrouvé. La mention `behind 167` ne justifie aucune synchronisation automatique. Les modifications et fichiers locaux doivent être préservés. Ne pas exécuter `git pull`, `switch`, `reset`, `stash`, `clean`, ni le reset/provisionneur de fixtures. Ne pas supprimer ou écraser `scripts/e2e/` avant inventaire.

**Node.js : statut non encore vérifié après redémarrage.** Le fait d'être dans CMD ne signifie pas que Node.js est absent : CMD est le shell Windows depuis lequel l'exécutable `node` est appelé. Le dernier environnement documenté indiquait Node.js v26.13.0, mais cette version n'a pas été revalidée dans la nouvelle session.

Contrôle read-only à exécuter depuis `C:\Users\ASUS\Jobly` :
```cmd
(
echo === NODE.JS ===
where node 2^>^&1
node --version 2^>^&1
echo.
echo === NPM ===
where npm 2^>^&1
npm --version 2^>^&1
echo.
echo === PNPM ===
where pnpm 2^>^&1
pnpm --version 2^>^&1
) > feedback-lot00-node-preflight-20261108.txt 2>&1
notepad feedback-lot00-node-preflight-20261108.txt
```

Ce contrôle ne modifie ni les dépendances ni les fichiers du projet. Si `node` est « introuvable », distinguer une absence réelle d'installation d'un PATH non chargé ; ne pas installer, réinstaller ou modifier PATH avant d'avoir lu le rapport et vérifié l'installation existante.

À ce stade, le clone et le remote sont confirmés, mais Node.js, le lanceur local et Storage ne sont pas validés. Le préflight Node doit précéder tout lancement de script.

### 93.7 Préflight Node.js après redémarrage — PASS

Rapport opérateur reçu : `feedback-lot00-node-preflight-20261108.txt`.

Résultats vérifiés depuis `C:\Users\ASUS\Jobly` :
- Node.js : trouvé à `C:\Program Files\nodejs\node.exe`, version `v26.13.0`.
- npm : trouvé à `C:\Program Files\nodejs\npm` et `npm.cmd`, version `11.20.0`.
- pnpm : trouvé à `C:\Users\ASUS\AppData\Roaming\npm\pnpm` et `pnpm.cmd`, version `10.28.0`.

**Conclusion :** le redémarrage n'a pas supprimé Node.js ni pnpm du poste. CMD retrouve les trois outils ; aucun téléchargement, réinstallation ou changement de PATH n'est nécessaire. Le préflight runtime est PASS.

**Prochain contrôle autorisé :** inventaire read-only du chemin `scripts\e2e\run-lot00-storage-hardening.cmd`, du dossier `scripts\e2e`, de `%TEMP%` et des références Git distantes ; calculer le hash local si le fichier existe. Ne créer/écraser aucun fichier pendant cet inventaire. Préserver les fichiers non suivis déjà signalés et ne pas synchroniser les 167 commits en retard. Aucun script Storage ne doit encore être lancé.

### 93.8 Consigne opérateur — actions utiles, pas de boucles de vérification

L'opérateur demande explicitement de ne retenir que des actions qui font avancer le chantier, et d'éviter les séries répétitives de contrôles intermédiaires.

Conséquence pour la suite :
- Les prérequis déjà prouvés ne doivent pas être redemandés : CMD est rétabli, le dépôt `C:\Users\ASUS\Jobly` et le remote GitHub sont confirmés, Node.js `v26.13.0`, npm `11.20.0` et pnpm `10.28.0` fonctionnent.
- Ne pas refaire un diagnostic général de l'environnement ni demander à l'opérateur de recopier le contenu des scripts.
- Regrouper la reprise en une seule intervention opérationnelle utile : récupérer uniquement la branche distante de recette nécessaire, installer le lanceur depuis l'objet GitHub vérifié en préservant toute copie locale préexistante, contrôler son empreinte une fois, puis lancer le processus LOT-00 et ouvrir ses deux rapports. Arrêter immédiatement si une étape échoue ; ne pas enchaîner avec des vérifications redondantes.
- Ne jamais synchroniser les 167 commits du clone local, ni modifier les autres fichiers non suivis. Ne pas exécuter le reset/provisionneur de fixtures. Les secrets restent strictement locaux.
- Après la tentative, l'analyse doit porter sur le rapport réel et résoudre directement le blocage constaté. LOT-00 reste PARTIAL tant que les cinq buckets et leurs smoke tests réels ne sont pas validés.

### 93.9 Diagnostic credential — cause précise trouvée, action opérateur unique

Rapport de diagnostic transmis : `checkedAt=2026-11-08T22:02:18.294Z`, répertoire `C:\Users\ASUS\Jobly`.

Résultat :
- `.env` : absent.
- `.env.local` : absent.
- Variables privées recherchées (`SUPABASE_E2E_SECRET_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`) : aucune affectation et aucune valeur effective.
- Variables publishable/anon dans les fichiers/processus : aucune valeur ; le diagnostic dispose toutefois de la clé publishable JOBLY-E2E connue depuis la configuration de recette (`anonPublicKeyAvailableForAnonymousReadCheck=true`).
- `keySelected=false`, `acceptedFormat=false` ; projet/role JWT non vérifiables faute de clé sélectionnée.
- Le rapport n'inclut aucun secret.

**Cause établie :** la clé administrative privée JOBLY-E2E n'est pas configurée localement après redémarrage. La clé publishable disponible pour le test anonyme ne remplace pas une clé secrète. Le runner s'arrête au diagnostic d'identifiants avant l'application des paramètres Storage. Aucun changement bucket ni écriture d'objet Storage n'est effectué par cette tentative.

**Action opérateur suivante — une seule intervention :**
1. Depuis `C:\Users\ASUS\Jobly`, ouvrir le fichier local à créer avec `notepad .env.local`.
2. Récupérer la clé **Secret key** du projet Supabase JOBLY-E2E `ofqqrryamslxoqkklraw` (et exclusivement ce projet), puis enregistrer localement une seule ligne :
   `SUPABASE_SECRET_KEY=sb_secret_…`
   Si le tableau de clés ne fournit qu'une ancienne clé JWT, utiliser plutôt `SUPABASE_SERVICE_ROLE_KEY=...` uniquement si elle appartient bien à JOBLY-E2E. Ne jamais utiliser la clé publishable/anon comme clé administrative. Ne jamais coller la valeur du secret dans le chat, un rapport ou Git.
3. Enregistrer `.env.local`, puis relancer une fois `scripts\e2e\run-lot00-storage-hardening.cmd`. Ouvrir les rapports `feedback-lot00-storage-credential-diagnostic.txt` et `feedback-lot00-storage-apply-20261108.txt`. Le lanceur contrôle le projet avant l'appel Storage.

Ne pas effectuer de recherche supplémentaire sur les chemins, ne pas recréer le dépôt et ne pas synchroniser les 167 commits. Préserver tous les fichiers locaux. Si la clé privée E2E n'est pas disponible dans le tableau API Keys, arrêter et signaler ce fait ; ne pas la remplacer par une clé JOBLY-PROD.

### 93.10 Création de `.env.local` — fichier vide attendu, secret encore à saisir

Après la commande `notepad .env.local`, l'opérateur indique que le Bloc-notes est vide. Ce résultat est normal : le fichier n'existait pas et Notepad vient d'ouvrir un nouveau fichier vierge. Cela ne constitue pas une erreur d'ouverture.

Action requise, sans nouveau diagnostic :
1. Dans ce Bloc-notes vide, saisir une seule ligne en remplaçant la valeur d'exemple par la vraie clé **Secret key** du projet JOBLY-E2E `ofqqrryamslxoqkklraw` :
   `SUPABASE_SECRET_KEY=sb_secret_...`
2. Ne pas saisir les trois points littéralement ; coller la valeur intégrale de la clé après le signe `=`. Ne pas ajouter de guillemets ni d'espaces.
3. Enregistrer avec `Ctrl+S`, garder le nom `.env.local` et le dossier `C:\Users\ASUS\Jobly`. Vérifier au besoin que le Bloc-notes n'a pas ajouté `.txt` au nom.
4. Ne pas copier la clé dans le chat, un rapport ou Git.
5. Une fois le fichier sauvegardé, lancer le runner une seule fois et examiner le rapport d'application réel. Ne pas demander à l'opérateur de transmettre le contenu de `.env.local`.

La création d'un fichier vide n'a produit aucune clé et ne permet pas encore de poursuivre l'application Storage. Tant que la clé n'est pas renseignée et enregistrée, LOT-00 reste PARTIAL / BLOCKED sur Storage.

### 93.11 Fenêtre Notepad « Sans titre » — enregistrement du vrai nom requis

L'opérateur indique que la fenêtre Notepad ouverte par `notepad .env.local` affiche « Sans titre ». Cela signifie que le nouveau document est encore non enregistré ; cela ne signifie pas que le chemin du dépôt est erroné.

Procédure :
1. Dans le document vierge, saisir la ligne de clé privée JOBLY-E2E (clé réelle, jamais la valeur d'exemple).
2. Faire `Ctrl+Shift+S` pour ouvrir « Enregistrer sous ».
3. Naviguer vers `C:\Users\ASUS\Jobly`.
4. Choisir le type `Tous les fichiers (*.*)` si le dialogue le propose.
5. Entrer le nom exact `.env.local` (sans ajouter `.txt`) puis enregistrer.
6. Ne pas transmettre le fichier ni sa valeur secrète. Une fois enregistré, relancer le lanceur une seule fois.

Tant que le titre reste « Sans titre » et que l'enregistrement n'a pas été confirmé, le fichier `.env.local` n'existe pas encore. Aucun secret n'est supposé enregistré et Storage reste non appliqué.

### 93.12 Échec réel du premier apply — rollback confirmé et cause trouvée

Rapports opérateur du 8 novembre 2026 vers 22:07 UTC :
- Diagnostic credential : `.env.local` existe ; `SUPABASE_SECRET_KEY` est non vide et disponible ; format `sb_secret_` accepté. Le secret n'est jamais recopié dans le rapport.
- Intégrité runner : blobs des trois scripts contrôlés conformes ; `node --check` = PASS.
- Exécution Storage : `status=FAIL`, erreur `Configuration Storage non conforme après updateBucket : recruitment-listings`.
- `talent-cvs` avait été appliqué et relu conforme avant l'erreur.
- `recruitment-listings` avait été envoyé à updateBucket mais le contrôle de relecture a déclaré un écart.
- Rollback reporté PASS pour `recruitment-listings` et `talent-cvs`.
- Aucun test de smoke d'accès n'a démarré ; aucune photo legacy migrée ; aucun nouveau bucket créé selon le rapport.

Une lecture SQL read-only effectuée immédiatement après le rapport sur JOBLY-E2E confirme l'état antérieur restauré :
- `talent-cvs`, `recruitment-listings` et `mobility-documents` : privés, limites/MIME nulles ;
- `jobly-events` : public, limite 10 MiB et allowlist historique `image/*, video/*, application/pdf` ;
- `profile-photos-private` : absent.
Les `updated_at` des quatre buckets existants restent au 6 novembre 2026. Aucun réglage partiel issu de la tentative ne demeure dans ces buckets.

**Cause exacte du faux échec :** le script passait à `updateBucket` deux entrées équivalentes pour HTML : `text/html` et `text/html; charset=utf-8`. Le serveur Supabase Storage normalise les types MIME en conservant seulement `type/subtype` et en dédupliquant les valeurs. La liste persistée contient donc un seul `text/html`, tandis que le vérificateur Jobly comparait les tableaux bruts avec la même longueur et le même ordre. L'API Storage pouvait avoir appliqué les réglages demandés, mais notre comparaison déclarait à tort un écart parce qu'elle attendait cinq entrées au lieu de quatre.
Références d'implémentation Supabase relues :
- `src/storage/storage.ts` appelle `normalizeAllowedMimeTypes` lors de `updateBucket` : https://github.com/supabase/storage/blob/master/src/storage/storage.ts
- La normalisation retire les paramètres MIME et stocke des valeurs uniques : https://github.com/supabase/storage/blob/master/src/storage/validators/mime-type.ts
- Référence API officielle `updateBucket` : https://supabase.com/docs/reference/javascript/file-buckets-updatebucket

### 93.13 Correctif du vérificateur publié et exécuté — PASS

Deux fichiers corrigés sur `e2e/recette` :
- `scripts/e2e/lot00-storage-bucket-hardening.mjs` : blob `4521e64aed66cfb6ce93d1372b1a1b62f29cd84f` ; commit `f3753f7370007647a5e4bf99c130c69437d0c921`.
- `scripts/e2e/run-lot00-storage-hardening.cmd` : blob `208534506d1e647467329bcdd6e7deffc660b17e` ; commit `3dfcd140a22c9ee10fcbc5cb9acd53749a62dd9e`.

Le correctif compare les listes MIME après retrait des paramètres, mise en minuscules, déduplication et tri. Il conserve les contrôles stricts de visibilité et de taille et consigne les valeurs réellement relues en cas d'écart. Le runner épingle le nouveau blob.

**Résultat ultérieur :** le lanceur corrigé a été exécuté le 8 novembre à 22:12 UTC avec hashes et syntaxe PASS ; les cinq buckets et les cinq smoke tests ont réussi (§93.15). Cette étape n'est donc plus à exécuter.

### 93.14 Plan d'application — exécuté, ne pas rejouer

Le plan consistant à récupérer le lanceur corrigé puis à l'exécuter depuis `C:\Users\ASUS\Jobly` a été réalisé. Le rapport final `feedback-lot00-storage-apply-20261108.txt` a retourné `status=PASS`, sans rollback. Les résultats applicatifs et la relecture SQL indépendante sont détaillés au §93.15.

**Instruction actuelle :** ne pas relancer ce plan et ne pas refaire les diagnostics du lanceur, de Node.js ou de la clé E2E. Le sous-lot Storage est clos.


---

## 92. LOT-00 — tests applicatifs et HTTP verts, hardening Storage en attente d'une clé privée locale

**État à retenir au 8 novembre 2026 : PARTIAL.** Les corrections applicatives et leurs contrôles CI sont désormais verts ; la configuration effective des buckets sur JOBLY-E2E n'a toujours pas été appliquée, car les tentatives locales communiquées précédemment ont signalé l'absence d'une clé privée dans le processus/fichier local.

### 92.1 Correctifs applicatifs et CI — preuves positives

Branche de recette synchronisée au commit `cdc4399d452f3341895b5d56efb5204080d3faa9`. Les corrections comprennent :
- la protection contre un profil CV partagé absent (réponse 404 au lieu de déréférencer une valeur nulle) ;
- le garde de type sur les événements servis à l'écosystème, corrigeant l'échec TypeScript du pipeline ;
- le runner Storage et son diagnostic : chargement natif de `.env` / `.env.local`, repli si une variable de processus est définie mais vide, alias de clés privées modernes et legacy, aucune valeur de secret dans les rapports ;
- une clé publishable JOBLY-E2E déjà déclarée dans le workflow de recette, utilisée uniquement pour le test de lecture anonyme ; elle n'est pas une clé administrative ;
- un helper de smoke Storage réel : un objet temporaire unique est envoyé dans chaque bucket privé, son lien signé est relu, l'URL publique anonyme est testée avec la clé publishable, puis l'objet temporaire est supprimé dans `finally`. Le rapport n'enregistre ni clé ni URL signée.

CI du commit `cdc4399d452f3341895b5d56efb5204080d3faa9` :
- Jobly CI — Typecheck & Build : **SUCCESS** — run [42511382151](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42511382151).
- Jobly Security Core — isolated migration tests : **SUCCESS** — run [42511382166](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42511382166).
- Verify Africa source registry : **SUCCESS** — run [42511382223](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42511382223).
- Les tests contractuels et unitaires LOT-00 sont PASS dans le workflow ; TypeScript et build Next.js sont PASS.
- Smoke HTTP sur le serveur Next.js de production-build du runner : **3/3 PASS** — upload photo Talent sans session = 401 ; upload média événement sans session = 401 ; liste Talent Recruteur sans session = 401. Le log confirme `LOT00_HTTP_RUNTIME=PASS; checks=3; environment=local-build-only`.

Ces tests HTTP vérifient le démarrage du vrai serveur de build et les gardes d'authentification. Ils n'authentifient pas un compte Talent/Recruteur, n'écrivent pas dans Supabase, et ne constituent donc pas le test d'accès Storage en direct.

### 92.2 Lecture Storage JOBLY-E2E — état distant inchangé

Lecture SQL exclusivement read-only de `storage.buckets` jointe à `storage.objects`, projet `ofqqrryamslxoqkklraw`, après les dernières corrections :
| Bucket | Public | Limite | MIME | Objets |
|---|---:|---:|---|---:|
| `talent-cvs` | non | non configurée | non configuré | 0 |
| `recruitment-listings` | non | non configurée | non configuré | 0 |
| `mobility-documents` | non | non configurée | non configuré | 0 |
| `jobly-events` | **oui — non conforme** | 10 MiB | image/*, video/*, PDF | 0 |
| `profile-photos-private` | absent | — | — | — |
| `profile-photos` (public avec consentement) | oui | 5 MB | image/* | 0 |

Aucune ligne de `storage.buckets` n'a été modifiée par SQL. Aucune écriture Storage n'a été effectuée pendant cette lecture.

### 92.3 Runner d'application et blocage restant

Les fichiers contrôlés par hash dans le runner Windows :
- `scripts/e2e/lot00-storage-bucket-hardening.mjs` — blob `5bf79cd06db9ae466d6ffce9a2833be12a8823fd` ;
- `scripts/e2e/lot00-storage-credential-diagnostic.mjs` — blob `f100bf22f423a813e0f20f8a65c9025314b095b8` ;
- `scripts/e2e/lot00-storage-access-smoke.mjs` — blob `68e14ba5b1efbf84ee3970a36bb070cc3b4dc558` ;
- `scripts/e2e/run-lot00-storage-hardening.cmd` — blob `8672167fc66c639f433d5d0296847dd5f200d315`.

Le runner diagnostique maintenant les alias `SUPABASE_E2E_SECRET_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`. Il ne peut pas inventer ni récupérer une clé service/secret depuis une clé publishable. Les deux tentatives opérateur précédentes se sont terminées sur `Clé privée JOBLY-E2E absente du fichier local`. Le dernier runner est prêt mais n'a pas encore été exécuté avec le diagnostic étendu et le test Storage réel.

**Action opérateur unique restante :** exécuter le runner depuis `C:\Users\ASUS\Jobly`. Si aucune clé privée n'est trouvée, ajouter localement dans `.env.local` une clé privée JOBLY-E2E issue du tableau API Keys de ce projet, sous `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`, sans la transmettre ni la commiter, puis relancer. Le runner utilise déjà la clé publique JOBLY-E2E connue ; aucune autre clé publique n'est à renseigner.

Résultat requis pour fermer ce point : cinq buckets configurés et relus conformes ; pour chacun, `upload=PASS`, `signedRead=PASS`, `anonymousPublicRead=DENIED`, `cleanup=PASS) ; migration photos legacy conforme ; `status=PASS`, `exit_code=0). Si un nettoyage échoue, conserver le rapport FAIL et traiter l'objet signalé avant clôture.

### 92.4 Garde-fous et conclusion

`main` demeure au SHA `979f2ccfec9258bc30989af18433cf6adb1b4698`. PR #266 est ouverte/brouillon/non fusionnée et pointe vers ce chantier ; PR #267 reste ouverte/brouillon/non fusionnée. Le workflow de recette complète des 11 lots reste `workflow_dispatch` uniquement afin de ne pas toucher aux fixtures partagées par un simple push. Aucun déploiement Vercel/production et aucun accès JOBLY-PROD.

**Conclusion :** les contrôles de code et HTTP sont corrigés et PASS. Le paramétrage Storage distant et le smoke authentifié sur les cinq buckets restent BLOQUÉS par l'absence de clé privée locale. LOT-00 reste **PARTIAL**, pas PASS, tant que le rapport Storage réel n'est pas vert.
 
---

## 1. Résumé de pilotage

Le dernier jalon E2E authentifié pleinement démontré avant l'ajout du parcours croisé est celui du **7 novembre 2026, entre 11:17 et 12:06** :

- Auth Supabase réelle : **12/12 contrôles PASS**, pour Talent, Recruteur et Partenaire.
- API authentifiées : **24/24 contrôles PASS**, pour les trois rôles.
- Smoke navigateur : **14/14 contrôles PASS**, sans blocage ni erreur navigateur.
- TypeScript et build Next.js : **PASS**.
- Recette bulk : **301 tests automatisés**, **0 FAIL**, mais **11 lots PARTIAL**.

Ce jalon n'était donc **pas une recette globale verte**. Il démontrait que les comptes de test pouvaient se connecter et que plusieurs API fonctionnaient, tandis que des parcours métier complets restaient à construire et à valider.

Le parcours croisé **Talent → Recruteur → entretien → décision OFFER → contrôle des droits → nettoyage** a ensuite été intégré à la branche. Son code est présent, mais son exécution locale n'a pas encore été prouvée par un rapport PASS.

La dernière exécution locale communiquée (12:21:58–12:26:49) a donné **277 tests, 0 FAIL, 10 PARTIAL et 1 BLOCKED**. Les contrôles d'authentification et les API authentifiées étaient BLOCKED : cette exécution ne permet donc pas de conclure que les fonctionnalités authentifiées ont régressé.

**État de pilotage à retenir :**
- Dernier point de preuve authentifiée : PASS sur les smoke tests précédents.
- État de la recette complète : PARTIAL.
- Parcours croisé : code intégré, validation locale en attente.
- Récupération des fixtures locales : en attente de vérification par l'opérateur.
- Aucun changement de mot de passe, aucune recréation de compte, aucune fusion dans `main` et aucun déploiement autorisé ou effectué dans ce chantier.

## 2. Périmètre et règles non négociables

1. Exécuter la recette uniquement sur JOBLY-E2E, projet `ofqqrryamslxoqkklraw`.
2. Ne jamais utiliser JOBLY-PROD, ni ses secrets, comptes, données ou URL.
3. Travailler sur `e2e/recette`. La PR #266 reste en brouillon jusqu'à décision explicite.
4. Ne pas fusionner dans `main` et ne pas déclencher de déploiement Vercel ou Netlify dans le cadre de cette recette.
5. Aucun e-mail, SMS, paiement, Mobile Money, candidature externe, webhook ou appel réel à un fournisseur. Les contacts synthétiques utilisent le domaine réservé `.invalid`.
6. Ne jamais placer mots de passe, clé service_role/secret, jetons de session ou fichier runtime dans le chat, les rapports, les logs ou Git.
7. Ne jamais relancer un provisionnement complet pour « voir si cela passe ». Tout changement d'identifiant exige un besoin établi et une autorisation explicite.
8. Un test non exécuté est BLOCKED ou NON TESTABLE, jamais PASS. Un test unitaire/statique ne vaut pas validation E2E.
9. Un lot est PASS uniquement lorsque ses critères métier obligatoires, ses preuves de persistance et ses contrôles de nettoyage/sécurité sont tous démontrés.
10. L'opérateur qui exécute le CMD et l'agent qui analyse les rapports travaillent en boucle : l'agent demande une action précise, l'opérateur retourne le résultat, puis l'agent conclut. Aucun état local ne doit être supposé.

**Poste local connu lors des derniers tests :** Windows, chemin `C:\Users\ASUS\Jobly`, Node.js v26.13.0, pnpm 10.28.0 et Git installés. L'opérateur préfère le Node.js Command Prompt/CMD, pas PowerShell.

## 3. Chronologie des preuves

### 3.1 Jalon authentifié réussi — avant le parcours croisé

| Heure locale du 7 novembre | Preuve | Résultat | Portée exacte |
|---|---|---:|---|
| 11:17 | `auth-session-smoke.json` | 12/12 PASS | Connexion Auth, validation du jeton, rôle signé, refresh et rotation de session sur 3 rôles |
| 11:51 | `authenticated-role-smoke.json` | 24/24 PASS | API Talent, Recruteur et Partenaire ; lecture/écriture et persistance prévues par le smoke |
| 11:57 | `lot1-auth-ui-smoke.json` | 14/14 PASS | UI navigateur, responsive 390 px et routes protégées |
| 12:01–12:06 | Rapport bulk local | 301 tests ; 0 FAIL ; 11 PARTIAL | 11 lots exécutés ; les lots restaient incomplets au regard des critères de recette |
| Même exécution | TypeScript / build / Playwright / API authentifiées | PASS / PASS / PASS / PASS | Contrôles techniques transverses rapportés par l'opérateur |

Le smoke API avait aussi révélé une absence de colonnes de marché sur JOBLY-E2E pour la création des RecruiterJobs. La migration existante `20261002100000_lot_e_recruiter_africa_market.sql` avait été appliquée **uniquement** à JOBLY-E2E, puis les contrôles de colonnes, contrainte, index et lignes invalides avaient été vérifiés. Le smoke avait ensuite atteint 24/24 PASS. Aucune modification de production n'avait été faite.

### 3.2 Parcours croisé ajouté au code

Le parcours ajouté à la branche prévoit :
1. Création API d'une offre synthétique publiée au Cameroun sur JOBLY-E2E.
2. Ajout d'un canal e-mail fictif en `.invalid`, exclusivement sur cette offre.
3. Préparation d'une candidature Talent sans soumission ni envoi externe.
4. Vérification de la visibilité de la même candidature côté Talent et côté Recruteur.
5. Transition Recruteur vers `INTERVIEW`, puis décision `OFFER`.
6. Vérification qu'une tentative de modification par Talent ne remplace pas la décision du Recruteur.
7. Suppression de l'offre et vérification en base de l'absence de l'offre et de la candidature.

**État :** code intégré ; aucune preuve d'exécution locale PASS du scénario croisé disponible à la date de ce document.

### 3.3 Dernière exécution locale communiquée

Rapport transmis par l'opérateur :
- Début : 12:21:58.435Z ; fin : 12:26:49.785Z.
- Commit : `local` (aucun SHA exact n'est fourni dans le rapport).
- Node.js : v26.13.0.
- JOBLY-E2E uniquement.
- Parallélisme : 5 lots, maximum 2 fichiers par lot.
- Bilan : 277 tests ; 0 PASS, 10 PARTIAL, 1 BLOCKED, 0 FAIL.

| Lot | Domaine | Statut | Tests |
|---|---|---:|---:|
| LOT-00 | Environnement et jeux de données | PARTIAL | 1 |
| LOT-01 | Auth, rôles, navigation et sécurité | PARTIAL | 48 |
| LOT-02 | Talent, offres, recherche et candidatures | PARTIAL | 16 |
| LOT-03 | Recruteur et Recruitment 360 | BLOCKED | 5 |
| LOT-04 | Mission Afrique et qualité des offres | PARTIAL | 16 |
| LOT-05 | J'IA 360 | PARTIAL | 51 |
| LOT-06 | Mobility et partenaires | PARTIAL | 25 |
| LOT-07 | Paiements, abonnements et Mobile Money | PARTIAL | 71 |
| LOT-08 | Events, Community, Bons Plans et Campus | PARTIAL | 21 |
| LOT-09 | Career Journey, Admin 360 et BI | PARTIAL | 0 |
| LOT-10 | PWA, Android et régression transverse | PARTIAL | 23 |

Contrôles transverses de cette exécution :
- Provisionnement des comptes : BLOCKED.
- Session Auth : BLOCKED.
- TypeScript : PASS.
- Build production : PASS.
- Playwright : PARTIAL.
- Parcours API authentifiés : BLOCKED.

Le rapport dit qu'aucune anomalie FAIL n'a été détectée dans les suites exécutées. Cela ne permet pas de dire que tous les parcours fonctionnels sont PASS : les parcours authentifiés n'ont pas démarré.

## 4. Incident fixtures : faits, hypothèses et limites

### Faits établis

- Une vérification SQL directe de JOBLY-E2E a retrouvé trois identités Auth marquées comme fixtures : une TALENT, une RECRUITER et une PARTNER.
- La même vérification a retrouvé une correspondance par rôle dans `public.User` pour chacune de ces trois identités.
- L'opérateur a ensuite signalé que `.e2e-fixtures.json` et `.e2e-fixture-runtime.json` étaient tous deux ABSENT sur son poste.
- Le message affiché lors d'une tentative de saisie de clé était : `[FIXTURE-PROVISION] Clé privée Supabase absente ou invalide.`
- Dans le code avant correction, le provisionnement complet supprimait les deux fichiers locaux avant de demander et de valider la clé privée.
- Le runner supprime également `.e2e-fixture-runtime.json` dans son bloc `finally` à la fin d'une exécution. L'absence de ce seul fichier après un run est donc normale.
- Le script de provisionnement complet d'avant correction pouvait mettre à jour un compte Auth existant avec un nouveau mot de passe aléatoire.

### Ce qui n'est pas établi

- Nous n'avons pas de capture de l'état de `.e2e-fixtures.json` immédiatement avant le lancement fautif. Nous ne pouvons donc pas affirmer que le runner l'a supprimé pendant ce lancement ; il a pu être absent auparavant.
- L'erreur de clé indique que la chaîne reçue était vide ou trop courte selon le contrôle de code exécuté. Elle ne prouve pas, à elle seule, que la clé appartenait au mauvais projet.
- Nous ne savons pas encore si l'opérateur possède une sauvegarde locale des anciennes fixtures ou une copie sécurisée des anciens mots de passe.
- Nous ne savons pas encore si les anciens mots de passe fonctionnent toujours. La base Auth ne permet pas de retrouver un mot de passe en clair.

### Conséquence opérationnelle

Ne pas tenter une connexion si le mot de passe correspondant n'est pas disponible depuis une source sûre. Ne pas réinitialiser et ne pas recréer les comptes sans autorisation explicite. Le test demandé à l'opérateur est un véritable `signInWithPassword` pour chaque rôle, puis vérification du rôle signé et fermeture de session, avec un rapport PASS/FAIL/NON TESTABLE sans secret ni jeton.

### Résultat du contrôle des anciens identifiants — 7 novembre 2026, 12:53:43Z

Le rapport `artifacts/e2e/fixture-password-verification.json` a été transmis par l'opérateur :
- Statut : `NON_TESTABLE`.
- Talent : `NON_TESTABLE`, identifiants locaux indisponibles.
- Recruteur : `NON_TESTABLE`, identifiants locaux indisponibles.
- Partenaire : `NON_TESTABLE`, identifiants locaux indisponibles.
- Raison : le script n'a trouvé ni `.e2e-fixtures.json` ni sauvegarde reconnue dans le dossier racine du dépôt.
- Aucun appel Supabase Auth n'a été effectué.
- `serviceRoleUsed=false`, `passwordsChanged=false`, `accountsCreatedOrDeleted=false`, `profilesModified=false`.

**Portée exacte :** le vérificateur recherche le fichier primaire et les copies dont le nom correspond à ses critères dans le dossier racine du dépôt. Il ne parcourt pas l'ensemble du disque, les répertoires de sauvegarde Windows, l'historique de fichiers, OneDrive ou d'éventuelles sauvegardes externes. Le résultat ne démontre donc pas qu'aucune copie de sauvegarde n'existe ailleurs.

**Décision :** aucun mot de passe n'est déclaré invalide. Les anciens mots de passe restent `NON TESTABLE` faute de matériel local permettant de les essayer. Aucune réinitialisation n'est autorisée à ce stade.

## 5. Correctifs de garde-fou déjà poussés sur la branche

La PR #266 est restée ouverte et en brouillon. SHA de tête vérifié lors de la consolidation : `13456d8cfd5e35aee0ab726e52068e3f4f8561a7`.

| Commit | Modification | Portée |
|---|---|---|
| `e3691a3` | Provisionneur création-only, contrôle préalable, refus de toucher à une identité fixture déjà existante | `e2e/provision-fixtures.mjs` |
| `e9a272e` | Reconnaissance de `E2E_EXISTING_FIXTURE_PRESERVED` comme blocage contrôlé dans le runner | `scripts/e2e-local-recipe.mjs` |
| `13456d8` | Documentation de la règle de récupération | `e2e/README.md` |

Vérification du contenu GitHub au SHA de tête :
- Le provisionneur ne contient plus d'appel `unlink`.
- Une identité fixture existante avec le rôle attendu entraîne `E2E_EXISTING_FIXTURE_PRESERVED` ; aucun mot de passe n'est changé.
- Le runner classe ce cas en BLOCKED au lieu de tenter un provisionnement destructif.
- Le README décrit le mode création-only et la nécessité d'une récupération autorisée.

**Limite :** ces corrections ont été vérifiées dans le contenu GitHub. Elles n'ont pas encore été validées par une nouvelle exécution locale authentifiée de bout en bout.

### CI sur le SHA 13456d8

Workflow E2E : [run 42373614590](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42373614590).

Le workflow a terminé avec une conclusion `failure` parce que le bilan de recette restait PARTIAL et renvoyait un code de sortie 1. Les journaux indiquent 277 tests, 10 lots PARTIAL, 1 BLOCKED, 0 FAIL ; TypeScript et build PASS ; Auth et API authentifiées BLOCKED. C'est un workflow GitHub Actions qui ne reçoit volontairement pas la clé privée locale. Il ne remplace pas la recette authentifiée locale et ne doit pas être interprété comme une régression Auth.

État PR vérifié : #266 ouverte, brouillon, non fusionnée. Aucune action de déploiement effectuée.

## 6. État de référence des 11 lots — pilotage actualisé V2.138

Les résultats de rapports distincts ne doivent jamais être fusionnés dans une seule exécution. Les données historiques du §3.3 (277 tests, 10 PARTIAL, 1 BLOCKED) sont conservées comme photographie d'un run antérieur et ne décrivent pas la situation de chaque sous-lot après les correctifs ultérieurs.

### 6.1 Preuves acquises qui peuvent être réutilisées

- LOT-00 : **PASS / CLOS** sur les critères affectés à ce lot (§§93.15–93.19). Ne pas rejouer Storage, les migrations ni les contrôles SQL déjà PASS en l'absence de nouvelle anomalie.
- LOT-01 Auth : smoke de session **12/12 PASS** sur Talent, Recruteur et Partenaire (§99).
- LOT-01 API : **40/40 PASS**, cycle croisé Talent/Recruteur et nettoyage **3/3 PASS** (§§107 et 109). Ne pas relancer les 40 API pour le correctif home-stats.
- LOT-01 Security Core : **11/11 PASS** rapportés (§104), puis job CI Security Core success sur le commit de correction home-stats.
- LOT-01 browser-only : le dernier run transmis a échoué sur /api/public/home-stats HTTP 503 ; cause identifiée et code/droits corrigés au §112. Le nouveau smoke n'a pas encore été exécuté.
- LOT-02/03 : le cycle API croisé prouve une partie du parcours Talent/Recruteur, mais pas les parcours UI complets CV, shortlist, tests et exports.
- Tous les autres lots restent ouverts tant que leurs parcours runtime, persistance et nettoyage propres à leur domaine ne sont pas démontrés.

### 6.2 Priorités et ordre d'avancement

| Ordre | Lot | Priorité | Travail restant principal | Dépendance |
|---:|---|---|---|---|
| 1 | LOT-01 | P0 | Smoke public corrigé, UI authentifiée 3 rôles, critères avancés Auth ou exclusion acceptée, gate de clôture fiable | LOT-00 PASS |
| 2 | LOT-02 | P0 | Parcours Talent navigateur CV, recherche, détail, candidature et persistance | LOT-01 |
| 3 | LOT-03 | P0 | Parcours Recruteur navigateur, tests, shortlist, décision et exports | LOT-01 |
| 4 | LOT-07 | P0 | Cycle abonnement/paiement en sandbox, rapprochement SMS simulé, aucun transfert ni SMS réel | LOT-02 + LOT-03 |
| 5 | LOT-04 | P1 | Mission Afrique : collecte multi-sources, ingestion, reprise, qualité et persistance E2E | LOT-00 ; peut avancer indépendamment de LOT-01 |
| 6 | LOT-05 | P1 | J'IA 360 : session Talent réelle, connecteurs/outils, persistance et Internet Brain E2E | LOT-01 |
| 7 | LOT-06 | P1 | Mobility : demande Talent, éligibilité, justificatifs, financement et actions partenaire | LOT-02 + LOT-03 |
| 8 | LOT-09 | P1 | Career Journey, Admin 360 et BI : runtime, exports et persistance | LOT-01 + LOT-02 |
| 9 | LOT-08 | P2 | Events, Community, Bons Plans et Campus : publication, interactions et modération | LOT-01 |
| 10 | LOT-10 | P1 | PWA, synchronisation, Android et régression transverse sur appareils/runtimes prévus | LOT-01 à LOT-09 |
| 11 | LOT-11 | Dernier | Contrôle OpenAPI authentifié de clôture sécurité | Après les autres lots, selon §76 |

L'ordre de pilotage met d'abord en vert le socle Auth, puis les parcours Talent/Recruteur avant les paiements et Mobility. LOT-04 reste indépendant et peut être conduit en parallèle sans contourner les garde-fous. Les dépendances de cette table sont des règles de pilotage ; le moteur global doit encore être corrigé pour les faire respecter techniquement (§0.2 et §87.7).

### 6.3 Statut global

- LOT-00 : **PASS / CLOS**.
- LOT-01 : **PARTIAL / NON CLOS** ; le sous-lot API/Auth est vert, le smoke UI public est à rejouer après correctif, et le parcours UI authentifié + gate de clôture restent à faire.
- LOT-02 à LOT-10 : **NON CLOS** ; des tests unitaires/statique et quelques parcours ciblés existent, mais aucun statut de clôture globale ne doit être inféré.
- LOT-11 : non commencé ; réservé à la clôture selon le §76.

Aucun lot ne passe au vert par absence d'erreur dans une suite partielle ou par simple succès de compilation.

---

## 7. Plan de reprise ordonné — HISTORIQUE, NE PAS EXÉCUTER

> Cette séquence décrit un ancien plan de récupération des fixtures. Elle est conservée pour la traçabilité, mais elle est remplacée par les verrous V2.8 et les sections 15 à 17. Ne pas exécuter les scripts verify-existing-fixtures, verify-existing-fixtures-bulk, le provisionneur, la restauration runtime ou la recette complète à partir de cette section.


### Étape A — état local, sans toucher aux comptes

À demander à l'opérateur, dans son CMD, sans afficher ni transmettre le contenu des fichiers :
- rechercher une copie de sauvegarde de `.e2e-fixtures.json` (historique de fichiers, sauvegarde du dossier, corbeille, copie locale sécurisée) ;
- rechercher si un fichier `.env.e2e.local`, `.env.local` ou `.env` contient une URL JOBLY-E2E et une clé privée correspondante, sans imprimer la clé ;
- conserver l'information de disponibilité sous forme PRESENT/ABSENT seulement.

### Étape A2 — vérification des anciens mots de passe (lecture seule)

Le script `e2e/verify-existing-fixtures.mjs` est disponible sur la branche. Après synchronisation, exécuter `node e2e/verify-existing-fixtures.mjs`, puis ouvrir `artifacts/e2e/fixture-password-verification.json`. Il recherche `.e2e-fixtures.json` ou une sauvegarde reconnue, tente un vrai `signInWithPassword` pour chacun des trois rôles et valide la session avec `getUser`. Il n'utilise aucune clé privée, ne modifie aucun mot de passe, compte ou profil, et n'imprime aucun secret. Si aucun fichier d'identifiants n'est disponible, le résultat correct est `NON_TESTABLE` ; ne pas remplacer cela par un provisionnement complet. En présence de plusieurs sauvegardes, indiquer explicitement le chemin d'une seule au script.

### Étape A3 — vérification bulk par Node.js, trois rôles en parallèle

Le script `e2e/verify-existing-fixtures-bulk.mjs` prépare trois connexions Auth réelles simultanées. Il utilise d'abord `.e2e-fixtures.json` ou une sauvegarde reconnue. Si aucune n'existe, il demande à l'opérateur les anciens mots de passe Talent, Recruteur et Partenaire dans des champs terminal masqués, puis démarre les trois connexions en parallèle. Chaque session est validée par `getUser`, avec contrôle de l'adresse, de `app_metadata.e2e_fixture` et du rôle signé. Une seule tentative est réalisée par rôle. Aucun mot de passe n'est imprimé ni sauvegardé ; aucune clé privée, réinitialisation, création/suppression de compte ou modification de profil n'est utilisée. Commande : `node e2e/verify-existing-fixtures-bulk.mjs`. Rapport : `artifacts/e2e/fixture-password-verification-bulk.json`. N'exécuter que si l'opérateur connaît les anciens mots de passe ; ne jamais les deviner.

### Étape B — tester les anciens identifiants avec l'opérateur

Si les anciens identifiants sont récupérés depuis une source sûre :
- tester séparément Talent, Recruteur et Partenaire par véritable Auth `signInWithPassword` ;
- vérifier `app_metadata.e2e_fixture` et `app_metadata.e2e_role` ;
- fermer chaque session ;
- retourner seulement PASS, FAIL ou NON TESTABLE pour chaque rôle.

Aucun renouvellement de mot de passe pendant cette étape.

### Étape C — restauration ciblée

- Si les anciens identifiants fonctionnent, reconstruire les fixtures locales à partir des valeurs existantes de manière sécurisée ; ne pas appeler le provisionnement complet.
- Si les identifiants sont introuvables ou ne fonctionnent plus, présenter à l'utilisateur les preuves et demander son autorisation avant toute réinitialisation ciblée des trois comptes existants.
- Ne jamais supprimer/recréer les utilisateurs Auth ni leurs profils pour résoudre un simple problème de fichiers locaux.

### Étape D — runtime privé

Une fois les fixtures locales correctement restaurées, restaurer le runtime JOBLY-E2E par le chemin `--runtime-only`. La clé reste dans le terminal/fichier local protégé ; jamais dans le chat. Vérifier le rapport de restauration avant de lancer la recette complète.

### Étape E — nouvelle recette

1. Récupérer la dernière branche `e2e/recette`.
2. Vérifier que le HEAD local correspond au SHA attendu.
3. Exécuter la recette complète une seule fois, sur JOBLY-E2E uniquement.
4. Ouvrir et transmettre les rapports non sensibles : bilan global, résumé Markdown/JSON, smoke Auth, smoke API authentifié, smoke navigateur et logs des lots en BLOCKED/PARTIAL.
5. Examiner chaque résultat avant toute correction.
6. Ne déclarer PASS que sur la base de contrôles exécutés et de preuves de persistance/nettoyage.
7. Mettre à jour ce document avec la date, le SHA, les résultats et les actions restantes.

## 8. Format standard de compte rendu

À chaque exécution, consigner :
- date/heure de début et de fin, fuseau horaire ;
- environnement et référence du projet ;
- SHA exact du commit ;
- version Node.js/pnpm ;
- commande lancée ;
- statut global et statut de chaque lot ;
- nombre de tests exécutés, PASS, FAIL, BLOCKED et SKIPPED ;
- contrôles transverses, dont Auth réel, API authentifiées, navigateur, typecheck et build ;
- identifiant d'exécution GitHub Actions éventuel ;
- anomalies avec fichier/log et étapes de reproduction ;
- preuve de nettoyage des données synthétiques ;
- changements de données/identifiants explicitement autorisés ;
- décision de reprise et responsable de la prochaine action.

**Ne jamais inclure** mots de passe, clés privées, jetons, en-têtes Authorization, cookies, CV ou données personnelles réelles.

---

## 9. Point exact de reprise — HISTORIQUE OBSOLÈTE, NE PAS EXÉCUTER

> **Alerte critique :** la phrase d'autorisation de génération de nouveaux mots de passe ci-dessous est un enregistrement historique, pas une autorisation actuelle. La commande node e2e/reset-existing-fixture-passwords.mjs --confirm-reset-existing-e2e-passwords est interdite dans la reprise actuelle. Ne pas l'exécuter, ne pas demander la clé privée et ne pas recréer ni réinitialiser les fixtures. Le script local modifié reste à préserver.


**Décision utilisateur enregistrée :** l'utilisateur a autorisé la génération de nouveaux mots de passe pour les trois identités Auth fixtures EXISTANTES (Talent, Recruteur, Partenaire). Cette autorisation n'inclut ni la création/suppression des comptes, ni la modification des profils, ni l'accès à JOBLY-PROD.

**Prochaine action opérateur :** synchroniser `e2e/recette`, puis exécuter `node e2e/reset-existing-fixture-passwords.mjs --confirm-reset-existing-e2e-passwords`. Le script demande la confirmation textuelle `RESET 3 JOBLY-E2E PASSWORDS`, exige une clé privée JOBLY-E2E, vérifie en lecture seule les trois comptes Auth, leurs rôles, les liaisons `public.User` et les profils, puis ne met à jour que leurs mots de passe. Il enregistre les nouveaux identifiants dans `.e2e-fixtures.json`, ignoré par Git, et un état de reprise sécurisé dans `.e2e-fixture-password-reset.pending.json` en cas d'interruption. Il vérifie ensuite les nouvelles connexions et génère `artifacts/e2e/fixture-password-reset.json`. Ne jamais joindre ni afficher les fichiers locaux sensibles.

Après un rapport PASS, exécuter la recette complète `node scripts/e2e-local-recipe.mjs` et transmettre le rapport consolidé. Ne pas lancer avant que l'opérateur ait terminé le reset et confirmé son rapport.


**État attendu du prochain échange :**
- Talent : PASS / FAIL / NON TESTABLE.
- Recruteur : PASS / FAIL / NON TESTABLE.
- Partenaire : PASS / FAIL / NON TESTABLE.
- Sauvegarde de `.e2e-fixtures.json` : PRESENT / ABSENT.
- Source locale d'une clé JOBLY-E2E : PRESENT / ABSENT (ne jamais révéler la valeur).

**Décisions :** réinitialisation ciblée des seuls mots de passe des trois comptes fixtures existants autorisée par l'utilisateur ; création/suppression de compte, modification de profil, fusion PR et déploiement non autorisés.

Ce document est la référence de continuité jusqu'à sa prochaine mise à jour versionnée.


---

## 10. Recette bulk après récupération des fixtures — HISTORIQUE, NE PAS RELANCER — 7 novembre 2026

> Cette exécution et sa prochaine action sont des faits historiques. La consigne de relancer node scripts/e2e-local-recipe.mjs est annulée par le verrou V2.8 et le LOT-00 PARTIAL. Ne pas relancer le bulk.


Rapport opérateur : exécution locale du 7 novembre, 16:37:42.949Z–16:43:39.422Z, Node.js v26.13.0, JOBLY-E2E uniquement, 5 lots en parallèle, 2 fichiers par lot.

- Bilan : 307 tests automatisés ; 0 lot PASS, 10 PARTIAL, 0 BLOCKED, 1 FAIL ; statut global FAIL.
- Provisionnement : PASS, réutilisation des trois fixtures sans rotation ni recréation.
- Auth session : PASS, les 12 contrôles Talent/Recruteur/Partenaire passent.
- TypeScript, build Next.js et Playwright : PASS.
- API authentifiées : 29/30 PASS ; un seul FAIL sur `CROSS-ROLE-APPLICATION-LIFECYCLE-PREPARE` (HTTP 500).
- Cause constatée : `create_application_with_quota(uuid,integer,jsonb)` insère `jsonb_populate_record(null::public."Application", p_application)`. La colonne `officialListingConsent` est `NOT NULL DEFAULT false`, mais une propriété omise du JSON devient `NULL` lors de `jsonb_populate_record`, au lieu de déclencher le défaut SQL.
- Nettoyage : l'offre et la candidature synthétiques ont été vérifiées absentes après le scénario en échec ; aucun effet externe n'a été déclenché.

### Correctif poussé sur e2e/recette

- Commit `8da1f893b26b1e4213de1e63de78f5eda243e4fd` : le POST `/api/applications` fournit maintenant explicitement `officialListingConsent: false` au RPC. Le consentement à la publication officielle reste donc opt-in.
- Commit `b7b79a13aa2f5d34b27a3d1b977d1101315bfad5` : le modèle Prisma `Application` est aligné sur les colonnes `officialListingConsent` et `officialListingDisplayName`, avec l'index correspondant.
- Aucune migration ni écriture supplémentaire sur la base E2E n'est nécessaire pour ce correctif ; la colonne et son défaut sont déjà présents.
- Les lots PARTIAL gardent leur statut : ils signalent des parcours métier non entièrement démontrés, pas des PASS implicites.

### Prochaine exécution opérateur

1. Synchroniser `e2e/recette` avec `git pull --ff-only origin e2e/recette` (conserver les modifications locales du runner ; ne pas réinitialiser la branche).
2. Relancer une seule fois `node scripts/e2e-local-recipe.mjs`.
3. Fournir `artifacts/e2e/local-recipe/summary.md` et `artifacts/e2e/authenticated-role-smoke.json`.
4. Critère ciblé : le scénario croisé doit obtenir PASS à `CROSS-ROLE-APPLICATION-LIFECYCLE-PREPARE`, puis poursuivre la lecture Talent, réception Recruteur, transition INTERVIEW/OFFER, garde de décision et nettoyage.
5. Aucun merge vers `main`, aucun déploiement, aucun accès JOBLY-PROD.

## Correctif de sécurité Recruitment 360 — 7 novembre 2026

Audit ciblé du lot P0 Recruteur/Recruitment 360 : deux contrôles d'accès manquaient dans `app/api/recruitment360/applications/route.ts`.

- **Lecture GET :** lorsqu'un `recruitmentId` était transmis dans la query string, le code l'utilisait directement sans vérifier que l'acteur possédait un rôle sur ce recrutement. La lecture filtre désormais les rôles autorisés (`OWNER`, `HR`, `MANAGER`, `DELEGATE`, `JURY`), dérive les identifiants accessibles de ces adhésions et répond HTTP 403 si le recrutement demandé n'en fait pas partie.
- **Écriture document POST :** l'action `document` insérait un document pour un `applicationId` sans établir l'appartenance de l'acteur au recrutement de cette candidature. Elle vérifie désormais la candidature, son recrutement, puis un rôle d'écriture (`OWNER`, `HR`, `MANAGER`, `DELEGATE`) avant toute insertion. Candidature ou recrutement absent : HTTP 404 ; rôle absent : HTTP 403.
- **Non-régression :** `scripts/recruiter-role-regression.test.mjs` contient deux assertions supplémentaires garantissant l'ordre des contrôles avant la lecture ou l'insertion sensible.

Commits de la branche `e2e/recette` :
- `aaaeb37f` — filtrage des lectures par adhésion RecruitmentRole.
- `51f657bf` — autorisation des ajouts de documents par rôle recruteur.
- `8bee9816` et `64d745cf` — tests de non-régression associés.

**Validation locale :** non exécutée par l'agent. L'opérateur doit récupérer la branche puis lancer `node --experimental-strip-types --test scripts/recruiter-role-regression.test.mjs` et `pnpm typecheck`. Aucun test E2E n'est déclaré PASS sur la seule base de ces modifications de code. PR #266 reste ouverte et en brouillon ; pas de merge dans `main`, pas de déploiement.
 
## Correctif Paiements — référence client non vérifiée

Audit P0 Mobile Money : `POST /api/payments/[id]/verify` acceptait une référence de transaction saisie par le client et l'écrivait immédiatement dans `Payment.reportedTransactionId`, avant de vérifier qu'un reçu marchand de confiance existait pour cette référence.

Risque : une faute de frappe ou une référence inventée pouvait associer définitivement une mauvaise référence à la commande. Le moteur de rapprochement traite ensuite une référence déjà renseignée et différente comme un conflit dur ; la vraie confirmation opérateur risquait donc de ne jamais rapprocher cette commande.

Correction sur `e2e/recette` :
- la référence saisie par le client reste un **indice de recherche non fiable** ;
- elle sert uniquement à rechercher le reçu correspondant dans `PaymentSmsReceipt` ;
- aucun champ `Payment` n'est modifié tant que le reçu marchand indépendant n'a pas été trouvé et contrôlé ;
- la fonction SQL `finalize_payment_from_sms` reste responsable de l'association définitive à partir du reçu marchand validé ;
- aucun droit ni abonnement n'est activé par la seule référence saisie par le client.

Non-régression ajoutée dans `scripts/payment-sms-customer-share.test.mjs` : vérifie que le chemin SMS ne persiste pas `reportedTransactionId` à partir de la saisie non vérifiée.

Commits :
- `843e7077` — référence client non vérifiée en lecture seule.
- `1c9dba04` — test de non-régression.

Validation locale par l'opérateur requise ; aucune transaction réelle n'a été exécutée et aucun paiement n'a été modifié dans une base.

## Correctif Auth — déconnexion limitée à l'appareil courant

Audit Auth P0 : les appels JavaScript à `supabase.auth.signOut()` sans portée explicite utilisent la portée `global` par défaut. Cela invalide les sessions des autres appareils, alors que Jobly expose une gestion de plusieurs sessions indépendantes.

Correction sur `e2e/recette` :
- `lib/session-manager.ts` : la déconnexion du gestionnaire utilise désormais `signOut({ scope: "local" })`.
- `components/AccountSettings.tsx` : le bouton « Se déconnecter de Jobly » ferme uniquement la session courante.
- `lib/supabase.ts` : l'expiration locale du délai « Rester connecté » ferme uniquement cette session et ne déconnecte pas les autres appareils.
- `scripts/authentication-flow-regression.test.mjs` : test supplémentaire vérifiant la portée locale dans ces trois chemins et empêchant le retour involontaire au défaut global.

Le comportement de portée est confirmé par la documentation Supabase : JavaScript utilise `global` par défaut ; `local` termine seulement la session courante et maintient celles des autres appareils. <https://supabase.com/docs/guides/auth/signout>

Commits :
- `1e1842e5` — session manager.
- `7bb4c3b9` — déconnexion depuis les paramètres du compte.
- `c2b539c6` — expiration du rappel « Rester connecté ».
- `e249c0e5` — test de non-régression.

Validation locale par Node.js requise ; aucune session utilisateur réelle n'a été révoquée pendant la correction. PR #266 reste en brouillon ; aucun merge ou déploiement.

## 11. Recette E2E complète après récupération des fixtures — ÉTAT HISTORIQUE — 8 novembre 2026

> Ce rapport reste une preuve historique d'une exécution antérieure. Ses priorités de reprise ne remplacent pas le statut courant des §§15 à 17.


**SHA exact confirmé par l'opérateur :** `f33b0e3564189a8766fe1f357a8fe711368b9653`. Ce SHA correspond au HEAD de la branche `e2e/recette` et à celui de la PR #266 au moment du contrôle GitHub. Le rapport local qui indiquait `Commit: local` est donc désormais rattaché à ce commit par confirmation explicite de l'opérateur.

Rapport local transmis :
- Début : `2026-11-08T03:47:14.898Z`.
- Fin : `2026-11-08T03:55:13.600Z`.
- Node.js : v26.13.0.
- Environnement : JOBLY-E2E uniquement, projet `ofqqrryamslxoqkklraw`.
- Résultat : 339 tests automatisés ; 0 FAIL ; 0 BLOCKED ; 11 PARTIAL.
- Provisionnement des trois fixtures existantes : PASS via restauration du runtime privé.
- Session Auth : PASS.
- TypeScript : PASS.
- Build Next.js : PASS.
- Playwright / responsive : PASS.
- Parcours API authentifiés : PASS, 36/36 contrôles.

### Preuves runtime authentifiées

| Rôle / scénario | Résultat |
|---|---:|
| Talent | 12/12 PASS |
| Recruteur | 19/19 PASS |
| Partenaire | 5/5 PASS |
| Parcours croisé candidature Talent → Recruteur | PASS |
| Nettoyage API et vérification DB de l'offre/candidature synthétiques | PASS |

Le parcours croisé a prouvé : création d'une offre synthétique locale, configuration d'un canal e-mail fictif en domaine `.invalid`, préparation d'une candidature sans envoi externe, visibilité de la même candidature dans les deux espaces, transition `INTERVIEW`, décision `OFFER`, protection de la décision du Recruteur contre une modification Talent, puis suppression de l'offre et de la candidature et contrôle de leur absence en base.

Aucune action externe n'a été effectuée : `externalActions=false`.

### Lecture correcte du statut global

Les 11 lots restent `PARTIAL`, mais il n'y a aucune anomalie FAIL détectée. Les lots sont maintenus PARTIAL parce que leurs critères métier complets ne sont pas tous couverts, pas parce que les 339 tests auraient échoué.

Les deux exécutions bulk précédentes ne doivent pas être additionnées aux 339 tests de recette globale comme s'il s'agissait d'une seule campagne indépendante : elles couvrent en partie les mêmes fichiers et contrats. Le total de 302/302 représente les six groupes du runner de régression sur le même SHA ; les 339 correspondent à une autre exécution du runner E2E par lots, sur le même SHA.

### Priorités de reprise après cette preuve

- **P0 — Talent (LOT-02) :** ajouter des contrôles runtime authentifiés en lecture seule pour le flux d'offres, le détail d'une offre et la lecture du CV original lorsqu'il existe. Ajouter un scénario de sauvegarde CV uniquement avec un fichier synthétique temporaire et un mécanisme de restauration de l'état initial explicitement vérifié ; ne jamais écraser ni supprimer le CV préexistant d'une fixture.
- **P0 — Recruteur 360 (LOT-03) :** compléter l'exercice runtime de score, shortlist et accès aux documents sur des candidatures synthétiques appartenant à l'offre créée pendant le run ; nettoyage et preuve DB obligatoires.
- **P0 — Lot 00 :** compléter l'audit en lecture seule des privilèges directs, RLS, Storage, buckets et politiques sur JOBLY-E2E ; le simple préflight HTTP ne suffit pas.
- **P0 — Paiements (LOT-07) :** préparer un scénario sandbox/double de paiement avec idempotence et réconciliation, sans appel opérateur ni mouvement d'argent.
- **P1 — Mission Afrique (LOT-04) :** valider la collecte et la persistance sur un jeu de sources E2E strictement borné et des identifiants de run, sans lancer d'ingestion Production.
- **P1 — J'IA 360 (LOT-05) :** compléter une session réelle Talent, outils connectés simulés et chemin Internet Brain avec sources de test ; aucune donnée externe inventée.
- **P1 — Mobility (LOT-06) :** exécuter les états de demande, éligibilité, documents et allocation avec fixtures et montants synthétiques.
- **P2 — Events / Community (LOT-08) :** publier, inscrire et modérer uniquement des objets étiquetés E2E, puis les nettoyer.
- **P1 — Career Journey / Admin / BI (LOT-09) :** concevoir des tests runtime authentifiés par rôle ; conserver GET Career Journey en lecture seule et isoler les écritures temporaires.
- **P1 — PWA / Android (LOT-10) :** installer la PWA et vérifier la synchronisation sur un environnement/appareil de test ; le smoke responsive navigateur n'est pas une validation Android physique.

### Garde-fous inchangés

JOBLY-E2E seulement. Ne pas écrire dans JOBLY-PROD. Ne pas fusionner la PR #266, ne pas toucher à `main`, ne pas déployer. Ne pas modifier les profils ni les comptes fixtures existants hors autorisation spécifique. Aucun paiement réel, SMS, e-mail ou candidature externe.

## 12. Extension de la recette runtime authentifiée — ÉTAT PRÉPARATOIRE HISTORIQUE — 8 novembre 2026

> Les statuts « préparés mais pas encore exécutés » de cette section sont remplacés pour E2E-001 par le résultat du §15. Les ajouts de code y sont décrits comme contexte, pas comme preuve runtime.


Après confirmation du SHA de la recette précédente, de nouveaux contrôles ont été ajoutés sur `e2e/recette` pour couvrir des angles encore absents du rapport authentifié. Ces contrôles sont **préparés dans le code mais pas encore exécutés par l'opérateur**.

### Ajouts Talent (lecture sans mutation du profil)

- `TALENT-JOBS-FEED-READ` : lecture authentifiée du flux local, contrat de structure et compteurs.
- `TALENT-AFRICA-FEED-READ` : lecture authentifiée du flux Afrique, contrat de structure et compteurs.
- `TALENT-JOB-DETAIL-READ` : lecture du détail d'une offre active choisie uniquement depuis un flux retourné ; validation du contrat selon la source `discovery` ou `recruiter`.
- `TALENT-CV-ORIGINAL-READ` : accepte uniquement un lien signé privé de 60 secondes ou l'état explicite `CV_NOT_FOUND`. Le lien signé n'est jamais imprimé et le contenu du CV n'est pas téléchargé.
- `TALENT-CAREER-JOURNEY-READ` : lecture GET de Career Journey, des preuves et du portfolio ; aucun état n'est créé ou modifié.

Si aucun emploi actif n'est disponible dans les flux local/Afrique, le contrôle du détail d'offre reste `BLOCKED` et n'est pas transformé en PASS.

### Ajouts Recruteur 360 (refus négatifs, sans persistance)

- `RECRUITMENT360-DENY-UNOWNED-ID` : vérifie en runtime qu'un identifiant de recrutement non détenu retourne HTTP 403.
- `RECRUITMENT360-DOCUMENT-MISSING-APPLICATION` : envoie une requête négative vers l'action document avec une candidature synthétique inexistante et une URL `.invalid` ; le résultat attendu est HTTP 404 avant toute insertion.

Cette seconde requête est un POST négatif volontaire, mais elle ne vise aucune candidature existante et doit s'arrêter avant l'insertion. Aucun document ni aucune ligne métier ne doit être créé.

### Bulk de non-régression associé

Nouveau groupe du runner `scripts/e2e-bulk-runner.mjs` :
- ID : `authenticated-runtime-contracts`.
- Fichier : `scripts/e2e-authenticated-runtime-regression.test.mjs`.
- Couverture : 5 assertions de contrat sur la présence des nouveaux contrôles, leur sélection depuis des résultats authentifiés, les garanties de confidentialité et l'absence d'écritures dans les blocs de lecture.

### Commits préparés sur la branche

- `ca80ed4a` — enregistrement de la recette E2E 11 lots et des 36/36 contrôles authentifiés.
- `6a0691ba` — extension du smoke authentifié Talent et Recruteur 360.
- `29e2fa56` — ajout des assertions de non-régression runtime.
- `b0fae9dc` — ajout du groupe `authenticated-runtime-contracts` au runner bulk.
- `e459b63a` — alignement du contrôle détail selon le contrat des offres `discovery` et `recruiter`.

**Statut de validation :** en attente de l'exécution par l'opérateur. Aucun de ces nouveaux contrôles n'est déclaré PASS sur la base de la seule modification du code.

### Commandes de validation prévues

1. Exécuter le groupe bulk `authenticated-runtime-contracts`.
2. Après PASS de ce groupe, exécuter la recette globale locale pour lancer les nouvelles lectures authentifiées et les contrôles négatifs Recruteur 360.
3. Examiner `artifacts/e2e/authenticated-role-smoke.json` et `artifacts/e2e/local-recipe/summary.md`.

Garde-fous inchangés : JOBLY-E2E uniquement ; aucune écriture sur JOBLY-PROD ; aucune modification des profils ou comptes fixtures existants ; PR #266 conservée en brouillon ; aucun merge dans `main` et aucun déploiement.

---

## 13. Mise à jour V2.5 — correctif E2E-001 commité — 8 novembre 2026

### 13.1 Incident de transfert du script local

L'opérateur a tenté d'exécuter `apply-e2e001-readonly-fix.mjs` depuis `C:\Users\ASUS\Downloads`, puis depuis `C:\Users\ASUS\Jobly`. Les deux tentatives ont retourné `MODULE_NOT_FOUND`. Cela signifie que le script n'était pas présent à ces chemins et qu'il n'a pas été exécuté. Aucun fichier du dépôt local n'a été modifié par ces deux tentatives. **Ne plus demander à l'opérateur de relancer ce script absent.**

Pour éliminer cette dépendance au transfert de fichier, le correctif a été commité directement sur la branche GitHub `e2e/recette`.

### 13.2 Commits du correctif distant

| Commit | Fichier | Modification |
|---|---|---|
| `7bcc2a07a4ee3f9de44bb8e9c28eda5ec9043537` | `e2e/authenticated-role-smoke.mjs` | Suppression de la requête Talent `PUT /api/profile`, des contrôles de persistance associés et placement des marqueurs read-only autour de toute la séquence Talent. |
| `14dd444d1e7a9916abc778ab4503595181bbe829` | `scripts/e2e-authenticated-runtime-regression.test.mjs` | Ajout d'un sixième test qui examine tout le bloc Talent jusqu'au bloc Recruteur et interdit les méthodes HTTP mutatrices ainsi que les méthodes Supabase `insert/upsert/update/delete`. |
| `8385b60400bbaf9cedfcb4aa01073b733533f6c2` | `scripts/e2e-local-recipe.mjs` | Inclusion du test `e2e-authenticated-runtime-regression.test.mjs` dans le catalogue du LOT-01. |

### 13.3 Vérifications du contenu commité

Lecture des trois fichiers depuis GitHub au HEAD `8385b60400bbaf9cedfcb4aa01073b733533f6c2` :

- Smoke Talent : 505 lignes ; aucun appel `request(token, "/api/profile", "PUT")`, aucun identifiant `TALENT-PROFILE-WRITE` ou `TALENT-PROFILE-PERSIST`.
- Marqueur `E2E-READONLY-TALENT-START` placé avant `TALENT-PROFILE-READ` ; marqueur END présent à la fin du bloc Talent.
- Test statique : sixième test présent ; il inspecte la frontière entre `if (item.role === "TALENT")` et `if (item.role === "RECRUITER")`.
- Runner 11 lots : le fichier de régression est listé dans LOT-01.
- Aucun changement de branche `main`, aucune fusion PR, aucun déploiement et aucune requête vers Supabase n'ont été effectués dans cette séquence.

**Limite de preuve :** la relecture distante prouve que le code est commité et que les protections sont présentes. Elle ne prouve pas encore que le test Node.js passe sur le poste Windows. Le statut E2E-001 reste donc **CORRECTIF COMMITÉ — TEST STATIQUE LOCAL EN ATTENTE**, et non PASS.

### 13.4 Prochaine action locale — synchroniser sans écraser les modifications existantes

Le dernier diagnostic opérateur (12:09:34) indiquait que les trois fichiers cibles étaient propres, mais que `e2e/reset-existing-fixture-passwords.mjs` était modifié et que plusieurs rapports et fichiers inhabituels étaient non suivis. Ces changements doivent être préservés.

Commande opérateur dans CMD :

```bat
cd /d C:\Users\ASUS\Jobly
git pull --ff-only origin e2e/recette > feedback-e2e001-sync.txt 2>&1
(
  echo ==== HEAD APRES SYNCHRONISATION ====
  git rev-parse HEAD
  echo ==== ETAT A PRESERVER ====
  git status --short
) >> feedback-e2e001-sync.txt 2>&1
notepad feedback-e2e001-sync.txt
```

Attendu : HEAD `8385b60400bbaf9cedfcb4aa01073b733533f6c2` ou un SHA descendant explicitement vérifié sur la branche `e2e/recette`. Si le pull est refusé à cause d'un conflit ou d'un état local, **ne pas lancer reset, stash, clean ou suppression** ; transmettre le rapport et traiter le conflit en préservant tous les changements.

### 13.5 Test ciblé — seulement après synchronisation vérifiée

Lorsque le rapport de synchronisation confirme que les fichiers modifiés sont bien présents et que le HEAD est le bon :

```bat
cd /d C:\Users\ASUS\Jobly
node --test scripts/e2e-authenticated-runtime-regression.test.mjs > feedback-e2e001-static-test.txt 2>&1
notepad feedback-e2e001-static-test.txt
```

Résultat attendu : les six tests statiques PASS. Si un test échoue, ne pas lancer le smoke runtime Talent ni le runner bulk ; examiner le rapport, corriger puis retester.

### 13.6 Suite après le PASS statique

1. Refaire un audit LOT-00 strictement en lecture seule sur JOBLY-E2E : identité du projet, RLS, grants, Storage/buckets/policies, présence/mapping des fixtures ; ne pas muter de données.
2. Si LOT-00 et E2E-001 sont conformes, exécuter le smoke runtime authentifié en mode read-only, une seule fois et séquentiellement pour les fixtures partagées.
3. Examiner les réponses individuelles Talent : profil GET, applications GET, flux local/Afrique, détail offre, CV original et Career Journey. Un détail d'offre sans offre exploitable reste BLOCKED ; aucune conversion artificielle en PASS.
4. Seulement après preuves de stabilité et d'isolation, relancer la recette bulk avec `E2E_LOT_CONCURRENCY=2`. Garder les scénarios utilisant les mêmes fixtures et objets séquentiels.
5. Ne pas déclarer les lots PASS tant que tous les scénarios métier obligatoires ne sont pas testés et que les preuves d'accès, persistance et nettoyage ne sont pas jointes.

### 13.7 État de continuité après cette mise à jour — HISTORIQUE, REMPLACÉ PAR §§15–17

- E2E-001 : correctif commité sur `e2e/recette` ; test statique local en attente.
- Smoke Auth Talent : ne pas exécuter avant PASS statique et audit LOT-00.
- Campagne bulk locale : ne pas relancer avant fermeture des prérequis.
- JOBLY-E2E : aucune opération runtime effectuée par les commits documentaires/code.
- JOBLY-PROD : interdit, aucun accès.
- PR #266 : ouverte, brouillon, non fusionnée.
- `main` : inchangée.
- Fixtures partagées : aucune modification par cette correction.

---

## 14. Résultat de synchronisation locale et prochaine recette — 8 novembre 2026

### 14.1 Synchronisation opérateur confirmée

Sortie CMD communiquée par l'opérateur après `git pull --ff-only origin e2e/recette` :

- Ancien HEAD local : `546672d`.
- Fast-forward effectué depuis `546672d` vers `e92feb8`.
- Nouveau HEAD local confirmé : `e92feb8abc1a2491cab7dd81e834080b80982681`.
- Quatre fichiers mis à jour par Git : ce document de continuité, le smoke Talent, le test de régression authentifié et le runner 11 lots.
- Aucun conflit, aucun reset, aucun stash et aucune suppression ne figurent dans le résultat transmis.

### 14.2 État local à préserver après la synchronisation

Le rapport `git status --short` transmis indique :

- Modifié : `e2e/reset-existing-fixture-passwords.mjs`. Ce fichier est hors périmètre du correctif E2E-001 ; ne pas l'exécuter, le restaurer, le remplacer, le stager ou le supprimer.
- Non suivis : fichiers de diagnostics, rapports bulk, rapports de recette, `tsconfig.tsbuildinfo`, `typecheck-latest.txt` et entrées inhabituelles affichées par Git (`({`, `)`, `0`, `account.role)`, `item.role`, `item.status`, `role)`, `undefined)`, `{`). Tous restent à préserver.
- Les trois fichiers cibles sont arrivés par fast-forward. Le rapport fourni ne présente aucune erreur de merge.

### 14.3 Action initialement prévue — test statique E2E-001 (exécutée, résultat enregistré au §15)

La commande prévue a été exécutée sur le poste Windows synchronisé. Le résultat intégral a ensuite été transmis : 6 tests PASS, 0 FAIL. La portée exacte et les noms des six contrôles sont consignés au §15. Cette exécution statique ne lance pas le smoke authentifié, ne contacte pas Supabase et ne change aucune fixture.

La condition de passage statique est donc satisfaite. Le contrôle LOT-00 en lecture seule (identité du projet, RLS, grants, Storage/buckets/policies, présence et liaison des fixtures) est maintenant le prochain prérequis. Le smoke runtime Talent et le bulk restent interdits avant fermeture de LOT-00.

### 14.4 Point de reprise après synchronisation (état avant le test statique)

- Branche locale : e2e/recette.
- HEAD local confirmé par le rapport opérateur : e92feb8abc1a2491cab7dd81e834080b80982681.
- À cet instant historique, E2E-001 attendait encore sa validation statique ; ce statut est remplacé par le résultat du §15.
- Aucun accès ou appel JOBLY-E2E n'avait été effectué pendant la synchronisation ; aucun accès JOBLY-PROD.
- Aucune fixture modifiée ; aucun commit local, push, merge ou déploiement rapporté.


---

## 15. PASS statique local E2E-001 — preuve opérateur — 8 novembre 2026

### 15.1 Résultat reçu

L'opérateur a exécuté le test ciblé scripts/e2e-authenticated-runtime-regression.test.mjs après synchronisation de la branche. Sortie transmise :

| Contrôle | Résultat |
|---|---:|
| Talent runtime smoke couvre les flux local et Afrique sans mutation | PASS |
| Talent offer detail is selected only from an authenticated feed result | PASS |
| CV original read accepts only a valid signed-link response or explicit no-CV state | PASS |
| Career Journey runtime smoke uses GET only | PASS |
| Recruitment360 runtime smoke verifies non-owned scope and missing document target without writes | PASS |
| Talent role block is read-only from entry through the Recruiter boundary | PASS |
| **Total** | **6 PASS / 0 FAIL** |

Synthèse Node.js : tests 6, suites 0, pass 6, fail 0, cancelled 0, skipped 0, todo 0, durée 254.0035 ms.

**Gate statique E2E-001 franchi : PASS.**

### 15.2 Portée exacte et limites

Ce résultat valide les six tests automatisés du fichier de régression ciblé. Il confirme notamment que le bloc Talent est protégé en lecture seule sur toute sa portée, depuis son entrée jusqu'à la frontière du bloc Recruteur, et que les contrats statiques des smoke Talent, CV, Career Journey et Recruitment360 sont présents.

Ce résultat n'est PAS :
- un run du smoke runtime authentifié contre l'API JOBLY-E2E ;
- une preuve de session Auth ou de disponibilité des fixtures ;
- une preuve de lecture effective des flux/données en base ;
- une validation complète du LOT-01, des 11 lots ou de la recette globale.

Aucun PASS runtime, aucun PASS LOT-00 et aucun PASS global n'est déduit de cette exécution. Aucun appel Supabase, aucune modification de fixture et aucune mutation métier ne sont rapportés pour ce test ciblé.

### 15.3 Audit LOT-00 initial — HISTORIQUE, ordre OpenAPI remplacé par §76

**Note V2.74 : les consignes de séquencement qui suivent décrivent l'état historique de l'audit initial. L'OpenAPI n'est plus un préalable runtime ; il est déplacé en LOT-11 final (§76).**

L'audit initial en lecture seule sur JOBLY-E2E est désormais exécuté et consigné au §16. Le statut reste PARTIAL : l'exposition du schéma PostgreSQL net sur la Data API n'est pas encore confirmée, et les grants clients larges doivent être traités comme un point de moindre privilège. Aucune modification de base n'est autorisée pour fermer ces points sans revue dédiée.

La dernière vérification requise est le contrôle GET du catalogue OpenAPI PostgREST avec les profils public puis net via la clé legacy `service_role` du projet E2E, saisie masquée et prévalidée par le script du §23.3. Le rapport doit confirmer si net fait partie des schémas exposés, sans appeler aucune fonction net.http_*.

1. **Identité de l'environnement** : URL/projet ciblé et confirmation que le ref est exactement ofqqrryamslxoqkklraw.
2. **RLS** : état RLS des tables concernées par les parcours de recette et présence/absence des politiques applicables.
3. **Grants et privilèges** : privilèges directs des rôles concernés, sans accorder ni révoquer de droits.
4. **Storage** : inventaire des buckets, visibilité, policies et accès attendus ; ne pas télécharger ni remplacer un CV ou document fixture.
5. **Fixtures** : présence des trois identités déjà connues et correspondance identité/role, uniquement en lecture ; ne jamais lire ni modifier de mot de passe, session, jeton ou secret.
6. **Traçabilité** : conserver les requêtes de diagnostic, le nombre de lignes et les résultats PASS/PARTIAL/BLOCKED ; masquer toute donnée personnelle ou valeur secrète dans le rapport.

**Interdictions maintenues :** aucun INSERT/UPDATE/DELETE/UPSERT, aucune modification de schéma/policy/grant/bucket, aucun changement de compte ou profil fixture, aucun provisionnement ou reset. Ne pas exécuter e2e/reset-existing-fixture-passwords.mjs. Ne pas lancer le smoke runtime, le parcours croisé ou le bulk avant fermeture et analyse du LOT-00.

Après réception du rapport LOT-00, réconcilier les résultats avec le code et les prérequis avant de décider du premier smoke runtime read-only.

### 15.4 État de continuité au moment de l'audit — HISTORIQUE, remplacé par §76

- E2E-001 : **PASS statique local — 6/6, 0 échec**.
- LOT-00 : **PARTIAL — audit SQL en lecture seule réalisé ; exposition Data API du schéma net à confirmer**.
- Smoke runtime Talent/Recruteur : **en attente du LOT-00**.
- Recette bulk 11 lots : **suspendue**.
- JOBLY-E2E : aucune mutation associée au test statique.
- JOBLY-PROD : interdit, aucun accès.
- Fixtures partagées : aucune modification.
- Branche : e2e/recette.
- PR #266 : ouverte, brouillon, non fusionnée.
- main : inchangée ; aucun merge ni déploiement.

---

## 16. LOT-00 — audit SQL en lecture seule — 8 novembre 2026

### 16.1 Identification du projet et méthode

Audit réalisé via les outils de lecture de projet et de requête SQL, avec le project_id exact ofqqrryamslxoqkklraw.

- Projet : JOBLY-E2E.
- URL : https://ofqqrryamslxoqkklraw.supabase.co
- État : ACTIVE_HEALTHY.
- Région : eu-west-1.
- PostgreSQL : 17.11.0.018.
- Toutes les requêtes SQL de cette section ont été exécutées sur JOBLY-E2E et sont des SELECT / lectures de catalogues.
- Aucune migration, aucun DDL, aucun DML, aucun changement Auth, aucun changement Storage et aucune lecture de secret ou de contenu de fichier.
- Aucune requête SQL n'a été exécutée contre JOBLY-PROD.

### 16.2 Tables publiques, RLS, politiques et grants

Résultat du contrôle de catalogue :

| Contrôle | Résultat |
|---|---:|
| Tables publiques | 180 |
| Tables avec RLS | 180/180 |
| Tables sans RLS | 0 |
| Tables avec FORCE RLS | 0 |
| Politiques RLS publiques | 215 |
| Tables avec RLS mais sans policy | 26 |
| Tables sans policy ayant un privilège direct anon/authenticated | 0 |

Les 26 tables sans policy sont donc fermées aux rôles clients par absence de privilège direct, tout en restant accessibles au rôle serveur lorsque nécessaire. Le signal Advisor correspondant est INFO, pas une preuve d'exposition de lignes.

Privilèges effectifs relevés au niveau table :

- anon : privilèges sur 23 tables ; les quatre opérations SELECT/INSERT/UPDATE/DELETE sont accordées à ces tables au niveau SQL.
- authenticated : privilèges sur 55 tables ; SELECT sur 55, INSERT sur 24, UPDATE sur 23 et DELETE sur 23.
- service_role : SELECT sur les 180 tables publiques.

Les grants clients sont plus larges que le strict minimum sur plusieurs tables. Les politiques RLS relevées sur les tables vérifiées ajoutent des contrôles par propriétaire (auth.uid() ou lien via User.authUserId) ; les lectures publiques identifiées sont limitées aux données actives/publiées pour Institution, BonPlan et ses commentaires. Les politiques core inspectées comprennent User, Profile, RecruiterProfile, Partner, Application, CandidateFile, CVShare, Career Journey, JiaWatch et RecruitmentApplicationDocument.

**Conclusion grants/RLS :** aucune table sans policy n'est directement accordée aux rôles clients et aucune table publique n'est dépourvue de RLS. Les grants étendus sur des tables protégées par RLS restent toutefois un point de moindre privilège à documenter et réduire dans un chantier dédié ; aucune réduction n'est appliquée pendant la recette.

### 16.3 Storage

- 7 buckets détectés ; 0 objet dans Storage.
- Buckets publics : jobly-events et profile-photos.
- Buckets privés : jobly-payment-proofs, mobility-documents, mobility-provider-documents, recruitment-listings et talent-cvs.
- RLS activé sur storage.buckets et storage.objects.
- 4 policies sur storage.objects, toutes limitées au bucket talent-cvs, au rôle authenticated, avec chemin de dossier fondé sur auth.uid() pour SELECT/INSERT/UPDATE/DELETE.
- Les rôles anon et authenticated ont des privilèges SQL SELECT/INSERT/UPDATE/DELETE sur storage.objects, mais RLS s'applique. Aucune policy anon n'a été trouvée ; aucune policy utilisateur n'a été trouvée pour les buckets privés hors talent-cvs. Le comportement attendu est donc le refus par défaut pour ces buckets privés.
- Les deux buckets publics n'ont actuellement aucun objet ; l'accès public à leurs futurs objets découlera de leur configuration publique.

**Point de contrôle restant :** confirmer que le statut public de jobly-events et profile-photos correspond à l'intention produit et conserver les documents privés hors accès client direct sans policy spécifique.

### 16.4 Fixtures et correspondances Auth

Comptages agrégés uniquement ; aucun e-mail, mot de passe, jeton ni identifiant personnel n'a été extrait dans le rapport.

| Contrôle | Résultat |
|---|---:|
| Utilisateurs Auth | 4 |
| Lignes public.User | 4 |
| Liens User.authUserId → auth.users | 4/4 |
| Identités marquées e2e_fixture | 3 |
| Fixtures TALENT / RECRUITER / PARTNER | 1 / 1 / 1 |
| Mismatch entre e2e_role et public.User.role | 0 |
| Comptes Auth confirmés | 4 |
| Comptes non bannis | 4 |
| Profil Talent lié | 1 |
| Profil Recruteur lié | 1 |
| Profil Partenaire lié | 1 |

Répartition public.User : ADMIN 1, TALENT 1, RECRUITER 1, PARTNER 1. Le lien Partner est établi via public.User.id ; le lien RecruiterProfile via public.User.authUserId. Aucune écriture ou modification de fixture.

### 16.5 Advisor et fonctions privilégiées

Advisor sécurité JOBLY-E2E :

- 26 avis INFO rls_enabled_no_policy, cohérents avec le catalogue : aucun privilège direct client sur ces 26 tables.
- 1 avertissement extension_in_public : extension pg_net version 0.20.4 installée avec son namespace d'extension public.
- 1 avertissement anon_security_definer_function_executable et 1 avertissement authenticated : public.get_public_home_stats() est un SECURITY DEFINER exécutable par anon et authenticated.
- 1 avertissement auth_leaked_password_protection : protection des mots de passe compromis désactivée (limitation de forfait déjà identifiée).

La fonction public.get_public_home_stats() a été lue sans exécution. Elle ne prend aucun argument et retourne uniquement offersCount, talentsCount et updatedAt. Son search_path est vide et ses relations sont qualifiées en public. L'exposition publique de ces seuls agrégats paraît cohérente avec son nom et son usage de statistiques d'accueil ; ce n'est pas une exposition de données personnelles détectée dans son corps actuel.

Pour pg_net, les fonctions HTTP sont situées dans le schéma PostgreSQL net. Les contrôles SQL indiquent :
- USAGE du schéma net accordé à anon et authenticated ;
- CREATE non accordé à ces rôles ;
- EXECUTE accordé à anon et authenticated sur les fonctions net.http_get, net.http_post, net.http_delete et fonctions auxiliaires.

La présence de ces privilèges ne suffit pas à prouver que le schéma net est exposé par PostgREST. Le paramètre PostgREST exposé n'a pas pu être lu depuis la session SQL. **Ne jamais appeler net.http_* pendant cette vérification.**

### 16.6 Statut LOT-00

**LOT-00 = PARTIAL, non clos.** Le contrôle OpenAPI est retiré de son périmètre et reporté au LOT-11 final.

Contrôles satisfaits :
- identité projet JOBLY-E2E et disponibilité confirmées ;
- RLS activé sur 180/180 tables publiques ;
- absence de privilèges clients directs sur les 26 tables RLS sans policy ;
- présence et correspondance des 3 fixtures métier E2E confirmées ;
- inventaire des buckets et policies Storage établi.

Points à fermer avant le PASS LOT-00 (hors OpenAPI) :
1. Valider que les deux buckets publics jobly-events et profile-photos sont intentionnels.
2. Documenter le plan de moindre privilège des grants table/storage, sans modifier les droits dans le cadre de cette recette.

Le GET OpenAPI `public`/ `net` n'est plus un critère de sortie de LOT-00. Il est réservé au LOT-11 final (§76).

### 16.7 Historique du contrôle OpenAPI GET — méthode initiale invalidée le 8 novembre 2026 — reporté au LOT-11

**Note de séquencement V2.74 : cette section conserve les tentatives historiques ; elle ne constitue plus une étape opératoire de LOT-00 et ne bloque plus les lots précédents. Le contrôle est différé au LOT-11 final.**

La commande initiale utilisait la clé publishable `sb_publishable_...` à la racine exacte `/rest/v1/`. Le rapport opérateur `feedback-lot00-net-schema-exposure.txt` a retourné :

- `public` : HTTP 401, `apiSchemaAccepted=false`, `openapi=false`, message `Secret API key required` ;
- `net` : HTTP 401, `apiSchemaAccepted=false`, `openapi=false`, même message ;
- synthèse : `GATE=BLOCKED_REVIEW_REQUIRED`.

**Interprétation :** les deux requêtes ont été rejetées au contrôle de clé avant la négociation des profils PostgREST. Ce résultat ne prouve ni que `net` est exposé, ni qu'il est masqué. La procédure utilisant la clé publishable à cette racine est invalidée et ne doit pas être répétée.

Pour la racine OpenAPI, utiliser la procédure corrigée au §22.3 : une clé secrète de JOBLY-E2E (`sb_secret_...`) ou l'ancienne clé `service_role`, saisie localement et masquée. La requête reste strictement GET, sur l'unique endpoint `/rest/v1/`, pour lire le catalogue de schémas ; aucun objet métier, table, fonction RPC ou endpoint `net.http_*` n'est appelé. La clé secrète contourne RLS : son usage est donc limité à ces deux lectures de métadonnées et elle ne doit jamais être copiée dans le rapport, les logs, le chat ou Git.

Références Supabase : la racine OpenAPI peut exiger une clé d'administration ; les clés `sb_secret_...` sont privilégiées et doivent rester côté opérateur. Voir https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup et https://supabase.com/docs/guides/getting-started/api-keys.

Après le test corrigé, analyser séparément le résultat `public` et le résultat `net`. Tout 401/403, erreur réseau, réponse ambiguë ou schéma `net` accepté maintient le blocage. Aucun grant, rôle, schéma ou policy ne doit être modifié à partir d'un simple échec d'authentification.

### 16.8 État courant après reclassement

- E2E-001 : **PASS statique local — 6/6**.
- LOT-00 : **PARTIAL — éléments non-OpenAPI encore à fermer : décision sur les buckets publics, matrice grants/policies et prérequis environnement/fixtures applicables**.
- LOT-01 à LOT-10 : à conduire selon leurs dépendances métier et les prérequis Auth/fixtures ; l'absence de résultat OpenAPI ne les bloque plus.
- LOT-11 OpenAPI final : **À FAIRE EN DERNIER**, après LOT-10 et réconciliation.
- Recettes runtime/bulk : restent conditionnées à la disponibilité réelle des fixtures, de la session Auth et à l'isolation JOBLY-E2E ; le déplacement d'OpenAPI ne lève pas ces conditions.
- JOBLY-PROD : aucune requête SQL, aucune écriture.
- Fixtures partagées : inchangées.
- PR #266 : ouverte, brouillon, non fusionnée.
- main : inchangée ; aucun merge ni déploiement.

## 17. Audit de continuité et de reprise — V2.8 — 8 novembre 2026

### 17.1 Périmètre et références vérifiées

Audit effectué sur le contenu GitHub de docs/e2e/CONTINUITE-RECETTE-E2E.md, branche e2e/recette.

- Blob du document audité avant cet audit : 12bdb974d3e442dc6c5908ad49025cb8a7216094.
- HEAD de la PR #266 au contrôle : 06152a7347cdb3399d36352462cab73e81ae2061.
- PR #266 : ouverte, brouillon, non fusionnée.
- Comparaison du HEAD local communiqué e92feb8abc1a2491cab7dd81e834080b80982681 avec le HEAD distant : 3 commits d'avance côté distant, tous limités à docs/e2e/CONTINUITE-RECETTE-E2E.md, aucune différence de code dans cette comparaison.
- Le résultat opérateur du test statique 6/6 reste donc rattaché au même code que celui comparé sur la branche distante. En revanche, le document local est en retard et doit être synchronisé avant toute prochaine modification documentaire locale.
- Le résultat E2E-001 est PASS STATIQUE LOCAL ; il ne prouve ni authentification runtime, ni lecture réelle d'API, ni recette globale.

### 17.2 Défauts documentaires détectés et traitement

| Gravité | Défaut | Risque | Traitement V2.8 |
|---|---|---|---|
| CRITIQUE | Le §9 conserve une autorisation historique de réinitialisation des trois mots de passe et une commande exécutable. | Un nouvel opérateur pourrait croire que cette autorisation est encore valable et modifier des fixtures partagées. | Le §9 est explicitement marqué historique et interdit d'exécution ; le verrou est répété en tête du document. |
| ÉLEVÉE | Les §§7 et 10 contiennent des instructions d'Auth, de restauration ou de relance complète/bulk qui précèdent les garde-fous actuels. | Connexion Auth, provisionnement ou runner pouvant toucher les fixtures avant la fermeture de LOT-00. | Ces séquences sont marquées historiques ; les scripts cités ne sont pas autorisés par la reprise V2.8. |
| ÉLEVÉE | Le §13.7 indique encore que le test statique E2E-001 est en attente. | Deux statuts incompatibles dans le même document. | Le statut est explicitement subordonné aux §§15 à 17 ; le résultat courant est celui du §15 : 6/6 PASS. |
| ÉLEVÉE | Le critère de sortie LOT-00 mélange exposition net, statut des buckets publics et durcissement des grants sans distinguer preuve minimale et remédiation. | Risque de déclarer LOT-00 vert sur un contrôle partiel ou, inversement, d'appliquer des changements de privilèges hors périmètre. | Le LOT-00 reste PARTIAL. Il faut une preuve GET net, une décision sur les buckets publics et une matrice documentée des grants/policies pertinents. Aucune modification SQL n'est permise dans cette recette. |
| MOYENNE | Le constat RLS 180/180 est présenté à côté de grants clients larges ; les policies n'ont été décrites que pour les tables inspectées, pas démontrées exhaustivement pour les 180 tables. | Confondre activation RLS et validation de la qualité de toutes les policies. | Ne pas conclure à une sécurité complète. La revue doit couvrir les tables/routines effectivement accessibles aux rôles clients dans le périmètre E2E et rapprocher privilèges, policies et opérations métier. |
| MOYENNE | Les deux buckets publics sont identifiés mais leur intention produit n'est pas attestée. | Une visibilité publique par configuration pourrait être involontaire, même si les buckets sont actuellement vides. | Maintenir le point ouvert ; demander une décision métier explicite avant de les traiter comme conformes. |
| MOYENNE | Le contrôle OpenAPI §16.7 ne valide que l'exposition Data API du schéma demandé ; il ne valide ni toutes les policies RLS, ni les grants de chaque table, ni les droits Storage. | Surinterpréter un 406 PGRST106 comme une certification complète de sécurité. | Le résultat net ne ferme que ce point précis ; il doit être combiné avec les deux autres contrôles LOT-00. |
| MOYENNE | Le dernier HEAD local connu est e92feb8, alors que la PR est au HEAD 06152a7. | Les fichiers documentaires locaux ne reflètent pas les trois commits distants. | La comparaison confirme que ces trois commits ne changent que le document. Pas de pull nécessaire pour exécuter le GET autonome du §16.7 ; synchroniser la branche avant toute nouvelle édition/commande dépendant de fichiers versionnés. |
| FAIBLE | Plusieurs sous-sections historiques ont des statuts « en attente » conservés après que les tests ont été exécutés ; quelques parenthèses/points parasites rendaient certains noms de fichiers ou SHA moins lisibles. | Ambiguïté lors de la reprise et mauvaise lecture des statuts. | Ajout de marqueurs historiques et correction des coquilles ciblées ; conserver les anciennes preuves sans les réinterpréter. |

### 17.3 Validation historique de la méthode OpenAPI §16.7 — à exécuter au LOT-11 final uniquement

**Note de séquencement V2.74 : cette analyse documente la méthode technique, mais ne donne aucune instruction d'exécution immédiate. Le GET est différé au LOT-11 final (§76), après LOT-10.**

La méthode est cohérente avec PostgREST : pour GET/HEAD, Accept-Profile sélectionne le schéma ; un schéma absent de la liste exposée est refusé avec PGRST106. PostgREST indique également que la sélection de schéma s'applique à OpenAPI. Références :
- https://docs.postgrest.org/en/latest/references/api/schemas.html
- https://supabase.com/docs/guides/api/using-custom-schemas

La commande du §16.7 reste un GET seulement et peut être exécutée sans synchroniser le dépôt, car elle ne dépend d'aucun fichier du code local. Interprétation à conserver :
- public accepté (réponse HTTP réussie) et net refusé avec PGRST106 : preuve que net n'est pas dans les schémas exposés par cette Data API à cet instant ; ce résultat ne prouve rien sur les autres contrôles.
- net accepté : LOT-00 reste BLOCKED sur l'exposition du schéma ; aucune correction automatique.
- 401/403, erreur réseau, réponse non JSON, ou résultat différent : BLOCKED/ambigu ; ne rien modifier et faire analyser le rapport.

### 17.4 Critères de fermeture LOT-00 — hors OpenAPI

LOT-00 ne pourra être déclaré PASS que lorsque les preuves suivantes seront regroupées et relues :

1. **Identité** : endpoint et project ref correspondent exactement à JOBLY-E2E ofqqrryamslxoqkklraw.
2. **Storage** : décision explicite que jobly-events et profile-photos doivent être publics ; les buckets privés et les accès attendus sont documentés.
3. **Moindre privilège** : matrice limitée aux tables/routines/objets Storage utilisés par la recette, avec rôle, privilèges directs, RLS, policies applicables et opérations nécessaires. Les écarts doivent être classés et faire l'objet d'un plan approuvé. Aucun grant, policy, bucket ou schéma ne sera modifié dans le cadre de la recette sans autorisation séparée.
4. **Fixtures et runtime** : correspondance des trois fixtures déjà établie en lecture seule ; disponibilité du moyen local d'authentification/runtime JOBLY-E2E à confirmer séparément, sans réinitialiser les mots de passe et sans exposer le secret.

L'OpenAPI public/net est exclu de ces critères et sera traité au LOT-11 final (§76). L'activation RLS sur 180/180 tables est un bon indicateur de couverture technique, mais ne remplace pas les points 2 à 4 et ne suffit pas à certifier les policies de toutes les tables.

### 17.5 Séquence de reprise autorisée — HISTORIQUE, remplacée par §76

**Cette procédure décrivait l'ancien ordre. Elle est supplantée par la décision V2.74 §76 : ne pas exécuter OpenAPI avant la fin des lots précédents.**

**Action autorisée à l'époque :** si la clé affichée dans la ligne `service_role` sous **Legacy API Keys** commence bien par `eyJ`, exécuter exclusivement le contrôle GET OpenAPI du §23.3, puis transmettre uniquement le rapport non sensible `feedback-lot00-net-schema-exposure-v3.txt`. Ne jamais utiliser la clé `anon`.

**Ne pas lancer avant analyse de ce résultat et fermeture LOT-00 :**
- tout smoke Auth/runtime Talent ou Recruteur ;
- le parcours croisé Talent → Recruteur ;
- le runner scripts/e2e-local-recipe.mjs ou tout bulk ;
- les scripts de vérification, provisionnement, restauration ou reset des fixtures ;
- toute commande SQL DDL/DML ou modification de grants/policies/buckets ;
- tout accès JOBLY-PROD, merge PR #266, modification de main ou déploiement.

Après réception du GET corrigé, analyser les codes HTTP et le code PostgREST, puis choisir uniquement le prochain contrôle read-only nécessaire. Ne pas enchaîner automatiquement les opérations.

**Mise à jour V2.13 :** une tentative identique depuis l'environnement Node.js isolé de l'agent a échoué avant réponse HTTP (`fetch failed`, Node.js v22.16.0). Elle ne remplace pas le contrôle opérateur ; voir §21. Aucun résultat HTTP n'a été obtenu et LOT-00 reste PARTIAL.

### 17.6 État de reprise à la date de l'audit — HISTORIQUE, remplacé par §76

- E2E-001 : **PASS STATIQUE LOCAL — 6/6, 0 échec**.
- LOT-00 : **PARTIAL à cette date** ; les exigences OpenAPI mentionnées dans ce bilan sont historiques et désormais reportées au LOT-11 par §76. Les contrôles non-OpenAPI (Storage et matrice grants/policies) restent dans LOT-00.
- Smoke runtime authentifié : **NON AUTORISÉ à cette date** ; les conditions opératoires actuelles sont celles de §76 et des prérequis non-OpenAPI applicables.
- Runner bulk / recette 11 lots : **SUSPENDU**.
- Fixtures partagées / mots de passe / profils : **aucune modification autorisée par ce document**.
- JOBLY-E2E : seul environnement autorisé, mais aucun nouvel appel runtime avant fermeture du gate.
- JOBLY-PROD : interdit.
- Branche : e2e/recette.
- PR #266 : **ouverte, brouillon, non fusionnée**.
- main : aucun merge ; aucun déploiement.


---

## 18. Retransmission du résultat E2E-001 — 8 novembre 2026

L'opérateur a retransmis le même extrait de sortie Node.js que celui déjà enregistré au §15.1. La comparaison des six intitulés, des compteurs et de la durée est identique :

- 6 tests ; 6 PASS ; 0 FAIL.
- 0 cancelled, 0 skipped, 0 todo.
- Durée affichée : 254.0035 ms.
- Les six tests couvrent les contrats statiques Talent local/Afrique, sélection de détail depuis un flux authentifié, lecture CV, Career Journey GET-only, refus négatifs Recruitment360 sans écriture, et lecture seule du bloc Talent.

**Traitement :** retransmission reconnue comme doublon de la preuve du §15.1 ; aucune nouvelle exécution distincte n'est établie et aucun nouveau statut n'est attribué. E2E-001 reste PASS STATIQUE LOCAL — 6/6.

**Important : ce contenu ne correspond pas au rapport LOT-00 demandé.** Il ne contient ni code HTTP pour le GET OpenAPI du profil `public`, ni code HTTP/code PostgREST pour le profil `net`. Il ne permet donc pas de fermer, de faire avancer ou de requalifier LOT-00.

### 18.1 Prochaine preuve attendue

Le seul contrôle restant autorisé à ce stade demeure la commande GET uniquement décrite au §16.7. Le fichier attendu est `feedback-lot00-net-schema-exposure.txt`, qui doit contenir les deux résultats (schéma `public` et schéma `net`), avec statut HTTP et code/message PostgREST si disponible.

Jusqu'à réception et analyse de ce rapport :
- LOT-00 : **PARTIAL** ;
- smoke runtime Auth : **NON AUTORISÉ** ;
- parcours croisé : **SUSPENDU** ;
- runner bulk / recette 11 lots : **SUSPENDU** ;
- fixtures partagées : inchangées et à préserver ;
- JOBLY-PROD : interdit.


---

## 19. Recettes sans comptes authentifiés — résultats CI — 8 novembre 2026

### 19.1 Périmètre et rattachement de code

Contrôle des exécutions GitHub Actions associées à la PR #266, branche `e2e/recette`, HEAD `5aff245361c053337328bd98e7ca8727400e52e7`.

Comparaison entre le commit code E2E-001 `8385b60400bbaf9cedfcb4aa01073b733533f6c2` et ce HEAD :
- 6 commits d'avance ;
- un seul fichier modifié : `docs/e2e/CONTINUITE-RECETTE-E2E.md` ;
- aucun changement de code applicatif ou de tests entre ces deux références.

Les exécutions ci-dessous valident donc le code présent au SHA `8385b604...`, avec uniquement des ajouts documentaires ensuite. PR #266 reste ouverte, en brouillon et non fusionnée.

### 19.2 Recettes sans authentification confirmées PASS

| Domaine | Workflow / run | Résultat | Portée |
|---|---|---|---|
| CI générale | Jobly CI — run `42478108383` | PASS | Tests de régression, typecheck et build terminés avec succès. |
| Admin 360 / BI | Jobly CI — job isolé PostgreSQL | PASS | Création d'un PostgreSQL temporaire, migrations Admin 360 et BI, vérification RLS, grants, singleton racine et backfill BI. Aucun compte JOBLY-E2E. |
| Conversations J'IA | Jobly CI — job isolé PostgreSQL | PASS | Migration de conversation canonique, privilèges, RLS, contraintes et idempotence sur PostgreSQL temporaire. |
| Security Core | run `42478108345` | PASS | Migrations Security Core et verrouillage pg_net appliqués et vérifiés sur PostgreSQL local éphémère ; contrôle du rate limiter atomique et des grants. Aucun accès au projet Supabase JOBLY-E2E. |
| Registre Afrique | run `42478108363` | PASS | 51 tests Deno passés, 0 échec ; audit du registre et des états d'activation. |
| Fraîcheur / contact Afrique | run `42478108412` | PASS | 16 tests passés, 0 échec ; type-check des fonctions de récolte et test des bornes de fraîcheur sur deux mois. Le job `shadow-crawl` a été SKIPPED parce que l'événement était `pull_request` : aucune collecte réelle ni ingestion n'a été exécutée par ce workflow. |
| Confidentialité Android | run `42478108415` — job `privacy-tests` | PASS | 16 tests Node.js passés, 0 échec. |
| Build Android | run `42478108415` — job `android-debug-build` | PASS | Compilation de l'APK debug et dépôt de l'artefact réussis ; ce n'est pas encore le résultat du smoke sur émulateur. |
| Pipeline des offres / normalisation / J'IA | run `42478108380` | PASS | Tests de batch d'identifiants Supabase, normalisation Gemini, parcours source-only et handoff J'IA, typecheck, build et smoke J'IA Watch réussis. Le smoke J'IA Watch affiche 4/4 chemins de décision et atténuation des contradictions. |
| Auth UI — régression de code | Jobly CI — étape du run `42478108383` | PASS | Tests de régression du code d'authentification et du choix de compte Google ; ce sont des tests automatisés de code/UI, pas des connexions réelles avec les fixtures Talent/Recruteur/Partenaire. |

Liens des workflows :
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108383
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108345
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108363
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108412
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108415
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108380

### 19.3 Vérifications encore en cours ou non couvertes

- Android J'IA WebView, run `42478108415` : les jobs privacy-tests et android-debug-build sont PASS ; le job `android-emulator-smoke` était encore `in_progress` au dernier contrôle. Ne pas déclarer le smoke émulateur PASS avant la conclusion finale du job.
- Les contrôles de build et tests unitaires de la CI ne remplacent pas les parcours de navigation publique sur un navigateur réel.
- Aucun smoke navigateur public autonome n'est enregistré comme nouvelle exécution dans cette section.
- Aucun test runtime nécessitant une session Auth n'a été exécuté par les runs listés ci-dessus.
- Aucun compte fixture, profil, mot de passe ou session n'a été modifié par ces workflows.
- Le workflow E2E complet 11 lots n'a pas été exécuté par cette démarche.

### 19.4 Portée et limites des PASS

Les PASS du présent chapitre prouvent l'exécution des tests unitaires, statiques, de compilation et des migrations sur des bases PostgreSQL éphémères explicitement utilisées par les workflows.

Ils ne prouvent pas :
- l'authentification réelle des comptes Talent, Recruteur ou Partenaire ;
- les permissions effectives sur les tables du projet JOBLY-E2E en production de test ;
- la visibilité réelle des offres via les API JOBLY-E2E ;
- la sécurité globale de toutes les policies RLS et de tous les buckets Storage ;
- la persistance ou le nettoyage de parcours métier dans JOBLY-E2E ;
- la recette globale des 11 lots.

Les tests Security Core sur PostgreSQL isolé ne constituent pas une application de migration à JOBLY-E2E. Ils ne ferment pas non plus le point d'exposition du schéma `net` relevé au §16.

### 19.5 État de reprise après les recettes sans compte

- Recettes CI sans comptes : plusieurs groupes **PASS**, détaillés ci-dessus.
- E2E-001 : **PASS STATIQUE LOCAL — 6/6** ; la retransmission précédente reste un doublon, cf. §18.
- LOT-00 : **PARTIAL**, toujours en attente du GET OpenAPI `public/net`, de la confirmation métier des deux buckets publics et de la matrice grants/policies ciblée.
- Smoke runtime authentifié Talent/Recruteur : **NON AUTORISÉ** tant que LOT-00 n'est pas clos.
- Parcours croisé Talent → Recruteur : **SUSPENDU**.
- Runner bulk / recette globale 11 lots : **SUSPENDU**.
- JOBLY-PROD : interdit ; aucun accès ni écriture.
- PR #266 : ouverte, brouillon, non fusionnée ; aucun merge dans `main`, aucun déploiement.

### 19.6 Prochaines recettes non authentifiées envisageables

Après le contrôle GET LOT-00 demandé au §16.7 et sans démarrer le runner global, les prochaines recettes isolables sont :
1. tests statiques de routes publiques et de pages anonymes, après vérification de leur code pour garantir l'absence d'appel à Auth ou d'écriture ;
2. audit de rendu public du flux d'offres et de la page détail avec un serveur local et données de démonstration non persistées ;
3. tests responsive/PWA et navigation anonyme, séparés des parcours Talent connectés.

Ces recettes ne doivent pas être qualifiées de PASS tant qu'une exécution et un rapport daté, rattachés au SHA exact, ne sont pas disponibles.


### 19.7 Smoke navigateur anonyme — inspection du code, non exécuté

Fichier examiné : e2e/browser-smoke.mjs, blob 87d7acbadce230d5b343ee6025e246e0016408d2.

Le script prévoit des contrôles réalisables sans session utilisateur :
- page d'accueil publique et réponse GET /api/public/home-stats ;
- affichage du formulaire de connexion et des boutons Google ;
- navigation vers le formulaire d'inscription, sans soumission ;
- affichage/masquage du mot de passe ;
- page d'accueil mobile à 390 px, sans débordement horizontal ni chevauchement ;
- six GET anonymes qui doivent répondre HTTP 401 : /api/profile, /api/jobs, /api/applications, /api/talent/ai-bonus, /api/talent/cv/original et /api/career-journey.

Préconditions techniques : serveur local accessible via E2E_BASE_URL (par défaut localhost:3000), ref exact JOBLY-E2E ofqqrryamslxoqkklraw, URL et clé publishable JOBLY-E2E, Playwright installé. Le script écrit des captures et un rapport local dans artifacts/e2e. Il ne soumet aucun formulaire, OTP, paiement, candidature, e-mail ou demande externe.

**Réserve de preuve :** le script lit aussi artifacts/e2e/auth-session-smoke.json. Si ce fichier existe et satisfait les critères de fraîcheur et de complétude, il peut marquer AUTH-006/007 PASS à partir de cette preuve antérieure. Ce mécanisme ne réalise pas lui-même une authentification, mais il mélange le résultat du smoke anonyme à un rapport Auth préexistant. Pour obtenir un rapport strictement anonyme, il faut ajouter un mode explicite qui désactive la lecture et l'importation de cette preuve Auth, sans supprimer, renommer ni écraser les artefacts locaux existants.

**Décision de sécurité :** le script n'a pas été lancé. Malgré l'absence de compte nécessaire pour les contrôles publics, il réalise des appels runtime à JOBLY-E2E. Le verrou LOT-00 interdit encore tout smoke runtime avant fermeture du gate. Après LOT-00 PASS et séparation explicite de la preuve Auth, ce smoke pourra être exécuté comme recette navigateur anonyme isolée.


---

## 20. Premier lot — contrôles statiques publics et anonymes — 8 novembre 2026

### 20.1 Objectif et base de code

Premier sous-lot du plan §19.6 : tests de logique UI/API publique et vérifications statiques de pages utilisables sans compte. Aucun test de session Auth ni aucune écriture JOBLY-E2E n'est autorisé dans ce sous-lot.

- HEAD PR avant cet ajout : 635f5fbb8483ceefa63fec832ed84acaccec0a91.
- SHA de code de référence : 8385b60400bbaf9cedfcb4aa01073b733533f6c2.
- Comparaison entre ces deux SHAs : 8 commits d'avance, un seul fichier modifié (docs/e2e/CONTINUITE-RECETTE-E2E.md) ; aucune différence de code applicatif ou de test.
- PR #266 : ouverte, brouillon, non fusionnée.

### 20.2 Résultats CI du sous-lot statique — PASS 40/40

Les journaux des workflows PR rattachés au code ci-dessus montrent les exécutions suivantes :

| Fichier / groupe | Tests | Résultat | Contrôles |
|---|---:|---:|---|
| scripts/company-logo-fallback.test.mjs | 3 | 3 PASS / 0 FAIL | Initiales de logo, valeur de repli et SVG assaini/déterministe. |
| scripts/p2-jobly-offer-watermark.test.mjs | 3 | 3 PASS / 0 FAIL | Filigrane décoratif, absence d'interception des interactions et rendu feed/détail. |
| scripts/external-application-assistant.test.mjs + scripts/jia-extension-onboarding.test.mjs | 24 | 24 PASS / 0 FAIL | Offres sans canal direct, accès au site promoteur, détail GET sans mutation, ingestion strictement POST, relais J’IA et permissions de l'extension. Les tests inspectent le code ; ils ne soumettent pas de candidature et n'ouvrent pas de session Auth. |
| scripts/offline-first.test.mjs | 10 | 10 PASS / 0 FAIL | Visiteur public sans session, cache service worker, confidentialité, chiffrement et liaison des sauvegardes à un compte ; tests unitaires/statistiques, sans vraie session. |
| **Total du sous-lot reproductible** | **40** | **40 PASS / 0 FAIL** | Exécution CI, sans compte Auth, sans lecture/écriture de fixture et sans accès Supabase runtime. |

Preuves :
- Jobly CI run 42478108383 : company-logo-fallback 3/3, p2-offer-watermark 3/3, offline-first 10/10 ; typecheck et build également PASS.
- Verify offer pipeline run 42478108380 : groupe external-application-assistant + jia-extension-onboarding PASS 24/24 ; typecheck, build et J’IA Watch également PASS.
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108383
- https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42478108380

**Important :** le total 40 additionne les quatre groupes disjoints du tableau, et non les autres suites présentes dans ces workflows. Les deux workflows ont terminé avec la conclusion SUCCESS. Les tests ont été exécutés par GitHub Actions ; aucune exécution CMD locale nouvelle n'est revendiquée.

### 20.3 Revue ciblée de la page publique et de ses routes

Lecture statique des fichiers de la branche :

- app/page.tsx : l'écran initial est welcome. Il charge les compteurs depuis GET /api/public/home-stats. Les appels Auth visibles dans le composant sont cantonnés aux parcours de connexion, d'inscription et de restauration d'un état non public ; l'écran welcome n'a pas besoin d'une session.
- app/api/public/home-stats/route.ts : handler GET qui utilise le client publishable et le RPC d'agrégats get_public_home_stats. Le contrat limite les données exposées aux compteurs agrégés ; aucune opération INSERT/UPDATE/DELETE/UPSERT n'a été relevée dans ce handler.
- app/api/jobs/route.ts : le flux Talent GET /api/jobs reste protégé par getAuthUser et répond 401 sans session. Il ne faut pas le confondre avec un flux d'offres public.
- app/api/jobs/[id]/route.ts : le handler GET de détail effectue des lectures de l'offre et ne présente pas de garde getAuthUser dans son code actuel ; les contrôles statiques du test external-application vérifient notamment la gestion des offres expirées sans mutation de la ligne Job.

Limite : cette relecture de code n'est pas une preuve HTTP de disponibilité réelle, de statut 200/401, de contenu affiché ni de rendu mobile. Aucun appel runtime au projet JOBLY-E2E n'a été lancé.

### 20.4 Commande CMD de reproduction locale du sous-lot 40 tests

La commande ci-dessous exécute uniquement les cinq fichiers du tableau (le groupe externe contient deux fichiers). Elle ne lance ni le runner E2E, ni le navigateur, ni Supabase, ni Auth. Elle ne modifie aucune fixture. Elle produit un seul rapport local :

```bat
cd /d C:\Users\ASUS\Jobly
node --experimental-strip-types --test scripts/company-logo-fallback.test.mjs scripts/p2-jobly-offer-watermark.test.mjs scripts/external-application-assistant.test.mjs scripts/jia-extension-onboarding.test.mjs scripts/offline-first.test.mjs > feedback-lot1-public-static.txt 2>&1
notepad feedback-lot1-public-static.txt
```

Le dernier HEAD local communiqué e92feb8abc1a2491cab7dd81e834080b80982681 contient déjà le code de référence ; les commits distants ultérieurs vérifiés jusqu'au HEAD indiqué en §20.1 ne changent que le document de continuité. Aucun pull n'est nécessaire pour ces fichiers de test.

### 20.5 Statut et étape suivante

- Sous-lot statique public/anonyme : **PASS CI — 40/40**.
- Page d'accueil publique : revue statique du code effectuée ; rendu navigateur réel non exécuté.
- Détail public d'offre : contrats statiques couverts ; aucune réponse HTTP runtime vérifiée.
- Smoke navigateur anonyme complet : **NON EXÉCUTÉ**, car le script actuel peut importer un ancien rapport Auth et le verrou LOT-00 interdit encore les appels runtime JOBLY-E2E.
- LOT-00 : **PARTIAL**.
- Aucun accès JOBLY-PROD, aucune fixture touchée, aucune authentification, aucune écriture, aucun merge ni déploiement.

Après retour éventuel du rapport local, comparer le résultat avec les 40 PASS CI sans additionner les mêmes tests deux fois. Le prochain contrôle navigateur anonyme ne sera engagé qu'après fermeture de LOT-00 et séparation effective des preuves Auth antérieures.

---

## 21. LOT-00 — contrôle OpenAPI en Node.js — V2.13 — 8 novembre 2026

### 21.1 Relecture et limites d’autorisation

Le document maître V2.12 a été relu intégralement avant cette reprise (1 093 lignes). Le contrôle autorisé reste limité à deux requêtes HTTP GET sur `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec les profils `public` puis `net`. Après le 401 provoqué par la clé publishable, la méthode correcte est celle du §22.3. Aucun endpoint Auth, RPC métier, SQL, `net.http_*`, mutation ou script de fixtures n’entre dans ce contrôle.

État GitHub revalidé avant cette mise à jour : PR #266 ouverte, en brouillon, non fusionnée ; HEAD `75e802a9e85b3571eecfc44939744ef3a26d07eb`. Aucun merge ni déploiement.

### 21.2 Tentative Node.js dans l’environnement d’exécution de l’agent

- Runtime disponible dans cet environnement : Node.js `v22.16.0` (différent du poste Windows opérateur, Node.js `v26.13.0`).
- Tentative : deux GET séquentiels vers l’URL Data API JOBLY-E2E, en utilisant la clé publishable déjà référencée au §16.7 ; aucun secret `service_role`.
- Résultat : `LOT00_SCHEMA_CHECK_ERROR: fetch failed` avant réception du premier statut HTTP.
- Aucun code HTTP, code PostgREST ou document OpenAPI n’a donc été reçu. Cette erreur ne permet pas de conclure que l’API JOBLY-E2E est indisponible ou que `net` est exposé ; la sortie réseau de cet environnement isolé peut bloquer la requête.
- Aucun appel Auth, aucune requête SQL, aucun RPC métier, aucune écriture, aucune modification de fixture et aucun accès à JOBLY-PROD.

**Classification : BLOCKED_ENVIRONMENT / NON CONCLUANT. LOT-00 reste PARTIAL.** Ne pas compter cette tentative comme PASS ni comme FAIL du service Supabase.

### 21.3 Procédure précédente V2.14 — retirée du protocole actif

La commande utilisant la clé publishable a été conservée dans l'historique Git mais supprimée de cette section opérationnelle après le retour HTTP 401 `Secret API key required`. Ne pas la recopier ni la relancer. La procédure valide à présent est celle du §22.3, avec clé d'administration JOBLY-E2E saisie masquée et GET limité à la racine OpenAPI.

### 21.4 Contrôles LOT-00 qui resteront ouverts après le GET

Même si le contrôle Node.js retourne `PASS_NET_NOT_EXPOSED`, LOT-00 ne sera pas automatiquement PASS. Il restera à obtenir la décision métier explicite sur la visibilité publique de `jobly-events` et `profile-photos`, puis à compléter la matrice ciblée des grants directs, RLS/policies et opérations nécessaires sur les tables, routines et objets Storage effectivement utilisés par les recettes. Aucun droit, bucket, schéma ou policy ne sera modifié dans cette recette.

En attente du rapport Node.js local : LOT-00 **PARTIAL** ; smoke runtime Auth, smoke navigateur JOBLY-E2E et bulk toujours suspendus ; fixtures inchangées ; JOBLY-PROD interdit ; PR #266 en brouillon ; aucun merge ou déploiement.

---

## 22. LOT-00 — correction de l'authentification OpenAPI — V2.15 — 8 novembre 2026

### 22.1 Rapport opérateur reçu

Fichier transmis : `feedback-lot00-net-schema-exposure.txt` ; Node.js `v26.13.0`.

| Profil | HTTP | `apiSchemaAccepted` | `openapi` | Message |
|---|---:|---:|---:|---|
| `public` | 401 | false | false | `Secret API key required` |
| `net` | 401 | false | false | `Secret API key required` |

Synthèse du script : `GATE=BLOCKED_REVIEW_REQUIRED`.

**Diagnostic :** cette racine OpenAPI exige une clé d'administration. La clé publishable était adaptée aux appels ordinaires d'une application cliente, mais pas à la consultation de ce catalogue sur cet endpoint. Les deux 401 sont donc des refus d'accès au document OpenAPI ; ils ne disent rien sur la présence ou l'absence du schéma `net`. Il n'y a aucune preuve que le projet ou la clé publishable soient globalement en panne.

### 22.2 Règles de sécurité du correctif

- Endpoint immuable : `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/` ; aucune URL de production.
- Méthode : GET uniquement ; deux lectures séquentielles avec `Accept-Profile: public`, puis `Accept-Profile: net`.
- Clé admise : clé secrète du projet JOBLY-E2E (`sb_secret_...`) ou ancienne clé `service_role` du même projet. Ne jamais employer `anon`, `sb_publishable_...` ou une clé de JOBLY-PROD.
- Cette description appartient à la tentative V2.15, désormais historique. Pour la clé legacy `service_role`, appliquer exclusivement le comportement vérifié du §23.3 : header `apikey` seul, sans `Authorization: Bearer`.
- La clé n'est ni affichée, ni écrite dans un fichier, rapport ou journal ; seul son type est enregistré.
- Une clé `sb_secret_...` / `service_role` contourne RLS. Le code est donc volontairement borné à la racine OpenAPI et n'effectue aucune requête de table, aucun RPC, aucun appel Storage, aucun `net.http_*` et aucune écriture.
- Si aucune clé d'administration JOBLY-E2E n'est disponible, ne pas créer ni faire tourner une clé pour ce test. Signaler `NON_TESTABLE_KEY_UNAVAILABLE` ; ne pas utiliser un secret de production.

Références Supabase consultées le 8 novembre 2026 :
- https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup — la racine OpenAPI `/rest/v1/` est réservée à une clé d'administration ;
- https://supabase.com/docs/guides/getting-started/api-keys — distingue publishable et secret, indique que le secret contourne RLS et doit rester côté serveur ;
- https://supabase.com/docs/guides/self-hosting/self-hosted-envoy — décrit la séparation entre racine OpenAPI et routes Data API.

### 22.3 Procédure V2.15 — historique retiré du protocole actif

L'ancienne commande de cette section est retirée du protocole actif pour éviter toute confusion entre les clés `sb_secret_…` et `service_role` JWT. Ne pas l'exécuter ni la recopier. Le seul test actif est la procédure Node.js legacy `service_role` du §23.3 : elle accepte uniquement un JWT commençant par `eyJ`, vérifie que son payload contient le rôle `service_role` et le projet `ofqqrryamslxoqkklraw`, puis envoie uniquement le header `apikey`.

### 22.4 Critère du résultat

| Profil | Résultat attendu |
|---|---|
| `public` | HTTP 200 et document OpenAPI (`openapi=true`) |
| `net` | HTTP 406 et code PostgREST `PGRST106` |
| Synthèse | `GATE=PASS_NET_NOT_EXPOSED` |

Tout autre résultat reste `BLOCKED_REVIEW_REQUIRED`. HTTP 401 avec clé `sb_secret` signifie clé incorrecte, désactivée ou appartenant à un autre projet ; HTTP 200 sur `net` signifie que le schéma est exposé et exige une revue de sécurité. Aucune correction de grants ou Data API settings automatique.

### 22.5 Statut de reprise

- Résultat précédent avec publishable : **401 / NON CONCLUANT** pour `public` et `net`.
- Clé moderne `sb_secret_…` : **signalée rejetée par l'opérateur ; code HTTP et message exacts non encore documentés**.
- Repli legacy `service_role` : **à vérifier dans Legacy API Keys, puis à tester uniquement si active**.
- LOT-00 : **PARTIAL**.
- Décision sur les buckets publics et matrice grants/RLS/policies ciblée : toujours en attente.
- Smoke runtime Auth / navigateur JOBLY-E2E / bulk 11 lots : **suspendus**.
- Fixtures : inchangées ; aucun Auth, aucune écriture ; JOBLY-PROD interdit.
- PR #266 : ouverte, brouillon, non fusionnée ; `main` inchangée ; aucun déploiement.

---

## 23. LOT-00 — repli sur la clé legacy service_role — V2.16 — 8 novembre 2026

### 23.1 Fait nouveau et limites

L'opérateur indique voir dans le Dashboard les entrées `anon` public et `service_role` secret. Il s'agit des noms legacy si elles apparaissent sous **Legacy API Keys** ; la valeur `service_role` doit alors être un JWT commençant par `eyJ`. L'opérateur avait auparavant signalé le rejet de la clé moderne `sb_secret_…`, sans transmettre le statut HTTP ou le message exact. La présence visuelle de la ligne `service_role` ne confirme pas à elle seule son activation ; le script validera son rôle/projet avant tout appel, puis la réponse API indiquera si elle est acceptée.

Contrôle Supabase Management API effectué en lecture seule : le projet `ofqqrryamslxoqkklraw` correspond bien à `JOBLY-E2E` et son état est `ACTIVE_HEALTHY`. Les clés publiques du projet sont enregistrées ; l'outil de gestion disponible ne permet pas de récupérer ni de vérifier la valeur ou l'état de la clé secrète.

### 23.2 Clé de repli à vérifier dans le Dashboard

URL directe : https://supabase.com/dashboard/project/ofqqrryamslxoqkklraw/settings/api-keys

Dans **Legacy API Keys**, l'opérateur confirme maintenant voir les deux entrées `anon` public et `service_role` secret. Repérer la ligne `service_role` et vérifier son état sans partager la valeur :
- si `service_role` est **active** et que sa valeur commence par `eyJ`, elle peut être utilisée pour le contrôle OpenAPI limité au GET de métadonnées ;
- si `service_role` est absente ou désactivée, ne pas la réactiver, ne pas la régénérer et ne pas créer une autre clé pour ce diagnostic ; retourner `LEGACY_SERVICE_ROLE_UNAVAILABLE`.

Supabase indique que les clés legacy `anon` et `service_role` continuent de fonctionner en parallèle des nouvelles clés tant qu'elles ne sont pas explicitement désactivées. La racine OpenAPI accepte une clé d'administration ; son exemple legacy place `service_role` uniquement dans le header `apikey`.

Références :
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup

### 23.3 Contrôle Node.js — legacy service_role uniquement

À exécuter uniquement après avoir confirmé dans le Dashboard que la clé `service_role` de JOBLY-E2E est active. La saisie est masquée, la clé n'est ni affichée ni sauvegardée, et un rapport neuf `feedback-lot00-net-schema-exposure-v3.txt` est créé sans écraser un rapport existant. Le script envoie `apikey` seulement, sans `Authorization: Bearer`, et n'exécute que deux GET OpenAPI sur le projet E2E.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v3.txt echo Rapport deja present : conservation, aucune nouvelle execution.
if not exist feedback-lot00-net-schema-exposure-v3.txt node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v3.txt';if(fs.existsSync(report)){console.log('REPORT_EXISTS_PRESERVED');process.exit(3)}if(!input.isTTY||typeof input.setRawMode!=='function'){console.log('TTY_REQUIRED');process.exit(2)}let key='';out.write('Ancienne cle service_role JOBLY-E2E (masquee) : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');process.exit(2)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');const k=key.trim();key='';run(k);return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net');const pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}
notepad feedback-lot00-net-schema-exposure-v3.txt
```

**Résultat attendu :** `public` = HTTP 200 avec document OpenAPI ; `net` = HTTP 406 et code `PGRST106` ; synthèse `PASS_NET_NOT_EXPOSED`. Tout autre résultat reste BLOCKED. Ne jamais envoyer la clé dans le chat ni mettre son contenu dans le rapport.

### 23.4 Si la legacy service_role est également rejetée

Ne pas effectuer un troisième essai avec une autre clé. Transmettre uniquement le rapport non sensible `feedback-lot00-net-schema-exposure-v3.txt` et préciser si la ligne `service_role` est active ou désactivée (sans valeur). Si elle est active et que l'API la refuse, le résultat sera examiné comme un problème de configuration/validation des clés Data API ; aucune modification du projet ne sera faite automatiquement.

### 23.5 Statut de continuité

- Projet `JOBLY-E2E` : `ACTIVE_HEALTHY` confirmé par Supabase Management API.
- Clé publishable : refusée sur la racine OpenAPI (401 attendu pour ce type de clé).
- Clé moderne `sb_secret_…` : rejet signalé par l'opérateur ; preuve HTTP exacte non fournie.
- Ancienne `service_role` : entrée visible dans le Dashboard selon l'opérateur ; confirmer son activation et utiliser seulement le JWT `eyJ…` prévalidé par le §23.3 ; ne pas réactiver/régénérer.
- LOT-00 : **PARTIAL** ; aucune preuve d'exposition ou de non-exposition de `net` obtenue.
- Buckets publics et matrice ciblée grants/RLS/policies : toujours à compléter.
- Aucun smoke runtime/Auth, aucun bulk, aucune fixture modifiée, aucun accès JOBLY-PROD, aucun merge/déploiement.
---

## 24. Gouvernance de continuité et clarification LOT-00 — V2.19 — 8 novembre 2026

### 24.1 Directive de mise à jour systématique

L'opérateur demande que l'assistant mette lui-même à jour le présent document à chaque réponse dans le chantier de recette E2E, avec des preuves.

Règle opérationnelle :
- Chaque réponse consacrée à ce chantier donne lieu, dans le même tour, à une mise à jour du document sur la branche `e2e/recette`.
- La mise à jour consigne uniquement les nouveaux faits réellement établis, les décisions, les commandes ou vérifications demandées, les résultats effectivement reçus, les limites et les blocages.
- Chaque résultat doit être accompagné de sa preuve traçable (rapport, exécution CI, fichier, commit, réponse HTTP ou source exacte). Une action non réalisée est explicitement marquée comme non réalisée.
- En l'absence de nouvelle preuve technique, l'entrée précise qu'aucun nouveau test ni appel runtime n'a été effectué ; elle ne change pas artificiellement les statuts des lots.
- Chaque réponse fournit comme preuve de mise à jour le SHA du commit GitHub, la branche et le chemin exact du document.
- Cette obligation ne lève aucun garde-fou : aucune fixture, donnée, clé, politique, production, fusion ni déploiement ne peut être touché sans l'autorisation spécifique déjà exigée.

### 24.2 État du document et de la PR revalidé avant cette mise à jour

Lecture intégrale du fichier distant sur `e2e/recette` avant écriture :
- Chemin : `docs/e2e/CONTINUITE-RECETTE-E2E.md`.
- État source : version V2.18, 1 232 lignes, 102 869 caractères.
- Blob SHA source : `9d802c1ec8b707067c39019c3b331e674c8cd8a1`.
- PR #266 : ouverte, brouillon, non fusionnée ; base `main`, branche source `e2e/recette`.
- HEAD de la PR vérifié : `0aa7970255ffda89fd71412e68f5a1c82f4e126d`.
- Source de vérification PR : https://github.com/kenzimayaka-glitch/Jobly/pull/266
- Source du document : https://github.com/kenzimayaka-glitch/Jobly/blob/e2e/recette/docs/e2e/CONTINUITE-RECETTE-E2E.md

### 24.3 Réponse reçue sur l'emplacement de la clé legacy

La question posée était de choisir explicitement entre :
- **Legacy API Keys** : ligne `service_role` legacy, valeur JWT attendue commençant par `eyJ` ;
- **Secret keys** : clé moderne commençant par `sb_secret_`.

La réponse opérateur reçue est uniquement « Oui ». Elle ne sélectionne aucun des deux onglets. Elle ne constitue donc pas une preuve que la ligne `service_role` est dans **Legacy API Keys**, ni que son état est actif.

**Blocage inchangé :** demander uniquement le nom de l'onglet où apparaît la ligne, sans jamais demander ni accepter la valeur de la clé. Tant que l'onglet n'est pas identifié, ne pas lancer le script §23.3 et ne faire aucun appel HTTP supplémentaire avec une clé.

### 24.4 Effet de ce tour sur les validations

- LOT-00 : **PARTIAL**, sans changement.
- Contrôle OpenAPI `public`/`net` avec la clé legacy : **NON EXÉCUTÉ** dans ce tour.
- Aucun secret saisi, lu, transmis ou utilisé.
- Aucun appel HTTP Supabase, Auth, SQL, RPC ou Storage effectué dans ce tour.
- Aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Aucun test runtime, browser smoke ou bulk exécuté.
- Aucun changement de code applicatif ; seule cette documentation de continuité est mise à jour.
- `main` non modifiée ; PR #266 reste ouverte en brouillon ; aucun merge ni déploiement.
---

## 25. Confirmation de l'onglet Legacy API Keys — V2.20 — 8 novembre 2026

### 25.1 Nouvelle confirmation opérateur

L'opérateur confirme explicitement que la ligne `service_role` apparaît dans l'onglet **Legacy API Keys** du Dashboard Supabase JOBLY-E2E.

Cette réponse confirme l'emplacement legacy, mais ne confirme pas encore :
- que la ligne est active ;
- que la valeur commence par `eyJ` (format JWT attendu par le script §23.3).

Aucune valeur de clé n'a été demandée ni communiquée.

### 25.2 Prochaine vérification autorisée

Demander à l'opérateur de vérifier uniquement dans le Dashboard, sans copier la clé :
- état affiché de la ligne `service_role` : active ;
- premiers caractères de format : `eyJ`.

Si les deux conditions sont confirmées, utiliser exclusivement la commande exacte du §23.3, dans le CMD local, avec saisie masquée. Immédiatement après la commande d'exécution, conserver la commande `notepad feedback-lot00-net-schema-exposure-v3.txt` pour ouvrir le rapport. Ne pas exécuter si la clé est inactive, absente ou ne commence pas par `eyJ` ; ne pas réactiver, régénérer ou créer une clé.

### 25.3 Effet sur les validations et périmètre

- Emplacement de la clé : **CONFIRMÉ — Legacy API Keys** (déclaration explicite de l'opérateur).
- État actif : **À CONFIRMER**.
- Format JWT `eyJ` : **À CONFIRMER**.
- GET OpenAPI `public` puis `net` : **NON EXÉCUTÉ** à ce tour.
- LOT-00 : **PARTIAL**, sans changement de statut.
- Aucun secret saisi, lu, transmis ou stocké ; aucun appel HTTP Supabase/Auth/SQL/RPC/Storage dans ce tour.
- Aucune fixture, donnée, permission ou configuration Supabase modifiée ; aucun test runtime/browser/bulk exécuté.
- `main` inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun merge ni déploiement.

### 25.4 Preuves de référence

- Réponse opérateur dans la conversation : « legacy api keys ».
- Document source relu avant écriture : V2.19, blob SHA `2c342894d059f29615dd49e42c628560d3cb7a16`.
- PR #266 relue avant écriture : ouverte, brouillon, non fusionnée ; HEAD `9803dcb0a8281a799366b915d8a0430c3c7ea686`, base `main`.
- Dashboard à consulter : https://supabase.com/dashboard/project/ofqqrryamslxoqkklraw/settings/api-keys
- Aucun statut de clé ni valeur secrète n'a été inspecté par l'assistant.
---

## 26. Résultat de contrôle `KEY_TYPE_INVALID` — V2.21 — 8 novembre 2026

### 26.1 Rapport opérateur reçu

L'opérateur a transmis le résultat non sensible suivant :

```text
node=v26.13.0
project_ref=ofqqrryamslxoqkklraw
credential_type=unknown
results=[]
GATE=BLOCKED_REVIEW_REQUIRED
error=Error: KEY_TYPE_INVALID
```

### 26.2 Comparaison avec la procédure de référence §23.3

Ce résultat ne correspond pas à la commande exacte conservée au §23.3 :
- le §23.3 écrit la valeur fixe `credential_type=legacy_service_role` dans tout rapport qu'il génère ; il ne peut donc pas produire `credential_type=unknown` ;
- pour un format ne commençant pas par `eyJ`, il émet `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, et non `KEY_TYPE_INVALID` ;
- si le payload JWT ne confirme pas le rôle `service_role` et le projet `ofqqrryamslxoqkklraw`, il émet `KEY_PROJECT_OR_ROLE_MISMATCH`.

**Conclusion limitée :** le rapport transmis provient d'une commande, d'un script ou d'une version différente de la procédure documentée au §23.3, ou a été transformé avant transmission. La commande effectivement lancée n'est pas encore identifiée. `results=[]` signifie que le rapport ne contient aucune réponse HTTP exploitable pour les profils `public` et `net` ; il ne démontre ni l'acceptation ni le refus de la clé par PostgREST et ne permet aucune conclusion sur l'exposition du schéma `net`.

### 26.3 Décision de sécurité et prochaine vérification

- Aucun nouvel essai de clé ne doit être lancé à ce stade.
- Ne pas essayer une clé `anon`, une clé `sb_secret_…`, une clé JOBLY-PROD, une autre clé ou un autre endpoint.
- Ne pas activer, réactiver, régénérer ou créer une clé.
- Ne pas demander ni transmettre la valeur de la clé.
- Identifier d'abord la commande exacte exécutée et son origine : demander à l'opérateur de copier uniquement la ligne CMD ou le nom/chemin du script utilisé, en excluant toute valeur secrète. Comparer ensuite cette commande à la commande de référence §23.3 avant de décider de la suite.
- Même si la ligne `service_role` se trouve dans **Legacy API Keys**, son état **Active** et le format JWT `eyJ…` ne sont pas encore confirmés par une preuve distincte dans la conversation.

### 26.4 Effet sur les gates et périmètre

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**, inchangé.
- Contrôle OpenAPI `public` : **AUCUN STATUT HTTP EXPLOITABLE** dans le rapport reçu.
- Contrôle OpenAPI `net` : **AUCUN STATUT HTTP EXPLOITABLE** dans le rapport reçu.
- Exposition du schéma PostgreSQL `net` : **NON DÉTERMINÉE**.
- Aucune preuve que la clé fournie soit active, legacy JWT, rattachée au rôle attendu ou acceptée par l'API.
- Aucun smoke runtime Auth/Talent/Recruteur, aucun navigateur, aucun parcours croisé et aucun bulk ne sont autorisés avant fermeture de LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission, configuration Supabase ou code applicatif modifié dans ce tour.
- `main` non modifiée ; PR #266 reste ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 26.5 Sources et preuves

- Rapport opérateur reçu dans la conversation : bloc de sortie reproduit au §26.1.
- Procédure de référence comparée : §23.3 de ce document.
- Document source avant cette mise à jour : blob SHA `228ad6ca36df76e928435a99fe51c758064a6192` sur `e2e/recette`.
- PR #266 vérifiée avant cette mise à jour : state `open`, draft `true`, merged `false`, HEAD `d74b6d2a61f9a7cb6baab67adc2726b81a19dc39`, base `main`.
- Aucune valeur de clé n'a été reçue, lue ou enregistrée.
---

## 27. Retransmission contrôlée de la commande LOT-00 — V2.22 — 8 novembre 2026

### 27.1 Demande opérateur et décision

Après le rapport `KEY_TYPE_INVALID` (§26), l'opérateur demande explicitement la retransmission de la commande LOT-00 pour la réessayer.

La commande de référence reste celle du §23.3. Une copie strictement identique de la logique est retransmise avec un nouveau nom de rapport `feedback-lot00-net-schema-exposure-v4.txt` afin de préserver le rapport `v3` et toute sortie antérieure. Le contrôle reste limité au JWT legacy JOBLY-E2E prévalidé et à deux requêtes GET OpenAPI, schémas `public` puis `net`, sur l'URL `/rest/v1/` du projet `ofqqrryamslxoqkklraw`.

### 27.2 Précondition obligatoire

Avant exécution, l'opérateur doit vérifier dans le Dashboard que la ligne `service_role` sous **Legacy API Keys** est marquée **Active** et que son format de valeur commence par `eyJ`. Ne jamais transmettre la valeur. Si l'une des deux conditions manque, ne pas exécuter ; ne pas réactiver, recréer ou régénérer de clé.

Le script contrôle en plus localement le préfixe JWT, le claim `role=service_role` et le claim `ref=ofqqrryamslxoqkklraw`. En cas d'échec de ces validations, aucune requête HTTP n'est envoyée. En cas de validation réussie, seules deux requêtes GET à la racine OpenAPI sont faites, avec le header `apikey` uniquement ; aucun Authorization Bearer, table, RPC, Storage, `net.http_*` ou écriture.

### 27.3 Commande CMD retransmise

Le bloc CMD complet transmis à l'opérateur utilise le rapport `feedback-lot00-net-schema-exposure-v4.txt`, ouvre ce rapport avec Notepad immédiatement après l'exécution et refuse d'écraser un rapport v4 déjà présent.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v4.txt echo Rapport v4 deja present : conservation, aucune nouvelle execution.
if not exist feedback-lot00-net-schema-exposure-v4.txt node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v4.txt';if(fs.existsSync(report)){console.log('REPORT_EXISTS_PRESERVED');process.exit(3)}if(!input.isTTY||typeof input.setRawMode!=='function'){console.log('TTY_REQUIRED');process.exit(2)}let key='';out.write('Ancienne cle service_role JOBLY-E2E (masquee) : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');process.exit(2)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');const k=key.trim();key='';run(k);return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net');const pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}
notepad feedback-lot00-net-schema-exposure-v4.txt
```

### 27.4 Interprétation du résultat

- `public` : HTTP 200 avec document OpenAPI attendu.
- `net` : HTTP 406 et code PostgREST `PGRST106`.
- Seule la combinaison des deux donne `GATE=PASS_NET_NOT_EXPOSED` pour le sous-contrôle d'exposition du schéma.
- Tout autre résultat reste `BLOCKED_REVIEW_REQUIRED` ; ne pas changer les grants, schémas, rôles, policies ou configuration à partir de ce seul résultat.
- Si `feedback-lot00-net-schema-exposure-v4.txt` existe déjà, la commande le préserve et n'exécute pas un second run avec ce nom. Ne pas supprimer ni écraser un rapport existant.

### 27.5 État à cet instant

- Rapport précédent : `credential_type=unknown`, `results=[]`, `GATE=BLOCKED_REVIEW_REQUIRED`, `KEY_TYPE_INVALID` (§26.1). Il ne contient aucun statut HTTP.
- Commande exacte qui a produit le précédent rapport : **NON IDENTIFIÉE**.
- Emplacement `service_role` : confirmé par l'opérateur sous Legacy API Keys.
- État Active et préfixe `eyJ` : **non confirmés à ce jour dans la conversation** ; préconditions à vérifier avant utilisation.
- Commande V4 : **retransmise, non exécutée par l'assistant** ; aucun résultat de test n'est encore revendiqué.
- LOT-00 : **PARTIAL** ; exposition `net` indéterminée.
- Smoke runtime, navigateur, parcours croisé et bulk : suspendus jusqu'à fermeture LOT-00.
- Aucun appel HTTP Supabase, Auth, SQL, RPC ou Storage dans cette mise à jour ; aucune fixture, donnée, permission ou configuration modifiée ; JOBLY-PROD interdit.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 27.6 Preuves GitHub et sources

- Source documentaire relue avant édition : V2.21, blob SHA `e8a2e7212ea2b04e85bd8fa7f9660b4e193f1399`.
- PR #266 relue avant édition : state `open`, draft `true`, merged `false`, HEAD `77919abb0e63e91de3da9a1119bf9921d449781d`, base `main`.
- Procédure logique de référence : §23.3 du présent document.
- Nouveau nom de rapport local réservé : `feedback-lot00-net-schema-exposure-v4.txt`.
---

## 28. Retour opérateur après commande LOT-00 V4 — V2.23 — 8 novembre 2026

### 28.1 Résultat communiqué

Après retransmission de la procédure CMD du §27.3, l'opérateur communique uniquement :

```text
GATE=BLOCKED_REVIEW_REQUIRED
```

Ce retour confirme que le gate n'a pas atteint son critère PASS. Il ne constitue toutefois pas le rapport complet `feedback-lot00-net-schema-exposure-v4.txt` et ne fournit ni `credential_type`, ni contenu de `results`, ni détail `error`, ni statut HTTP par profil.

### 28.2 Conclusion permise et limites

- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Il est impossible de déterminer si le script s'est arrêté avant les requêtes (format/claims de clé ou TTY), si la requête `public` a échoué, si la requête `net` a échoué, ou si la réponse a été différente du critère attendu.
- Aucun statut HTTP pour `public` ou `net` n'est attesté dans ce retour.
- L'exposition du schéma PostgreSQL `net` reste **NON DÉTERMINÉE**.
- Ne pas conclure que la clé est invalide, désactivée, acceptée ou rejetée sur la seule base du gate global.

### 28.3 Prochaine information nécessaire

Demander le contenu non secret du rapport V4, ou à défaut les seules lignes suivantes copiées telles quelles : `credential_type=...`, `results=...`, `error=...` si présente, et `GATE=...`. Si `results` contient des réponses HTTP, conserver pour chaque profil `schema`, `status`, `code` et `message`. Ne jamais communiquer la valeur de clé, un header `apikey`, un token ou un contenu d'environnement.

Aucune nouvelle tentative de clé ni nouvelle requête n'est demandée avant lecture de ces détails. Ne pas supprimer ni écraser le rapport V4. La commande exacte est conservée au §27.3 ; si le résultat provient d'une autre commande ou d'un autre fichier, préciser son nom sans joindre de secret.

### 28.4 Effet sur le périmètre E2E

- Le contrôle `public` : **NON QUALIFIÉ — absence de détail HTTP**.
- Le contrôle `net` : **NON QUALIFIÉ — absence de détail HTTP**.
- Le gate OpenAPI : **BLOCKED_REVIEW_REQUIRED** selon le message opérateur.
- Aucun smoke runtime Auth/Talent/Recruteur, aucun navigateur, aucun parcours croisé et aucun bulk ne sont autorisés avant fermeture de LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission, configuration Supabase ou code applicatif modifié dans ce tour.
- Aucune requête HTTP Supabase n'a été effectuée par l'assistant ; le résultat est une déclaration opérateur, non une observation directe.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 28.5 Preuves de référence

- Retour opérateur reçu dans la conversation : `GATE=BLOCKED_REVIEW_REQUIRED`.
- Procédure V4 précédemment transmise : §27.3 ; rapport attendu : `feedback-lot00-net-schema-exposure-v4.txt`.
- Document V2.22 relu avant cette mise à jour : blob SHA `76d8a7e8994b7263b71a42531bf5031ce7df977a` ; branche `e2e/recette`.
- Aucune preuve HTTP ni détail diagnostique supplémentaire reçu à ce stade.
---

## 29. Commande V4 sans demande de clé — diagnostic d'exécution — V2.24 — 8 novembre 2026

### 29.1 Retour opérateur

L'opérateur précise que, lors de l'utilisation de la commande LOT-00 V4 (§27.3), le terminal ne lui a pas demandé de saisir la clé `service_role`.

Le seul retour de gate communiqué précédemment est `GATE=BLOCKED_REVIEW_REQUIRED` (§28.1). Le contenu complet du rapport V4 et les lignes CMD affichées avant l'ouverture de Notepad ne sont pas disponibles.

### 29.2 Causes possibles dans le bloc CMD, sans diagnostic définitif

Le comportement dépend de deux gardes explicites du bloc :
- Si `feedback-lot00-net-schema-exposure-v4.txt` existe déjà, `if exist` affiche le message de conservation puis `if not exist` saute entièrement `node -e` : aucune invite de clé n'apparaît et Notepad ouvre le rapport déjà présent.
- Si le processus Node.js n'a pas un terminal TTY avec `setRawMode`, le script affiche `TTY_REQUIRED` et quitte avant l'invite de saisie.
- Si le bloc n'a pas été exécuté intégralement dans CMD (copie partielle, condition non atteinte ou autre commande), aucune conclusion ne peut être tirée sans la sortie console.

Ces causes sont des possibilités déduites du code de la commande, pas des faits constatés. Le message `GATE=BLOCKED_REVIEW_REQUIRED` à lui seul ne permet pas de savoir laquelle s'est produite.

### 29.3 Prochaine vérification — sans nouvelle tentative

Ne pas relancer le script et ne pas ressaisir de clé pour l'instant. Demander uniquement à l'opérateur de recopier les lignes visibles dans la fenêtre CMD **avant l'ouverture de Notepad**. Les indices à rechercher sont :
- `Rapport v4 deja present : conservation, aucune nouvelle execution.`
- `TTY_REQUIRED`.
- `REPORT=feedback-lot00-net-schema-exposure-v4.txt` et le résumé `GATE=...` émis par le script.

Le nom du fichier ouvert par Notepad peut aussi être confirmé sans partager son contenu secret. Ne jamais transmettre de clé, en-tête `apikey`, variable d'environnement ou jeton. Si le rapport V4 existe, le conserver sans le supprimer ni l'écraser.

### 29.4 Statut et périmètre

- Exécution effective du `node -e` V4 : **NON CONFIRMÉE**.
- Invite masquée : **NON AFFICHÉE selon le retour opérateur**.
- Cause de l'absence d'invite : **À DÉTERMINER**.
- Statut HTTP `public` et `net` : **NON DISPONIBLE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; exposition de `net` **NON DÉTERMINÉE**.
- Aucun nouveau test, appel HTTP, appel Auth, SQL, RPC ou Storage exécuté par l'assistant ; aucune fixture, donnée, permission ou configuration modifiée.
- Aucun smoke runtime, navigateur, parcours croisé ou bulk ; JOBLY-PROD interdit.
- `main` inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun déploiement.

### 29.5 Preuves

- Déclaration opérateur dans la conversation : « Il ne m'as pas demandé la clé ».
- Commande analysée : §27.3, avec protections `if exist` / `if not exist` et contrôle `input.isTTY` / `setRawMode`.
- Document source avant cette mise à jour : blob SHA `eb642b3fc8ef5819fea16f618c94e3a2548567fa` sur la branche `e2e/recette`.
- PR #266 avant écriture : state `open`, draft `true`, merged `false`, HEAD `2827789b05bccfd7e35f893c05183915531365f1`, base `main`.

---

## 30. Résultat de la validation de format de la clé V4 — V2.25 — 8 novembre 2026

### 30.1 Rapport opérateur reçu

L'opérateur transmet le rapport suivant après la commande LOT-00 V4 (§27.3) :

```text
node=v26.13.0
project_ref=ofqqrryamslxoqkklraw
credential_type=legacy_service_role
results=[]
GATE=BLOCKED_REVIEW_REQUIRED
error=Error: KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT
```

### 30.2 Interprétation exacte du contrôle

Ce résultat correspond au contrôle explicite du script §27.3 :

- Le champ `credential_type=legacy_service_role` est une valeur fixe écrite par le script ; il ne prouve pas, à lui seul, que la valeur saisie est une clé valide de ce rôle.
- Le script arrête l'exécution si la chaîne reçue ne commence pas par `eyJ`, en émettant exactement `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- Le rapport `results=[]` confirme qu'aucune réponse HTTP n'a été ajoutée aux résultats.
- Le script n'a donc pas atteint les deux GET OpenAPI prévus pour les profils `public` puis `net`.

Le précontrôle a reçu une chaîne non vide (la branche `KEY_EMPTY` avait été testée avant `run(k)`) qui ne commençait pas par le préfixe JWT attendu `eyJ` après normalisation par `trim()`. Le rapport ne permet pas de distinguer ces deux cas et ne permet pas d'inférer l'état Active de la clé dans le Dashboard.

### 30.3 Décision et prochaine étape sûre

- Ne pas effectuer un nouvel essai avec une autre clé ou un autre type de clé.
- Ne pas utiliser `anon`, `sb_secret_…`, une clé JOBLY-PROD ou une valeur provenant d'un autre projet.
- Ne pas activer, réactiver, régénérer ou créer une clé.
- Ne jamais demander à l'opérateur de copier ou transmettre la valeur de la clé dans le chat, un rapport ou Git.
- Avant toute autre commande, l'opérateur peut seulement consulter le Dashboard JOBLY-E2E, sans copier la valeur, pour vérifier si la ligne `service_role` historique est indiquée comme **Active** et si le format est celui d'un JWT historique. Si le Dashboard ne permet pas de confirmer ces deux éléments sans exposer la clé, arrêter le contrôle et conserver le statut bloqué.
- Aucun autre endpoint, appel API, requête SQL/RPC/Storage ou changement de permissions n'est justifié par ce rapport.

### 30.4 Effet sur les gates et périmètre

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` : **NON EXÉCUTÉ**.
- GET OpenAPI `net` : **NON EXÉCUTÉ**.
- Exposition du schéma PostgreSQL `net` : **NON DÉTERMINÉE**.
- L'étape de contrôle de format s'est exécutée ; les requêtes HTTP ne se sont pas exécutées.
- Aucun smoke runtime Auth/Talent/Recruteur, aucun navigateur, aucun parcours croisé et aucun bulk ne sont autorisés avant fermeture de LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Le retour est une preuve textuelle transmise par l'opérateur ; aucun appel Supabase n'a été effectué par l'assistant.
- `main` inchangée ; PR #266 reste ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 30.5 Preuves

- Rapport non secret fourni par l'opérateur dans la conversation (§30.1).
- Signature de l'erreur comparée au contrôle `if (!k.startsWith('eyJ')) throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT')` du §27.3.
- Document source avant cette mise à jour : V2.24, blob SHA `b57d8c57861026198e4f1ceae42dd3afa2670462`, branche `e2e/recette`.
- PR #266 vérifiée avant écriture : state `open`, draft `true`, merged `false`, HEAD `fb46608e64a0e5a522828739897fe98201523e63`, base `main`.
- Aucune valeur de clé n'a été reçue, lue ou enregistrée par l'assistant.

---

## 31. Nouvelle transmission de la commande LOT-00 avec invite explicite — V2.26 — 8 novembre 2026

### 31.1 Clarification opérateur

L'opérateur indique qu'il n'a pas encore été amené à saisir la clé et demande la retransmission de la commande pour effectuer le test. Il faut donc éviter toute formulation laissant croire que la clé a déjà été fournie. Le rapport V4 précédent (§30) indique seulement que le précontrôle a reçu une chaîne vide ou une chaîne sans préfixe `eyJ` ; il ne prouve pas que l'opérateur a volontairement saisi une valeur.

### 31.2 Nouvelle commande V5 — rapport séparé

Pour éviter toute collision avec les rapports V3 et V4, la commande ci-dessous réserve un nouveau nom V5. Elle affiche explicitement une invite de saisie masquée **après** confirmation que le terminal CMD dispose d'un TTY. Aucun caractère saisi n'est affiché. La commande refuse d'écraser le nouveau rapport s'il existe déjà.

**Précondition :** exécuter uniquement dans le Node.js Command Prompt/CMD interactif et uniquement si la ligne `service_role` de JOBLY-E2E est indiquée Active sous Legacy API Keys. La clé ne doit pas être copiée dans le chat. Si la ligne n'est pas active ou si le format n'est pas celui du JWT historique, arrêter sans saisir de valeur ; aucune réactivation, rotation ou génération n'est autorisée.

### 31.3 Bloc CMD transmis

Le bloc a été corrigé et vérifié pour conserver les séquences d'échappement nécessaires à Node.js (`\r`, `\n`, `\u0003`) après le passage par CMD. Le prompt de saisie apparaît explicitement avant le passage en mode masqué.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v5-20261108-b.txt (
  echo Rapport V5 deja present : conservation, aucune nouvelle execution.
) else (
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v5-20261108-b.txt';if(fs.existsSync(report)){console.log('REPORT_EXISTS_PRESERVED');process.exit(3)}function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){out.write('TTY_REQUIRED - ouvrir Node.js Command Prompt puis coller la commande complete.\n');save([],'BLOCKED_REVIEW_REQUIRED','TTY_REQUIRED');process.exit(2)}let key='';out.write('\nSAISIE MASQUEE : colle maintenant la valeur complete de la cle service_role historique JOBLY-E2E, puis appuie sur Entree. Aucun caractere ne sera affiche : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');save([],'BLOCKED_REVIEW_REQUIRED','CANCELLED');process.exit(2)}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');const k=key.trim();key='';if(!k){save([],'BLOCKED_REVIEW_REQUIRED','KEY_EMPTY');return}run(k);return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net'),pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}"
)
if exist feedback-lot00-net-schema-exposure-v5-20261108-b.txt notepad feedback-lot00-net-schema-exposure-v5-20261108-b.txt
```

Le prompt doit afficher exactement une instruction commençant par `SAISIE MASQUEE`. À ce moment seulement, coller localement la valeur complète de la clé historique `service_role` JOBLY-E2E puis appuyer sur Entrée. L'absence d'écho à l'écran est normale. Si `TTY_REQUIRED` apparaît, ne pas essayer de saisir la clé ; transmettre seulement cette ligne.

Le script valide localement le préfixe JWT et les claims `role=service_role` et `ref=ofqqrryamslxoqkklraw`. Si ces validations passent, il effectue exclusivement deux GET à `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec `Accept-Profile: public` puis `Accept-Profile: net`, le header `apikey` uniquement. Aucun Authorization Bearer, table, RPC, Storage, `net.http_*` ou écriture.

### 31.4 Lecture du résultat

- Le rapport attendu est `feedback-lot00-net-schema-exposure-v5-20261108-b.txt`.
- Le fichier s'ouvre dans Notepad après l'exécution.
- Seule la paire `public=HTTP 200 avec OpenAPI` et `net=HTTP 406 / PGRST106` donne `PASS_NET_NOT_EXPOSED`.
- Tout autre résultat reste `BLOCKED_REVIEW_REQUIRED`. Ne pas relancer le test avec une autre clé.
- Ne transmettre que les lignes non secrètes du rapport : `results`, `GATE`, `error` éventuelle et `REPORT`. Jamais la clé ou un header.

### 31.5 État et limites après transmission

- Commande V5 corrigée : **PRÊTE À ÊTRE TESTÉE, NON EXÉCUTÉE** par l'assistant ; aucun résultat n'est anticipé.
- Invite de saisie de la clé : prévue explicitement après le contrôle TTY ; sa visibilité devra être confirmée par l'opérateur.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à réception et examen du rapport.
- Aucun GET OpenAPI n'a été effectué par l'assistant ; exposition de `net` toujours **NON DÉTERMINÉE**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée ; aucun smoke runtime/browser/bulk.
- `main` inchangée ; PR #266 reste ouverte en brouillon et non fusionnée ; aucun déploiement.

### 31.6 Preuves

- Retour opérateur : « je n'ai pas encore été amené à saisir ce code, renvoi la commande du lot je teste ».
- Rapport V4 précédent : §30.1 ; erreur locale `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]`.
- Procédure de référence comparée : §23.3 ; nouveau rapport réservé : `feedback-lot00-net-schema-exposure-v5-20261108-b.txt`.
- Document source avant cette mise à jour : V2.25, blob SHA `1bff7a776d12c599eddabd154915e61d1ade8679`, branche `e2e/recette`.
- Aucun secret reçu, lu ou enregistré par l'assistant.


### 31.7 Correction de transmission avant exécution

Avant l'envoi à l'opérateur, le bloc CMD a été réémis dans le document avec les échappements JavaScript exacts (`\r`, `\n`, `\u0003`, `\u007f`) afin que le script Node.js traite correctement les retours à la ligne et les touches d'annulation/suppression. Le prompt `SAISIE MASQUEE` est affiché avant l'activation du mode brut. Cette correction documentaire ne constitue pas une exécution du script et ne change aucun statut de test.


---

## 32. Suspension de la commande V5 avant saisie de la clé — V2.28 — 8 novembre 2026

### 32.1 Retour opérateur et clarification

L'opérateur signale que la commande V5 affiche une demande de coller la valeur de la clé historique `service_role`. C'est bien le comportement prévu par le code transmis au §31.3 : le script attend une saisie masquée dans le terminal local, puis utilise la valeur comme header `apikey` pour deux requêtes GET OpenAPI sur JOBLY-E2E.

Cette saisie n'a pas été effectuée selon le retour reçu à cette étape. Aucun élément ne permet d'affirmer que la clé a été fournie ou qu'une requête HTTP a été envoyée.

### 32.2 Décision de sécurité

**Suspendre la commande V5. Ne pas coller la clé et interrompre l'invite par Ctrl+C.**

La clé `service_role` est un secret privilégié. Le fait que la saisie soit masquée ne réduit pas les privilèges qu'obtient le processus qui la reçoit. La procédure V5 ne doit donc pas être poursuivie sur la seule base de l'instruction précédente. Réévaluer une méthode de vérification à privilèges minimaux avant toute nouvelle exécution.

Ne jamais transmettre cette clé dans le chat, un rapport, Git ou un autre canal. Ne pas utiliser une clé alternative, ne pas réactiver/régénérer/rotater de clé et ne modifier aucune configuration Supabase.

### 32.3 État exact du LOT-00

- Rapport V4 : le contrôle local a retourné `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]` ; aucune requête HTTP n'a été atteinte lors de cette exécution.
- Commande V5 : transmise avec une invite de saisie masquée, mais **suspendue avant saisie** à la demande de clarification opérateur.
- GET OpenAPI `public` : **NON CONFIRMÉ / aucun résultat reçu**.
- GET OpenAPI `net` : **NON CONFIRMÉ / aucun résultat reçu**.
- Exposition du schéma `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun smoke Auth/runtime, navigateur, parcours croisé ou bulk n'est autorisé avant fermeture du LOT-00.
- Aucun accès JOBLY-PROD, aucune mutation de fixture, donnée, permission ou configuration Supabase.
- `main` inchangée ; PR #266 reste ouverte en brouillon et non fusionnée ; aucun déploiement.

### 32.4 Preuve et correction documentaire

- Déclaration opérateur : « Il me demande de coller la valeur de la clé service role historique ».
- Code de commande transmis au §31.3 : invite masquée suivie de l'utilisation de la valeur dans le header `apikey`.
- Décision communiquée : ne pas saisir la clé et interrompre la commande.
- Cette section prévaut sur toute instruction antérieure du §31 qui demanderait de coller la clé pour exécuter V5. Le §31 est conservé pour traçabilité, mais sa commande est **SUSPENDUE — NE PAS EXÉCUTER**.


---

## 33. Nouvelle demande de retest et méthode de contrôle sans secret — V2.29 — 8 novembre 2026

### 33.1 Demande opérateur

L'opérateur demande de renvoyer la commande pour retester LOT-00. La commande V5 du §31 attend une clé historique `service_role` privilégiée et a été suspendue au §32 avant toute saisie. Cette suspension reste active : aucune invite de saisie de cette clé ne doit être relancée.

### 33.2 Contrôle sans clé recommandé

La documentation officielle Supabase indique que les schémas exposés se consultent dans les réglages API du projet : Dashboard JOBLY-E2E, `Project Settings > Data API > Exposed schemas` (route Dashboard documentée : `/dashboard/project/_/settings/api`). La documentation « Using Custom Schemas » précise qu'un schéma doit être ajouté à cette liste pour être exposé au Data API.

Procédure opérateur :
1. Ouvrir le projet Supabase JOBLY-E2E uniquement, ref `ofqqrryamslxoqkklraw`.
2. Ouvrir `Project Settings > Data API` puis consulter `Exposed schemas`.
3. Lire la liste sans la modifier et sans cliquer sur Save.
4. Communiquer uniquement si `net` figure dans la liste, et éventuellement la liste des noms de schémas non sensibles.
5. Ne pas ouvrir ni consulter JOBLY-PROD ; ne saisir aucune clé API.

**Limite de cette méthode :** la liste Dashboard établit la configuration visible dans le panneau. La documentation Supabase signale qu'un réglage manuel tel que `ALTER ROLE authenticator SET pgrst.db_schemas` empêche le Dashboard de gérer cette configuration ; si un tel override existe, il faut le documenter séparément avant de conclure que la configuration effective correspond à la liste UI.

### 33.3 Décision sur la commande

- Aucune nouvelle commande CMD avec `service_role` n'est transmise dans cette étape.
- Ne pas exécuter la commande V5 du §31 ; elle reste suspendue.
- Ne pas remplacer la clé par `anon`, publishable, `sb_secret_…` ou une clé JOBLY-PROD.
- Ne pas effectuer de requête Auth, SQL, RPC, Storage, de table, ni aucun changement de schéma/grant/configuration.
- La prochaine donnée attendue est la présence/absence de `net` dans la liste Dashboard Exposed schemas.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à revue du réglage affiché et de tout éventuel override PostgREST.
- Aucun GET OpenAPI, aucun test runtime, aucun navigateur et aucun bulk n'est attesté par cette mise à jour.

### 33.4 Sources et preuves

- Demande opérateur : « Renvoi la commande pour retester. »
- Document source avant édition : V2.28, blob SHA `b1d337e8d1aa4e661ebcc32f4061d118fd18e275`, branche `e2e/recette`.
- Supabase Docs, `Using Custom Schemas` : `https://supabase.com/docs/guides/api/using-custom-schemas`, consulté le 8 novembre 2026 ; étapes d'ajout à `API settings > Exposed schemas`.
- Supabase Docs, `API Keys` : `https://supabase.com/docs/guides/getting-started/api-keys`, consulté le 8 novembre 2026 ; `service_role` est l'ancienne clé élevée qui correspond au rôle privilégié, la clé secret actuelle donne accès complet et bypass RLS.
- Supabase Knowledge Base, `PGRST002 / schema cache` : `https://supabase.com/kb/troubleshooting/postgrest-error-pgrst002-could-not-query-the-database-for-the-schema-cache-c396e9`, consulté le 8 novembre 2026 ; un override `ALTER ROLE authenticator SET pgrst.db_schemas` fait que Dashboard n'est plus l'interface gestionnaire du réglage.
- Aucun secret reçu, lu, copié, transmis ou écrit ; aucune requête vers JOBLY-E2E effectuée par l'assistant dans ce tour ; aucun accès JOBLY-PROD, aucune modification Supabase ou des fixtures.
- `main` inchangée ; PR #266 maintenue ouverte en brouillon et non fusionnée ; aucun déploiement.


---

## 34. Refus du contrôle Dashboard seul et nouvelle commande de retest V6 — V2.30 — 8 novembre 2026

### 34.1 Décision opérateur

Après proposition d'un contrôle manuel du Dashboard, l'opérateur répond « non » et réitère sa demande de disposer d'une commande de retest. Interprétation opérationnelle : il souhaite poursuivre le contrôle depuis le Node.js Command Prompt, plutôt que relever manuellement la liste Exposed schemas.

La V5 du §31 demeure suspendue et ne doit pas être relancée telle quelle. Une nouvelle commande V6, avec un nom de rapport inédit, est transmise à la demande explicite de l'opérateur. Elle est conditionnée à l'utilisation exclusive de la clé historique `service_role` de JOBLY-E2E, si celle-ci est active et correspond bien au projet et au rôle attendus.

### 34.2 Contrôles de sécurité de la V6

- La saisie est masquée dans le terminal local ; la valeur n'est pas écrite dans le rapport ni affichée.
- Le script exige le préfixe JWT historique `eyJ`, puis contrôle les claims `role=service_role` et `ref=ofqqrryamslxoqkklraw`.
- En cas de format/claims non conformes, aucun appel HTTP n'est émis.
- Si les validations passent, le script exécute exactement deux requêtes GET au endpoint racine REST de JOBLY-E2E : `Accept-Profile: public`, puis `Accept-Profile: net`, avec le header `apikey` uniquement.
- Il n'effectue aucun appel Authorization Bearer, Auth, table, SQL, RPC, Storage, `net.http_*` ou aucune écriture.
- Le rapport local neuf est `feedback-lot00-net-schema-exposure-v6-20261108.txt` ; il est protégé contre l'écrasement et ouvert dans Notepad après l'exécution.
- N'utiliser aucune clé provenant de JOBLY-PROD, aucun autre type de clé et ne jamais transmettre la clé dans le chat. Si la ligne historique n'est pas confirmée Active ou si l'opérateur n'est pas certain qu'il s'agit du secret JOBLY-E2E, arrêter sans saisie.

### 34.3 Commande CMD remise à l'opérateur

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v6-20261108.txt (
  echo Rapport V6 deja present : conservation, aucune nouvelle execution.
) else (
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v6-20261108.txt';function save(rows,gate,error=''){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','credential_type=legacy_service_role','results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\\r\\n')+'\\r\\n',{flag:'wx'});for(const line of lines)out.write(line+'\\n');out.write('REPORT='+report+'\\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){out.write('TTY_REQUIRED - ouvrir Node.js Command Prompt.\\n');save([],'BLOCKED_REVIEW_REQUIRED','TTY_REQUIRED');process.exit(2)}let key='';out.write('\\nSAISIE MASQUEE : colle la cle service_role historique ACTIVE de JOBLY-E2E, puis appuie sur Entree. Aucun caractere ne sera affiche : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\\u0003'){input.setRawMode(false);input.pause();key='';out.write('\\nCANCELLED\\n');save([],'BLOCKED_REVIEW_REQUIRED','CANCELLED');process.exit(2)}if(ch==='\\r'||ch==='\\n'){input.setRawMode(false);input.pause();out.write('\\n');const k=key.trim();key='';if(!k){save([],'BLOCKED_REVIEW_REQUIRED','KEY_EMPTY');return}run(k);return}if(ch==='\\u007f'||ch==='\\b')key=key.slice(0,-1);else if(ch>=' ')key+=ch}});async function run(k){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const p=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(p.role!=='service_role'||p.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net'),pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED')}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message)}finally{k=''}}"
)
if exist feedback-lot00-net-schema-exposure-v6-20261108.txt notepad feedback-lot00-net-schema-exposure-v6-20261108.txt
```

Après lancement, le terminal doit afficher `SAISIE MASQUEE`. L'opérateur colle la valeur uniquement dans le terminal local puis appuie sur Entrée ; aucun caractère ne doit apparaître. Si `TTY_REQUIRED` s'affiche, ne pas saisir la clé. Le raccourci `Ctrl+C` annule la saisie.

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-net-schema-exposure-v6-20261108.txt
```

### 34.4 Lecture et statut

- Seule la paire `public: HTTP 200 avec OpenAPI` et `net: HTTP 406 / PGRST106` donne `PASS_NET_NOT_EXPOSED`.
- Toute autre réponse reste `BLOCKED_REVIEW_REQUIRED`.
- Transmettre seulement `results`, `GATE`, `error` et `REPORT`, jamais la clé ou un header.
- Tant qu'un rapport V6 valide n'est pas reçu et examiné, LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** et aucun smoke runtime, navigateur, parcours croisé ou bulk n'est autorisé.

### 34.5 État à la transmission

- V6 : **TRANSMISE, NON EXÉCUTÉE** par l'assistant ; aucun résultat n'est anticipé.
- V5 : reste suspendue, conservée pour traçabilité.
- Aucun GET OpenAPI, aucune connexion Auth ou autre requête JOBLY-E2E effectuée par l'assistant dans ce tour.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 34.6 Preuves

- Réponse opérateur au contrôle Dashboard-only : « non » ; il demande à nouveau la commande de retest.
- Document source avant édition : V2.29, blob SHA `cfaf33aa38a525a4d7b99396ac05002a1124f1c1`, branche `e2e/recette`.
- Procédure V5 suspendue au §32 ; nouveau rapport V6 distinct de V3/V4/V5.
- Aucun secret reçu, lu ou enregistré par l'assistant.


---

## 35. Résultat de la commande V6 et analyse de la capture opérateur — V2.31 — 8 novembre 2026

### 35.1 Preuve reçue

L'opérateur transmet une capture du Node.js Command Prompt ouvert sur le Dashboard du projet JOBLY-E2E. Le terminal affiche :

```text
SAISIE MASQUEE : colle la cle service_role historique ACTIVE de JOBLY-E2E, puis appuie sur Entree.
node=v26.13.0
project_ref=ofqqrryamslxoqkklraw
credential_type=legacy_service_role
results=[]
GATE=BLOCKED_REVIEW_REQUIRED
error=Error: KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT
REPORT=feedback-lot00-net-schema-exposure-v6-20261108.txt
```

La capture montre également que l'onglet du Dashboard ouvert est **API Keys (Legacy)** et que le bouton visible est **Disable legacy API keys**. Cela indique que les clés JWT historiques sont activées globalement dans ce projet. La capture ne permet pas de lire ni de certifier la valeur de la clé copiée, ni d'établir son préfixe, son rôle ou son projet.

### 35.2 Interprétation exacte

- L'invite de saisie masquée s'est bien affichée ; le script V6 a donc franchi le contrôle TTY.
- Le script a reçu une chaîne qui ne commence pas par `eyJ` (ou une chaîne vide après traitement). Le contrôle `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT` l'a rejetée avant toute requête réseau.
- `results=[]` confirme qu'aucun statut HTTP n'a été obtenu.
- Les GET OpenAPI pour `public` et `net` n'ont pas été exécutés.
- `credential_type=legacy_service_role` est une étiquette constante du rapport et ne certifie pas la valeur saisie.
- La présence du bouton **Disable legacy API keys** confirme l'activation globale des clés historiques, mais pas que la valeur effectivement collée est la clé JWT `service_role` attendue.

### 35.3 Prochaine action — aucune nouvelle saisie à l'aveugle

Ne pas relancer V6 immédiatement avec la même valeur. Ne pas transmettre la clé au chat, à Notepad, à un rapport ou à Git. Ne pas utiliser `anon`, `sb_secret_…`, une clé d'un autre projet ou une clé JOBLY-PROD. Ne pas désactiver, réactiver, recréer ou faire tourner les clés.

Avant une nouvelle tentative, l'opérateur doit seulement confirmer visuellement, dans l'onglet **API Keys (Legacy)** du projet **JOBLY-E2E**, qu'il a sélectionné la ligne `service_role` et copié sa valeur JWT historique, et non une valeur de l'onglet API Keys moderne ou un autre champ. Si l'interface ne permet pas d'identifier le bon type sans exposer le secret, ne pas poursuivre.

La capture ne justifie pas de changer le script ni d'élargir les autorisations. Une seule tentative ultérieure ne serait envisageable qu'après confirmation locale du bon champ ; aucun secret ne doit être partagé.

### 35.4 État LOT-00

- Invite masquée V6 : **AFFICHÉE**.
- Précontrôle de format : **BLOCKED** — `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- GET OpenAPI `public` : **NON EXÉCUTÉ**.
- GET OpenAPI `net` : **NON EXÉCUTÉ**.
- Exposition de `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun runtime Auth, navigateur, parcours croisé ou bulk ne peut reprendre avant la clôture du LOT-00.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Aucune valeur de secret n'a été visible ni communiquée à l'assistant ; aucune requête Supabase n'a été effectuée par l'assistant dans ce tour.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 35.5 Preuves et traçabilité

- Capture utilisateur reçue le 8 novembre 2026 : invite masquée visible, rapport V6 et erreur de format reproduits au §35.1 ; onglet **API Keys (Legacy)** et bouton **Disable legacy API keys** visibles.
- Rapport V6 local : `feedback-lot00-net-schema-exposure-v6-20261108.txt`, contenu non secret visible dans la capture.
- Document source avant cette mise à jour : V2.30, blob SHA `62af041ff871f191fe4416d05ce37469868a5f76`, branche `e2e/recette`.
- Aucune valeur de clé, aucun en-tête `apikey` et aucun jeton n'ont été reçus.


---

## 36. Clarification opérateur sur la clé copiée après l'erreur V6 — V2.32 — 8 novembre 2026

### 36.1 Déclaration reçue

L'opérateur indique : « j'ai copier celle de service role anon ». La formulation ne permet pas de déterminer de manière certaine s'il confirme avoir cliqué sur Copier en face de `service_role`, s'il parle de la ligne `anon`, ou s'il désigne les deux clés.

### 36.2 État technique inchangé

- Le rapport V6 reçu en capture reste : `results=[]`, `GATE=BLOCKED_REVIEW_REQUIRED`, `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- Le script a reçu une chaîne vide ou une chaîne qui ne commence pas par `eyJ`; il s'est arrêté avant validation des claims et avant toute requête HTTP.
- Les clés Legacy `anon` et `service_role` sont distinctes. La sélection de `anon` ne satisferait pas le contrôle de rôle même si son format JWT commençait également par `eyJ`.
- La capture confirme le bouton de désactivation des clés Legacy, mais ne montre pas quelle ligne a été copiée ni la valeur utilisée.

### 36.3 Prochaine clarification

Demander uniquement quelle ligne a été copiée : `service_role` ou `anon`. Ne pas demander la valeur, un extrait, une capture montrant le secret, ni un copier-coller de la clé. Ne pas relancer V6 avant cette clarification. Aucun changement de clé, réactivation, rotation ou modification Supabase n'est autorisé.

### 36.4 Statut

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- Exposition de `net` : **NON DÉTERMINÉE**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.
- Aucun secret reçu par l'assistant.

### 36.5 Preuves

- Déclaration opérateur : « j'ai copier celle de service role anon ».
- Rapport V6 présenté dans la capture utilisateur et analysé au §35.1.
- Document source avant cette mise à jour : V2.31, blob SHA `3ba90a1a914ba7a5f2fffafa5d99c3b96c3db9c9`, branche `e2e/recette`.


---

## 37. Confirmation visuelle de la ligne service_role — V2.33 — 8 novembre 2026

### 37.1 Nouvelle preuve opérateur

L'opérateur transmet une capture rapprochée de la ligne d'API Key affichant :
- label `service_role` ;
- badge de type `secret` ;
- champ de valeur masqué ;
- avertissement Supabase indiquant que cette clé peut contourner RLS.

La capture précédente du Dashboard montrait l'onglet **API Keys (Legacy)**. Ensemble, ces éléments confirment que l'opérateur a identifié la ligne historique `service_role`, et non la ligne `anon`.

### 37.2 Ce que cette capture ne prouve pas

- Le badge UI `secret` est une étiquette de catégorie/sensibilité ; ce n'est pas le préfixe ni le contenu de la valeur.
- La valeur étant masquée, la capture ne permet pas de vérifier ses trois premiers caractères ni de confirmer qu'il s'agit du JWT historique attendu.
- Le rapport V6 reste `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]`. Le terminal a reçu une chaîne non vide qui ne commence pas par `eyJ` après `trim()` ; aucun GET OpenAPI n'a été envoyé.
- La sélection visuelle de la ligne est désormais confirmée ; le format de la valeur copiée et son arrivée intacte dans le terminal ne le sont pas.

### 37.3 Diagnostic minimal restant

Demander à l'opérateur de vérifier uniquement le préfixe des trois premiers caractères en cliquant, si nécessaire, sur **Reveal** dans le Dashboard JOBLY-E2E, sans capturer l'écran ni copier la valeur dans le chat :
- si les trois premiers caractères sont `eyJ`, répondre uniquement `PREFIX=eyJ` ;
- sinon répondre uniquement `PREFIX_DIFFERENT`.

Ne jamais transmettre les caractères suivants, le JWT, une capture révélant la clé ou toute autre partie du secret. Ne pas relancer V6 avant ce contrôle local. Aucun essai avec `anon`, `sb_secret_…`, une clé d'un autre projet ou JOBLY-PROD. Aucune rotation/régénération/réactivation n'est autorisée.

### 37.4 État LOT-00

- Ligne sélectionnée : **service_role — confirmée visuellement**.
- Format JWT de la valeur : **NON VÉRIFIÉ**.
- Précontrôle V6 : **BLOCKED** — `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- Exposition effective du schéma `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- Aucun secret reçu, affiché ou enregistré par l'assistant.
- `main` inchangée ; PR #266 ouverte, en brouillon et non fusionnée ; aucun déploiement.

### 37.5 Preuves et traçabilité

- Capture opérateur du 8 novembre 2026 : ligne `service_role`, badge `secret`, valeur masquée, avertissement RLS.
- Capture précédente : onglet Dashboard `API Keys (Legacy)` et sortie terminal V6.
- Rapport V6 reproduit au §35.1.
- Document source avant cette mise à jour : V2.32, blob SHA `750fd141b3eef92a0e9f12de97f9e763e3e9c07c`, branche `e2e/recette`.
- Aucune valeur de clé ni aucun préfixe n'ont été reçus à cette étape.


---

## 38. Préfixe partiel communiqué — V2.34 — 8 novembre 2026

### 38.1 Retour opérateur

À la demande de vérifier localement les trois premiers caractères de la valeur, l'opérateur répond uniquement `ey`.

### 38.2 Interprétation

- Le préfixe complet `eyJ` est désormais confirmé par l'opérateur.
- Le script V6 vérifie précisément `startsWith('eyJ')`; le rapport antérieur indique qu'il a reçu une chaîne vide ou ne commençant pas par cette séquence.
- Aucune conclusion ne peut être tirée du seul préfixe partiel `ey`. Il ne faut pas demander à l'opérateur de communiquer d'autres caractères de la clé.

### 38.3 Étape suivante

L'opérateur peut vérifier lui-même, dans le Dashboard JOBLY-E2E, si le troisième caractère est exactement `J`, sans communiquer la valeur ni aucun autre caractère. Il répond uniquement `PREFIX_OK` si les trois caractères sont `eyJ`, ou `PREFIX_NO` dans le cas contraire. Ne pas relancer le script avant cette clarification, ne pas copier la valeur dans le chat et ne pas modifier ni régénérer la clé.

### 38.4 Statut

- Ligne Legacy `service_role` : confirmée visuellement au §37.
- Préfixe complet `eyJ` : **CONFIRMÉ PAR L'OPÉRATEUR**.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun secret complet reçu ; aucun accès JOBLY-PROD, aucune modification de fixture, donnée, permission ou configuration Supabase.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 38.5 Preuves

- Déclaration opérateur : `ey`.
- Document source avant cette mise à jour : V2.33, blob SHA `c5257d9eb998c20863072e25f751b36c3cfe7fa3`, branche `e2e/recette`.


---

## 39. Réponse « ok » — préfixe JWT toujours non confirmé — V2.35 — 8 novembre 2026

### 39.1 Retour opérateur

Après demande de confirmer si le troisième caractère de la valeur masquée est `J`, l'opérateur répond uniquement « ok ».

### 39.2 Limite de l'information reçue

Cette réponse accuse réception de la consigne, mais ne confirme pas explicitement le résultat du contrôle local. Le préfixe complet `eyJ` est confirmé ; le désaccord porte sur la chaîne capturée par le programme, pas sur le préfixe visible dans le Dashboard. Aucun caractère supplémentaire de la clé ne doit être demandé ou communiqué.

### 39.3 Prochaine étape

Demander une réponse non ambiguë après vérification locale : `PREFIX_OK` si les trois premiers caractères sont `eyJ`, sinon `PREFIX_NO`. Ne pas relancer la V6 avant cette confirmation. Ne jamais transmettre la clé ou un extrait plus long.

### 39.4 État LOT-00

- Ligne Legacy `service_role` : confirmée visuellement au §37.
- Préfixe complet `eyJ` : **CONFIRMÉ PAR L'OPÉRATEUR**.
- Rapport V6 : `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, `results=[]`.
- GET OpenAPI `public` et `net` : **NON EXÉCUTÉS**.
- Exposition effective de `net` : **NON DÉTERMINÉE**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun accès JOBLY-PROD ; aucune fixture, donnée, permission ou configuration Supabase modifiée.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 39.5 Preuves

- Réponse opérateur : « ok ».
- Demande précédente : confirmer localement le troisième caractère sans partager la valeur.
- Document source avant cette mise à jour : V2.34, blob SHA `5ebe225a8d84426766168e40c2a27074fc266f83`, branche `e2e/recette`.


---

## 40. Audit contradictoire du rejet V6 et correction du parseur de saisie — V2.36 — 8 novembre 2026

### 40.1 Faits désormais établis

- L'opérateur confirme avoir sélectionné la ligne **service_role** dans **API Keys (Legacy)** (§37).
- L'opérateur confirme maintenant que la valeur révélée commence bien par `eyJ`.
- La capture V6 établit que l'invite masquée s'est affichée et que le rapport indique `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT` avec `results=[]`.
- Le V6 vérifie d'abord `if(!k)` et émet `KEY_EMPTY` en cas de saisie vide ; il appelle ensuite `run(k)`, dont le test `!k.startsWith('eyJ')` émet `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`. Puisque c'est cette dernière erreur qui apparaît, la chaîne capturée était **non vide** et ne commençait pas par `eyJ` après `.trim()`. Le diagnostic précédent « chaîne vide ou mauvais préfixe » était trop large : la branche vide est exclue pour ce rapport précis.
- Le précontrôle a arrêté l'exécution avant décodage des claims `role`/`ref` et avant les requêtes HTTP. Le rôle, le projet, la signature et l'acceptation serveur n'ont donc pas été testés.

### 40.2 Contradiction logique

Si la valeur du champ Legacy service_role commence par `eyJ`, mais que `k.startsWith('eyJ')` est faux, le contenu transmis à `run(k)` n'est pas identique au début visible dans le Dashboard. Le problème se situe donc avant le contrôle JWT : copie presse-papiers, transport terminal ou traitement du buffer d'entrée. Le rapport V6 ne journalise aucun indicateur permettant de distinguer ces causes.

### 40.3 Défaut précis trouvé dans le parseur V6

Le V6 construit la chaîne ainsi :

```js
if (ch === '\\u007f' || ch === '\\b') key = key.slice(0, -1);
else if (ch >= ' ') key += ch;
```

Cette logique ignore tous les caractères de contrôle séparément. Sur un terminal qui encadre un collage par le marqueur bracketed-paste `ESC[200~`, le caractère ESC (code 27) est ignoré car il est inférieur à l'espace, tandis que les caractères imprimables `[200~` sont ajoutés à `key`. La chaîne obtenue commence alors par `[200~eyJ...` et déclenche exactement `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, même si le secret sous-jacent commence correctement par `eyJ`.

**Reproduction synthétique effectuée hors de JOBLY, sans secret réel :** la logique de capture V6 appliquée à `ESC[200~eyJTEST.eyJTEST.eyJTESTESC[201~` donne un préfixe capturé `[200~` et échoue au contrôle `eyJ`. Un parseur qui conserve puis enlève le marqueur complet retrouve `eyJ`. C'est un mécanisme reproduisant exactement l'erreur. Il n'est pas démontré que ce marqueur a été envoyé lors du collage réel de l'opérateur ; il s'agit de l'hypothèse principale vérifiable.

La documentation Node décrit le mode raw comme un mode où les caractères sont livrés individuellement, sans écho et avec le traitement spécial du terminal désactivé. Un cas documenté dans Windows Terminal montre que les séquences d'échappement de collage peuvent arriver sous forme de touches Win32 (ESC, `[`, chiffres, `~`) en mode d'entrée Win32 ; cela rend le mécanisme crédible sur un terminal Windows, sans établir qu'il s'est produit ici.

### 40.4 Autres hypothèses encore ouvertes

1. Le terminal a injecté un marqueur de collage, dont le résidu imprimable précède le JWT — hypothèse principale, car elle reproduit exactement le rejet avec le code V6.
2. Le presse-papiers contenait un texte différent de la valeur révélée (ancien contenu, mauvaise action Copier, sélection incomplète).
3. Le buffer d'entrée a été modifié ou tronqué par le terminal avant la validation.

La capture V6 ne comporte ni longueur, ni indicateur de marqueur de collage, ni indicateur de préfixe normalisé. Elle ne permet donc pas de départager ces hypothèses. Il serait incorrect de conclure que la clé service_role est invalide ou expirée.

### 40.5 Correction proposée — commande V7

La V7 conserve le caractère ESC pendant la collecte, puis retire explicitement les marqueurs de collage complets `ESC[200~` et `ESC[201~`. Elle reconnaît aussi les variantes où le terminal a supprimé le caractère ESC mais laissé `[200~` ou `[201~`. Elle écrit uniquement des booléens de diagnostic (`paste_start_marker_detected`, `paste_end_marker_detected`, `normalized_prefix_ok`) dans le rapport. Aucune partie de la clé n'est journalisée.

- Le rapport est nouveau : `feedback-lot00-net-schema-exposure-v7-20261108.txt`.
- Le V7 conserve les contrôles `role=service_role` et `ref=ofqqrryamslxoqkklraw`.
- Il n'effectue que les deux GET OpenAPI JOBLY-E2E `public` et `net`, uniquement après validation locale du préfixe et des claims.
- Le critère PASS reste exactement : `public=200` avec OpenAPI et `net=406/PGRST106`.
- Aucune clé alternative, aucune écriture, aucun Auth, SQL, RPC, Storage, `net.http_*` ou accès JOBLY-PROD.

### 40.6 Commande CMD V7 transmise

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-net-schema-exposure-v7-20261108.txt (
  echo Rapport V7 deja present : conservation, aucune nouvelle execution.
) else (
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-net-schema-exposure-v7-20261108.txt';function save(rows,gate,error='',meta={}){const lines=['node='+process.version,'project_ref=ofqqrryamslxoqkklraw','expected_credential_type=legacy_service_role','paste_start_marker_detected='+Boolean(meta.pasteStart),'paste_end_marker_detected='+Boolean(meta.pasteEnd),'normalized_prefix_ok='+Boolean(meta.prefixOk),'results='+JSON.stringify(rows),'GATE='+gate];if(error)lines.push('error='+error);fs.writeFileSync(report,lines.join('\r\n')+'\r\n',{flag:'wx'});for(const line of lines)out.write(line+'\n');out.write('REPORT='+report+'\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){out.write('TTY_REQUIRED - ouvrir Node.js Command Prompt.\n');save([],'BLOCKED_REVIEW_REQUIRED','TTY_REQUIRED');process.exit(2)}let key='';out.write('\nSAISIE MASQUEE V7 : colle la cle service_role historique JOBLY-E2E puis appuie sur Entree. Aucun caractere ne sera affiche : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();key='';out.write('\nCANCELLED\n');save([],'BLOCKED_REVIEW_REQUIRED','CANCELLED');return}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();out.write('\n');let raw=key;key='';raw=raw.replace(/^\uFEFF/,'').trim();const pasteStart=/^(?:\u001b)?\[200~/.test(raw);const pasteEnd=/(?:\u001b)?\[201~$/.test(raw);let normalized=raw.replace(/^(?:\u001b)?\[200~/,'').replace(/(?:\u001b)?\[201~$/,'').trim();const meta={pasteStart,pasteEnd,prefixOk:normalized.startsWith('eyJ')};if(!normalized){save([],'BLOCKED_REVIEW_REQUIRED','KEY_EMPTY',meta);raw='';normalized='';return}run(normalized,meta);raw='';normalized='';return}if(ch==='\u007f'||ch==='\b')key=key.slice(0,-1);else if(ch==='\u001b'||ch>=' ')key+=ch}});async function run(k,meta){const rows=[];try{if(!k.startsWith('eyJ'))throw Error('KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT');const payload=JSON.parse(Buffer.from(k.split('.')[1]||'','base64url').toString('utf8'));if(payload.role!=='service_role'||payload.ref!=='ofqqrryamslxoqkklraw')throw Error('KEY_PROJECT_OR_ROLE_MISMATCH');for(const schema of ['public','net']){const r=await fetch('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/',{method:'GET',headers:{apikey:k,Accept:'application/openapi+json','Accept-Profile':schema},signal:AbortSignal.timeout(20000)});const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}rows.push({schema,status:r.status,apiSchemaAccepted:r.ok,openapi:!!(j.openapi||j.swagger),code:j.code??null,message:typeof j.message==='string'?j.message.slice(0,160):null})}const pub=rows.find(x=>x.schema==='public'),net=rows.find(x=>x.schema==='net'),pass=!!(pub&&pub.status===200&&pub.openapi&&net&&net.status===406&&net.code==='PGRST106');save(rows,pass?'PASS_NET_NOT_EXPOSED':'BLOCKED_REVIEW_REQUIRED','',meta)}catch(e){save(rows,'BLOCKED_REVIEW_REQUIRED',e.name+': '+e.message,meta)}finally{k=''}}"
)
if exist feedback-lot00-net-schema-exposure-v7-20261108.txt notepad feedback-lot00-net-schema-exposure-v7-20261108.txt
```

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-net-schema-exposure-v7-20261108.txt
```

Le terminal doit afficher `SAISIE MASQUEE V7`. La clé est saisie uniquement dans le terminal local. Transmettre le rapport non secret uniquement. Si V7 retourne encore `KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT`, le champ `paste_start_marker_detected` et `normalized_prefix_ok` permettra de savoir si le marqueur explique le problème. Si `normalized_prefix_ok=true` mais que les claims échouent, le résultat sera `KEY_PROJECT_OR_ROLE_MISMATCH`, distinct du problème actuel.

### 40.7 Statut et limites

- Préfixe affiché dans le Dashboard : `eyJ` **confirmé par l'opérateur**.
- V6 : **échoué au parseur local avant décodage claims et avant réseau**.
- La simulation [200~ reproduit l'erreur V6, mais la V7 n'a observé aucun marqueur de collage. Cette hypothèse n'explique donc pas à elle seule le résultat V7 ; cause réelle locale encore inconnue.
- V7 : **exécutée par l'opérateur, rejetée avant HTTP**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` et `net` : toujours **NON EXÉCUTÉS** à ce stade.
- Aucun secret reçu ni stocké par l'assistant ; aucun appel JOBLY-PROD ; aucune mutation Supabase ou fixture.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 40.8 Sources et preuves

- Code V6 de référence au §34.3 : branche collecte `else if(ch>=' ') key+=ch`, précontrôle `startsWith('eyJ')`, branche `KEY_EMPTY` séparée.
- Reproduction Node.js locale synthétique : séquence de collage avec marqueurs et valeur factice, sans secret réel ni appel réseau ; le parseur V6 reproduit le rejet et le parseur V7 restaure le préfixe.
- Supabase JWT Claims Reference : `https://supabase.com/docs/guides/auth/jwt-fields` ; le JWT service_role inclut les claims `role=service_role` et `ref`.
- Supabase API Keys : `https://supabase.com/docs/guides/getting-started/api-keys` ; `service_role` est une clé legacy de format JWT à privilèges élevés.
- Node.js TTY : `https://nodejs.org/api/tty.html` ; décrit le mode raw et son traitement caractère par caractère sans écho.
- Microsoft Windows Terminal issue #17656 : `https://github.com/microsoft/terminal/issues/17656` ; décrit le passage de séquences d'échappement de collage sous forme de touches en entrée Win32.
- Rapport V6 transmis en capture : §35.1 ; préfixe confirmé ensuite par l'opérateur : déclaration « je confirme » après demande de vérifier `eyJ`.
- Document source avant cette mise à jour : V2.35, blob SHA `5453278abae577170907691dd84094caa5791eb3`, branche `e2e/recette`.

---

## 41. Résultat V7 sans marqueur de collage et isolation du presse-papiers — V2.37 — 8 novembre 2026

### 41.1 Résultat non secret transmis

L'opérateur transmet le rapport : node=v26.13.0 ; project_ref=ofqqrryamslxoqkklraw ; expected_credential_type=legacy_service_role ; paste_start_marker_detected=false ; paste_end_marker_detected=false ; normalized_prefix_ok=false ; results=[] ; GATE=BLOCKED_REVIEW_REQUIRED ; error=KEY_FORMAT_INVALID_EXPECTED_LEGACY_JWT.

### 41.2 Ce que ce rapport prouve

- La V7 s'est exécutée et le contrôle TTY a été franchi.
- Aucun marqueur de collage reconnu n'a été présent au début ou à la fin de la chaîne reçue.
- Après normalisation, la chaîne capturée ne commence toujours pas par eyJ.
- Les deux requêtes OpenAPI n'ont pas démarré ; results=[].
- Le problème est toujours avant le réseau et avant le décodage des claims JWT.
- L'hypothèse [200~ n'est pas confirmée pour ce run V7.
- Le rapport ne révèle pas la valeur saisie, la longueur capturée ni le premier caractère ; la cause exacte reste inconnue.

### 41.3 Raisonnement par contradiction révisé

L'opérateur confirme que la valeur révélée dans la ligne Legacy service_role commence par eyJ. V7 confirme qu'après collecte et normalisation, la chaîne capturée ne commence pas par eyJ, sans marqueur de collage détecté.

Ces constats situent le défaut dans le parcours local : champ révélé dans le Dashboard ; action Copier / presse-papiers Windows ; transmission du presse-papiers au terminal en mode raw ; accumulation des événements par process.stdin ; normalisation et validation startsWith('eyJ'). Supabase, les claims role/ref et le Data API ne sont pas encore atteints.

### 41.4 Test discriminant sans secret

Avant une nouvelle méthode de saisie de clé, tester le transport terminal avec une chaîne factice placée automatiquement dans le presse-papiers avec la commande Windows clip. Le test utilise le même setRawMode(true) et le même traitement de buffer ; la seule donnée saisie est JOBLY-CLIP-TEST-7A91.

- sentinel_exact_match=true : le terminal sait coller un texte factice dans ce mode ; il faudra ensuite isoler le contenu du presse-papiers au moment du collage de la clé, sans jamais le journaliser.
- sentinel_exact_match=false : le chemin clipboard/TTY raw est en cause ; abandonner ce mode de saisie de clé.
- Le test ne lit aucune clé ni variable d'environnement, ne contacte pas Supabase et n'écrit aucune donnée applicative.
- Le rapport ne contient que des booléens, une longueur non sensible et un statut PASS/BLOCKED.

### 41.5 Commande CMD du test factice

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-input-transport-probe-20261108.txt (
  echo Rapport du test presse-papiers deja present : conservation.
) else (
  echo JOBLY-CLIP-TEST-7A91|clip
  node -e "const fs=require('node:fs'),input=process.stdin,out=process.stdout,report='feedback-lot00-input-transport-probe-20261108.txt',expected='JOBLY-CLIP-TEST-7A91';function save(r){fs.writeFileSync(report,['node='+process.version,'probe=clipboard_raw_tty','paste_start_marker_detected='+r.start,'paste_end_marker_detected='+r.end,'input_length='+r.length,'sentinel_exact_match='+r.match,'GATE='+(r.match?'PASS_CLIPBOARD_RAW_INPUT':'BLOCKED_INPUT_TRANSPORT')].join('\r\n')+'\r\n',{flag:'wx'});out.write('paste_start_marker_detected='+r.start+'\n paste_end_marker_detected='+r.end+'\n input_length='+r.length+'\n sentinel_exact_match='+r.match+'\n GATE='+(r.match?'PASS_CLIPBOARD_RAW_INPUT':'BLOCKED_INPUT_TRANSPORT')+'\n REPORT='+report+'\n')}if(!input.isTTY||typeof input.setRawMode!=='function'){save({start:false,end:false,length:0,match:false});process.exit(2)}let raw='';out.write('\nTEST SANS SECRET : le texte factice est deja dans le presse-papiers. Appuie sur Ctrl+V (ou clic droit), puis Entree : ');input.setRawMode(true);input.resume();input.on('data',b=>{for(const ch of b.toString('utf8')){if(ch==='\u0003'){input.setRawMode(false);input.pause();raw='';save({start:false,end:false,length:0,match:false});return}if(ch==='\r'||ch==='\n'){input.setRawMode(false);input.pause();const t=raw.replace(/^\uFEFF/,'').trim(),start=/^(?:\u001b)?\[200~/.test(t),end=/(?:\u001b)?\[201~$/.test(t),n=t.replace(/^(?:\u001b)?\[200~/,'').replace(/(?:\u001b)?\[201~$/,'').trim();save({start,end,length:n.length,match:n===expected});raw='';return}if(ch==='\u007f'||ch==='\b')raw=raw.slice(0,-1);else if(ch==='\u001b'||ch>=' ')raw+=ch}})"
)
if exist feedback-lot00-input-transport-probe-20261108.txt notepad feedback-lot00-input-transport-probe-20261108.txt
```

Commande Notepad correspondante :
```bat
notepad feedback-lot00-input-transport-probe-20261108.txt
```

Le test place d'abord le texte factice dans le presse-papiers. À l'invite, appuyer sur Ctrl+V (ou utiliser le geste de collage disponible), puis Entrée. Ne saisir aucune clé.

### 41.6 Résultat attendu

- PASS_CLIPBOARD_RAW_INPUT : texte factice collé exactement.
- BLOCKED_INPUT_TRANSPORT : texte non reçu intact ; abandonner le lecteur Node raw et utiliser une méthode sécurisée compatible Windows avant toute nouvelle tentative de clé.

### 41.7 Statut LOT-00

- V6 : précontrôle local en échec ; aucun HTTP.
- V7 : précontrôle local en échec, sans marqueurs de collage détectés ; aucun HTTP.
- Préfixe eyJ affiché dans Dashboard : confirmé par l'opérateur.
- Préfixe reçu par le parseur V7 : non conforme.
- GET OpenAPI public et net : NON EXÉCUTÉS.
- LOT-00 : PARTIAL / BLOCKED_REVIEW_REQUIRED.
- Aucun secret reçu par l'assistant ; aucun accès JOBLY-PROD ; aucune mutation Supabase, fixture ou permission.
- main inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 41.8 Sources et preuves

- Rapport V7 transmis par l'opérateur.
- Code V7 enregistré au §40.6.
- Node.js TTY : https://nodejs.org/api/tty.html ; le mode raw désactive l'écho et le traitement spécial des caractères et délivre l'entrée caractère par caractère.
- Microsoft Terminal Clipboard.cpp : https://github.com/microsoft/terminal/blob/main/src/interactivity/win32/Clipboard.cpp ; le texte du presse-papiers est converti en événements d'entrée et peut être encadré par des marqueurs bracketed-paste.
- Microsoft Terminal issue #17656 : https://github.com/microsoft/terminal/issues/17656 ; décrit la représentation de marqueurs bracketed-paste en événements Win32.
- Document source avant cette mise à jour : V2.36, blob SHA ec80c4fc146468b3e0a989fed7b62338ddfbbd93, branche e2e/recette.

---

## 42. Contrôle direct du presse-papiers Windows — sans TTY raw — V2.39 — 8 novembre 2026

### 42.1 Motif

V7 a reçu normalized_prefix_ok=false et aucun marqueur de collage. Le préfixe visible dans le Dashboard est confirmé par l'opérateur comme eyJ. Pour départager la copie de la clé du transport clavier/TTY, cette étape lit directement le presse-papiers Windows avec PowerShell Get-Clipboard -Raw. La saisie Node.js en mode raw est ainsi complètement contournée.

Microsoft documente que Get-Clipboard récupère le contenu du presse-papiers, et que -Raw retourne le texte complet en une seule chaîne : https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-clipboard?view=powershell-5.1.

### 42.2 Ce que le contrôle vérifie

- présence d'un contenu presse-papiers non vide ;
- préfixe JWT eyJ ;
- trois segments JWT ;
- décodage JSON du payload ;
- claims role=service_role et ref=ofqqrryamslxoqkklraw.

Le rapport ne contient que des booléens, un statut et une erreur générique. Il ne contient ni clé, ni fragment, ni longueur de la clé, ni payload. Le script efface le presse-papiers après lecture. Aucun appel réseau, aucune requête Supabase, aucune authentification et aucune écriture n'est exécuté dans cette étape.

Cette vérification locale des claims ne valide pas la signature cryptographique du JWT et ne prouve pas son acceptation serveur. Elle permet uniquement de vérifier si la valeur copiée est bien formée et porte les identifiants attendus.

### 42.3 Commande CMD

Copier d'abord, avec le bouton Copier, la valeur de la ligne service_role dans Legacy API Keys du projet JOBLY-E2E. Ne pas la révéler à l'écran. Puis coller et exécuter le bloc CMD ci-dessous ; il lira directement le presse-papiers, sans demander de coller la clé dans le terminal.

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-clipboard-jwt-check-20261108.txt (
  echo Rapport du controle presse-papiers deja present : conservation.
) else (
  powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-jwt-check-20261108.txt';$k=$null;$parts=$null;$b64=$null;$payload=$null;$pt=$null;$prefix=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$err='';$cleared=$false;try{$k=Get-Clipboard -Raw;if([string]::IsNullOrWhiteSpace($k)){$err='CLIPBOARD_EMPTY'}else{$k=$k.Trim();$prefix=$k.StartsWith('eyJ');if($prefix){$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');if(($b64.Length % 4) -eq 1){$err='JWT_BASE64URL_INVALID'}else{while(($b64.Length % 4) -ne 0){$b64+='='};$pt=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $pt -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}else{$err='JWT_SEGMENT_COUNT_INVALID'}}else{$err='KEY_PREFIX_INVALID'}}}catch{$err='CLIPBOARD_READ_OR_JWT_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$pt=$null;try{Set-Clipboard -Value '';$cleared=$true}catch{}};$gate=if($prefix -and $three -and $json -and $role -and $ref){'PASS_CLIPBOARD_JWT_METADATA'}else{'BLOCKED_CLIPBOARD_COPY_OR_FORMAT'};$runtime='PowerShell '+$PSVersionTable.PSVersion.ToString();$lines=@('runtime='+$runtime,'project_ref=ofqqrryamslxoqkklraw','clipboard_prefix_eyJ='+$prefix,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_cleared='+$cleared,'GATE='+$gate,'error='+$err);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
)
if exist feedback-lot00-clipboard-jwt-check-20261108.txt notepad feedback-lot00-clipboard-jwt-check-20261108.txt
```

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-clipboard-jwt-check-20261108.txt
```

### 42.4 Lecture des résultats

- PASS_CLIPBOARD_JWT_METADATA : le presse-papiers contient une valeur JWT structurée avec role et ref attendus ; cela démontre que la copie est correcte et que les rejets précédents proviennent du chemin de saisie brut Node.js.
- BLOCKED_CLIPBOARD_COPY_OR_FORMAT : au moins un contrôle local échoue ; le message error et les booléens indiquent l'étape, sans révéler la valeur.
- clipboard_cleared=true : la tentative de nettoyage du presse-papiers a réussi.
- clipboard_cleared=false : nettoyer manuellement le presse-papiers Windows après le contrôle.

Après ce contrôle seulement, si les métadonnées sont correctes, la méthode suivante sera d'exécuter les deux GET OpenAPI depuis PowerShell en lisant directement le presse-papiers, toujours sans echo ni stockage du secret. Aucun endpoint ne doit être appelé avant validation de ce rapport local.

### 42.5 Statut LOT-00

- V6 : rejet local avant HTTP.
- V7 : rejet local avant HTTP ; marqueurs de collage non détectés ; normalized_prefix_ok=false.
- Préfixe révélé dans le Dashboard : eyJ confirmé par l'opérateur.
- Contrôle presse-papiers PowerShell : transmis, non exécuté.
- GET OpenAPI public et net : NON EXÉCUTÉS.
- LOT-00 : PARTIAL / BLOCKED_REVIEW_REQUIRED.
- Aucune clé reçue par l'assistant ; aucun accès JOBLY-PROD ; aucune mutation Supabase, fixture ou permission.
- main inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun déploiement.

### 42.6 Preuves et références

- Rapport V7 opérateur, reproduit au §41.1.
- Supabase JWT Claims Reference : https://supabase.com/docs/guides/auth/jwt-fields ; décrit role et ref comme claims des clés anon/service_role.
- Microsoft Learn Get-Clipboard : https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-clipboard?view=powershell-5.1 ; décrit l'accès au presse-papiers et le paramètre Raw.
- Document source avant cette mise à jour : V2.38, blob SHA dcdd5b1b2bc1de050207d908ef7c04472d6c8f22, branche e2e/recette.


---

## 43. Classification du contenu presse-papiers et remplacement vérifié — V2.40 — 8 novembre 2026

### 43.1 Résultat opérateur du §42

L'opérateur transmet :

```text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_prefix_eyJ=False
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_cleared=False
GATE=BLOCKED_CLIPBOARD_COPY_OR_FORMAT
error=KEY_PREFIX_INVALID
```

Le script a donc lu une valeur textuelle non vide (sinon il aurait produit `CLIPBOARD_EMPTY`) qui ne commençait pas par `eyJ`. Les contrôles JWT suivants n'ont pas pu s'effectuer. Cela ne prouve pas que la clé Supabase elle-même est invalide : le contenu du presse-papiers ne correspond pas au début confirmé dans le Dashboard.

### 43.2 Interprétation de clipboard_cleared=false

La version précédente a tenté `Set-Clipboard -Value ''` dans un bloc `catch` silencieux. Le rapport ne contient pas l'exception ; il est donc impossible de conclure si l'échec provient de la valeur vide, du cmdlet, d'un verrou du presse-papiers ou d'une autre cause. L'indicateur signifie seulement que le script n'a pas confirmé le nettoyage. Ne pas interpréter ce champ comme la preuve que Windows bloque l'accès au presse-papiers.

La documentation Microsoft décrit `Get-Clipboard -Raw` comme une lecture de l'entrée complète, et `Set-Clipboard -Value` comme un remplacement du contenu. La nouvelle procédure remplace par un texte sentinelle non secret et vérifie sa relecture, au lieu d'essayer d'écrire une chaîne vide.

### 43.3 Raisonnement par contradiction actualisé

- Le Dashboard affiche la bonne entrée Legacy `service_role`.
- L'opérateur confirme que la valeur révélée commence par `eyJ`.
- Le contrôle PowerShell a lu un texte qui ne commence pas par `eyJ`.
- Il y a donc divergence entre la valeur révélée et le contenu textuel présent dans le presse-papiers Windows au moment de la lecture.

Les causes encore compatibles avec les preuves sont :
1. Le bouton Copier n'a pas écrit la valeur dans le presse-papiers système (permission/échec d'écriture du navigateur).
2. Le presse-papiers contenait un autre texte ou une ancienne valeur.
3. Le bouton Copier a mis une donnée au format non textuel ou un contenu différent de celui affiché.

La preuve actuelle ne permet pas de choisir entre ces causes. Le mode raw Node.js est désormais secondaire : PowerShell a directement lu le presse-papiers et obtenu un contenu différent.

### 43.4 Diagnostic suivant

Après avoir cliqué sur Copier dans la ligne Legacy `service_role` JOBLY-E2E, lancer le bloc du §43.5. Il va uniquement classifier le presse-papiers :
- `LEGACY_JWT_CANDIDATE` si le texte commence par `eyJ` ;
- `MODERN_SECRET_KEY` s'il commence par `sb_secret_` ;
- `UI_LABEL_TEXT` si le presse-papiers contient seulement `service_role` ou `anon` ;
- `OTHER_TEXT` pour un autre contenu ;
- `EMPTY` si aucun texte n'est disponible.

Si le texte commence par eyJ, il vérifiera aussi le nombre de segments, le JSON du payload et les claims role/ref attendus. Il ne journalise jamais le contenu, le préfixe lui-même, les fragments ou le payload.

Dans tous les cas, il remplace enfin le presse-papiers par `JOBLY-CLIPBOARD-OVERWRITTEN` et vérifie la relecture. Ainsi, si le bouton Copier a bien placé le secret, ce test le retire ensuite du presse-papiers système.

### 43.5 Commande CMD V2.40

```bat
cd /d C:\Users\ASUS\Jobly
if exist feedback-lot00-clipboard-classification-20261108.txt (
  echo Rapport de classification presse-papiers deja present : conservation.
) else (
  powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-classification-20261108.txt';$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;$readError='NONE';$overwriteError='NONE';$hasText=$false;$prefix=$false;$modern=$false;$label=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$kind='UNKNOWN';$bucket='UNKNOWN';$overwritten=$false;try{$k=Get-Clipboard -Raw;$hasText=(-not [string]::IsNullOrWhiteSpace([string]$k));if(-not $hasText){$kind='EMPTY';$bucket='ZERO'}else{$k=([string]$k).Trim();$prefix=$k.StartsWith('eyJ');$modern=$k.StartsWith('sb_secret_');$label=($k -eq 'service_role' -or $k -eq 'anon');if($k.Length -lt 100){$bucket='LT100'}elseif($k.Length -lt 1000){$bucket='100_TO_999'}else{$bucket='GE1000'};if($prefix){$kind='LEGACY_JWT_CANDIDATE';$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');while(($b64.Length % 4) -ne 0){$b64+='='};$decoded=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $decoded -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}elseif($modern){$kind='MODERN_SECRET_KEY'}elseif($label){$kind='UI_LABEL_TEXT'}else{$kind='OTHER_TEXT'}}}catch{$readError='CLIPBOARD_READ_OR_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;try{Set-Clipboard -Value 'JOBLY-CLIPBOARD-OVERWRITTEN' -ErrorAction Stop;$check=Get-Clipboard -Raw;$overwritten=([string]$check -eq 'JOBLY-CLIPBOARD-OVERWRITTEN');$check=$null;if(-not $overwritten){$overwriteError='SENTINEL_READBACK_MISMATCH'}}catch{$overwriteError='CLIPBOARD_OVERWRITE_FAILED'}};$pass=($prefix -and $three -and $json -and $role -and $ref);$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'clipboard_equals_ui_label='+$label,'clipboard_length_bucket='+$bucket,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError;$gate=if($pass){'PASS_CLIPBOARD_JWT_METADATA'}else{'BLOCKED_CLIPBOARD_COPY_OR_FORMAT'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'clipboard_equals_ui_label='+$label,'clipboard_length_bucket='+$bucket,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
)
if exist feedback-lot00-clipboard-classification-20261108.txt notepad feedback-lot00-clipboard-classification-20261108.txt
```

**Commande Notepad correspondante :**
```bat
notepad feedback-lot00-clipboard-classification-20261108.txt
```

### 43.6 Lecture du rapport

- `clipboard_kind=LEGACY_JWT_CANDIDATE` avec `role_service_role=true` et `project_ref_match=true` : la copie système correspond bien à la legacy service_role JOBLY-E2E ; la prochaine étape pourra lancer les deux GET OpenAPI depuis PowerShell, sans repasser par Node.js raw.
- `clipboard_kind=MODERN_SECRET_KEY` : le presse-papiers contient une clé moderne, pas le JWT legacy attendu.
- `clipboard_kind=UI_LABEL_TEXT` : le bouton a copié le libellé plutôt que la valeur.
- `clipboard_kind=OTHER_TEXT` : le contenu copié n'est pas le JWT attendu ; la copie côté Dashboard doit être diagnostiquée.
- `clipboard_kind=EMPTY` ou `read_error` : aucun contenu texte utilisable n'a été lu.
- `clipboard_overwrite_verified=true` : le presse-papiers a été remplacé par la sentinelle inoffensive.
- Aucune requête HTTP ne se déclenche dans cette étape.

### 43.7 État LOT-00

- Résultat §42 : `KEY_PREFIX_INVALID`, `clipboard_prefix_eyJ=false`, `clipboard_cleared=false`.
- Le texte lu était non vide, mais son contenu exact n'est pas connu.
- Le nettoyage par chaîne vide n'a pas été confirmé ; la cause n'est pas établie.
- V6/V7 : aucun GET OpenAPI ; les rejets précédents sont pré-HTTP.
- V2.40 : commande de classification transmise, non exécutée.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun secret reçu, lu ou enregistré par l'assistant ; aucune requête JOBLY-PROD ; aucune modification de fixture, donnée, permission ou configuration Supabase.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.

### 43.8 Preuves et références

- Rapport opérateur §43.1.
- Supabase API Keys : `https://supabase.com/docs/guides/getting-started/api-keys`, clés Legacy anon et service_role en JWT, clés modernes `sb_publishable_` / `sb_secret_`.
- Microsoft Learn Get-Clipboard PowerShell 5.1 : `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-clipboard?view=powershell-5.1`, `-Raw` récupère le contenu complet du presse-papiers.
- Microsoft Learn Set-Clipboard PowerShell 5.1 : `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-clipboard?view=powershell-5.1`, le cmdlet définit/remplace l'entrée du presse-papiers.
- Document source avant cette mise à jour : V2.39, blob SHA `7f7b0ab65d32b998bba466c37a3dddfb594cf65f`, branche `e2e/recette`.


---

## 44. Correctif syntaxique du rapport PowerShell de classification — V2.41 — 8 novembre 2026

### 44.1 Revue avant exécution

Une revue statique de la commande du §43.5 a identifié une construction PowerShell incorrecte : `if(...)` était placé directement à l'intérieur d'une concaténation de chaîne `'GATE='+(if(...))`. PowerShell traite `if` comme une instruction ; il faut d'abord lui affecter le résultat dans une variable, puis construire la ligne du rapport.

### 44.2 Correction

La commande du §43.5 est remplacée dans le présent document par la forme corrigée :
- `$gate=if($pass){...}else{...}`
- `'GATE='+$gate` dans le tableau de lignes.

Aucun autre comportement n'est modifié : lecture presse-papiers, classification sans divulgation, parsing local conditionnel, remplacement du presse-papiers par une sentinelle non secrète et vérification de relecture.

### 44.3 État

- Commande PowerShell relue statiquement et construction `if` corrigée.
- Aucun script PowerShell n'a été exécuté par l'assistant ; aucune valeur de presse-papiers lue.
- Le contrôle opérateur du §43.5 reste **À EXÉCUTER** ; aucun résultat anticipé.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun GET OpenAPI n'a eu lieu.
- Aucun accès JOBLY-PROD, aucune mutation Supabase ou fixture.
- `main` inchangée ; PR #266 ouverte, brouillon et non fusionnée ; aucun déploiement.
- Document source avant cette correction : V2.40, blob SHA `6fbc062d14a21a3f6ae5e70b5bc502e76c1378fc`.


---

## 45. Test différentiel du bouton Copier — V2.42 — 8 novembre 2026

### 45.1 Résultat opérateur du §43.5

Rapport reçu :

~~~text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_text_present=True
clipboard_kind=OTHER_TEXT
clipboard_prefix_eyJ=False
clipboard_prefix_sb_secret=False
clipboard_equals_ui_label=False
clipboard_length_bucket=GE1000
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_overwrite_verified=True
read_error=NONE
overwrite_error=NONE
GATE=BLOCKED_CLIPBOARD_COPY_OR_FORMAT
~~~

Le presse-papiers contenait un texte non vide de plus de 1 000 caractères, mais aucun des formats de clé attendus ni le libellé UI. Le contenu exact n'a pas été demandé, affiché ou écrit dans le rapport. La sentinelle de remplacement a été relue correctement : la neutralisation du contenu précédent est donc confirmée.

### 45.2 Conclusion probante

Les résultats §42 et §43 convergent : au moment des lectures, le presse-papiers ne contenait pas la valeur Legacy service_role révélée dans le Dashboard. En revanche, ils ne prouvent pas encore que le bouton Copier est lui-même en échec : aucune sentinelle de départ n'avait été déposée et vérifiée juste avant le clic. Le contenu OTHER_TEXT peut être un ancien texte, une sélection copiée depuis un autre élément ou un résultat erroné du bouton.

La différence entre « valeur du presse-papiers non conforme » (établie) et « échec du bouton Copier Supabase » (non établi) doit être conservée. Aucun secret n'a été transmis à l'assistant. Aucun appel HTTP, aucune validation de signature JWT et aucun accès Supabase n'ont eu lieu.

### 45.3 Contrôle discriminant — deux temps

Ce contrôle ne demande jamais de révéler, coller dans le terminal ou transmettre la clé. Le premier bloc écrit une sentinelle inoffensive dans le presse-papiers et vérifie sa relecture. **Ne cliquer sur Copier dans Supabase qu'après avoir obtenu baseline_verified=True.** Le second bloc est exécuté immédiatement après le clic ; il classe le contenu sans l'afficher ni l'enregistrer, puis remplace le presse-papiers par une autre sentinelle et vérifie sa relecture.

#### Étape A — installer la sentinelle témoin

Commande CMD :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-baseline-20261108.txt';$s='JOBLY-CLIPBOARD-BASELINE-20261108';$ok=$false;$err='NONE';try{Set-Clipboard -Value $s -ErrorAction Stop;$r=Get-Clipboard -Raw;$ok=([string]$r -eq $s);$r=$null;if(-not $ok){$err='BASELINE_READBACK_MISMATCH'}}catch{$err='BASELINE_SET_OR_READ_FAILED'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'baseline_verified='+$ok,'error='+$err);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-baseline-20261108.txt
~~~

Si baseline_verified=False, arrêter : ne pas cliquer sur Copier et transmettre uniquement le rapport.

Si baseline_verified=True, ouvrir le projet JOBLY-E2E dans Supabase, confirmer la rangée Legacy API Keys → service_role, révéler la valeur si le Dashboard l'exige, puis cliquer une seule fois sur son bouton Copier. Ne pas sélectionner/copier la page ou le libellé. Ne pas coller la clé dans un champ, un terminal ou un message.

#### Étape B — lire uniquement le statut après clic

Commande CMD, immédiatement après le clic :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-after-copy-20261108.txt';$baseline='JOBLY-CLIPBOARD-BASELINE-20261108';$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;$kind='UNKNOWN';$prefix=$false;$modern=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$hasText=$false;$readError='NONE';$overwriteError='NONE';$overwritten=$false;try{$k=Get-Clipboard -Raw;$hasText=(-not [string]::IsNullOrWhiteSpace([string]$k));if(-not $hasText){$kind='EMPTY_AFTER_COPY'}else{$k=([string]$k).Trim();if($k -eq $baseline){$kind='BASELINE_UNCHANGED'}else{$prefix=$k.StartsWith('eyJ');$modern=$k.StartsWith('sb_secret_');if($prefix){$kind='LEGACY_JWT_CANDIDATE';$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');while(($b64.Length % 4) -ne 0){$b64+='='};$decoded=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $decoded -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}elseif($modern){$kind='MODERN_SECRET_KEY'}else{$kind='OTHER_TEXT'}}}}catch{$readError='CLIPBOARD_READ_OR_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;try{Set-Clipboard -Value 'JOBLY-CLIPBOARD-AFTER-CHECK' -ErrorAction Stop;$q=Get-Clipboard -Raw;$overwritten=([string]$q -eq 'JOBLY-CLIPBOARD-AFTER-CHECK');$q=$null;if(-not $overwritten){$overwriteError='SENTINEL_READBACK_MISMATCH'}}catch{$overwriteError='CLIPBOARD_OVERWRITE_FAILED'}};$pass=($kind -eq 'LEGACY_JWT_CANDIDATE' -and $three -and $json -and $role -and $ref);$gate=if($pass){'PASS_CLIPBOARD_JWT_METADATA'}elseif($kind -eq 'BASELINE_UNCHANGED'){'BLOCKED_COPY_NOT_OBSERVED'}elseif($kind -eq 'OTHER_TEXT' -or $kind -eq 'MODERN_SECRET_KEY' -or $kind -eq 'EMPTY_AFTER_COPY'){'BLOCKED_COPY_CONTENT_NOT_EXPECTED'}else{'BLOCKED_CLIPBOARD_READ_OR_PARSE'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-after-copy-20261108.txt
~~~

### 45.4 Lecture sans surinterprétation

- baseline_verified=False : le test n'a pas démarré correctement ; ne pas interpréter le résultat.
- BASELINE_UNCHANGED / BLOCKED_COPY_NOT_OBSERVED : le clic n'a pas remplacé la sentinelle. Cela confirme que la copie n'a pas atteint le presse-papiers système pendant ce contrôle ; cela ne distingue pas encore permission navigateur, bouton inactif ou autre blocage OS.
- OTHER_TEXT, MODERN_SECRET_KEY ou EMPTY_AFTER_COPY : le presse-papiers a changé ou est devenu vide, mais il ne contient pas la clé JWT attendue ; analyser le mécanisme de copie avant toute requête.
- PASS_CLIPBOARD_JWT_METADATA : la valeur lue a le format JWT et les claims role/ref attendus. Cela ne valide pas la signature cryptographique et n'autorise pas à lui seul à conclure que le serveur l'accepte ; le contrôle OpenAPI pourra ensuite être exécuté de façon masquée sur JOBLY-E2E.
- clipboard_overwrite_verified=True : le presse-papiers est remplacé par la sentinelle non secrète après classification.

### 45.5 État LOT-00 et garde-fous

- V6/V7 : précontrôle local en échec, aucun HTTP.
- §42 : contenu non vide sans préfixe eyJ.
- §43.5 : OTHER_TEXT, GE1000, remplacement sentinelle vérifié.
- Test différentiel §45 : préparé, pas encore exécuté.
- GET OpenAPI public et net : NON EXÉCUTÉS.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Aucun secret transmis, affiché ou enregistré par l'assistant ; aucun appel Supabase ou accès JOBLY-PROD ; aucune mutation des données, fixtures, permissions ou paramètres.
- main inchangée ; PR #266 ouverte, brouillon, non fusionnée ; aucun déploiement.

### 45.6 Référence et provenance

- Rapport opérateur du §43.5, reproduit au §45.1.
- Les conclusions sont limitées aux booléens/étiquettes et à la sentinelle de relecture effectivement rapportés.
- Document source avant cette mise à jour : V2.41, blob SHA b568b52051f181880629f46e08af1157999e6e50, branche e2e/recette.


---

## 46. Résultat confirmé du contrôle de classification presse-papiers — V2.43 — 8 novembre 2026

### 46.1 Résultat opérateur

Le rapport transmis après exécution du contrôle §43.5 indique :

~~~text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_text_present=True
clipboard_kind=OTHER_TEXT
clipboard_prefix_eyJ=False
clipboard_prefix_sb_secret=False
clipboard_equals_ui_label=False
clipboard_length_bucket=GE1000
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_overwrite_verified=True
read_error=NONE
overwrite_error=NONE
GATE=BLOCKED_CLIPBOARD_COPY_OR_FORMAT
~~~

### 46.2 Conclusions strictement établies

- PowerShell a lu du texte non vide, classé OTHER_TEXT, de longueur supérieure ou égale à 1 000 caractères.
- Ce texte ne correspond ni au préfixe d'une clé Legacy JWT (eyJ), ni au préfixe d'une clé moderne (sb_secret_), ni au libellé service_role/anon.
- La lecture n'a signalé aucune erreur.
- Le remplacement par la sentinelle non secrète et sa relecture ont réussi ; le contenu antérieur a donc été remplacé.
- Le contenu exact n'a pas été affiché, transmis ou enregistré.

Ces éléments confirment que le presse-papiers ne contenait pas la clé Legacy attendue au moment du contrôle. Ils ne prouvent toujours pas que le bouton Copier du Dashboard est en panne : aucun état sentinelle vérifié n'avait été posé juste avant le clic. Un contenu ancien ou une copie provenant d'un autre élément reste compatible avec les faits.

### 46.3 Prochaine action unique

Exécuter le test différentiel en deux temps déjà documenté au §45 :
1. Installer la sentinelle et vérifier `baseline_verified=True`.
2. Seulement après ce PASS, cliquer une fois sur Copier dans la ligne Legacy `service_role` du projet JOBLY-E2E, puis exécuter immédiatement le contrôle après-copie du §45.3.

Ne pas relancer V5/V6/V7, ne pas coller la clé dans un terminal ou un message et ne pas tenter de requête HTTP avant que le contrôle local confirme le format et les claims attendus. Aucun secret n'est demandé.

### 46.4 État et périmètre

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- GET OpenAPI `public` et `net` : non exécutés.
- Aucun appel HTTP, aucune validation de signature JWT, aucune mutation Supabase/fixture.
- JOBLY-PROD non consulté ; `main` inchangée ; PR #266 reste ouverte, brouillon et non fusionnée ; aucun déploiement.
- Source : rapport opérateur transmis dans la conversation ; valeurs non secrètes uniquement.
- Document source : V2.42, branche `e2e/recette`, blob SHA `07927cbd8bc8c8dafe2e88453d380277cc20b145`.


---

## 47. Procédure de correction du transfert presse-papiers — V2.44 — 8 novembre 2026

### 47.1 Objectif

Le contrôle V2.43 a lu OTHER_TEXT (GE1000), et non une clé. La correction doit d'abord prouver que le clic Copier remplace une sentinelle fraîche ; ne pas diagnostiquer le navigateur ou Supabase avant ce test différentiel.

### 47.2 Procédure opérateur

1. Ouvrir le Dashboard Supabase dans le navigateur habituel et sélectionner explicitement le projet JOBLY-E2E, référence `ofqqrryamslxoqkklraw`.
2. Ouvrir Project Settings → API Keys → onglet Legacy API Keys ; repérer la ligne `service_role` portant le badge secret. Ne pas copier la valeur affichée ailleurs et ne pas sélectionner une clé anon/publishable.
3. Vérifier dans les paramètres du site/navigateur que l'accès au presse-papiers n'est pas bloqué pour le domaine du Dashboard. Si une demande d'autorisation apparaît, l'autoriser pour cette session/site. Ne pas activer globalement des permissions sans nécessité.
4. Exécuter le préparateur de sentinelle documenté au §45.2. Continuer uniquement si `baseline_verified=True`.
5. Cliquer une seule fois sur l'icône Copier de la ligne `service_role` (pas sur le bouton de révélation, pas sur un autre champ).
6. Sans coller ni afficher la valeur, exécuter immédiatement le classificateur après-copie du §45.3. Celui-ci vérifie les métadonnées localement et remplace le presse-papiers par une sentinelle non secrète.
7. Interpréter le résultat :
   - `BASELINE_UNCHANGED` : le clic n'a pas modifié le presse-papiers ; recharger le Dashboard, réessayer une seule fois, puis tester un autre navigateur à jour si le résultat persiste.
   - `OTHER_TEXT` : le presse-papiers a changé mais pas vers une clé reconnue ; vérifier que le clic visait bien la ligne `service_role` du projet E2E, puis essayer l'autre navigateur.
   - `PASS_CLIPBOARD_JWT_METADATA` : format et claims locaux attendus ; seulement alors poursuivre le contrôle HTTP masqué du LOT-00.
   - erreur de lecture/écriture ou baseline non vérifiée : le contrôle n'est pas concluant ; ne pas en déduire que la clé est invalide.

### 47.3 Interdictions et critères

- Ne jamais coller la clé dans CMD, PowerShell, un fichier, un rapport, une capture d'écran ou une conversation.
- Ne pas envoyer le contenu du presse-papiers à l'assistant ; seuls les booléens et le code GATE sont nécessaires.
- Ne pas générer/remplacer/révoquer de clé, modifier les permissions Supabase, ni utiliser `net.http_*`.
- Aucun GET OpenAPI n'est autorisé avant `PASS_CLIPBOARD_JWT_METADATA`.
- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'aux réponses HTTP documentées.

### 47.4 État de référence

- Dernière preuve opérateur : V2.43, `OTHER_TEXT`, `GE1000`, sentinelle de remplacement vérifiée.
- Aucune preuve que le bouton Copier est défectueux ; la cause précise n'est pas encore isolée.
- JOBLY-PROD hors périmètre ; `main` inchangée ; PR #266 ouverte en brouillon et non fusionnée ; aucun déploiement.
- Document source avant mise à jour : V2.43, blob SHA `33462723bb421ff11dc72f7027350cd8c1084e02`, branche `e2e/recette`.


---

## 48. Test différentiel par message témoin — V2.46 — 8 novembre 2026

### 48.1 But et limite de sécurité

L'opérateur souhaite vérifier d'abord un copier-coller dans un champ de message. Ce test est autorisé uniquement avec une chaîne témoin fictive, jamais avec le mot de passe du compte, une clé Supabase, un JWT, un refresh token ou toute autre donnée d'authentification.

Un brouillon de message peut être synchronisé ou autosauvegardé. Le secret réel ne doit donc jamais y être collé, même si le message n'est pas envoyé.

### 48.2 Test sûr du champ de message

1. Ouvrir un nouveau brouillon de message, sans destinataire nécessaire.
2. Saisir exactement cette chaîne non sensible dans le corps : `JOBLY-COPY-TEST-20261108`.
3. Sélectionner uniquement cette chaîne et utiliser Copier.
4. Créer une nouvelle ligne dans le même brouillon et utiliser Coller.
5. Vérifier visuellement que la seconde ligne correspond exactement à `JOBLY-COPY-TEST-20261108` : aucun caractère ajouté, supprimé ou remplacé.
6. Ne pas envoyer le message. Fermer le brouillon et le supprimer/abandonner si l'application le conserve.

Résultats à rapporter, sans capture contenant d'autres données :
- `MESSAGE_CANARY_MATCH=True` si les deux chaînes sont identiques.
- `MESSAGE_CANARY_MATCH=False` si le collage échoue ou diffère.
- `MESSAGE_CANARY_TEST_NOT_RUN` si le champ ne permet pas un brouillon sûr.

Ce test établit uniquement que le copier-coller générique fonctionne dans ce champ. Il ne prouve pas que le bouton Copier de Supabase fonctionne.

### 48.3 Test ciblé du bouton Supabase

Si et seulement si le canari de message correspond :

1. Revenir au Dashboard du projet JOBLY-E2E `ofqqrryamslxoqkklraw`, onglet Legacy API Keys.
2. Exécuter le préparateur de sentinelle du §45.2 et exiger `baseline_verified=True`.
3. Cliquer une seule fois sur Copier dans la ligne `service_role`.
4. Ne coller la valeur nulle part. Exécuter immédiatement le classificateur local du §45.3, qui lit uniquement les métadonnées nécessaires puis remplace le presse-papiers par une sentinelle.
5. Ne transmettre que les lignes de classification non sensibles et le GATE.

Interprétation :
- Canari message faux : problème de copie/collage générique ou de champ ; ne pas poursuivre avec le secret.
- Canari vrai + `BASELINE_UNCHANGED` : le clic Supabase n'a pas remplacé la sentinelle ; recharger le Dashboard, puis un seul nouvel essai contrôlé.
- Canari vrai + `OTHER_TEXT` : le transfert du bouton a changé le presse-papiers mais pas vers le JWT attendu ; revalider le projet et la ligne sélectionnée.
- Canari vrai + `PASS_CLIPBOARD_JWT_METADATA` : format et claims locaux attendus ; ce n'est pas encore une validation de signature ni une preuve d'acceptation serveur.

### 48.4 Interdictions inchangées

- Ne jamais coller un vrai mot de passe ou une clé dans un message, même non envoyé, un e-mail, un chat, un document ou un terminal.
- Ne jamais envoyer le secret à l'assistant, même pour le vérifier ; ne pas en transmettre de préfixe, suffixe ou extrait.
- Ne pas modifier, régénérer ou révoquer les clés ; ne pas toucher aux permissions ; ne pas exécuter `net.http_*`..
- Aucun GET OpenAPI avant `PASS_CLIPBOARD_JWT_METADATA).
- JOBLY-PROD reste strictement hors périmètre ; aucun changement de `main`, aucun déploiement.

### 48.5 État après préparation de la recette

- La procédure est préparée mais pas encore exécutée ; aucun résultat canari n'est revendiqué.
- Le dernier résultat disponible reste celui du §46 : `OTHER_TEXT`, longueur `GE1000`, remplacement sentinelle vérifié.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; GET OpenAPI `public` et `net` non exécutés.
- PR #266 reste la branche de continuité E2E ; cette mise à jour documentaire ne fusionne pas la PR.
- Document source avant cette mise à jour : V2.45, blob SHA `77c4218ccf49239f278c4330da9f5edf09570d27`, branche `e2e/recette`.


---

## 49. Priorisation — recette presse-papiers différable, tests code-only autorisés — V2.47 — 8 novembre 2026

### 49.1 Décision de priorité

Le test canari de message du §48.2 est **OPTIONNEL et DIFFÉRABLE**. Il vérifie seulement le copier-coller générique dans un champ de message ; il ne valide ni le bouton du Dashboard Supabase, ni la clé, ni l'API, ni une fonctionnalité Jobly. Il ne doit pas retarder les recettes autonomes. Il peut être ignoré si le diagnostic du presse-papiers n'est plus nécessaire.

Ne jamais remplacer le canari fictif par un vrai mot de passe, une clé, un JWT ou un jeton. Aucun secret ne doit être collé dans un message, même non envoyé.

Le verrou **LOT-00 reste en revanche un prérequis obligatoire à toute recette runtime qui appelle JOBLY-E2E**. Jusqu'à sa fermeture selon les critères des §§17.4 et 19.5, restent suspendus : smoke navigateur qui appelle les API JOBLY-E2E, authentification réelle, parcours Talent/Recruteur/Partenaire, parcours croisé, exécution du runner E2E complet et toute écriture runtime. Le test canari ne ferme pas LOT-00.

### 49.2 Recette code-only exécutable maintenant

Le groupe `authenticated-runtime-contracts` du fichier `scripts/e2e-bulk-runner.mjs` sélectionne uniquement `scripts/e2e-authenticated-runtime-regression.test.mjs`.

Inspection du code au moment de cette mise à jour :
- le fichier de test contient **6 tests Node.js** ;
- il lit uniquement le texte de `e2e/authenticated-role-smoke.mjs` ;
- il vérifie la présence des contrôles Talent et Recruteur, les limites GET/lecture seule, l'absence d'écriture du profil Talent et l'absence d'insertion de document ;
- il n'exécute pas le smoke authentifié, n'appelle pas Supabase, ne lit aucune fixture et ne modifie aucun compte ou profil.

Cette recette de non-régression statique peut donc être exécutée immédiatement, indépendamment de LOT-00. Son PASS valide uniquement les assertions de structure du code ; il n'autorise aucun runtime et ne prouve pas le comportement réel des API.

### 49.3 Commande opérateur isolée

Depuis CMD Windows, après synchronisation locale de la branche `e2e/recette` au commit documentaire courant et vérification que le répertoire est bien le dépôt Jobly :

~~~bat
cd /d C:\Users\ASUS\Jobly
node --experimental-strip-types scripts/e2e-bulk-runner.mjs --groups authenticated-runtime-contracts
notepad artifacts\e2e\bulk\summary.md
notepad artifacts\e2e\bulk\authenticated-runtime-contracts.log
~~~

Le runner crée `artifacts/e2e/bulk/summary.md`, `summary.json` et le journal du groupe. Transmettre les résultats non sensibles, en indiquant le SHA réellement exécuté. Ne pas lancer le runner global de 7 groupes par déduction de cette seule autorisation.

### 49.4 Ordre de reprise retenu — HISTORIQUE, remplacé par §76

**Ordre historique conservé pour traçabilité ; l'ordre opératoire actuel est celui du §76. OpenAPI est le LOT-11 final, jamais un gate amont.**

1. **À l'époque :** exécuter uniquement le groupe code-only `authenticated-runtime-contracts` ci-dessus et analyser son rapport.
2. **En parallèle, sans runtime :** poursuivre les revues de code et tests locaux explicitement isolés, après vérification de leur absence d'appels réseau, d'Auth, de mutations ou de dépendances à des fixtures.
3. **À reprendre ensuite :** LOT-00, par la procédure de sentinelle §45.2 puis classification §45.3 ; le canari de message §48.2 reste facultatif et peut être sauté.
4. **Seulement après fermeture documentée de LOT-00 :** reprendre les recettes navigateur/API/authentifiées et les parcours métier runtime.

### 49.5 Statut et garde-fous

- Test canari de message : **DIFFÉRÉ / NON BLOQUANT**.
- Groupe `authenticated-runtime-contracts` : **EXÉCUTABLE, NON ENCORE EXÉCUTÉ dans le cadre de cette mise à jour**.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun GET OpenAPI `public` ou `net` n'est enregistré.
- Aucun runtime JOBLY-E2E n'a été lancé par cette mise à jour ; aucun accès JOBLY-PROD, aucune mutation de fixture ou de données, aucun changement de `main), aucun déploiement.
- PR #266 demeure ouverte, en brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.46, blob SHA `6df71ed163b5fd95d69ba70f9157317c46804fcc`, branche `e2e/recette`.


---

## 50. Résultat opérateur — authenticated-runtime-contracts — V2.48 — 8 novembre 2026

### 50.1 Rapport transmis

Rapport bulk communiqué par l'opérateur :

~~~text
Date UTC : 2026-11-08T14:15:12.550Z
Commit : e92feb8abc1a2491cab7dd81e834080b80982681
Node.js : v26.13.0
Groupes exécutés en parallèle : 3
Groupes sélectionnés : authenticated-runtime-contracts
Fichiers de test : 1
Résultat : 1/1 groupes réussis

Groupe : Contrats runtime authentifiés Talent, CV et Recruitment 360
Statut : PASS
Tests : 6
Réussis : 6
Échoués : 0
Durée : 0.4 s
Journal : artifacts/e2e/bulk/authenticated-runtime-contracts.log
~~~

### 50.2 Rattachement au code vérifié

Vérifications GitHub effectuées lors de l'enregistrement :
- Le commit exécuté `e92feb8abc1a2491cab7dd81e834080b80982681` existe ; son parent direct est `8385b60400bbaf9cedfcb4aa01073b733533f6c2`.
- Le commit exécuté ne modifie que `docs/e2e/CONTINUITE-RECETTE-E2E.md), sans changement de fichier de code.
- La tête distante de `e2e/recette) est `625d686b11ebc136695494f278b98f606929204f`. La comparaison GitHub depuis le commit exécuté indique 47 commits d'avance, 0 en retard ; l'ensemble des fichiers modifiés sur cette plage se limite au document de continuité.
- La définition du groupe dans `scripts/e2e-bulk-runner.mjs` ne sélectionne qu'un fichier : `scripts/e2e-authenticated-runtime-regression.test.mjs`. Ce fichier contient 6 tests Node.js qui inspectent statiquement le contenu de `e2e/authenticated-role-smoke.mjs`.

Le résultat transmis est donc rattaché au même état de code E2E-001 que celui présent à la tête distante actuelle, les commits ultérieurs vérifiés étant documentaires uniquement. Le rapport a été fourni par l'opérateur ; le journal local lui-même n'a pas été reçu ni inspecté indépendamment.

### 50.3 Portée du PASS

Le PASS démontre que les six assertions statiques du groupe ont réussi. Elles contrôlent notamment :
- la présence des scénarios de lecture Talent (flux local/Afrique, détail d'offre, CV original et Career Journey) ;
- la sélection du détail d'offre à partir du flux authentifié ;
- l'absence d'écriture dans le bloc Talent en lecture seule ;
- la protection de l'URL signée du CV contre sa journalisation ;
- les réponses attendues 403 sur un identifiant de recrutement non détenu et 404 pour une cible documentaire inexistante ;
- l'absence d'insertion de document dans le contrôle négatif.

Ce PASS ne constitue pas une exécution de `e2e/authenticated-role-smoke.mjs). Il ne prouve aucune réponse API runtime, aucune connexion Auth, aucune lecture réelle du flux JOBLY-E2E, aucune sécurité complète RLS/Storage, ni aucun parcours Talent/Recruteur en navigateur. Il n'autorise pas la recette globale ni un runner runtime.

### 50.4 Décision de reprise

- Groupe `authenticated-runtime-contracts` : **PASS — 6/6, 0 échec**.
- Recette statique code-only : résultat enregistré.
- Canari de message §48 : reste différable et non bloquant.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; les GET OpenAPI `public` et `net), la décision sur les buckets publics et la matrice ciblée grants/policies restent à établir selon les critères du §17.4.
- Tant que LOT-00 n'est pas fermé, ne pas exécuter le smoke Auth/runtime, les parcours Talent/Recruteur, le smoke navigateur qui appelle JOBLY-E2E, le parcours croisé, ni le runner E2E complet.
- Aucun accès JOBLY-PROD, aucune mutation de fixture ou de données, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.47, blob SHA `08c7a37a53eb28089b3ddd5fee2c88d6f0f6128a`, branche `e2e/recette`.


---

## 51. Cartographie des six groupes bulk locaux et relance minimale — V2.49 — 8 novembre 2026

### 51.1 Conclusion

Les six groupes de régression de `scripts/e2e-bulk-runner.mjs` ne dépendent pas du gate LOT-00 : leur périmètre est constitué de tests Node.js unitaires ou statiques. Ils n'exécutent ni smoke Auth/runtime, ni appel réseau réel à Supabase, ni ingestion, ni paiement, ni écriture dans une fixture.

Les contrôles non-OpenAPI du préflight LOT-00 (identité projet, disponibilité des fixtures, isolation et éléments de sécurité read-only applicables) restent requis pour les scénarios runtime concernés. **Le GET OpenAPI n'est pas requis à l'entrée** : il est réservé au LOT-11 final après LOT-10.

### 51.2 Inventaire des groupes et volumes de tests inspectés

| Groupe | Fichiers | Tests dans les fichiers | Nature contrôlée |
|---|---:|---:|---|
| `identity-talent-recruiter` | 4 | 66 | Auth, assistant candidature externe, CV/Talent, rôles Recruteur ; assertions de code et de contrats |
| `africa-mobility` | 3 | 38 | Fraîcheur des offres, règles Mobility et segmentation des requêtes batch avec fonction de chargement simulée |
| `jia-360-android` | 10 | 71 | Fonctions J'IA, règles de conversation, isolation et inventaire d'interface ; assertions locales |
| `events-billing-ecosystem` | 5 | 30 | Règles Events, éligibilité billing, communauté, logos et watermark ; sans appel fournisseur |
| `mobile-money` | 7 | 66 | Parsing SMS, matching, configuration, partage client et assertions Android ; données et fonctions de test simulées |
| `security-offline` | 4 | 31 | Rate limiting, droits, offline et vérification HIBP avec `fetchImpl` simulé |
| **Total** | **33** | **302** | **Code-only / local** |

Le groupe `authenticated-runtime-contracts` est distinct : son fichier unique contient 6 tests et a désormais un résultat opérateur **PASS 6/6**, enregistré au §50.

### 51.3 Différentiel de code depuis la campagne 302/302

La campagne antérieure de six groupes, enregistrée au §11, totalise 302/302. Le commit historique communiqué pour la campagne est `60a40dbc60bb8d3a7b069e96291a0a375a01911e).

Comparaison GitHub entre ce commit et `e92feb8abc1a2491cab7dd81e834080b80982681) :
- 11 commits d'avance, aucun commit en retard ;
- parmi les six groupes historiques, le seul fichier de test existant modifié est `scripts/talent-cv-application-regression.test.mjs`, qui appartient à `identity-talent-recruiter` (une insertion et une suppression dans ce fichier) ;
- `scripts/e2e-bulk-runner.mjs` ajoute le groupe `authenticated-runtime-contracts`, sans remplacer les définitions des six groupes historiques ;
- les autres changements portent sur `e2e/authenticated-role-smoke.mjs), `scripts/e2e-local-recipe.mjs), le nouveau test `scripts/e2e-authenticated-runtime-regression.test.mjs` et le document de continuité ; ils ne modifient pas les cinq autres suites bulk.

Conséquence : les cinq groupes `africa-mobility`, `jia-360-android`, `events-billing-ecosystem`, `mobile-money` et `security-offline` conservent leur preuve précédente, leurs fichiers de test n'ayant pas changé dans le différentiel contrôlé. Il n'est pas nécessaire de les relancer uniquement pour débloquer LOT-00. Le groupe `identity-talent-recruiter` doit être relancé pour rafraîchir sa preuve sur la version modifiée du test CV.

### 51.4 Commande minimale à exécuter maintenant

Depuis CMD Windows, dans le dépôt Jobly et sur la branche locale `e2e/recette) :

~~~bat
cd /d C:\Users\ASUS\Jobly
node --experimental-strip-types scripts/e2e-bulk-runner.mjs --groups identity-talent-recruiter
notepad artifacts\e2e\bulk\summary.md
notepad artifacts\e2e\bulk\identity-talent-recruiter.log
~~~

Le runner écrit uniquement les rapports du groupe dans `artifacts/e2e/bulk`. Transmettre le SHA local effectivement testé ainsi que les lignes du rapport ; ne pas lancer le runner E2E global.

### 51.5 Statut et limites

- Six groupes historiques : **302/302 PASS précédemment enregistré** ; cinq groupes inchangés, preuve conservée.
- `identity-talent-recruiter` : **PASS — 66/66**, preuve fraîche reçue au §52 sur le commit `e92feb8abc1a2491cab7dd81e834080b80982681`.
- `authenticated-runtime-contracts` : **PASS 6/6**, cf. §50.
- Les recettes code-only n'établissent pas la disponibilité des API, la validité des fixtures, l'authentification réelle, les permissions runtime ni les parcours utilisateur.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; les recettes runtime demeurent suspendues.
- Aucun accès JOBLY-PROD, aucune mutation Supabase/fixture, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.48, blob SHA `5c504ec11128ae45f1aa1ed25f686f3ea8cccdfe`, branche `e2e/recette`.


---

## 52. Résultat opérateur — identity-talent-recruiter — V2.50 — 8 novembre 2026

### 52.1 Rapport reçu

~~~text
Date UTC : 2026-11-08T14:20:15.634Z
Commit : e92feb8abc1a2491cab7dd81e834080b80982681
Node.js : v26.13.0
Groupes exécutés en parallèle : 3
Groupe sélectionné : identity-talent-recruiter
Fichiers de test : 4
Résultat : 1/1 groupe réussi

Tests : 66
Réussis : 66
Échoués : 0
Durée : 0.9 s
Journal : artifacts/e2e/bulk/identity-talent-recruiter.log
~~~

### 52.2 Vérification du SHA et de la définition du groupe

- Le commit `e92feb8abc1a2491cab7dd81e834080b80982681` existe sur GitHub ; son parent direct est `8385b60400bbaf9cedfcb4aa01073b733533f6c2`.
- Le commit exécuté n'apporte qu'une modification documentaire. Il ne modifie aucun fichier de test ou code applicatif.
- Le runner `scripts/e2e-bulk-runner.mjs` à ce commit définit `identity-talent-recruiter` avec les quatre fichiers suivants : `scripts/authentication-flow-regression.test.mjs`, `scripts/external-application-assistant.test.mjs`, `scripts/talent-cv-application-regression.test.mjs` et `scripts/recruiter-role-regression.test.mjs`.
- La comparaison GitHub entre `e92feb8...` et la tête distante actuelle de `e2e/recette` (`52443728249c05748a96cfda4be980d74e9ba70b)) indique 49 commits d'avance, aucun en retard ; les commits ultérieurs n'ont modifié que `docs/e2e/CONTINUITE-RECETTE-E2E.md`.
- Le commit de campagne historique `60a40dbc60bb8d3a7b069e96291a0a375a01911e` vers `e92feb8...` montrait que le seul fichier de test de ces six groupes modifié était `scripts/talent-cv-application-regression.test.mjs), précisément réexécuté dans le présent groupe. Les cinq autres groupes gardent leur preuve antérieure, sous réserve du périmètre de code comparé au §51.3.

Le rapport opérateur est cohérent avec la définition du groupe et la version de code. Le journal local n'a pas été transmis et n'a donc pas fait l'objet d'une inspection indépendante.

### 52.3 Bilan actualisé des six groupes locaux

- Les six groupes historiques totalisent 302 tests dans leur définition.
- Les cinq groupes restés inchangés conservent les PASS précédents (236 tests).
- Le groupe `identity-talent-recruiter` est désormais revalidé : 66/66 PASS.
- Le groupe supplémentaire `authenticated-runtime-contracts` a aussi son PASS propre : 6/6, cf. §50.

Les six groupes locaux sont donc tous couverts par une preuve PASS ; il n'est pas nécessaire de les relancer à nouveau uniquement pour contourner ou attendre LOT-00. Les résultats proviennent de plusieurs exécutions et ne doivent pas être présentés comme un seul run bulk simultané.

### 52.4 Portée et suite

- Recettes code-only bulk : les six groupes historiques sont **PASS couverts** ; le groupe additionnel `authenticated-runtime-contracts` est **PASS 6/6**.
- Ces résultats ne prouvent pas l'authentification réelle, les réponses HTTP de JOBLY-E2E, l'accès aux données, les politiques RLS/Storage en runtime, ni les parcours métier en navigateur.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; il bloque toujours les recettes runtime.
- Les recettes locales supplémentaires ne doivent être lancées que si elles couvrent un code ou un risque non déjà testé ; éviter les relances redondantes.
- Prochaine frontière de validation métier : terminer LOT-00 avec preuves read-only, puis reprendre Auth/runtime, smoke navigateur et parcours E2E.
- Aucun accès JOBLY-PROD, aucune mutation Supabase/fixture, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.49, blob SHA `8ac9cdf0e73b0a81044d3015c868c77752dd82dc`, branche `e2e/recette`.


---

## 53. Reprise ciblée LOT-00 après clôture des groupes bulk locaux — V2.51 — 8 novembre 2026

### 53.1 Décision de reprise

À la suite des PASS consignés aux §§50 et 52, l'opérateur valide l'arrêt des relances bulk locales redondantes et la reprise ciblée de LOT-00. Le test canari du champ de message §48 reste différé et n'est pas un prérequis.

### 53.2 Prochaine action opérateur — établir la sentinelle de départ

Exécuter uniquement l'étape A du §45.3 pour poser et relire la sentinelle locale. Commande CMD :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-baseline-20261108.txt';$s='JOBLY-CLIPBOARD-BASELINE-20261108';$ok=$false;$err='NONE';try{Set-Clipboard -Value $s -ErrorAction Stop;$r=Get-Clipboard -Raw;$ok=([string]$r -eq $s);$r=$null;if(-not $ok){$err='BASELINE_READBACK_MISMATCH'}}catch{$err='BASELINE_SET_OR_READ_FAILED'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'baseline_verified='+$ok,'error='+$err);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-baseline-20261108.txt
~~~

Décision :
- Si `baseline_verified=True` : la sentinelle est bien installée. L'étape suivante peut être le clic unique sur Copier de la ligne Legacy `service_role` du projet JOBLY-E2E, immédiatement suivi du classificateur après-copie §45.3 étape B.
- Si `baseline_verified=False` ou erreur : arrêter avant le clic Supabase ; transmettre uniquement le contenu non sensible du rapport pour diagnostic.

### 53.3 Interdictions et état

- Ne jamais coller le mot de passe, la clé, un JWT ou un jeton dans un message, terminal, fichier, rapport ou conversation.
- Ne pas envoyer de secret ni d'extrait de secret à l'assistant.
- Le canari de message §48 est différé.
- Ne pas modifier/régénérer/révoquer de clé, ni changer les permissions, ni appeler `net.http_*`.
- Aucun GET OpenAPI avant `PASS_CLIPBOARD_JWT_METADATA`.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun GET OpenAPI `public`/ `net` n'est établi.
- Aucun accès JOBLY-PROD, aucune mutation Supabase/fixture, aucun changement de `main), aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.50, blob SHA `af8ea3eafa44f189feddc24c3703cf89b11ec357`, branche `e2e/recette`.


---

## 54. Résultat opérateur — sentinelle presse-papiers initiale PASS — V2.52 — 8 novembre 2026

### 54.1 Résultat reçu

~~~text
runtime=PowerShell 5.1.19041.4522
baseline_verified=True
error=NONE
~~~

### 54.2 Conclusion exacte

- PowerShell 5.1 a écrit la sentinelle non secrète `JOBLY-CLIPBOARD-BASELINE-20261108` et a relu exactement la même chaîne.
- Le contrôle de départ du presse-papiers est **PASS**.
- Cela prouve que PowerShell peut écrire et relire le presse-papiers Windows dans cette session.
- Cela ne prouve pas encore que le bouton Copier du Dashboard Supabase copie le contenu attendu, ni que le JWT est valide ou accepté par le serveur.

### 54.3 Prochaine action unique

1. Dans le Dashboard Supabase, vérifier le projet JOBLY-E2E `ofqqrryamslxoqkklraw), puis la ligne Legacy API Keys `service_role) avec badge `secret`.
2. Cliquer une seule fois sur l'icône Copier de cette ligne.
3. Ne pas coller le secret dans un message, un terminal, un fichier ou un champ.
4. Exécuter immédiatement la commande de classification du §45.3 étape B. Elle ne consigne que les indicateurs booléens et le GATE, puis remplace le presse-papiers par une sentinelle non secrète.
5. Ouvrir le rapport avec la commande Notepad prévue et ne transmettre que les lignes non sensibles.

Le résultat déterminant attendu à cette étape est `PASS_CLIPBOARD_JWT_METADATA). Tout autre GATE reste bloqué et devra être diagnostiqué sans transmettre le contenu du presse-papiers.

### 54.4 Garde-fous et état

- Aucun secret n'a été lu par l'assistant, affiché ou transmis ; le rapport communiqué ne contient que la version PowerShell, un booléen et un code d'erreur.
- Aucun GET OpenAPI n'a été exécuté ; aucune validation de signature JWT ou d'acceptation serveur n'a eu lieu.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucun changement de `main) ; aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.51, blob SHA `5e9b6ffb08cea3244d1f5bbb65fc82b2f29a571a`, branche `e2e/recette`.


---

## 55. Résultat opérateur — clic Copier remplace la sentinelle par OTHER_TEXT — V2.53 — 8 novembre 2026

### 55.1 Résultat communiqué

~~~text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
clipboard_text_present=True
clipboard_kind=OTHER_TEXT
clipboard_prefix_eyJ=False
clipboard_prefix_sb_secret=False
jwt_three_segments=False
payload_json_valid=False
role_service_role=False
project_ref_match=False
clipboard_overwrite_verified=True
read_error=NONE
overwrite_error=NONE
GATE=BLOCKED_COPY_CONTENT_NOT_EXPECTED
~~~

### 55.2 Rapprochement avec la sentinelle initiale

Le contrôle précédent §54 avait établi `baseline_verified=True` avec la sentinelle `JOBLY-CLIPBOARD-BASELINE-20261108`. Le résultat ci-dessus est celui transmis après le clic sur Copier et le classificateur §45.3 étape B.

Conclusions limitées aux preuves :
- Le presse-papiers était non vide au contrôle après-clic.
- Son contenu n'était plus égal à la sentinelle initiale ; il a donc changé entre le dépôt de la sentinelle et la lecture après-clic.
- Le contenu n'a pas le préfixe d'un JWT Legacy (`eyJ`) ni celui d'une clé moderne (`sb_secret_`).
- Il ne contient pas un JWT à trois segments reconnu, et les claims `role=service_role` / `ref=ofqqrryamslxoqkklraw` ne sont pas établis.
- La lecture n'a pas échoué. Le remplacement ultérieur par la sentinelle de contrôle a réussi.

On peut donc confirmer que le presse-papiers a été modifié après la baseline, mais pas que le bouton ait copié la clé. Le contenu exact, sa longueur et sa nature ne sont pas connus, car le classificateur ne les a pas consignés. Ne pas conclure que Supabase a rejeté la clé : aucune requête HTTP n'a eu lieu.

### 55.3 Contexte technique Supabase

La documentation Supabase consultée le 8 novembre 2026 indique que les clés Legacy `anon` et `service_role` sont des JWT, tandis que les nouvelles clés secret sont des chaînes opaques `sb_secret_...`. Les deux familles de clés peuvent coexister jusqu'à désactivation explicite des anciennes clés. Références :
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys

Le gate actuellement préparé vise explicitement la ligne Legacy `service_role` du projet JOBLY-E2E ; il ne faut pas substituer une autre valeur ni migrer les variables du projet dans cette étape de diagnostic.

### 55.4 Prochaine vérification ciblée

Ne pas répéter immédiatement le clic dans la même condition sans vérifier sa cible :
1. Retourner à **Project Settings → API Keys → Legacy API Keys** du projet `ofqqrryamslxoqkklraw`.
2. Confirmer visuellement que la ligne est celle nommée `service_role` avec le badge `secret` ; ne pas utiliser l'onglet des nouvelles clés, le bouton de révélation seul, le JWT Signing Secret, ou un bouton Copier associé à un autre champ.
3. Si la valeur est masquée, le bouton Copier doit être celui associé à la valeur de la ligne `service_role`, pas celui du nom de ligne ou d'un panneau voisin.
4. Avant tout nouvel essai, installer à nouveau la sentinelle et exiger `baseline_verified=True).
5. Pour le nouvel essai, reposer d'abord la sentinelle puis utiliser la commande enrichie du §56.1. Elle ne révèle aucun contenu ; elle ajoute seulement longueur par tranche, égalité avec quelques libellés statiques, indicateurs de forme, format JWT, claims role/ref et GATE. Le rapport ne doit jamais afficher, hacher ou sauvegarder la valeur.

Si le Dashboard confirme visuellement la bonne ligne mais que le résultat reste `OTHER_TEXT), interrompre les tentatives répétées et tester une seule fois dans un navigateur à jour différent, avec la même procédure de sentinelle.

### 55.5 État et garde-fous

- Clic Copier : **CONTENU MODIFIÉ, MAIS VALEUR ATTENDUE NON PROUVÉE**.
- `PASS_CLIPBOARD_JWT_METADATA) : non obtenu.
- GET OpenAPI `public` et `net) : non exécutés.
- Signature JWT et acceptation par le serveur : non testées.
- Aucun secret n'a été communiqué à l'assistant ; aucune mutation Supabase/fixture ; aucun accès JOBLY-PROD ; aucun changement de `main) ; aucun déploiement.
- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.52, blob SHA `93167da9abdd64ab72f9ada43a580e5801c1b4f7`, branche `e2e/recette`.


---

## 56. Commande de classification enrichie du presse-papiers — V2.54 — 8 novembre 2026

### 56.1 Utilisation

À n'utiliser qu'après avoir vérifié de nouveau la sentinelle de départ avec l'étape A du §45.3, puis après un clic unique sur le bouton Copier associé à la valeur de la ligne Legacy service_role du projet JOBLY-E2E. Aucun collage manuel. Le contenu exact n'est jamais affiché ni écrit dans un fichier ; le script remplace le presse-papiers par une sentinelle avant de terminer.

Commande CMD :

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-clipboard-after-copy-detail-20261108.txt';$baseline='JOBLY-CLIPBOARD-BASELINE-20261108';$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;$kind='UNKNOWN';$prefix=$false;$modern=$false;$three=$false;$json=$false;$role=$false;$ref=$false;$hasText=$false;$lengthBucket='UNKNOWN';$labelService=$false;$labelAnon=$false;$labelSecret=$false;$labelCopy=$false;$masked=$false;$looksJson=$false;$looksHtml=$false;$whitespace=$false;$readError='NONE';$overwriteError='NONE';$overwritten=$false;try{$k=Get-Clipboard -Raw;$hasText=(-not [string]::IsNullOrWhiteSpace([string]$k));if(-not $hasText){$kind='EMPTY_AFTER_COPY'}else{$k=([string]$k).Trim();if($k.Length -le 32){$lengthBucket='LE32'}elseif($k.Length -le 256){$lengthBucket='LE256'}elseif($k.Length -le 1000){$lengthBucket='LE1000'}else{$lengthBucket='GT1000'};$labelService=($k -ieq 'service_role');$labelAnon=($k -ieq 'anon');$labelSecret=($k -ieq 'secret');$labelCopy=($k -match '^(copy|copied|copy key|copied to clipboard)$');$masked=($k -match '^[*xX.]{4,}$');$looksJson=($k.StartsWith('{') -or $k.StartsWith('['));$looksHtml=$k.StartsWith('<');$whitespace=($k -match '\s');$prefix=$k.StartsWith('eyJ');$modern=$k.StartsWith('sb_secret_');$parts=$k.Split([char]'.');$three=($parts.Length -eq 3);if($k -eq $baseline){$kind='BASELINE_UNCHANGED'}elseif($prefix){$kind='LEGACY_JWT_CANDIDATE';if($three){$b64=$parts[1].Replace('-','+').Replace('_','/');while(($b64.Length % 4) -ne 0){$b64+='='};$decoded=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64));$payload=ConvertFrom-Json -InputObject $decoded -ErrorAction Stop;$json=$true;$role=($payload.role -eq 'service_role');$ref=($payload.ref -eq 'ofqqrryamslxoqkklraw')}}elseif($modern){$kind='MODERN_SECRET_KEY'}elseif($labelService -or $labelAnon -or $labelSecret -or $labelCopy){$kind='UI_LABEL'}elseif($masked){$kind='MASKED_PLACEHOLDER'}elseif($looksJson){$kind='JSON_TEXT'}elseif($looksHtml){$kind='HTML_TEXT'}else{$kind='OTHER_TEXT'}}}catch{$readError='CLIPBOARD_READ_OR_PARSE_ERROR'}finally{$k=$null;$parts=$null;$b64=$null;$payload=$null;$decoded=$null;try{Set-Clipboard -Value 'JOBLY-CLIPBOARD-AFTER-CHECK' -ErrorAction Stop;$q=Get-Clipboard -Raw;$overwritten=([string]$q -eq 'JOBLY-CLIPBOARD-AFTER-CHECK');$q=$null;if(-not $overwritten){$overwriteError='SENTINEL_READBACK_MISMATCH'}}catch{$overwriteError='CLIPBOARD_OVERWRITE_FAILED'}};$pass=($kind -eq 'LEGACY_JWT_CANDIDATE' -and $three -and $json -and $role -and $ref);$gate=if($pass){'PASS_CLIPBOARD_JWT_METADATA'}elseif($kind -eq 'BASELINE_UNCHANGED'){'BLOCKED_COPY_NOT_OBSERVED'}elseif($kind -eq 'OTHER_TEXT' -or $kind -eq 'UI_LABEL' -or $kind -eq 'MASKED_PLACEHOLDER' -or $kind -eq 'JSON_TEXT' -or $kind -eq 'HTML_TEXT' -or $kind -eq 'MODERN_SECRET_KEY' -or $kind -eq 'EMPTY_AFTER_COPY'){'BLOCKED_COPY_CONTENT_NOT_EXPECTED'}else{'BLOCKED_CLIPBOARD_READ_OR_PARSE'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','clipboard_text_present='+$hasText,'clipboard_kind='+$kind,'clipboard_length_bucket='+$lengthBucket,'clipboard_equals_service_role_label='+$labelService,'clipboard_equals_anon_label='+$labelAnon,'clipboard_equals_secret_label='+$labelSecret,'clipboard_equals_copy_label='+$labelCopy,'clipboard_looks_masked='+$masked,'clipboard_looks_like_json='+$looksJson,'clipboard_looks_like_html='+$looksHtml,'clipboard_contains_whitespace='+$whitespace,'clipboard_prefix_eyJ='+$prefix,'clipboard_prefix_sb_secret='+$modern,'jwt_three_segments='+$three,'payload_json_valid='+$json,'role_service_role='+$role,'project_ref_match='+$ref,'clipboard_overwrite_verified='+$overwritten,'read_error='+$readError,'overwrite_error='+$overwriteError,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-clipboard-after-copy-detail-20261108.txt
~~~

### 56.2 Interprétation

- UI_LABEL + LE32 : le texte copié est probablement un libellé court, pas une clé ; vérifier l'icône précise.
- MASKED_PLACEHOLDER : le presse-papiers contient un masque de valeur ; le bouton copier n'a pas fourni la clé révélée.
- JSON_TEXT ou HTML_TEXT : le navigateur a copié un bloc de structure/markup plutôt que la valeur brute ; arrêter et tester une seule fois avec un autre navigateur si la bonne icône est confirmée.
- OTHER_TEXT : le contenu est non reconnu ; les indicateurs de longueur et de forme aideront à choisir le prochain contrôle sans le révéler.
- LEGACY_JWT_CANDIDATE sans claims attendus : ne pas poursuivre vers HTTP.
- PASS_CLIPBOARD_JWT_METADATA : format et claims locaux attendus seulement ; la signature et l'acceptation par le serveur ne sont pas validées.

### 56.3 Garde-fous

Aucun GET OpenAPI avant PASS. Ne pas copier ou transmettre le contenu par une autre méthode. Aucun changement de clé, permission, fixture, production ou déploiement. LOT-00 reste PARTIAL / BLOCKED_REVIEW_REQUIRED jusqu'aux preuves HTTP et aux contrôles de sécurité restants.

Document source avant cette mise à jour : V2.53, blob SHA 37ae675855214e2df7b2211316e3bff69e751f37, branche e2e/recette.


---

## 57. Nouvelle tentative contrôlée de classification du presse-papiers — V2.55 — 8 novembre 2026

### 57.1 Motif

Le résultat précédent (§55) était `OTHER_TEXT` après une baseline qui avait réussi (§54). Il établit que le presse-papiers a changé, mais pas que le bouton a copié la clé Legacy. Le classificateur détaillé du §56 est donc retenu pour un nouvel essai unique, après contrôle visuel de la cible du bouton.

### 57.2 Séquence opérateur à répéter

1. Ouvrir explicitement le projet JOBLY-E2E `ofqqrryamslxoqkklraw` dans Supabase.
2. Ouvrir **Project Settings → API Keys → Legacy API Keys**.
3. Identifier la ligne `service_role` portant le badge `secret`. Ne pas confondre l'icône Copier de la valeur avec Copier le nom, Révéler, une autre clé ou le JWT Signing Secret.
4. Exécuter l'étape A de §45.3 pour réinstaller et vérifier la sentinelle. Continuer uniquement si `baseline_verified=True`.
5. Cliquer une seule fois sur l'icône Copier attachée à la valeur de cette ligne.
6. Immédiatement exécuter la commande détaillée du §56.1, puis ouvrir son rapport avec Notepad.
7. Communiquer uniquement les lignes non sensibles du rapport.

### 57.3 Décision selon le résultat

- `PASS_CLIPBOARD_JWT_METADATA` : la forme JWT et les claims locaux `role=service_role` / `ref=ofqqrryamslxoqkklraw` sont établis. Cela ne valide pas la signature ni l'acceptation serveur ; le GET OpenAPI contrôlé pourra alors être préparé.
- `BASELINE_UNCHANGED` ou `UI_LABEL` : le bouton n'a pas fourni le secret attendu ; vérifier la cible exacte du bouton. Ne pas continuer vers HTTP.
- `OTHER_TEXT`, `JSON_TEXT`, `HTML_TEXT`, `MASKED_PLACEHOLDER` ou erreur : ne pas multiplier les clics dans le même navigateur. Si la ligne et le bouton sont visuellement confirmés, effectuer au maximum un essai dans un autre navigateur à jour, en recommençant par la sentinelle.
- Aucun contenu du presse-papiers ne doit être affiché, collé dans une conversation, copié dans un fichier ou envoyé à l'assistant.

### 57.4 État et garde-fous

- Cette section décrit une procédure à exécuter ; aucun nouveau résultat de presse-papiers n'est déclaré ici.
- Aucun GET OpenAPI n'a été exécuté à ce stade ; aucune signature JWT ni acceptation serveur n'est validée.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucun accès à une clé de production ; aucun changement de `main) ; aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.54, blob SHA `44551e84248808579fd2e011e48924943896f675`, branche `e2e/recette`.


---

## 58. Pause des essais presse-papiers répétitifs — V2.56 — 8 novembre 2026

### 58.1 Décision opératoire

Après plusieurs tentatives de classification qui n'ont pas établi le contenu attendu du presse-papiers, l'opérateur signale une fatigue/frustration légitime. **Les essais répétés dans le même navigateur sont suspendus.** Ne pas lui redemander immédiatement de répéter les étapes §45, §56 ou §57.

### 58.2 Faits conservés

- La baseline Windows/PowerShell a été vérifiée : `baseline_verified=True`.
- Après le clic Copier, le classificateur simple a retourné `OTHER_TEXT`, puis `GATE=BLOCKED_COPY_CONTENT_NOT_EXPECTED`.
- Aucun secret n'a été communiqué ni enregistré.
- Aucun appel OpenAPI n'a été exécuté ; aucune preuve d'acceptation ou de rejet serveur n'existe.
- L'origine de `OTHER_TEXT` reste indéterminée ; ne pas l'attribuer avec certitude à Supabase, au navigateur ou à PowerShell.

### 58.3 Changement de stratégie requis

La prochaine reprise ne doit pas répéter le même geste. Préparer une méthode alternative qui évite de transmettre ou d'afficher le secret : vérifier d'abord les possibilités locales déjà authentifiées, par exemple la présence d'une session Supabase CLI ou d'une configuration locale JOBLY-E2E, sans afficher les valeurs secrètes, sans modifier les clés et sans lancer d'appel HTTP avant validation des prérequis. Si aucune méthode sûre n'est disponible, reporter le contrôle credential et poursuivre uniquement les recettes code-only non redondantes.

Aucune recherche de secret sur le disque, aucun dump d'environnement, aucun affichage de variable secrète, aucune transmission dans le chat, aucun appel `net.http_*`, aucun accès JOBLY-PROD.

### 58.4 État

- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Le test presse-papiers est **PAUSED**, pas PASS ni FAIL.
- Aucun GET OpenAPI `public`/`net` n'a été exécuté.
- Aucun compte, fixture, mot de passe, permission ou clé n'a été modifié.
- Aucun changement de `main`, aucune fusion et aucun déploiement.
- PR #266 reste ouverte, en brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.55, blob SHA c8b5977caa546cdf1a5b56daddfbbd91246087b0, branche `e2e/recette`.


---

## 59. Voie alternative CLI pour LOT-00 — V2.57 — 8 novembre 2026

### 59.1 Découverte vérifiée

La documentation Supabase actuelle présente une voie officielle hors Dashboard pour lister les clés d'un projet avec la CLI :

`supabase projects api-keys --project-ref <project-ref>`

La documentation distingue bien les clés Legacy `anon`/`service_role` (JWT) des nouvelles clés `sb_publishable_...`/`sb_secret_...`. Le chemin CLI permet d'éviter le bouton Copier du navigateur. Sources consultées le 8 novembre 2026 :
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/reference/cli/supabase-projects-api-keys

### 59.2 Vérifications non destructives via le connecteur Supabase

Pour le seul projet autorisé `JOBLY-E2E` / `ofqqrryamslxoqkklraw` :
- `get_project` retourne `ACTIVE_HEALTHY`, région `eu-west-1`.
- `get_publishable_keys` retourne la clé Legacy `anon` avec `disabled=false), ainsi que la clé `default` de type publishable avec `disabled=false`.
- Cette réponse ne contient pas la clé `service_role` et ne prouve pas à elle seule son état ; elle ne permet donc pas de clore LOT-00.
- Aucun endpoint de lecture sécurisée de la clé `service_role` n'est exposé dans les outils Supabase connectés à cette session.

### 59.3 Plan de substitution au presse-papiers

- Suspendre définitivement les essais de copie Dashboard (§58).
- Vérifier localement la présence de la CLI Supabase et l'existence d'une session Management API déjà authentifiée. Le contrôle préliminaire utilise uniquement `supabase --version` et `supabase projects list`, sans afficher ni enregistrer de clé.
- Si la CLI est présente et authentifiée, utiliser ensuite `supabase projects api-keys --project-ref ofqqrryamslxoqkklraw` depuis un processus local qui capture sa sortie uniquement en mémoire, sélectionne la clé Legacy dont les claims JWT sont `role=service_role` et `ref=ofqqrryamslxoqkklraw), puis exécute exclusivement les GET OpenAPI prévus au §16.7.
- La valeur ne doit jamais être imprimée, copiée dans le presse-papiers, écrite dans un fichier, ajoutée à une commande, ou transmise à l'assistant. Seuls les statuts HTTP, codes PostgREST et indicateurs de validation sont conservés.
- Si la CLI n'est pas installée ou si aucune session authentifiée n'existe, arrêter le chemin CLI et décider ensuite de l'installation/authentification locale ; ne pas demander de PAT ou de clé dans le chat.
- Ne pas utiliser `--reveal` pour tenter d'exposer une nouvelle clé `sb_secret_...` : le gate actuel vise explicitement la clé Legacy `service_role`.

### 59.4 État et interdictions

- La voie CLI est **identifiée, mais non encore exécutée sur le poste Windows de l'opérateur**.
- Le prochain contrôle demandé est uniquement le préflight non secret ci-dessous ; aucun GET OpenAPI n'est lancé par ce préflight.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-cli-preflight-20261108.txt';$available=$false;$version='NOT_FOUND';$auth='NOT_CHECKED';$e2e=$false;$cliCommand=$false;$exitCode='NOT_RUN';$failure='NONE';try{$null=Get-Command supabase -ErrorAction Stop;$available=$true;$v=@(& supabase --version 2>&1);if($LASTEXITCODE -eq 0){$version=($v -join ' ').Trim()};$h=@(& supabase projects api-keys --help 2>&1);$helpText=($h | ForEach-Object {[string]$_}) -join ' ';$cliCommand=($helpText -match 'api-keys') -and ($helpText -match 'project-ref');$p=@(& supabase projects list 2>&1);$exitCode=[string]$LASTEXITCODE;$projectText=($p | ForEach-Object {[string]$_}) -join ' ';if($exitCode -eq '0'){$auth='CLI_AUTH_OK';$e2e=($projectText -match 'ofqqrryamslxoqkklraw')}else{$auth='CLI_AUTH_REQUIRED_OR_API_ERROR'};$v=$null;$h=$null;$helpText=$null;$p=$null;$projectText=$null}catch{$failure='CLI_NOT_FOUND_OR_PREFLIGHT_ERROR'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'supabase_cli_available='+$available,'supabase_cli_version='+$version,'api_keys_command_project_ref_supported='+$cliCommand,'management_api_auth='+$auth,'jobly_e2e_visible='+$e2e,'projects_list_exit_code='+$exitCode,'failure='+$failure);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-cli-preflight-20261108.txt
~~~

- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'aux réponses OpenAPI réelles et aux autres preuves de sécurité du lot.
- JOBLY-PROD hors périmètre ; aucune clé, fixture, mot de passe, permission ou donnée n'y a été utilisée/modifiée.
- Aucun changement de `main`, aucune fusion, aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.56, blob SHA `d48e06078af5f0591908c283a74973fa3a30625c`, branche `e2e/recette`.


---

## 60. CLI globale absente — préflight sans installation globale — V2.58 — 8 novembre 2026

### 60.1 Résultat opérateur

Le préflight PowerShell 5.1 communiqué retourne :
```text
supabase_cli_available=False
supabase_cli_version=NOT_FOUND
api_keys_command_project_ref_supported=False
management_api_auth=NOT_CHECKED
jobly_e2e_visible=False
projects_list_exit_code=NOT_RUN
failure=CLI_NOT_FOUND_OR_PREFLIGHT_ERROR
```

Conclusion : aucune CLI `supabase` globale n'est détectée. L'authentification CLI n'a donc pas encore été testée. Ce résultat ne dit rien sur la présence d'une session Management API locale par une autre voie.

### 60.2 Méthode sans installation globale ni modification du dépôt

La documentation Supabase à jour (guide Windows/Node mis à jour le 2 novembre 2026) accepte l'exécution du CLI par `npx supabase`, avec Node.js 20 ou supérieur. Le poste est rapporté sous Node.js 26.13.0. Utiliser `npx --yes supabase@latest` permet au préflight de charger le CLI dans le cache npm plutôt que d'ajouter une dépendance au `package.json` du dépôt ou de l'installer globalement.

Références :
- https://supabase.com/docs/guides/local-development/cli/getting-started?access-method=analytics&platform=windows&queryGroups=access-method&queryGroups=platform
- https://supabase.com/docs/reference/cli/introduction

### 60.3 Prochaine commande autorisée — préflight npx uniquement

Elle vérifie le binaire npx, télécharge/charge le CLI dans le cache npm si nécessaire, lit sa version et l'aide de `projects api-keys), puis tente `projects list`. Elle ne récupère aucune API key et ne fait aucune requête à PostgREST.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-npx-preflight-20261108.txt';$available=$false;$version='NOT_FOUND';$helpFlagProjectRef=$false;$helpFlagRemote=$false;$auth='NOT_CHECKED';$e2e=$false;$versionExit='NOT_RUN';$helpExit='NOT_RUN';$projectsExit='NOT_RUN';$failure='NONE';try{$npx=Get-Command npx.cmd -ErrorAction Stop;$available=$true;$v=@(& $npx.Source --yes supabase@latest --version 2>&1);$versionExit=[string]$LASTEXITCODE;if($versionExit -eq '0'){$version=($v -join ' ').Trim()};$h=@(& $npx.Source --yes supabase@latest projects api-keys --help 2>&1);$helpExit=[string]$LASTEXITCODE;$ht=($h | ForEach-Object {[string]$_}) -join ' ';$helpFlagProjectRef=($ht -match '--project-ref');$helpFlagRemote=($ht -match '--remote');$p=@(& $npx.Source --yes supabase@latest projects list 2>&1);$projectsExit=[string]$LASTEXITCODE;$pt=($p | ForEach-Object {[string]$_}) -join ' ';if($projectsExit -eq '0'){$auth='CLI_AUTH_OK';$e2e=($pt -match 'ofqqrryamslxoqkklraw')}else{$auth='CLI_AUTH_REQUIRED_OR_API_ERROR'};$v=$null;$h=$null;$ht=$null;$p=$null;$pt=$null}catch{$failure='NPX_NOT_FOUND_OR_PREFLIGHT_ERROR'};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'npx_available='+$available,'supabase_cli_version='+$version,'version_exit_code='+$versionExit,'api_keys_help_exit_code='+$helpExit,'api_keys_flag_project_ref='+$helpFlagProjectRef,'api_keys_flag_remote='+$helpFlagRemote,'management_api_auth='+$auth,'jobly_e2e_visible='+$e2e,'projects_list_exit_code='+$projectsExit,'failure='+$failure);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-npx-preflight-20261108.txt
~~~

### 60.4 Garde-fous

- Aucun token PAT demandé ou transmis dans la conversation.
- Aucun API key n'est récupéré ou affiché par ce préflight.
- Aucun fichier de dépendance du dépôt n'est modifié ; le paquet CLI n'est utilisé que depuis le cache npm via `npx`.
- Aucune commande `projects api-keys` sans `--help) ; aucun GET OpenAPI à ce stade.
- Si la CLI indique une authentification manquante, la prochaine étape sera une authentification interactive locale officielle, puis un nouveau contrôle de visibilité du seul projet E2E.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucune modification de clé, `main), fusion ou déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.57, blob SHA `b6b63b918582fcd9378e3a94f06d0fb7fee81ff5`, branche `e2e/recette`.


---

## 61. Préflight CLI v3 corrigé et authentification PAT à portée minimale — V2.59 — 8 novembre 2026

### 61.1 Résultat opérateur reçu

```text
runtime=PowerShell 5.1.19041.4522
npx_available=True
supabase_cli_version=3.0.0
version_exit_code=0
api_keys_help_exit_code=0
api_keys_flag_project_ref=False
api_keys_flag_remote=True
management_api_auth=NOT_CHECKED
jobly_e2e_visible=False
projects_list_exit_code=NOT_RUN
failure=NPX_NOT_FOUND_OR_PREFLIGHT_ERROR
```

Conclusions :
- `npx` peut lancer Supabase CLI `3.0.0).
- Pour cette version, le préflight a trouvé `--remote` et non `--project-ref`. Le ciblage correct documenté de la commande est `--remote=<project-ref>`.
- Le script s'est arrêté avant `projects list` et n'a donc pas établi l'état d'authentification. Ne pas diagnostiquer une absence de session à partir de `management_api_auth=NOT_CHECKED`.
- La prochaine commande ne doit plus lister tous les projets du compte. Elle devra cibler directement JOBLY-E2E par son ref explicite.

### 61.2 Permissions minimales documentées

La documentation Supabase indique que la lecture des clés API d'un projet requiert les permissions **API Keys — Read** et **API Key Secrets — Read**. Un jeton personnel peut être limité à un seul projet. Les droits d'écriture ne sont pas nécessaires pour lire les clés. Sources vérifiées le 8 novembre 2026 :
- https://supabase.com/docs/guides/platform/personal-access-tokens
- https://supabase.com/docs/reference/api/v1-get-project-api-key
- https://supabase.com/docs/guides/getting-started/api-keys

Créer, si aucun jeton approprié n'existe déjà, un Personal Access Token (PAT) scoped exclusivement au projet JOBLY-E2E avec ces deux permissions de lecture seulement. Ne pas créer un PAT Legacy/full-access et ne pas accorder d'écriture. Ne jamais transmettre le PAT à l'assistant.

### 61.3 Action locale unique — authentifier Supabase CLI

Dans CMD :
```bat
cd /d C:\Users\ASUS\Jobly
npx.cmd --yes supabase@3.0.0 login
```

Au prompt interactif du CLI, saisir directement dans le terminal le PAT scoped créé dans le Dashboard Supabase, sans le placer dans la commande, une variable shell, un fichier, un rapport ou cette conversation. Attendre le message de succès du CLI. Supabase indique que le CLI conserve ce jeton dans le stockage natif sécurisé quand disponible et utilise un fichier local en repli si ce stockage ne l'est pas ; ne pas ouvrir ou partager ce fichier.

Cette commande n'effectue aucune modification sur le projet Supabase. Elle authentifie uniquement la CLI locale.

### 61.4 Étape suivante après succès de login

Utiliser exclusivement :
`npx.cmd --yes supabase@3.0.0 projects api-keys --remote=ofqqrryamslxoqkklraw`

Cette commande doit être appelée depuis un processus local capturant sa sortie en mémoire ; ne jamais afficher, copier, écrire ou journaliser la réponse contenant les clés. Extraire localement uniquement la Legacy `service_role) du projet E2E, vérifier le format/claims, puis effectuer les GET OpenAPI read-only prescrits au §16.7. Si l'authentification ou les scopes sont insuffisants, ne pas élargir le jeton sans revoir précisément les permissions requises.

### 61.5 Garde-fous et état

- Le préflight précédent n'a prouvé ni réussite ni échec de l'authentification CLI.
- Aucun appel `projects list` n'est à répéter ; ne pas énumérer les projets du compte.
- Aucun appel de lecture de clé ni HTTP OpenAPI n'a encore été exécuté par cette voie.
- Aucun secret/API key/PAT n'a été transmis à l'assistant, imprimé ou ajouté au dépôt.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucun accès ni interrogation de ce projet.
- Aucune mutation Supabase/fixture, aucun changement de `main), aucune fusion et aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.58, blob SHA `85e107006657fb1acfa767bdca7c1b8306eabae1`, branche `e2e/recette`.

---

## 62. Identification et création du PAT Supabase scoped — V2.60 — 8 novembre 2026

### 62.1 Nature du jeton

Le jeton demandé est un **Personal Access Token (PAT) Supabase**, qui authentifie la CLI à la Management API. Il est créé par le titulaire du compte depuis **Account preferences → Access Tokens** dans le Dashboard. Il n'est pas fourni/généré par l'assistant et ne correspond ni au mot de passe, ni à la clé API service_role, ni à anon.

Les PAT scoped créés depuis le Dashboard commencent par sbp_fc. La valeur n'est affichée qu'au moment de la création ; elle ne doit jamais être communiquée à l'assistant.

Source officielle vérifiée le 8 novembre 2026 :
- https://supabase.com/docs/guides/platform/personal-access-tokens

### 62.2 Configuration à sélectionner

Créer un PAT scoped avec :
- Ressource / projet : uniquement JOBLY-E2E, ref ofqqrryamslxoqkklraw.
- Permission **API Keys** : **Read**.
- Permission **API Key Secrets** : **Read**.
- Toute permission Write : désactivée.
- Aucun autre projet ou organisation supplémentaire.
- Expiration courte/appropriée au diagnostic.

Ces deux permissions en lecture sont celles indiquées par Supabase pour les endpoints GET des clés de projet ; la combinaison est requise pour lire les valeurs des API keys. Ne pas sélectionner « Create legacy token », « Legacy », ou un jeton à accès complet.

### 62.3 Correction de la commande d'authentification précédente

La commande supabase login sans argument démarre le flux navigateur et crée un PAT disposant de l'accès complet au compte. **Ne pas utiliser ce flux** pour ce diagnostic à privilège minimal. La documentation supporte deux moyens pour un PAT scoped :
- SUPABASE_ACCESS_TOKEN dans l'environnement du processus CLI ;
- supabase login --token.

Pour éviter d'inscrire le PAT dans l'historique de commandes ou dans la liste des arguments du processus, la prochaine procédure devra demander le PAT via saisie masquée locale, le placer uniquement dans l'environnement mémoire du processus courant, exécuter la commande ciblant uniquement le projet E2E, puis effacer la variable. Ne pas stocker le PAT dans un fichier ou dans le dépôt.

### 62.4 État

- Aucun PAT n'a été créé ou reçu par l'assistant.
- Aucun jeton n'a été saisi ou envoyé dans le chat.
- Aucun appel CLI authentifié, aucune lecture de clé et aucun GET OpenAPI n'a été exécuté.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase, fixture, clé, permission, main, fusion ou déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Cette section corrige et remplace toute indication antérieure qui aurait fait utiliser le flux navigateur non scoped supabase login seul.
- Document source avant cette mise à jour : V2.59, blob SHA 91d2abef8cce8127975a0e8c9adf327250636a3e, branche e2e/recette.

---

## 63. Connexion Supabase signalée — contexte à préciser — V2.61 — 8 novembre 2026

L'opérateur indique « Je me suis logged ». Le canal de connexion n'est pas précisé : Dashboard web ou CLI via `supabase login`. Aucune hypothèse ne doit être faite sur l'état de la session, la nature ou la portée d'un éventuel PAT.

Prochaine question unique : confirmer si la connexion a été faite dans le Dashboard Supabase web ou dans CMD avec `npx.cmd --yes supabase@3.0.0 login`.

Si la connexion est le Dashboard web : poursuivre la création d'un PAT scoped uniquement JOBLY-E2E avec API Keys Read et API Key Secrets Read, sans permission d'écriture. Si la commande CLI login a été exécutée : ne pas lancer de commande d'accès aux clés avant d'avoir établi la portée du jeton ; un flux login navigateur sans PAT fourni peut accorder un accès complet au compte.

Aucun PAT n'a été demandé dans le chat, affiché ou enregistré. Aucun appel CLI authentifié, aucune lecture de clé, aucun GET OpenAPI et aucune modification Supabase n'ont été réalisés sur la base de ce seul message.

LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**. JOBLY-PROD hors périmètre ; aucun changement `main`, aucune fusion ni déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

Document source avant cette mise à jour : V2.60, blob SHA 641f828835483ca54ad9955dd7e7e0c886eef04b, branche `e2e/recette`.

---

## 64. Connexion CLI par flux navigateur — PAT full-access détecté — V2.62 — 8 novembre 2026

### 64.1 Déclaration opérateur

L'opérateur confirme avoir exécuté `npx.cmd --yes supabase@3.0.0 login`, avoir été redirigé vers le navigateur, reçu un jeton via le flux Supabase et terminé la connexion dans CMD.

### 64.2 Portée du jeton

La documentation Supabase mise à jour le 2 novembre 2026 précise explicitement que le flux navigateur de `supabase login` crée actuellement un PAT avec accès complet au compte. Il ne s'agit donc pas du PAT scoped minimal recherché pour LOT-00. Le CLI l'a enregistré localement ; aucune valeur n'a été transmise à l'assistant.

Sources officielles vérifiées le 8 novembre 2026 :
- https://supabase.com/docs/guides/platform/personal-access-tokens
- https://supabase.com/changelog/scoped-personal-access-tokens-ga
- https://supabase.com/docs/reference/cli/introduction

### 64.3 Décision de sécurité

- Ne pas utiliser le PAT issu du flux navigateur pour récupérer les clés du projet.
- Ne pas transmettre, afficher ou journaliser ce PAT.
- Créer dans Dashboard → Account preferences → Access Tokens un PAT **scoped** limité au seul projet JOBLY-E2E (`ofqqrryamslxoqkklraw`) et aux permissions **API Keys — Read** + **API Key Secrets — Read**, sans permission Write.
- Une fois le PAT scoped créé et son usage local vérifié, révoquer/supprimer le PAT full-access créé par le flux navigateur, en identifiant exactement ce jeton dans la liste des tokens. Ne pas supprimer un autre PAT existant.
- Injecter le PAT scoped uniquement dans l'environnement mémoire du processus PowerShell/CLI qui effectue le contrôle ciblé ; ne pas le passer en argument de commande, ne pas l'ajouter à un fichier ni au dépôt.
- La variable d'environnement locale doit être supprimée en `finally` après l'exécution. Ne pas modifier le token stocké par défaut si le PAT scoped temporaire via environnement suffit.

### 64.4 Permissions de lecture des clés

La table des permissions Supabase associe **API Keys — Read** à la lecture de la liste et des métadonnées des clés, et **API Key Secrets — Read** à la révélation de leur valeur. La lecture ciblée de la Legacy `service_role` nécessite les deux droits read-only. Aucun droit d'écriture n'est requis.
Source : https://supabase.com/docs/guides/platform/personal-access-tokens

### 64.5 État

- Authentification CLI : flux navigateur terminé localement, mais PAT stocké considéré full-access par la documentation ; il n'est pas approuvé pour l'opération de lecture de clé.
- PAT scoped : non encore créé.
- Aucune clé API lue via CLI ; aucun GET OpenAPI effectué.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation Supabase/fixture ; aucun changement de clé API, `main`, aucune fusion et aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.61, blob SHA 69d4862bfbf08cacad7c6e10dfe69b611256c742, branche `e2e/recette`.

---

## 65. Utilisation éventuellement bornée du PAT full-access pour un contrôle ponctuel — V2.63 — 8 novembre 2026

### 65.1 Question de l'opérateur

L'opérateur demande si la session CLI issue du flux navigateur peut être contrainte à ne travailler que sur la recette. Réponse : oui au niveau procédural (allowlist de projet, d'endpoint et de méthode HTTP), mais non au niveau des droits intrinsèques du PAT.

### 65.2 Fait de sécurité vérifié

Le PAT créé par le flux navigateur `supabase login` porte l'accès complet au compte. L'option CLI `--remote=<project-ref>` sélectionne le projet pour une commande donnée mais ne réduit pas le périmètre ni les droits du PAT stocké. Toute automatisation locale peut être bornée à des opérations GET et à JOBLY-E2E, mais le jeton reste techniquement capable d'autres opérations si une autre commande l'utilise.

Source officielle : https://supabase.com/docs/guides/platform/personal-access-tokens — mise à jour le 2 novembre 2026.

### 65.3 Garde-fous possibles pour un usage unique

Si l'opérateur choisit explicitement la voie ponctuelle avec le PAT actuel, l'exécution doit être un wrapper local fixe qui :
- cible exclusivement le projet `ofqqrryamslxoqkklraw` ;
- n'appelle que l'opération de lecture de clés nécessaire au diagnostic ;
- sélectionne en mémoire uniquement la Legacy `service_role` attendue ;
- vérifie localement les claims du projet E2E et le rôle ;
- envoie uniquement deux GET au endpoint PostgREST OpenAPI `public` puis `net` ;
- ne contient aucun chemin d'écriture, aucun autre projet, aucune commande générique reçue en paramètre ;
- ne journalise ni PAT, ni API key, ni header ; seuls les statuts HTTP et indicateurs non sensibles sont consignés ;
- retire les variables sensibles de l'environnement du processus à la fin.

Ces garde-fous limitent le comportement du wrapper et constituent une restriction opérationnelle, **pas une restriction cryptographique ou IAM du PAT**.

### 65.4 Préférence

La préférence de sécurité reste de créer un PAT scoped au seul projet JOBLY-E2E avec API Keys Read + API Key Secrets Read, sans droits d'écriture. La voie full-access peut être envisagée pour un seul contrôle read-only si l'opérateur l'autorise explicitement, sur un poste qu'il contrôle, puis le PAT full-access devra être révoqué après le contrôle. Ne jamais employer ce PAT pour une autre action Jobly.

### 65.5 État

- Aucun nouvel usage du PAT full-access n'a été exécuté sur la base de cette question.
- Aucun appel API Keys ou OpenAPI n'a été fait via la session CLI.
- LOT-00 demeure **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucune mutation, aucune modification `main`, aucune fusion ni déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.62, blob SHA 281499a84a1a7cd844922b51f12c2e977cfb6cf1, branche `e2e/recette`.

---

## 66. Séquence unique CLI → claims → GET OpenAPI — V2.64 — 8 novembre 2026

### 66.1 Décision de moindre exposition

La CLI v3 `projects api-keys` peut retourner les clés Legacy sous forme JWT, tandis que la valeur des nouvelles clés `sb_secret_...` est redacted par défaut ; `--reveal` provoque la révélation des clés secrètes. Pour éviter d'exposer toutes les nouvelles clés secrètes du projet, ne pas utiliser `--reveal` dans cette recette. Appeler uniquement `projects api-keys --remote=<JOBLY-E2E> --output json`, capturer stdout en mémoire et sélectionner le seul enregistrement `name=service_role`.

Source technique CLI v3.0.0 : `apps/cli/src/commands/projects/api-keys/SIDE_EFFECTS.md` dans https://github.com/supabase/cli/tree/v3.0.0 ; documentation utilisateur : https://supabase.com/docs/guides/getting-started/api-keys ; issue qui documente la distinction Legacy vs nouvelles clés : https://github.com/supabase/cli/issues/4775.

### 66.2 Séquence autorisée

1. Vérifier que `SUPABASE_ACCESS_TOKEN` n'est pas défini dans l'environnement du processus. Si défini, arrêter sans afficher sa valeur. Le CLI utilisera alors le token déjà enregistré lors de la connexion locale.
2. Exécuter seulement `npx.cmd --yes supabase@3.0.0 --output json projects api-keys --remote=ofqqrryamslxoqkklraw` ; aucun `projects list`, `link`, `db`, `secrets`, `--reveal` ou autre commande.
3. Capturer toute la sortie stdout dans une variable en mémoire, jamais à l'écran ni dans un fichier. Exiger un unique enregistrement `service_role` avec `api_key` non vide.
4. Vérifier localement sans afficher le JWT : trois segments, en-tête `alg=HS256`, claims `role=service_role` et `ref=ofqqrryamslxoqkklraw`. Cette étape ne vérifie pas la signature cryptographique.
5. Si les claims concordent, envoyer deux GET, et seulement deux, vers `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/`, avec `apikey`, `Authorization: Bearer`, `Accept: application/openapi+json` et `Accept-Profile` successivement `public` puis `net`.
6. Conserver dans le rapport uniquement code HTTP, code PostgREST, présence OpenAPI et nombre de chemins ; ne jamais écrire le corps de la spec, le PAT, la clé ou les en-têtes.
7. Effacer les références PowerShell aux chaînes sensibles avant de terminer. La mémoire du processus est de courte durée ; cette opération ne constitue pas une garantie matérielle d'effacement mémoire.

### 66.3 Critères

- `public` HTTP 200 et document OpenAPI valide, puis `net` HTTP 406 avec `PGRST106` : `PASS_NET_NOT_EXPOSED`.
- `net` HTTP 200 avec OpenAPI : `BLOCKED_NET_EXPOSED`; aucun changement de schéma/grant sans autorisation distincte.
- Si la clé Legacy `service_role` n'est pas fournie sans `--reveal`, arrêter avec `BLOCKED_SERVICE_ROLE_VALUE_REDACTED`. Ne pas lancer `--reveal` automatiquement : cette option peut révéler d'autres clés secrètes. Demander une décision supplémentaire ou préférer un PAT scoped adapté.
- Toute erreur CLI, JWT/claims non conformes, erreur HTTP, résultat autre que les deux attendus : `BLOCKED_REVIEW_REQUIRED`; aucun retry automatique.

### 66.4 Limites

Le PAT issu du flux navigateur demeure full-access ; `--remote` limite la cible de cette commande, pas les permissions du PAT. Le script est une contention procédurale, pas une restriction IAM. Il n'effectue aucune écriture, aucun RPC métier, aucun appel `net.http_*`, aucun accès Auth, aucune migration et aucun accès JOBLY-PROD.

Aucun appel CLI `projects api-keys` ni GET OpenAPI n'a encore été exécuté au moment de l'ajout de cette section.

LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**. Après le contrôle OpenAPI, la décision sur les buckets publics et la revue ciblée des privilèges restent à clôturer. `main` inchangée ; aucune fusion ni aucun déploiement ; PR #266 reste ouverte, brouillon, non fusionnée.

Document source avant cette mise à jour : V2.63, blob SHA 496e8659ace78b223476eb9106ff5b10c9276b4b, branche `e2e/recette`.

---

## 67. Réduction des handoffs opérateur — raison de la commande locale — V2.65 — 8 novembre 2026

### 67.1 Réponse au point de l'opérateur

L'opérateur demande pourquoi multiplier les commandes si Supabase CLI peut réaliser le contrôle. Décision : supprimer les prétests et handoffs intermédiaires désormais redondants. Ne demander qu'une seule exécution locale complète pour le contrôle OpenAPI LOT-00 lorsque le CLI est authentifié.

### 67.2 Limite réelle de l'environnement assistant

La session Supabase CLI authentifiée est stockée localement sur le poste Windows de l'opérateur. Les outils connectés Supabase de cette session permettent des opérations de gestion et d'inspection ciblées (état projet, clés publishable, SQL, tables, migrations, advisors), mais aucun outil exposé ne permet de lire la valeur Legacy `service_role` du projet. L'assistant ne dispose pas d'un shell distant sur le CMD local, ni d'un accès au fichier/keyring local de la CLI. Il ne peut donc pas exécuter à distance la commande CLI déjà authentifiée.

Cette frontière est la seule raison du dernier handoff local ; ce n'est pas une nécessité de répéter des diagnostics. La commande doit faire le travail utile en une fois, sans exposer PAT ou API key.

### 67.3 Règle opératoire mise à jour

- Ne plus demander `supabase projects list`, préflight CLI séparé, test du presse-papiers ou collecte d'informations déjà établies.
- Pour LOT-00, conserver une seule exécution locale contrôlée : récupération en mémoire de la Legacy `service_role` sans `--reveal` pour les nouvelles clés, validation locale des claims, puis deux GET OpenAPI en lecture seule si les claims correspondent.
- Si le CLI ne renvoie pas de valeur non redacted pour Legacy `service_role`, arrêt net et demande d'une décision précise ; pas de `--reveal` automatique.
- Pendant ce temps, l'assistant doit avancer directement avec les outils connectés sur les contrôles réellement accessibles, sans demander à l'opérateur de les refaire.
- Aucune opération autre que GET pour le contrôle OpenAPI ; aucun accès JOBLY-PROD, aucun changement de clés, droits, fixtures, `main`, merge ou déploiement.

### 67.4 État

- Supabase CLI 3.0.0 lancé via npx et login navigateur effectué localement par l'opérateur.
- PAT stocké localement issu du flux navigateur considéré full-access ; utilisation uniquement opérationnelle et ponctuelle telle que §65-66, avec révocation après le contrôle. Aucun PAT ou API key communiqué à l'assistant.
- Aucun GET OpenAPI exécuté à ce stade.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- PR #266 reste ouverte, brouillon, non fusionnée ; `main` inchangée ; aucun déploiement.
- Document source avant cette mise à jour : V2.64, blob SHA f20b3ae830303e8c2de3b2e24ab8079a0c113b76, branche `e2e/recette`.

---

## 68. Correction technique du chemin CLI et commande finale unique — V2.66 — 8 novembre 2026

### 68.1 Vérification directe du code Supabase CLI v3.0.0

Inspection des fichiers sources officiels taggés `v3.0.0` : `apps/cli/src/commands/projects/api-keys/api-keys.handler.ts`, `apps/cli/src/command-internal/get-api-keys.ts` et fixtures E2E enregistrées.

Constats :
- La réponse `GET /v1/projects/{ref}/api-keys` sans `reveal=true` peut contenir la Legacy `service_role` avec son JWT (`id=service_role`, `type=legacy`, `api_key` non nul). Les fixtures `default.response.json` de la CLI v3 le montrent explicitement.
- Les nouvelles clés de type `secret` (`sb_secret_...`) sont redacted par défaut (`api_key=null`) ; `--reveal` ajoute `reveal=true` et dévoile les valeurs de type secret.
- Le contrôle LOT-00 vise la clé Legacy `service_role` et ne doit donc pas utiliser `--reveal`.
- Pour obtenir un JSON stable, la forme du CLI est `supabase projects api-keys --remote=<ref> --output json` (le flag output est placé après la sous-commande).

Sources :
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/projects/api-keys/api-keys.handler.ts
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/command-internal/get-api-keys.ts
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli/src/commands/projects/api-keys/SIDE_EFFECTS.md
- https://github.com/supabase/cli/blob/v3.0.0/apps/cli-e2e/fixtures/recorded/GET_v1_projects_replayfixtureprojref_api_keys/default.response.json

Cette inspection corrige toute ambiguïté antérieure : **la clé Legacy `service_role` doit être disponible sans `--reveal`** dans le scénario CLI v3 attendu. Si elle ne l'est pas dans ce projet réel, le script s'arrête.

### 68.2 Contrôle SQL read-only supplémentaire

Une requête SELECT unique sur JOBLY-E2E a consulté `current_setting('pgrst.db_schemas', true)`, `current_setting('pgrst.db_extra_search_path', true)` et les paramètres `pgrst.db_schemas` attachés aux rôles/bases via `pg_db_role_setting`.

Résultat : `session_db_schemas=null`, `session_extra_search_path=null`, `role_db_schemas=[]`, `database_db_schemas=[]`. Ce résultat demeure **NON CONCLUANT** : la configuration effective peut provenir de l'environnement du service PostgREST et n'être pas exposée dans ces paramètres PostgreSQL. Il ne prouve ni l'exposition ni la non-exposition de `net`. Aucune modification n'a eu lieu.

### 68.3 Règle d'exécution finale

Ne plus demander de préflight intermédiaire. L'unique handoff opérateur restant est la commande finale locale qui :
- utilise la session CLI locale déjà connectée ;
- appelle uniquement `projects api-keys` sur `ofqqrryamslxoqkklraw`, sans `--reveal` et sans `projects list` ;
- capture stdout en mémoire, sélectionne `name=service_role` et vérifie localement les claims `role` et `ref` ;
- exécute ensuite les deux GET OpenAPI `public` et `net` si et seulement si les claims correspondent ;
- écrit un rapport exclusivement constitué de résultats non sensibles et remplace toutes les références locales explicites à la clé par null avant la fin du script.

Cette commande locale est nécessaire uniquement parce que la session CLI et son stockage de credentials sont sur le poste Windows de l'opérateur, sans shell distant accessible à l'assistant. Les contrôles exposés par le connecteur Supabase sont exécutés directement par l'assistant et ne sont pas redemandés à l'opérateur.

### 68.4 État

- Aucune requête de lecture de clés via la CLI n'a encore eu lieu.
- Aucun GET OpenAPI n'a encore eu lieu.
- LOT-00 : **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Le résultat SQL sur les paramètres PGRST reste inconclusif.
- PAT CLI issu du flux navigateur : full-access ; usage admis uniquement pour cette opération ciblée en lecture seule, puis révocation après le contrôle. Ce bornage est procédural et ne modifie pas les permissions réelles du PAT.
- JOBLY-PROD hors périmètre ; aucun DML/DDL, aucune mutation fixture, aucun changement `main`, aucune fusion ni déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.65, blob SHA fa25092885c7fe7512614f3adbca9cc35c3d5426, branche `e2e/recette`.

---

## 69. Commande finale locale LOT-00 — une seule exécution — V2.67 — 8 novembre 2026

### 69.1 Preuves sources exactes

La fixture enregistrée de Supabase CLI v3.0.0 `GET_v1_projects_replayfixtureprojref_api_keys/default.response.json` comprend une entrée `name=service_role`, `id=service_role`, `type=legacy`, `api_key=__JWT__` sans option reveal. La même réponse contient séparément une entrée `type=secret` dont la valeur est opaque. Cela confirme qu'on peut sélectionner l'ancienne clé Legacy sans révéler la clé moderne `sb_secret`.

Source : https://raw.githubusercontent.com/supabase/cli/v3.0.0/apps/cli-e2e/fixtures/recorded/GET_v1_projects_replayfixtureprojref_api_keys/default.response.json

Le CLI v3 permet `--remote=<ref>` et `--output json`. Le PAT full-access, issu de `supabase login` navigateur, demeure local. L'opérateur a explicitement autorisé une utilisation ponctuelle strictement bornée à cette recette en lecture seule.

### 69.2 Commande unique à exécuter dans CMD

Le script ci-dessous exécute la récupération locale, valide le format/les claims, puis les deux GET OpenAPI. Il n'utilise pas `--reveal`, n'utilise pas `projects list`, et n'émet aucun secret. Il bloque si `SUPABASE_ACCESS_TOKEN` est défini dans l'environnement, afin de forcer l'utilisation du login CLI local déjà établi. Aucun préflight supplémentaire n'est nécessaire.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-openapi-readonly-20261108.txt';$envTokenPresent=(-not [string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN));$cliExit='NOT_RUN';$legacyCount=0;$jwtThree=$false;$jwtAlg='UNKNOWN';$roleMatch=$false;$refMatch=$false;$pubHttp='NOT_RUN';$pubOpenApi=$false;$pubPaths=0;$pubPgrst='NONE';$netHttp='NOT_RUN';$netOpenApi=$false;$netPaths=0;$netPgrst='NONE';$gate='BLOCKED_NOT_STARTED';$key=$null;$cliText=$null;$cliLines=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null;$failure='NONE';function Invoke-OpenApi([string]$profile,[string]$secretKey){$status='NO_HTTP';$code='NONE';$valid=$false;$count=0;$response=$null;$reader=$null;$body=$null;$spec=$null;$err=$null;$request=$null;try{$request=[System.Net.HttpWebRequest]::Create('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/');$request.Method='GET';$request.Accept='application/openapi+json';$request.UserAgent='JoblyE2E-LOT00-Readonly/1.0';$request.Headers['apikey']=$secretKey;$request.Headers['Authorization']='Bearer '+$secretKey;$request.Headers['Accept-Profile']=$profile;$request.Timeout=30000;$request.ReadWriteTimeout=30000;try{$response=$request.GetResponse()}catch [System.Net.WebException]{$response=$_.Exception.Response};if($null -ne $response){$status=[string][int]$response.StatusCode;$reader=New-Object System.IO.StreamReader($response.GetResponseStream());$body=$reader.ReadToEnd();if($status -eq '200'){try{$spec=ConvertFrom-Json -InputObject $body -ErrorAction Stop;$valid=($null -ne $spec.openapi) -or ($null -ne $spec.swagger);if($null -ne $spec.paths){$count=$spec.paths.PSObject.Properties.Count}}catch{$valid=$false}}else{try{$err=ConvertFrom-Json -InputObject $body -ErrorAction Stop;if($null -ne $err.code){$code=[string]$err.code}}catch{}}}else{$status='NETWORK_ERROR'}}catch{$status='REQUEST_ERROR'}finally{if($null -ne $reader){$reader.Dispose()};if($null -ne $response){$response.Close()};$request=$null;$body=$null;$spec=$null;$err=$null};return [pscustomobject]@{http=$status;openapi=$valid;paths=$count;pgrst=$code}};try{if($envTokenPresent){$gate='BLOCKED_ENV_TOKEN_OVERRIDE'}else{$npx=(Get-Command npx.cmd -ErrorAction Stop).Source;$cliLines=@(& $npx --yes supabase@3.0.0 projects api-keys --remote=ofqqrryamslxoqkklraw --output json 2>$null);$cliExit=[string]$LASTEXITCODE;$cliText=($cliLines | ForEach-Object {[string]$_}) -join ([Environment]::NewLine);$cliLines=$null;if($cliExit -ne '0'){$gate='BLOCKED_CLI_AUTH_OR_API_ERROR'}else{$rows=@(ConvertFrom-Json -InputObject $cliText -ErrorAction Stop);$selected=@($rows | Where-Object {$_.name -eq 'service_role' -and $_.type -eq 'legacy'});$legacyCount=$selected.Count;if($legacyCount -ne 1){$gate='BLOCKED_LEGACY_SERVICE_ROLE_NOT_UNIQUE'}else{$key=[string]$selected[0].api_key;if([string]::IsNullOrWhiteSpace($key)){$gate='BLOCKED_LEGACY_SERVICE_ROLE_REDACTED'}else{$parts=$key.Split([char]'.');$jwtThree=($parts.Length -eq 3);if($jwtThree){$head64=$parts[0].Replace('-','+').Replace('_','/');$body64=$parts[1].Replace('-','+').Replace('_','/');while(($head64.Length % 4) -ne 0){$head64+='='};while(($body64.Length % 4) -ne 0){$body64+='='};$headText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($head64));$bodyText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($body64));$jwtHeader=ConvertFrom-Json -InputObject $headText -ErrorAction Stop;$jwtClaims=ConvertFrom-Json -InputObject $bodyText -ErrorAction Stop;$jwtAlg=[string]$jwtHeader.alg;$roleMatch=($jwtClaims.role -eq 'service_role');$refMatch=($jwtClaims.ref -eq 'ofqqrryamslxoqkklraw')};if($jwtThree -and $jwtAlg -eq 'HS256' -and $roleMatch -and $refMatch){$pub=Invoke-OpenApi -profile 'public' -secretKey $key;$pubHttp=[string]$pub.http;$pubOpenApi=[bool]$pub.openapi;$pubPaths=[int]$pub.paths;$pubPgrst=[string]$pub.pgrst;$net=Invoke-OpenApi -profile 'net' -secretKey $key;$netHttp=[string]$net.http;$netOpenApi=[bool]$net.openapi;$netPaths=[int]$net.paths;$netPgrst=[string]$net.pgrst;if($pubHttp -eq '200' -and $pubOpenApi -and $netHttp -eq '406' -and $netPgrst -eq 'PGRST106'){$gate='PASS_NET_NOT_EXPOSED'}elseif($netHttp -eq '200' -and $netOpenApi){$gate='BLOCKED_NET_EXPOSED'}else{$gate='BLOCKED_HTTP_OR_OPENAPI_RESULT'}}else{$gate='BLOCKED_JWT_CLAIMS_MISMATCH'}}}}}}catch{$gate='BLOCKED_CLI_JSON_OR_INTERNAL_ERROR';$failure='CHECK_COMMAND_FAILED'}finally{$key=$null;$cliText=$null;$cliLines=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','supabase_cli_version=3.0.0','env_SUPABASE_ACCESS_TOKEN_present='+$envTokenPresent,'cli_command_exit_code='+$cliExit,'legacy_service_role_count='+$legacyCount,'jwt_three_segments='+$jwtThree,'jwt_algorithm='+$jwtAlg,'jwt_role_service_role='+$roleMatch,'jwt_project_ref_match='+$refMatch,'jwt_signature_verified=False','public_http_status='+$pubHttp,'public_openapi_valid='+$pubOpenApi,'public_openapi_path_count='+$pubPaths,'public_postgrest_code='+$pubPgrst,'net_http_status='+$netHttp,'net_openapi_valid='+$netOpenApi,'net_openapi_path_count='+$netPaths,'net_postgrest_code='+$netPgrst,'failure='+$failure,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-openapi-readonly-20261108.txt
~~~

### 69.3 Sortie attendue et interprétation

Le rapport `feedback-lot00-openapi-readonly-20261108.txt` ne contient que les codes HTTP, les indicateurs JWT non secrets, le code PostgREST, le nombre de chemins OpenAPI et le GATE. L'ouvrir avec la commande Notepad fournie après l'exécution.

- `PASS_NET_NOT_EXPOSED` exige `public_http_status=200`, `public_openapi_valid=True`, `net_http_status=406` et `net_postgrest_code=PGRST106`.
- `BLOCKED_NET_EXPOSED` si le profil net reçoit HTTP 200 et OpenAPI valide.
- Toute autre valeur maintient `BLOCKED_REVIEW_REQUIRED`; aucune modification du schéma ou des droits n'est automatique.

### 69.4 Garde-fous

- Appel Management API en GET limité à `api-keys` pour le ref E2E explicitement fourni ; appel PostgREST en deux GET seulement.
- Aucun `--reveal` ; aucune nouvelle clé `sb_secret` révélée ; aucun `projects list`.
- Pour le Data API, la clé JWT Legacy est envoyée dans `apikey` et `Authorization: Bearer`, car c'est un JWT HS256.
- Aucun accès JOBLY-PROD, aucun DML/DDL/RPC métier/`net.http_*`, aucune opération Auth, aucune mutation fixture, aucune fusion, aucun déploiement.
- Le script annule ses références locales à la clé et aux objets de sortie avant de terminer ; cela ne garantit pas l'effacement physique des chaînes en mémoire du runtime.
- Le PAT full-access demeure full-access au compte ; les restrictions sont procédurales. Le révoquer dans Dashboard → Access Tokens après le contrôle, en identifiant exactement le PAT créé par le login navigateur, sans révoquer un autre jeton.

- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à réception et analyse du rapport.
- `main` inchangée ; PR #266 ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.66, blob SHA 41623285363f1267fe3f7109f91fcd9dcda20a6b, branche `e2e/recette`.

---

## 70. Envoi direct des commandes de recette — état d'exécution — V2.68 — 8 novembre 2026

### 70.1 Commandes à exécuter maintenant

L'opérateur demande l'envoi direct des commandes de recette. Réponse opératoire :

1. Les commandes bulk déjà PASS (302 tests historiques couverts, 66/66 Identity revalidés, 6/6 authenticated-runtime-contracts) ne doivent pas être répétées. Aucun nouvel appel bulk n'est nécessaire.
2. Le seul contrôle exécutable maintenant pour débloquer les scénarios runtime est la commande LOT-00 exacte du §69.2. Elle doit être transmise directement à l'opérateur, pas seulement un lien vers le document.
3. Ne pas lancer `scripts/e2e-local-recipe.mjs`, les recettes Auth/runtime, navigateur connecté ou bulk global tant que LOT-00 ne remplit pas ses critères de sortie et que les prérequis/fixtures n'ont pas été vérifiés. Le runner global ne permet pas de sélectionner un seul lot et pourrait atteindre des étapes de restauration runtime ; il demeure bloqué par les règles de reprise historiques et les protections fixtures.
4. À réception du rapport LOT-00 : analyser les deux profils ; si le gate est conforme, planifier le parcours Auth / Talent / Recruteur en séquence, avec preuve d'exécution et de nettoyage. Si le gate ne l'est pas, corriger seulement le blocage observé.

### 70.2 Commandes d'ouverture du résultat

Le §69.2 crée `feedback-lot00-openapi-readonly-20261108.txt` et termine déjà par le Notepad associé. Ne pas exécuter le Notepad avant la création du fichier.

### 70.3 État

- Aucun nouveau test local ou runtime n'a été lancé par cette mise à jour documentaire.
- Groupes bulk locaux déjà couverts : aucune relance demandée.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'au rapport OpenAPI.
- JOBLY-PROD hors périmètre ; aucun accès, aucune mutation, aucun changement de `main`, aucune fusion ni déploiement.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.67, blob SHA e296f4c524941eba41845d69939eabd70cc58c6d, branche `e2e/recette`.

---

## 71. Échec PowerShell avant retour CLI — correction native stderr — V2.69 — 8 novembre 2026

### 71.1 Rapport opérateur

```text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
supabase_cli_version=3.0.0
env_SUPABASE_ACCESS_TOKEN_present=False
cli_command_exit_code=NOT_RUN
legacy_service_role_count=0
jwt_three_segments=False
jwt_algorithm=UNKNOWN
jwt_role_service_role=False
jwt_project_ref_match=False
jwt_signature_verified=False
public_http_status=NOT_RUN
public_openapi_valid=False
public_openapi_path_count=0
public_postgrest_code=NONE
net_http_status=NOT_RUN
net_openapi_valid=False
net_openapi_path_count=0
net_postgrest_code=NONE
failure=CHECK_COMMAND_FAILED
GATE=BLOCKED_CLI_JSON_OR_INTERNAL_ERROR
```

### 71.2 Analyse exacte

- `env_SUPABASE_ACCESS_TOKEN_present=False` : aucun override d'environnement détecté ; le script était censé utiliser le credential local du CLI.
- `cli_command_exit_code=NOT_RUN` : la variable n'a pas été assignée après l'appel natif. Cela ne prouve ni un refus d'authentification, ni un refus Management API, ni une clé absente.
- `failure=CHECK_COMMAND_FAILED` : le catch générique a masqué la classe d'exception ; aucun diagnostic CLI n'a été capturé.
- Cause plausible, non encore prouvée : Windows PowerShell 5.1 traite certaines lignes stderr d'un programme natif comme des erreurs PowerShell. Avec `$ErrorActionPreference='Stop'` et `2>$null`, un avertissement/erreur stderr de npx peut interrompre l'affectation avant la lecture de `$LASTEXITCODE`.

### 71.3 Correction

La commande de reprise doit abaisser temporairement `$ErrorActionPreference` à `Continue` uniquement pendant l'appel natif `npx.cmd`, puis restaurer `Stop` immédiatement après. Capturer `$LASTEXITCODE` sans afficher stdout. Capturer uniquement la classe d'exception (pas son message) en cas d'erreur inattendue. L'appel CLI conserve strictement les mêmes paramètres : version 3.0.0, projet E2E explicite, `--output json`, sans `--reveal` et sans `projects list`.

Aucune modification de la clé, du PAT, des droits, de Supabase ou du code local n'est requise pour cette correction.

### 71.4 État

- La commande CLI n'a pas fourni de code retour ; aucun résultat OpenAPI n'a été obtenu.
- Aucun élément ne permet de déclarer que Supabase a rejeté le PAT ou la clé `service_role`.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- JOBLY-PROD hors périmètre ; aucun accès ni mutation ; aucun changement `main`, aucune fusion ni aucun déploiement.
- PR #266 reste ouverte, brouillon et non fusionnée.
- Document source avant cette mise à jour : V2.68, blob SHA 6e9d4a4357e6157b08347650c1cebea188e4f178, branche `e2e/recette`.

---

## 72. Reprise LOT-00 après exception PowerShell — commande corrigée — V2.70 — 8 novembre 2026

### 72.1 Correction technique

Le résultat §71 montrait `cli_command_exit_code=NOT_RUN`, ce qui indique une exception PowerShell avant la capture du code retour natif. Cause probable : traitement du stderr d'un programme natif par Windows PowerShell 5.1 lorsque `$ErrorActionPreference='Stop'` et `2>$null` sont combinés. La commande ci-dessous passe temporairement à `Continue` seulement pendant l'appel npx, restaure immédiatement la préférence, puis capture le code retour. Le catch ne journalise que le type d'exception, pas son message.

### 72.2 Commande unique corrigée

Cette commande refait la séquence complète sans préflight additionnel : Management API GET de la liste des clés pour le seul ref JOBLY-E2E, sélection de la Legacy `service_role`, vérification locale des claims, puis GET OpenAPI `public` et `net`. Elle ne fait pas usage de `--reveal` ni de `projects list`.

~~~bat
cd /d C:\Users\ASUS\Jobly
powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$report='feedback-lot00-openapi-readonly-20261108.txt';$envTokenPresent=(-not [string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN));$cliExit='NOT_RUN';$legacyCount=0;$jsonParsed=$false;$jwtThree=$false;$jwtAlg='UNKNOWN';$roleMatch=$false;$refMatch=$false;$pubHttp='NOT_RUN';$pubOpenApi=$false;$pubPaths=0;$pubPgrst='NONE';$netHttp='NOT_RUN';$netOpenApi=$false;$netPaths=0;$netPgrst='NONE';$gate='BLOCKED_NOT_STARTED';$key=$null;$cliText=$null;$cliOut=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null;$failure='NONE';function Invoke-OpenApi([string]$profile,[string]$secretKey){$status='NO_HTTP';$code='NONE';$valid=$false;$count=0;$response=$null;$reader=$null;$body=$null;$spec=$null;$err=$null;$request=$null;try{$request=[System.Net.HttpWebRequest]::Create('https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/');$request.Method='GET';$request.Accept='application/openapi+json';$request.UserAgent='JoblyE2E-LOT00-Readonly/1.0';$request.Headers['apikey']=$secretKey;$request.Headers['Authorization']='Bearer '+$secretKey;$request.Headers['Accept-Profile']=$profile;$request.Timeout=30000;$request.ReadWriteTimeout=30000;try{$response=$request.GetResponse()}catch [System.Net.WebException]{$response=$_.Exception.Response};if($null -ne $response){$status=[string][int]$response.StatusCode;$reader=New-Object System.IO.StreamReader($response.GetResponseStream());$body=$reader.ReadToEnd();if($status -eq '200'){try{$spec=ConvertFrom-Json -InputObject $body -ErrorAction Stop;$valid=($null -ne $spec.openapi) -or ($null -ne $spec.swagger);if($null -ne $spec.paths){$count=$spec.paths.PSObject.Properties.Count}}catch{$valid=$false}}else{try{$err=ConvertFrom-Json -InputObject $body -ErrorAction Stop;if($null -ne $err.code){$code=[string]$err.code}}catch{}}}else{$status='NETWORK_ERROR'}}catch{$status='REQUEST_ERROR'}finally{if($null -ne $reader){$reader.Dispose()};if($null -ne $response){$response.Close()};$request=$null;$body=$null;$spec=$null;$err=$null};return [pscustomobject]@{http=$status;openapi=$valid;paths=$count;pgrst=$code}};try{if($envTokenPresent){$gate='BLOCKED_ENV_TOKEN_OVERRIDE'}else{$npx=(Get-Command npx.cmd -ErrorAction Stop).Source;$savedNativePreference=$ErrorActionPreference;try{$ErrorActionPreference='Continue';$cliOut=@(& $npx --yes supabase@3.0.0 projects api-keys --remote=ofqqrryamslxoqkklraw --output json 2>$null);$cliExit=[string]$LASTEXITCODE}finally{$ErrorActionPreference=$savedNativePreference};if($cliExit -ne '0'){$gate='BLOCKED_CLI_NONZERO_EXIT'}else{$cliText=($cliOut | ForEach-Object {[string]$_}) -join ([Environment]::NewLine);$cliOut=$null;$root=ConvertFrom-Json -InputObject $cliText -ErrorAction Stop;$jsonParsed=$true;if($root -is [array]){$rows=@($root)}elseif($null -ne $root.keys){$rows=@($root.keys)}else{$rows=@()};$selected=@($rows | Where-Object {$_.name -eq 'service_role' -and $_.type -eq 'legacy'});$legacyCount=$selected.Count;if($legacyCount -ne 1){$gate='BLOCKED_LEGACY_SERVICE_ROLE_NOT_UNIQUE'}else{$key=[string]$selected[0].api_key;if([string]::IsNullOrWhiteSpace($key)){$gate='BLOCKED_LEGACY_SERVICE_ROLE_REDACTED'}else{$parts=$key.Split([char]'.');$jwtThree=($parts.Length -eq 3);if($jwtThree){$head64=$parts[0].Replace('-','+').Replace('_','/');$body64=$parts[1].Replace('-','+').Replace('_','/');while(($head64.Length % 4) -ne 0){$head64+='='};while(($body64.Length % 4) -ne 0){$body64+='='};$headText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($head64));$bodyText=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($body64));$jwtHeader=ConvertFrom-Json -InputObject $headText -ErrorAction Stop;$jwtClaims=ConvertFrom-Json -InputObject $bodyText -ErrorAction Stop;$jwtAlg=[string]$jwtHeader.alg;$roleMatch=($jwtClaims.role -eq 'service_role');$refMatch=($jwtClaims.ref -eq 'ofqqrryamslxoqkklraw')};if($jwtThree -and $jwtAlg -eq 'HS256' -and $roleMatch -and $refMatch){$pub=Invoke-OpenApi -profile 'public' -secretKey $key;$pubHttp=[string]$pub.http;$pubOpenApi=[bool]$pub.openapi;$pubPaths=[int]$pub.paths;$pubPgrst=[string]$pub.pgrst;$net=Invoke-OpenApi -profile 'net' -secretKey $key;$netHttp=[string]$net.http;$netOpenApi=[bool]$net.openapi;$netPaths=[int]$net.paths;$netPgrst=[string]$net.pgrst;if($pubHttp -eq '200' -and $pubOpenApi -and $netHttp -eq '406' -and $netPgrst -eq 'PGRST106'){$gate='PASS_NET_NOT_EXPOSED'}elseif($netHttp -eq '200' -and $netOpenApi){$gate='BLOCKED_NET_EXPOSED'}else{$gate='BLOCKED_HTTP_OR_OPENAPI_RESULT'}}else{$gate='BLOCKED_JWT_CLAIMS_MISMATCH'}}}}}}catch{$failure=$_.Exception.GetType().Name;if($cliExit -eq 'NOT_RUN'){$gate='BLOCKED_POWERSHELL_BEFORE_CLI_EXIT'}else{$gate='BLOCKED_CHECK_EXCEPTION'}}finally{$key=$null;$cliText=$null;$cliOut=$null;$rows=$null;$selected=$null;$parts=$null;$head64=$null;$body64=$null;$headText=$null;$bodyText=$null;$jwtHeader=$null;$jwtClaims=$null;$pub=$null;$net=$null;$root=$null};$lines=@('runtime=PowerShell '+$PSVersionTable.PSVersion.ToString(),'project_ref=ofqqrryamslxoqkklraw','supabase_cli_version=3.0.0','env_SUPABASE_ACCESS_TOKEN_present='+$envTokenPresent,'cli_command_exit_code='+$cliExit,'cli_json_parsed='+$jsonParsed,'legacy_service_role_count='+$legacyCount,'jwt_three_segments='+$jwtThree,'jwt_algorithm='+$jwtAlg,'jwt_role_service_role='+$roleMatch,'jwt_project_ref_match='+$refMatch,'jwt_signature_verified=False','public_http_status='+$pubHttp,'public_openapi_valid='+$pubOpenApi,'public_openapi_path_count='+$pubPaths,'public_postgrest_code='+$pubPgrst,'net_http_status='+$netHttp,'net_openapi_valid='+$netOpenApi,'net_openapi_path_count='+$netPaths,'net_postgrest_code='+$netPgrst,'failure_class='+$failure,'GATE='+$gate);Set-Content -Path $report -Value $lines -Encoding ASCII;$lines"
notepad feedback-lot00-openapi-readonly-20261108.txt
~~~

### 72.3 Interprétation

- `PASS_NET_NOT_EXPOSED` : `public=200` avec OpenAPI valide et `net=406 / PGRST106`.
- `BLOCKED_CLI_NONZERO_EXIT` : le CLI a réellement retourné un code non nul ; aucun appel OpenAPI n'a été effectué.
- `BLOCKED_POWERSHELL_BEFORE_CLI_EXIT` : exception avant la capture du code retour ; `failure_class` précise uniquement la classe .NET/PowerShell, sans contenu sensible.
- `BLOCKED_LEGACY_SERVICE_ROLE_REDACTED` ou `BLOCKED_LEGACY_SERVICE_ROLE_NOT_UNIQUE` : pas de fallback `--reveal` automatique.
- Tous les autres gates restent à analyser sans mutation.

Le rapport final est `feedback-lot00-openapi-readonly-20261108.txt`; le script ouvre Notepad après écriture. Il n'y a pas de second fichier ni de collecte manuelle de clé.

### 72.4 État

- Le résultat précédent n'est ni un rejet du PAT ni un rejet de la clé ; aucun code HTTP n'a été reçu.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** jusqu'à ce nouveau rapport.
- Aucun accès JOBLY-PROD, aucune écriture, aucune opération Auth, aucune mutation de fixture, aucune modification `main`, aucune fusion ni déploiement.
- PAT full-access utilisé seulement pour le contrôle ponctuel autorisé ; le révoquer ensuite dans Supabase Access Tokens.
- PR #266 reste ouverte, brouillon, non fusionnée.
- Document source avant cette mise à jour : V2.69, blob SHA f6d4931ae995683b7773a780a489411742c933de, branche `e2e/recette`.

---

## 73. Rapport retransmis sans les marqueurs V2.70 — commande corrigée non démontrée — 8 novembre 2026

### 73.1 Constat sur la sortie fournie

La sortie communiquée après le §72 reprend exactement les indicateurs de l'ancien rapport :
- `failure=CHECK_COMMAND_FAILED`
- `GATE=BLOCKED_CLI_JSON_OR_INTERNAL_ERROR`
- absence de `cli_json_parsed`, `failure_class` et des gates introduits au §72.2.

Or la commande du §72.2 produit obligatoirement les champs `failure_class` et `GATE` de la nouvelle nomenclature (`BLOCKED_POWERSHELL_BEFORE_CLI_EXIT`, `BLOCKED_CLI_NONZERO_EXIT`, etc.). La sortie reçue ne permet donc pas d'établir que cette commande corrigée a été exécutée. Elle peut provenir d'une ancienne exécution ou du contenu non actualisé du fichier de rapport ; les éléments disponibles ne permettent pas de trancher.

### 73.2 Conséquence de recette — état historique, séquencement remplacé par §76

- Ce résultat ne prouve ni échec d'authentification CLI, ni rejet du PAT, ni rejet de la clé Supabase.
- Aucun appel HTTP OpenAPI n'est confirmé ; les statuts public/net restent non mesurés dans cette sortie.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED**.
- Ne pas répéter les préflights, les tests du presse-papiers ou les groupes de tests locaux déjà verts.
- Cette consigne de reprise immédiate est historique et annulée par §76 : le contrôle OpenAPI est maintenant LOT-11, à la fin. Ne pas relancer la commande §72.2 ni l'ancienne commande §69 uniquement pour débloquer les lots précédents.
- Aucune action sur JOBLY-PROD, aucune mutation, aucun changement de `main`, aucune fusion et aucun déploiement. PR #266 demeure ouverte, brouillon et non fusionnée.

### 73.3 Référence

Document mis à jour en V2.71 sur `e2e/recette`. Source avant mise à jour : blob SHA 9275c8bcd8c645324dad69d13e5772d2fd2fa136.


---

## 74. LOT-00 — CLI lancée, code retour 1, diagnostic CLI masqué — 8 novembre 2026

### 74.1 Sortie opérateur reçue

```text
runtime=PowerShell 5.1.19041.4522
project_ref=ofqqrryamslxoqkklraw
supabase_cli_version=3.0.0
env_SUPABASE_ACCESS_TOKEN_present=False
cli_command_exit_code=1
cli_json_parsed=False
legacy_service_role_count=0
jwt_three_segments=False
jwt_algorithm=UNKNOWN
jwt_role_service_role=False
jwt_project_ref_match=False
jwt_signature_verified=False
public_http_status=NOT_RUN
public_openapi_valid=False
public_openapi_path_count=0
public_postgrest_code=NONE
net_http_status=NOT_RUN
net_openapi_valid=False
net_openapi_path_count=0
net_postgrest_code=NONE
failure_class=NONE
GATE=BLOCKED_CLI_NONZERO_EXIT
```

### 74.2 Interprétation strictement établie

- Contrairement aux rapports antérieurs avec `cli_command_exit_code=NOT_RUN`, cette exécution prouve que le processus CLI a été lancé et qu'il a renvoyé le code de sortie `1`.
- `cli_json_parsed=False` signifie que la sortie CLI n'a pas été transformée en JSON exploitable. `legacy_service_role_count=0` est donc une valeur par défaut du contrôle et **ne prouve pas** que la clé Legacy est absente ou masquée.
- `failure_class=NONE` est cohérent avec un code de sortie non nul sans exception PowerShell attrapée ; ce champ n'explique pas l'erreur CLI.
- La commande redirigeait `stderr` vers `$null`. Le message d'erreur déterminant n'a donc pas été conservé. Les éléments reçus ne permettent pas de distinguer une absence de session CLI, un problème d'autorisation/projet, un problème réseau ou une erreur interne du CLI.
- Les appels HTTP OpenAPI n'ont pas commencé : `public_http_status=NOT_RUN` et `net_http_status=NOT_RUN`. Aucun verdict sur les schémas `public` ou `net` n'est possible.

### 74.3 État de recette et verrou sur le jeton

- Gate courant : **`BLOCKED_CLI_NONZERO_EXIT`**.
- LOT-00 reste **PARTIAL / BLOCKED_REVIEW_REQUIRED** ; aucun PASS OpenAPI n'est acquis.
- Cette tentative était la commande CLI bornée autorisée pour l'utilisation ponctuelle du PAT local full-access. Ne pas relancer automatiquement la commande avec ce PAT, ni lancer `--reveal`, `projects list`, une commande de mutation ou un contrôle global.
- L'opérateur avait indiqué vouloir révoquer ce PAT après le contrôle ponctuel. La révocation du PAT dans Supabase Access Tokens est à effectuer après cette tentative, sauf nouvelle autorisation explicite et distincte pour un diagnostic supplémentaire.
- Aucune clé, aucun JWT, aucun token ni message d'erreur potentiellement sensible n'a été inscrit dans le rapport.
- JOBLY-PROD n'a pas été consulté. Aucune écriture Supabase, mutation de fixture, authentification runtime, modification de `main`, fusion ou déploiement n'a été effectué. PR #266 reste ouverte, brouillon et non fusionnée.

### 74.4 Suite nécessaire — sans nouvelle tentative implicite

La cause du code retour 1 ne peut être déterminée qu'avec une nouvelle exécution diagnostique qui conserve `stderr` en mémoire, le classe en catégorie non sensible puis détruit le texte brut sans l'écrire dans un fichier ou l'afficher. Comme le contrôle ponctuel avec PAT full-access a déjà été tenté et que sa révocation était prévue, cette nouvelle exécution exige une **nouvelle autorisation explicite**. Aucun nouvel appel CLI n'est lancé par cette mise à jour documentaire.

### 74.5 Référence

Mise à jour V2.72 sur la branche `e2e/recette`. Source avant cette entrée : blob SHA `74c4900b15ea35c9be68fa3910cdaaf6919251cb`. Le présent ajout enregistre le résultat opérateur sans prétendre à un diagnostic de la cause CLI.


---

## 75. Rôle réel du contrôle OpenAPI reclassé en LOT-11 final — portée et limites — 8 novembre 2026

### 75.1 Pourquoi ce contrôle a été ajouté

Le GET OpenAPI sur `/rest/v1/` est un contrôle final de la surface d'exposition de la Data API Supabase (PostgREST), après les recettes fonctionnelles et la réconciliation finale. Il ne conditionne plus l'engagement des tests runtime E2E. Le document décrit les ressources REST générées à partir des schémas exposés : tables, vues, fonctions et méthodes disponibles.

Le gate conçu pour LOT-00 demandait :
- `Accept-Profile: public` : HTTP 200 avec un document OpenAPI valide, afin de confirmer que le schéma applicatif attendu est servi par la Data API ;
- `Accept-Profile: net` : HTTP 406 avec `PGRST106`, afin de confirmer que le schéma interne `net` n'est pas exposé par PostgREST.

### 75.2 Ce que ce test démontre — et ne démontre pas

Ce contrôle renseigne sur l'exposition des schémas via la Data API et sur les ressources décrites par PostgREST pour le rôle d'accès utilisé.

Il ne constitue **pas** une recette fonctionnelle Jobly et ne valide pas :
- les parcours Talent, Recruteur, J'IA, Mobility, Paiements ou Events ;
- les politiques RLS et leur comportement pour chaque utilisateur authentifié ;
- la sécurité de chaque ligne ou donnée métier ;
- les Edge Functions, les traitements asynchrones ou les intégrations externes.

Il ne faut donc pas le présenter comme une preuve globale de sécurité ou comme un prérequis intrinsèque à toute exécution de tests E2E. C'est un garde-fou ciblé sur l'exposition de la Data API.

### 75.3 Contexte Supabase sur l'accès au document

Supabase a annoncé en février 2026 la suppression de l'accès au document OpenAPI au moyen de la clé `anon`, changement déployé à partir du 11 mars 2026. Les réponses `401 Secret API key required` obtenues précédemment avec la clé publishable/anon sont donc cohérentes avec cette restriction et ne signifient pas que les requêtes REST ordinaires vers les ressources autorisées sont en panne.

Supabase documente également le Management API `GET /v1/projects/{ref}/database/openapi`, protégé par le scope de lecture de base de données `database:read`. Cette voie est à évaluer si le contrôle OpenAPI est conservé ; elle évite de déduire qu'une clé `service_role` doit nécessairement être extraite localement pour cette inspection.

### 75.4 Décision et garde-fous — reclassement en LOT-11 final

- Le contrôle OpenAPI est reclassé **LOT-11 — audit final**, à exécuter après LOT-10 et après la réconciliation des preuves ; il n'est plus un verrou absolu des parcours précédents.
- Le dernier essai CLI a retourné le code 1 et son `stderr` a été perdu. Aucune nouvelle commande CLI avec le PAT full-access n'est autorisée implicitement ; l'opérateur doit révoquer ce PAT comme prévu.
- Pour le LOT-11, privilégier une lecture via Management API avec scope strict `database:read` ou un autre accès read-only approuvé. Ne pas réutiliser le PAT full-access ni extraire `service_role` par défaut. Aucun contrôle alternatif n'a encore été exécuté ou déclaré PASS.
- Ne pas confondre l'absence de document OpenAPI avec l'indisponibilité des endpoints REST ordinaires.
- Aucune action JOBLY-PROD, aucune écriture Supabase, aucune mutation de fixture, aucune modification `main`, aucune fusion et aucun déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

### 75.5 Référence

Mise à jour V2.73 sur `e2e/recette`. Source avant cette entrée : blob SHA `4a0ca9a44416398c2f2fc1a76827a99dc42155ac`. Cette entrée documente la finalité et les limites du contrôle ; elle ne modifie pas le gate technique en statut PASS.


---

## 76. Décision de séquencement — OpenAPI déplacé au dernier LOT-11 — V2.74 — 8 novembre 2026

### 76.1 Décision

À la demande de l'opérateur, le contrôle d'exposition Data API/OpenAPI `public` et `net` est retiré du LOT-00 et devient **LOT-11 — CONTRÔLE FINAL**, à exécuter seulement après LOT-10.

Ce changement est un reclassement d'ordre et de dépendance. Il ne transforme pas le résultat actuel en PASS et ne supprime pas le contrôle : il le reporte à la fin de la campagne.

### 76.2 Séquence cible

| Ordre | Lot | Périmètre | Dépendance / règle |
|---:|---|---|---|
| 0 | LOT-00 | Préflight environnement, identification JOBLY-E2E, RLS/grants ciblés, Storage, fixtures et isolation — hors OpenAPI | Prérequis de sécurité et de disponibilité des parcours runtime concernés |
| 1 | LOT-01 | Auth, rôles, navigation et sécurité | Après les prérequis non-OpenAPI de LOT-00 |
| 2 | LOT-02 | Talent, offres, recherche et candidatures | Après LOT-01 |
| 3 | LOT-03 | Recruteur et Recruitment 360 | Après LOT-01 |
| 4 | LOT-04 | Mission Afrique et qualité des offres | Après les contrôles non-OpenAPI de LOT-00 |
| 5 | LOT-05 | J'IA 360 | Après LOT-01 |
| 6 | LOT-06 | Mobility et partenaires | Après LOT-02 et LOT-03 |
| 7 | LOT-07 | Paiements, abonnements et Mobile Money | Après LOT-02 et LOT-03 |
| 8 | LOT-08 | Events, Community, Bons Plans et Campus | Après LOT-01 |
| 9 | LOT-09 | Career Journey, Admin 360 et BI | Après LOT-01 et LOT-02 |
| 10 | LOT-10 | PWA, Android et régression transverse | Après LOT-01 à LOT-09 selon le graphe du runner |
| 11 | **LOT-11 — OpenAPI final** | Inspection Data API/PostgREST : `public=200` avec OpenAPI valide, puis `net=406/PGRST106` attendu | **Après LOT-10**, réconciliation des résultats et nettoyage de la campagne |

Le tableau de synthèse de l'exécution historique §3.3 n'est pas réécrit : il représente le run réellement communiqué à cette date. LOT-11 est un lot de fin de recette nouvellement planifié, non exécuté et absent des anciens comptages.

### 76.3 Effet sur les blocages

- Le contrôle OpenAPI n'est plus un critère d'entrée ni une dépendance des LOT-01 à LOT-10.
- L'échec CLI `BLOCKED_CLI_NONZERO_EXIT` n'empêche donc plus à lui seul la poursuite des autres lots.
- LOT-00 conserve ses contrôles propres hors OpenAPI : identité/projet, disponibilité et correspondance des fixtures, isolation, audit RLS/grants/Storage et décisions de moindre privilège nécessaires à la sécurité des parcours runtime. Le reclassement OpenAPI ne lève aucun de ces prérequis.
- Les recettes runtime restent conditionnées aux prérequis de session Auth, à l'intégrité des fixtures partagées, à l'isolation JOBLY-E2E et aux contraintes de lecture/écriture documentées par chaque lot. Le déplacement d'OpenAPI ne donne aucune autorisation de reset, provisionnement ou mutation.
- Les six groupes locaux code-only déjà PASS ne sont pas relancés.
- Le runner `scripts/e2e-local-recipe.mjs` a été inspecté : son LOT-00 est un préflight environnement/fixtures et son catalogue porte les lots LOT-01 à LOT-10 ; il ne contient pas l'appel OpenAPI. Aucun code runner n'est changé par cette décision. LOT-11 est un contrôle final documentaire/manuellement piloté, non déclenché automatiquement par le runner actuel.

### 76.4 Méthode retenue pour le LOT-11

1. Attendre la fin de LOT-10 et la réconciliation des rapports/artefacts, sans relancer les tests déjà verts.
2. Révoquer le PAT Supabase full-access utilisé lors de la tentative précédente, comme prévu par l'opérateur. Ne pas le réutiliser pour LOT-11.
3. Préférer le Management API `GET /v1/projects/{ref}/database/openapi` avec le scope OAuth `database:read` ; pour un fine-grained PAT, la permission requise est `database_read`. L'accès doit être limité au seul projet JOBLY-E2E et aux lectures de métadonnées. Éviter tout PAT classique/full-access.
4. Vérifier les deux profils attendus, sans appeler de fonction `net.http_*`, sans lire les données métier et sans modifier grants, schémas, policies, buckets ou clés.
5. Si l'accès read-only approprié n'est pas disponible à la fin, déclarer LOT-11 BLOCKED avec preuve de l'obstacle ; ne pas contourner par un PAT full-access ni par extraction de la clé `service_role`.

### 76.5 Statut après reclassement

- LOT-00 : PARTIAL sur ses seuls éléments non-OpenAPI encore à fermer ; son périmètre ne comprend plus le GET OpenAPI.
- LOT-01 à LOT-10 : séquencés selon leurs dépendances et les prérequis runtime propres ; aucune dépendance OpenAPI.
- LOT-11 : **À FAIRE EN DERNIER — NON EXÉCUTÉ**.
- Le résultat `BLOCKED_CLI_NONZERO_EXIT` est conservé comme historique de tentative antérieure et n'est pas un FAIL du service Data API.
- JOBLY-PROD reste hors périmètre ; aucune mutation de fixture non autorisée, aucun changement `main`, aucune fusion et aucun déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

### 76.6 Référence

Décision enregistrée en V2.74 sur `e2e/recette`. Source avant cette mise à jour : blob SHA `1bf9cde875353a3db200e04518c80c515caa2341`. Aucun code d'application ni runner n'a été modifié dans cette mise à jour ; seule la référence de recette et l'ordre des lots sont ajustés.



---

## 77. Prochaine commande opérateur — préflight LOT-00 non-OpenAPI, autonome et read-only — V2.75 — 8 novembre 2026

### 77.1 Périmètre vérifié dans le code

Le fichier `e2e/lot0-preflight.mjs` (blob source vérifié : `94349566afd2d743e36befd1ad5fe8d646fdd0a4`) :
- compare `E2E_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` à la configuration exacte JOBLY-E2E ;
- effectue une seule requête HTTP GET vers `/auth/v1/settings` ;
- lit seulement quelques paramètres Auth non sensibles ;
- ne crée ni compte, ni session, ni fixture, n'effectue aucun INSERT/UPDATE/DELETE, ne restaure aucun secret et ne lance pas OpenAPI.

Cette commande peut donc être exécutée séparément du runner global. Elle ne doit pas être confondue avec `scripts/e2e-local-recipe.mjs`, qui possède un chemin de restauration/provisionnement de fixtures et reste verrouillé tant que ce chemin n'a pas été revu et autorisé.

### 77.2 Commande CMD Windows retenue

Le rapport non sensible est `feedback-lot00-preflight-20261108.txt`. La commande ouvre Notepad immédiatement après son écriture.

```bat
cd /d C:\Users\ASUS\Jobly
if not exist e2e\lot0-preflight.mjs (
  echo ERROR=E2E_LOT0_PREFLIGHT_SCRIPT_NOT_FOUND>feedback-lot00-preflight-20261108.txt
  notepad feedback-lot00-preflight-20261108.txt
  exit /b 2
)
(
  echo node_version:
  node --version
  echo branch:
  git branch --show-current
  echo commit:
  git rev-parse HEAD
  echo --- LOT-00 PREFLIGHT ---
) > feedback-lot00-preflight-20261108.txt 2>&1
set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw"
set "NEXT_PUBLIC_SUPABASE_URL=https://ofqqrryamslxoqkklraw.supabase.co"
set "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y"
node e2e/lot0-preflight.mjs >> feedback-lot00-preflight-20261108.txt 2>&1
set "RECIPE_EXIT=%ERRORLEVEL%"
echo exit_code=%RECIPE_EXIT%>>feedback-lot00-preflight-20261108.txt
notepad feedback-lot00-preflight-20261108.txt
```

### 77.3 Résultat attendu et conduite

- `status=PASS` et `exit_code=0` : seule la joignabilité de l'API Auth publique JOBLY-E2E et la cohérence de ses paramètres sont confirmées. Cela ne vaut ni PASS global LOT-00 ni PASS d'une session utilisateur.
- Toute erreur ou code non nul : consigner exactement le rapport et analyser l'obstacle ; ne pas lancer le runner global en contournement.
- Ne pas transmettre de clé privée, mot de passe, PAT, JWT ou autre secret. La clé `sb_publishable` est publique et le script ne l'imprime pas.
- Après ce préflight, les points LOT-00 encore ouverts (décision sur les buckets publics, matrice ciblée grants/policies et revue de disponibilité/isolation des fixtures) restent à traiter séparément en lecture seule.
- Aucun lancement automatique de `scripts/e2e-local-recipe.mjs`, d'Auth utilisateur, de navigateur connecté ou de bulk n'est autorisé par cette commande.
- Le LOT-11 OpenAPI demeure reporté à la fin, après LOT-10 (§76).

### 77.4 Statut et garde-fous

La commande a été exécutée par l'opérateur ; son résultat PASS est enregistré au §78. Le préflight n'a pas été exécuté par l'assistant. Aucun test déjà PASS n'est relancé ; aucun accès JOBLY-PROD, aucune écriture Supabase, aucune mutation de fixture, aucun changement de `main`, aucune fusion et aucun déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

### 77.5 Référence

Mise à jour V2.75 sur `e2e/recette`. Source avant ajout : blob SHA `4fa5c98f41333e605228aac8bf00f3b6a422a75d`. Code source contrôlé dans `e2e/lot0-preflight.mjs`, sans modification du runner.



---

## 78. Résultat opérateur — préflight LOT-00 non-OpenAPI — PASS connectivité Auth publique — V2.76 — 8 novembre 2026

### 78.1 Rapport reçu

Résultat transmis par l'opérateur :

```text
node_version: v26.13.0
branch: e2e/recette
commit: e92feb8abc1a2491cab7dd81e834080b80982681
--- LOT-00 PREFLIGHT ---
{
  "status": "PASS",
  "gate": "LOT-0-E2E-PUBLIC-CONNECTION",
  "projectRef": "ofqqrryamslxoqkklraw",
  "authSettings": {
    "disableSignup": false,
    "mailerAutoconfirm": false,
    "phoneAutoconfirm": false
  },
  "checks": [
    "URL Supabase strictement limitée à JOBLY-E2E",
    "Clé publishable vérifiée sans secret serveur",
    "API Auth JOBLY-E2E joignable",
    "Aucune écriture, création de compte ou opération Auth effectuée"
  ]
}
```

Le champ final `exit_code=` annoncé dans le bloc de commande n'apparaît pas dans le texte recopié ; le statut PASS JSON émis par le script est néanmoins présent et exploitable. Ne pas reconstituer un code de sortie qui n'a pas été transmis.

### 78.2 Rapprochement avec le code exécuté

Le fichier `e2e/lot0-preflight.mjs` relu au commit opérateur `e92feb8abc1a2491cab7dd81e834080b80982681` a le blob SHA `94349566afd2d743e36befd1ad5fe8d646fdd0a4`, identique à celui audité pour préparer la commande §77.

Ce script :
- vérifie les trois paramètres d'environnement contre le ref exact JOBLY-E2E ;
- effectue un seul GET vers `/auth/v1/settings` ;
- exige une réponse HTTP de succès (2xx) et un objet JSON ;
- n'effectue ni création de compte, ni connexion utilisateur, ni écriture ou mutation métier.

Le PASS reçu est donc correctement rattaché au script attendu, même si le commit local `e92feb8` est antérieur aux commits documentaires les plus récents de la PR.

### 78.3 Interprétation exacte

**PASS acquis :**
- endpoint Auth public JOBLY-E2E joignable avec la clé publishable ;
- paramètres d'environnement ciblant le projet E2E exact ;
- réponse Settings JSON exploitable.

**Paramètres retournés :**
- `disableSignup=false` : les inscriptions ne sont pas globalement désactivées ;
- `mailerAutoconfirm=false` et `phoneAutoconfirm=false` : le préflight n'établit aucune auto-confirmation générale par email ou téléphone.

**Non démontré :**
- connexion réelle des fixtures Talent, Recruteur et Partenaire ;
- vérification/renouvellement d'une session Auth ;
- appels API métier authentifiés, RLS en situation utilisateur ou parcours navigateur ;
- fermeture complète des points Storage et moindre privilège de LOT-00.

Le contrôle ne doit donc pas être présenté comme PASS global LOT-00 ni PASS LOT-01.

### 78.4 Statut et prochaine frontière

- Préflight `LOT-0-E2E-PUBLIC-CONNECTION` : **PASS**.
- LOT-00 global : **PARTIAL** ; restent à traiter hors OpenAPI : décision explicite sur l'intention publique des buckets `jobly-events` et `profile-photos`, ainsi que plan documenté de moindre privilège des grants table/Storage.
- LOT-01 Auth runtime : pas encore testé par ce préflight. Le script `e2e/auth-session-smoke.mjs` a été inspecté : il lit `.e2e-fixtures.json`, tente une authentification par mot de passe pour les trois fixtures, vérifie access token et refresh, puis ferme la session locale. Il ne doit être lancé qu'après revue des prérequis Auth/fixtures et autorisation de la séquence runtime correspondante.
- Aucun runner global, aucun provisionnement/restauration/reset fixture et aucune recette OpenAPI n'ont été lancés par ce résultat.
- LOT-11 OpenAPI reste **À FAIRE EN DERNIER**, après LOT-10.
- JOBLY-PROD hors périmètre ; aucune écriture Supabase, aucune mutation de fixture, aucun changement de `main`, aucune fusion et aucun déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

### 78.5 Référence

Mise à jour V2.76 sur `e2e/recette`. Source avant cette entrée : blob SHA `4060b1ab0533cec0783343a4f8ba3d9148997557`. Le code métier/runner n'a pas été modifié ; seul le rapport opérateur et le statut du préflight sont ajoutés.


---

## 79. Clarification métier — sens des buckets publics et recommandation — V2.77 — 8 novembre 2026

### 79.1 Signification expliquée à l'opérateur

Un bucket Supabase Storage public permet à toute personne connaissant l'URL exacte d'un fichier de le consulter sans se connecter à Jobly. Ce réglage ne donne pas automatiquement le droit d'uploader, remplacer ou supprimer les fichiers : ces opérations restent soumises aux politiques Storage/RLS.

Les deux buckets concernés par l'audit sont :
- `jobly-events` : médias des événements ;
- `profile-photos` : photos de profil.

L'audit initial du 8 novembre a constaté zéro objet Storage à cet instant. Il n'a donc pas exposé de fichier existant lors de cet audit.

### 79.2 Règle métier retenue par l'opérateur

- `jobly-events` : bucket public pour les médias associés à des événements publiés et destinés au public.
- `profile-photos` : bucket public uniquement pour les photos que l'utilisateur accepte d'afficher publiquement. Les visuels réservés à un contexte authentifié et les documents personnels doivent rester privés et être servis via autorisation ou URL signée.
- CV, justificatifs, preuves de paiement, KYC et documents de recrutement ne doivent jamais être placés dans ces deux buckets publics.

L'opérateur a accepté cette orientation le 8 novembre 2026. Cette décision fixe l'intention métier ; elle ne prouve pas que chaque écran ou route l'applique déjà.

### 79.3 Statut

- Aucun paramètre de bucket n'a été modifié.
- Aucune policy Storage/RLS n'a été modifiée.
- Intention métier validée ; conformité de l'implémentation à auditer (notamment consentement/visibilité effective des photos de profil).
- LOT-00 reste PARTIAL sur les contrôles de moindre privilège.
- OpenAPI reste LOT-11 final après LOT-10.

### 79.4 Référence

Clarification documentaire V2.77 sur `e2e/recette`. Source avant cette entrée : blob SHA `2a754994267b754742b226bf1848be541ba42a34`.


---

## 80. Revue finale transversale JOBLY-E2E — Storage, grants/RLS, pg_net et compteurs Afrique — V2.78 — 8 novembre 2026

### 80.1 Périmètre et méthode

- Environnement : JOBLY-E2E uniquement, project ref `ofqqrryamslxoqkklraw`.
- Base : requêtes SQL de catalogues et de métadonnées en lecture seule (SELECT uniquement). Aucun contenu de CV, document, profil ou candidature n'a été consulté.
- Code : relecture GitHub des routes Storage, du catalogue pays, du RPC public et de la page d'accueil sur `e2e/recette`, avec rapprochement du code de profil-photo/media présent au commit opérateur `e92feb8abc1a2491cab7dd81e834080b80982681`.
- Aucun test déjà PASS n'a été relancé. Aucun DDL, DML, changement de configuration, mutation Storage/Auth, changement `main`, fusion ou déploiement.

### 80.2 Décision métier Storage et cohérence du code

L'intention produit a été validée au §79.2 :
- événements publiés : médias publics ;
- photos de profil : publiques seulement lorsqu'elles sont destinées à l'affichage public ;
- CV, KYC, preuves de paiement et documents de recrutement : privés.

**État technique des buckets lu dans JOBLY-E2E :**

| Bucket | Public | Limite configurée | Types autorisés configurés |
|---|---:|---:|---|
| `jobly-events` | oui | 10 485 760 octets | image, vidéo, PDF |
| `profile-photos` | oui | 5 000 000 octets | `image/*` |
| `jobly-payment-proofs` | non | 10 485 760 octets | JPEG, PNG, WebP, GIF, PDF |
| `mobility-provider-documents` | non | 10 485 760 octets | PDF, JPEG, PNG |
| `mobility-documents` | non | aucune limite | aucune allowlist |
| `recruitment-listings` | non | aucune limite | aucune allowlist |
| `talent-cvs` | non | aucune limite | aucune allowlist |

**Incohérence confirmée — photo de profil / Hero :**

- `app/api/auth/profile-photo/route.ts` accepte une photo standard jusqu'à `5 * 1024 * 1024` octets (5 MiB) et un visuel Hero PNG jusqu'à `10 * 1024 * 1024` octets (10 MiB).
- Le bucket actuellement configuré s'arrête à 5 000 000 octets ; il est donc plus petit que le plafond de la route, et deux fois plus petit que le plafond Hero.
- Conséquence : une photo/Hero peut passer la validation applicative puis être refusée par Storage. La limite standard présente également un écart entre 5 MiB et 5 000 000 octets.
- Recommandation : définir une constante commune en octets et choisir explicitement le contrat : soit porter le bucket à 10 MiB pour le Hero tout en gardant une limite applicative standard de 5 MiB, soit ramener aussi le Hero à la limite bucket. Faire respecter la même valeur dans le contrôle serveur, le bucket et le formulaire UI. Ajouter des tests de frontière `limit-1`, `limit`, `limit+1`.

**Incohérence de confidentialité à traiter :**

- La route photo écrit dans `profile-photos` public et retourne systématiquement une URL publique ; aucune option de visibilité/consentement n'apparaît dans cette route.
- La règle acceptée au §79 demande que seules les photos prévues pour l'affichage public soient placées dans ce bucket. Il faut donc vérifier le formulaire et le modèle de profil : consentement explicite, état de visibilité persistant, et stockage privé/signé lorsque la photo n'est pas destinée au public. Ne pas considérer un simple profil authentifié comme un consentement à la diffusion publique.
- La route `app/api/events/media/route.ts` valide la signature réelle des fichiers (image/PDF/MP4), la taille 10 MiB et la durée vidéo 30 secondes, ce qui est cohérent avec `jobly-events`. En revanche, le handler ne vérifie que la session Auth avant l'upload ; la création d'événement, elle, vérifie ensuite `EventEntitlement`. Recommandation : lier le dépôt à un brouillon/organisateur autorisé ou appliquer un quota/rate limit par utilisateur, puis nettoyer les médias orphelins si aucun événement n'est créé.
- Les trois buckets privés `mobility-documents`, `recruitment-listings` et `talent-cvs` n'ont pas de limite/type au niveau Storage. Certaines routes font leurs propres contrôles ; recommander des garde-fous bucket-level alignés sur les contrats de chaque module, après inventaire complet des chemins d'upload. Ne pas changer les réglages sans migration et tests de compatibilité.

### 80.3 RLS, grants et moindre privilège

Constats actuels du catalogue JOBLY-E2E :
- 180/180 tables publiques ont RLS activé.
- 215 policies couvrent 154 tables publiques.
- 26 tables ont RLS sans policy ; aucune de ces 26 tables n'a de privilège effectif `anon` ou `authenticated` (elles restent donc fermées à ces rôles dans le modèle constaté).
- `anon` possède néanmoins des privilèges effectifs SELECT/INSERT/UPDATE/DELETE sur 23 relations publiques. Seules 3 relations ont une policy applicable à `anon`/PUBLIC : `Institution`, `BonPlan` et `BonPlanComment`, avec des policies de lecture seule. Les 20 autres n'ont pas de policy applicable à `anon` ; RLS empêche donc l'accès aux lignes dans la configuration auditée.
- `authenticated` dispose de privilèges effectifs sur 55 relations publiques : SELECT sur 55, INSERT sur 24, UPDATE sur 23, DELETE sur 23. La correspondance complète entre ces privilèges et les opérations réellement nécessaires par module reste à établir.

**Interprétation :** aucune fuite de lignes par `anon` n'est démontrée par ce seul audit ; RLS bloque les 20 tables sans policy anon. En revanche, les grants restent beaucoup plus larges que nécessaire et risquent de devenir une exposition si une policy est ajoutée ou élargie par la suite.

**Plan recommandé, sans exécution :**
1. `anon` : retirer les privilèges d'écriture sur les relations publiques ; conserver uniquement le SELECT des objets explicitement destinés à la lecture publique (`Institution`, `BonPlan`, `BonPlanComment`) après validation des colonnes et filtres.
2. `authenticated` : établir une matrice par module/action (SELECT/INSERT/UPDATE/DELETE) et ne garder que les opérations réellement utilisées par Talent, Recruteur, Career Journey, J'IA, Mobility, Events et Paiements.
3. Les tables RLS sans policy : garder sans privilège client tant qu'aucun parcours n'en justifie l'accès ; créer une policy propriétaire/admin seulement avec cas de test métier identifié.
4. Appliquer les réductions dans une migration séparée, avec tests de non-régression par rôle et preuve de refus inter-comptes. Aucun GRANT/REVOKE n'est exécuté dans cette recette.

### 80.4 Point de vigilance pg_net — exposition conditionnelle à confirmer au LOT-11

- Les rôles `anon` et `authenticated` ont actuellement USAGE sur le schéma `net`.
- Les deux rôles ont EXECUTE sur les 12 fonctions pg_net relevées, dont `net.http_get`, `net.http_post` et `net.http_delete`; ils disposent aussi de privilèges de lecture/insertion sur les tables de file/réponse.
- Le catalogue montre une fonction événementielle Supabase `extensions.grant_pg_net_access()` qui accorde ces accès aux rôles clients lors de l'installation/gestion de pg_net. Le retrait manuel isolé des droits pourrait donc ne pas tenir face à une opération ultérieure de l'extension.
- **La disponibilité de `net` à travers PostgREST n'a pas été établie.** Aucun appel `net.http_*` n'a été exécuté. Le point est donc un risque potentiel de capacité réseau sortante si le schéma est exposé, pas une preuve qu'un endpoint est actuellement accessible.
- Recommandation P0 de sécurité : au LOT-11 final, vérifier l'exposition réelle ; si `net` est accessible, traiter son retrait des schémas exposés et l'isolement des EXECUTE/USAGE par une migration compatible avec le mécanisme Supabase pg_net. Ne pas désactiver ni altérer le trigger Supabase sans plan de compatibilité.

### 80.5 Statistiques publiques, cohérence pays et texte de la page d'accueil

Rapprochement du code :
- `lib/countries/africa.ts` contient le catalogue produit canonique de **54 pays** et exclut explicitement `EH` (Sahara occidental).
- La fonction SQL `public.get_public_home_stats()` contient une liste de **55 codes** : elle ajoute `EH`, absent du catalogue canonique.
- Le frontend de `app/page.tsx` ajoute toujours la base `75 000` au compteur d'offres et `415 000` au compteur talents. Ce mécanisme correspond bien aux deux bases prévues ; elles ne sont pas à supprimer par défaut.
- Le compteur `talentsCount` du RPC compte tous les profils dont le rôle est TALENT, sans filtre géographique, alors que le sous-texte affiche « Talents partout en Afrique ».

**Recommandations métier/texte :**
1. Synchroniser la liste SQL sur les 54 codes canoniques et ajouter un test qui compare automatiquement la liste SQL au catalogue TypeScript ; ne pas maintenir deux listes divergentes.
2. Pour `talentsCount`, soit filtrer par pays parmi les 54 pays si la promesse est géographique, soit remplacer le texte par « Talents inscrits sur Jobly » / « Talents on Jobly » si le compteur reste mondial/non filtré.
3. Conserver les bases +75 000 offres et +415 000 talents en les affichant de façon cohérente avec la fraîcheur de la donnée ; si la source dynamique est indisponible, conserver l'état actuel qui masque le compteur plutôt que d'inventer un total.
4. `get_public_home_stats()` est une fonction `SECURITY DEFINER` exécutée par `anon` et `authenticated`, mais sa définition lue ne retourne que trois agrégats, n'accepte aucun argument et fixe `search_path` vide avec relations qualifiées. Recommandation : garder cette exception publique explicitement documentée et couverte par un test qui interdit tout champ personnel ou résultat détaillé.

### 80.6 Advisor sécurité et priorités de revue

Advisor JOBLY-E2E relu le 8 novembre :
- 26 INFO `rls_enabled_no_policy`, cohérents avec les 26 tables sans policy et sans privilèges clients ;
- 1 WARN extension `pg_net` installée dans `public` ;
- 1 WARN `SECURITY DEFINER` public `get_public_home_stats()` accessible aux rôles anon/authenticated (contrat agrégé décrit au §80.5) ;
- 1 WARN protection contre les mots de passe compromis désactivée.

Recommandation Auth : activer la protection des mots de passe compromis si le plan Supabase le permet, puis le vérifier dans LOT-01 ; conserver les tests de connexion héritée et de politique de nouveau mot de passe déjà verts.

### 80.7 Conclusion de recette

- Préflight public Auth JOBLY-E2E : **PASS** au §78.
- LOT-00 global : **PARTIAL** ; audit read-only consolidé, intention des buckets acceptée, mais matrice moindre privilège à faire approuver/appliquer dans un chantier distinct et point pg_net conditionnel à fermer au LOT-11.
- Anomalies concrètes à corriger dans le code avant validation finale : plafond photo/Hero incohérent avec le bucket ; visibilité publique des photos non conditionnée de façon explicite ; catalogue de pays SQL différent du catalogue canonique ; compteur talents non géographiquement filtré alors que son texte le suggère.
- Aucun de ces réglages ou correctifs n'a été appliqué dans cette mise à jour.

### 80.8 Prochaine étape contrôlée — smoke Auth LOT-01 isolé

Le script `e2e/auth-session-smoke.mjs` a été inspecté au commit opérateur `e92feb8abc1a2491cab7dd81e834080b80982681` (blob SHA `d1b6015597335198d1fa83dd8f6d7e3ab288164b`). Il :
- lit uniquement le fichier local `.e2e-fixtures.json` ;
- vérifie les 3 rôles TALENT, RECRUITER et PARTNER ;
- réalise sign-in, getUser, refreshSession et signOut avec portée `local` ;
- ne crée ni ne modifie les comptes/profils métier, ne change aucun mot de passe, n'envoie aucun email/SMS et n'appelle aucun endpoint métier ;
- écrit `artifacts/e2e/auth-session-smoke.json` sans inclure de credentials.

Il est donc possible de le lancer séparément comme test ciblé de session, sans lancer le runner global ou le provisionneur. Le résultat attendu est 12 checks (4 par rôle), avec 3 comptes PASS. Un jeu de fixtures absent/incomplet doit donner BLOCKED/FAIL et ne doit pas déclencher de restauration automatique.

Commande CMD à exécuter seule ; elle crée aussi le rapport texte et ouvre Notepad :

```bat
cd /d C:\Users\ASUS\Jobly
set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw"
set "NEXT_PUBLIC_SUPABASE_URL=https://ofqqrryamslxoqkklraw.supabase.co"
set "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y"
node e2e/auth-session-smoke.mjs > feedback-lot01-auth-session-20261108.txt 2>&1
set "RECIPE_EXIT=%ERRORLEVEL%"
echo exit_code=%RECIPE_EXIT%>>feedback-lot01-auth-session-20261108.txt
notepad feedback-lot01-auth-session-20261108.txt
```

Ne pas exécuter `scripts/e2e-local-recipe.mjs`, `e2e/provision-fixtures.mjs` ou `e2e/reset-existing-fixture-passwords.mjs` à la suite de ce smoke. Transmettre uniquement le rapport non sensible.

### 80.9 Garde-fous et référence

Le smoke Auth est proposé comme étape ciblée ; il n'a pas été exécuté par l'assistant. Aucun test déjà PASS n'est relancé. JOBLY-PROD reste interdit ; aucune écriture ou configuration Supabase n'a été effectuée ; aucun changement `main`, aucune fusion et aucun déploiement. PR #266 reste ouverte, brouillon et non fusionnée.

Mise à jour V2.78 sur `e2e/recette`. Source avant cette entrée : blob SHA `4844589ff2693b27ea4144ff897bcbcd5f8c2a2a`. Les constats DB proviennent exclusivement de requêtes de catalogue read-only JOBLY-E2E ; les écarts de code sont reliés aux blobs GitHub cités dans cette section.


## 81. Corrections approuvées — photos, compteur Afrique et médias d'événements

### 81.1 Décision métier de l'opérateur

Le 8 novembre 2026, l'opérateur a validé les recommandations relatives à :
- la cohérence du stockage des photos de profil et des visuels Hero ;
- l'alignement des pays et du compteur de talents de la page d'accueil ;
- le contrôle des fichiers médias et leur rattachement aux événements.

Les corrections de code sont isolées sur la branche `fix/audit-profile-country-event-guards-20261108`, issue de `main`. Elles ne sont pas fusionnées et ne modifient pas `main`.

**Dernier commit source connu au moment de cette mise à jour :** `2e16e9d5721e977c51a713f5fe90636e293b0c8e`.

### 81.2 Photos de profil et Hero — correction du plafond et validation des octets

Code concerné :
- `lib/profilePhoto.ts`
- `app/api/auth/profile-photo/route.ts`
- `scripts/event-core-p1.test.mjs`

Corrections sur la branche :
1. Le plafond de stockage est centralisé à **5 000 000 octets**, identique à la limite effective du bucket `profile-photos`.
2. Une photo standard ne peut plus dépasser cette limite.
3. Un PNG Hero source peut atteindre 10 MiB à l'entrée, mais le serveur vérifie son vrai format, impose la transparence, redimensionne/optimise le PNG, puis refuse le stockage si le résultat excède 5 000 000 octets.
4. Le serveur vérifie les octets avec Sharp, limite les dimensions décodées, rejette les formats non supportés ou un MIME déclaré incohérent et choisit l'extension à partir du format réel, non du nom fourni par le navigateur.
5. Si l'écriture de `User.profilePhotoUrl` échoue après un upload, le nouveau fichier est supprimé pour éviter un orphelin.
6. Le format AVIF est reconnu à partir des métadonnées HEIF lorsque le codec est `av1`; le codec `hevc` (HEIC) est refusé plutôt que traité à tort comme AVIF.

**Limite non résolue dans cette PR : confidentialité des photos.** Le bucket `profile-photos` demeure public et le champ `User.profilePhotoUrl` reste une URL publique. La bascule « privé par défaut, publication explicite » n'est pas appliquée : elle nécessite un champ de visibilité persistant, un contrôle visible dans le parcours utilisateur et l'adaptation de tous les lecteurs (profil Talent, Hero, recruteur et vues publiques), avec une stratégie de migration des URLs déjà enregistrées. Changer uniquement le bucket casserait les photos existantes. Aucune migration de schéma ni modification de bucket n'a été exécutée.

### 81.3 Pays et compteur de la page d'accueil

Code concerné :
- `app/api/public/home-stats/route.ts`
- `scripts/africa-p0.test.mjs`
- référence canonique : `lib/countries/africa.ts`

Corrections sur la branche :
1. La liste locale de 55 codes a été supprimée. La route réutilise `AFRICA_COUNTRY_CODES`, le catalogue partagé de **54 pays**, et le résolveur `resolveAfricaCountryCode`. `EH` n'est donc plus compté comme pays de ce catalogue produit.
2. Le compteur de talents filtre désormais les profils dont le pays de profil ou, à défaut, le pays du compte User se résout dans le catalogue africain.
3. Le comptage parcourt les profils par pages de 1 000, au lieu de dépendre d'un `count` susceptible de ne refléter qu'une page ou la limite API.
4. Les bases frontend existantes **+75 000 offres** et **+415 000 talents** sont conservées. Le texte « Talents partout en Afrique » reste cohérent avec le nouveau comptage dynamique géographique.

**Cohérence texte/visibilité de la vitrine Talent :**
- `components/TalentShowcaseStudio.tsx` n'affiche plus « Profil public accessible à tous les recruteurs » lorsque `publicDiscoverable` est désactivé.
- Le sous-titre et l'indicateur (visible / non listé) suivent désormais le réglage `publicDiscoverable`, qui reste indépendant du plan FREE/PRO/PREMIUM.
- Les API `/api/recruiter/talents` et `/api/recruiter/talents/profile` filtrent déjà les profils sur `publicDiscoverable=true` ; un test vérifie désormais la cohérence entre ces règles serveur et le texte de l'interface.

**Point de réconciliation LOT-11 :** l'audit précédent avait aussi relevé une fonction SQL publique `get_public_home_stats()`. Le code actuel de `app/api/public/home-stats/route.ts` calcule les statistiques directement via les tables et ne l'appelle pas. Il faudra confirmer au LOT-11 si cette fonction SQL est toujours exposée et si elle conserve une logique divergente ; ne pas considérer sa cohérence corrigée sur la seule base de la correction de la route.

### 81.4 Médias d'événements — intégrité, propriété et nettoyage

Code concerné :
- `lib/eventMediaOwnership.ts`
- `app/api/events/media/route.ts`
- `app/api/events/route.ts`
- `app/events/create/page.tsx`
- `scripts/event-core-p1.test.mjs`

Corrections sur la branche :
1. Le chemin de stockage est accepté uniquement sous la forme `<Auth UID>/<UUID>.<extension autorisée>`. Les chemins imbriqués, traversants, d'un autre utilisateur ou portant une extension non supportée sont refusés.
2. Le formulaire transmet au serveur le chemin et le MIME reçus de l'upload, en plus du type, de la taille et de la durée.
3. Avant création de l'événement, le serveur vérifie la propriété du chemin, reconstruit l'URL publique attendue, télécharge le fichier du bucket côté serveur, réinspecte sa signature et compare le type, la taille réelle et la durée vidéo avec les métadonnées soumises.
4. Un endpoint DELETE authentifié permet de nettoyer un upload qui n'a pas été rattaché. Il refuse de supprimer le fichier si une ligne `Event` référence déjà son URL.
5. Si l'upload a renvoyé son chemin au navigateur puis que la création de l'événement échoue, le formulaire appelle DELETE avec le même jeton de session. Le contrôle serveur protège un média déjà associé à un événement, y compris un événement encore en brouillon.
6. Les réponses en échec après insertion de l'événement renvoient désormais `eventId`, afin que le navigateur ne tente pas de supprimer le média d'un événement conservé en brouillon.
7. Limite de nettoyage : si le stockage réussit mais que la réponse HTTP de l'upload est perdue avant que le navigateur reçoive le chemin, le navigateur ne peut pas appeler DELETE. Aucun balayage planifié des objets orphelins n'est encore installé.

**Limites non résolues :**
- Le bucket `jobly-events` demeure public. Un média téléversé est donc potentiellement accessible par son URL avant publication et reste accessible par URL s'il est associé à un événement `DRAFT` ou `PENDING_PAYMENT`. La règle stricte « public uniquement après publication » nécessite un espace de staging privé puis une promotion contrôlée à la publication/paiement, ainsi qu'une stratégie de lecture publique. Ce chantier implique une configuration Storage et le cycle de publication/paiement ; aucune configuration Storage ou donnée Supabase n'a été modifiée ici.
- Le POST `/api/events/media` est encore protégé uniquement par l'authentification : il n'est pas rattaché à un brouillon d'événement ni à une autorisation d'entitlement/paiement. Il peut donc déposer un média public sans qu'un événement soit finalisé. Le parcours payant existant ne peut pas être bloqué par un simple contrôle d'entitlement ; il faut d'abord créer une réservation de brouillon côté serveur, puis lier l'upload à cette réservation.
- Aucun quota durable par utilisateur ni rate limit d'upload n'est ajouté dans cette PR. Un compteur mémoire local ne serait pas une protection fiable en environnement serverless ; il faut une réservation/limite persistante ou un mécanisme serveur compatible avec Storage.
- L'URL média externe saisie manuellement demeure un parcours existant distinct : la validation de signature et de propriété ajoutée ici s'applique aux fichiers téléversés dans le bucket, pas à un média hébergé sur un domaine tiers.

### 81.5 Vérifications automatiques et état CI

Sur le commit `fe00d435116ab0aad577825a4ecbc42d206a8ed7` :
- les tests Mission Afrique P0 sont **PASS** ;
- les tests Event Core P1 sont **PASS** ;
- les migrations isolées de sécurité sont **PASS** ;
- le typecheck a échoué sur deux erreurs ciblées dans `home-stats/route.ts` : relation PostgREST `User` typée en tableau et ancienne constante pays encore référencée.

Ces deux erreurs ont été corrigées sur le commit suivant `2e16e9d5721e977c51a713f5fe90636e293b0c8e`. Une passe complémentaire a ensuite corrigé le libellé de visibilité Talent et la détection AVIF ; le HEAD final contrôlé est `a8bd044a5abb416b90ef236499e814cb84b02753`. Pour ce HEAD :
- Mission Afrique P0 : **PASS** ;
- Event Core P1 : **PASS** ;
- contrôle du registre des sources : **PASS** ;
- typecheck : **PASS** ;
- build de production : **PASS** ;
- tests de migrations isolées : **PASS** ;
- run CI push complet : [42498449394](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42498449394) ;
- run CI PR complet (typecheck + build) : [42498455404](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42498455404) ;
- vérification du pipeline d'offres : [42498455345](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42498455345) ;
- migrations isolées Security Core : [42498455576](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42498455576) ;
- registre des sources : [42498455373](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42498455373) ;
- gates J’IA Architecture, Cognitive Core, Internet Brain, Hard Mode et Master : **PASS** ;
- validation de préparation harvest : **PASS** ; le crawl réel est **SKIPPED** sur pull request conformément à sa garde d'exécution.

La branche de correction a donc passé les contrôles automatisés enregistrés ci-dessus. La recette fonctionnelle runtime des trois rôles reste distincte et n'est pas déduite du build CI.

### 81.6 État de recette et ordre de reprise

- LOT-00 demeure **PARTIAL** ; le préflight public Auth reste PASS (§78).
- LOT-01 smoke Auth (3 comptes × sign-in/getUser/refresh/signOut) : résultat opérateur toujours attendu ; ne pas le présumer PASS.
- Continuer les LOT-01 à LOT-10 selon leurs dépendances, sans relancer les groupes déjà PASS si leur code n'a pas changé.
- LOT-11 reste le dernier lot : OpenAPI `public=200 valid`, `net=406/PGRST106`, puis réconciliation des findings sécurité et de l'éventuelle fonction SQL historique.
- Corrections isolées sur `fix/audit-profile-country-event-guards-20261108`, HEAD validé par CI : `a8bd044a5abb416b90ef236499e814cb84b02753`.
- PR **#267** : [ouverte, brouillon, non fusionnée](https://github.com/kenzimayaka-glitch/Jobly/pull/267), base `main`, head `fix/audit-profile-country-event-guards-20261108`.
- PR **#266** : reste ouverte, brouillon, non fusionnée.
- `main` reste sur `979f2ccfec9258bc30989af18433cf6adb1b4698` ; aucune de ces corrections n'y est intégrée.

Aucune modification Supabase/Storage, aucun accès JOBLY-PROD, aucune migration appliquée, aucune fusion et aucun déploiement de production ne sont effectués par cette mise à jour.

**Exception de traçabilité — aperçu PR automatique :** après ouverture de PR #267 et mise à jour de son HEAD, le statut externe `netlify/thriving-cannoli-c23611/deploy-preview` a été signalé et l'URL `https://deploy-preview-267--thriving-cannoli-c23611.netlify.app` a été publiée (aperçu Netlify `6af09ec2efbaa7c73fd6dd36`). Les checks Netlify de règles et de pages ont affiché `neutral`. Cet aperçu semble déclenché par l'intégration Netlify déjà rattachée au dépôt ; il n'a pas été lancé manuellement ici et ne vise pas la production. Cela contredit la préférence projet « Vercel, pas Netlify ». Aucune modification de l'intégration n'a été faite ; il faudra la désactiver ou la remplacer avant les prochaines PR si Vercel doit être l'unique fournisseur d'aperçu.

**Seconde exécution CI déclenchée par l'ouverture de PR #267 :** les deux runs sont maintenant terminés **PASS** :
- CI Typecheck & Build : [42498056605](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42498056605) — typecheck et build de production PASS ;
- Verify offer pipeline : [42498056596](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42498056596) — PASS.
Les autres checks Actions de la PR observés (registre, Security Core, migrations isolées, gates J’IA et validation harvest) sont PASS ; le crawl en mode PR est SKIPPED comme prévu. Le premier run push [42497839381](https://github.com/kenzimayaka-glitch/Jobly/actions/runs/42497839381) reste entièrement PASS.

Mise à jour V2.82 sur `e2e/recette`. Source précédente : blob SHA `095d7e376f0b2e176f9dbd26a2429043103c339b`.


## 82. Reprise de recette — sécurisation du smoke Auth et prochaine exécution

### 82.1 État vérifié au 8 novembre 2026

- La référence de continuité a été relue sur `e2e/recette`.
- PR [#266](https://github.com/kenzimayaka-glitch/Jobly/pull/266) : **ouverte, brouillon, non fusionnée**, base `main`, head `e2e/recette`.
- Commit du correctif du smoke Auth : `1ae164849bd7f0b52986d2af080e8b8771e3422c`.
- `main` reste sur `979f2ccfec9258bc30989af18433cf6adb1b4698`.
- Le dernier résultat local Auth annoncé dans ce document n'a pas été remplacé par un nouveau rapport ; aucun nouveau fichier `feedback-lot01-auth-session-20261108.txt` n'a été transmis dans cette reprise.
- **LOT-01 / Auth reste NOT RUN pour cette nouvelle passe / résultat attendu.** Le smoke public Auth préflight (§78) est PASS, mais ce préflight ne remplace pas la connexion réelle des trois fixtures.

### 82.2 Correctif fail-closed du smoke Auth

Fichier modifié : `e2e/auth-session-smoke.mjs`.

Avant ce correctif, lorsque `.e2e-fixtures.json` était absent, le rapport disait `BLOCKED` mais le script pouvait quitter avec le code 0 ; son message suggérait aussi à tort de lancer `e2e/provision-fixtures.mjs`, alors que tout provisionnement/rétablissement de comptes est désormais interdit sans autorisation spécifique.

Correctifs commités sur `e2e/recette` :
1. Le cas « fixtures locales absentes » indique clairement que le contrôle est bloqué et qu'aucun compte ne doit être créé, restauré ou réinitialisé pour contourner le blocage.
2. Le code de sortie est désormais non nul pour **tout statut autre que PASS**. Un rapport BLOCKED ou PARTIAL ne peut donc plus être interprété comme une réussite par un appelant CMD/CI.
3. Les gardes existantes restent en place : référence et URL strictes JOBLY-E2E, clé publishable seulement, environnement/ref des fixtures vérifiés, rôles signés `e2e_role`, aucune clé privée, aucun Auth Admin, aucune création de compte ou donnée métier.
4. Le test ouvre une session Supabase Auth pour chaque compte, valide `getUser`, vérifie le rôle signé, teste `refreshSession`, puis ferme la session locale. Il s'agit d'une activité Auth réelle et transitoire ; ce n'est pas un test sans effet sur les sessions Auth.
5. Le rapport JSON expurgé est écrit dans `artifacts/e2e/auth-session-smoke.json`.

**Preuve Git :** commit `1ae164849bd7f0b52986d2af080e8b8771e3422c`, blob `e2e/auth-session-smoke.mjs` = `86568783a7a0f9023553dfdbf53af736cea4cc12`. Le patch du script a été vérifié sur le contenu avant l'écriture distante ; le test runtime n'a pas encore été exécuté sur le poste opérateur.

### 82.3 Prochaine action opérateur — LOT-01 Auth (12 contrôles attendus)

Commande CMD unique :

```bat
cd /d C:\Users\ASUS\Jobly
set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw"
set "NEXT_PUBLIC_SUPABASE_URL=https://ofqqrryamslxoqkklraw.supabase.co"
set "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Z9_IW1X9Um0J7d7kOWXjWg_ua9Hvg9y"
node e2e/auth-session-smoke.mjs > feedback-lot01-auth-session-20261108.txt 2>&1
set "RECIPE_EXIT=%ERRORLEVEL%"
echo exit_code=%RECIPE_EXIT%>>feedback-lot01-auth-session-20261108.txt
notepad feedback-lot01-auth-session-20261108.txt
```

Résultat attendu pour PASS : **12 contrôles PASS**, soit 4 par rôle (TALENT, RECRUITER, PARTNER), aucun FAIL/BLOCKED, `status=PASS` et `exit_code=0`.

Si le résultat est BLOCKED, PARTIAL, FAIL ou si `exit_code` est non nul : arrêter la séquence et transmettre uniquement le rapport expurgé. **Ne pas lancer** de provisionnement, de restauration, de reset de mot de passe ou le runner bulk pour contourner ce résultat.

### 82.4 Suite conditionnelle — pas encore autorisée par les résultats

Après réception et vérification d'un LOT-01 Auth PASS :
- examiner les prérequis et effets du script `e2e/authenticated-role-smoke.mjs` avant son exécution ; ce script consulte les API des trois rôles et réalise aussi des mutations synthétiques contrôlées (création/mise à jour/suppression d'un brouillon Recruteur), donc il ne doit pas être qualifié de lecture seule ;
- confirmer que le serveur local écoute sur `127.0.0.1:3000` et que toutes ses variables ciblent exclusivement JOBLY-E2E ;
- exécuter ensuite le smoke API ciblé, lire le rapport, puis planifier le parcours croisé Talent → Recruteur avec preuves de persistance et nettoyage ;
- ne pas relancer les tests déjà PASS si le code concerné n'a pas changé.

Aucun accès JOBLY-PROD, aucune mutation SQL directe, aucune migration, aucune modification Storage, aucune fusion et aucun déploiement n'ont été effectués pendant cette reprise. PR #266 reste en brouillon ; PR #267 reste distincte et en brouillon.


## 83. LOT-00 — ré-audit de sécurité et de stockage en lecture seule

### 83.1 Périmètre et méthode

Audit exécuté le 8 novembre 2026 sur le seul projet Supabase **JOBLY-E2E** (`ofqqrryamslxoqkklraw`), état projet `ACTIVE_HEALTHY`, PostgreSQL 17.11. Les opérations ont été limitées à des lectures de catalogue, des contrôles de privilèges effectifs, des comptages Storage et aux Supabase Security/Health Advisors. **Aucun SQL DDL/DML, aucune migration, aucun changement de privilège ou de bucket n'a été exécuté. JOBLY-PROD n'a pas été consulté.**

Références de documentation Supabase consultées : RLS et contrôle d'accès, accès des buckets publics/privés, limites de fichiers par bucket et bonnes pratiques des fonctions `SECURITY DEFINER`.

### 83.2 Socle RLS — éléments PASS

- Tables du schéma `public` : **180/180 avec RLS activé**, aucune table publique avec RLS désactivé.
- Politiques `public` : **215**, réparties sur **154 tables**.
- Les **26 tables** signalées par l'Advisor `rls_enabled_no_policy` sont des tables internes sans politique ; le contrôle croisé confirme **zéro privilège effectif `anon` ou `authenticated`** sur ces tables. Elles restent fermées aux rôles clients et ne doivent pas recevoir de politiques permissives uniquement pour faire disparaître l'INFO Advisor.
- Vue `public.jia_memory_unified` : option `security_invoker=true`, aucun privilège `SELECT` pour `anon` ou `authenticated`, lecture serveur seule dans la matrice observée.
- Séquences du schéma `public` : aucun privilège effectif `USAGE`, `SELECT` ou `UPDATE` pour `anon` ou `authenticated` sur les séquences existantes.
- L'accès de lecture anonyme actuellement réellement autorisé par la combinaison GRANT + RLS est limité aux données publiées/actives de `BonPlan`, `BonPlanComment` et `Institution`. Les autres politiques de lecture de type `public`/`anon` observées ne sont pas utilisables par `anon` lorsqu'un GRANT de table manque, ou ont une condition propriétaire / `false`.

Ces résultats valident la présence de RLS et l'absence d'accès client sur les tables sans politique. Ils ne valident pas encore le principe de moindre privilège des ACL.

### 83.3 Matrice des privilèges — BLOCKER de fermeture

État effectif observé :

- `anon` : privilèges directs de table `SELECT/INSERT/UPDATE/DELETE` ainsi que `TRUNCATE/REFERENCES/TRIGGER` sur **23 tables** : `ApplicationBatch`, `ApplicationBatchItem`, `BonPlan`, `BonPlanComment`, `CVShare`, `CandidateFile`, `CareerCompetencyAssessment`, `CareerCompetencyAttempt`, `CareerEvidence`, `CareerGoal`, `CareerJourney`, `CareerMission`, `CareerMissionUpdate`, `CareerPathScenario`, `CareerPortfolioItem`, `CareerRecommendation`, `CareerReview`, `Institution`, `JiaWatchRun`, `JiaWatchSnapshot`, `JiaWatchSubscription`, `RecruiterProfile`, `jia_preferences`.
- `authenticated` : `SELECT` sur 55 relations, `INSERT` sur 24, `UPDATE` et `DELETE` sur 23. Il détient aussi des privilèges `TRUNCATE/REFERENCES/TRIGGER` sur 23 relations.
- Le fait qu'un rôle ait un GRANT SQL ne suffit pas à prouver qu'il peut voir ou modifier des lignes : RLS continue d'appliquer ses prédicats. Aucun succès d'écriture anonyme n'a été démontré pendant cet audit. En revanche, les privilèges inutiles restent trop larges et compliquent la garantie de moindre privilège.

**Défaut plus important pour les objets futurs :** les privilèges par défaut du schéma `public`, pour les propriétaires `postgres` et `supabase_admin`, accordent actuellement :
- `ALL` sur les nouvelles tables à `anon`, `authenticated` et `service_role` ;
- `EXECUTE` sur les nouvelles fonctions aux mêmes rôles ;
- des privilèges de lecture/écriture/usage sur les nouvelles séquences aux mêmes rôles.

Les séquences existantes sont actuellement protégées, mais les ACL par défaut peuvent réintroduire des droits excessifs lors de prochaines migrations. Une simple révocation sur les 23 tables actuelles ne suffirait donc pas.

**Correction requise avant PASS :** définir les privilèges par défaut minimaux pour les deux propriétaires, puis réconcilier les GRANT explicites par objet avec les usages réellement nécessaires aux appels PostgREST et Storage. Ne pas retirer en bloc les droits `authenticated` sur les 55 relations : une matrice route/API → relation → opération doit préserver les parcours Talent, Recruteur, Partenaire, Recruitment360 et les modules actifs. Les droits `anon` de lecture des trois surfaces publiques doivent être les seuls droits clients anonymes conservés lorsque le code les nécessite. `TRUNCATE`, `TRIGGER` et `REFERENCES` ne doivent pas être accordés aux rôles de navigateur.

### 83.4 Fonctions RPC publiques — deux sujets différents

Cinq fonctions du schéma `public` sont exécutables par au moins un rôle client :

1. `get_public_home_stats()` : `SECURITY DEFINER`, exécutable par `anon` et `authenticated`. Elle appartient à `postgres`, utilise un `search_path` vide et retourne uniquement trois agrégats, sans champs personnels. Son code SQL est ancien et diverge des règles actuelles : il contient 55 codes pays avec `EH` et compte tous les profils Talent sans filtre géographique. La route `app/api/public/home-stats/route.ts` sur `main` calcule les statistiques via `adminClient` et n'appelle pas ce RPC ; elle contient elle-même encore l'ancienne liste de 55 codes, dont `EH`. La branche de correction de la PR #267 a ramené cette route à la liste canonique des 54 pays, mais cette correction n'est pas fusionnée. **Action avant révocation :** rechercher toutes les références au RPC dans le code et vérifier les clients historiques ; s'il n'a pas de consommateur autorisé, retirer l'exécution des rôles clients et `PUBLIC`. Sinon, synchroniser ses règles pays/compteurs et réduire son exposition avec une conception de privilèges explicite.
2. `recruitment360_lot10_execute_batch(...)` : `SECURITY INVOKER`, exécutable par `anon` et `authenticated`. Le corps refuse l'absence de `auth.uid()` et valide l'appartenance au recrutement ainsi que le rôle recruteur. Le GRANT `anon` est donc redondant ; conserver le parcours authentifié, après vérification du consommateur.
3. `recruitment360_lot11_set_listing_consent(...)` : `SECURITY INVOKER`, accessible à `authenticated` seulement ; contrôle que la candidature appartient à `auth.uid()`. Droit cohérent avec son usage candidat et à conserver.
4. `set_applications_updated_at()` et `set_profiles_updated_at()` : fonctions de déclencheur, non destinées à être des endpoints RPC client ; leurs privilèges `EXECUTE` hérités des ACL par défaut doivent être retirés aux rôles clients tout en préservant les exécutions par les triggers.

Les Advisors WARN sur le RPC `get_public_home_stats()` sont donc réels du point de vue de l'exposition `SECURITY DEFINER`, même si sa sortie actuellement observée est limitée à des agrégats.

### 83.5 Storage — configuration observée et limites métier

Comptage effectué : **7 buckets, 0 objet dans chacun** sur JOBLY-E2E.

| Bucket | Accès | Plafond | MIME |
|---|---|---:|---|
| `jobly-events` | public | 10 MiB | image/*, video/*, application/pdf |
| `profile-photos` | public | 5 000 000 octets | image/* |
| `jobly-payment-proofs` | privé | 10 MiB | JPEG, PNG, WebP, GIF, PDF |
| `mobility-provider-documents` | privé | 10 MiB | PDF, JPEG, PNG |
| `mobility-documents` | privé | non défini | non défini |
| `recruitment-listings` | privé | non défini | non défini |
| `talent-cvs` | privé | non défini | non défini |

`storage.objects` porte quatre politiques limitées au dossier propre de l'utilisateur dans `talent-cvs` (SELECT/INSERT/UPDATE/DELETE). Les autres uploads identifiés utilisent des clients serveur privilégiés.

Contrôles applicatifs rapprochés :
- `app/api/talent/cv/original/route.ts` vérifie la session, le préfixe réel `%PDF-`, la taille maximale de 3 MiB et produit un lien signé de 60 secondes. Le bucket privé `talent-cvs` devrait recevoir une limite Storage de 3 MiB et un MIME `application/pdf` pour ajouter une défense en profondeur.
- `app/api/mobility/partner/kyc-document/route.ts` contrôle 10 MiB et PDF/JPEG/PNG ; cela correspond à `mobility-provider-documents`. Le MIME déclaré par le navigateur n'est toutefois pas une preuve de signature du fichier ; une validation d'octets reste à vérifier/renforcer.
- Les routes de stockage de `mobility-documents` et `recruitment-listings` doivent être inventoriées complètement avant de fixer leurs plafonds et allowlists ; ne pas choisir des limites au hasard.
- `profile-photos` et `jobly-events` sont publics conformément à l'intention validée par l'opérateur, mais toute URL d'objet dans ces buckets est lisible publiquement. La visibilité volontaire de chaque photo n'est pas encore matérialisée par un consentement explicite et les médias d'événements peuvent être accessibles avant publication. Le staging privé / la promotion contrôlée des médias d'événements reste à concevoir ; aucune modification de bucket n'a été effectuée.

**Conséquence :** la configuration des buckets privés CV/KYC est globalement correcte, mais les limites manquantes et le cycle de confidentialité des médias publics empêchent de considérer le contrôle Storage comme complètement clos.

### 83.6 pg_net — risque conditionnel réservé au LOT-11

- Extension `pg_net` : version **0.20.4**, enregistrée dans le schéma `public` (WARN Advisor `extension_in_public`).
- Le schéma `net` accorde `USAGE` à `anon` et `authenticated` ; 12 fonctions `net` ont aussi un droit `EXECUTE` effectif pour ces rôles.
- Le trigger d'événement `issue_pg_net_access` est activé et la fonction Supabase `extensions.grant_pg_net_access()` accorde à nouveau `USAGE` sur `net` lorsque l'extension est installée/mise à jour. Une révocation isolée sans stratégie compatible risque d'être annulée par le mécanisme Supabase.
- L'exposition effective de `net` par PostgREST/OpenAPI n'a pas été prouvée : `current_setting('pgrst.db_schemas', true)` renvoie NULL, ce qui ne permet pas de conclure sur les schémas exposés.
- Aucun `net.http_*` n'a été invoqué. Le contrôle OpenAPI `public=200 valid` / `net=406/PGRST106` reste volontairement réservé au **LOT-11**, après LOT-10, conformément à l'ordre validé.

### 83.7 Advisors et contrainte du forfait

Sécurité Advisor :
- INFO `rls_enabled_no_policy` : 26 tables internes fermées aux clients ; non bloquant une fois leur absence de GRANT démontrée.
- WARN `extension_in_public` : `pg_net`.
- WARN `anon_security_definer_function_executable` et `authenticated_security_definer_function_executable` : `get_public_home_stats()`.
- WARN `auth_leaked_password_protection` : protection HaveIBeenPwned inactive.

Health Advisor : aucun finding.

L'organisation Supabase de JOBLY-E2E est sur le **forfait Free**. La documentation Supabase indique que la détection des mots de passe compromis via HaveIBeenPwned est disponible sur Pro et supérieur. Cette alerte doit être suivie comme **limitation de forfait / risque accepté**, non comme une correction de code possible dans ce lot.

### 83.8 Décision de recette — LOT-00 toujours PARTIAL

**PASS démontrés :** projet E2E actif et identifié ; 180/180 tables publiques avec RLS ; 26 tables internes sans politique sans privilège client ; vue J'IA en `security_invoker` non lisible par les rôles clients ; lecture anonyme effective limitée aux trois surfaces publiques ; aucune séquence publique accessible aux rôles clients ; sept buckets vides ; buckets CV/KYC privés.

**À corriger ou à accepter explicitement avant clôture :**
1. réduire les GRANT excessifs existants et corriger les ACL par défaut pour `postgres` et `supabase_admin`, après établissement de la matrice minimale des usages clients ;
2. réconcilier les cinq RPC exposés et fermer les fonctions trigger côté API ; retirer ou mettre à jour `get_public_home_stats()` selon les consommateurs réels ;
3. poser des restrictions Storage au niveau bucket, au minimum CV 3 MiB / PDF, puis inventaire précis des deux buckets `mobility-documents` et `recruitment-listings` ;
4. finaliser la décision de confidentialité déjà prise sur photos et médias d'événements : consentement explicite photo, staging privé puis promotion/publication des médias ; ces adaptations touchent les lecteurs, routes et cycle de publication ;
5. LOT-11 restera responsable de la vérification OpenAPI et de la réconciliation `pg_net` ; ne pas anticiper ce test dans LOT-00 ;
6. consigner la protection des mots de passe compromis comme exception de forfait Free, à réévaluer en cas de passage à Pro.

**Aucune correction SQL/Storage n'a été appliquée pendant cet audit.** Une migration de moindre privilège doit être préparée après inventaire des consommateurs, relue, puis appliquée à JOBLY-E2E uniquement avec validation et tests de régression. Ne jamais appliquer cette proposition à JOBLY-PROD dans le cadre de la présente recette.

Mise à jour V2.85 sur `e2e/recette`. Source précédente : blob SHA `a6bd2dce5d6e75e190eb2eed0b43d92c27d4c2cf`. PR #266 reste ouverte, brouillon et non fusionnée ; PR #267 reste distincte, ouverte et brouillon. `main` reste inchangée sur `979f2ccfec9258bc30989af18433cf6adb1b4698`.


## 84. LOT-00 — correction des privilèges SQL appliquée, Storage en attente d'API

### 84.1 Migration SQL réellement appliquée sur JOBLY-E2E

Le 8 novembre 2026, l'outil Supabase a confirmé l'application réussie de la migration :

- Version distante : `20261108165510`
- Nom : `jobly_e2e_lot00_least_privilege_public_api`
- Fichier de continuité : `supabase/migrations/20261108165510_jobly_e2e_lot00_least_privilege_public_api.sql`
- Aucun accès à JOBLY-PROD et aucun déploiement.

La migration réalise uniquement des changements de privilèges :
1. Pour les futurs objets créés par le rôle `postgres` dans `public`, retrait des privilèges par défaut de table, séquence et fonction pour `anon` et `authenticated`. Les privilèges `service_role` sont conservés.
2. Révocation des droits directs de `anon` sur les tables publiques ; seuls `SELECT` sur `BonPlan`, `BonPlanComment` et `Institution` sont accordés à nouveau.
3. Retrait de `TRUNCATE`, `REFERENCES` et `TRIGGER` à `authenticated`, sans retirer ses droits applicatifs `SELECT/INSERT/UPDATE/DELETE` existants.
4. Révocation des privilèges de séquence des rôles clients et de l'exécution anonyme des fonctions du schéma public.
5. Fermeture de `get_public_home_stats()` aux rôles clients et du RPC `recruitment360_lot10_execute_batch` à `PUBLIC`/`anon`, tout en conservant les deux fonctions nécessaires aux parcours authentifiés : batch Recruitment360 et consentement de publication officielle.
6. Retrait de l'exécution client des deux fonctions de déclencheur `set_applications_updated_at()` et `set_profiles_updated_at()`.

### 84.2 Vérifications post-migration — PASS

Résultats des requêtes de catalogue exécutées après application :

| Contrôle | Avant | Après |
|---|---:|---:|
| Tables publiques avec RLS | 180/180 | **180/180** |
| GRANT de lecture `anon` | 23 tables | **3 tables** |
| GRANT d'insertion `anon` | 23 tables | **0** |
| GRANT de mise à jour `anon` | 23 tables | **0** |
| GRANT de suppression `anon` | 23 tables | **0** |
| `authenticated` — SELECT | 55 | **55** |
| `authenticated` — INSERT | 24 | **24** |
| `authenticated` — UPDATE | 23 | **23** |
| `authenticated` — DELETE | 23 | **23** |
| `authenticated` — TRUNCATE / REFERENCES / TRIGGER | 23 | **0 / 0 / 0** |
| Tables RLS sans policy et accessibles au client | 0 | **0** |

- Les trois seules relations disposant d'un GRANT de lecture anonyme sont `BonPlan`, `BonPlanComment` et `Institution`. Aucune d'elles n'a conservé de GRANT d'écriture.
- Une transaction de lecture avec `SET LOCAL ROLE anon` s'est exécutée ; les trois SELECT ont retourné zéro ligne dans ce jeu E2E (aucune donnée correspondante n'y était présente). La transaction a été annulée ensuite.
- Les 181 objets actuellement présents dans `public` (tables, vues et autres relations inspectées) appartiennent au rôle `postgres`. Les ACL par défaut de `postgres` ne mentionnent plus `anon` ni `authenticated` pour tables, fonctions ou séquences. Les droits de `service_role` restent présents.
- Les fonctions publiques exécutables après correction par `authenticated` sont limitées à `recruitment360_lot10_execute_batch` et `recruitment360_lot11_set_listing_consent`. Aucune fonction du schéma `public` inspectée ne reste exécutable par `anon`.
- `get_public_home_stats()` n'est plus exécutable par `anon` ou `authenticated`. La route active `app/api/public/home-stats/route.ts` utilise `adminClient` et ne l'appelle pas ; aucun appel à ce RPC n'a été trouvé dans les logs E2E des dernières 24 heures.
- Security Advisor : les deux WARN `anon_security_definer_function_executable` et `authenticated_security_definer_function_executable` ont disparu. Restent INFO `rls_enabled_no_policy` (26 tables internes sans accès client) et WARN `extension_in_public` (`pg_net`) / `auth_leaked_password_protection` (limitation du forfait Free). Health Advisor : aucun finding.

### 84.3 Paramètres de Storage — script sécurisé préparé, non exécuté

La documentation Supabase actuelle demande d'utiliser l'API Storage pour les modifications des buckets et de traiter les tables du schéma `storage` comme des tables système en lecture seule. Aucun `UPDATE storage.buckets` n'a donc été exécuté par SQL.

Le script local `scripts/e2e/lot00-storage-bucket-hardening.mjs` a été créé sur `e2e/recette`. Il :
- charge les variables locales avec `@next/env` ;
- refuse toute URL/projet autre que `https://ofqqrryamslxoqkklraw.supabase.co` ;
- accepte une ancienne clé JWT `service_role` seulement après vérification de son claim `ref`, ou une clé `sb_secret_` fournie sous le nom explicite `SUPABASE_E2E_SECRET_KEY` ;
- n'imprime et ne sauvegarde aucune clé ;
- met à jour les buckets via `admin.storage.updateBucket`, relit chaque bucket, compare les limites et tente une restauration des réglages précédents si une mise à jour échoue.

Configuration à appliquer :

| Bucket | Confidentialité | Limite | MIME autorisés |
|---|---|---:|---|
| `talent-cvs` | privé | 3 MiB | PDF |
| `recruitment-listings` | privé | 50 MiB | PDF, XLSX, HTML, HTML UTF-8, JPEG |
| `mobility-documents` | privé | 10 MiB | PDF, JPEG, PNG, WebP |

Le bucket `mobility-documents` est actuellement vide et aucune route d'upload correspondante n'a été trouvée dans l'inventaire des API actives ; la configuration est une allowlist prudente pour ce bucket réservé. Elle devra être révisée si un futur parcours nécessite d'autres types de documents.

Les buckets `jobly-events`, `profile-photos`, `jobly-payment-proofs` et `mobility-provider-documents` restent inchangés : leurs réglages actuels concordent avec les contrôles et décisions consignés plus haut. Les buckets concernés par le script ne contiennent actuellement aucun objet.

### 84.4 Dépendance code pour les exports HTML

Le validateur MIME de Supabase Storage compare le type déclaré au type autorisé. Le code d'export Recruitment360 déclarait `text/html; charset=utf-8`, tandis que la configuration canonique attend `text/html`. La branche de correction PR #267 utilise désormais `text/html` ; le HTML conserve son encodage dans `<meta charset="utf-8">`. Le script accepte encore les deux formes pendant la transition.

- Commit PR #267 : `b4c6f625d432a4550dcfcb42cb50df8cf7a8cc2c`.
- PR #267 reste ouverte, brouillon, non fusionnée.
- Aucun déploiement de cette correction n'a été effectué.

### 84.5 Commande opérateur — appliquer et vérifier les trois buckets sur JOBLY-E2E

La clé privée doit déjà être présente dans `.env.local` ou `.env`. Ne pas la copier dans le chat. Pour une clé moderne `sb_secret_`, utiliser localement le nom `SUPABASE_E2E_SECRET_KEY`; le script refuse une clé qui ne peut pas être rattachée explicitement à JOBLY-E2E.

```cmd
cd /d C:\Users\ASUS\Jobly
set "E2E_PROJECT_REF=ofqqrryamslxoqkklraw"
set "NEXT_PUBLIC_SUPABASE_URL=https://ofqqrryamslxoqkklraw.supabase.co"
node scripts/e2e/lot00-storage-bucket-hardening.mjs --apply-lot00-e2e-storage-hardening > feedback-lot00-storage-20261108.txt 2>&1
set "RECIPE_EXIT=%ERRORLEVEL%"
echo exit_code=%RECIPE_EXIT%>>feedback-lot00-storage-20261108.txt
notepad feedback-lot00-storage-20261108.txt
```

Résultat attendu : trois buckets en `PASS`, `status=PASS`, `exit_code=0`. Si le script renvoie `BLOCKED` ou `FAIL`, ne pas essayer de contourner la garde ; transmettre le rapport expurgé. Ne jamais fournir la clé privée.

### 84.6 Statut révisé

- **SQL / matrice des privilèges : PASS.**
- **RLS / tables internes : PASS.**
- **RPC clients / fonctions de déclencheur : PASS.**
- **Storage — restrictions par bucket : NOT RUN**, en attente de l'exécution locale du script via l'API Storage.
- **LOT-00 global : PARTIAL**, jusqu'à la vérification positive/négative de ces trois configurations Storage. Le contrôle OpenAPI et l'exposition éventuelle de `net` restent réservés au LOT-11.

Mise à jour V2.86 sur `e2e/recette`. Les deux PR restent ouvertes en brouillon et non fusionnées. `main` reste inchangée sur `979f2ccfec9258bc30989af18433cf6adb1b4698`. Aucun accès JOBLY-PROD, aucune modification de Storage ou aucun déploiement de production n'ont été effectués.


## 85. Incident opérateur — script Storage absent de la copie locale

Le 8 novembre 2026, l'exécution locale de `node scripts/e2e/lot00-storage-bucket-hardening.mjs --apply-lot00-e2e-storage-hardening` a échoué avant le démarrage du script avec `MODULE_NOT_FOUND` : le chemin `C:\\Users\\ASUS\\Jobly\\scripts\\e2e\\lot00-storage-bucket-hardening.mjs` n'existait pas dans la copie de travail utilisée.

Vérification distante effectuée immédiatement : le fichier existe bien sur GitHub, branche `e2e/recette`, avec le blob `06ff209b99a1f276f53f0007e7919eaf7cd82851` :
https://github.com/kenzimayaka-glitch/Jobly/blob/e2e/recette/scripts/e2e/lot00-storage-bucket-hardening.mjs

Diagnostic : désynchronisation de la copie locale (branche/fichiers non récupérés), et non erreur d'authentification Supabase, de validation de bucket ou d'exécution du script. Le script n'a pas démarré ; aucune requête Storage d'écriture n'a été envoyée ; les trois buckets n'ont pas été modifiés par cette tentative.

Procédure de reprise : dans le dépôt local, récupérer les références distantes, basculer sur `e2e/recette`, mettre la branche à jour en fast-forward, vérifier la présence du script, puis seulement relancer la commande d'application documentée au §84.5. Si le dépôt local contient des changements non commités, ne pas les écraser : arrêter avant le changement de branche et transmettre `git status --short --branch`.

Statut inchangé :
- **SQL / RLS / privilèges : PASS**.
- **Storage : NOT RUN** (incident de synchronisation locale).
- **LOT-00 global : PARTIAL**.
- `main` n'est pas modifiée ; PR #266 et #267 restent ouvertes en brouillon ; aucun déploiement n'a été effectué.


## 86. Diagnostic Git local après l'incident MODULE_NOT_FOUND

Le rapport opérateur confirme :
- branche active locale : `e2e/recette` ;
- suivi distant après `git fetch origin` : `origin/e2e/recette` est 100 commits en avance sur la copie locale ;
- le fichier distant `scripts/e2e/lot00-storage-bucket-hardening.mjs` est confirmé présent (`SCRIPT_PRESENT`) ;
- changements locaux à préserver : modification de `e2e/reset-existing-fixture-passwords.mjs`, nombreux rapports/diagnostics non suivis, fichiers temporaires Supabase et artefacts TypeScript.

Décision de sécurité : ne pas lancer `git pull`, `git switch`, `git reset` ou `git stash` dans ce dépôt local tant que son état n'a pas été sauvegardé/revu. Ne pas restaurer ni exécuter `e2e/reset-existing-fixture-passwords.mjs`.

Procédure de reprise à faible impact : extraire uniquement le script vérifié depuis l'objet Git déjà récupéré `origin/e2e/recette` avec `git show`, dans le chemin manquant du dépôt local ; vérifier le hash Git de ce fichier contre le blob distant `06ff209b99a1f276f53f0007e7919eaf7cd82851` ; faire un contrôle de syntaxe Node ; puis exécuter le script avec le drapeau explicite après vérification. Cette méthode ne met pas à jour la branche locale et ne touche pas aux autres fichiers.

Statut reste : **SQL / RLS / privilèges PASS ; Storage NOT RUN ; LOT-00 PARTIAL**. Aucun changement de `main`, aucune fusion PR #266/#267, aucun déploiement, aucun accès JOBLY-PROD.


## 87. LOT-01 — analyse du vrai blocage et défaut de statut du runner

Analyse de la branche distante `e2e/recette` effectuée après le retour opérateur du diagnostic Git local.

### 87.1 Fichiers relus à distance

| Fichier | Blob SHA | Constat |
|---|---|---|
| `scripts/e2e-local-recipe.mjs` | `6bd5918a3fdaed76d73e086318f4cb528adfbe78` | Catalogue, exécution des lots et agrégation des statuts |
| `e2e/auth-session-smoke.mjs` | `86568783a7a0f9023553dfdbf53af736cea4cc12` | 12 contrôles Auth réels, 4 par rôle |
| `e2e/browser-smoke.mjs` | `87d7acbadce230d5b343ee6025e246e0016408d2` | Parcours UI public, mobile, APIs anonymes et preuve Auth |
| `scripts/e2e-authenticated-runtime-regression.test.mjs` | `ad7aa1f4ac537c4741c67c274838428fa29d9891` | 6 assertions statiques de sécurité runtime |
| `scripts/authentication-flow-regression.test.mjs` | `8048875be0291cfa2986e18acb0e6babe5b30b3d` | Contrats d'authentification statiques |
| `scripts/jobly-security-core.test.mjs` | `16091b19842d87a535061e5bf0c427777443a964` | Sécurité du cœur, anti-abus, worker PWA et contrat pg_net |
| `scripts/security-entitlements.test.mjs` | `a8a1d8c924455589ab8be95451a5c9f4c998b4c1` | Contrats de quotas et autorisations |
| `scripts/p2-pwned-passwords.test.mjs` | `fd92e9b2bac627fa130e9526cc99a22c43417c23` | Tests du contrôle HIBP personnalisé |

### 87.2 Défaut bloquant certain — LOT-01 ne peut pas être déclaré PASS par le runner actuel

Le catalogue LOT-01 contient les cinq fichiers de tests ci-dessus, mais ne déclare aucun tableau `gates`.

Dans `executeLot()`, après succès des tests et des éventuels gates, le chemin sans gate retourne explicitement `status: "PARTIAL"` (commentaire : un PASS unitaire/statique ne prouve pas le parcours authentifié). Plus loin, l'agrégateur LOT-01 ajoute l'état du smoke Auth et du navigateur ; il ne fait que dégrader le lot en `FAIL` lorsque le navigateur échoue. Il ne contient aucune condition qui promeut le lot en `PASS`, même lorsque Auth et UI sont PASS.

**Conséquence : le moteur de recette actuel rend LOT-01 structurellement incapable de devenir vert.** Ce défaut doit être corrigé dans le code du runner : définir des critères/gates explicites et n'émettre PASS que lorsque les suites statiques, le smoke Auth 12/12, le smoke UI sans contrôle bloqué et les scénarios runtime retenus sont effectivement PASS. Ne pas simplement changer la valeur PARTIAL en PASS par défaut.

### 87.3 Preuves runtime manquantes — état constaté dans la continuité

- Le préflight public Auth §78 est PASS, mais il teste uniquement la joignabilité de `/auth/v1/settings`, pas les connexions des comptes.
- Le smoke `e2e/auth-session-smoke.mjs` exige `.e2e-fixtures.json` avec les trois identifiants JOBLY-E2E (Talent, Recruteur, Partenaire). Il réalise 4 contrôles par rôle : sign-in réel, vérification `getUser`, rôle signé `app_metadata`, renouvellement/rotation de session ; il ferme ensuite la session locale. Une absence de fixture donne BLOCKED sans création/restauration/reset.
- Aucun nouveau rapport `feedback-lot01-auth-session-20261108.txt` n'a été reçu depuis le correctif fail-closed §82.2. La continuité avait déjà signalé l'absence locale de `.e2e-fixtures.json` ; aucun résultat plus récent ne prouve que le fichier d'identifiants existe à nouveau. Ne pas le présumer.
- Le smoke navigateur compte AUTH-006/007 PASS uniquement si un rapport Auth récent (moins de 6 heures), complet (12/12), sur le ref exact JOBLY-E2E, avec les trois rôles PASS est présent. Sans ce rapport, deux contrôles restent BLOCKED.
- Le smoke navigateur couvre la page d'accueil, l'accès au formulaire de connexion, l'affichage/masquage du mot de passe, la navigation vers inscription, l'absence de débordement mobile et six refus HTTP 401 d'API protégées pour un visiteur anonyme. Son propre code dit explicitement qu'il ne soumet pas l'inscription, OTP, paiement, candidature, email ou requête fournisseur externe.

### 87.4 Couverture métier restant à décider/compléter

Le gap catalogue de LOT-01 mentionne encore les parcours réels OTP, Google OAuth, réinitialisation du mot de passe et révocation multi-appareils. Les fichiers existants en vérifient une partie de manière statique (présence de contrôles et contrats dans le code), mais le smoke navigateur n'exécute pas les parcours fournisseur/OTP. Pour un LOT-01 réellement vert au sens complet, ces scénarios doivent être exécutés sur JOBLY-E2E avec des méthodes contrôlées, ou être explicitement délimités/acceptés comme hors périmètre de ce jalon. Les tests statiques ne sont pas une preuve de parcours runtime.

### 87.5 Causes à ne pas confondre

1. **Défaut du runner :** cause certaine et bloquante pour le statut PASS, même si les tests passent.
2. **Preuve Auth runtime absente :** 12/12 non démontrés par un nouveau rapport ; configuration d'identifiants locale requise.
3. **Preuve UI/Auth récente :** AUTH-006/007 dépendent du rapport 12/12 récent ; le smoke UI complet reste à produire.
4. **Parcours OTP/Google/reset/révocation :** couverture runtime non démontrée si ces scénarios restent des critères d'acceptation.
5. L'Advisor Supabase signale la protection native contre les mots de passe compromis désactivée sur le plan Free ; le contrôle HIBP personnalisé a ses tests dédiés. C'est une limitation/acceptation de configuration à documenter, pas une raison de simuler un PASS Auth.

### 87.6 Plan de correction LOT-01 — sans lancer le runner global

1. Corriger le mécanisme de statut du runner pour LOT-01, avec critères PASS explicites et preuve reportée par contrôle.
2. Ajouter/compléter les scénarios runtime OTP, Google OAuth, reset et révocation multi-appareils si retenus au périmètre de sortie.
3. Rétablir un moyen sûr et local de fournir les identifiants des trois fixtures existantes (sans les poster ici, sans réinitialisation ni provisionnement).
4. Exécuter d'abord le smoke Auth isolé, puis le smoke UI ciblé sur le même rapport frais.
5. Exécuter les validations additionnelles et le LOT-01 ciblé ; vérifier le détail et le code de sortie avant de déclarer PASS.

Ne pas lancer `scripts/e2e-local-recipe.mjs` pour contourner ces manques : son chemin d'exécution peut démarrer le serveur et les parcours authentifiés, et il ne doit pas restaurer automatiquement des fixtures. Ne pas exécuter les scripts de provisionnement, reset de mot de passe ou restauration de fixture. Le dépôt local étant 100 commits behind avec des changements non commités, ne pas faire de `pull`, `reset`, `stash` ou `clean` en l'état.

Statut LOT-01 : **PARTIAL / BLOCKED PAR LE MOTEUR DE STATUT ET PAR LES PREUVES RUNTIME MANQUANTES**. Aucun correctif du runner n'a été appliqué pendant cette analyse. JOBLY-PROD, `main`, les PR et les déploiements restent inchangés.

### 87.7 Réconciliation V2.138 — le défaut du runner global est toujours actif

Relecture du code distant actuel de scripts/e2e-local-recipe.mjs le 9 novembre 2026 :
- executeLot() renvoie encore PARTIAL après les tests et gates sans disposer d'une preuve runtime reconnue ; pour LOT-01, l'agrégateur ajoute le statut Auth et navigateur mais ne promeut jamais le lot en PASS (il ne fait que le passer en FAIL si Playwright échoue).
- les propriétés dependsOn du catalogue sont conservées dans le rapport, mais runStage() vide et exécute les files par numéro d'étape sans attendre le PASS des dépendances.
- le chemin local du runner peut restaurer le runtime ou appeler le provisionneur lorsque les fichiers fixture/runtime ne répondent pas à ses critères.

Les correctifs browser-only du §112 portent sur le runner isolé e2e/run-authenticated-role-recipe.mjs et **ne corrigent pas** ce moteur global. L'analyse §87.6 est donc partiellement dépassée pour l'état des preuves (Auth 12/12 et API 40/40 sont maintenant acquis), mais son diagnostic de statut reste exact pour scripts/e2e-local-recipe.mjs.

**Consigne active :** ne pas lancer le runner global. Corriger ses règles de promotion, appliquer réellement les dépendances et isoler explicitement les voies de provisionnement avant de le réintroduire dans la recette. En attendant, utiliser les runners ciblés et les gates de lot dédiés.





## 91. LOT-00 — diagnostic du blocage @next/env et correction du runner autonome

### 91.1 Rapport opérateur du 8 novembre 2026

Le lanceur précédent a bien récupéré le fichier attendu :
- empreinte locale = empreinte attendue : 6e5de2afc4b31ec8668403500912e7488631fc10 ;
- node --check : PASS ;
- exécution : BLOCKED avant tout appel Supabase, car Node ne résout pas le package @next/env importé par un script autonome depuis scripts/e2e.

Le script n'a pas atteint la création du client Supabase ni la phase d'application. Aucune modification de bucket n'a donc été déclenchée par cette tentative. Le statut Storage reste inchangé : NON APPLIQUÉ.

### 91.2 Correction faite sur e2e/recette

Le script scripts/e2e/lot00-storage-bucket-hardening.mjs n'importe plus @next/env. Il charge lui-même .env puis .env.local avec les API natives Node (fs), tout en conservant les variables déjà injectées dans le processus ; le fichier .env.local prévaut sur .env pour les clés non injectées par l'environnement.

- Nouveau blob du script : 6e5de2afc4b31ec8668403500912e7488631fc10.
- Dépendance restante : @supabase/supabase-js, qui est une dépendance directe déclarée dans package.json. Elle est distincte du package @next/env qui causait le blocage.
- Le parseur prend en charge les lignes KEY=VALUE, les préfixes export, valeurs simples/entre guillemets et les fins de ligne Windows/Unix ; les secrets ne sont ni écrits ni affichés.

Le lanceur scripts/e2e/run-lot00-storage-hardening.cmd a été actualisé :
- nouveau blob : d7478e1793021483e586ebf29e247dd994c9629a ;
- empreinte attendue du script corrigé : 6e5de2afc4b31ec8668403500912e7488631fc10 ;
- conserve fetch sans pull, contrôle hash, node --check, cible JOBLY-E2E fixe et ouverture Notepad du rapport.

Un test de contrat vérifie désormais que le script autonome ne réintroduit pas l'import @next/env. Son contenu est sur la branche ; il n'a pas encore été exécuté localement.

### 91.3 Reprise opérateur — remplacer uniquement le lanceur puis exécuter

Dans CMD :

cd /d C:\Users\ASUS\Jobly
git fetch origin
git show origin/e2e/recette:scripts/e2e/run-lot00-storage-hardening.cmd > scripts\e2e\run-lot00-storage-hardening.cmd
scripts\e2e\run-lot00-storage-hardening.cmd
notepad feedback-lot00-storage-apply-20261108.txt

Ce lanceur va récupérer lui-même le nouveau script, vérifier son hash 6e5de2afc4b31ec8668403500912e7488631fc10 et sa syntaxe, puis l'exécuter. Aucun pull/switch/reset/stash/clean n'est lancé. Il ne touche pas les autres fichiers locaux, hormis le script Storage explicitement ciblé.

Si Node signale ensuite que @supabase/supabase-js est introuvable, arrêter et transmettre le rapport : ne pas lancer une installation globale ou un pnpm install sur cette copie locale modifiée sans diagnostic préalable. Ne jamais coller de clé/secrets dans la conversation.

### 91.4 Statut inchangé en attente d'une nouvelle preuve

La tentative initiale s'est arrêtée à l'import de module. Le script corrigé n'a pas été exécuté au moment de cette mise à jour ; aucun bucket n'est déclaré PASS. LOT-00 reste PARTIAL. main, JOBLY-PROD, les PR et les déploiements restent inchangés.

## 93. LOT-00 — diagnostic local des variables privées, sans exposition des secrets

Après la seconde répétition du blocage, un diagnostic Node autonome a été ajouté : `scripts/e2e/lot00-storage-credential-diagnostic.mjs`, blob `227bda429d09d7984c0c05763f65ff78f7b5d962`.

Ce diagnostic :
- ne fait aucun appel réseau et ne modifie ni Supabase ni les fichiers d'environnement ;
- reprend le parseur et la priorité du script Storage : `.env`, puis `.env.local`, avec priorité aux variables du processus déjà définies ;
- indique seulement le répertoire courant, l'existence des fichiers, le nombre d'affectations des deux variables acceptées, la présence d'une valeur parsée, le masquage éventuel par une variable de processus vide, et la validation de forme/ref/role d'un JWT service_role ;
- n'imprime, n'écrit et ne transmet aucune valeur de clé ;
- génère `feedback-lot00-storage-credential-diagnostic.txt`.

Commande de diagnostic, à exécuter seule avant tout nouveau lancement du hardening :

```cmd
cd /d C:\Users\ASUS\Jobly
git fetch origin
git show origin/e2e/recette:scripts/e2e/lot00-storage-credential-diagnostic.mjs > scripts\e2e\lot00-storage-credential-diagnostic.mjs
node scripts\e2e\lot00-storage-credential-diagnostic.mjs
notepad feedback-lot00-storage-credential-diagnostic.txt
```

Ne pas relancer `run-lot00-storage-hardening.cmd` tant que ce diagnostic ne confirme pas `keyValidation.keySelected=true` et `keyValidation.acceptedFormat=true`. Pour une clé JWT, les indicateurs `projectMatches` et `serviceRole` doivent également être `true`. Si la variable est absente, corriger uniquement `.env.local` localement. Si une variable de processus est définie mais vide, elle empêche actuellement le chargeur du script Storage de reprendre la valeur du fichier ; fermer le terminal puis ouvrir un nouveau CMD après correction, ou retirer la variable vide du processus.

Le diagnostic ne change pas le statut : LOT-00 demeure **PARTIAL / BLOCKED**, jusqu'à application vérifiée des cinq buckets puis tests runtime.

## 92. LOT-00 — seconde tentative Storage bloquée, diagnostic local requis (8 novembre 2026)

La seconde exécution du lanceur Windows a de nouveau confirmé :
- blob attendu et local : `6e5de2afc4b31ec8668403500912e7488631fc10` ;
- récupération Git distante jusqu'au commit documentaire `ef34fe7` ;
- `syntax_check=PASS` ;
- environnement affiché : JOBLY-E2E / `ofqqrryamslxoqkklraw` ;
- statut script : `BLOCKED` ;
- erreur inchangée : « Clé privée JOBLY-E2E absente du fichier local. ».

Cette répétition ne prouve pas que la clé a été ajoutée et mal validée : du point de vue du processus Node, ni `SUPABASE_E2E_SECRET_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` n'est défini après lecture de `.env` et `.env.local`. La nouvelle tentative est donc encore arrêtée avant `createClient` et avant toute requête Storage. Aucune mutation distante n'a eu lieu.

Diagnostic opérateur à exécuter avant une nouvelle tentative : vérifier uniquement les booléens de présence des deux noms de variables dans les variables de processus et dans les fichiers racine `.env` / `.env.local`, sans afficher les valeurs. Vérifier également le chemin du dépôt où le lanceur est exécuté. Si les deux booléens de fichier sont faux, ajouter la variable attendue dans `C:\\Users\\ASUS\\Jobly\\.env.local` (racine, pas dans un sous-dossier) et enregistrer le fichier. Si la variable est présente dans le fichier mais non chargée, vérifier le nom exact, le signe égal et l'absence d'espaces autour du nom ; ne jamais utiliser la clé publique `NEXT_PUBLIC_SUPABASE_ANON_KEY` comme secret de service.

LOT-00 reste **PARTIAL / BLOCKED** sur le hardening Storage. Ne pas relancer le script jusqu'à ce que le diagnostic confirme la présence d'au moins une des deux variables acceptées. Aucun secret ne doit être imprimé ou transmis.

## 91. LOT-00 — tentative Storage bloquée par l'absence de clé privée locale (8 novembre 2026)

### 91.1 Résultat vérifié

Rapport opérateur transmis :
- expected_blob : `6e5de2afc4b31ec8668403500912e7488631fc10` ;
- local_blob : `6e5de2afc4b31ec8668403500912e7488631fc10` ;
- `syntax_check=PASS` ;
- environnement ciblé : `JOBLY-E2E`, projet `ofqqrryamslxoqkklraw` ;
- résultat du script : `status=BLOCKED`, motif : « Clé privée JOBLY-E2E absente du fichier local. » ;
- `credentials=not included`.

Le fichier local correspond donc exactement au script de la branche et sa syntaxe est valide. Le programme s'arrête sur l'assertion de présence de la clé, avant `createClient`, `storage.getBucket`, toute mise à jour/création de bucket et toute migration de photo. Cette tentative n'a envoyé aucune requête Supabase/Storage et n'a effectué aucune mutation distante.

### 91.2 Variables acceptées par le script

Le script accepte une seule des deux formes suivantes, dans la configuration locale non committée à la racine du dépôt :
- `SUPABASE_E2E_SECRET_KEY` pour une clé secrète Supabase au format `sb_secret_…` ;
- `SUPABASE_SERVICE_ROLE_KEY` pour un JWT service_role dont les claims doivent confirmer le projet `ofqqrryamslxoqkklraw` et le rôle `service_role`.

Le chargeur lit `.env`, puis `.env.local` (qui remplace les valeurs du premier fichier). Une variable déjà définie dans l'environnement du processus conserve la priorité sur ces fichiers. Les noms/valeurs de secrets ne doivent jamais être affichés, committés, ni copiés dans le chat ou le rapport.

### 91.3 Action opérateur restante

1. Ajouter localement dans `.env.local` une seule des variables acceptées ci-dessus avec une clé autorisée pour JOBLY-E2E ; ne pas partager la valeur.
2. Relancer `scripts\\e2e\\run-lot00-storage-hardening.cmd`. Le lanceur refait le fetch individuel, le contrôle du blob et `node --check` avant l'application.
3. Vérifier le rapport `feedback-lot00-storage-apply-20261108.txt` : il faut `status=PASS`, `exit_code=0` et les cinq cibles vérifiées après relecture. En cas de nouveau blocage, ne transmettre que le rapport expurgé des secrets.

LOT-00 reste **PARTIAL / BLOCKED sur l'étape Storage**. Aucun PASS Storage, aucun test applicatif runtime et aucune clôture LOT-00 ne sont autorisés à ce stade. Gardes-fous inchangés : JOBLY-PROD hors périmètre, `main` inchangée, PR #266/#267 ouvertes en brouillon et non fusionnées, aucun déploiement.

## 90. LOT-00 — lanceur Windows sécurisé et réconciliation finale du code

### 90.1 Lanceur opérateur ajouté

Fichier : scripts/e2e/run-lot00-storage-hardening.cmd  
Blob : d7478e1793021483e586ebf29e247dd994c9629a

Le lanceur :
- exécute uniquement git fetch (pas de pull, switch, reset, stash ou clean) ;
- récupère uniquement le script Storage depuis origin/e2e/recette ;
- vérifie son blob Git exact 6e5de2afc4b31ec8668403500912e7488631fc10 ;
- exécute node --check et s'arrête à la moindre erreur ;
- fixe E2E_PROJECT_REF et NEXT_PUBLIC_SUPABASE_URL à JOBLY-E2E ;
- lance le script Storage avec le flag explicite d'application ;
- écrit feedback-lot00-storage-apply-20261108.txt et l'ouvre dans Notepad ;
- ne lit/affiche aucune clé et ne modifie pas les autres fichiers locaux, hors script ciblé.

La copie locale existante du script est sauvegardée dans le dossier temporaire Windows avant remplacement. Le lanceur peut être récupéré individuellement, sans synchroniser 100 commits.

### 90.2 Ajustement événementiel

Le lien signé du média d'un événement publié a une validité de sept jours ; il est régénéré lors des lectures API ultérieures. Le test de contrat statique couvre cette durée. La source reste un stockage privé ; aucun lien public permanent n'est construit pour le staging.

### 90.3 État synchronisé au 8 novembre 2026

- Branche e2e/recette avant cette entrée : 383ab0d92c6eb2e8e2d029fc0269087684564709.
- main : 979f2ccfec9258bc30989af18433cf6adb1b4698, inchangée.
- PR #266 : OPEN, draft=true, merged=false, base main.
- PR #267 : OPEN, draft=true, merged=false, base main.
- Migration SQL de confidentialité : appliquée sur JOBLY-E2E, version 20261108173912, contraintes revérifiées.
- Vérifications statiques distantes : 21/21.
- Test node --test, TypeScript, build Next.js, parcours navigateur et Storage runtime : toujours non exécutés.
- Script Storage cinq cibles : tentative d'exécution le 8 novembre 2026, bloquée avant tout appel Supabase faute de clé privée locale ; aucune configuration Storage n'a été modifiée. Les dernières métadonnées lues avant cette tentative restent la dernière preuve disponible.
- LOT-00 reste PARTIAL. Aucun déploiement de production, aucun merge et aucun accès JOBLY-PROD.

### 90.4 Commande de reprise locale

Dans CMD, récupérer le lanceur individuel puis le lancer :

git fetch origin
git show origin/e2e/recette:scripts/e2e/run-lot00-storage-hardening.cmd > scripts\e2e\run-lot00-storage-hardening.cmd
scripts\e2e\run-lot00-storage-hardening.cmd
notepad feedback-lot00-storage-apply-20261108.txt

Ne pas lancer le script Storage directement avec une ancienne version de la copie locale. Le lanceur contrôle lui-même le hash et la syntaxe avant l'application.


## 89. LOT-00 — correction confidentialité photos et médias, migration E2E et nouvelle recette Storage

### 89.1 Migration de schéma appliquée sur JOBLY-E2E

Migration additive appliquée avec succès sur le projet ofqqrryamslxoqkklraw :
- nom : lot00_private_media_consent ;
- version Supabase enregistrée : 20261108173912 ;
- source Git : supabase/migrations/20261108190000_lot00_private_media_consent.sql ;
- ajoute à User : profilePhotoStoragePath, profilePhotoVisibility (défaut PRIVATE), profilePhotoConsentAt ;
- ajoute à Event : mediaStoragePath ;
- contraintes vérifiées : visibilité limitée à PRIVATE/PUBLIC, publication PUBLIC impossible sans horodatage de consentement.

État des données E2E après migration :
- 4 comptes ont le défaut PRIVATE ;
- 0 URL photo déjà enregistrée ;
- 0 consentement public déjà enregistré ;
- la table Event ne contient actuellement aucun événement.
La migration est appliquée et vérifiée ; ne pas la rejouer sans besoin.

### 89.2 Audit Storage direct effectué

Résultats read-only sur JOBLY-E2E :
- RLS activé sur storage.objects ;
- zéro objet dans les six buckets métier contrôlés (jobly-events, profile-photos, profile-photos-private, talent-cvs, recruitment-listings, mobility-documents) ;
- aucune policy storage.objects d'upload/lecture pour les buckets profil et événement ; les seules policies trouvées sur storage.objects concernent l'accès personnel à talent-cvs ;
- les grants SQL globaux sur storage.objects ne suffisent pas à ouvrir l'accès sans policy RLS ; toutefois un bucket public permet la lecture publique de ses objets existants. Le bucket événementiel est encore public avant application du script, mais il est vide à ce contrôle.

### 89.3 Confidentialité des photos — correctifs commis sur e2e/recette

Correctifs de code enregistrés :
- lib/profilePhotoStorage.ts : résolution d'URL propre au propriétaire, URL signée pour photo privée, URL publique seulement si visibilité PUBLIC et consentement enregistré ;
- app/api/auth/profile-photo/route.ts : upload privé par défaut, formats contrôlés, limite alignée à 5 MiB ; une publication initiale nécessite un consentement explicite ;
- app/api/auth/profile-photo/visibility/route.ts : écran d'état/contrôle de visibilité, passage public/privé, copie du visuel Hero et suppression de l'ancien objet après mise à jour ;
- components/AccountSettings.tsx : choix explicite, libellé de consentement et possibilité de retrait ;
- app/api/profile/route.ts : URL privée signée pour le propriétaire ;
- lecteurs Recruteur et partage CV corrigés : app/api/recruiter/talents/route.ts, app/api/recruiter/talents/profile/route.ts, app/api/recruiter/applications/route.ts, app/api/recruiter/discover/[token]/route.ts, app/api/cv-share/[token]/route.ts. Aucune de ces surfaces ne doit révéler une photo sans consentement ; les chemins internes Storage ne sont pas renvoyés aux consommateurs.

Le nouveau script Storage migre les anciennes photos dont le consentement public n'est pas prouvé vers profile-photos-private, retire les anciennes URLs publiques, préserve seulement les objets explicitement consentis et supprime les images publiques orphelines non référencées.

### 89.4 Médias événementiels — cycle privé et publication

Correctifs commis :
- jobly-events devient un bucket privé ; l'upload renvoie un chemin privé et non une URL publique ;
- app/api/events/media/route.ts refuse l'upload si le bucket n'est pas privé ;
- app/api/events/route.ts vérifie que le chemin appartient à l'UID authentifié, vérifie l'objet et l'enregistre sur l'événement ;
- app/api/events/[id]/route.ts et la liste publique n'émettent un lien signé que pour les événements PUBLISHED ;
- lib/eventStorage.ts épingle l'application au bucket canonique jobly-events ;
- app/api/cron/event-media-cleanup/route.ts ajoute un nettoyage protégé par CRON_SECRET : dépôts orphelins de plus de 24 h, brouillons de plus de 24 h et paiements en attente de plus de 7 jours ; les médias liés à un événement publié ou à un paiement encore valide sont conservés ;
- le cron quotidien est déclaré dans vercel.json. Aucun déploiement ni activation de cron en production n'a été effectué.

### 89.5 Nouveau script de configuration Storage — exécution encore requise

Le script scripts/e2e/lot00-storage-bucket-hardening.mjs a été étendu. Blob actuel : 6e5de2afc4b31ec8668403500912e7488631fc10.

Cibles :
- talent-cvs : privé, 3 MiB, PDF ;
- recruitment-listings : privé, 50 MiB, PDF, XLSX, HTML, HTML UTF-8 et JPEG ;
- mobility-documents : privé, 10 MiB, PDF/JPEG/PNG/WebP ;
- jobly-events : privé, 10 MiB, JPEG/PNG/WebP/GIF/PDF/MP4 ;
- profile-photos-private : créé s'il manque, privé, 5 MiB, JPEG/PNG/WebP/GIF.

Le bucket public profile-photos reste public uniquement pour les objets explicitement consentis. Le script comporte les garde-fous de ref/URL/clé E2E, les snapshots, la relecture des métadonnées, la migration des photos legacy et le nettoyage des photos publiques orphelines. La syntaxe Node est vérifiée avant toute exécution. En cas d'échec après démarrage des opérations, le bucket jobly-events reste privé par sécurité ; les buckets créés par cette recette ne sont pas supprimés automatiquement.

**État à ce jour : script non exécuté.** Les métadonnées lues juste avant cette mise à jour montrent toujours :
- jobly-events public ;
- talent-cvs, recruitment-listings, mobility-documents privés mais sans limites/MIME conformes ;
- profile-photos-private absent.
Donc aucun PASS Storage ne peut être annoncé avant l'exécution via l'API Storage et la relecture.

### 89.6 Tests et preuves

- 21 vérifications statiques de présence des protections, réalisées sur les sources de la branche : 21/21.
- Nouveau test automatisé ajouté : scripts/e2e/lot00-private-media-contract.test.mjs (10 scénarios de contrat, dont lecteurs Recruteur/CV et protection événementielle). Ce test Node n'a pas encore été exécuté dans une copie de travail propre.
- Aucun build Next.js, aucun parcours navigateur photo, aucun upload événementiel et aucun test d'accès Storage anonyme/authentifié n'ont encore été exécutés après ces corrections.
- Le statut GitHub du commit de code indique un aperçu Netlify PR #266 en succès ; ce n'est ni le build de recette validé, ni une mise en production. L'aperçu n'est pas utilisé comme cible de test.

### 89.7 Actions restantes et statut

1. Récupérer le script mis à jour par fichier individuel après git fetch origin, sans faire de pull et sans modifier les nombreux changements locaux non commités.
2. Vérifier le hash 6e5de2afc4b31ec8668403500912e7488631fc10 et la syntaxe Node ; exécuter le script uniquement avec E2E_PROJECT_REF=ofqqrryamslxoqkklraw, URL https://ofqqrryamslxoqkklraw.supabase.co et la clé E2E déjà présente localement. Ne jamais envoyer la clé dans le chat.
3. Vérifier Storage via API après application : cinq cibles PASS, bucket privé des événements, création et confidentialité du bucket privé photo, migration/absence d'objets photo publics sans consentement.
4. Exécuter node --test scripts/e2e/lot00-private-media-contract.test.mjs dans une copie source correspondant à e2e/recette, puis typecheck/build.
5. Exécuter les parcours runtime E2E : upload privé photo, photo privée signée pour le propriétaire, refus public sans consentement, publication explicite, retrait du consentement, refus d'accès direct au staging événementiel, lecture signée après publication et nettoyage des dépôts expirés.
6. Effectuer la relecture finale read-only (RLS/ACL/RPC/buckets/policies/objets) et joindre les preuves horodatées.

LOT-00 reste **PARTIAL**. La matrice SQL initiale et la migration additive de confidentialité sont appliquées ; les protections de code sont présentes sur e2e/recette, mais les buckets n'ont pas encore été configurés et aucun test applicatif runtime n'a été réalisé.

Garde-fous : dépôt local toujours en retard et avec modifications non commitées ; ne pas faire pull, reset, stash, clean, ne pas réinitialiser/provisionner les fixtures. main reste 979f2ccfec9258bc30989af18433cf6adb1b4698. PR #266 reste ouverte brouillon, non fusionnée ; PR #267 reste ouverte brouillon, non fusionnée. Aucun accès JOBLY-PROD, aucune fusion et aucun déploiement de production.

## 88. LOT-00 — recette complète de clôture, périmètre réel et blocages Storage métier

Cette entrée réconcilie le §84.6 (qui décrivait le dernier réglage technique restant à appliquer) avec les risques applicatifs identifiés aux §§79–81 et 83.5. Le script de trois buckets n'est pas, à lui seul, une preuve suffisante pour clore tout le contrôle Storage si les règles de confidentialité publiques restent non appliquées.

### 88.1 Déjà acquis — ne pas rejouer

- Identité du projet JOBLY-E2E ofqqrryamslxoqkklraw et préflight Auth public : PASS.
- Matrice SQL moindre privilège : migration distante 20261108165510 appliquée ; 180/180 RLS ; anon réduit à SELECT sur BonPlan, BonPlanComment, Institution ; privilèges applicatifs authenticated conservés ; TRUNCATE/REFERENCES/TRIGGER client retirés ; RPC et fonctions de trigger réconciliés.
- Vérifications post-migration SQL : PASS, aucun objet public sans RLS, zéro accès client effectif sur les 26 tables internes sans policies.
- RLS / ACL / RPC ne doivent pas être réappliqués via une autre migration sans audit d'écart ; les changements sont déjà actifs sur JOBLY-E2E.

### 88.2 Étape opérateur restante — plafonds et allowlists des buckets privés

Copier uniquement le script distant scripts/e2e/lot00-storage-bucket-hardening.mjs depuis le ref déjà fetché origin/e2e/recette dans la copie locale, sans synchroniser les 100 commits et sans modifier les autres fichiers non commités.

Blob attendu : 06ff209b99a1f276f53f0007e7919eaf7cd82851.

Contrôles requis avant exécution :
- le hash obtenu par git hash-object doit être exactement égal au blob attendu ;
- node --check doit retourner 0 ;
- ne pas poursuivre si le fichier/hachage/syntaxe diffère.

Application via l'API Storage officielle, projet strictement limité à JOBLY-E2E, avec secret déjà présent localement et jamais copié dans le chat :
- talent-cvs : privé, 3 MiB, PDF ;
- recruitment-listings : privé, 50 MiB, PDF, XLSX, HTML, HTML UTF-8, JPEG ;
- mobility-documents : privé, 10 MiB, PDF, JPEG, PNG, WebP.

Le script capture les réglages précédents, applique chaque cible, relit et compare les métadonnées ; il tente une restauration des buckets déjà modifiés en cas d'erreur. Résultat attendu : 3 buckets PASS, status=PASS, exit_code=0. Cette étape n'altère ni les buckets publics ni les objets.

### 88.3 Risque photo publique — correction code obligatoire avant PASS Storage complet

La règle produit acceptée au §79.2 est : profile-photos public uniquement pour les photos que l'utilisateur choisit explicitement de rendre publiques. Or la route app/api/auth/profile-photo/route.ts place les photos dans le bucket public et retourne toujours une URL publique ; aucun état persistant de visibilité/consentement n'est appliqué. Le fait d'être connecté n'est pas un consentement de publication.

Le correctif sur la branche comporte déjà validation des octets, limites de taille, optimisation et nettoyage d'upload orphelin, mais ne résout pas cette confidentialité. Il faut, dans la branche de recette :
1. ajouter un état de visibilité/consentement persistant avec défaut privé et horodatage/traçabilité ;
2. collecter un choix explicite et compréhensible côté Talent ;
3. adapter tous les lecteurs (profil Talent, Hero, Recruteur, vues publiques) pour servir les photos privées avec une autorisation ou URL signée et n'exposer une URL publique que si le consentement existe ;
4. définir une migration sûre des URLs déjà persistées ; ne pas basculer seulement le bucket en privé, ce qui casserait les lecteurs publics actuels ;
5. ajouter les tests par défaut privé, consentement explicite, retrait du consentement, refus d'accès anonyme et absence d'URL publique pour photo privée.

### 88.4 Médias d'événements — cycle staging/publication obligatoire avant PASS Storage complet

La règle produit acceptée est : média jobly-events public seulement quand l'événement est publié et destiné au public. Le bucket public rend un objet lisible par URL dès son dépôt. La route app/api/events/media/route.ts vérifie actuellement la session et les octets, mais n'attache pas l'upload à une réservation/brouillon/entitlement. Les médias de brouillons ou les médias orphelins peuvent donc être lisibles publiquement avant publication.

Correctif requis :
1. créer un espace de staging privé et un identifiant de réservation de brouillon côté serveur avec propriétaire, entitlement/paiement et expiration ;
2. autoriser l'upload uniquement pour cette réservation et vérifier le propriétaire à chaque opération ;
3. à la publication effective (et après le paiement exigé lorsque applicable), promouvoir côté serveur vers jobly-events public ;
4. empêcher toute lecture publique du staging, et nettoyer les uploads non utilisés/expirés avec un mécanisme durable ;
5. ajouter les tests anonymes avant publication (refus), après publication (lecture publique), utilisateur tiers (refus), réservation expirée, upload orphelin et parcours paiement requis.
Les médias externes saisis par URL doivent rester une voie distincte, explicitement validée.

### 88.5 Ordre final de clôture LOT-00

1. Exécuter et obtenir PASS de l'application des trois restrictions bucket §88.2.
2. Implémenter les corrections confidentialité photo §88.3 et média événement §88.4 sur la branche de recette ; ajouter les tests unitaires et API/Storage nécessaires.
3. Appliquer uniquement les migrations nécessaires à JOBLY-E2E après revue des consommateurs et des effets, puis vérifier les routes et les lecteurs par rôle.
4. Faire un contrôle final read-only sur JOBLY-E2E : ref/URL, RLS 180/180, ACL post-migration, RPC, sept buckets (privacy/publicité comprise), policies Storage et absence d'objets/URLs privés exposés ; joindre les rapports horodatés.
5. Réconcilier les exceptions documentées : HIBP désactivé comme limitation du forfait Free ; pg_net/OpenAPI réservé au LOT-11 final.

LOT-00 reste PARTIAL jusqu'à clôture des étapes 1 à 4, ou décision d'acceptation de risque explicitement documentée et approuvée sur les sujets photo/médias. La simple réussite du script de trois buckets ne doit pas être présentée comme PASS LOT-00 intégral.

Garde-fous inchangés : dépôt local en retard de 100 commits et avec des modifications non commitées ; ne pas utiliser pull/reset/stash/clean. Ne jamais exécuter le provisionneur ou le reset fixture. JOBLY-PROD, main, PR #266/#267, merge et déploiement restent hors périmètre.


---

## 119. Reprise de recette — retest navigateur authentifié LOT-01

**Mise à jour : 9 novembre 2026 à 05:44Z (06:44, heure de Douala) — version 2.148.**

### 119.1 État constaté à la reprise

- Le correctif SQL d'idempotence de `register_jobly_device_session()` reste appliqué uniquement sur JOBLY-E2E, projet `ofqqrryamslxoqkklraw`, migration `20261109015439`.
- Le test SQL ciblé après correction reste PASS pour TALENT, RECRUITER et PARTNER (§118.4).
- Les rapports antérieurs API 40/40 (§§107/109) et UI publique 14/14 (§115) restent acquis et ne doivent pas être rejoués.
- **Aucun nouveau rapport navigateur authentifié n'a été reçu ou exécuté depuis l'application de la migration.** Le dernier rapport navigateur connu demeure celui du 9 novembre à 01:25:12.030Z : 12/29 PASS, 17/29 FAIL avant correctif.
- LOT-01 demeure **PARTIAL / NON CLOS**. Le correctif en base n'est pas une preuve de réussite HTTP/navigateur.

### 119.2 Action unique de reprise

L'action active reste l'exécution opérateur de la commande complète §118.6 depuis CMD. Le lanceur travaille exclusivement dans `C:\Users\ASUS\Jobly-e2e-recette-v3`, lit les configurations et fixtures de `C:\Users\ASUS\Jobly` sans les imprimer, vérifie l'état du worktree avant de toucher au checkout, récupère uniquement `origin/e2e/recette`, vérifie la syntaxe et le TypeScript, puis lance `e2e/run-authenticated-role-recipe.mjs --role-browser-only`.

Le lanceur ouvre automatiquement dans Notepad les rapports statique, TypeScript, résumé du runner, diagnostic navigateur, log de processus et `lot1-auth-role-ui-smoke.json`. S'il détecte d'autres changements dans le worktree isolé que le seul cache `tsconfig.tsbuildinfo`, il s'arrête sans les écraser. Il ne réinitialise aucune fixture et ne lance pas le runner global.

### 119.3 Critère après réception

Inspecter les six fichiers et vérifier le même run, le SHA testé, le projet E2E, l'URL locale, le code de sortie, les trois rôles signés, les refus inter-rôles attendus et le retour HTTP 401 après purge du stockage Auth isolé. Cible : 29/29 PASS, zéro FAIL, zéro BLOCKED. Si le test échoue, consulter uniquement les preuves du nouveau run et les journaux JOBLY-E2E sur sa fenêtre exacte, corriger la cause démontrée et relancer uniquement le smoke rôle.

Le bouton visible de déconnexion et les scénarios OTP, Google OAuth, récupération du mot de passe et révocation multi-appareils restent explicitement séparés de ce retest et ne deviennent pas PASS par déduction.

### 119.4 Périmètre et garde-fous

Aucun accès à JOBLY-PROD, aucune écriture métier ou réinitialisation de fixture, aucun merge vers `main`, aucun déploiement. La branche de travail reste `e2e/recette`. `main` reste hors périmètre ; aucun changement de statut de lot n'est autorisé sans rapports vérifiés.


---

## 120. Collecte des résultats du retest LOT-01 déjà exécuté

**Mise à jour : 9 novembre 2026 — version 2.149.**

L'opérateur indique que le lanceur §118.6 a déjà été exécuté. Ne pas relancer la recette pour le seul motif que les rapports n'ont pas encore été transmis dans la conversation. Étape active : récupérer les fichiers produits par cette exécution dans `C:\Users\ASUS\Jobly-e2e-recette-v3\artifacts\e2e`, les regrouper dans un fichier de restitution local, puis transmettre ce fichier ou son contenu.

Fichiers à collecter sans modification :
- `role-browser-static-check.log`
- `role-browser-typecheck.log`
- `authenticated-role-runner-summary.json`
- `browser-role-smoke-diagnostic.json`
- `browser-role-smoke-process.log`
- `lot1-auth-role-ui-smoke.json`

La commande de collecte ne lance aucun test, ne fait aucun fetch/checkout Git, ne touche à aucune fixture et n'accède pas à Supabase. Elle copie textuellement les rapports existants dans `feedback-lot1-auth-browser-retest.txt` et ouvre ce fichier dans Notepad. Les fichiers absents sont signalés comme tels. À réception, vérifier timestamps, SHA du commit testé, projet, URL locale, code de sortie, nombre de contrôles, statut de chaque rôle, refus inter-rôles et retour 401. LOT-01 reste PARTIAL tant que ces preuves n'ont pas été inspectées.

Garde-fous inchangés : JOBLY-E2E uniquement, aucun accès JOBLY-PROD, aucune réinitialisation de fixture, aucun merge vers `main`, aucun déploiement.


---

## 121. Analyse du fichier de restitution — rapports antérieurs à la migration

**Mise à jour : 9 novembre 2026 — version 2.150.**

### 121.1 Rapport effectivement reçu

Le fichier `feedback-lot1-auth-browser-retest.txt` a été reçu et inspecté. Il ne contient pas un retest post-correctif :
- `lot1-auth-role-ui-smoke.json` porte `createdAt=2026-11-09T01:25:12.030Z`, commit testé `9ac84c7eacfb82531ea2fc90863d358740b9288d`, résultat 12/29 PASS et 17/29 FAIL HTTP 500 ;
- le processus s'est terminé à `01:26:13.561Z` UTC ;
- `authenticated-role-runner-summary.json` porte `createdAt=01:19:26.209Z`, build PASS et serveur local PASS, mais le smoke rôles FAIL 12/29 ;
- les six fichiers collectés ont des dates locales comprises entre 02:17 et 02:26, le 9 novembre.

### 121.2 Comparaison avec la correction Supabase

La lecture de l'historique des migrations du seul projet JOBLY-E2E `ofqqrryamslxoqkklraw` confirme que `20261109015439 jobly_device_session_same_session_idempotency` est enregistrée. Son horodatage version correspond à 01:54:39 UTC (02:54:39 heure locale Africa/Douala), soit après la fin du smoke navigateur à 01:26:13 UTC (02:26:13 heure locale).

**Conclusion : le fichier reçu restitue l'exécution qui a précédé la migration. Il ne démontre ni un échec ni une réussite du code corrigé.** Les 17 erreurs HTTP 500 restent l'ancien résultat ; elles ne doivent pas être présentées comme une régression après migration. Aucun rapport navigateur post-migration n'est encore disponible dans les fichiers transmis.

### 121.3 Action active

La collecte de §120 est terminée ; ne pas la répéter seule. Il faut maintenant exécuter une fois le retest navigateur authentifié §118.6 sur le HEAD courant de `origin/e2e/recette`, après la migration, puis refaire la collecte des six rapports. Avant exécution, le lanceur doit confirmer le SHA courant ; le rapport final doit porter un horodatage postérieur à 02:54:39 heure locale et le commit corrigé actuel (migration de code `04031e1d91ef7fab0913f3323d6f95f2e769ec4f` ou descendant).

Si la commande §118.6 a réellement déjà été exécutée après 02:54:39, les rapports reçus ne sont pas ceux de ce run : vérifier le chemin du worktree `C:\Users\ASUS\Jobly-e2e-recette-v3\artifacts\e2e` et collecter les artefacts du bon run plutôt que de relancer aveuglément.

### 121.4 Garde-fous et statut

JOBLY-E2E uniquement ; aucune mutation métier, aucun reset/provisionnement fixture, aucune écriture JOBLY-PROD, aucun merge `main`, aucun déploiement. LOT-01 reste **PARTIAL / NON CLOS** jusqu'à preuve navigateur post-migration vérifiée. Les preuves antérieures Auth 12/12, API 40/40 et UI publique 14/14 restent distinctes et conservées.


---

## 122. Correction de la commande de restitution — six rapports Notepad

**Mise à jour : 9 novembre 2026.**

L'instruction de collecte §120 avait été matérialisée par une commande qui concaténait les six rapports dans un seul fichier `feedback-lot1-auth-browser-retest.txt` et ouvrait un seul Notepad. Cette commande satisfaisait la collecte consolidée, mais pas le besoin opérateur de présenter les six rapports séparément dans six fenêtres Notepad. L'assistant a reconnu cette erreur.

La collecte consolidée ne doit pas être confondue avec le lanceur de recette §118.6. Le retest à effectuer maintenant doit être postérieur à la migration E2E `20261109015439`. La commande §118.6 réalise le préflight, le checkout isolé de `origin/e2e/recette`, les contrôles statique/TypeScript, exécute uniquement `--role-browser-only`, puis ouvre séparément les six rapports du lancement courant dans Notepad. Elle n'ouvre pas les anciens rapports comme s'ils appartenaient au nouveau run.

Après exécution, transmettre chacun des six rapports ou le fichier consolidé seulement comme copie secondaire. Le rapport navigateur doit être postérieur à l'application de la migration (02:54:39, heure de Douala). LOT-01 reste PARTIAL jusqu'à inspection du nouveau run.

Garde-fous inchangés : aucune exécution sur JOBLY-PROD, aucun reset/provisionneur fixture, aucune mutation métier, aucun merge vers `main`, aucun déploiement.


---

## 123. LOT-01 — retest navigateur authentifié post-migration PASS 29/29

**Mise à jour : 9 novembre 2026 — version 2.152.** Le rapport opérateur complet a été transmis dans la conversation et inspecté. Il s'agit cette fois d'une exécution postérieure à la migration SQL `20261109015439`.

### 123.1 Identité et cohérence du run

- Runner : `role-browser-only`.
- Rapport résumé : `createdAt=2026-11-09T05:59:56.371Z`.
- Projet : JOBLY-E2E, ref `ofqqrryamslxoqkklraw`.
- Build : PASS ; serveur local : PASS.
- Smoke navigateur démarré à `2026-11-09T06:04:04.139Z`, rapport navigateur créé à `06:04:04.290Z`, terminé à `06:05:14.446Z`.
- Commit effectivement testé : `494f8060a619e6704659dae378913be1fd261222`, commit de la commande/cahier V2.151 et descendant du correctif SQL `04031e1d91ef7fab0913f3323d6f95f2e769ec4f).
- Code de sortie navigateur : 0 ; `spawnError=null) ; rapport présent et produit pendant ce run.

### 123.2 Résultat navigateur — PASS 29/29

- 29 contrôles exécutés, 29 PASS, 0 FAIL, 0 BLOCKED.
- TALENT : PASS ; connexion réelle formulaire 200, page de rôle 200, rôle signé 200, API propre 200, six refus inter-rôles attendus 403, teardown 401.
- RECRUITER : PASS ; connexion réelle formulaire 200, page de rôle 200, rôle signé 200, API propre 200, six refus inter-rôles attendus 403, teardown 401.
- PARTNER : PASS ; connexion réelle formulaire 200, page de rôle 200, rôle signé 200, API propre 200, refus inter-rôles attendus 403, teardown 401.
- `pageErrors=[]`, aucun identifiant/mot de passe ou token imprimé.
- `externalActions=false), `remoteBusinessDataMayBeModified=false).
- `remoteAuthDeviceStateMayBeModified=true) et `remoteDataMayBeModified=true) restent des indicateurs de possibilité d'actualisation des seules métadonnées de session synthétique par l'authentification ; le rapport déclare explicitement aucune mutation métier.

### 123.3 Journaux statique et TypeScript vides

Les fichiers `role-browser-static-check.log` et `role-browser-typecheck.log` sont signalés par l'opérateur comme vides. Ce résultat est cohérent avec les commandes utilisées : `node --check` n'émet normalement aucune sortie lorsqu'il réussit, et `pnpm exec tsc --noEmit --incremental false` peut également être silencieux si aucune erreur n'est détectée. Le lanceur n'aurait pas appelé le runner de build et le smoke si les contrôles de syntaxe ou le typecheck avaient renvoyé un code non nul. Le runner indique ensuite build PASS et le processus navigateur exit code 0. Ainsi, les logs vides ne constituent pas un échec ; la chaîne d'exécution indique que ces contrôles préalables n'ont pas interrompu le run. Pour les prochaines recettes, améliorer l'ergonomie en ajoutant des marqueurs explicites `PASS` dans les logs en cas de code de sortie 0.

### 123.4 Statut précis de LOT-01

La porte **UI authentifiée par rôle est PASS 29/29**, après la correction d'idempotence de session appliquée sur JOBLY-E2E. Les portes déjà acquises restent : auth/session 12/12, API rôle 40/40, UI publique 14/14, Security Core 11/11 selon les rapports antérieurs documentés.

**LOT-01 global reste PARTIAL / NON CLOS** selon la règle de clôture §0.3, car :
- le clic sur le bouton visible de déconnexion n'a pas été exécuté ; le test prouve le teardown du stockage Auth du contexte navigateur isolé et le retour HTTP 401, pas le parcours du bouton utilisateur ;
- OTP, Google OAuth, réinitialisation du mot de passe et révocation multi-appareils ne sont pas testés ; une décision de périmètre écrite est requise si ces scénarios sont exclus de la clôture.

Ne pas refaire le run 29/29 sans changement pertinent. Le prochain travail est de traiter précisément ces deux portes restantes, ou de faire définir et documenter le périmètre accepté avant d'attribuer le statut global PASS.

### 123.5 Garde-fous

Le run est circonscrit à JOBLY-E2E. Aucun effet métier distant déclaré, aucun fournisseur externe appelé. Aucun accès JOBLY-PROD, aucun merge vers `main`, aucun déploiement. Les statuts antérieurs LOT-00, API 40/40 et UI publique 14/14 ne sont pas rejoués.


---

## 124. LOT-01 — ajout du bouton de déconnexion visible et smoke navigateur renforcé

**Mise à jour : 9 novembre 2026 — version 2.153.**

### 124.1 Défaut UI confirmé et correction de code

L'audit du commit de recette a établi :
- Talent et Partenaire utilisaient déjà `components/AccountSettings.tsx`, qui présentait « Se déconnecter de Jobly » ;
- le Recruteur avait une page de paramètres distincte sans action de déconnexion ;
- l'icône Paramètres du `PageHeader` ouvre la page commune `/settings`, utilisée pour les appareils et les sauvegardes, mais cette page ne proposait aucun bouton de sortie.

Correctif commité sur `e2e/recette` :
- `app/settings/page.tsx) : bouton accessible `Se déconnecter de Jobly`, fermeture de la session Supabase avec `scope: "local"`, retrait de l'indicateur Gmail local et retour à la page d'accueil ; la déconnexion de cet appareil n'annonce pas la révocation des autres appareils ;
- `e2e/authenticated-browser-role-smoke.mjs) : le contrôle `SESSION-TEARDOWN` est maintenant un vrai parcours UI ; le navigateur ouvre `/settings`, clique le bouton visible, attend la route `/` puis appelle `GET /api/profile) et exige HTTP 401 ;
- `scripts/authentication-flow-regression.test.mjs) : assertion statique du bouton, de la portée de déconnexion locale et de la redirection.

Commit de code : `723282895fa09808c6aa1d97adeed54aea6bd756`. Aucun changement de base requis.

### 124.2 Vérifications CI déjà obtenues

Sur le commit `723282895fa09808c6aa1d97adeed54aea6bd756), le workflow GitHub Actions `Jobly CI — Typecheck & Build` (run 42574575154) a confirmé :
- tests « Authentication and Google account selection regression tests » : SUCCESS ;
- Typecheck : SUCCESS ;
- build de production : encore IN_PROGRESS au dernier contrôle de cette entrée.

Les workflows Architecture et J'IA Master avaient également conclu SUCCESS. Aucun résultat de build final n'est anticipé ici.

### 124.3 Nouvelle recette navigateur requise

Le précédent rapport 29/29 PASS (§123) validait la purge du stockage dans le contexte isolé, pas le bouton UI. Le nouveau smoke remplace ce contrôle, en conservant 29 vérifications au total. Il doit être exécuté sur le nouveau commit `723282895fa09808c6aa1d97adeed54aea6bd756), avec JOBLY-E2E uniquement. Le succès attendu est encore 29/29, mais le détail `SESSION-TEARDOWN) doit maintenant indiquer le clic du bouton visible, la redirection à `/` et HTTP 401.

**Mise à jour ultérieure :** le retest demandé dans ce paragraphe a été exécuté et a obtenu PASS 29/29, y compris le clic réel sur le bouton visible pour les trois rôles ; voir §128.

### 124.4 Commande opérateur — marqueurs PASS explicites et six Notepad

Depuis CMD, exécuter en une seule fois :

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $wt='C:\Users\ASUS\Jobly-e2e-recette-v3'; $src='C:\Users\ASUS\Jobly'; $attemptStart=Get-Date; $exitCode=2; try { $st=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0){throw 'Lecture du statut Git impossible.'}; if($st -eq '?? tsconfig.tsbuildinfo'){ $cache=Join-Path $wt 'tsconfig.tsbuildinfo'; if(!(Test-Path -LiteralPath $cache -PathType Leaf)){throw 'Cache TypeScript attendu absent ; arrêt.'}; Remove-Item -LiteralPath $cache -Force; Write-Host 'CACHE TYPECHECK PRECEDENT SUPPRIME'; } elseif($st){Write-Host $st;throw 'ARRET : autres modifications du worktree. Aucun fichier local écrasé.'}; $clean=(& git -C $wt status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $clean){Write-Host $clean;throw 'Worktree non propre ; arrêt.'}; Write-Host 'WORKTREE_CLEAN'; & git -C $wt fetch origin; if($LASTEXITCODE -ne 0){throw 'git fetch origin en échec.'}; & git -C $wt checkout --detach origin/e2e/recette; if($LASTEXITCODE -ne 0){throw 'Checkout distant en échec.'}; $head=& git -C $wt rev-parse HEAD; $remote=& git -C $wt rev-parse origin/e2e/recette; if($head -ne $remote){throw 'HEAD ne correspond pas à origin/e2e/recette.'}; & git -C $wt merge-base --is-ancestor '723282895fa09808c6aa1d97adeed54aea6bd756' $head; if($LASTEXITCODE -ne 0){throw 'Le HEAD courant ne contient pas le correctif de déconnexion visible.'}; Write-Host ('HEAD contenant le correctif de déconnexion visible : '+$head); Set-Location $wt; New-Item -ItemType Directory -Force -Path 'artifacts\e2e' | Out-Null; $syntaxLog='artifacts\e2e\role-browser-static-check.log'; $typeLog='artifacts\e2e\role-browser-typecheck.log'; & node --check 'e2e\run-authenticated-role-recipe.mjs' *> $syntaxLog; if($LASTEXITCODE -ne 0){throw 'Syntaxe du runner invalide.'}; Add-Content $syntaxLog 'PASS: node --check e2e/run-authenticated-role-recipe.mjs'; & node --check 'e2e\authenticated-browser-role-smoke.mjs' >> $syntaxLog 2>&1; if($LASTEXITCODE -ne 0){throw 'Syntaxe du smoke authentifié invalide.'}; Add-Content $syntaxLog 'PASS: node --check e2e/authenticated-browser-role-smoke.mjs'; & pnpm test:auth >> $syntaxLog 2>&1; if($LASTEXITCODE -ne 0){throw 'Tests de régression Auth en échec.'}; Add-Content $syntaxLog 'PASS: pnpm test:auth'; & pnpm exec tsc --noEmit --incremental false *> $typeLog; if($LASTEXITCODE -ne 0){throw 'Typecheck en échec : runner non lancé.'}; Add-Content $typeLog 'PASS: pnpm exec tsc --noEmit --incremental false'; $post=(& git status --porcelain --untracked-files=all | Out-String).Trim(); if($LASTEXITCODE -ne 0 -or $post){Write-Host $post;throw 'Les vérifications ont laissé des changements : runner non lancé.'}; Write-Host 'TYPECHECK_AND_AUTH_REGRESSION_PASS_WORKTREE_CLEAN'; & node 'e2e\run-authenticated-role-recipe.mjs' $src --role-browser-only; $exitCode=$LASTEXITCODE; Write-Host ('RUNNER_EXIT='+$exitCode) } catch { Write-Host ('ARRET : '+$_.Exception.Message); $exitCode=2 } finally { $reports=@('artifacts\e2e\role-browser-static-check.log','artifacts\e2e\role-browser-typecheck.log','artifacts\e2e\authenticated-role-runner-summary.json','artifacts\e2e\browser-role-smoke-diagnostic.json','artifacts\e2e\browser-role-smoke-process.log','artifacts\e2e\lot1-auth-role-ui-smoke.json'); foreach($f in $reports){$p=Join-Path $wt $f; if(Test-Path -LiteralPath $p -PathType Leaf){$i=Get-Item -LiteralPath $p; if($i.LastWriteTime -ge $attemptStart.AddSeconds(-2)){Start-Process -FilePath notepad.exe -ArgumentList ([char]34+$p+[char]34)}else{Write-Host ('ANCIEN RAPPORT NON OUVERT : '+$p)}}else{Write-Host ('RAPPORT NON GENERE : '+$p)}} }; exit $exitCode"
```

La commande vérifie strictement le SHA de la branche, n'exécute aucun reset/provisionneur et ouvre séparément six rapports du lancement courant. Les deux fichiers texte comporteront désormais des lignes `PASS` explicites ; le runner fait le build et le browser smoke, sans rejouer les 14 contrôles publics ni les 40 API.

### 124.5 Authentification avancée — périmètre non encore clôturé

Les parcours Google OAuth, OTP et récupération du mot de passe utilisent des fournisseurs externes (Google, e-mail ou SMS). Aucun flux fournisseur ne doit être déclenché pendant cette recette sans autorisation dédiée. Leurs contrats UI/callback ont des tests de régression statiques, mais ils ne sont pas démontrés en runtime dans JOBLY-E2E.

La révocation multi-appareils dispose d'une interface et d'une API distinctes ; elle n'est pas prouvée par le test de déconnexion locale. Elle doit faire l'objet d'un scénario séparé avant qu'on puisse dire que toute l'authentification avancée est validée.

**Statut LOT-01 : PARTIAL** après réussite du nouveau browser smoke (§128), uniquement parce que le périmètre Auth avancé reste non exécuté et non formellement exclu. La porte UI authentifiée, elle, est PASS. Pas de merge `main`, aucune action JOBLY-PROD, aucun déploiement.


---

## 125. Synchronisation de l'état maître — nouvelle déconnexion visible à tester

**Mise à jour : 9 novembre 2026 — version 2.154.**

La preuve navigateur 29/29 du §123 est conservée comme telle : son ancienne étape de sortie supprimait le stockage Auth isolé. Elle ne doit pas être utilisée pour affirmer que le bouton visible a déjà été cliqué.

Le code de déconnexion visible et le smoke associé sont désormais commis en un seul changement de code : `723282895fa09808c6aa1d97adeed54aea6bd756`. Le workflow CI associé (run `42574575154`) s'est terminé SUCCESS ; les étapes « Authentication and Google account selection regression tests », « Typecheck » et « Production build » sont SUCCESS. À la date de cette entrée, la commande locale §124.4 devait encore fournir le rapport navigateur post-commit. **Cette attente est levée par le résultat PASS 29/29 du §128.**

Le point de reprise unique est donc le retest utilisateur §124.4, avec six Notepad séparés et les marqueurs explicites dans les deux fichiers texte. Après réception, vérifier que le rapport porte le nouveau SHA (ou un descendant documentaire), `logoutMethod` indique le clic du bouton /settings, et que les trois entrées `*-SESSION-TEARDOWN` sont PASS avec HTTP 401.

Les parcours Auth avancée ne sont pas silencieusement déclarés clos : OTP, Google OAuth, récupération du mot de passe et révocation multi-appareils restent listés à part, sans envoi de SMS/e-mail ou redirection fournisseur dans cette exécution.


---

## 126. Correction du contrôle SHA dans la commande opérateur §124.4

**Mise à jour : 9 novembre 2026 — version 2.155.**

Le document maître est mis à jour par des commits de continuité après le commit de code `723282895fa09808c6aa1d97adeed54aea6bd756). Par conséquent, après checkout de `origin/e2e/recette`, le HEAD courant est un descendant du commit de code et non nécessairement ce SHA exact.

La commande §124.4 vérifie désormais que le commit de correction est un ancêtre du HEAD courant au moyen de `git merge-base --is-ancestor`. Elle accepte ainsi le dernier commit documentaire sans relâcher le contrôle que le code de déconnexion visible est bien présent. L'exécution doit toujours rester sur le HEAD distant propre de `e2e/recette).


---

## 127. Politique permanente de recette continue — tests proportionnés à chaque modification

**Mise à jour : 9 novembre 2026 — version 2.156.**

### 127.1 Principe

Une modification de Jobly ne déclenche pas automatiquement la recette globale de tous les lots. La règle permanente est une recette continue, ciblée et cumulative, proportionnée au risque et à la surface d'impact de la modification. L'objectif est d'éviter les répétitions inutiles tout en protégeant les parcours déjà validés.

### 127.2 Niveaux de validation

**Niveau 1 — recette ciblée (par défaut).** Exécuter les tests unitaires, contrats, API, composants et parcours UI qui couvrent le changement, avec le typecheck/build lorsque le code ou les dépendances le justifient. Pour une modification de contenu purement éditoriale, vérifier uniquement la page, le responsive et l'affichage concernés.

**Niveau 2 — régression liée à l'impact.** Ajouter les contrôles des modules consommateurs, rôles et surfaces partagées touchés. Une modification d'une API commune, de l'authentification, d'une session, d'un droit/RLS, d'une migration ou d'un helper partagé impose une régression sur tous les rôles et modules dépendants. Une régression ciblée doit vérifier les frontières inter-rôles lorsqu'elles peuvent être affectées.

**Niveau 3 — recette globale.** Rejouer la matrice E2E de tous les lots applicables aux jalons majeurs : avant une livraison importante, une mise en production autorisée, une refonte transversale, une évolution majeure du schéma ou du socle de sécurité, ou lorsque les changements cumulés rendent les preuves précédentes non fiables. Les lots indépendants déjà validés ne sont pas rejoués sans motif de fraîcheur, de dépendance ou de changement pertinent.

### 127.3 Matrice indicative d'impact

| Modification | Validation minimale attendue |
|---|---|
| Texte, illustration ou style isolé | Page modifiée, responsive et régression visuelle locale |
| Fonctionnalité Talent | Tests du parcours Talent, API et persistance concernées |
| Fonctionnalité Recruteur | Tests du parcours Recruteur, API et persistance concernées |
| Fonctionnalité Partenaire | Tests du parcours Partenaire, API et persistance concernées |
| J’IA | Tests de la capacité modifiée, état conversationnel, permissions et connecteurs concernés |
| Authentification, rôles ou sessions | Trois rôles, API protégées, refus inter-rôles, connexion et déconnexion |
| API partagée, schéma SQL, migration, RLS/ACL | Tous les consommateurs et rôles dépendants, tests migration/permissions, non-régression |
| Navigation, layout ou composant partagé | Parcours UI de tous les espaces qui le consomment |
| Refonte transversale ou livraison majeure | Recette globale des lots affectés et gate final |

### 127.4 Gestion des preuves et réutilisation

- Ne pas relancer un test PASS si aucun changement pertinent n'affecte son périmètre et si sa preuve demeure valable pour le SHA, l'environnement et les dépendances considérés.
- Chaque exécution doit enregistrer le SHA, le lot, le scénario, le projet de test, l'horodatage, le résultat, les journaux et les effets éventuels.
- Les résultats de runs différents ne doivent pas être additionnés pour fabriquer artificiellement un PASS.
- Une modification documentaire seule ne nécessite pas de recette applicative ; une modification du code de test ou du runner nécessite au minimum les contrôles du harnais et une exécution représentative.
- En cas d'incertitude sur l'impact, élargir la régression au niveau suivant plutôt que relancer aveuglément toute la matrice.

### 127.5 Garde-fous

La politique ne modifie pas les restrictions d'environnement : JOBLY-E2E uniquement pour les recettes, aucune mutation JOBLY-PROD, aucun reset ou provisionnement automatique de fixtures, aucun merge vers `main) et aucun déploiement sans autorisation explicite et validation correspondante.

Cette politique s'applique à toute modification future de Jobly et complète les critères de clôture de chaque lot. Elle n'autorise pas à clôturer LOT-01 sans les preuves et décisions encore requises au §124.


---

## 128. LOT-01 — retest navigateur avec déconnexion visible PASS 29/29

**Mise à jour : 9 novembre 2026 — version 2.157.** Le rapport opérateur transmis confirme que le parcours UI de déconnexion visible, ajouté au §124, a été exécuté avec succès sur les trois rôles.

### 128.1 Identité et cohérence de l'exécution

- Commit testé : `da9ce9e2207c9b08ae56d56f02178fdd61cd46c5`.
- Environnement : JOBLY-E2E uniquement ; projet `ofqqrryamslxoqkklraw`.
- Mode : `authenticated-role-browser`.
- URL : `http://127.0.0.1:3217`.
- Début : `2026-11-09T06:56:26.146Z` ; fin : `2026-11-09T06:57:45.228Z`.
- Processus runner terminé avec `processExitCode=0`, `spawnError=null`, rapport produit pour cette exécution.

### 128.2 Résultats navigateur

**PASS 29/29 — 0 FAIL — 0 BLOCKED.**

| Rôle | Contrôles réussis | Résultat |
|---|---:|---|
| TALENT | 11/11 | PASS |
| RECRUITER | 11/11 | PASS |
| PARTNER | 7/7 | PASS |
| **Total** | **29/29** | **PASS** |

Pour chacun des trois rôles, le formulaire réel accepte la connexion, la page de rôle se charge, Supabase Auth confirme le rôle signé, l'API propre au rôle répond 200 et les accès inter-rôles attendus répondent 403. Le contrôle `*-SESSION-TEARDOWN` confirme désormais le **clic du bouton visible** dans `/settings`, la fermeture de la session locale, le retour à `/` et une réponse HTTP 401 de `/api/profile`.

### 128.3 Vérifications complémentaires du même lancement

- Résumé runner : `status=PASS`, `build=PASS`, `localServer=PASS`, `roleBrowserSmoke=PASS`, 29/29.
- TypeScript : `pnpm exec tsc --noEmit --incremental false` — PASS, marqueur écrit dans `role-browser-typecheck.log`.
- Syntaxe : `node --check e2e/run-authenticated-role-recipe.mjs` et `node --check e2e/authenticated-browser-role-smoke.mjs` — PASS.
- Tests de régression Auth : `pnpm test:auth` — 29 tests, 29 PASS, 0 FAIL, 0 cancelled, 0 skipped ; marqueur PASS écrit.
- Le résumé d'exécution rapporte `pageErrors=[]), aucun identifiant/mot de passe ou token imprimé, aucun effet externe et aucune modification possible des données métier distantes.
- Le runner signale `remoteAuthDeviceStateMayBeModified=true` : les requêtes Auth peuvent actualiser/enregistrer les métadonnées de session de l'utilisateur synthétique courant. Cette possibilité est explicitement distinguée d'une mutation métier.

### 128.4 État de la porte UI authentifiée

La porte UI authentifiée décrite au §0.3 est **PASS**. Le défaut de couverture du bouton de déconnexion est corrigé et vérifié par interaction navigateur réelle pour Talent, Recruteur et Partenaire. Le run ne modifie pas les offres, candidatures, CV, paiements, préférences, profils ou dossiers KYC.

Ne pas rejouer ce smoke sans changement pertinent. Les 40 contrôles API, 14 contrôles UI publics, les tests SQL d'idempotence et les autres preuves antérieures restent des preuves séparées : leurs nombres ne sont pas additionnés au 29/29 de ce run.

### 128.5 Périmètre encore ouvert — LOT-01 global reste PARTIAL

Le rapport confirme expressément que les parcours suivants n'ont pas été soumis : OTP, Google OAuth, récupération du mot de passe, paiements, e-mail et SMS. La révocation multi-appareils n'est pas démontrée par une déconnexion locale, qui ne ferme que la session de cet appareil.

En conséquence :
- **UI authentifiée par rôle : PASS 29/29** ;
- **LOT-01 global : PARTIAL / NON CLOS**, jusqu'à l'exécution contrôlée de ces scénarios sans effet externe ou à une décision explicite et documentée qui les exclut du périmètre de clôture ;
- aucune autorisation implicite d'appeler Google, e-mail ou SMS n'est donnée par ce rapport.

### 128.6 Garde-fous et suite

JOBLY-E2E uniquement. `externalActions=false`, `remoteBusinessDataMayBeModified=false`, aucun secret/token imprimé. Aucun reset/provisionneur de fixtures, aucune mutation JOBLY-PROD, aucun merge vers `main`, aucun déploiement. La prochaine action doit porter uniquement sur la décision ou la validation contrôlée du périmètre Auth avancé ; les suites déjà PASS ne sont pas à rejouer.

 
---

## 129. LOT-01 — recette ciblée Auth avancée : OTP, Google, récupération et révocation multi-appareils

**Mise à jour : 9 novembre 2026 — version 2.158.** Cette section fixe la bonne recette après la réussite du smoke navigateur général §128. Elle évite de rejouer les tests déjà PASS et distingue les flux simulés sans fournisseur externe des mutations réelles et limitées de métadonnées de session JOBLY-E2E.

### 129.1 État du harnais existant — limites vérifiées

- pnpm test:auth est déjà PASS 29/29 dans le run du 9 novembre à 06:57Z (§128.3). Il vérifie les contrats du code, mais n'exécute pas les interactions Auth réelles.
- e2e/run-authenticated-role-recipe.mjs --role-browser-only teste les connexions username/mot de passe, les rôles, les API propres, les refus inter-rôles et le clic de déconnexion local. Il ne teste pas OTP, Google OAuth, le parcours de récupération du mot de passe ni la révocation d'une autre session.
- Les appels de production requestEmailOtp, requestPasswordReset et signInWithGoogle passent par Supabase Auth et peuvent envoyer des e-mails ou rediriger vers Google. Ils ne doivent pas être exécutés tels quels pendant la recette sans fournisseur de test et accord spécifique.
- La révocation d'un appareil passe par DELETE /api/device-sessions/[deviceId], qui appelle la RPC revoke_jobly_device_session. Le contrôle serveur suivant s'appuie sur la session JWT et l'enregistrement UserDeviceSession.

**Décision :** ne pas lancer une deuxième fois le runner --role-browser-only comme substitut à ces scénarios. Aucun script dédié Auth avancée n'est actuellement présent dans le dépôt ; aucune commande d'exécution complète ne doit être annoncée avant l'ajout et la validation du harnais dédié.

### 129.2 Campagne A — OTP e-mail en simulation locale

Le futur test Playwright doit intercepter les requêtes vers Supabase Auth avant qu'elles quittent le navigateur :
1. Ouvrir l'accueil et démarrer « Créer un compte » avec des données entièrement fictives et une adresse réservée au test.
2. Intercepter POST /auth/v1/otp et retourner une réponse de succès simulée ; vérifier l'arrivée sur l'écran du code à six chiffres et le message de confirmation.
3. Intercepter POST /auth/v1/verify avec un code expiré/invalide ; vérifier que l'erreur est visible et que l'utilisateur reste sur l'étape OTP.
4. Cliquer « Renvoyer le code » ; vérifier un second appel OTP simulé et la remise à zéro de la saisie.
5. Vérifier que les requêtes ont été interceptées, qu'aucun accès au fournisseur n'a été effectué et qu'aucun compte n'a été créé.

Cette campagne prouve le comportement UI et les erreurs gérées, pas la délivrabilité réelle d'un e-mail ni l'acceptation d'un code émis par Supabase.

### 129.3 Campagne B — Google OAuth sans redirection externe

1. Ouvrir l'écran de connexion et cliquer « Continuer avec Google ».
2. Intercepter la route Supabase Auth /auth/v1/authorize avant toute connexion réseau.
3. Vérifier provider=google, le paramètre prompt=select_account et l'URL de callback locale attendue.
4. Retourner une réponse simulée ou contrôlée qui maintient le test sur localhost ; vérifier la gestion d'une erreur d'autorisation et l'absence de redirection vers accounts.google.com.

Cette campagne valide la demande et le traitement local. Elle ne valide pas l'authentification Google réelle, le consentement ni l'échange d'un code OAuth émis par Google.

### 129.4 Campagne C — récupération du mot de passe sans e-mail réel

1. Ouvrir « Mot de passe oublié ? » et saisir l'adresse e-mail fictive de la fixture.
2. Intercepter POST /auth/v1/recover avant l'appel réseau et retourner le succès simulé.
3. Vérifier l'écran « E-mail envoyé » et le retour possible à la connexion.
4. Tester séparément le callback de récupération avec un jeton invalide/expiré intercepté ; vérifier l'erreur claire et le retour à Jobly.
5. Pour valider la définition effective d'un nouveau mot de passe, ajouter une réponse de récupération simulée et contrôler la requête auth.updateUser sans modifier le mot de passe d'un compte partagé.

Cette campagne ne valide pas l'envoi réel, le lien reçu par e-mail ni un changement de mot de passe persistant dans Auth.

### 129.5 Campagne D — révocation multi-appareils sur JOBLY-E2E

Ce test est le seul de ces quatre scénarios qui doit écrire un état Auth de test dans la base JOBLY-E2E. Il doit utiliser un compte synthétique existant, deux contextes navigateur isolés et aucune donnée métier.

1. Préflight : confirmer le projet ofqqrryamslxoqkklraw, l'environnement JOBLY-E2E, l'identité de la fixture et la limite de trois appareils actifs. Si le nombre d'appareils actifs ne permet pas deux sessions de test, arrêter sans révoquer un appareil préexistant.
2. Ouvrir deux contextes indépendants A et B (stockages séparés), puis connecter le même compte synthétique dans chaque contexte. Conserver uniquement en mémoire les jetons et identifiants générés ; ne jamais les imprimer.
3. Depuis A, lire GET /api/device-sessions et identifier les deux sessions créées pour ce run grâce à leur session courante et leur heure de création. Ne jamais sélectionner une session préexistante.
4. Dans A, cliquer « Déconnecter » uniquement sur l'appareil B. Vérifier le succès du DELETE /api/device-sessions/[deviceId] et l'état « Déconnecté » dans la liste.
5. Depuis B, envoyer une requête authentifiée en lecture seule vers GET /api/profile ; elle doit être rejetée par HTTP 401 après révocation. Depuis A, la même requête doit rester HTTP 200.
6. Relire la liste depuis A et vérifier que A est toujours actif et courant, B révoqué, sans autre ligne modifiée. Fermer les deux contextes et produire un rapport JSON qui exclut tout secret et token.

**Nettoyage :** ne révoquer aucun appareil autre que la seconde session créée par le run. Le compte fixture et les autres appareils préexistants doivent rester inchangés. Si une ambiguïté existe sur l'identité d'une ligne, interrompre le scénario et produire BLOCKED, pas de suppression approximative.

### 129.6 Ordre d'exécution, rapports et critères

Ordre retenu :
1. Ajouter un script Playwright isolé qui réalise A, B et C par interception stricte des routes Supabase, avec assertion qu'aucune requête fournisseur n'a été émise.
2. Ajouter au même harnais un scénario D à deux contextes, borné aux sessions créées pendant le run et au projet JOBLY-E2E vérifié.
3. Ajouter des tests de régression du harnais, node --check, pnpm test:auth, TypeScript et build.
4. Faire exécuter une seule fois le mode ciblé dédié, puis inspecter un rapport JSON frais contenant les scénarios, statuts, timestamps, SHA, ref du projet, compteurs de requêtes interceptées, statuts HTTP et indicateurs d'effets.

Le rapport doit présenter des statuts distincts pour OTP simulé, OAuth simulé, récupération simulée et révocation multi-appareils réelle. Un succès simulé n'est jamais un succès fournisseur réel. Aucun run PASS ne doit être déclaré avant réception et inspection de ce rapport.

### 129.7 Garde-fous

- Projet JOBLY-E2E uniquement ; aucun accès, aucune lecture et aucune mutation de JOBLY-PROD.
- Aucun vrai e-mail, SMS, OTP délivré par un fournisseur, redirection Google ou appel OAuth externe.
- Aucune modification du mot de passe des fixtures, aucun compte créé, aucun reset/provisionneur et aucune mutation métier.
- Aucune révocation de session préexistante ; seules les sessions B créées par le run sont éligibles.
- Aucun merge vers main, aucun déploiement.
- La porte UI authentifiée générale reste PASS 29/29 (§128). LOT-01 global reste PARTIAL jusqu'à la validation des scénarios définis ici ou à une décision écrite d'exclusion du périmètre.


---

## 130. Transmission opérateur — recette Auth avancée : périmètre et règle de lancement

**Mise à jour : 9 novembre 2026 — version 2.159.**

### 130.1 Ce qui est déjà validé

La porte UI authentifiée standard est PASS 29/29 (§128). Ne pas relancer ce lot, ni utiliser une répétition de `pnpm test:auth` ou de `e2e/run-authenticated-role-recipe.mjs --role-browser-only` comme preuve OTP/Google/récupération/multi-appareils : ces scripts ne couvrent pas ces scénarios.

### 130.2 Recette à réaliser

La campagne correcte est celle du §129, dans cet ordre :
1. **OTP e-mail simulé** : intercepter localement `POST /auth/v1/otp` et `POST /auth/v1/verify`, vérifier code invalide/expiré, renvoi du code et erreurs visibles ; aucune requête ne doit atteindre Supabase Auth externe.
2. **Google OAuth simulé** : cliquer le vrai bouton Google, intercepter `/auth/v1/authorize`, contrôler `provider=google`, `prompt=select_account` et le callback local ; aucune navigation vers `accounts.google.com`.
3. **Récupération simulée** : intercepter `POST /auth/v1/recover`, vérifier l'écran de confirmation, puis le callback expiré/invalide sur `/auth/reset-password` ; aucun courriel ni changement de mot de passe réel.
4. **Révocation multi-appareils réelle et bornée à E2E** : deux contextes Playwright séparés sur un compte synthétique existant, projet `ofqqrryamslxoqkklraw) exclusivement. Avant connexion, le nombre d'appareils actifs doit laisser deux places sous la limite de trois (au plus un appareil préexistant). Si ce préflight échoue ou si l'identité d'une session créée par le run est ambiguë, statut BLOCKED et aucune révocation. Révoquer seulement B depuis A, vérifier B en HTTP 401, A en HTTP 200 et l'absence de changement des autres appareils.

### 130.3 Disponibilité de la commande

Au contrôle du 9 novembre 2026, le dépôt ne contient **pas encore** de runner dédié à cette campagne Auth avancée. Il n'existe donc pas de commande d'exécution fiable à transmettre à ce stade. Ne pas lancer une commande inventée ni détourner un runner existant. Le prochain livrable technique requis est le script dédié avec interception stricte, préflight E2E, rapport JSON expurgé, tests du harnais, `node --check`, `pnpm test:auth`, TypeScript et build. Après validation de ce harnais, une seule commande opérateur pourra être fournie.

### 130.4 Garde-fous de lancement

- JOBLY-E2E uniquement ; référence attendue `ofqqrryamslxoqkklraw`.
- OTP, Google et récupération : simulations réseau locales uniquement ; aucun fournisseur externe.
- Multi-appareils : seules les sessions A/B créées par le run sont éligibles ; jamais de révocation préexistante.
- Aucun changement de mot de passe, création de compte, reset/provisionneur, donnée métier, merge `main` ou déploiement.
- Conserver séparément les statuts des quatre scénarios ; ne pas agréger des PASS de runs distincts pour déclarer LOT-01 global PASS.


---

## 131. Recette opérateur LOT-01 — périmètre restant transmis

**Mise à jour : 9 novembre 2026 — version 2.160.**

La recette qui reste après le PASS 29/29 du §128 se limite aux scénarios avancés du §129. Elle doit être exécutée comme quatre résultats indépendants :
- `LOT1-OTP-SIM` : inscription et demande OTP simulées, code invalide/expiré, renvoi, erreurs visibles ; réseau Supabase Auth intercepté localement.
- `LOT1-GOOGLE-SIM` : clic réel sur le bouton de connexion Google dans le navigateur, requête authorize interceptée, paramètres `provider=google`, `prompt=select_account), callback local et refus simulé ; aucune requête ni navigation vers Google.
- `LOT1-PASSWORD-RESET-SIM` : demande de récupération interceptée, confirmation UI, callback de récupération avec jeton invalide/expiré et retour utilisateur ; aucun e-mail ni changement de mot de passe.
- `LOT1-DEVICE-REVOKE-E2E` : deux contextes authentifiés sur le même compte fixture JOBLY-E2E, préflight de capacité, révocation de la seule session B créée par le run, HTTP 401 sur B et HTTP 200 sur A ; les appareils préexistants restent inchangés.

**Préflight bloquant du scénario multi-appareils :** la référence Supabase doit être exactement `ofqqrryamslxoqkklraw`. Avant de créer les deux sessions, vérifier qu'il existe au moins deux places libres sous la limite de trois appareils actifs (donc au plus un appareil actif préexistant). Si cette condition n'est pas remplie, ou si une session ne peut pas être attribuée sans ambiguïté au run courant, produire `BLOCKED` sans DELETE ni révocation.

**Interprétation des résultats :** les trois scénarios simulés valident les interactions UI et le contrat côté client, pas la délivrabilité d'un e-mail, l'émission réelle d'un OTP ou le consentement Google. La révocation multi-appareils est le seul scénario de cette campagne qui modifie réellement des métadonnées Auth de la base JOBLY-E2E. Pour déclarer LOT-01 global entièrement vert au sens strict fournisseur, une recette complémentaire avec fournisseur/messagerie/OAuth de test contrôlés ou une décision formelle acceptant les simulations comme critère est nécessaire.

**Harnais :** au moment de cette mise à jour, aucun runner dédié Auth avancée n'est présent dans le dépôt. Aucune commande d'exécution ne doit être inventée ni remplacée par le runner général déjà PASS 29/29. Livrable préalable : script Playwright dédié, mocks réseau vérifiés, préflight multi-appareils, tests du harnais, typecheck/build et rapport JSON expurgé. Pas de merge `main), pas de déploiement et aucun accès à JOBLY-PROD.


---

## 132. Transmission du feedback opérateur Auth avancée via Notepad

**Mise à jour : 9 novembre 2026 — version 2.161.**

Après exécution de la campagne LOT-01 Auth avancée, la commande opérateur ci-dessous rassemble dans un seul fichier les rapports `.json`, journaux `.log` et feedbacks `.txt` écrits dans `artifacts/e2e` pendant les six dernières heures, sans présumer du nom de chaque rapport. Elle exclut le fichier de synthèse lui-même, masque les valeurs usuelles de secrets/tokens, puis ouvre le fichier dans Notepad.

Commande CMD à exécuter depuis Windows :

```cmd
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3 && powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir='artifacts\e2e'; $out=Join-Path $dir 'feedback-lot1-auth-avancee.txt'; if(!(Test-Path -LiteralPath $dir)){Write-Host 'Dossier artifacts\e2e introuvable.'; exit 2}; $files=Get-ChildItem -LiteralPath $dir -File | Where-Object {$_.LastWriteTime -ge (Get-Date).AddHours(-6) -and $_.Name -ne 'feedback-lot1-auth-avancee.txt' -and $_.Extension -in '.json','.log','.txt'} | Sort-Object LastWriteTime; $sb=New-Object System.Text.StringBuilder; [void]$sb.AppendLine('JOBLY — FEEDBACK LOT-01 AUTH AVANCÉE'); [void]$sb.AppendLine(('Généré le : '+(Get-Date -Format o))); [void]$sb.AppendLine(('Fichiers trouvés : '+$files.Count)); foreach($f in $files){[void]$sb.AppendLine('');[void]$sb.AppendLine(('===== '+$f.Name+' | '+$f.LastWriteTime.ToString('o')+' =====')); $raw=[IO.File]::ReadAllText($f.FullName); $raw=[regex]::Replace($raw,'(?i)(authorization\s*[:=]\s*bearer\s+)[A-Za-z0-9._~+/-]+=*','$1[MASQUÉ]'); $raw=[regex]::Replace($raw,'(?i)(password|access_token|refresh_token|api[_-]?key|apikey|service[_-]?role[_-]?key|secret)\s*[:=]\s*[^,\r\n]+','$1=[MASQUÉ]'); $raw=[regex]::Replace($raw,'sb_secret_[A-Za-z0-9_-]+','[SECRET_MASQUÉE]'); $raw=[regex]::Replace($raw,'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[JWT_MASQUÉ]'); [void]$sb.AppendLine($raw)}; if($files.Count -eq 0){[void]$sb.AppendLine('Aucun rapport JSON, LOG ou TXT récent trouvé dans artifacts\e2e. Vérifier le dossier de sortie de la recette.')}; [IO.File]::WriteAllText((Join-Path (Get-Location) $out),$sb.ToString(),(New-Object System.Text.UTF8Encoding($true))); Start-Process notepad.exe -ArgumentList (Join-Path (Get-Location) $out); Write-Host ('Feedback ouvert : '+(Join-Path (Get-Location) $out))"
```

Fichier produit : `C:\Users\ASUS\Jobly-e2e-recette-v3\artifacts\e2e\feedback-lot1-auth-avancee.txt`.

Après vérification dans Notepad, transmettre ce fichier ou copier son contenu dans le retour de recette. Ne jamais envoyer `.env`, `.e2e-fixtures.json`, clés privées, mots de passe ou jetons. La synthèse de feedback ne constitue pas à elle seule un PASS : les rapports source restent les preuves de référence.


---

## 133. Analyse du feedback transmis — LOT-01 Auth avancée non démontrée

**Mise à jour : 9 novembre 2026 — version 2.163.** Feedback opérateur reçu dans `Texte collé(9).txt`, généré le `2026-11-09T08:30:16.7901340+01:00`.

### 133.1 Contenu et chronologie

Le fichier de feedback agrège sept fichiers du dossier `artifacts/e2e`. Il contient :
- un ancien rapport de retest navigateur, dont le run du `2026-11-09T01:25:12Z` était FAIL 12/29 (12 PASS, 17 FAIL) ;
- les journaux de contrôles statiques et TypeScript du run plus récent ;
- le rapport navigateur actualisé `lot1-auth-role-ui-smoke.json`, créé à `2026-11-09T06:56:26Z), qui est PASS 29/29 ;
- le diagnostic processus, le résumé runner et le journal de processus correspondants, qui confirment code de sortie 0 et rapport nouvellement généré.

L'ancien échec porte des réponses HTTP 500 sur les API propres aux rôles et refus inter-rôles, et une ancienne méthode de teardown par suppression du stockage Auth. Il précède le résultat mis à jour et ne remplace pas ce dernier. Le run actualisé confirme la déconnexion par clic du bouton visible `/settings` pour Talent, Recruteur et Partenaire, puis HTTP 401.

### 133.2 Périmètre absent du feedback reçu

Aucun des sept fichiers agrégés ne fournit de résultat nommé ou structuré pour :
- OTP e-mail simulé ;
- Google OAuth simulé ;
- récupération du mot de passe simulée ;
- révocation multi-appareils avec deux contextes et vérification 401/200.

Le fichier transmis est donc une restitution du smoke standard de rôles, pas le feedback d'exécution des quatre scénarios Auth avancée du §131. Ne pas interpréter la présence des tests unitaires Auth (29/29) comme une exécution runtime de ces scénarios.

### 133.3 Statut

- Porte UI authentifiée standard : PASS 29/29 (§128).
- TypeScript, tests de régression Auth et build rattachés au run précédent : PASS (§128.3).
- Campagne Auth avancée OTP/Google/récupération/multi-appareils : NOT RUN / NON PROUVÉE par le fichier reçu.
- LOT-01 global : PARTIAL / NON CLOS.

### 133.4 Suite opérateur

Conserver le rapport ancien FAIL en historique, sans l'additionner au résultat PASS récent. La prochaine preuve attendue est un rapport dédié à la campagne Auth avancée, avec un bloc et un statut distincts pour chacun des quatre scénarios. Le feedback agrégé du §132 ne remplace pas ce rapport. Les garde-fous JOBLY-E2E uniquement, aucune action fournisseur externe non autorisée, aucune révocation de session préexistante, aucun merge `main` et aucun déploiement restent en vigueur.


---

## 134. Récupération du feedback Auth avancée — distinction entre rapport existant et rapport à produire

**Mise à jour : 9 novembre 2026 — version 2.164.**

Le fichier agrégé reçu le 9 novembre à 08:30 contient le smoke authentifié standard PASS 29/29, l'ancien run FAIL 12/29 et les contrôles locaux associés. Il ne contient aucun résultat d'exécution OTP, Google OAuth, récupération du mot de passe ou révocation multi-appareils.

**Conclusion :** aucun rapport Auth avancée n'existe à récupérer dans cette livraison. Il ne faut pas relancer le smoke standard ni renommer/copier un ancien JSON pour produire un faux rapport de campagne avancée.

**Procédure réelle :**
1. Ajouter au dépôt un runner dédié `e2e/auth-advanced-smoke.mjs` qui exécute les scénarios §129/§131 et écrit un rapport structuré `artifacts/e2e/lot1-auth-advanced-smoke.json`.
2. Ajouter ses tests de harnais, vérifier le typage/build et les mocks réseau avant toute exécution.
3. Pour la révocation, exiger le préflight du §129.5 et arrêter en BLOCKED si deux sessions nouvelles ne peuvent pas être créées sans toucher aux appareils préexistants.
4. Après le run, ouvrir le rapport JSON avec Notepad et le transmettre. La commande d'ouverture attendue sera `notepad C:\Users\ASUS\Jobly-e2e-recette-v3\artifacts\e2e\lot1-auth-advanced-smoke.json`.

Aucune commande d'ouverture du rapport avancé ne doit être exécutée avant que le runner ait généré ce fichier. JOBLY-E2E uniquement ; aucun fournisseur externe, aucun JOBLY-PROD, aucun merge `main`, aucun déploiement.


---

## 135. Implémentation du runner Auth avancée LOT-01

**Mise à jour : 9 novembre 2026 — version 2.165.**

Le code exécutable est ajouté sur la branche `e2e/recette` :
- `e2e/auth-advanced-browser-smoke.mjs` : OTP, Google OAuth et récupération interceptés côté navigateur ; scénario multi-appareils avec deux contextes Playwright sur la fixture Talent JOBLY-E2E ;
- `e2e/run-authenticated-role-recipe.mjs --auth-advanced-only` : réutilise le préflight du worktree, l'environnement E2E vérifié, le build, le serveur local et Playwright isolé ; vérifie la fraîcheur, la cible et le SHA du rapport ;
- `scripts/authentication-flow-regression.test.mjs` : contrôles du harnais, des interceptions, du préflight multi-appareils et du branchement runner.

La campagne multi-appareils lit d'abord les lignes `User` et `UserDeviceSession` avec la clé JOBLY-E2E. Elle refuse de créer A/B si plus d'un appareil actif préexistant est détecté, vérifie l'identité des sessions créées, révoque B depuis le bouton visible, contrôle HTTP 401 sur B et HTTP 200 sur A, puis révoque uniquement les lignes créées par le run. L'instantané des lignes préexistantes est comparé après nettoyage. Si la précondition ou l'identification échoue, le scénario est BLOCKED sans révocation d'une session antérieure.

Commande opérateur CMD depuis le worktree isolé :

```cmd
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
if errorlevel 1 exit /b 1
git fetch origin
if errorlevel 1 exit /b 1
git checkout --detach origin/e2e/recette
if errorlevel 1 exit /b 1
pnpm test:auth
if errorlevel 1 exit /b 1
pnpm exec tsc --noEmit --incremental false
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly --auth-advanced-only
notepad artifacts\e2e\lot1-auth-advanced-smoke.json
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\auth-advanced-smoke-diagnostic.json
notepad artifacts\e2e\auth-advanced-process.log
pause
```

Le runner utilise le serveur Next local sur `127.0.0.1:3217`, le manifeste de fixtures existant en lecture et la configuration privée vérifiée vers `ofqqrryamslxoqkklraw`. Il n'envoie aucun OTP/e-mail/SMS, ne redirige pas vers Google, ne modifie aucun mot de passe ni donnée métier. La seule mutation distante prévue est la création/révocation/nettoyage des métadonnées des deux sessions qui appartiennent au run dans JOBLY-E2E.

Le rapport `artifacts/e2e/lot1-auth-advanced-smoke.json` est la preuve primaire. Le résumé du runner ne déclare PASS que si les quatre scénarios sont PASS, le rapport est frais et correspond au SHA, les erreurs navigateur sont absentes et les lignes préexistantes restent inchangées.

Aucune exécution runtime de ce nouveau runner n'a encore eu lieu au moment de l'ajout. Aucun résultat PASS n'est pré-attribué. LOT-01 reste PARTIAL jusqu'à réception du rapport. Aucun accès JOBLY-PROD, aucun merge `main`, aucun déploiement.


---

## 136. Runner Auth avancée — branchement du mode et prévalidation CI

**Mise à jour : 9 novembre 2026 — version 2.166.**

Le commit `23541bdf216fe6f9268b5676236e92d992ed998f` corrige l'acceptation du mode `--auth-advanced-only` par le runner principal. Vérifications GitHub du commit :
- Le mode est présent dans la liste des modes autorisés.
- Les quatre scénarios et le rapport dédié sont bien présents dans `e2e/auth-advanced-browser-smoke.mjs).
- Le runner principal contient le branchement Auth avancée, la validation du rapport fraîchement généré et l'impression du chemin du rapport.
- Le test statique ajouté est présent dans `scripts/authentication-flow-regression.test.mjs).

Workflow GitHub Actions `Jobly CI — Typecheck & Build`, run `42582188620` :
- tests de régression Auth : SUCCESS ;
- TypeScript : SUCCESS ;
- build de production : IN_PROGRESS à l'instant de la mise à jour ;
- le smoke HTTP LOT-00 n'a pas encore commencé.

Aucun scénario Auth avancé n'a encore été exécuté sur le poste opérateur ; aucun PASS runtime n'est attribué. Après fin du build CI, lancer la commande §135 depuis le worktree isolé pour produire le rapport et ouvrir les quatre résultats dans Notepad. JOBLY-E2E uniquement, aucune action fournisseur réelle, aucun JOBLY-PROD, aucun merge `main), aucun déploiement.


---

## 137. Vérification CI Auth avancée — build non validé, échec infrastructure Deno

**Mise à jour : 9 novembre 2026 — version 2.168.**

### Run le plus récent sur la tête de branche

- Workflow : `Jobly CI — Typecheck & Build`
- Run : `42582524345`
- Commit testé : `2efc9f111c056b05ec499e5768188f35bf8be0ef`
- Conclusion GitHub : **FAILURE**
- Job concerné : `Typecheck and production build`

L'étape fautive est `Setup Deno` (`denoland/setup-deno@v2`). Son téléchargement de Deno 2.9.8 depuis GitHub Releases a reçu HTTP 504 à deux reprises, puis le step a échoué. Le log contient `Unexpected HTTP response: 504` à 07:57:29Z puis 07:57:42Z, échec final à 07:57:59Z.

### Ce qui a été validé ou non dans ce run

- Installation/dépendances et tests préalables : SUCCESS.
- Régression Auth et sélection du compte Google : SUCCESS.
- `Setup Deno` : FAILURE HTTP 504 sur le téléchargement.
- Tests Mission Afrique dépendant de Deno, Prisma, tests device-session, TypeScript, build production et smoke HTTP LOT-00 : SKIPPED après l'échec de Setup Deno.

Un run précédent `42582188620` sur le commit de code `23541bdf216fe6f9268b5676236e92d992ed998f` avait réussi les tests Auth et TypeScript, mais son étape Build avait été CANCELLED ; le smoke HTTP avait été SKIPPED. Un run intermédiaire `42582446902` a également été CANCELLED. **Aucun run consulté ne prouve encore un build de production PASS du runner Auth avancée.**

### Décision opératoire

L'échec récent est localisé à l'installation externe de Deno, avant TypeScript et Build ; le log ne signale pas une erreur de compilation du runner Auth avancée. Ne pas présenter la CI comme verte. La prochaine action utile est de relancer uniquement le job échoué quand le service de téléchargement Deno est disponible, puis confirmer TypeScript, Build production et smoke LOT-00. Aucun lancement runtime Auth avancée n'est certifié par ce statut CI.

Aucun merge `main), aucun déploiement et aucun accès JOBLY-PROD.


---

## 138. Première exécution runtime Auth avancée — diagnostic du 9 novembre

**Rapport primaire :** `artifacts/e2e/lot1-auth-advanced-smoke.json`  
**Résumé runner :** `artifacts/e2e/authenticated-role-runner-summary.json`  
**Diagnostic processus :** `artifacts/e2e/auth-advanced-smoke-diagnostic.json` et `artifacts/e2e/auth-advanced-process.log`  
**Commit du code exécuté :** `2efc9f111c056b05ec499e5768188f35bf8be0ef`  
**Exécution navigateur :** 9 novembre 2026, 08:08:08Z–08:08:40Z — JOBLY-E2E / `ofqqrryamslxoqkklraw` / serveur loopback `127.0.0.1:3217`.

### 138.1 Verdict observé

Le runner a produit ses rapports, avec `processExitCode=1`, `build=PASS`, `localServer=PASS` et `authAdvancedSmoke=FAIL`. Ce PASS build/serveur n'est pas un PASS de la campagne Auth.

| Scénario | Résultat du rapport | Observations |
|---|---|---|
| OTP email simulé | **FAIL — 3/4 contrôles PASS** | `otp=2`, `verify=1`. Demande, code invalide et renvoi validés. Seul `OTP_NO_EXTERNAL_PROVIDER` échoue. |
| Google OAuth simulé | **FAIL — 0 contrôle validé** | Une requête `/auth/v1/authorize` interceptée, avec `provider=google`, `prompt=select_account`, méthode GET ; attente Playwright terminée en `TimeoutError`. |
| Récupération mot de passe simulée | **FAIL — 2/3 contrôles PASS** | `recover=1`, `verify=1`. Demande, confirmation et callback invalide passent. Seul `RECOVERY_NO_EXTERNAL_PROVIDER` échoue. |
| Révocation multi-appareils | **BLOCKED** | Préflight en lecture seule : 3 appareils actifs préexistants ; deux emplacements libres non garantis. Aucune session de test créée, aucun bouton de révocation cliqué. |

Le rapport confirme également : `pageErrors=0`, `unexpectedSupabaseRequests=[]`, `credentialsPrinted=false`, `tokensPrinted=false`, `externalActions=false`, `remoteBusinessDataMayBeModified=false`, `remoteAuthDeviceStateMayBeModified=false` et `preexistingDeviceRowsUnchanged=true`.

### 138.2 Causes identifiées dans le code du runner

- **OTP et récupération :** l'ancienne assertion traitait toute origine bloquée dont le nom contenait `google` ou `gmail` comme un appel fournisseur. Or le garde-réseau intercepte et bloque toutes les origines externes ; une origine de ressource statique suffit donc à faire échouer ce contrôle, même quand les appels Auth utiles (`/otp`, `/verify`, `/recover`) sont simulés et qu'aucun endpoint Supabase inattendu n'est observé. L'ancien rapport ne conservait pas le détail des origines bloquées, donc il ne permet pas d'identifier avec certitude l'hôte responsable.
- **Google :** le runner renvoyait HTTP 400 JSON sur `/auth/v1/authorize`, qui est une navigation de document lancée par `signInWithOAuth`. Il attendait ensuite une alerte HTML dans la page ; cette attente est incompatible avec le chargement de la réponse JSON de navigation et provoquait le timeout. Ce résultat ne démontre pas un défaut du bouton Google ni du paramètre `prompt`.
- **Multi-appareils :** le blocage est intentionnel et correct. Le préflight a trouvé 3 appareils actifs ; il a arrêté le scénario avant toute création de session. Ne pas supprimer ni révoquer une session préexistante pour rendre ce test artificiellement vert.

---

## 139. Correctif du harnais Auth avancée — simulation Google et diagnostics réseau

**Mise à jour : 9 novembre 2026 — version 2.169.**  
**Périmètre :** branche `e2e/recette` uniquement ; aucun changement métier Auth, aucune migration, aucune modification Supabase.

### 139.1 Modifications apportées

1. Le garde-réseau conserve maintenant, dans le rapport primaire, les requêtes hors origine bloquées avec seulement l'origine, le chemin, la méthode, le type de ressource et l'indicateur de navigation. Aucun query string, en-tête, jeton ou secret n'est conservé.
2. Les critères OTP et récupération vérifient désormais l'absence d'endpoint Supabase non prévu. Ils ne confondent plus les ressources externes bloquées avec un envoi d'e-mail. Toutes les origines externes restent bloquées par le garde-réseau.
3. Google OAuth est testé comme un parcours de redirection : l'appel UI réel génère `/auth/v1/authorize`, le runner simule une réponse HTTP 302 vers une URL Google synthétique portant un client et un callback `.invalid`, puis le garde-réseau bloque la navigation vers `accounts.google.com` avant tout accès réseau. Les assertions portent sur `provider=google`, `prompt=select_account`, HTTP 302 et l'événement de navigation vers `accounts.google.com` effectivement intercepté/avorté par le garde-réseau. Le test ne dépend pas de l'URL finale d'un onglet après une navigation volontairement bloquée. Aucun vrai compte Google, secret client ou fournisseur externe n'est utilisé.
4. Les tests statiques verrouillent les nouvelles assertions et interdisent le retour de l'ancien contrôle trop large sur les origines `google/gmail`.

### 139.2 Commits Git vérifiables

- Runner et diagnostics réseau : [`4b040cdd`](https://github.com/kenzimayaka-glitch/Jobly/commit/4b040cdd0f370ac58681ade7ee4c7381cc05c486).
- Assertions de régression : [`71fec66f`](https://github.com/kenzimayaka-glitch/Jobly/commit/71fec66fb5e08f5dd1911a7938279509437dc666).
- Assertion du statut 302 et preuve dans le rapport : [`1a7023a1`](https://github.com/kenzimayaka-glitch/Jobly/commit/1a7023a14b70427a7bab010a39181c4d161e8272).
- Contrôle statique du statut 302 : [`9e9d91a8`](https://github.com/kenzimayaka-glitch/Jobly/commit/9e9d91a8e0d84e853497305be4e9baf82e36730f).
- Vérification du blocage sur l'événement réseau réel, sans assertion fragile sur l'URL finale de l'onglet : [`8c233faf`](https://github.com/kenzimayaka-glitch/Jobly/commit/8c233faf4d03d26ec87abea6f899d1af51322bd6).

### 139.3 Limites et prochaine preuve requise

Le correctif est commité et son contenu distant a été relu. **Aucun nouveau lancement runtime n'a encore validé les trois simulations** ; aucun PASS n'est attribué à cette mise à jour. Le scénario multi-appareils reste conditionnel au préflight d'au plus un appareil actif préexistant. Tant que les 3 appareils actifs de la fixture ne changent pas naturellement ou qu'une fixture isolée autorisée n'existe pas, le statut de ce scénario doit rester BLOCKED.

Relance ciblée depuis le worktree isolé, après récupération du dernier commit de `origin/e2e/recette` :

```cmd
cd /d C:\Users\ASUS\Jobly-e2e-recette-v3
git fetch origin
if errorlevel 1 exit /b 1
git checkout --detach origin/e2e/recette
if errorlevel 1 exit /b 1
pnpm test:auth
if errorlevel 1 exit /b 1
pnpm exec tsc --noEmit --incremental false
if errorlevel 1 exit /b 1
node e2e\run-authenticated-role-recipe.mjs C:\Users\ASUS\Jobly --auth-advanced-only
notepad artifacts\e2e\lot1-auth-advanced-smoke.json
notepad artifacts\e2e\authenticated-role-runner-summary.json
notepad artifacts\e2e\auth-advanced-smoke-diagnostic.json
notepad artifacts\e2e\auth-advanced-process.log
pause
```

Après cette correction, les critères de clôture restent : OTP PASS, Google OAuth PASS, récupération PASS, préservation des sessions préexistantes démontrée ; multi-appareils soit PASS depuis une fixture conforme, soit BLOCKED explicitement accepté comme limite de test. LOT-01 reste PARTIAL jusque-là. `main` demeure inchangé ; aucun merge, aucun déploiement, aucun accès JOBLY-PROD.

---

## 140. Reprise corrigée LOT-01 — retest Auth avancée et recette opérateur

**Mise à jour : 9 novembre 2026 — version 2.171.** Cette entrée remplace comme point de reprise les anciennes commandes opérateur des sections 24, 129–137 et les références périmées au browser-only §112.6. Les sections historiques restent conservées pour la traçabilité. Le présent fichier Markdown sur docs/e2e/CONTINUITE-RECETTE-E2E.md, branche e2e/recette, est la référence de continuité ; la copie DOCX V2.5 de la Bibliothèque n'est plus la référence active.

### 140.1 État de vérité au moment de la consolidation

- LOT-00 : PASS / clôturé (§§93.15–93.19).
- LOT-01 Auth de base : 12/12 PASS ; API authentifiée par rôle : 40/40 PASS avec nettoyage confirmé ; UI publique : 14/14 PASS ; UI authentifiée avec clic de déconnexion : 29/29 PASS (§§96–128).
- Première campagne Auth avancée : rapport runtime du 9 novembre à 08:08:08Z–08:08:40Z, commit testé 2efc9f111c056b05ec499e5768188f35bf8be0ef. OTP 3/4, Google en timeout, récupération 2/3, multi-appareils BLOCKED sur trois appareils actifs préexistants. Aucune session existante n'a été révoquée et aucun compte/état métier n'a été modifié (§138).
- Le harnais est corrigé et les changements sont présents sur e2e/recette (§139) : diagnostics réseau expurgés, assertions OTP/récupération centrées sur les endpoints Supabase inattendus, simulation Google par HTTP 302 et interception réelle de la navigation sortante. Commits : 4b040cdd0f370ac58681ade7ee4c7381cc05c486, 71fec66fb5e08f5dd1911a7938279509437dc666, 1a7023a14b70427a7bab010a39181c4d161e8272, 9e9d91a8e0d84e853497305be4e9baf82e36730f, 8c233faf4d03d26ec87abea6f899d1af51322bd6.
- Non prouvé : aucun retest runtime des scénarios avancés après ces commits. Le run CI 42582524345 a échoué au step Setup Deno après HTTP 504 de téléchargement ; il ne prouve ni un défaut de compilation ni un build réussi du dernier commit. Un build antérieur PASS ne remplace pas le build du SHA courant.
- Verdict LOT-01 : PARTIAL / NON CLOS. Aucun PASS global n'est attribué à cette mise à jour.

### 140.2 Script opérateur livré avec cette mise à jour

Artefact transmis séparément : Jobly-LOT-01-Auth-Avancee.cmd.

Paramètres par défaut :
- dépôt source conservé : %USERPROFILE%\Jobly ;
- worktree de recette isolé : %USERPROFILE%\Jobly-e2e-recette-lot01 ;
- branche distante vérifiée : origin/e2e/recette ;
- projet distant autorisé : JOBLY-E2E / ofqqrryamslxoqkklraw.

Le CMD vérifie le dépôt source, le manifeste de fixtures existant, la présence d'un fichier d'environnement local sans lire son contenu à l'écran, le dépôt distant du worktree, son état Git propre et l'égalité du SHA avec origin/e2e/recette. Il s'arrête en cas de divergence ou si le worktree contient des changements. Il ne supprime pas le worktree et n'exécute ni git clean, ni git reset --hard, ni provisionneur, ni script de reset de mot de passe.

Séquence automatisée :
1. git fetch origin, création/réutilisation contrôlée du worktree détaché ;
2. pnpm install --frozen-lockfile uniquement si Next.js n'est pas installé dans ce worktree ;
3. pnpm test:auth ;
4. pnpm exec tsc --noEmit --incremental false ;
5. node e2e\run-authenticated-role-recipe.mjs "%USERPROFILE%\Jobly" --auth-advanced-only.

Le mode ciblé exécute son propre pnpm build, démarre un serveur Next local sur 127.0.0.1:3217, lance e2e/auth-advanced-browser-smoke.mjs, vérifie que le rapport est frais et rattaché au SHA et au projet attendus, puis retourne un code non nul si la campagne n'est pas PASS. Il ne relance pas les 40 API, les 14 contrôles UI publics ni les 29 contrôles UI authentifiés déjà PASS. Le runner global scripts/e2e-local-recipe.mjs est interdit pour cette reprise : ses gates LOT-01 ne peuvent pas promouvoir correctement le lot en PASS et ses préconditions peuvent entraîner des opérations inutiles sur les fixtures (§0.2).

### 140.3 Rapports et restitution

Répertoire de sortie : %USERPROFILE%\Jobly-e2e-recette-lot01\artifacts\e2e\.

Rapport primaire : lot1-auth-advanced-smoke.json. Rapports complémentaires : authenticated-role-runner-summary.json, auth-advanced-smoke-diagnostic.json, auth-advanced-process.log, lot1-auth-advanced-runner-console.log, lot1-auth-regression.log, lot1-typecheck.log, lot1-preflight.txt.

Le CMD ouvre les journaux et JSON présents dans Notepad. Après exécution, transmettre le rapport primaire et la synthèse, ou leur contenu expurgé. Ne jamais transmettre .env*, .e2e-fixtures.json, clé privée, mot de passe, cookie, header Authorization ou token. Le SHA testé, les timestamps, le projet, l'URL, le nombre de contrôles et les statuts doivent rester visibles.

### 140.4 Conditions de clôture définitive

- OTP simulé : PASS runtime frais, avec demande, code invalide et renvoi vérifiés ; aucun endpoint Supabase inattendu.
- Google simulé : PASS runtime frais, avec clic réel du bouton, provider=google, prompt=select_account, réponse 302 simulée et navigation Google interceptée avant sortie réseau.
- Récupération simulée : PASS runtime frais, avec demande, confirmation et callback invalide/expiré ; aucun e-mail ni changement de mot de passe réel.
- Multi-appareils : PASS uniquement sur une fixture dédiée autorisée dont le préflight permet deux sessions neuves (au plus un appareil actif préexistant), avec révocation de la seule session B créée par le run, HTTP 401 sur B, HTTP 200 sur A et preuve que les appareils préexistants restent inchangés. Avec les trois appareils actuellement constatés, le résultat attendu reste BLOCKED.
- Si la fixture dédiée n'est pas disponible, le lot ne sera intégralement vert qu'après une décision de périmètre écrite et explicite excluant cette vérification de la clôture. Aucune exclusion n'est présumée.
- TypeScript et build : PASS sur le SHA réellement testé. Les simulations locales ne prouvent pas la délivrabilité d'e-mails, l'émission d'OTP fournisseur ni un consentement Google réel.

### 140.5 Protections et historique local

Le dernier état de poste Windows rapporté dans l'ancienne continuité était un dépôt local avec des modifications et fichiers non suivis, notamment e2e/reset-existing-fixture-passwords.mjs modifié et plusieurs rapports feedback-e2e-*.txt. Ce n'est pas une inspection en direct du poste au 9 novembre. Le patch ancien jobly-e2e-fixture-readonly.patch n'avait pas été appliqué, son fichier étant introuvable selon le retour opérateur. Ne pas le recréer ni l'appliquer à l'aveugle : la reprise actuelle utilise le nouveau worktree dédié et laisse le dépôt source intact. Ne pas nettoyer ni écraser les éléments locaux signalés.

Périmètre inchangé : aucune lecture/écriture JOBLY-PROD, aucune mutation de fixture partagée, aucune fusion vers main, aucun déploiement. main reste au SHA consigné au début du document.

### 140.6 Journal de mise à jour

| Version / date | Événement | Sections | Preuve |
|---|---|---|---|
| V2.171 — 9 nov. 2026 | Réconciliation de l'état courant, corrections du harnais, nouveau point de reprise ciblé et transmission du CMD isolé. Aucun nouveau test runtime avancé exécuté pendant cette mise à jour. | En-tête, §0.4, §140 | Contenu GitHub relu sur e2e/recette ; commits §139 ; CMD statiquement contrôlé pour tous les labels goto. |

---

## 141. Retest LOT-01 du 9 novembre — Auth 30/30, sonde authentifiée interrompue avant HTTP

**Mise à jour : 9 novembre 2026 — version 2.172.** Cette section est le point de vérité le plus récent et prévaut sur les instructions opérateur précédentes (§§140 et addenda associés) lorsqu'elles invitent à relancer le runner avant validation de la clé.

### 141.1 Preuves effectivement reçues

- Worktree opérateur : C:\\Users\\ASUS\\Jobly-e2e-recette-lot01.
- SHA local : a8b1b8ef81e41a740e7d9045650d5c60b5567f17.
- SHA distant origin/e2e/recette : identique au SHA local.
- État Git rapporté : propre.
- Node : v26.13.0 ; pnpm : 10.28.0.
- pnpm test:auth : **30 tests PASS, 0 FAIL, 0 skipped** (durée rapportée : 409.1017 ms).
- Diagnostic réseau sans clé : DNS de ofqqrryamslxoqkklraw.supabase.co résolu par le serveur local 192.168.43.1 vers 172.64.149.246 et 104.18.38.10 ; Node fetch sur /rest/v1/ répond **HTTP 401**. Cela confirme que DNS et HTTPS/HTTP répondent. Le 401 est normal sans apikey et ne prouve pas la validité de la clé privée.

### 141.2 Échec de la première sonde de clé — erreur de l'utilitaire, pas de Supabase

Le journal transmis pour Jobly-LOT-01-Supabase-Key-Probe.cmd contient MODULE_NOT_FOUND: Cannot find module '@next/env', avec require stack pointant vers node_modules/next/package.json. L'outil s'est interrompu pendant le chargement de la configuration et **avant toute requête HTTP authentifiée**. Il ne s'agit donc ni d'un HTTP 401/403 du endpoint, ni d'une preuve de clé invalide, ni d'une preuve d'indisponibilité Supabase.

La sonde réseau et la sonde de clé doivent rester séparées dans les preuves : le test sans clé est PASS réseau ; la validation de clé est encore NON PROUVÉE.

### 141.3 Rapport du runner de 10:24Z

Le JSON utilisateur horodaté 2026-11-09T10:24:48.240Z indique :
- status=BLOCKED, build=NOT_RUN, localServer=NOT_RUN, authAdvancedSmoke=NOT_RUN ;
- serverKeyVerifiedForE2E=false, serverKeyProbeStatus=null ;
- raison : The operation was aborted due to timeout ;
- aucune mutation de données métier ou d'appareils distante signalée, aucun secret imprimé.

Comme le rapport n'a reçu aucun statut HTTP, le timeout a interrompu la requête avant confirmation de la clé. Aucun build local, serveur local ou test navigateur n'a été exécuté lors de cette tentative.

Le fichier de processus que l'opérateur a joint dans le même message contient encore l'ancienne trace Playwright page.waitForEvent(requestfailed), datée de l'exécution antérieure autour de 08:51Z. Elle ne correspond pas au rapport 10:24Z : ce dernier s'est arrêté avant le build et avant le lancement Playwright. Ne pas attribuer cet ancien timeout Google au code courant ni le prendre pour le résultat du dernier run.

### 141.4 Outil de sonde V2 fourni en code inline — statut non encore exécuté

Pour contourner @next/env, une nouvelle commande CMD autonome a été fournie directement dans la conversation sous le nom Jobly-LOT-01-Supabase-Key-Probe-v2.cmd. Elle lit les paramètres des fichiers .env localement sans afficher les valeurs, vérifie le périmètre JOBLY-E2E et envoie un GET en lecture seule à https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/ avec la clé serveur. Elle doit rendre uniquement le type de clé, le contrôle de périmètre, le statut HTTP ou le code d'erreur réseau.

**Cette V2 n'a pas encore de preuve d'exécution opérateur.** Ne pas écrire qu'elle est validée ou que la clé serveur est acceptée avant un résultat HTTP obtenu sur le poste. Ne pas transmettre .env.local, .env.e2e.local, .e2e-fixtures.json, clé, mot de passe, token ou en-tête Authorization.

### 141.5 Prochaine action opérateur et décision

1. Exécuter la commande V2 copiée depuis le message conversationnel, enregistrée sous %USERPROFILE%\\Downloads\\Jobly-LOT-01-Supabase-Key-Probe-v2.cmd.
2. Lire %TEMP%\\jobly-lot01-supabase-key-probe-v2.txt. Les seules valeurs utiles sont KEY_TYPE, KEY_SCOPE, HTTP_STATUS ou FETCH_ERROR. Ne pas coller de secret.
3. Si HTTP 200 est obtenu, la sonde serveur en lecture seule est validée ; reprendre alors le runner ciblé --auth-advanced-only sur le SHA exact.
4. Si un HTTP 401/403 est reçu, vérifier le nom de la variable et la clé JOBLY-E2E localement, sans communiquer sa valeur ; ne pas lancer le navigateur.
5. Si timeout/DNS/TLS réapparaît, conserver le journal et résoudre la connectivité/authentification avant toute nouvelle campagne.

La commande ne doit modifier aucune donnée : GET uniquement. Ne pas exécuter scripts/e2e-local-recipe.mjs, aucun script de reset/provisionnement, aucune migration, aucune révocation de session préexistante.

### 141.6 Statut officiel LOT-01

- Régression Auth : **PASS 30/30**.
- TypeScript et build sur ce run : **NON EXÉCUTÉS / NON PROUVÉS**.
- Clé serveur JOBLY-E2E : **NON PROUVÉE** par la sonde authentifiée.
- OTP, Google, récupération et multi-appareils : **aucune nouvelle preuve runtime après le correctif du harnais**.
- Ancien contexte multi-appareils : trois appareils actifs préexistants ; ne jamais les supprimer ou révoquer pour forcer la recette.
- **LOT-01 : PARTIAL / NON CLOS**.

Périmètre de protection inchangé : JOBLY-E2E uniquement ; aucune lecture ni écriture JOBLY-PROD, aucun merge sur main, aucun déploiement, aucun reset de compte, aucune mutation de fixture partagée.

---

## 142. Sonde de clé JOBLY-E2E validée — reprise du runner Auth avancée

**Mise à jour : 9 novembre 2026 — version 2.173.** Cette section supersède §141.4–141.5 pour la validation du préflight authentifié. Elle ne modifie pas les critères de clôture §141.6.

### 142.1 Preuve reçue de l'opérateur

Journal de `Jobly-LOT-01-Supabase-Key-Probe-v2.cmd`, exécuté le 9 novembre 2026 à 11:39:06 locale :
- source : `C:\\Users\\ASUS\\Jobly` ; fichier chargé : `.env.local` ;
- endpoint : `https://ofqqrryamslxoqkklraw.supabase.co/rest/v1/` ;
- URL_SCOPE : `JOBLY_E2E` ;
- KEY_TYPE : `sb_secret` ;
- KEY_SCOPE : `SB_SECRET_PREFIX_PRESENT` ;
- résultat PostgREST : **HTTP 200** ;
- code de sortie : **0** ;
- aucun secret n'a été affiché.

Interprétation : la sonde authentifiée en lecture seule a reçu une réponse HTTP 200 du projet JOBLY-E2E. Le endpoint et la clé configurée dans `.env.local` fonctionnent pour cette requête. La précédente erreur `@next/env` était un défaut de la première sonde et est dépassée. Le timeout du runner à 10:24Z n'est pas reproduit par cette sonde ; un nouvel essai du runner est maintenant justifié.

### 142.2 Synchronisation nécessaire avant le runner

Depuis le précédent SHA de code `a8b1b8ef81e41a740e7d9045650d5c60b5567f17`, la branche `e2e/recette` a reçu des commits documentaires de continuité. Le worktree opérateur doit donc être propre, faire `git fetch origin`, puis se placer sur `origin/e2e/recette` afin que le garde SHA du runner passe. Ne pas utiliser `reset`, `clean`, suppression du worktree ou copie manuelle de `.env`/fixtures.

Commande CMD opérateur, après vérification que le worktree est propre :

```cmd
cd /d "%USERPROFILE%\\Jobly-e2e-recette-lot01"
git status --short
git fetch origin
if errorlevel 1 exit /b 1
git checkout --detach origin/e2e/recette
if errorlevel 1 exit /b 1
git rev-parse HEAD
git rev-parse origin/e2e/recette
git status --short
pnpm test:auth
if errorlevel 1 exit /b 1
pnpm exec tsc --noEmit --incremental false
if errorlevel 1 exit /b 1
node e2e\\run-authenticated-role-recipe.mjs "%USERPROFILE%\\Jobly" --auth-advanced-only
notepad artifacts\\e2e\\lot1-auth-advanced-smoke.json
notepad artifacts\\e2e\\authenticated-role-runner-summary.json
notepad artifacts\\e2e\\auth-advanced-smoke-diagnostic.json
notepad artifacts\\e2e\\auth-advanced-process.log
pause
```

**Garde avant `git checkout` :** si `git status --short` affiche le moindre changement, interrompre la séquence et transmettre le résultat ; ne pas écraser ces changements. Les deux SHA après checkout doivent être identiques et `git status --short` doit être vide.

### 142.3 Attendus et limites

- La sonde `sb_secret` HTTP 200 valide seulement le preflight de clé en lecture seule ; elle ne vaut pas PASS du build ni des scénarios navigateur.
- Le runner `--auth-advanced-only` effectue son propre build puis démarre le serveur local et les tests OTP, Google, récupération, multi-appareils.
- OTP, Google et récupération doivent obtenir PASS runtime frais ; toutes les requêtes externes restent simulées/bloquées.
- Multi-appareils reste soumis à son préflight : avec plus d'un appareil préexistant actif, le résultat demeure BLOCKED sans créer de session ni révoquer une session existante.
- Les 30/30 tests Auth déjà communiqués sont une preuve du SHA `a8b1b8e...` ; la séquence prescrite les rejoue sur la tête courante pour rattacher la preuve au SHA exact.

Statut officiel inchangé jusqu'au nouveau rapport : **LOT-01 PARTIAL / NON CLOS**. Aucun accès JOBLY-PROD, aucun merge `main`, aucun déploiement, aucun reset/provisionnement, aucune mutation de fixture partagée ou session préexistante.

---

## 143. Synchronisation opérateur interrompue par concaténation de commandes CMD

**Mise à jour : 9 novembre 2026 — version 2.174.**

### 143.1 Diagnostic

L'opérateur a reçu Git : `error: unknown option 'shortpnpm'` avec l'aide de `git status`. Le binaire a donc reçu littéralement `git status --shortpnpm` : la commande suivante `pnpm` a été accolée à l'option `--short`, faute de séparation/validation entre les commandes copiées. Il ne s'agit pas d'un problème de branche ou d'état du dépôt. Aucun résultat `git status` exploitable n'a été obtenu par cette commande ; l'état courant du worktree doit être recontrôlé.

### 143.2 Reprise sûre — une commande par saisie

Dans CMD, envoyer une seule ligne, appuyer sur Entrée et attendre le retour de l'invite (`C:\\...>`) avant de coller la suivante. Ne pas coller plusieurs commandes dans le même bloc.

1. `cd /d "%USERPROFILE%\\Jobly-e2e-recette-lot01"`
2. `git status --short`

Si la deuxième commande affiche la moindre ligne, arrêter et transmettre exactement cette sortie. Ne lancer ni checkout, ni fetch, ni nettoyage tant que l'état n'est pas examiné. Si elle ne retourne aucune ligne et que l'invite revient normalement, exécuter individuellement :

3. `git fetch origin`
4. `git checkout --detach origin/e2e/recette`
5. `git rev-parse HEAD`
6. `git rev-parse origin/e2e/recette`
7. `git status --short`

Les deux SHA doivent être identiques et la dernière commande `git status --short` vide. Ensuite seulement, continuer avec `pnpm test:auth`, TypeScript et le runner ciblé. Chaque commande doit être saisie séparément ; vérifier son code de sortie ou son résultat avant la suivante.

### 143.3 Statut

Pas de nouveau test exécuté dans cet incident. La sonde clé JOBLY-E2E HTTP 200 reste valide ; le runner Auth avancée n'a pas encore été relancé. **LOT-01 : PARTIAL / NON CLOS.** Pas de changement `main`, aucun déploiement, aucune action JOBLY-PROD, aucune mutation fixture/session.

---

## 144. Retest Auth avancée — diagnostic Google et correction de l'isolation réseau

**Mise à jour : 9 novembre 2026 — version 2.175.** Cette section devient la dernière référence opératoire et complète les §§141–143.

### 144.1 Dernier rapport runtime reçu

Runner : `--auth-advanced-only`, SHA testé `102f2072e6df2f4ae1b6faed195ca0c46623777a`, projet JOBLY-E2E `ofqqrryamslxoqkklraw`, serveur local `http://127.0.0.1:3217`.

- Build : **PASS**.
- Serveur local : **PASS** (endpoint anonyme `/api/profile` répond HTTP 401 attendu).
- OTP email simulé : **PASS**, 4 contrôles ; otp=2, verify=1.
- Google OAuth simulé : **FAIL**, 3 contrôles consignés ; `GOOGLE_AUTHORIZE_INTERCEPTED` PASS, `GOOGLE_SELECT_ACCOUNT_PARAMETER` PASS, `GOOGLE_PROVIDER_REDIRECT_BLOCKED` FAIL. Les paramètres observés étaient provider=google, prompt=select_account, méthode GET.
- Récupération : **PASS**, 3 contrôles.
- Multi-appareils : **BLOCKED**, 3 appareils actifs préexistants, aucun des deux emplacements requis garanti ; aucune session de test créée.
- Page errors : 0 ; unexpectedSupabaseRequests : vide ; secrets/tokens non imprimés.
- Le rapport indiquait `remoteBusinessDataMayBeModified=false`, `remoteAuthDeviceStateMayBeModified=false`, `preexistingDeviceRowsUnchanged=true`.

### 144.2 Cause exacte de l'échec Google et limite de preuve de sécurité

Le code précédent simulait `/auth/v1/authorize` avec `route.fulfill({ status: 302, headers: { Location: GOOGLE_E2E_REDIRECT } })`, puis attendait de voir l'hôte accounts.google.com dans le même gestionnaire de routes. La documentation officielle Playwright précise que lorsqu'une route est satisfaite avec un statut 3xx, le navigateur suit la redirection sans donner une seconde occasion au gestionnaire de routes de l'intercepter ; Playwright recommande de servir le contenu terminal simulé ou de rediriger la requête via `route.continue`/`route.fallback` plutôt que `route.fulfill` 3xx. Référence : https://playwright.dev/docs/network#redirects.

Le rapport ne contenait que quatre requêtes bloquées vers `fonts.googleapis.com`, aucune requête `accounts.google.com`. Par conséquent, l'assertion Google échouait comme attendu. Plus important : l'absence de cette interception signifie que `externalActions=false` ne constitue pas une preuve que la navigation fournisseur a été bloquée ; une sortie réseau Google ne peut pas être exclue pour ce run. Le client_id et redirect_uri étaient synthétiques `.invalid`, mais cela ne remplace pas la preuve de blocage réseau. Cette limite est explicitement consignée ; ne pas réutiliser ce rapport comme preuve d'isolation OAuth.

### 144.3 Correctif appliqué sur e2e/recette

Deux commits ont corrigé uniquement le harnais de test et ses assertions statiques :

- `0fc97768320c2a88c6225afd1365f85bc6ec47cc` — remplace le `route.fulfill(302)` par une réponse HTML locale HTTP 200 contenant `window.location.replace(GOOGLE_E2E_REDIRECT)`. La navigation de page produite passe ainsi par le garde réseau `context.route("**/*")`, qui enregistre et abort `accounts.google.com` avant l'accès réseau. Les Service Workers sont explicitement bloqués dans le contexte afin qu'ils ne contournent pas les routes Playwright.
- `b9ff33f7bbb0e65e4a51c4298b77432a1e550c6d` — corrige la description du contrôle et verrouille statiquement le nouveau mécanisme ; les assertions interdisent le retour d'un `route.fulfill` avec status 302 ou du champ `redirectStatus`.

Fichiers modifiés : `e2e/auth-advanced-browser-smoke.mjs` et `scripts/authentication-flow-regression.test.mjs`. Aucun code métier Auth, aucune migration, aucune configuration Supabase, aucune fixture ou donnée distante modifiés. La tête de branche a été vérifiée à `b9ff33f7bbb0e65e4a51c4298b77432a1e550c6d` au moment de cette mise à jour. Aucun résultat CI ou runtime post-correctif n'est encore disponible.

### 144.4 Étape opérateur suivante

Le worktree opérateur doit être propre avant synchronisation. Exécuter les commandes dans CMD une par une, attendre le retour de l'invite après chacune ; ne pas les coller toutes ensemble (un incident précédent avait fusionné `--short` et `pnpm`). Si `git status --short` affiche le moindre changement, arrêter et transmettre la sortie, sans checkout.

Après confirmation du worktree propre : `git fetch origin`, puis `git checkout --detach origin/e2e/recette`. Vérifier `git rev-parse HEAD` = `git rev-parse origin/e2e/recette`, et `git status --short` vide. Rejouer ensuite `pnpm test:auth`, `pnpm exec tsc --noEmit --incremental false`, puis `node e2e/run-authenticated-role-recipe.mjs "%USERPROFILE%\\Jobly" --auth-advanced-only`. Le runner exécute son propre build et produit le rapport frais.

Rapport primaire à transmettre : `artifacts/e2e/lot1-auth-advanced-smoke.json`, puis `authenticated-role-runner-summary.json`, `auth-advanced-smoke-diagnostic.json` et `auth-advanced-process.log`. Le nouveau rapport Google doit comporter une requête `accounts.google.com` dans `blockedExternalRequests`, avec `isNavigationRequest=true`, et l'assertion `GOOGLE_PROVIDER_REDIRECT_BLOCKED` PASS. Vérifier également `externalActions=false`, `pageErrors=[]`, `unexpectedSupabaseRequests=[]`, credentials/tokens false.

### 144.5 Multi-appareils et statut de clôture

Le préflight précédent a trouvé trois appareils actifs préexistants. Tant que cela reste vrai, le scénario multi-appareils doit demeurer BLOCKED avant toute création de session ; ne supprimer/révoquer aucune session existante et ne modifier aucune fixture partagée. Une clôture LOT-01 complète exige soit une fixture dédiée explicitement autorisée permettant le test et son nettoyage, soit une décision écrite de périmètre acceptant l'exclusion de ce contrôle ; aucune exclusion n'est présumée.

À cette mise à jour, OTP et récupération ont une preuve PASS runtime sur le SHA `102f2072...`; Google reste FAIL sur l'ancien mécanisme ; le nouveau correctif Google n'a pas été exécuté. Le build du runner sur ce SHA était PASS. La commande combinée opérateur a continué jusqu'au runner après TypeScript, mais aucun journal TypeScript dédié n'a été fourni ; la preuve TypeScript doit donc être rattachée au nouveau SHA lors du retest. **LOT-01 : PARTIAL / NON CLOS.**

Protections inchangées : JOBLY-E2E uniquement ; aucune lecture/écriture JOBLY-PROD, aucun merge sur main, aucun déploiement, aucun reset de compte, aucune suppression de session préexistante.
---

## 145. Retest runtime Auth avancée — OTP, Google et récupération PASS ; multi-appareils BLOCKED

**Mise à jour : 9 novembre 2026 — version 2.176.** Cette section constitue la dernière preuve opérateur pour le périmètre Auth avancée et met à jour le verdict des §§140–144.

### 145.1 Identification du run

- Rapport runner : `createdAt=2026-11-09T11:08:51.100Z`.
- Exécution Auth navigateur : `2026-11-09T11:12:37.740Z` à `2026-11-09T11:12:48.588Z`.
- Commit déclaré par le rapport navigateur : `1bfcfddb95a334f23d87b306e4c63143354bc1e4`.
- Environnement : JOBLY-E2E, projectRef `ofqqrryamslxoqkklraw`.
- URL locale : `http://127.0.0.1:3217`.
- Runner : `--auth-advanced-only`.
- Statut global : **PARTIAL**, processExitCode `2` (code de sortie prévu lorsque le résultat est PARTIAL/BLOCKED, pas une erreur de démarrage).

### 145.2 Résultats confirmés

| Porte | Résultat | Détail |
|---|---|---|
| Build Next.js | **PASS** | `build=PASS` |
| Serveur local | **PASS** | prêt en 4 tentatives ; HTTP 401 attendu sur `/api/profile` anonyme |
| OTP email simulé | **PASS 4/4** | demande interceptée, code invalide visible, renvoi intercepté, aucun endpoint Supabase inattendu |
| Google OAuth simulé | **PASS 4/4** | authorize GET, `provider=google`, `prompt=select_account`, navigation externe Google interceptée avant réseau, aucun endpoint Supabase inattendu |
| Récupération simulée | **PASS 3/3** | demande interceptée, confirmation visible, callback token invalide/expiré correctement refusé |
| Multi-appareils | **BLOCKED** | trois appareils actifs préexistants ; deux places libres non garanties ; arrêt avant création de sessions |

### 145.3 Preuves de sécurité et d'absence d'effets de bord

- `pageErrors=0`.
- `blockedExternalRequests=5` : quatre demandes de feuilles de style Google Fonts bloquées et une navigation `https://accounts.google.com/o/oauth2/v2/auth` bloquée, méthode GET, resourceType `document`, `isNavigationRequest=true`.
- `unexpectedSupabaseRequests=[]`.
- `credentialsPrinted=false`, `tokensPrinted=false`.
- `externalActions=false`.
- `remoteBusinessDataMayBeModified=false`, `remoteAuthDeviceStateMayBeModified=false`, `remoteDataMayBeModified=false`.
- `preexistingDeviceRowsUnchanged=true`.
- Le scénario multi-appareils a terminé avec `cleanup=NOT_REQUIRED` ; aucune session temporaire n'a été créée, aucune session préexistante n'a été révoquée.

Le test Google est une simulation navigateur isolée : authorize est intercepté, le HTML de réponse reste local et la tentative de navigation vers Google est bloquée par la route Playwright avant accès réseau. Ce résultat ne représente pas un test de consentement Google réel ni la délivrabilité d'une authentification chez le fournisseur.

### 145.4 Interprétation du code de sortie

Le process runner a retourné `exitCode=2` avec rapport présent et frais. Le code 2 correspond au statut PARTIAL lorsque le scénario avancé n'est pas entièrement PASS, ici parce que `MULTI_DEVICE_REVOCATION` est BLOCKED. Ce n'est pas un échec du build, du serveur, d'OTP, de Google ou de récupération.

### 145.5 Seul point encore nécessaire pour clôturer LOT-01

Trois appareils actifs préexistants sont recensés dans la fixture Talent. Cette protection doit rester en place. Deux chemins seulement peuvent compléter ce contrôle :

1. Utiliser une fixture Talent distincte, explicitement autorisée pour l'E2E, avec au plus un appareil actif préexistant ; le scénario pourra créer A/B, révoquer exclusivement B, vérifier B=401 et A=200, puis confirmer que toutes les lignes préexistantes restent identiques.
2. Obtenir une décision de périmètre écrite et explicite acceptant d'exclure le scénario multi-appareils de la clôture LOT-01, avec la limite clairement documentée. Aucune exclusion n'est présumée dans cette mise à jour.

Ne pas supprimer les trois appareils existants, ne pas révoquer leurs sessions, ne pas réinitialiser le compte et ne pas modifier les fixtures partagées pour obtenir artificiellement un PASS.

### 145.6 Verdict

- Auth avancée simulée : OTP **PASS**, Google **PASS**, récupération **PASS**.
- Build et serveur local : **PASS**.
- Multi-appareils : **BLOCKED** pour raison de préservation de trois appareils actifs préexistants.
- **LOT-01 : PARTIAL / NON CLOS**, le seul point restant étant la décision/preuve multi-appareils ci-dessus.

Aucune fusion `main`, aucun déploiement, aucun accès JOBLY-PROD, aucun reset de compte ou de session.

---

## 146. Préparation autorisée d'une fixture Talent isolée pour la révocation multi-appareils

**Mise à jour : 9 novembre 2026 — version 2.177.** L'utilisateur a explicitement autorisé la préparation d'une fixture Talent E2E distincte afin de terminer le contrôle multi-appareils du LOT-01. L'autorisation est strictement limitée à JOBLY-E2E (ofqqrryamslxoqkklraw).

### 146.1 Précontrôles distants en lecture seule

- Projet Supabase vérifié : JOBLY-E2E, état ACTIVE_HEALTHY, région eu-west-1.
- Compte partagé actuel : 4 identités Auth et 4 lignes public.User (TALENT, RECRUITER, PARTNER, ADMIN).
- Sessions d'appareils préexistantes : TALENT 3 actives ; RECRUITER 3 ; PARTNER 3 ; ADMIN 0.
- Identifiants dédiés réservés vérifiés sans collision dans Auth et public.User : jobly-e2e-multidevice-talent@jobly.test, username jobly_e2e_multidevice_talent, téléphone +237600000199.
- Fonction Edge historique e2e-fixture-provision : version 4 active, mais code actuel HTTP 410 désactivé. Son ancienne source provisionnait/rafraîchissait les trois rôles partagés ; elle n'a pas été réactivée ni appelée.
- Les vérifications SQL de ce paragraphe sont uniquement des lectures. Aucun utilisateur, profil ou appareil n'a été ajouté/modifié par ces précontrôles.

### 146.2 Modifications versionnées sur e2e/recette

- e2e/provision-multidevice-talent-fixture.mjs ajouté. Il cible exclusivement JOBLY-E2E, vérifie les URL et la clé serveur avant toute écriture, vérifie les marqueurs Auth e2e_fixture, e2e_role et e2e_purpose, refuse les collisions de User/email/username/téléphone, refuse plus d'un appareil actif préexistant, crée ou vérifie l'identité Auth et public.User/public.Profile, et stocke le mot de passe généré uniquement dans le manifeste local .e2e-fixtures.json ignoré par Git. Le rapport exclut les secrets.
- Le provisionneur ne touche jamais public.UserDeviceSession ; il n'insère, ne met à jour ni ne supprime aucun appareil.
- e2e/auth-advanced-browser-smoke.mjs sélectionne en priorité la fixture dédiée talent-multidevice avec purpose exact MULTI_DEVICE_REVOCATION, puis garde le fallback existant vers la fixture partagée afin que l'absence de provisionnement reste un blocage sûr et identifiable.
- scripts/authentication-flow-regression.test.mjs comporte un verrou statique supplémentaire sur l'isolation et l'absence d'écriture d'appareils.
- Commits de cette préparation (tous sur e2e/recette) : 2b649484868b24868667d8b6a714bb15901c3bfd (ajout initial), b77f479f3122b67d58543bbc7adf374319355f60 (durcissement), c841d470e89aca26d70b02afb9031c404eac6399 (réutilisation du secret local dédié sans rotation inutile), 6a17383b72e66b6c68e7c234f3622e0af083671e (sélection de la fixture dédiée), b197324aacbf04de3d99873c5b2d1e74369583a9 (limites du rapport) et 643769366f342437dfb8825e7814d9d5d3c7a9dd (garde de non-régression).
- La dernière vérification GitHub du commit 643769366f342437dfb8825e7814d9d5d3c7a9dd ne retournait aucun status CI (statuses=[]). Les tests statiques, TypeScript et le nouveau provisionneur n'ont pas encore été exécutés localement sur ce SHA.

### 146.3 Commande locale autorisée et preuves attendues

Le provisioning nécessite le secret serveur qui reste dans le .env.local local ; il n'est ni transmis dans le chat ni stocké dans Git. Dans CMD, synchroniser d'abord le worktree de recette après avoir confirmé qu'il est propre. Exécuter ensuite, séparément, la commande :

```cmd
cd /d "%USERPROFILE%\\Jobly-e2e-recette-lot01" && node e2e\\provision-multidevice-talent-fixture.mjs "%USERPROFILE%\\Jobly"
```

Ouvrir le rapport généré :

```cmd
notepad artifacts\\e2e\\multidevice-talent-fixture-provision.json
```

Le rapport doit indiquer status=PASS, le projet JOBLY-E2E, le rôle TALENT, les identifiants non secrets et le décompte des appareils avant/après. Le manifeste local contiendra le mot de passe et ne doit pas être partagé. En cas de FAIL, ne pas poursuivre vers le runner ; transmettre le rapport expurgé des secrets. En cas de PASS, rejouer le runner ciblé --auth-advanced-only, puis vérifier un rapport frais avec MULTI_DEVICE_REVOCATION=PASS, fixture talent-multidevice, révocation de B uniquement, B HTTP 401, A HTTP 200, cleanup=PASS, et conservation des lignes d'appareils préexistantes.

### 146.4 Périmètre et statut

À la rédaction de cette version, les modifications de code sont commitées mais **la fixture distante n'a pas encore été créée** : le provisionneur n'a pas été exécuté sur la machine opérateur, et aucun rapport de provisioning frais n'est disponible. Aucune mutation de JOBLY-PROD, de main, du déploiement, de la fonction Edge, des fixtures partagées ou de leurs sessions n'a été effectuée. Aucune communication email/SMS ou modification de données métier n'est demandée.

**Verdict : LOT-01 reste PARTIAL / NON CLOS.** Le prochain point opératoire unique est l'exécution locale du provisionneur dédié et la transmission de son rapport non sensible ; seulement après son PASS, lancer le retest Auth avancé.
---

## 147. Retest multi-appareils — échec de capture du jeton pendant une navigation

**Mise à jour : 9 novembre 2026 — version 2.178.** Cette section remplace le statut d'attente du §146 après réception du premier rapport d'exécution sur la fixture Talent dédiée.

### 147.1 Identification du run

- Début : `2026-11-09T12:24:48.533Z` ; fin : `2026-11-09T12:25:13.101Z`.
- SHA testé : `e52448af3e6a0c46f2af558db6028a00294d2696`.
- Environnement JOBLY-E2E, projectRef `ofqqrryamslxoqkklraw`, URL locale `http://127.0.0.1:3217`.
- Rapport navigateur : **FAIL**.

### 147.2 Résultats

- OTP : **PASS 4/4**.
- Google OAuth simulé : **PASS 4/4**, navigation vers `accounts.google.com` interceptée avant réseau.
- Récupération : **PASS 3/3**.
- Multi-appareils : **FAIL** après `DEVICE_PREFLIGHT_TWO_FREE_SLOTS=PASS`, avec `baselineActiveDevices=0` et fixture `talent-multidevice`.
- Aucun contrôle de visibilité A/B, révocation de B, B=401 ou A=200 n'a été atteint.

### 147.3 Diagnostic et prudence sur les effets de bord

Erreur : `page.evaluate: Execution context was destroyed, most likely because of a navigation`. Le harnais attendait la présence du token, puis lisait le stockage dans un second `page.evaluate`. Une navigation provoquée par la connexion a pu détruire le contexte entre ces deux opérations. Il s'agit d'un défaut probable du harnais Playwright ; ce rapport ne démontre pas un défaut du code métier de révocation.

- `cleanup=NOT_REQUIRED`.
- `preexistingDeviceRowsUnchanged=true`.
- `unexpectedSupabaseRequests=[]`, `credentialsPrinted=false`, `tokensPrinted=false`.
- `remoteAuthDeviceStateMayBeModified=true` : indicateur conservateur du runner. Les lignes préexistantes sont déclarées inchangées, mais ce rapport seul ne suffit pas à certifier l'état distant complet après l'échec.

Aucune modification d'offre ou autre donnée métier n'est signalée. Aucun accès JOBLY-PROD.

### 147.4 Correctif du harnais sur e2e/recette

- `90f8611941f5548a8169d422a29743fa9e8834da` : lecture prioritaire du jeton via `browserContext.storageState()` (localStorage), puis fallback compatible sessionStorage avec huit tentatives et attente de la fin d'une navigation en cas de destruction du contexte. La signature des options de `page.waitForFunction` a également été corrigée.
- `6ce4fdb18d2123b1ef27a36fab0227eb6cd03598` : test statique verrouillant le snapshot de contexte, les nouvelles tentatives et l'attente de navigation ; `1c6bfa2f245427769ab343af36ef474fa10b05d6` : correction de l'expression régulière de ce verrou statique après relecture distante.
- Seul le harnais E2E et son test de non-régression sont modifiés ; aucun code métier, schéma, migration, fixture partagée ou déploiement.

Ces commits sont versionnés sur `e2e/recette`, mais **les contrôles locaux et le runtime après correctif ne sont pas encore exécutés**. Ne pas déclarer le point résolu sur la seule base du correctif commité.

### 147.5 Reprise

Après synchronisation du worktree propre sur `origin/e2e/recette`, exécuter séparément `node --check e2e/auth-advanced-browser-smoke.mjs`, `pnpm test:auth`, `pnpm exec tsc --noEmit --incremental false`, puis le runner `node e2e/run-authenticated-role-recipe.mjs "%USERPROFILE%\\Jobly" --auth-advanced-only`. Vérifier le rapport frais : fixture `talent-multidevice`, deux appareils A/B visibles, révocation de B par l'interface, B HTTP 401, A HTTP 200, `cleanup=PASS`, `preexistingDeviceRowsUnchanged=true`, erreurs page vides et aucun endpoint Supabase inattendu.

**Verdict : LOT-01 reste PARTIAL / NON CLOS** jusqu'au retest runtime réussi. Ne pas toucher aux appareils partagés, ne pas fusionner vers `main`, ne pas déployer et ne pas utiliser JOBLY-PROD.

---

## 148. Nettoyage ciblé des sessions A orphelines de tentatives précédentes

**Mise à jour : 9 novembre 2026 — version 2.180.**

### 148.1 Diagnostic du run de 21:00

Le rapport du run `2026-11-09T21:00:09.450Z`, commit `2087deed1a9c16d5abafd08ed74dd2ff054621bb`, est **PARTIAL** : OTP 4/4 PASS, Google simulé 4/4 PASS, récupération 3/3 PASS. Le scénario multi-appareils est BLOCKED au préflight avec `baselineActiveDevices=2`; aucune session n'a été créée lors de ce run. Le rapport confirme `remoteAuthDeviceStateMayBeModified=false` et `preexistingDeviceRowsUnchanged=true`.

### 148.2 Inspection en lecture seule de JOBLY-E2E

Pour la seule identité `jobly-e2e-multidevice-talent@jobly.test`, la base présentait exactement deux lignes actives :
- `e2e-lot1-auth-ee30bfdcd8da-a`, libellé `Jobly E2E LOT-01 A ee30bfdcd8da`, créée le 9 novembre à 12:25:12 UTC ;
- `e2e-lot1-auth-7dd99806c355-a`, libellé `Jobly E2E LOT-01 A 7dd99806c355`, créée le 9 novembre à 12:36:16 UTC.

Les deux device IDs et les deux libellés correspondent au schéma réservé par le runner pour ses sessions A temporaires. Les deux lignes pointaient vers une session Auth chacune. Aucune ligne B n'était présente. Les horodatages suivent les tentatives du test de cette même journée. Ces lignes sont donc documentées comme résidus de test A, et non comme appareils des fixtures partagées.

### 148.3 Action de nettoyage et vérification

Sur le seul projet JOBLY-E2E `ofqqrryamslxoqkklraw`, une mise à jour ciblée a marqué `revokedAt=now()` sur ces deux lignes exactes, conditionnée par l'email de la fixture dédiée, les deux UUID de lignes, les deux device IDs, les deux labels et `revokedAt IS NULL`. Aucune ligne n'a été supprimée.

Vérification SQL immédiatement après :
- total des lignes d'appareils de la fixture : **2** ;
- lignes révoquées : **2** ;
- lignes actives : **0** ;
- lignes actives portant le préfixe du runner LOT-01 : **0**.

Aucune donnée métier, fixture partagée, session d'appareil partagée, production, branche `main` ou déploiement n'a été touché.

### 148.4 Prochaine reprise

Le worktree opérateur est à synchroniser sur `origin/e2e/recette`. La version de code à tester est celle contenant la capture de token tolérante à la navigation (`90f8611941f5548a8169d422a29743fa9e8834da`) et les assertions de non-régression corrigées (`1c6bfa2f245427769ab343af36ef474fa10b05d6)), avec la tête courante de la branche. Rejouer `node --check e2e/auth-advanced-browser-smoke.mjs`, `pnpm test:auth`, `pnpm exec tsc --noEmit --incremental false`, puis `node e2e/run-authenticated-role-recipe.mjs "%USERPROFILE%\\Jobly" --auth-advanced-only`.

Le préflight multi-appareils doit maintenant observer `baselineActiveDevices=0`. Si un nouvel échec survient, ne pas révoquer de lignes supplémentaires sans identifier d'abord les device IDs créés par ce run et leurs horodatages.

**Verdict : LOT-01 reste PARTIAL / NON CLOS** jusqu'à la preuve runtime de visibilité A/B, révocation B=401, maintien A=200, `cleanup=PASS` et conservation des lignes préexistantes.

---

## 149. Retest multi-appareils — liste UI indisponible malgré HTTP 200 ; diagnostic renforcé

**Mise à jour : 9 novembre 2026 — version 2.181.**

### 149.1 Identification et résultats

- Run : `2026-11-09T21:15:10.669Z` à `2026-11-09T21:15:40.817Z`.
- Commit testé : `a5ebf78bcdffdd5cc8456ca2bb4a004407785b81`.
- JOBLY-E2E ; préflight multi-appareils **PASS**, `baselineActiveDevices=0`.
- OTP 4/4 PASS ; Google simulé 4/4 PASS ; récupération 3/3 PASS.
- Multi-appareils **FAIL** avec détail `Liste des appareils non accessible (HTTP 200)`.
- Le scénario a échoué après création de la session A, avant affichage/vérification de la liste ou création de B. `cleanup=PASS`.

### 149.2 Vérification distante après le run

Lecture SQL ciblée sur la fixture dédiée :
- total `UserDeviceSession` : **3** lignes ;
- sessions révoquées : **3** ;
- sessions actives : **0** ;
- sessions actives de préfixe LOT-01 : **0**.

La ligne de ce run, `e2e-lot1-auth-cc497f689d5c-a`, a été créée à `21:15:37.498536Z` puis marquée révoquée à `21:15:39.493Z`. Le cleanup a donc bien révoqué la session A créée par ce run. Les deux lignes des runs antérieurs sont elles aussi révoquées. Aucune suppression de ligne ni modification d'une fixture partagée.

### 149.3 Cause à éclaircir

Le code actuel de `app/api/device-sessions/route.ts` renvoie un objet JSON `{ devices, activeCount, limit }` lorsque l'authentification est valide. Le harnais attendait un événement Playwright `waitForResponse` pendant la navigation vers `/settings`, puis exigeait un tableau `payload.devices`. Le HTTP 200 seul ne permet pas de savoir si l'événement a capturé la réponse attendue, si le body a été parsé correctement ou si une réponse d'un appel concurrent a été prise. Le rapport initial n'enregistre pas les clés du payload, ni son content-type.

### 149.4 Correctif complémentaire préparé sur e2e/recette

- Commit `5750678d009539bcd7017aa11165091e13809ae1` : remplace la capture d'une réponse arbitraire en cours de navigation par un GET direct depuis le runner Node vers `/api/device-sessions`, avec le bearer token et les deux headers de l'appareil de test. Le harnais vérifie désormais `payload.devices`, que l'appareil courant A y apparaisse actif, puis attend le heading « Mes appareils connectés » et le libellé exact dans l'interface.
- En cas de forme de payload inattendue, le rapport d'erreur contiendra désormais le code HTTP, le content-type et les clés de premier niveau du JSON, sans imprimer de token ni de contenu personnel.
- Commit `597600282b55a41449518cb7cde04b0653c79a74` : verrou de non-régression statique pour le GET direct, la validation de l'appareil courant, le diagnostic expurgé et l'attente UI ; interdit le retour à l'ancien `waitForResponse` concurrent.
- Commit `2525d938ecfaff68cc30c1932cac1daa9459476b` : rend la recherche du libellé UI non exacte pour tenir compte du suffixe « · Cet appareil » affiché à côté de l'appareil courant ; commit `ca348fbd638cec1f2f92feb1eaa9525273dc534f` : verrouille cette attente dans le test statique.
- Les deux modifications touchent uniquement le harnais E2E et le test statique. Pas de modification métier, de migration ou de déploiement.

Le correctif complémentaire n'a pas encore été exécuté localement : aucun PASS runtime ne lui est attribué.

### 149.5 État de sûreté et prochaine reprise

Après le run, la fixture dédiée ne possède aucun appareil actif (0/3). Aucune session temporaire ne demeure active selon la lecture SQL. Les lignes des sessions de test sont conservées pour audit et portent `revokedAt`.

Synchroniser le worktree propre sur `origin/e2e/recette`, puis rejouer `node --check e2e/auth-advanced-browser-smoke.mjs`, `pnpm test:auth`, `pnpm exec tsc --noEmit --incremental false`, puis `node e2e/run-authenticated-role-recipe.mjs "%USERPROFILE%\\Jobly" --auth-advanced-only`. Le prochain rapport doit prouver : A active et visible dans l'API et dans l'UI, B active et visible, révocation exclusive de B depuis l'UI, B HTTP 401, A HTTP 200, cleanup PASS, et lignes préexistantes inchangées.

**Verdict : LOT-01 reste PARTIAL / NON CLOS** jusqu'au PASS runtime de la révocation multi-appareils.

---

## 150. Premier balayage global rapide V1 — Talent et Recruteur PASS ; Afrique FAIL

**Mise à jour : 10 novembre 2026 — version 2.182.** Cette section enregistre le premier run opérateur de l'orchestrateur global à une seule commande. Elle devient la référence de reprise à la place des anciens lancements manuels séparés.

### 150.1 Identification du run

- Début : 2026-11-10T03:53:58.946Z.
- Fin : 2026-11-10T03:59:14.300Z.
- Durée totale : **315,3 secondes (5 min 15,3 s)**.
- Commit testé : ffcfbee22a7a9d2db389aea6f6c1175904ae8ae4.
- Branche : e2e/recette.
- Environnement : JOBLY-E2E uniquement ; projectRef ofqqrryamslxoqkklraw.
- Rapport consolidé : artifacts/e2e/global-e2e-report.md ; JSON : artifacts/e2e/global-e2e-report.json.
- Statut global : **FAIL**, causé par LOT-04 Mission Afrique. Ce statut ne remet pas en cause les sous-résultats PASS explicitement enregistrés ci-dessous.

### 150.2 Résultats confirmés

| Porte / module | Résultat | Preuve |
|---|---|---|
| Tests statiques transversaux | **PASS** | 7/7 groupes PASS ; 34 fichiers de test |
| Build et démarrage du serveur JOBLY-E2E | **PASS** | 275,3 s |
| Accueil public | **PASS** | HTTP 200 ; 27 369 octets HTML |
| LOT-02 Talent | **PASS** | 10 PASS ; 0 FAIL ; 0 BLOCKED |
| LOT-03 Recruteur / Recruitment360 | **PASS** | 9 PASS ; 0 FAIL ; 0 BLOCKED |
| LOT-04 Mission Afrique | **FAIL** | 1 PASS ; 1 FAIL ; 0 BLOCKED |
| Arrêt du serveur | **PASS** | PID exact du serveur JOBLY-E2E arrêté |

Bilan runtime des trois lots : **20 contrôles PASS, 1 FAIL, 0 BLOCKED**. L'unique échec observé dans ce balayage est circonscrit à LOT-04.

### 150.3 Analyse du temps et de l'efficacité

- Durée totale : 315,3 s.
- Build et démarrage du serveur : 275,3 s, soit environ **87,3 %** de la durée totale.
- Temps restant pour les autres étapes du run : environ 40,0 s.
- Les lots runtime Talent, Recruteur et Afrique ont été exécutés en parallèle.
- Le temps principal à optimiser est donc le build/démarrage ; les tests runtime ne représentent pas le poste dominant de cette exécution.

Pour la correction en cours, **ne pas relancer la recette globale ni reconstruire le site simplement pour diagnostiquer LOT-04**. Le runner e2e/runtime-lot04-readonly.mjs interroge directement JOBLY-E2E en lecture seule et ne dépend pas du serveur Next.js. Après identification et correction de la cause, rejouer ce seul runner, puis relancer la recette globale uniquement lorsque les contrôles ciblés sont verts ou qu'un changement transversal exige une régression complète.

### 150.4 Diagnostic Afrique — preuve encore nécessaire

Le résumé consolidé indique 1 PASS et 1 FAIL pour LOT-04, mais ne contient pas le détail de l'assertion ou de l'erreur. À la lecture du runner versionné, le profil « 1 PASS + 1 FAIL » signifie que le contrôle de cible JOBLY_E2E_TARGET a réussi, puis qu'une erreur a été capturée pendant la lecture ou le traitement des tables JobHarvestCapture et JobOfferPipeline (ou de leurs champs).

La cause précise ne peut pas être déterminée à partir du seul résumé Markdown. Elle doit être lue dans :
- artifacts/e2e/lot4-runtime-readonly.json, notamment checks[].id, checks[].detail et checks[].httpStatus ;
- artifacts/e2e/global-lot-04.log si le détail de processus est nécessaire.

Ne pas lancer de migration, ne pas modifier les tables et ne pas changer les permissions sur la base de ce seul statut. Il faut d'abord identifier la table, la colonne, le code PostgREST ou l'erreur de transport qui a provoqué le FAIL.

### 150.5 Sûreté et périmètre

- Projet ciblé : JOBLY-E2E ofqqrryamslxoqkklraw.
- Les runners Talent, Recruteur et Afrique sont conçus en lecture seule pour les données métier.
- Le serveur local a été arrêté par le PID exact qu'avait créé l'orchestrateur.
- Aucun déploiement, aucune fusion dans main et aucune modification de production ne sont effectués par ce run.
- Les connexions Auth de test peuvent actualiser les métadonnées de session/appareil ; ne pas confondre cette réserve avec une écriture métier.
- Aucune action externe (email, SMS, paiement, OAuth réel ou soumission externe) n'a été déclenchée.

### 150.6 Décision de reprise

1. Conserver les résultats statiques **7/7 PASS**, Talent **10/10 PASS**, Recruteur **9/9 PASS**, Build **PASS**, accueil **PASS** et arrêt serveur **PASS** comme acquis pour ce commit.
2. Examiner le rapport détaillé LOT-04 pour isoler sa cause exacte.
3. Corriger uniquement le point identifié dans le périmètre Afrique ou son accès en lecture, sans élargir la modification.
4. Rejouer uniquement LOT-04 pour vérifier la correction et conserver son nouveau rapport.
5. Effectuer un nouveau balayage global après le PASS ciblé, ou plus tôt uniquement si le correctif touche un socle partagé.

**Verdict de cette version : balayage global FAIL à cause du seul LOT-04 ; Talent, Recruteur, les 34 fichiers statiques, le build, l'accueil et l'arrêt du serveur sont PASS. La cause LOT-04 reste à établir à partir du rapport détaillé.**

Aucun merge vers main, aucun déploiement Vercel, aucune écriture JOBLY-PROD.

---

## 151. LOT-04 Afrique — cause 42703 identifiée et runner aligné sur le schéma E2E

**Mise à jour : 10 novembre 2026 — version 2.183.** Cette section précise et corrige le blocage du premier balayage global (§150). Elle ne remplace pas le résultat du run initial : le correctif doit encore être exécuté localement.

### 151.1 Diagnostic confirmé sur JOBLY-E2E

Le rapport opérateur LOT-04 du 10 novembre, créé à 03:58:41.260Z sur le commit ffcfbee22a7a9d2db389aea6f6c1175904ae8ae4, donne :
- JOBLY_E2E_TARGET : **PASS**, HTTP 200 ;
- LOT04_RUNTIME_EXECUTION : **FAIL**, détail `JobOfferPipeline_READ_42703` ;
- aucun secret ou token affiché ;
- aucune action externe et aucune modification métier distante.

Le code PostgreSQL/PostgREST `42703` correspond à une colonne inexistante. La documentation officielle Supabase décrit ce code comme une référence à une colonne absente : https://supabase.com/docs/guides/api/rest/postgrest-error-codes.

L'inspection en lecture seule de `information_schema.columns` sur le projet `ofqqrryamslxoqkklraw` confirme :
- `JobHarvestCapture` ne possède ni `countryCode` ni `rejectionCode` ;
- `JobOfferPipeline` ne possède ni `countryCode` ni `rejectionCode` ;
- `JobHarvestCapture` possède notamment `id`, `sourceKey`, `status`, `publishedAt`, `deadline`, `discoveredAt`, `processedAt`, `jobId` ;
- `JobOfferPipeline` possède notamment `id`, `jobId`, `sourceKey`, `status`, `qualityScore`, `createdAt`, `processedAt`.

Le runner initial demandait les deux colonnes absentes dans les deux tables. L'erreur rapportée sur `JobOfferPipeline` était donc un défaut de projection du runner, et non une panne de connexion, de permission ou une raison de modifier le schéma.

Une requête SQL `SELECT COUNT(*)` de contrôle a également confirmé, au moment du diagnostic, **0 ligne dans JobHarvestCapture et 0 ligne dans JobOfferPipeline**. Les tables existent et sont accessibles, mais aucune capture/pipeline n'est présent dans l'environnement E2E pour éprouver les statistiques de collecte et de fraîcheur.

### 151.2 Correctif du runner versionné sur e2e/recette

Commit `a67c075e60ccab0c2682020c70f83c68d1043a4f` :
- projection `JobHarvestCapture` limitée aux colonnes existantes : `id,sourceKey,status,publishedAt,deadline,discoveredAt,processedAt,jobId` ;
- projection `JobOfferPipeline` limitée aux colonnes existantes : `id,jobId,sourceKey,status,qualityScore,createdAt,processedAt` ;
- retrait des agrégations `byCountry` et `byRejectionCode`, qui ne peuvent pas être établies à partir de ces colonnes absentes ;
- conservation des agrégations par statut et source, ajout de la distribution `byQualityScore` pour le pipeline.

Le runner ne demande plus de migration et n'effectue aucune écriture.

### 151.3 Statut de données vides — pas de PASS artificiel

Le même correctif ajoute deux contrôles explicites :
- `AFRICA_DATA_PRESENCE` : BLOCKED tant que les deux tables restent vides ;
- `AFRICA_FRESHNESS_AUDIT` : BLOCKED si aucune capture ne permet de calculer la fraîcheur.

Ainsi, un futur GET réussi sur des tables vides prouvera seulement l'accès et la compatibilité du schéma ; il ne sera pas présenté comme une validation réelle de l'ingestion ou de la fraîcheur.

Commit `463428e20d6f1c4c989c124158b39be645ce42a1` :
- tests statiques de non-régression ajoutés pour verrouiller exactement les deux projections validées ;
- interdiction de réintroduire `countryCode` et `rejectionCode` dans le runner LOT-04 ;
- présence obligatoire des contrôles `AFRICA_DATA_PRESENCE` et `AFRICA_FRESHNESS_AUDIT`.

### 151.4 Reprise ciblée — sans rebuild global

Le runner LOT-04 est autonome et ne nécessite pas le serveur Next.js. Après synchronisation de la branche sur le worktree propre, exécuter uniquement :

```cmd
call e2e\run-runtime-lot04-readonly.cmd
```

Le lanceur ouvre automatiquement `artifacts\e2e\lot4-runtime-readonly.json` dans Notepad à la fin du test, que le résultat soit PASS, PARTIAL ou FAIL. Aucune commande Notepad séparée n'est nécessaire.

Résultat attendu avec le snapshot E2E observé pendant le diagnostic :
- `JOBLY_E2E_TARGET` : PASS ;
- `JOB_HARVEST_CAPTURE_READ` : PASS ;
- `JOB_OFFER_PIPELINE_READ` : PASS ;
- `AFRICA_DATA_PRESENCE` : BLOCKED ;
- `AFRICA_FRESHNESS_AUDIT` : BLOCKED ;
- statut LOT-04 : **PARTIAL**, et non PASS, tant que les deux tables ne contiennent pas de données de recette.

Si le schéma est corrigé mais les tables restent vides, ne pas lancer de collecte réelle et ne pas créer artificiellement de données : conserver le blocage de couverture et traiter ultérieurement la disponibilité de fixtures de collecte JOBLY-E2E dans un scénario isolé autorisé.

### 151.5 État de validation et garde-fous

- Diagnostic du schéma et comptages : effectués en SQL strictement SELECT sur JOBLY-E2E.
- Code correctif et verrou statique : commis sur `e2e/recette`.
- Exécution locale du runner corrigé : **NON ENCORE EXÉCUTÉE**.
- Les résultats du premier run (§150) restent inchangés jusqu'à réception du nouveau rapport.
- Pas de migration, pas de modification de tables ou permissions, pas d'écriture JOBLY-PROD, pas de fusion dans `main`, pas de déploiement Vercel.

**Verdict : cause 42703 identifiée et projection LOT-04 corrigée dans le code. La réussite de la lecture et le statut PARTIAL attendu doivent encore être confirmés par le run ciblé.**


---

## 152. Règle permanente — ouverture automatique des rapports dans Notepad

**Mise à jour : 10 novembre 2026 — version 2.185.** À la demande de l'utilisateur, toute commande de recette Windows doit ouvrir automatiquement son rapport à la fin. L'opérateur ne doit plus avoir à lancer une deuxième commande Notepad.

### 152.1 Lanceurs concernés

Les wrappers CMD suivants ont été modifiés pour appeler `start "" notepad` sur leur rapport dédié après l'exécution et avant le retour du code de sortie :
- `e2e/run-runtime-lot02-readonly.cmd` → `artifacts/e2e/lot2-runtime-readonly.json` ;
- `e2e/run-runtime-lot03-readonly.cmd` → `artifacts/e2e/lot3-runtime-readonly.json` ;
- `e2e/run-runtime-lot04-readonly.cmd` → `artifacts/e2e/lot4-runtime-readonly.json` ;
- `e2e/start-readonly-runtime-server.cmd` → `artifacts/e2e/parallel-runtime-server.json` ;
- `e2e/stop-readonly-runtime-server.cmd` → `artifacts/e2e/parallel-runtime-server-stop.json` ;
- `e2e/run-global-e2e.cmd` → `artifacts/e2e/global-e2e-report.md`.

Le lancement de Notepad intervient également lorsque le runner retourne un code non nul : le rapport FAIL/PARTIAL doit rester immédiatement visible. Si le rapport structuré n'a pas pu être créé, le wrapper ouvre automatiquement le journal de processus en solution de repli. Le code de sortie initial du test est conservé dans `RC` et reste le code de sortie du wrapper.

### 152.2 Règle opératoire à conserver

- Donner une seule commande CMD exécutable par l'utilisateur.
- Intégrer l'ouverture automatique du rapport dans le wrapper CMD lui-même.
- Ne plus demander ensuite une deuxième commande `notepad ...`.
- Quand une commande n'a pas de wrapper, ajouter explicitement une ouverture Notepad à la fin de la même ligne CMD, sans masquer le code de sortie initial.
- Si le test échoue, conserver et ouvrir le rapport d'échec ; ne jamais ouvrir uniquement le journal si un rapport structuré est disponible.
- Toute nouvelle commande de recette, tout nouveau lot et tout nouvel orchestrateur doit respecter cette règle.

### 152.3 Reprise immédiate LOT-04

La prochaine exécution doit récupérer la dernière tête de `e2e/recette`, puis invoquer seulement `call e2e\run-runtime-lot04-readonly.cmd`. Le wrapper ouvrira automatiquement le rapport `lot4-runtime-readonly.json`. Pas de build global, pas de serveur Next.js requis, pas de commande Notepad supplémentaire.

À la date de cette mise à jour, le correctif des projections SQL est commité, mais le runner LOT-04 corrigé n'a pas encore été rejoué par l'opérateur. Ses résultats doivent être renseignés après réception du nouveau rapport.

**Cette règle est permanente pour la suite de la recette Jobly.**

### 152.4 Durcissement et preuve statique

Les six wrappers vérifient désormais l'existence du rapport avant ouverture et basculent vers le journal de processus s'il manque. Le wrapper d'arrêt serveur capture également stdout/stderr dans son journal ; les dossiers d'artefacts sont créés avant exécution.

Commits de durcissement des wrappers :
- LOT-02 : `6ea5674eb27eacf488abedf1bd7f5a974b7745e5` ;
- LOT-03 : `133f28f6135f48c843ed52a03fd8243009cb9042` ;
- LOT-04 : `475836e7e0b9816648cc380a50b73f4d48cdf5b4` ;
- démarrage serveur : `6ec12803389c600de66d3b7795ad4f442ffee4d1` ;
- arrêt serveur : `5ff4e165225b25119dcabebf87beb98f3584dc4a` ;
- balayage global : `4b26664e6c0cc73c1e8f6c808dfe26450c4df2e0` ;
- verrou de non-régression sur l'ouverture Notepad et la conservation du code de sortie : `b0b12828d699f9e601690bae7a5d986b94a855c0`.

Le test statique verrouille les six wrappers, leurs chemins de rapport, les journaux de repli, la présence de `start "" notepad` et le retour du code `RC`. Le test statique est versionné ; son exécution locale sur le dernier HEAD reste à effectuer avec la prochaine validation.




---

## 153. LOT-04 Afrique — lecture corrigée confirmée, couverture bloquée par l'absence de fixtures

**Mise à jour : 10 novembre 2026 — version 2.186.** Cette section clôt le diagnostic de l'erreur 42703 décrit en §151 et enregistre le premier rapport du runner corrigé. Le test a été exécuté sur le commit `94fb9c4cb63e884670f319156df0c952b58c870d`.

### 153.1 Résultat réel du run ciblé

Rapport opérateur créé le 10 novembre 2026 à 04:10:33.930Z, terminé à 04:10:36.224Z :

| Contrôle | Résultat | Preuve |
|---|---|---|
| JOBLY_E2E_TARGET | **PASS** | HTTP 200 ; projet `ofqqrryamslxoqkklraw` confirmé |
| JOB_HARVEST_CAPTURE_READ | **PASS** | HTTP 200 ; lecture paginée complète |
| JOB_OFFER_PIPELINE_READ | **PASS** | HTTP 200 ; lecture paginée complète |
| AFRICA_DATA_PRESENCE | **BLOCKED** | Les deux tables sont accessibles mais vides |
| AFRICA_FRESHNESS_AUDIT | **BLOCKED** | Aucune capture disponible pour calculer la fraîcheur |

Bilan : **3 PASS, 0 FAIL, 2 BLOCKED** ; statut global **PARTIAL**. Le runner ne rencontre plus l'erreur de colonne inexistante 42703 : les deux projections corrigées sont acceptées par l'API REST.

### 153.2 Volumétrie observée

- `JobHarvestCapture` : 0 ligne observée, 0 ligne totale, pagination complète, aucune troncature.
- `JobOfferPipeline` : 0 ligne observée, 0 ligne totale, pagination complète, aucune troncature.
- Les répartitions par statut, source et score sont vides, conformément à cette volumétrie nulle.
- `readOnly: true` ; aucune écriture ou suppression métier effectuée.
- Aucun e-mail, SMS, paiement, OAuth fournisseur, ingestion, réindexation ou envoi de candidature exécuté.
- Aucun secret ni token imprimé ; aucune action externe ; aucune modification distante métier déclarée.

Le résultat démontre maintenant la compatibilité des lectures avec le schéma présent dans JOBLY-E2E. Il ne démontre pas le bon fonctionnement d'une collecte, d'un traitement canonique ou de la règle de fraîcheur, puisque aucune donnée de recette n'est disponible pour les exercer.

### 153.3 Diagnostic et décision

La cause technique du FAIL précédent est résolue dans le runner : les contrôles de cible et les deux lectures sont PASS. Les deux BLOCKED restants sont des blocages de couverture dus à l'absence de données, et non des erreurs HTTP ou de schéma.

Ne pas :
- déclarer LOT-04 PASS sur la seule base des lectures HTTP 200 ;
- lancer une ingestion réelle pour remplir les tables ;
- injecter des lignes arbitraires directement dans les tables métier ;
- modifier le schéma ou les permissions pour lever ces BLOCKED ;
- utiliser JOBLY-PROD, fusionner dans `main` ou déployer.

Étape suivante : examiner le mécanisme de fixtures E2E déjà prévu par le dépôt et ses dépendances, puis préparer un scénario de recette isolé, strictement limité au projet `ofqqrryamslxoqkklraw`, avec des données synthétiques identifiables et un nettoyage vérifiable. Aucune écriture distante ne doit être effectuée tant que le mécanisme n'a pas été audité et que le périmètre d'écriture/nettoyage n'est pas explicite. Une fois les fixtures sûres disponibles, rejouer LOT-04 seul pour tester les statuts, sources, données canoniques et dates de publication/fraîcheur.

### 153.4 État de validation et garde-fous

- Correctif des projections LOT-04 : **confirmé par exécution ciblée**.
- Accès au projet JOBLY-E2E : **PASS**.
- Lecture complète des deux tables : **PASS**.
- Présence de captures et pipelines : **BLOCKED — 0 ligne**.
- Audit effectif de fraîcheur : **BLOCKED — aucune capture**.
- Aucun changement distant métier, aucune action externe, aucun déploiement et aucune fusion dans `main`.

**Verdict : LOT-04 n'échoue plus techniquement. Il reste PARTIAL, de façon intentionnelle et honnête, en attendant des fixtures synthétiques sûres pour JOBLY-E2E.**


### 153.5 Audit des fixtures E2E existantes — périmètre insuffisant pour LOT-04

Un contrôle complémentaire du code et du guide de recette confirme que le dépôt dispose déjà de fixtures synthétiques, mais pour d'autres parcours :

- `e2e/provision-fixtures.mjs` provisionne les trois identités Talent, Recruteur et Partenaire, leurs lignes `User` et leurs profils associés. Son périmètre ne crée pas de `JobHarvestCapture` ni de `JobOfferPipeline`.
- `scripts/e2e-local-recipe.mjs` orchestre le parcours Auth et le scénario croisé Talent → Recruteur ; le guide précise que l'offre et la candidature synthétiques de ce parcours sont supprimées, puis leur absence est vérifiée.
- `scripts/africa-p0.test.mjs` contient des tests unitaires de la règle de fraîcheur et des assertions statiques sur la route Talent et les workflows. Il ne provisionne pas de capture ou de ligne pipeline dans JOBLY-E2E.
- `e2e/README.md` indique que les fonctions Edge et le calendrier d'ingestion ne sont pas provisionnés dans E2E.

Conclusion : **aucun mécanisme de fixtures Afrique existant n'a été confirmé** pour alimenter les deux tables observées par LOT-04. Le provisionnement actuel des comptes et le parcours de candidature ne doivent pas être détournés pour simuler une collecte.

La préparation du lot Afrique doit donc être distincte : lire le schéma complet, les contraintes et les dépendances des deux tables ; choisir une voie de création strictement JOBLY-E2E ; marquer chaque objet synthétique avec un identifiant de run unique ; enregistrer exactement les identifiants créés ; puis nettoyer uniquement ces identifiants et vérifier leur absence. Ne pas modifier ni nettoyer des enregistrements préexistants. Tant que ces garde-fous et la forme des données obligatoires ne sont pas établis, LOT-04 conserve son statut PARTIAL.


---

## 154. Audit Afrique approfondi et recette bulk intégrée au vrai processeur

**Mise à jour : 10 novembre 2026 — version 2.187.** Cette section prépare la suite du LOT-04 à partir du résultat PARTIAL confirmé en §153. Elle documente le schéma réel E2E, deux anomalies de fraîcheur corrigées et une recette bulk isolée. **La recette bulk n'a pas encore été exécutée par l'opérateur : aucun PASS runtime n'est revendiqué à ce stade.**

### 154.1 Audit de l'état réel de JOBLY-E2E

Projet interrogé en lecture seule : ofqqrryamslxoqkklraw (JOBLY-E2E), PostgreSQL 17.11.0.018, région eu-west-1, état ACTIVE_HEALTHY.

Volumétrie confirmée au moment de l'audit :

| Table / objet | Lignes |
|---|---:|
| Job | 31 |
| JobSource | 0 |
| JobHarvestCapture | 0 |
| JobOfferPipeline | 0 |
| DiscoveryQueueItem | 0 |
| DiscoveryRun | 0 |

Les 31 offres sont des données de référence E2E ; plusieurs n'ont pas de sourceKey et ne sont pas reliées à des captures. Elles ne constituent donc pas une preuve du fonctionnement du collecteur ou du pipeline canonique.

Une seule Edge Function est actuellement déployée dans JOBLY-E2E : e2e-fixture-provision (ACTIVE, version 4). Les fonctions job-harvest-ingest et job-harvest-process ne sont pas déployées dans cet environnement. C'est une raison structurelle supplémentaire pour laquelle une recette runtime limitée aux GET ne pouvait pas démontrer le traitement effectif.

Sécurité observée :
- RLS activé sur les tables inspectées ;
- politiques deny_client_access sur JobSource, JobHarvestCapture et JobOfferPipeline pour anon et authenticated ;
- politique jobly_security_core_deny_client_select sur Job ;
- les données d'ingestion sont donc des objets de traitement serveur, pas des fixtures à écrire via un client navigateur.

### 154.2 Schéma et relations validés

JobHarvestCapture :
- id UUID, sourceKey et sourceUrl obligatoires ;
- unicité (sourceKey, sourceUrl) ;
- statuts autorisés : PENDING, PROCESSING, PROCESSED, QUARANTINED, EXPIRED, FAILED ;
- colonnes de date réelles : publishedAt, deadline, discoveredAt, processedAt ;
- le champ jobId est une liaison texte vers l'offre créée.

JobOfferPipeline :
- jobId UUID obligatoire et unique ;
- clé étrangère vers Job.id avec ON DELETE CASCADE ;
- statuts PENDING, READY, QUARANTINED, FAILED ;
- contenu canonique et confiance stockés dans des champs JSONB.

Job :
- unicité partielle (sourceKey, externalId) lorsque les deux valeurs sont présentes ;
- unicité (source, sourceUrl) ;
- sourcePublishedAt nullable ;
- countryCode, applicationReady, qualityStatus et normalizedContent disponibles pour contrôler la cohérence métier.

Conséquence pour le nettoyage : supprimer en priorité le pipeline par jobId, ensuite le Job, puis les captures par la sourceKey unique du run. Aucun nettoyage global par statut ou par source réelle n'est acceptable.

### 154.3 Anomalie de fraîcheur supplémentaire identifiée

L'audit du code réel job-harvest-ingest → job-harvest-process → app/api/jobs/route.ts a révélé deux problèmes qui n'étaient pas visibles dans la recette GET précédente :

1. Quand une date source manque, le collecteur calcule un fallback de premier constat, mais persistait auparavant discoveredAt = now au lieu de conserver le firstHarvestAt effectivement calculé.
2. Le processeur copiait la date effective de fallback dans Job.sourcePublishedAt et dans le contenu canonique comme s'il s'agissait d'une vraie date publiée par la source. La route Talent lit sourcePublishedAt comme date source ; elle pouvait alors appliquer la fenêtre de deux mois au lieu de la fenêtre estimée de 30 jours.

Correctifs versionnés :
- job-harvest-ingest marque explicitement une date estimée lorsque publishedAt manque ;
- JobHarvestCapture.discoveredAt reçoit le firstHarvestAt calculé ;
- job-harvest-process conserve Job.sourcePublishedAt = null pour une date estimée ;
- canonicalContent.sourcePublishedAt reste également null pour une date estimée ;
- confidence.publicationDateVerified devient false pour une date estimée.

La route Talent peut ainsi retrouver le premier constat dans JobHarvestCapture et réappliquer correctement la fenêtre de 30 jours. Les offres avec une date source authentique conservent, elles, la règle de deux mois calendaires.

### 154.4 Refactor minimal pour tester le vrai code sans déployer Edge Functions

Les fonctions exposent maintenant leurs opérations bulk internes :
- ingestHarvestItems(admin, items) ;
- runHarvestProcessorBatch(db, body).

Le serveur HTTP Deno.serve ne démarre que lorsque le fichier est le point d'entrée Deno (import.meta.main). La recette importe les fonctions dans son propre processus, utilise la service key uniquement côté script local et pointe en dur vers JOBLY-E2E. L'autorisation OIDC du handler HTTP n'est pas l'objet de cette recette ; les transformations et écritures métier des deux fonctions sont bien celles du code versionné, mais aucun endpoint Edge n'est déployé.

### 154.5 Contenu du lot bulk

Le nouveau runner e2e/africa-bulk-recipe.ts exécute une seule campagne identifiée par une sourceKey à forte entropie jobly_e2e_bulk_* :

- deux captures valides : une avec date source réelle, une avec premier constat estimé ;
- deux candidats rejetés par l'ingestion avant persistance : date source dépassant deux mois et deadline dépassée ;
- trois captures ciblées sur le processeur : date source ancienne, deadline passée et date totalement absente sans fallback ;
- appel du vrai batch processor, limité à cette seule sourceKey et à 40 lignes ;
- assertions sur les statuts PROCESSED, EXPIRED et QUARANTINED, sur le pays, le contact synthétique .invalid, les Jobs créés, les deux pipelines READY et la conservation de sourcePublishedAt = null pour l'offre estimée.

Résultat attendu si le schéma et le traitement correspondent à l'audit :
- ingestion : 2 captures acceptées, 2 offres rejetées avant insertion, dont 1 candidat estimé ;
- processeur : 5 captures sélectionnées, 2 traitées, 2 expirées, 1 mise en quarantaine, 0 échec ;
- base avant nettoyage : 5 captures, 2 Jobs, 2 pipelines ;
- après nettoyage : 0 capture, 0 Job et 0 pipeline appartenant à la sourceKey du run.

Le runner écrit un manifeste de nettoyage avant ses écritures. En cas d'interruption, la prochaine exécution nettoie exactement le run précédent avant d'en commencer un nouveau. Le nettoyage vérifie l'absence des lignes ; si cette vérification échoue, le manifeste est conservé pour reprise. Les 31 offres de référence et les autres sources ne sont jamais ciblées.

### 154.6 Commande unique et rapport

Depuis le worktree Jobly-e2e-recette-lot01, une seule commande :

    call e2e\run-africa-bulk-recipe.cmd

Le wrapper :
1. exécute d'abord node --test scripts/runtime-readonly-lots.test.mjs ;
2. exige Deno 2.x avant tout accès d'écriture ;
3. exécute le lot bulk ;
4. ouvre automatiquement artifacts/e2e/africa-bulk-recipe-report.json dans Notepad, ou le journal de processus en fallback.

Prérequis locaux : Node.js et Deno 2.x dans le PATH. Aucun deuxième CMD ni aucune commande Notepad séparée.

### 154.7 État d'avancement et garde-fous

Correctifs code versionnés sur e2e/recette :
- export de la fonction bulk d'ingestion : ddc02d3c59887a04be52341c38b5ec35394b63f1 ;
- export de la fonction bulk processeur : 9984e3474cd052343d92ad32a0e3afce02ee1a88 ;
- correction de la date source estimée dans Job/pipeline : 3fbe4086fcc466e285c805ea152e6024f6c561e7 ;
- conservation de firstHarvestAt : bc702b1925bf9cf030d21c139cddd1cf30ad1444 ;
- conservation du mode de capture par défaut existant : f361523c2125b6c5031fe4d65c9c39606afce17e.

Runner, wrapper, tests et documentation :
- runner bulk : 35e6bca3654049af03bc72064004650e58c852c7 ;
- wrapper initial : ae6ffc7210d59c4a806512c60dbff227c7010050 ;
- tests statiques : 5101632315f2af85639785bad2875a455933ff95 ;
- wrapper avec tests statiques : 85a49c5bc75917aed5814d19e69b4683e5f1ef35 ;
- préflight Deno 2 : bc82dcc4879553d79aea0752f1d6b49cec9d235b ;
- guide bulk : b404065011d33cb4775b1825cb4aa29fa09729ca ;
- prérequis Deno documenté : 5a6aee82f9b2d67d28b38e5dd356db777e555a2e.

**Validation restante :** exécuter la commande unique et examiner le rapport réel. Les tests statiques et l'exécution Deno de ce nouveau lot ne sont pas revendiqués comme déjà exécutés localement.

Ce lot écrit temporairement uniquement dans JOBLY-E2E puis nettoie ses propres objets. Il ne modifie pas JOBLY-PROD, ne déploie pas d'Edge Function, ne touche pas main, ne déclenche pas de source réelle, d'email, de SMS ou de paiement. Aucun déploiement Vercel.


### 154.8 Durcissement final du lanceur

Le wrapper archive désormais le rapport précédent sous africa-bulk-recipe-report.previous.json avant de démarrer un nouveau run, puis supprime le rapport actif périmé. Ainsi, si le préflight statique échoue ou si Deno 2.x est absent, le wrapper ouvre le journal du run courant au lieu d'afficher un ancien PASS/PARTIAL. Le test statique vérifie également l'archivage du précédent rapport et le préflight Deno.

- durcissement du rapport et du fallback Notepad : e8362a3d2a862accbeaf281d757041c95adaf9e2 ;
- verrou statique du backup de rapport et du préflight Deno : 10e10adf8d7dfb2e14e585eba2f63dbbc67a4eaa.

Le rapport précédent reste conservé sous le suffixe .previous.json. Le résultat du run courant est toujours dans africa-bulk-recipe-report.json.


### 154.9 Chargement des secrets E2E durci

Le runner récupère maintenant la clé privée E2E soit dans .e2e-fixture-runtime.json (avec environment=JOBLY-E2E et projectRef exact), soit dans .env.local / .env.e2e.local. Les URL présentes dans ces fichiers doivent toutes être exactement celles de JOBLY-E2E. Une clé JWT doit en plus porter les claims ref et role correspondants ; une clé sb_secret doit être accompagnée d'une preuve runtime ou URL E2E. Une configuration non démontrable est refusée avant toute écriture.

Pour les clés sb_secret, le client REST retire le header Authorization et conserve uniquement apikey, conformément au modèle de clés Supabase actuel. Aucun secret n'est imprimé ni écrit dans le rapport. Tests statiques associés : commit ca6930bae0d7931398968df5ce9aa46113f53941 ; chargement E2E strict : commit 259882e628cae037b0fec19d8393f1b512971511.


### 154.10 Correction du préflight statique bulk Afrique

**Rapport utilisateur du 10 novembre 2026 :** le préflight `node --test scripts/runtime-readonly-lots.test.mjs` a exécuté 11 groupes : 10 PASS, 1 FAIL. L'unique échec provenait de l'assertion du test, qui attendait l'ancienne forme `ingestHarvestItems(admin, candidates)`. Le runner actuel appelle correctement la fonction bulk avec un tableau de fixtures inline : date source réelle, date estimée, offre ancienne et délai expiré.

**Correction appliquée sur `e2e/recette` :** remplacement de l'assertion obsolète par cinq contrôles alignés sur le code existant : signature de l'appel inline, fixture source authentique, fixture estimée, cas de date ancienne et cas de délai dépassé. Commit : `149ca2c6bb3b520be705b8533e562cca91408751`. Blob du test après relecture GitHub : `4f950f4ef4252332be14a6ee171303b7718b42da`.

**Portée du résultat :** le run transmis s'est arrêté au préflight statique ; il ne constitue ni un échec du processeur Afrique ni un test runtime de l'ingestion. La recette Deno n'est pas réputée lancée et aucun résultat métier E2E n'est revendiqué. La correction a été relue dans GitHub, mais le préflight complet doit être rejoué après récupération du nouveau HEAD.

**Reprise :** depuis le worktree `%USERPROFILE%\\Jobly-e2e-recette-lot01`, récupérer `origin/e2e/recette` puis exécuter une seule fois `call e2e\\run-africa-bulk-recipe.cmd`. Le wrapper relancera les 11 contrôles et n'ouvrira la phase Deno que si le préflight passe ; il ouvre lui-même le rapport ou le journal dans Notepad. Aucun autre CMD ni commande Notepad séparée.


### 154.11 Correction de la dernière assertion du wrapper Afrique

**Rapport opérateur du 10 novembre 2026 :** après le premier correctif du test de signature d'ingestion, le préflight a exécuté 11 groupes : 10 PASS et 1 FAIL. Le groupe restant ne signalait plus une divergence du runner bulk ; il vérifiait encore à tort que le wrapper référence `run-africa-bulk-recipe.ts`.

L'audit croisé du wrapper et du runner confirme le nom et le chemin réels : `e2e/africa-bulk-recipe.ts`. Le wrapper Deno appelait déjà correctement ce fichier ; seul le test statique était erroné. La correction consiste donc à verrouiller le chemin réel `e2e\\africa-bulk-recipe.ts`, sans renommer le runner ni modifier le wrapper.

- Test corrigé : `scripts/runtime-readonly-lots.test.mjs`.
- Commit : `308ba4683ecb7fc64066d924b99d9236fbd1613a`.
- Vérification GitHub : le test doit maintenant contrôler explicitement le chemin Windows réellement appelé par le wrapper.

**Portée :** le run à 10 PASS / 1 FAIL s'est arrêté avant Deno. Aucun traitement bulk, aucune écriture JOBLY-E2E et aucun nettoyage n'ont été exécutés pendant ce run. Les 11 tests doivent être rejoués depuis le nouveau HEAD ; aucun PASS runtime Afrique n'est revendiqué.

**Reprise :** récupérer `origin/e2e/recette` puis exécuter uniquement `call e2e\\run-africa-bulk-recipe.cmd`. Le wrapper exécute les contrôles avant Deno et ouvre automatiquement le rapport courant ou le journal Notepad de repli.


### 154.12 Correction du chargement npm dans Deno 2.x

**Rapport opérateur du 10 novembre 2026 :** les 11 contrôles statiques passent, puis Deno s'arrête au chargement du module `npm:jose@6` avec l'indication qu'aucun paquet correspondant n'existe dans le dossier `node_modules`. Le handler n'est pas entré dans l'exécution de la recette ; le runner ne s'est donc pas connecté à Supabase et aucune écriture métier de ce lancement n'est démontrée.

**Cause racine :** le dépôt contient un `package.json`. Deno 2.x sélectionne alors le mode de gestion local `node_modules` manuel ; les imports npm inline des fonctions Edge, dont `npm:jose@6`, ne sont pas installés dans ce dossier.

**Correction :** le wrapper force désormais `--node-modules-dir=none` pour cette exécution isolée. Deno résout les imports npm depuis son cache global au lieu d'attendre une installation locale dans le worktree. Cela évite d'élargir `--allow-write` au dépôt et conserve les seules écritures runtime autorisées dans `artifacts/e2e`. Le test statique exige la présence de ce flag.

- Wrapper : `e2e/run-africa-bulk-recipe.cmd`.
- Test de non-régression : `scripts/runtime-readonly-lots.test.mjs`.
- Commit wrapper : `854c33f985b745d21c709813c4d166b33d24f17a`.
- Commit test : `006c100fbc0081ed00a6233100894c75a97f279b`.

**Sources de configuration Deno :** documentation officielle « Node and npm Compatibility » et « Configuration file (deno.json) », qui décrivent les modes `none`, `auto` et `manual` et confirment que le mode `none` utilise le cache global.

**Validation restante :** récupérer le HEAD mis à jour et rejouer le wrapper. Les 11 tests précédents restent PASS, mais la recette bulk n'a toujours pas exécuté l'ingestion ni le processeur. Ne revendiquer aucune écriture ou validation métier avant un rapport runtime.


### 154.13 Preuve réelle de rattachement d'une clé sb_secret au projet E2E

**Rapport opérateur du 10 novembre 2026 à 07:15:18Z :** Deno a chargé et exécuté le runner jusqu'au contrôle de configuration. Celui-ci a trouvé une clé de type `sb_secret_`, mais aucun manifeste runtime local et aucune URL E2E dans les fichiers d'environnement lus. Le contrôle a répondu `SECRET_KEY_WITHOUT_E2E_URL_PROOF`. La recette s'est arrêtée avant l'initialisation du client Supabase et avant toute écriture. Le rapport confirme `externalActions=false`, `productionModified=false`, et `cleanupVerified=false` car aucune fixture n'a été créée.

**Cause racine :** contrairement à un JWT `service_role`, une clé Supabase `sb_secret_` ne contient pas de claim local décodable permettant d'identifier le projet. La condition précédente exigeait donc un manifeste `.e2e-fixture-runtime.json` ou une URL E2E dans le même environnement local ; cette exigence n'était pas satisfaite sur le poste.

**Correction appliquée :** si la clé est de type `sb_secret_` et qu'aucune des deux preuves locales n'est disponible, le runner teste désormais la clé contre l'URL E2E épinglée dans le code, avec une requête strictement en lecture seule sur `Job` : `select id, count exact, HEAD, limit 0`. Aucun enregistrement n'est téléchargé ou modifié. La clé n'est acceptée qu'en l'absence d'erreur API sur ce projet précis. Une clé d'un autre projet doit être rejetée avant toute écriture. Le contrôle est inscrit dans le rapport sous `E2E_SECRET_KEY_PROJECT_PROOF` (PASS) en cas de succès, ou `SECRET_KEY_E2E_PROOF_FAILED` en cas de refus.

- Runner : `e2e/africa-bulk-recipe.ts`.
- Test statique de non-régression : `scripts/runtime-readonly-lots.test.mjs`.
- Commit runner : `1cc67133b117ced075014fd82a9717574c5490a6`.
- Commit test : `93e4b20cfbee10c69e3a42ce7d62939270fd885f`.

**Validation :** le rapport à 07:15:18Z est la preuve d'un arrêt de garde-fou, pas d'un échec du pipeline métier. La nouvelle validation doit reprendre depuis le HEAD mis à jour. Aucun PASS runtime n'est déclaré tant qu'un nouveau rapport complet ne le confirme pas.


### 154.14 Ordre du contrôle de clé corrigé après relecture

La relecture du commit initial §154.13 a révélé que l'ancien `insist(... SECRET_KEY_WITHOUT_E2E_URL_PROOF)` précédait encore la nouvelle sonde HEAD ; il aurait donc continué à arrêter la recette avant la preuve API. Cet oubli est corrigé : le blocage local-only est supprimé pour les clés `sb_secret_` ; en absence de manifeste/URL locale, la vérification réseau en lecture seule contre le projet épinglé est désormais effectivement atteignable. Le test statique vérifie l'absence de l'ancien blocage et la présence de la sonde HEAD.

- Runner corrigé : `2ec409023d7bedc57db7da53e8f63dafca884e29`.
- Test corrigé : `054c5ffc25e9fe3f98660a17d14a02b30d9d1e3d`.

Le commit §154.13 est supersédé pour le comportement d'exécution par cette correction. Rejouer la recette depuis le dernier HEAD ; aucun PASS runtime n'est revendiqué avant rapport.


### 154.15 Vérification API systématique des clés sb_secret

Durcissement supplémentaire : la sonde de lecture HEAD sur `Job` est maintenant exécutée pour **toute** clé `sb_secret_`, même si un manifeste runtime ou une URL E2E locale est présent. Une URL dans un fichier local n'est pas, à elle seule, une preuve cryptographique que la clé appartient au même projet. La réponse de l'API du projet E2E épinglé confirme donc la clé avant le début des écritures métier.

- Runner : `ac8f684ca9fd9a9ed237fe28c6ca49f148409bd0`.
- Test statique : `0213abc8066b8f2002089cef4169fbaeae31c726`.

Le client retire toujours le header Authorization pour cette clé et conserve uniquement `apikey`. La sonde fait un HEAD avec `limit(0)`, donc elle ne récupère aucune ligne métier. Si elle échoue, le traitement s'arrête sous `SECRET_KEY_E2E_PROOF_FAILED`. Si elle réussit, le rapport doit inclure `E2E_SECRET_KEY_PROJECT_PROOF: PASS`.


### 154.16 Reprise isolée sans exiger un worktree propre

**Retour opérateur :** le lanceur local s'est arrêté sur `WORKTREE NON PROPRE`. Ce garde-fou prévenait un checkout destructif, mais il bloquait également la recette à cause de changements locaux sans rapport avec son exécution. La tentative de création d'un second worktree a ensuite échoué sans journal exploitable ; le diagnostic redirigeait tous les messages sans garantir l'ouverture du fichier.

**Décision corrective :** ne plus exiger que le worktree existant soit propre et ne plus créer de second worktree. Le lancement isolé récupère la branche distante avec `git fetch`, exporte exactement `FETCH_HEAD` avec `git archive`, puis extrait ce snapshot versionné dans un dossier temporaire unique. Il exécute les tests et la recette depuis cette copie. Le worktree utilisateur et ses modifications non commitées ne sont ni checkoutés, ni nettoyés, ni écrasés. Les secrets runtime continuent d'être lus depuis le checkout canonique `%USERPROFILE%\\Jobly`, pas depuis l'archive temporaire.

**Traçabilité :** le lanceur capture séparément les erreurs Git/fetch/archive dans un journal temporaire et l'ouvre dans Notepad si l'archive ne peut pas être préparée. Une fois le wrapper E2E démarré, son propre journal et son rapport sont ouverts suivant le comportement déjà testé. Il n'y a ainsi plus de sortie silencieusement perdue.

**État métier :** ce changement ne modifie aucun contrôle de la clé privée, aucune permission Supabase et aucune assertion de l'ingestion. La sonde `E2E_SECRET_KEY_PROJECT_PROOF` reste obligatoire pour chaque `sb_secret_` avant toute écriture. La recette n'est toujours pas réputée exécutée tant que le rapport final n'indique pas le traitement et le nettoyage vérifié.


### 154.17 Lanceur isolé observable — remplacement de la commande PowerShell silencieuse

**Problème de la tentative précédente :** la commande PowerShell monolithique n'affichait visiblement que `FETCH ...` et `From https://github.com/...`. Elle envoyait la suite de ses sorties dans un journal temporaire au nom aléatoire, puis ouvrait Notepad en arrière-plan en cas d'échec. L'opérateur ne pouvait donc pas distinguer un blocage Git, un échec d'archive, un prérequis local absent ou une erreur runtime.

**Nouveau lanceur :** `e2e/run-africa-bulk-isolated.ps1`.
- ne vérifie plus `git status --porcelain` et ne demande jamais un worktree propre ;
- récupère un SHA distant unique de `e2e/recette`, puis exporte exactement ce commit par `git archive` dans un dossier temporaire ;
- laisse intacts tous les fichiers suivis, non suivis et modifiés du worktree opérateur ;
- accepte le SHA déjà récupéré par le bootstrap (`-FetchedSha`) pour ne pas faire deux fetchs ;
- valide l'URL `origin`, le SHA, les fichiers, le garde-fou de projet et le mode Deno avant la recette ;
- écrit chaque étape et chaque sortie native dans `%TEMP%\\jobly-africa-bulk-launch.log` et les affiche aussi dans la fenêtre ;
- lance les 11 tests dans l'archive temporaire, puis le runner Deno avec lecture limitée au checkout source et à l'archive, écriture limitée aux artefacts temporaires et réseau limité au projet E2E + registre npm ;
- ouvre le rapport dans Notepad, ou le journal stable en cas d'échec ;
- ne retourne le code 0 que si le rapport métier est `PASS` **et** `cleanupVerified=true`. Un rapport `FAIL` ou `PARTIAL` retourne 2 même si Deno a terminé normalement.

**Bootstrap de la commande :** depuis le worktree existant, un unique CMD récupère le script PowerShell depuis `FETCH_HEAD` dans `%TEMP%`, puis le lance en lui passant le SHA exact. Aucun deuxième worktree Git n'est créé. Les secrets sont toujours lus depuis `%USERPROFILE%\\Jobly`; ils ne sont pas copiés dans l'archive, ni dans le journal.

Commits : lanceur initial `84eafb13c61815dbcef8ad151e34b095e91b73b7`, contrôle strict du rapport `05d1e816bffcf0c0cd139de9796206496226b03e`, réutilisation du SHA de bootstrap `b8d48634eb041a1717e4240b6b76488b3a0bd879`, test statique associé `18f769deb28626a1de8c5c046ff5d8f50551b36d`.

**Prudence de validation :** le nouveau lanceur est versionné et relu sur GitHub ; son exécution Windows réelle reste à faire. Aucun résultat E2E n'est anticipé et aucun accès de Production n'est autorisé.


### 154.18 Correctif de capture de sortie PowerShell

La relecture du nouveau lanceur a identifié un risque de conversion d'un tableau PowerShell imbriqué lors de la récupération de l'URL Git et du SHA. La fonction native utilise maintenant un paramètre explicite `-Capture` et retourne une chaîne jointe uniquement pour les commandes qui ont besoin d'une valeur. Les commandes silencieuses (archive, tests et Deno) restent journalisées/affichées sans ambiguïté.

- Lanceur : `7a56713bed666f3b43f38d84bf45870e5b05ee17`.
- Test statique : `3cbe8ceda6625ecbb8dea96a49e1c843ae058e0e`.

Le rapport n'est déclaré PASS que lorsque le statut du JSON est PASS et que le nettoyage est vérifié. La validation Windows reste à effectuer.


### 154.19 Bootstrap CMD téléchargeable sans checkout — affichage explicite après FETCH

**Cause de l'affichage tronqué rapporté par l'opérateur :** la tentative précédente utilisait un long `powershell -Command` inline ; l'utilisateur n'observait que `FETCH ...` puis `From https://github.com/...`, sans jalons permettant de confirmer l'étape suivante. Le second lanceur PowerShell existe dans la branche, mais n'est pas présent dans le worktree local tant que son fichier n'a pas été extrait explicitement.

**Correctif :** ajout de `e2e/run-africa-bulk-bootstrap.cmd`, un bootstrap CMD versionné qui affiche les étapes numérotées, le code retour Git, le SHA récupéré et le code retour PowerShell. Il accepte un SHA en argument pour éviter un deuxième fetch, extrait le script PowerShell avec `git show` et l'exécute avec le SHA exact. Le bootstrap vérifie l'URL du remote autorisé, la longueur du SHA et la taille du fichier extrait ; il conserve un journal fixe dans `%TEMP%\\jobly-africa-bulk-bootstrap.log`, l'ouvre dans Notepad et garde la fenêtre ouverte avec `pause`.

Le bootstrap ne fait aucun checkout, reset, clean, stash ni contrôle `git status`. Le worktree local peut rester modifié. Le PowerShell exécute seulement un snapshot `git archive` du commit distant dans un dossier temporaire séparé.

Correctifs successifs du bootstrap et de son contrôle :
- fichier bootstrap initial : `989b638ae939d333c2153c42ab3bb711a34ff040` ;
- contrôle de longueur SHA : `480fd28c511d47f19feb404f95544bf4b4719dbc` ;
- test des étapes visibles : `b78b6bda3a092ab7282d4a89b192c7c789d5253f` ;
- réutilisation du SHA transmis : `f71edcbd984af2f5cb28fc22fc4bc3249960fb7f` ;
- test du transfert SHA : `c00eddc81b18ef4cee70e5aa4ce2497daab1a9f7` ;
- documentation opérateur : `320a4b0ea122569bd5b742077da3f39c939b87d2`.

**Commande de démarrage locale :** une première commande CMD native récupère `e2e/recette`, extrait le bootstrap CMD avec `git show` dans `%TEMP%`, puis l'appelle en transmettant le SHA. Le bootstrap affiche ensuite ses cinq jalons, puis le PowerShell affiche le préflight statique, Deno, la preuve de clé, le rapport métier et le nettoyage.

**Validation :** le contenu versionné et les assertions statiques ont été relus sur GitHub ; le lancement réel de cette nouvelle chaîne CMD/PowerShell sous Windows reste à confirmer par le prochain rapport opérateur. Aucun résultat d'ingestion, de traitement ou de nettoyage n'est revendiqué avant ce rapport.


### 154.20 Commande unique de récupération et d'exécution du bootstrap

La reprise opérateur commence directement avec cette commande CMD native, qui évite PowerShell pendant l'étape de récupération initiale :

```cmd
cd /d "%USERPROFILE%\Jobly-e2e-recette-lot01" && echo [BOOTSTRAP 1/3] FETCH && git fetch --no-tags origin refs/heads/e2e/recette && echo [BOOTSTRAP 2/3] FETCH_TERMINE && git show FETCH_HEAD:e2e/run-africa-bulk-bootstrap.cmd > "%TEMP%\jobly-africa-bulk-bootstrap.cmd" && echo [BOOTSTRAP 3/3] LANCEMENT && call "%TEMP%\jobly-africa-bulk-bootstrap.cmd" FETCH_HEAD
```

Cette première commande imprime un marqueur après `git fetch`, extrait le bootstrap depuis le commit distant exact et l'appelle avec `FETCH_HEAD`. Le bootstrap résout ce SHA sans refaire de fetch, extrait le PowerShell dans le dossier temporaire puis lance le snapshot isolé. Aucun fichier du worktree n'est remplacé. En cas de sortie après un marqueur donné, le dernier marqueur identifie précisément le point de blocage. Le bootstrap ouvre son journal et garde la fenêtre ouverte.

Le dernier ajustement CMD du SHA (labels explicites hors blocs parenthésés) est commité dans `bdb400b18823dd2604412e5c3099d9c5d669f178`, avec verrou statique `0ac334492c4b83564b5ffb6843a6a04fae143fb8`. La commande est aussi publiée dans `e2e/README.md`.

Validation restante : exécution réelle de cette commande par l'opérateur. Les statiques, la preuve de clé, l'ingestion, le processeur et le nettoyage ne sont pas déclarés exécutés par la seule présence de ce lanceur.


### 154.21 Marqueur visible pour la branche FETCH_HEAD du bootstrap

Le bootstrap est maintenant appelé avec l'argument `FETCH_HEAD` depuis la commande unique opérateur. Cette voie saute volontairement un second fetch, résout le commit déjà récupéré dans le dépôt local, affiche explicitement l'étape `[2/5] Reutilisation du FETCH_HEAD deja recupere...`, puis extrait le lanceur PowerShell depuis ce SHA. Le marqueur de réutilisation est verrouillé par le test statique.

- CMD : `c4d86c64e3edf252a798775acc27972e76a48632`.
- Test : `4d57043244c9933c23c2d5cc0dd226442eec0cf7`.

**Commande à exécuter depuis un seul CMD ouvert :**

```cmd
cd /d "%USERPROFILE%\Jobly-e2e-recette-lot01" && echo [BOOTSTRAP 1/3] FETCH && git fetch --no-tags origin refs/heads/e2e/recette && echo [BOOTSTRAP 2/3] FETCH_TERMINE && git show FETCH_HEAD:e2e/run-africa-bulk-bootstrap.cmd > "%TEMP%\jobly-africa-bulk-bootstrap.cmd" && echo [BOOTSTRAP 3/3] LANCEMENT && call "%TEMP%\jobly-africa-bulk-bootstrap.cmd" FETCH_HEAD
```

Cette commande ne fait aucun checkout et ne touche pas aux changements du worktree. Si l'affichage s'arrête avant `[BOOTSTRAP 2/3] FETCH_TERMINE`, l'arrêt est dans Git fetch ; entre les marqueurs 2 et 3, dans l'extraction du bootstrap ; après le marqueur 3, les cinq jalons internes et le journal Notepad indiquent l'étape exacte.


### 154.22 Correction du blocage au stade FETCH et journalisation en direct

**Diagnostic confirmé par le chemin d'exécution :** la commande précédente exécutait `git fetch` avant d'extraire et de lancer `run-africa-bulk-isolated.ps1`. Le journal `jobly-africa-bulk-launch.log` était donc normal qu'il n'existe pas encore : son initialisation se trouvait dans le PS1, après le fetch. En outre, la fonction `Invoke-Native` capturait les sorties des processus dans un tableau PowerShell avant de les afficher ; même après le démarrage du lanceur, les étapes Git/tests/Deno pouvaient donc sembler silencieuses jusqu'à leur terminaison.

**Corrections de code sur `e2e/recette` :**
- `e2e/run-africa-bulk-bootstrap.cmd` crée son journal stable avant tout fetch, limite la récupération à la tête de branche avec `--depth=1`, force la progression avec `--progress` et désactive les invites interactives Git (`GIT_TERMINAL_PROMPT=0`, `GCM_INTERACTIVE=never`). Un problème d'identification doit désormais produire un code d'erreur explicite plutôt qu'attendre une invite cachée.
- `e2e/run-africa-bulk-isolated.ps1` conserve la capture uniquement pour les deux petites valeurs nécessaires (URL du remote et SHA). Les autres processus sont exécutés dans un pipeline `Tee-Object` qui retransmet leurs sorties au terminal et au fichier stable pendant l'exécution. Le fetch de secours interne est lui aussi superficiel et progressif.
- `scripts/runtime-readonly-lots.test.mjs` vérifie le fetch superficiel/progressif, la journalisation en streaming, la désactivation des invites et l'initialisation du journal avant le fetch.
- `e2e/README.md` remplace la commande de reprise précédente par sa version superficielle et non interactive.

**Commits :** bootstrap `50c7a1b151d5e2b325c523f394b5a00c49b8dd33` ; lanceur PowerShell `75151f6d89f28ec0a37796dbc5922e5b641526f8` ; test streaming `a6df3f65fce7624b7df6aa0544275c56f4711bc8` ; assertion de journal précoce `dace455f5dba0bac5da12314101983145c657a9a` ; README `bdd9949667a1cca1d65b99420735b51f5b2da04d`.

**Relecture :** les fichiers modifiés ont été relus depuis GitHub sur `e2e/recette`. Le préflight Node et l'exécution réelle Windows ne sont pas exécutés depuis cette session ; aucun PASS statique ou runtime n'est inventé. La validation métier attend toujours un rapport JOBLY-E2E avec `status=PASS` et `cleanupVerified=true`.

**Reprise unique mise à jour :**

```cmd
cd /d "%USERPROFILE%\Jobly-e2e-recette-lot01" && set "GIT_TERMINAL_PROMPT=0" && set "GCM_INTERACTIVE=never" && echo [BOOTSTRAP 1/3] FETCH && git fetch --depth=1 --progress --no-tags origin refs/heads/e2e/recette && echo [BOOTSTRAP 2/3] FETCH_TERMINE && git show FETCH_HEAD:e2e/run-africa-bulk-bootstrap.cmd > "%TEMP%\jobly-africa-bulk-bootstrap.cmd" && echo [BOOTSTRAP 3/3] LANCEMENT && call "%TEMP%\jobly-africa-bulk-bootstrap.cmd" FETCH_HEAD
```

Le bootstrap ouvre son journal `%TEMP%\jobly-africa-bulk-bootstrap.log`. Une fois le lanceur PowerShell démarré, celui-ci ouvre le rapport runtime ou, en cas d'arrêt avant rapport, `%TEMP%\jobly-africa-bulk-launch.log`. Aucun checkout, reset, clean, stash, merge ni déploiement n'est effectué.


**Ajustement final après revue de flux PowerShell :** les lignes natives sont maintenant relayées après `Tee-Object` par `ForEach-Object { Write-Host ... }`. Cela garantit qu'elles restent visibles même lorsque l'appelant termine l'invocation par `Out-Null`, tout en conservant leur copie dans le journal. Correctif : `e73f2ebde7374fa1856afb4ce116a58c4d409875` ; assertion complémentaire : `43fc0aca4e8c64e5288bc8d335d006fc395824c8`.

Ce dernier ajustement est relu sur GitHub. La validation Windows reste nécessaire ; aucun rapport runtime PASS n'est revendiqué.


### 154.23 Journal créé avant le tout premier accès réseau

Un dernier contrôle a montré que le premier fetch est lancé par la commande CMD d'amorçage, avant que le fichier bootstrap téléchargé puisse s'exécuter. Le log du bootstrap seul ne suffisait donc pas à couvrir un blocage durant ce premier fetch.

**Correction finale :** la commande de reprise documentée dans `e2e/README.md` initialise maintenant `%TEMP%\jobly-africa-bulk-bootstrap.log` et y inscrit le jalon `BOOTSTRAP 1/3 FETCH` avant d'appeler Git. Le bootstrap téléchargé conserve ce fichier au lieu de le tronquer. Si la récupération s'arrête, le journal existe donc déjà et peut être ouvert par Notepad sans proposition de créer un nouveau document. La progression Git forcée reste affichée dans la fenêtre CMD.

- Bootstrap qui préserve le journal préalable : `36e5f62dbbc7b1b07b62c40a81b7c5323bb9df46`.
- README avec journal précréé : `d34f453019b75e54e08b2f47b1fc92599bd5ca15`.
- Test qui vérifie l'ordre journal puis fetch : `3a8faf64b7722b637f124c899ab3091e13ebb93d`.

**Reprise opérateur à utiliser désormais :**

```cmd
cd /d "%USERPROFILE%\Jobly-e2e-recette-lot01" && set "GIT_TERMINAL_PROMPT=0" && set "GCM_INTERACTIVE=never" && set "BOOTLOG=%TEMP%\jobly-africa-bulk-bootstrap.log" && (echo JOBLY AFRICA BULK BOOTSTRAP > "%BOOTLOG%") && echo [BOOTSTRAP 1/3] FETCH && echo [BOOTSTRAP 1/3] FETCH>>"%BOOTLOG%" && git fetch --depth=1 --progress --no-tags origin refs/heads/e2e/recette && echo FETCH_EXIT_CODE=0>>"%BOOTLOG%" && echo [BOOTSTRAP 2/3] FETCH_TERMINE && git show FETCH_HEAD:e2e/run-africa-bulk-bootstrap.cmd > "%TEMP%\jobly-africa-bulk-bootstrap.cmd" && echo [BOOTSTRAP 3/3] LANCEMENT && call "%TEMP%\jobly-africa-bulk-bootstrap.cmd" FETCH_HEAD
```

Le journal de pré-démarrage se trouve à `%TEMP%\jobly-africa-bulk-bootstrap.log`. Le lancer Notepad après une éventuelle interruption au fetch ne doit plus demander de créer le fichier. La recette Windows et le rapport métier restent à exécuter ; aucun PASS runtime n'est revendiqué.


### 154.24 Réparation de l'assertion TEMP et du code de sortie du bootstrap après le premier run Windows

**Rapport Windows reçu :** le snapshot et Deno 2.9.8 ont bien démarré. Le préflight Node a exécuté 11 groupes : 10 PASS, 1 FAIL. L'unique échec était une assertion du test statique qui attendait à tort `Join-Path $env.TEMP`; le lanceur emploie la syntaxe correcte `Join-Path $env:TEMP`. La recette Deno métier n'a pas été lancée.

**Corrections publiées :**
- `scripts/runtime-readonly-lots.test.mjs` : assertion corrigée pour exiger `Join-Path $env:TEMP` — commit `697daf75a2a2b472d4c2f9a395670814ff9ae675`.
- `e2e/run-africa-bulk-bootstrap.cmd` : capture du statut de PowerShell et de Git avec des branches `if errorlevel`, et non une expansion directe `%ERRORLEVEL%`. Cette voie évite une variable d'environnement homonyme qui pourrait masquer le pseudo-variable CMD — commit `11ea80a416982fbfb28a4c705d36c9cbdea03b45`.
- `scripts/runtime-readonly-lots.test.mjs` : garde de non-régression sur les codes retour 0/1/2 — commit `6bb38037d2745ca3143e2928cdb26ebeacd6baef`.

**État :** le blocage observé est diagnostiqué et corrigé dans la branche `e2e/recette`. Le résultat `10 PASS / 1 FAIL` correspond à l'ancien snapshot `fcdc86d3c3d195597bbc3b6627a3b0e175cc0ffb`, pas aux fichiers corrigés après ce run. Il faut exécuter le nouveau HEAD pour prouver le préflight. Aucun traitement d'offres, aucune écriture métier ni aucun nettoyage n'ont été exécutés par le lancement signalé.

**Reprise :** relancer la commande unique de §154.23. Elle récupère la nouvelle tête de `e2e/recette`, crée le journal avant le fetch et appelle le nouveau bootstrap. Le jalon `ISOLATED_EXIT_CODE` doit maintenant afficher une valeur numérique. Aucun PASS runtime ne doit être revendiqué avant un rapport complet indiquant `status=PASS` et `cleanupVerified=true`.

## 155. Clôture ciblée — recette bulk Afrique → catalogue Talent

**Périmètre :** \`e2e/recette\`, PR #266. \`main\` n'est ni modifiée ni fusionnée ; aucun déploiement ni aucune écriture JOBLY-PROD.

### Corrections versionnées
- Le runner Deno Afrique est exclu du \`tsconfig\` Next.js et contrôlé par \`deno check\`.
- Le processeur Afrique expose un type de retour explicite pour ses compteurs.
- L'API détail Talent utilise la même priorité de date que le flux : publication source, première collecte, puis date de création en dernier recours. Le marqueur estimé est renvoyé.
- Le snapshot local du lot Afrique n'exige que la fixture Talent ; une fixture Recruteur absente ne bloque plus ce scénario.
- Le workflow de vérification exécute aussi les tests statiques du lanceur bulk.
- L'action manuelle globale a été réduite à un préflight CI sans secret privé ; elle ne simule pas les parcours Auth locaux.

### Preuves CI déjà observées
Sur le commit \`02f92d288277c844d61a5ff8733ec15998d14c6d\`, les résultats suivants ont été confirmés :
- \`Verify offer pipeline\` : PASS ; les étapes \`deno check e2e/africa-bulk-recipe.ts\`, \`pnpm typecheck\` et \`pnpm build\` sont PASS.
- \`Jobly CI — Typecheck & Build\` : PASS, y compris les migrations isolées, le typecheck et le build.
- \`Africa Source Shadow Crawl\` : le job de validation PR est PASS ; le job de crawl effectif est SKIPPED, comme prévu pour \`pull_request\`.
- \`Verify Africa source registry\` : PASS.
- \`Jobly Security Core — isolated migration tests\` : PASS.

Les validations ciblées de code et de build sont stabilisées sur le SHA indiqué ; le rapport runtime local `JOBLY-E2E` reste la preuve métier finale.

### Couverture du nouveau lot bulk
Un lancement unique exécute le préflight statique, le build local, le serveur Next lié à \`127.0.0.1:3217\`, l'authentification Talent, l'ingestion des candidates, le vrai processeur, les assertions de persistance, l'API du flux Afrique, les deux détails d'offres, le nettoyage ciblé et l'arrêt du serveur.

Résultats attendus : 2 offres acceptées, 2 rejetées à l'ingestion ; 5 captures traitées par le processeur (2 offres créées, 2 expirées, 1 mise en quarantaine), 0 erreur de persistance ; les 2 offres synthétiques doivent apparaître dans le flux Talent Afrique ; la date source doit rester réelle et la date fallback estimée doit provenir de la première collecte.

Les écritures temporaires sont limitées à \`JOBLY-E2E\`. Le rapport n'est PASS que si toutes les vérifications réussissent, \`cleanupVerified=true\` et le serveur local est arrêté. L'ouverture de session de la fixture Talent peut modifier des métadonnées Auth d'appareil ; le rapport l'indique. Aucun e-mail, SMS, paiement, candidature externe ou compte Production n'est utilisé.

### Commande CMD unique
\`\`\`cmd
call "%USERPROFILE%\\Jobly-e2e-recette-lot01\\e2e\\run-africa-bulk-bootstrap.cmd"
\`\`\`

Le bootstrap récupère le commit de recette exact et travaille sur un snapshot temporaire. Il ne fait aucun checkout, reset, clean, stash, merge ou déploiement. Il ouvre le rapport JSON dans Notepad ; en cas de blocage, il ouvre le journal de lancement, et le bootstrap ouvre son propre journal.

**Statut de clôture de cette entrée :** corrections et recette préparées dans la branche ; CI du nouveau SHA à confirmer ; recette runtime locale \`NOT RUN\` jusqu'au rapport JSON. Aucun PASS métier n'est déduit des seuls contrôles CI.
