# J’IA Chrome Extension — dossier de publication

## État vérifié

- Version embarquée : `0.2.0` (Manifest V3).
- Distribution actuelle : archive ZIP servie par Jobly, installation manuelle « Load unpacked » en mode développeur.
- Cible actuelle : Chrome 116+ sur ordinateur ; le parcours Android reste celui de la PWA.
- L’extension démarre en pause et nécessite une activation explicite.
- L’inspection de formulaire est opt-in, par origine et déclenchée par l’utilisateur ; elle ne lit pas les valeurs saisies et ne remplit ni ne soumet un formulaire.
- La publication Chrome Web Store n’a pas été effectuée.

## Corrections incluses dans la branche de recette

- Verrouiller l’inspection des champs et l’assistance tant que J’IA est en pause.
- Effacer les métadonnées de formulaire mémorisées en session lorsque J’IA est mise en pause.
- Retirer les paramètres de requête et le fragment de l’URL inspectée avant sa conservation en session.
- Décrire dans la politique de confidentialité les métadonnées inspectées, le stockage temporaire, l’usage dans l’assistance J’IA et les moyens de révocation.

## Conditions à satisfaire avant la soumission Store

- Créer et approuver les icônes de l’extension aux tailles requises par Chrome, dont 128×128, puis les référencer dans `manifest.json`.
- Préparer des captures d’écran réelles du panneau latéral et du parcours d’installation, sans donnée personnelle ni site tiers identifiable.
- Rédiger le titre, la description courte et la description détaillée en français et en anglais.
- Vérifier la liste minimale des permissions et justifier chacune d’elles dans la fiche Store ; confirmer que les permissions d’hôte restent optionnelles et limitées à l’origine choisie.
- Compléter la politique de confidentialité avec l’identité juridique, l’adresse et le contact du responsable du traitement, ainsi que les durées de conservation précises.
- Rédiger les déclarations de confidentialité du Chrome Web Store en cohérence exacte avec le code et la politique de confidentialité.
- Valider un paquet ZIP de release reproductible, son numéro de version, le manifeste, les icônes, les scripts inclus et les instructions de support.
- Exécuter la recette bulk, le typecheck, le build et un test manuel sur un profil Chrome propre, avec permission accordée/refusée, pause/reprise et désinstallation.
- Le propriétaire du compte développeur Google doit examiner puis envoyer lui-même la soumission depuis ce compte ; la publication reste soumise à la revue Google.

## État de publication

**NON PUBLIÉE — bêta développeur uniquement.** La soumission au Chrome Web Store n’est pas incluse dans cette correction de code. Aucun compte, jeton ou identifiant privé de publication ne doit être placé dans le dépôt ni partagé dans la conversation.

## Critère d’acceptation

La publication peut être considérée prête uniquement lorsque les conditions Store ci-dessus sont documentées, les tests et builds sont PASS, le paquet final a été inspecté et le responsable a approuvé la fiche et les déclarations de confidentialité. Le statut « publiée » ne peut être annoncé qu’après confirmation visible de Google.
