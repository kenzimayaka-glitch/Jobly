export type TailoredCvProfile = {
  firstName?: string | null;
  lastName?: string | null;
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  phone?: string | null;
  targetRoles?: string[];
};

export type TailoredCvExperience = {
  company: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  provenance?: string | null;
};

export type TailoredCvSkill = { name: string; level?: string | null; provenance?: string | null };
export type TailoredCvEducation = { institution: string; degree?: string | null; field?: string | null; startDate?: string | null; endDate?: string | null; provenance?: string | null };

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+#.\s-]/g, " ");
}

function keywords(text: string) {
  return new Set(normalize(text).split(/\s+/).filter((x) => x.length >= 4));
}

function relevance(text: string, jobKeywords: Set<string>) {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  return words.reduce((score, word) => score + (jobKeywords.has(word) ? 1 : 0), 0);
}

function dateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(date);
}

export function buildTailoredCv(args: {
  profile: TailoredCvProfile;
  experiences: TailoredCvExperience[];
  skills: TailoredCvSkill[];
  education: TailoredCvEducation[];
  jobTitle: string;
  jobDescription: string;
}) {
  const { profile, experiences, skills, education, jobTitle, jobDescription } = args;
  const jobKeywords = keywords(`${jobTitle} ${jobDescription}`);
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidat Jobly";
  const headline = profile.headline || profile.targetRoles?.[0] || jobTitle;
  const relevantSkills = [...skills]
    .filter((skill) => skill.name)
    .sort((a, b) => relevance(b.name, jobKeywords) - relevance(a.name, jobKeywords))
    .slice(0, 16);
  const relevantExperience = [...experiences]
    .sort((a, b) => relevance(`${b.title} ${b.description || ""} ${b.company}`, jobKeywords) - relevance(`${a.title} ${a.description || ""} ${a.company}`, jobKeywords))
    .slice(0, 6);

  const sections = [
    name,
    headline,
    [profile.location, profile.phone].filter(Boolean).join(" · "),
    "",
    "PROFIL",
    profile.summary || `Candidat positionné sur le poste de ${jobTitle}, avec un parcours présenté uniquement à partir des informations déclarées dans Jobly.`,
    "",
    "COMPÉTENCES CLÉS",
    relevantSkills.length ? relevantSkills.map((s) => `• ${s.name}${s.level ? ` — ${s.level}` : ""}`).join("\n") : "• Non indiqué dans le profil",
    "",
    "EXPÉRIENCE PROFESSIONNELLE",
    relevantExperience.length ? relevantExperience.map((e) => {
      const dates = [dateLabel(e.startDate), dateLabel(e.endDate)].filter(Boolean).join(" – ");
      return `${e.title} — ${e.company}${dates ? ` (${dates})` : ""}\n${e.description || "Description non indiquée dans le profil."}`;
    }).join("\n\n") : "Aucune expérience renseignée dans le profil.",
    "",
    "FORMATION",
    education.length ? education.map((e) => `${e.degree || "Formation"}${e.field ? ` — ${e.field}` : ""} — ${e.institution}`).join("\n") : "Aucune formation renseignée dans le profil.",
    "",
    `CANDIDATURE CIBLÉE : ${jobTitle}`,
  ];

  return sections.filter((section, index) => section !== "" || (sections[index - 1] && sections[index - 1] !== "")).join("\n");
}
