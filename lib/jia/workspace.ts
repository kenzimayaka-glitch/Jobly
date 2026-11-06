export type JiaWorkspaceIntent = "OFFERS" | "APPLICATIONS" | "PROFILE" | "ASSESSMENT" | null;

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
};

export type JiaWorkspaceBlock =
  | { kind: "offers"; offers: JiaWorkspaceOffer[]; totalAvailable: number; matchingCount: number; error?: string }
  | { kind: "applications"; applications: JiaWorkspaceApplication[]; counters: { envoyees: number; vues: number; entretien: number }; error?: string }
  | { kind: "profile"; displayName: string; email: string | null; headline: string; summary: string; skills: string[]; experiences: Array<{ title: string; company: string; startDate: string | null; endDate: string | null; description: string | null }>; education: Array<{ institution: string; degree: string | null; field: string | null; startDate: string | null; endDate: string | null }>; experienceCount: number; educationCount: number; cvOriginalUrl: string | null; cvOriginalFileName: string | null; error?: string }
  | { kind: "questionnaire"; assessmentId: string; title: string; competency: string; objective: string; questions: JiaWorkspaceQuestion[]; result?: { score: number; summary: string }; error?: string }
  | { kind: "prepared-application"; applicationId: string; title: string; channel: string; subject: string; letter: string; email: string | null; phone: string | null; warnings: string[]; sourceUrl: string | null; submitted?: boolean }
  | { kind: "notice"; title: string; message: string; href?: string };

export function detectJiaWorkspaceIntent(message: string, ecosystem: string): JiaWorkspaceIntent {
  if (ecosystem !== "TALENT") return null;
  const value = message.toLocaleLowerCase();
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
