# Jobly Android — navigateur de candidature avec J’IA

Ce projet est un module Android natif autonome. Il ne modifie pas le runtime du site Web ni celui de la PWA installée depuis Chrome.

## Parcours

1. L'application Android charge Jobly dans une seule instance de WebView.
2. Lorsqu'un talent appuie sur « Postuler » pour une offre externe, le site envoie un message natif via AndroidX WebKit.
3. La même WebView ouvre le site du promoteur. La barre native garde les actions « J’IA », « Chrome » et « Jobly ».
4. « J’IA » déclenche, uniquement après le clic du talent, une lecture des libellés visibles du formulaire (type, obligatoire, options). Aucune valeur saisie n'est lue.
5. Le contexte est transmis à la route Jobly /jia/android-assist. Le talent revient au formulaire avec le bouton « Formulaire ».
6. Si le site bloque WebView ou échoue à charger, l'application propose une ouverture dans Chrome.

## Garde-fous

- Le pont natif est enregistré uniquement sur l'origine HTTPS de Jobly et rejette les messages venant d'iframes.
- Aucun pont JavaScript natif n'est exposé au site externe.
- Seules les URL HTTPS publiques sont ouvertes dans le navigateur intégré.
- Les champs password, hidden et file, ainsi que les champs de code de sécurité usuels, ne sont pas lus.
- Aucun contenu de champ, mot de passe, code OTP, fichier ou donnée bancaire n'est collecté.
- J’IA prépare des réponses consultatives ; aucun CAPTCHA, connexion, envoi de formulaire ou soumission de candidature n'est automatisé.
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
