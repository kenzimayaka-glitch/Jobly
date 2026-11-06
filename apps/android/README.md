# Jobly Android — navigateur de candidature avec J’IA

Ce projet est un module Android natif autonome. Il ne modifie pas le runtime du site Web ni celui de la PWA installée depuis Chrome.

## Parcours

1. L'application Android charge Jobly dans une seule instance de WebView.
2. Lorsqu'un talent appuie sur « Postuler » pour une offre externe, le site envoie un message natif via AndroidX WebKit.
3. La même WebView ouvre le site du promoteur. La barre native garde les actions « J’IA », « Chrome » et « Jobly ».
4. « J’IA » déclenche, uniquement après le clic du talent, une lecture des libellés visibles du formulaire (type, obligatoire, options). Aucune valeur saisie n'est lue.
5. Le contexte est transmis à la route Jobly /jia/android-assist. Le talent peut demander des propositions à J’IA, puis saisir ou coller les réponses qu’il approuve dans l’écran de validation.
6. « Appliquer les réponses validées » renvoie vers le formulaire et remplit uniquement les champs compatibles encore vides, si l’index, le libellé et le type correspondent exactement.
7. Les iframes du promoteur restent intégrées à leur page ; les navigations principales restent contrôlées par le shell.
8. Les réponses ne sont insérées que si le formulaire est toujours sur la même origine HTTPS que lors de son analyse.
9. Les champs déjà renseignés restent inchangés ; leur valeur est vérifiée localement uniquement pour éviter l’écrasement. Les listes déroulantes ne sont sélectionnées que si une option correspond exactement à la réponse validée.
10. Si le site bloque WebView ou échoue à charger, l'application propose une ouverture dans Chrome.

## Garde-fous

- Le pont natif est enregistré uniquement sur l'origine HTTPS de Jobly et rejette les messages venant d'iframes.
- Aucun pont JavaScript natif n'est exposé au site externe.
- Seules les URL HTTPS publiques sont ouvertes dans le navigateur intégré.
- Les champs password, hidden et file, ainsi que les champs de code de sécurité usuels, ne sont pas lus.
- Aucun contenu de champ, mot de passe, code OTP, fichier ou donnée bancaire n'est collecté.
- J’IA prépare des réponses consultatives ; le candidat doit relire et approuver chaque réponse avant l’insertion.
- Le remplissage ignore les champs password, hidden, file, checkbox, radio, CAPTCHA, codes de sécurité, consentements/conditions, champs bancaires et autres types non pris en charge.
- Aucun CAPTCHA, connexion, consentement, clic sur « Envoyer », envoi de formulaire ou soumission de candidature n'est automatisé.
- Les réponses approuvées sont transmises au WebView local uniquement pour l’insertion. Le navigateur vérifie localement si un champ est vide ; les valeurs déjà présentes ne sont ni copiées, ni transmises, ni écrasées.
- L'envoi final reste une action du talent.

## Performance

Le shell Android réutilise une seule WebView pour Jobly, le formulaire externe et la page d'assistance. Il ne crée pas une seconde WebView pour J’IA. Le module n'est pas chargé par les pages Web/PWA : il existe uniquement dans l'application Android native.

## Ouvrir et compiler

Ouvre le dossier apps/android dans Android Studio, installe Android SDK 36 et utilise JDK 17.

Commande avec Gradle 8.13 installé :

    gradle -p apps/android :app:assembleDebug

Pour compiler avec une URL Vercel de prévisualisation :

    gradle -p apps/android -PjoblyBaseUrl=https://TON-URL-VERCEL :app:assembleDebug

L'URL par défaut est https://jobly-c0651.vercel.app. Le binaire debug est produit dans apps/android/app/build/outputs/apk/debug/.

## État de livraison

Le code source et le pipeline CI Android sont versionnés. Le build CI doit réussir avant toute fusion. La publication Play Store, la signature release et les tests sur appareils physiques restent des étapes séparées.

## Confirmation Mobile Money dans le même APK

Le téléphone Android marchand utilise ce même package `com.jobly.android` et la même WebView Jobly. Aucun second APK ou service compagnon n'est créé.

1. Un ADMIN/FINANCE ouvre `/admin/payments/sms` directement dans l'APK du téléphone qui porte la SIM marchande.
2. Il choisit l'opérateur, renseigne le compte marchand et saisit les identifiants d'expéditeur exactement observés sur des SMS réels.
3. Le serveur provisionne le téléphone et retourne un jeton à usage d'appairage. Le pont WebView natif, limité à l'origine HTTPS Jobly et au document principal, remet immédiatement ce jeton au composant Android.
4. Le jeton et la liste exacte des expéditeurs sont chiffrés AES-GCM dans les préférences privées à l'aide d'une clé Android Keystore. Le SMS lui-même est chiffré avant d'être mis en file dans WorkManager.
5. Le receiver Android ne transmet que les SMS dont l'expéditeur correspond à la liste locale. WorkManager envoie le message chiffré vers `/api/payments/sms/ingest` avec le jeton du téléphone.
6. Le serveur vérifie à nouveau l'identifiant d'appareil, le jeton, l'expéditeur, le numéro marchand, le montant, la devise et la référence opérateur. Le corps brut n'est pas persisté côté serveur.

### Permission SMS restreinte

Le manifeste déclare `RECEIVE_SMS` et l'application demande l'autorisation Android après l'appairage. Cette permission est traitée comme dangereuse et restreinte par certaines versions Android ; selon le canal d'installation, un installateur peut devoir l'autoriser explicitement. Le simple fait de lister la permission et d'afficher la demande ne garantit pas son attribution. Il faut contrôler le résultat sur le modèle Android réel et le mode d'installation utilisé pour le téléphone marchand.

Le receiver ne lit pas l'historique de la boîte SMS. Il écoute l'événement système reçu et filtre les identifiants d'expéditeur avant toute mise en file d'envoi. Les messages mis en file sont chiffrés sur l'appareil. La révocation dans l'administration Jobly supprime également le jeton local depuis l'écran APK.
