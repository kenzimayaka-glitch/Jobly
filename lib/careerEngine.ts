export type CareerDimension = {
  score: number;
  weight: number;
  evidence: string[];
};

export type CareerAssessment = {
  currentLevel: number;
  targetLevel: number;
  readiness: number;
  dimensions: Record<string, CareerDimension>;
  criteria: string[];
  gaps: string[];
  nextBestAction: string;
  yearsExperience: number;
};

type Experience = { title?: string | null; description?: string | null; startDate?: string | null; endDate?: string | null; provenance?: string | null };
type Skill = { name?: string | null; level?: string | null; provenance?: string | null };
type Education = { degree?: string | null; field?: string | null; institution?: string | null; provenance?: string | null };

const LEVELS = [
  { level: 1, minYears: 0, label: "Débutant" },
  { level: 2, minYears: 1, label: "Junior" },
  { level: 3, minYears: 3, label: "Confirmé" },
  { level: 4, minYears: 5, label: "Senior" },
  { level: 5, minYears: 8, label: "Lead / Manager" },
  { level: 6, minYears: 12, label: "Head / Principal" },
  { level: 7, minYears: 16, label: "Director" },
  { level: 8, minYears: 20, label: "Executive" },
] as const;

function yearsBetween(experiences: Experience[]) {
  const starts = experiences.map((x) => new Date(String(x.startDate || "")).getTime()).filter(Number.isFinite);
  if (!starts.length) return 0;
  return Math.max(0, Math.floor((Date.now() - Math.min(...starts)) / (365.25 * 86400000)));
}

function quantifiedEvidence(experiences: Experience[]) {
  const evidence: string[] = [];
  const regex = /(?:\b\d+(?:[.,]\d+)?\s*(?:%|k|m|bn|milliards?|millions?|milliers?|M|K|XAF|FCFA)|\b\d+\s+(?:clients?|comptes?|personnes?|collaborateurs?|points?|projets?|march[eé]s?|pays?|sites?))/gi;
  for (const exp of experiences) {
    const text = `${exp.title || ""} ${exp.description || ""}`;
    const matches = text.match(regex) || [];
    for (const match of matches.slice(0, 5)) evidence.push(match.trim());
  }
  return Array.from(new Set(evidence)).slice(0, 12);
}

function responsibilityEvidence(experiences: Experience[]) {
  const text = experiences.map((x) => `${x.title || ""} ${x.description || ""}`).join(" ").toLowerCase();
  const signals = ["manager", "management", "lead", "head", "director", "responsable", "supervisor", "équipe", "equipe", "portefeuille", "budget", "stratégie", "strategie"];
  return signals.filter((signal) => text.includes(signal));
}

function skillScore(skills: Skill[]) {
  if (!skills.length) return 0;
  const high = skills.filter((x) => /expert|advanced|senior|avancé|maîtr|master/i.test(String(x.level || ""))).length;
  return Math.min(100, Math.round((skills.length / 12) * 65 + (high / Math.max(1, skills.length)) * 35));
}

export function assessCareer(input: { experiences: Experience[]; skills: Skill[]; education: Education[]; targetRole?: string | null }): CareerAssessment {
  const experiences = input.experiences || [];
  const skills = input.skills || [];
  const education = input.education || [];
  const years = yearsBetween(experiences);
  const impactEvidence = quantifiedEvidence(experiences);
  const responsibilityEvidenceList = responsibilityEvidence(experiences);
  const currentLevel = [...LEVELS].reverse().find((x) => years >= x.minYears)?.level || 1;
  const targetLevel = Math.min(8, currentLevel + 1);
  const next = LEVELS.find((x) => x.level === targetLevel)!;

  const experienceScore = Math.min(100, Math.round((years / Math.max(next.minYears, 1)) * 100));
  const impactScore = Math.min(100, impactEvidence.length * 12 + (impactEvidence.length >= 3 ? 20 : 0));
  const responsibilityScore = Math.min(100, responsibilityEvidenceList.length * 14);
  const skillsScore = skillScore(skills);
  const educationScore = Math.min(100, education.length * 35);
  const progressionScore = Math.min(100, new Set(experiences.map((x) => String(x.title || "").trim().toLowerCase()).filter(Boolean)).size * 25);
  const profileEvidenceScore = Math.min(100, (experiences.length ? 40 : 0) + (skills.length ? 30 : 0) + (education.length ? 20 : 0) + (input.targetRole ? 10 : 0));

  const dimensions: Record<string, CareerDimension> = {
    experience: { score: experienceScore, weight: 20, evidence: [`${years} an${years > 1 ? "s" : ""} d'expérience`] },
    impact: { score: impactScore, weight: 20, evidence: impactEvidence.length ? impactEvidence : ["Peu de résultats chiffrés détectés"] },
    responsibility: { score: responsibilityScore, weight: 15, evidence: responsibilityEvidenceList.length ? responsibilityEvidenceList : ["Responsabilités managériales/stratégiques à documenter"] },
    skills: { score: skillsScore, weight: 15, evidence: [`${skills.length} compétence${skills.length > 1 ? "s" : ""} déclarée${skills.length > 1 ? "s" : ""}`] },
    education: { score: educationScore, weight: 10, evidence: education.length ? [`${education.length} formation${education.length > 1 ? "s" : ""}`] : ["Formation à documenter"] },
    progression: { score: progressionScore, weight: 10, evidence: [`${new Set(experiences.map((x) => String(x.title || "").trim().toLowerCase()).filter(Boolean)).size} intitulé(s) de poste distinct(s)`] },
    evidenceCompleteness: { score: profileEvidenceScore, weight: 10, evidence: [] },
  };

  const readiness = Math.round(Object.values(dimensions).reduce((sum, d) => sum + d.score * d.weight, 0) / 100);
  const gaps: string[] = [];
  if (years < next.minYears) gaps.push(`Atteindre environ ${next.minYears} ans d'expérience pour le niveau ${targetLevel}`);
  if (impactScore < 60) gaps.push("Documenter davantage les résultats chiffrés (CA, croissance, objectifs, portefeuille, volumes)");
  if (responsibilityScore < 60) gaps.push("Renforcer et documenter le périmètre de responsabilité");
  if (skillsScore < 60) gaps.push("Développer les compétences clés du niveau cible");
  if (educationScore < 50) gaps.push("Compléter les formations/certifications pertinentes");
  if (progressionScore < 50) gaps.push("Démontrer une progression de responsabilités au fil des expériences");
  const nextBestAction = gaps[0] || `Construire des preuves pour passer vers le niveau ${targetLevel}`;
  const criteria = [`≈ ${next.minYears} ans d'expérience cumulée`, "Résultats mesurables et vérifiables", "Responsabilité croissante", "Compétences adaptées au rôle cible", "Formation pertinente", "Progression démontrée"];
  return { currentLevel, targetLevel, readiness, dimensions, criteria, gaps: gaps.slice(0, 5), nextBestAction, yearsExperience: years };
}

export function levelLabel(level: number) {
  return LEVELS.find((x) => x.level === level)?.label || `Niveau ${level}`;
}
