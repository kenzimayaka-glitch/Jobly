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

## Intégrité APK et signature de publication

- Le shell vérifie le nom de package et l'empreinte SHA-256 du certificat qui a réellement signé l'APK installé, avant de créer la WebView.
- Une version release est refusée si l'empreinte attendue n'est pas renseignée, si le package est débogable ou si le certificat de signature ne correspond pas.
- Les builds debug restent utilisables pour les tests locaux et l'émulateur. Ils ne constituent pas un APK de production.
- La signature release utilise un keystore privé fourni à Gradle, jamais stocké dans le dépôt.

Variables nécessaires pour compiler un APK release :

| Variable | Valeur attendue |
| --- | --- |
| `JOBLY_ANDROID_KEYSTORE_PATH` | Chemin du keystore privé sur la machine/runner de build |
| `JOBLY_ANDROID_KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `JOBLY_ANDROID_KEY_ALIAS` | Alias de la clé de signature |
| `JOBLY_ANDROID_KEY_PASSWORD` | Mot de passe de la clé |
| `JOBLY_ANDROID_RELEASE_CERT_SHA256` | Empreinte SHA-256 du certificat, 64 caractères hexadécimaux (les deux-points sont acceptés) |

L'empreinte se relève avec `keytool -list -v -keystore <keystore> -alias <alias>`. Dans un pipeline, conserver le keystore et les mots de passe dans les secrets CI, et matérialiser le fichier temporairement sur le runner. Ne jamais committer le keystore, un mot de passe, ni un fichier `*.jks`/`*.keystore`.

Exemple de compilation après configuration des variables :

    gradle -p apps/android :app:assembleRelease

Le build release échoue intentionnellement si la signature et son empreinte ne sont pas fournies. Aucun certificat de publication n'est encore provisionné dans ce dépôt ; le contrôle bloque donc une release tant que l'identité de signature officielle n'a pas été confirmée.

### Attestation matérielle distante

L'APK demande au serveur un nonce aléatoire de 256 bits, puis crée une clé EC P-256 dans Android Keystore avec `setAttestationChallenge`. La clé privée ne quitte pas Android Keystore ; seule la chaîne X.509 est transmise au serveur.

Le serveur :
- consomme le nonce une seule fois et dans une fenêtre de cinq minutes ;
- vérifie la chaîne de certificats vers les racines Android officielles publiées par Google ;
- consulte la liste officielle de révocation des clés d'attestation ;
- contrôle l'extension Android Key Attestation, le package `com.jobly.android`, l'empreinte du certificat de signature, le niveau TEE/StrongBox, `deviceLocked=true` et `verifiedBootState=VERIFIED` ;
- conserve la clé publique et le verdict pour 24 heures ;
- refuse les appels API authentifiés depuis le WebView Android natif tant qu'une attestation valide n'est pas enregistrée. La PWA et les navigateurs Android ordinaires ne sont pas soumis à ce verrou natif.

Tables privées service-role : `AndroidAttestationChallenge` et `AndroidDeviceAttestation`. Les migrations sont versionnées dans `supabase/migrations`.

Configuration serveur nécessaire :
- `JOBLY_ANDROID_RELEASE_CERT_SHA256` : empreinte SHA-256 du certificat officiel de signature APK, identique à celle intégrée dans le build release.
- Les secrets du keystore restent uniquement dans le système de build et ne sont jamais stockés dans le dépôt ni dans le navigateur.

Une clé d'attestation matérielle indisponible, une racine inconnue, une liste de révocation inaccessible ou une empreinte de signature non configurée entraînent un refus (fail-closed). Les appareils sans TEE/StrongBox ou avec bootloader déverrouillé ne reçoivent pas le verdict « vérifié ».

Aucun contrôle `PLAY_RECOGNIZED` ou `LICENSED` n'est exigé : l'APK Jobly reste distribuable hors Play Store.

### Limites opérationnelles à clôturer avant production

La validation serveur est codée, mais la signature de publication ne peut pas être inventée ni remplacée sans risque : il faut réutiliser le keystore déjà utilisé pour les APK distribués et renseigner son empreinte officielle. Si aucun APK n'a encore été distribué, une nouvelle identité de signature peut être créée après confirmation. Les tests d'émulateur ne remplacent pas un essai sur au moins un appareil physique Android avec TEE et bootloader verrouillé.


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
