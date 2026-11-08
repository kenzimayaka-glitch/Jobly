export type LiveWinsRole = "TALENT" | "RECRUITER";

const LIVE_WINS_MESSAGES: Record<LiveWinsRole, readonly string[]> = {
  TALENT: [
    "1 talent vient de recevoir une proposition d’embauche grâce à Jobly.",
    "Un talent vient de décrocher un emploi grâce à Jobly.",
    "Une candidature vient d’aboutir à une proposition d’embauche.",
    "Un talent vient de recevoir une réponse positive à sa candidature.",
    "Un talent vient de franchir une nouvelle étape vers son prochain emploi.",
    "Une nouvelle réussite professionnelle vient de rejoindre la communauté Jobly.",
    "Un talent vient de trouver une opportunité qui correspond à son profil.",
    "Une entreprise vient de retenir un talent découvert sur Jobly.",
  ],
  RECRUITER: [
    "1 recruteur vient de faire une proposition d’embauche à un talent grâce à Jobly.",
    "Un recruteur vient de trouver le talent qu’il recherchait sur Jobly.",
    "Une entreprise vient d’identifier un profil correspondant à son besoin.",
    "Un recruteur vient de faire avancer son recrutement grâce à Jobly.",
    "Un talent vient d’être retenu par une entreprise sur Jobly.",
    "Une entreprise vient de découvrir un nouveau talent sur Jobly.",
    "Un recruteur vient de franchir une nouvelle étape dans son recrutement.",
    "Un recrutement vient de connaître une avancée grâce à Jobly.",
  ],
};

export function getLiveWinsMessages(role: LiveWinsRole): readonly string[] {
  return LIVE_WINS_MESSAGES[role];
}

/** Chooses one Live Wins result uniformly from the role-specific message bank. */
export function pickLiveWinsMessage(
  role: LiveWinsRole,
  random: () => number = Math.random,
): string {
  const messages = getLiveWinsMessages(role);
  const value = random();
  const unit = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0.5;
  return messages[Math.floor(unit * messages.length)];
}
