# Extension Chrome Jobly — J'IA candidature (prototype)
1. Sur Chrome ordinateur, ouvre chrome://extensions et active le mode développeur.
2. Choisis « Charger l'extension non empaquetée » et sélectionne ce dossier.
3. Sur Jobly, ouvre une offre puis clique sur le site du promoteur.
4. Dans l'onglet du recruteur, ouvre le panneau Jobly J'IA depuis l'icône de l'extension.
5. Autorise l'accès au domaine pour analyser les libellés des champs, puis demande à J'IA de préparer la candidature.

L'extension ne lit pas les valeurs saisies, mots de passe, fichiers ou codes de vérification. Elle n'envoie aucune candidature. Elle n'est pas publiée sur le Chrome Web Store.

Chrome Android ne prend pas en charge les extensions Chrome classiques. Pour Android, Jobly utilise le partage PWA vers /jia/share ; ce parcours permet à J'IA de recevoir la page et les questions partagées, mais n'inspecte pas automatiquement les formulaires externes.
