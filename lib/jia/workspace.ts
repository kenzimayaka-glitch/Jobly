export type JiaWorkspaceIntent =
  | "OFFERS" | "APPLICATIONS" | "PROFILE" | "ASSESSMENT"
  | "RECRUITER_JOBS" | "RECRUITER_APPLICATIONS" | "RECRUITER_TALENTS"
  | "PARTNER_PROFILE" | "PARTNER_ASSIGNMENTS" | "PARTNER_COMMISSIONS" | "PARTNER_REPORTS"
  | "ADMIN_OVERVIEW" | null;

export type JiaBusinessSummaryItem = { id: string; title: string; subtitle: string; detail: string; status?: string; };

export type JiaWorkspaceOffer = {
  id: string;
  source: "discovery" | "recruiter";
  title: string;
  companyName: string | null;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  matchPercent: number | null;
  deadline: string | null;
  sourceUrl: string | null;
  applicationReady: boolean;
};

export type JiaWorkspaceApplication = {
  id: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  job: { title: string; companyName: string | null; location: string | null } | null;
};

export type JiaWorkspaceQuestion = {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: 1 | 2 | 3;
};

export type JiaWorkspaceBlock =
  | { kind: "offers"; offers: JiaWorkspaceOffer[]; totalAvailable: number; matchingCount: number; error?: string }
  | { kind: "applications"; applications: JiaWorkspaceApplication[]; counters: { envoyees: number; vues: number; entretien: number }; error?: string }
  | { kind: "profile"; displayName: string; email: string | null; phone: string | null; location: string | null; headline: string; summary: string; skills: string[]; experiences: Array<{ title: string; company: string; startDate: string | null; endDate: string | null; description: string | null }>; education: Array<{ institution: string; degree: string | null; field: string | null; startDate: string | null; endDate: string | null }>; experienceCount: number; educationCount: number; cvOriginalUrl: string | null; cvOriginalFileName: string | null; error?: string }
  | { kind: "questionnaire"; assessmentId: string; title: string; competency: string; objective: string; questions: JiaWorkspaceQuestion[]; answers?: Record<string, number>; adaptive?: boolean; currentQuestionIndex?: number; currentDifficulty?: 1 | 2 | 3; askedQuestionIndexes?: number[]; maxQuestions?: number; result?: { score: number; summary: string }; error?: string }
  | { kind: "prepared-application"; applicationId: string; title: string; channel: string; subject: string; letter: string; email: string | null; phone: string | null; warnings: string[]; sourceUrl: string | null; submitted?: boolean }
  | { kind: "business-summary"; title: string; metricLabel: string; metric: number; items: JiaBusinessSummaryItem[]; href: string; hrefLabel: string; note?: string }
  | { kind: "notice"; title: string; message: string; href?: string };

