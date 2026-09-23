/**
 * Localisation (FR → EN) des textes produits par le moteur carrière (lib/careerEngine.ts).
 *
 * Le moteur reste en français (les évaluations stockées en base ne changent pas) ;
 * seule la RÉPONSE de l’API est traduite selon `?lang=en`. Les phrases sont un jeu fini
 * et connu : table exacte + motifs paramétrés. Un texte inconnu est renvoyé tel quel
 * (jamais de perte d’information).
 */
export type CareerLang = "fr" | "en";

const EXACT: Record<string, string> = {
  "Documenter davantage les résultats chiffrés (CA, croissance, objectifs, portefeuille, volumes)":
    "Document more measurable results (revenue, growth, targets, portfolio, volumes)",
  "Renforcer et documenter le périmètre de responsabilité": "Strengthen and document your scope of responsibility",
  "Développer les compétences clés du niveau cible": "Develop the key skills for the target level",
  "Compléter les formations/certifications pertinentes": "Add relevant training and certifications",
  "Démontrer une progression de responsabilités au fil des expériences": "Show growing responsibility across your roles",
  "Définir au moins un métier cible": "Define at least one target role",
  "Définir une ville cible": "Define a target city",
  "Définir un métier cible": "Define a target role",
  "Établir le niveau actuel": "Establish your current level",
  "Construire les preuves": "Build your evidence",
  "Combler les critères du niveau suivant": "Meet the next level’s criteria",
  "Tester le marché": "Test the market",
  "Documenter CA, croissance, objectifs, portefeuille, volumes et autres résultats":
    "Document revenue, growth, targets, portfolio, volumes and other results",
  "Comparer les opportunités au niveau réellement atteignable": "Compare opportunities against the level you can realistically reach",
  "Résultats mesurables et vérifiables": "Measurable, verifiable results",
  "Responsabilité croissante": "Growing responsibility",
  "Compétences adaptées au rôle cible": "Skills suited to the target role",
  "Formation pertinente": "Relevant education",
  "Progression démontrée": "Demonstrated progression",
  "Peu de résultats chiffrés détectés": "Few measurable results detected",
  "Responsabilités managériales/stratégiques à documenter": "Managerial / strategic responsibilities to document",
  "Formation à documenter": "Education to document",
  "Métier cible": "Target role",
  "Zone cible": "Target area",
  "Expérience": "Experience",
  "Compétences": "Skills",
  "Profil complet": "Complete profile",
  "Talent Jobly": "Jobly Talent",
  "Débutant": "Entry level",
  "Junior": "Junior",
  "Confirmé": "Mid-level",
  "Senior": "Senior",
  "Lead / Manager": "Lead / Manager",
  "Head / Principal": "Head / Principal",
  "Director": "Director",
  "Executive": "Executive",
};

const PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^(\d+)% de readiness carrière$/, (m) => `${m[1]}% career readiness`],
  [/^Atteindre environ (\d+) ans d'expérience pour le niveau (\d+)$/, (m) => `Reach about ${m[1]} years of experience for level ${m[2]}`],
  [/^Construire des preuves pour passer vers le niveau (\d+)$/, (m) => `Build evidence to move up to level ${m[1]}`],
  [/^Niveau (\d+) — (.+)$/, (m) => `Level ${m[1]} — ${EXACT[m[2]] ?? m[2]}`],
  [/^Niveau (\d+)$/, (m) => `Level ${m[1]}`],
  [/^≈ (\d+) ans d'expérience cumulée$/, (m) => `≈ ${m[1]} years of cumulative experience`],
  [/^(\d+) ans? d'expérience$/, (m) => `${m[1]} year${m[1] === "1" || m[1] === "0" ? "" : "s"} of experience`],
  [/^(\d+) compétences? déclarées?$/, (m) => `${m[1]} declared skill${m[1] === "1" || m[1] === "0" ? "" : "s"}`],
  [/^(\d+) formations?$/, (m) => `${m[1]} qualification${m[1] === "1" ? "" : "s"}`],
  [/^(\d+) intitulé\(s\) de poste distinct\(s\)$/, (m) => `${m[1]} distinct job title(s)`],
];

export function localizeCareerText(text: string, lang: CareerLang): string {
  if (lang !== "en" || !text) return text;
  if (EXACT[text]) return EXACT[text];
  for (const [re, fn] of PATTERNS) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return text;
}

export const localizeCareerList = (items: string[], lang: CareerLang) => items.map((x) => localizeCareerText(x, lang));
