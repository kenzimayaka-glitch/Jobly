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

1. Un ADMIN configure les codes marchands MTN/Orange et les numéros de compte depuis `/admin/payments/sms`. Ces paramètres sont centralisés côté serveur et ne sont pas codés dans l'application.
2. L'administrateur ouvre le même écran dans l'APK du téléphone qui porte la SIM de réception, puis appaire le profil avec les identifiants d'expéditeur SMS exacts, relevés sur de vrais messages opérateur.
3. Le serveur provisionne le téléphone et retourne un jeton d'appairage unique. Le pont natif limité à l'origine HTTPS Jobly et au document principal remet le jeton au composant Android.
4. Le jeton et la liste d'expéditeurs sont chiffrés AES-GCM avec une clé Android Keystore. Le receiver ne met en file que les SMS d'un expéditeur autorisé ; le corps est chiffré avant stockage local.
5. WorkManager transmet le SMS vers `/api/payments/sms/ingest` en HTTPS. Le serveur vérifie à nouveau appareil, jeton, expéditeur, compte marchand, montant, devise et référence transactionnelle. Le SMS brut n'est pas conservé en base.
6. La révocation supprime le profil et ses tâches locales dans l'APK.

### Permission SMS restreinte

Le manifeste déclare `RECEIVE_SMS` et l'APK demande l'autorisation après l'appairage. Certaines versions Android et certains modes d'installation appliquent une restriction supplémentaire. L'appairage et le build APK ne prouvent donc pas que la permission est réellement accordée. Il faut vérifier l'état de permission et la réception d'un SMS opérateur sur le modèle physique qui portera la SIM marchande.