export function detectJiaWorkspaceIntent(message: string, ecosystem: string): JiaWorkspaceIntent {
  const value = message.toLocaleLowerCase();
  if (ecosystem === "ADMIN") return /\b(tableau de bord|vue d'ensemble|indicateurs|statistiques plateforme|intelligence|alertes|santé de jobly|activité plateforme)\b/.test(value) ? "ADMIN_OVERVIEW" : null;
  if (ecosystem === "RECRUITER") {
    if (/\b(candidatures reçues|candidatures entrantes|candidats qui ont postulé|candidatures à traiter)\b/.test(value)) return "RECRUITER_APPLICATIONS";
    if (/\b(mes offres|offres publiées|mes postes|mes annonces|offres que j'ai publiées)\b/.test(value)) return "RECRUITER_JOBS";
    if (/\b(candidats? pertinents|trouve des candidats|recherche de candidats|cherche des talents|trouve des talents|profils de talents|talents disponibles)\b/.test(value)) return "RECRUITER_TALENTS";
    return null;
  }
  if (ecosystem === "PARTNER") {
    if (/\b(mes affectations|affectations|mes missions|missions prestataire|services assignés|prestations en cours)\b/.test(value)) return "PARTNER_ASSIGNMENTS";
    if (/\b(mes commissions|commissions|mes gains|revenus partenaire)\b/.test(value)) return "PARTNER_COMMISSIONS";
    if (/\b(rapport|reporting|indicateurs mobilité|dossiers mobilité|statistiques bénéficiaires)\b/.test(value)) return "PARTNER_REPORTS";
    if (/\b(profil partenaire|mon profil prestataire|mes services mobilité|mon dossier prestataire)\b/.test(value)) return "PARTNER_PROFILE";
    return null;
  }
  if (ecosystem !== "TALENT") return null;
  if (/\b(questionnaire|questionnaires|évaluation|evaluation|teste[- ]moi|fais[- ]moi passer un test|mini[- ]test|quiz)\b/.test(value)) return "ASSESSMENT";
  if (/\b(mes candidatures|ma candidature|candidatures|candidature|applications|suivi des candidatures)\b/.test(value)) return "APPLICATIONS";
  if (/\b(offres?|emplois?|postes?|vacances|jobs?)\b/.test(value)) return "OFFERS";
  if (/\b(mon profil|profil professionnel|mon cv|mon curriculum|curriculum vitae|cv|compétences|experiences professionnelles|expériences professionnelles)\b/.test(value)) return "PROFILE";
  return null;
}

export function buildJiaPracticeQuestionnaire(message: string): {
  competency: string;
  title: string;
  objective: string;
  questions: JiaWorkspaceQuestion[];
} {
  const value = message.toLocaleLowerCase();
  const competency = /\b(excel|tableur|formules?)\b/.test(value)
    ? "Excel"
    : /\b(vente|commercial|prospection|négociation)\b/.test(value)
      ? "Vente et relation client"
      : /\b(communication|prise de parole|rédaction)\b/.test(value)
        ? "Communication professionnelle"
        : (message.match(/\b(?:sur|en|pour)\s+([a-zà-ÿ][a-zà-ÿ0-9 +#.-]{1,35})/i)?.[1]?.trim() || "Compétences professionnelles")
            .replace(/[?.!,;:]+$/, "")
            .slice(0, 48);

  const excel: JiaWorkspaceQuestion[] = [
    { prompt: "Dans un tableau de ventes, quelle formule additionne les valeurs de C2 à C20 ?", choices: ["=MOYENNE(C2:C20)", "=SOMME(C2:C20)", "=NB(C2:C20)", "=MAX(C2:C20)"], correctIndex: 1, explanation: "SOMME additionne toutes les valeurs de la plage." },
    { prompt: "Tu dois retrouver le prix associé à un code produit dans une autre table. Quel outil est le plus adapté ?", choices: ["RECHERCHEX", "MAINTENANT", "NB.VIDE", "CONCATENER"], correctIndex: 0, explanation: "RECHERCHEX recherche une valeur et renvoie le champ correspondant." },
    { prompt: "Avant de créer un tableau croisé dynamique, quelle préparation est la plus fiable ?", choices: ["Fusionner toutes les cellules du tableau", "Supprimer les en-têtes", "Utiliser une ligne d'en-têtes et des colonnes cohérentes", "Laisser des lignes vides entre les données"], correctIndex: 2, explanation: "Une structure tabulaire régulière facilite l'analyse et les filtres." },
  ];
  const sales: JiaWorkspaceQuestion[] = [
    { prompt: "Un prospect dit que votre offre est trop chère. Quelle est la meilleure première réaction ?", choices: ["Accorder immédiatement une remise", "Demander ce qui motive cette perception et clarifier la valeur attendue", "Terminer l'appel", "Critiquer l'offre concurrente"], correctIndex: 1, explanation: "Il faut comprendre l'objection avant de proposer une réponse adaptée." },
    { prompt: "Un client hésite entre deux solutions. Quelle démarche est la plus utile ?", choices: ["Présenter toutes les caractéristiques sans question", "Lui demander ses critères prioritaires puis comparer les options", "Choisir à sa place", "Promettre un résultat non vérifié"], correctIndex: 1, explanation: "La recommandation doit s'appuyer sur les besoins exprimés." },
    { prompt: "Un objectif commercial risque de ne pas être atteint. Que faut-il faire ?", choices: ["Attendre la fin de la période", "Masquer l'écart", "Analyser le pipeline, alerter et proposer un plan d'action", "Modifier les chiffres"], correctIndex: 2, explanation: "Un suivi fiable rend les écarts visibles et permet de corriger tôt." },
  ];
  const communication: JiaWorkspaceQuestion[] = [
    { prompt: "Une consigne reçue est ambiguë. Quelle action est la plus professionnelle ?", choices: ["Deviner et commencer", "Demander le résultat attendu, le délai et les critères de réussite", "Ignorer la demande", "Transférer la tâche sans explication"], correctIndex: 1, explanation: "Clarifier les attentes réduit les erreurs et les retards." },
    { prompt: "Tu dois annoncer un retard à ton responsable. Quel message est le plus utile ?", choices: ["Je suis en retard", "Présenter la cause, l'impact, la nouvelle échéance et les mesures prises", "Attendre qu'il le découvre", "Accuser un collègue"], correctIndex: 1, explanation: "Une communication utile associe transparence et plan de résolution." },
    { prompt: "Après un retour critique sur ton travail, quelle réaction favorise le progrès ?", choices: ["Demander un exemple concret et convenir d'une amélioration vérifiable", "Répondre immédiatement sur la défensive", "Ne plus demander de retour", "Ignorer le commentaire"], correctIndex: 0, explanation: "Un exemple précis permet de transformer le feedback en action." },
  ];
  const general: JiaWorkspaceQuestion[] = [
    { prompt: "Une mission est confiée sans résultat attendu clairement défini. Que fais-tu ?", choices: ["Tu confirmes l'objectif, le délai et le livrable attendu", "Tu avances sans vérifier", "Tu délègues sans contexte", "Tu attends la relance"], correctIndex: 0, explanation: "La clarification des objectifs est une compétence transversale." },
    { prompt: "Tu identifies un risque qui peut faire manquer une échéance. Quelle est la meilleure conduite ?", choices: ["Ne rien dire avant la date limite", "Alerter tôt, expliquer l'impact et proposer des options", "Réduire la qualité sans prévenir", "Attribuer le problème à quelqu'un"], correctIndex: 1, explanation: "La gestion proactive des risques améliore la fiabilité du travail." },
    { prompt: "Après une erreur, quelle démarche permet le mieux d'éviter sa répétition ?", choices: ["La cacher", "Identifier la cause, corriger et formaliser un apprentissage", "Recommencer sans analyse", "Chercher un responsable à blâmer"], correctIndex: 1, explanation: "L'analyse de cause et l'action corrective favorisent l'apprentissage." },
  ];

  const questions = /\b(excel|tableur|formules?)\b/.test(value)
    ? excel
    : /\b(vente|commercial|prospection|négociation)\b/.test(value)
      ? sales
      : /\b(communication|prise de parole|rédaction)\b/.test(value)
        ? communication
        : general;

  return {
    competency,
    title: "Exercice pratique — " + competency,
    objective: "Évaluer de manière indicative quelques réflexes de " + competency.toLocaleLowerCase() + " au moyen de trois mises en situation. Ce résultat n'est pas une certification.",
    questions,
  };
}


/**
 * Six grounded questions per skill family. Premium users receive an adaptive
 * five-question route over this bounded bank; other plans receive the original
 * three-question practice set. No generative answer is treated as evidence.
 */
export function buildJiaAdaptiveQuestionBank(message: string): ReturnType<typeof buildJiaPracticeQuestionnaire> {
  const base = buildJiaPracticeQuestionnaire(message);
  const competency = base.competency.toLocaleLowerCase();
  const extra: JiaWorkspaceQuestion[] = competency === "excel"
    ? [
        { prompt: "Tu dois afficher « À revoir » si le chiffre d'affaires est inférieur à l'objectif, sinon « Atteint ». Quelle formule convient ?", choices: ['=SI(B2<C2;"À revoir";"Atteint")', "=SOMME(B2:C2)", "=NB(B2:C2)", "=AUJOURDHUI()"], correctIndex: 0, explanation: "SI compare la valeur à l'objectif et renvoie un résultat selon la condition.", difficulty: 2 },
        { prompt: "Un tableau de ventes contient plusieurs lignes par produit et par mois. Quel outil résume rapidement les ventes par produit ?", choices: ["Mise en forme du texte", "Tableau croisé dynamique", "Fusionner les cellules", "Rechercher/remplacer"], correctIndex: 1, explanation: "Un tableau croisé dynamique agrège les données selon les champs sélectionnés.", difficulty: 2 },
        { prompt: "Un fichier mensuel contient des colonnes et formats incohérents. Quel outil permet de répéter un nettoyage à chaque actualisation ?", choices: ["Power Query", "WordArt", "Tri manuel uniquement", "Capture d'écran"], correctIndex: 0, explanation: "Power Query enregistre et rejoue les étapes de transformation.", difficulty: 3 },
      ]
    : competency.includes("vente")
      ? [
          { prompt: "Un prospect hésite après une démonstration. Quelle question qualifie le mieux la suite ?", choices: ["Puis-je vous rappeler demain ?", "Quel critère reste à valider avant votre décision ?", "Voulez-vous une remise ?", "Puis-je clôturer le dossier ?"], correctIndex: 1, explanation: "La question identifie le point de décision encore non résolu.", difficulty: 2 },
          { prompt: "Ton pipeline est inférieur à l'objectif du mois. Quelle analyse est la plus utile ?", choices: ["Compter seulement les appels", "Examiner volumes, taux de conversion et durée par étape", "Augmenter le montant de chaque opportunité", "Retirer les prospects inactifs sans les qualifier"], correctIndex: 1, explanation: "La lecture par étape permet de repérer le goulot d'étranglement réel.", difficulty: 2 },
          { prompt: "Un client demande une fonctionnalité que le produit ne possède pas. Quelle réponse est professionnelle ?", choices: ["Promettre qu'elle sera livrée demain", "Masquer la limite", "Clarifier le besoin, présenter les options disponibles et documenter la demande", "Critiquer le concurrent"], correctIndex: 2, explanation: "La réponse reste fiable et transforme le besoin en information exploitable.", difficulty: 3 },
        ]
      : competency.includes("communication")
        ? [
            { prompt: "Deux équipes donnent des priorités contradictoires. Que fais-tu d'abord ?", choices: ["Choisir l'équipe la plus insistante", "Rendre visibles les objectifs, contraintes et impacts puis faire arbitrer", "Ignorer une demande", "Promettre les deux livraisons"], correctIndex: 1, explanation: "Un arbitrage documenté s'appuie sur les objectifs et les impacts.", difficulty: 2 },
            { prompt: "Un rapport doit être lu par une direction pressée. Quelle structure est la plus claire ?", choices: ["Historique exhaustif en premier", "Conclusion, indicateurs, risques et décisions attendues", "Une page sans titre", "Toutes les données sans synthèse"], correctIndex: 1, explanation: "La synthèse place les décisions et les preuves utiles en premier.", difficulty: 2 },
            { prompt: "Un message sensible peut être mal interprété. Quelle pratique réduit le risque ?", choices: ["Envoyer sans contexte", "Employer des formulations vagues", "Séparer faits, impacts, hypothèses et demandes", "Utiliser uniquement des emojis"], correctIndex: 2, explanation: "La distinction entre faits et hypothèses clarifie la portée du message.", difficulty: 3 },
          ]
        : [
            { prompt: "Une échéance est menacée par une dépendance externe. Quelle conduite réduit le risque ?", choices: ["Attendre la dernière minute", "Alerter tôt, quantifier l'impact et proposer un plan alternatif", "Masquer le retard", "Supprimer des contrôles sans prévenir"], correctIndex: 1, explanation: "Une alerte anticipée avec options facilite une décision utile.", difficulty: 2 },
            { prompt: "Deux tâches urgentes entrent en conflit. Quel critère aide à prioriser ?", choices: ["L'ordre d'arrivée uniquement", "L'impact, l'urgence réelle et les dépendances", "La tâche la plus courte systématiquement", "La préférence personnelle"], correctIndex: 1, explanation: "La priorité doit tenir compte de la valeur et des contraintes.", difficulty: 2 },
            { prompt: "Une amélioration a été lancée. Quelle mesure montre le mieux son effet ?", choices: ["Le nombre de réunions", "Un indicateur avant/après relié au résultat attendu", "Le nombre de messages envoyés", "Le ressenti du seul porteur"], correctIndex: 1, explanation: "Une mesure avant/après liée à l'objectif permet d'évaluer le résultat.", difficulty: 3 },
          ];

  return {
    ...base,
    questions: [
      ...base.questions.map((question, index) => ({ ...question, difficulty: (index + 1) as 1 | 2 | 3 })),
      ...extra,
    ],
  };
}
