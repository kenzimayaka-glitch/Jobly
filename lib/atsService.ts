export type ATSResult = { score: number; name: string; skills: string[] };
export type ATSAnalysis = {
  score: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  evaluatedKeywords: number;
};

const STOP_WORDS = new Set([
  "avec","dans","pour","une","des","les","sur","aux","est","être","the","and","for","with","from","this","that",
  "pour","dans","avec","sans","chez","entre","être","avoir","faire","vous","nous","votre","vos","leur","leurs",
  "poste","mission","missions","profil","recherche","recherché","recherchée","candidat","candidate","équipe",
  "entreprise","client","clients","travail","travailler","contribuer","participer","assurer","garantir","mettre",
  "place","niveau","bonne","bon","bonne","plus","moins","tout","tous","toute","toutes","ainsi","comme","depuis",
  "the","and","for","with","from","this","that","will","our","your","you","are","are","has","have","into","their",
]);

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+#.\s-]/g, " ");
}

function tokens(text: string) {
  return Array.from(new Set(
    normalize(text)
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3 && !STOP_WORDS.has(x))
  ));
}

export type ATSScoreSource = "APPLICATION_CV" | "PROFILE_ANALYSIS" | "APPLICATION" | "NOT_CALCULABLE";

export function selectApplicationCvText(
  applicationCvSnapshot: unknown,
  currentProfileText: unknown
): { text: string; source: ATSScoreSource } {
  const snapshot = typeof applicationCvSnapshot === "string" ? applicationCvSnapshot.trim() : "";
  const profile = typeof currentProfileText === "string" ? currentProfileText.trim() : "";
  const isUsable = (value: string) => value.replace(/\s/g, "").length >= 40 && tokens(value).length >= 2;

  if (isUsable(snapshot)) return { text: snapshot, source: "APPLICATION_CV" };
  if (isUsable(profile)) return { text: profile, source: "PROFILE_ANALYSIS" };
  return { text: "", source: "NOT_CALCULABLE" };
}

export function analyzeATSMatch(cvText: string, jobText: string): ATSAnalysis {
  const cvTokens = tokens(cvText);
  const jobTokens = tokens(jobText).slice(0, 120);
  if (!cvTokens.length || !jobTokens.length) {
    return { score: null, matchedKeywords: [], missingKeywords: jobTokens.slice(0, 25), evaluatedKeywords: jobTokens.length };
  }
  const cvSet = new Set(cvTokens);
  const matchedKeywords = jobTokens.filter((word) => cvSet.has(word));
  const missingKeywords = jobTokens.filter((word) => !cvSet.has(word));
  return {
    score: Math.round((matchedKeywords.length / jobTokens.length) * 100),
    matchedKeywords: matchedKeywords.slice(0, 40),
    missingKeywords: missingKeywords.slice(0, 40),
    evaluatedKeywords: jobTokens.length,
  };
}

export function calculateATSScore(cvText: string, jobDescription: string): ATSResult {
  const analysis = analyzeATSMatch(cvText, jobDescription);
  const score = analysis.score ?? 0;
  const name = score >= 80 ? "Excellent match" : score >= 65 ? "Bon match" : score >= 50 ? "Match à examiner" : "Faible match";
  return { score, name, skills: analysis.matchedKeywords.slice(0, 12) };
}

export function decideStatus(score: number): "Rejeté ATS" | "À examiner" {
  return score < 50 ? "Rejeté ATS" : "À examiner";
}
