export type MatchingSkill = string | { name?: string | null; level?: string | null; provenance?: string | null };

export type MatchingExperience = {
  title?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type MatchingEducation = {
  degree?: string | null;
  field?: string | null;
  institution?: string | null;
};

export type MatchingCandidate = {
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  targetRoles?: string[];
  targetCities?: string[];
  contractPreferences?: string[];
  remotePreference?: string | null;
  preferredSectors?: string[];
  skills?: MatchingSkill[];
  experiences?: MatchingExperience[];
  education?: MatchingEducation[];
  experienceYears?: number | null;
  educationScore?: number | null;
  achievementScore?: number | null;
};

export type MatchingCriterion = {
  criterion: string;
  label?: string | null;
  weight?: number | null;
  required?: boolean | null;
};

export type MatchingJob = {
  title?: string | null;
  description?: string | null;
  location?: string | null;
  contractType?: string | null;
  remoteMode?: string | null;
  minExperienceYears?: number | null;
  sector?: string | null;
  tags?: unknown;
  aiSkills?: unknown;
  requiredSkills?: unknown;
  normalizedContent?: unknown;
};

export type MatchDimension = {
  score: number | null;
  weight: number;
  status: "MATCHED" | "PARTIAL" | "GAP" | "NOT_ASSESSED";
  evidence: string[];
  gaps: string[];
};

export type JobMatchResult = {
  score: number;
  confidence: number;
  coverage: number;
  dimensions: Record<string, MatchDimension>;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  gaps: string[];
  yearsExperience: number | null;
  algorithm: "jobly-matching-v2";
};

const STOP_WORDS = new Set([
  "avec", "dans", "pour", "une", "des", "les", "sur", "aux", "est", "etre", "par",
  "the", "and", "for", "with", "from", "this", "that", "you", "your", "are",
  "poste", "emploi", "mission", "missions", "profil", "experience", "experiences",
  "competence", "competences", "connaissance", "connaissances", "capacite", "capacites",
]);

const SKILL_GROUPS: Record<string, string[]> = {
  project_management: ["gestion de projet", "project management", "chef de projet", "project manager", "pmp", "agile", "scrum"],
  crm: ["crm", "customer relationship management", "salesforce", "hubspot", "dynamics 365", "microsoft dynamics"],
  data_analysis: ["analyse de donnees", "analyse des donnees", "data analysis", "data analyst", "power bi", "tableau", "reporting", "statistiques", "analytics"],
  spreadsheets: ["excel", "microsoft excel", "google sheets", "tableur", "tableurs"],
  sales: ["vente", "ventes", "commercial", "commerciale", "sales", "prospection", "negociation", "negociation commerciale", "gestion de portefeuille", "account management", "key account", "business development", "business developer", "account executive"],
  marketing: ["marketing", "marketing digital", "digital marketing", "seo", "sem", "content marketing", "marketing de contenu", "social media", "reseaux sociaux"],
  accounting: ["comptabilite", "comptable", "accounting", "accountant", "sage comptabilite", "sage 100"],
  finance: ["finance", "financial analysis", "analyse financiere", "budgetisation", "tresorerie", "financial reporting"],
  human_resources: ["ressources humaines", "rh", "human resources", "hr", "recrutement", "recruitment", "talent acquisition", "gestion des talents", "paie"],
  customer_service: ["service client", "relation client", "customer service", "customer support", "support client", "assistance clientele", "call center", "centre d appel"],
  administration: ["administration", "administratif", "administrative", "secretariat", "office management", "gestion administrative"],
  software_development: ["developpement logiciel", "developpement web", "software development", "software engineer", "developpeur", "developer", "programmation", "programming"],
  python: ["python"],
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  react: ["react", "reactjs", "react js"],
  sql: ["sql", "postgresql", "mysql", "sql server"],
  design: ["design graphique", "graphic design", "ui design", "ux design", "ui ux", "figma", "adobe photoshop", "illustrator"],
  communication: ["communication", "communication ecrite", "communication orale", "public relations", "relations publiques"],
  leadership: ["leadership", "management d equipe", "team management", "management", "encadrement", "supervision"],
  logistics: ["logistique", "supply chain", "gestion des stocks", "inventory management", "approvisionnement", "procurement"],
  cybersecurity: ["cybersecurite", "cybersecurity", "securite informatique", "penetration testing", "pentest"],
  cloud: ["cloud computing", "aws", "azure", "google cloud", "gcp", "devops", "kubernetes", "docker"],
};

const ROLE_FAMILIES: Record<string, string[]> = {
  sales: ["commercial", "commerciale", "sales", "vente", "business developer", "business development", "charge d affaires", "account executive", "responsable commercial"],
  marketing: ["marketing", "communication", "brand manager", "community manager", "traffic manager", "seo", "social media"],
  finance: ["finance", "comptable", "comptabilite", "accountant", "auditeur", "audit", "controleur de gestion", "financial analyst"],
  hr: ["ressources humaines", "rh", "recruteur", "recruteuse", "recruiter", "talent acquisition", "gestionnaire rh", "hr manager"],
  data: ["data analyst", "analyste de donnees", "business analyst", "data scientist", "analyste", "bi analyst"],
  engineering: ["ingenieur", "engineer", "developpeur", "developer", "technicien", "technicienne", "maintenance"],
  operations: ["operations", "exploitation", "logistique", "supply chain", "responsable operations"],
  administration: ["assistant administratif", "assistante administrative", "office manager", "assistant de direction", "secretaire", "administrateur"],
  customer: ["service client", "relation client", "customer success", "customer service", "charge de clientele", "support client"],
  project: ["chef de projet", "project manager", "coordinateur de projet", "coordinatrice de projet", "program manager"],
  design: ["designer", "graphiste", "ux designer", "ui designer", "product designer"],
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: unknown): string[] {
  return normalize(value).split(/[\s-]+/).filter((item) => item.length > 2 && !STOP_WORDS.has(item));
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" || typeof item === "number") return [String(item)];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const text = record.name ?? record.label ?? record.skill ?? record.value ?? record.title;
        return text == null ? [] : [String(text)];
      }
      return [];
    }).map((item) => item.trim()).filter(Boolean);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return ["requiredSkills", "hardSkills", "skills", "tags", "keywords"].flatMap((key) => asStrings(record[key]));
  }
  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return [];
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return asStrings(parsed);
    } catch { /* plain text list */ }
    return clean.split(/[,;|\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function phrasePresent(haystack: string, phrase: string): boolean {
  if (!haystack || !phrase) return false;
  return (" " + haystack + " ").includes(" " + phrase + " ");
}

function skillKey(value: string): string | null {
  const normalized = normalize(value);
  for (const [key, aliases] of Object.entries(SKILL_GROUPS)) {
    if (aliases.some((alias) => {
      const item = normalize(alias);
      return normalized === item || phrasePresent(" " + normalized + " ", item);
    })) return key;
  }
  return null;
}

function detectedSkillKeys(value: string): Set<string> {
  const normalized = " " + normalize(value) + " ";
  const result = new Set<string>();
  for (const [key, aliases] of Object.entries(SKILL_GROUPS)) {
    if (aliases.some((alias) => phrasePresent(normalized, normalize(alias)))) result.add(key);
  }
  return result;
}

function roleFamily(value: string): string | null {
  const normalized = normalize(value);
  for (const [key, aliases] of Object.entries(ROLE_FAMILIES)) {
    if (aliases.some((alias) => {
      const item = normalize(alias);
      return normalized === item || phrasePresent(" " + normalized + " ", item) || phrasePresent(" " + item + " ", normalized);
    })) return key;
  }
  return null;
}

function yearsOfExperience(experiences: MatchingExperience[], fallback?: number | null): number | null {
  const now = Date.now();
  const intervals = experiences.flatMap((item) => {
    const start = item.startDate ? new Date(item.startDate).getTime() : Number.NaN;
    const end = item.endDate ? new Date(item.endDate).getTime() : now;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > now || end <= start) return [];
    return [{ start, end: Math.min(end, now) }];
  }).sort((a, b) => a.start - b.start);
  if (!intervals.length) return typeof fallback === "number" && Number.isFinite(fallback) ? Math.max(0, fallback) : null;
  let totalMs = 0;
  let current = { ...intervals[0] };
  for (const next of intervals.slice(1)) {
    if (next.start <= current.end) current.end = Math.max(current.end, next.end);
    else {
      totalMs += current.end - current.start;
      current = { ...next };
    }
  }
  totalMs += current.end - current.start;
  return Math.max(0, Math.round((totalMs / (365.25 * 86400000)) * 10) / 10);
}

function educationLevel(value: string): number | null {
  const text = normalize(value);
  if (/doctorat|phd|ph\.d|doctoral/.test(text)) return 6;
  if (/master|msc|mba|bac\s*\+\s*5|ingenieur|engineer/.test(text)) return 5;
  if (/licence|license|bachelor|bac\s*\+\s*3/.test(text)) return 4;
  if (/bts|dut|deug|bac\s*\+\s*2|associate/.test(text)) return 3;
  if (/baccalaureat|baccalaureate|high school|bac general|bac technique/.test(text)) return 2;
  if (/cap|bep|vocational/.test(text)) return 1;
  return null;
}

function requiredEducationLevel(job: MatchingJob): number | null {
  const text = normalize(job.description);
  const patterns: Array<[RegExp, number]> = [
    [/doctorat|phd|ph\.d|doctoral/, 6],
    [/master|msc|mba|bac\s*\+\s*5|ingenieur/, 5],
    [/licence|license|bachelor|bac\s*\+\s*3/, 4],
    [/bts|dut|deug|bac\s*\+\s*2|associate/, 3],
    [/baccalaureat|baccalaureate|high school|bac general|bac technique/, 2],
    [/cap|bep|vocational/, 1],
  ];
  for (const [pattern, level] of patterns) if (pattern.test(text)) return level;
  return null;
}

function buildCandidateText(candidate: MatchingCandidate): string {
  return [
    candidate.headline, candidate.summary,
    ...(candidate.skills ?? []).map((item) => typeof item === "string" ? item : item.name ?? ""),
    ...(candidate.experiences ?? []).flatMap((item) => [item.title, item.description]),
    ...(candidate.education ?? []).flatMap((item) => [item.degree, item.field, item.institution]),
  ].filter(Boolean).join(" ");
}

function dimension(score: number | null, weight: number, evidence: string[] = [], gaps: string[] = []): MatchDimension {
  return {
    score,
    weight,
    status: score === null ? "NOT_ASSESSED" : score >= 80 ? "MATCHED" : score >= 50 ? "PARTIAL" : "GAP",
    evidence,
    gaps,
  };
}

function overlapScore(needle: string, haystack: string): number {
  const required = [...new Set(tokens(needle))];
  if (!required.length) return 0;
  const available = new Set(tokens(haystack));
  const covered = required.filter((item) => available.has(item)).length / required.length;
  if (covered >= 0.8) return 100;
  if (covered >= 0.55) return 70;
  if (covered >= 0.3) return 45;
  return 0;
}

function candidateSkillKeys(candidate: MatchingCandidate): Set<string> {
  const found = new Set<string>();
  for (const skill of candidate.skills ?? []) {
    const name = typeof skill === "string" ? skill : String(skill.name ?? "");
    const key = skillKey(name);
    if (key) found.add(key);
    for (const detected of detectedSkillKeys(name)) found.add(detected);
  }
  const experienceText = (candidate.experiences ?? []).map((item) => [item.title, item.description].filter(Boolean).join(" ")).join(" ");
  for (const key of detectedSkillKeys(experienceText)) found.add(key);
  return found;
}

function jobSkillRequirements(job: MatchingJob): string[] {
  const explicit = [
    ...asStrings(job.requiredSkills),
    ...asStrings(job.aiSkills),
    ...asStrings(job.tags),
    ...asStrings(job.normalizedContent),
  ];
  const detected = [...detectedSkillKeys(String(job.title ?? "") + " " + String(job.description ?? ""))];
  const unique = new Map<string, string>();
  for (const value of explicit) unique.set(skillKey(value) ?? normalize(value), value);
  for (const value of detected) unique.set(value, value.replace(/_/g, " "));
  return [...unique.values()].filter(Boolean).slice(0, 30);
}

function roleMatch(candidate: MatchingCandidate, job: MatchingJob): number | null {
  const jobTitle = normalize(job.title);
  const candidateRoles = [
    ...(candidate.targetRoles ?? []),
    candidate.headline ?? "",
    ...(candidate.experiences ?? []).map((item) => item.title ?? ""),
  ].map(normalize).filter(Boolean);
  if (!jobTitle || !candidateRoles.length) return null;
  if (candidateRoles.some((role) => role === jobTitle || phrasePresent(" " + role + " ", jobTitle) || phrasePresent(" " + jobTitle + " ", role))) return 100;
  const targetFamily = roleFamily(jobTitle);
  if (targetFamily && candidateRoles.some((role) => roleFamily(role) === targetFamily)) return 88;
  return Math.max(...candidateRoles.map((role) => overlapScore(jobTitle, role)), 0);
}

function preferenceScore(preferences: string[], actual: string | null | undefined): number | null {
  if (!preferences.length || !actual) return null;
  const target = normalize(actual);
  return preferences.some((item) => {
    const value = normalize(item);
    return value === target || phrasePresent(" " + target + " ", value) || phrasePresent(" " + value + " ", target);
  }) ? 100 : 0;
}

function quantifiedEvidence(candidate: MatchingCandidate): string[] {
  const regex = /\b\d+(?:[.,]\d+)?\s*(?:%|k\b|m\b|bn\b|xaf\b|fcfa\b|euros?\b|usd\b)|\b\d+\s+(?:clients?|comptes?|personnes?|collaborateurs?|projets?|pays?|sites?|jours?|mois|ans?)\b/gi;
  return (candidate.experiences ?? []).flatMap((item) => (String(item.description ?? "").match(regex) ?? []).slice(0, 6)).slice(0, 20);
}

export function scoreJobMatch(candidate: MatchingCandidate, job: MatchingJob): JobMatchResult {
  const experiences = candidate.experiences ?? [];
  const education = candidate.education ?? [];
  const candidateText = buildCandidateText(candidate);
  const candidateSkillSet = candidateSkillKeys(candidate);
  const requiredSkills = jobSkillRequirements(job);
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  let skillScore: number | null = null;
  if (requiredSkills.length && ((candidate.skills?.length ?? 0) > 0 || experiences.length > 0)) {
    const outcomes = requiredSkills.map((required) => {
      const key = skillKey(required);
      const matched = key ? candidateSkillSet.has(key) : overlapScore(required, candidateText) >= 70;
      return { required, matched };
    });
    matchedSkills.push(...outcomes.filter((item) => item.matched).map((item) => item.required));
    missingSkills.push(...outcomes.filter((item) => !item.matched).map((item) => item.required));
    skillScore = Math.round((matchedSkills.length / Math.max(1, requiredSkills.length)) * 100);
  }

  const years = yearsOfExperience(experiences, candidate.experienceYears);
  const minYears = Number(job.minExperienceYears ?? 0);
  const experienceScore = minYears > 0 && years !== null
    ? Math.min(100, Math.round((years / minYears) * 100))
    : minYears === 0 && experiences.length > 0 ? 100 : null;

  const requiredLevel = requiredEducationLevel(job);
  const candidateLevel = education.map((item) => educationLevel([item.degree, item.field].filter(Boolean).join(" "))).filter((value): value is number => value !== null);
  const educationScore = requiredLevel === null ? null : candidateLevel.length ? (Math.max(...candidateLevel) >= requiredLevel ? 100 : Math.round((Math.max(...candidateLevel) / requiredLevel) * 100)) : typeof candidate.educationScore === "number" ? candidate.educationScore : education.length ? 0 : null;

  const measurable = quantifiedEvidence(candidate);
  const asksForResults = /kpi|indicateurs|objectifs chiffres|resultats mesurables|performance|chiffre d affaires|croissance|productivite|roi|rendement|targets|measurable results/i.test(normalize(job.description));
  const achievementScore = asksForResults ? (typeof candidate.achievementScore === "number" ? candidate.achievementScore : measurable.length ? 100 : experiences.length ? 20 : null) : null;

  const targetRoles = candidate.targetRoles ?? [];
  const roleScore = roleMatch(candidate, job);
  const locationScore = preferenceScore(candidate.targetCities ?? [], job.location);
  const contractScore = preferenceScore(candidate.contractPreferences ?? [], job.contractType);
  const preferredRemote = normalize(candidate.remotePreference);
  const jobRemote = normalize(job.remoteMode);
  const remoteScore = !preferredRemote || ["indifferent", "peu importe"].includes(preferredRemote)
    ? null
    : jobRemote ? ((preferredRemote === jobRemote || (preferredRemote === "yes" && jobRemote === "partial")) ? 100 : 0) : null;
  const sectorScore = preferenceScore(candidate.preferredSectors ?? [], job.sector);

  const dimensions: Record<string, MatchDimension> = {
    role: dimension(roleScore, 20, roleScore !== null && targetRoles.length ? targetRoles.slice(0, 3) : [], roleScore === 0 ? ["Intitulé ou famille de métier éloignés"] : []),
    skills: dimension(skillScore, 30, matchedSkills, missingSkills),
    experience: dimension(experienceScore, 15, years === null ? [] : [years + " an(s) d’expérience"], experienceScore !== null && experienceScore < 100 ? ["Expérience inférieure au minimum demandé"] : []),
    education: dimension(educationScore, 10, candidateLevel.length ? ["Niveau de formation détecté : " + Math.max(...candidateLevel)] : [], educationScore !== null && educationScore < 100 ? ["Niveau de formation requis non démontré"] : []),
    achievements: dimension(achievementScore, 5, measurable, achievementScore === 20 ? ["Aucune réalisation chiffrée détectée"] : []),
    location: dimension(locationScore, 7, locationScore === 100 ? (candidate.targetCities ?? []).slice(0, 3) : [], locationScore === 0 ? ["Ville différente des préférences déclarées"] : []),
    remote: dimension(remoteScore, 3, remoteScore === 100 ? [String(job.remoteMode)] : [], remoteScore === 0 ? ["Mode de travail incompatible avec la préférence déclarée"] : []),
    contract: dimension(contractScore, 5, contractScore === 100 ? (candidate.contractPreferences ?? []).slice(0, 3) : [], contractScore === 0 ? ["Type de contrat différent des préférences déclarées"] : []),
    sector: dimension(sectorScore, 5, sectorScore === 100 ? (candidate.preferredSectors ?? []).slice(0, 3) : [], sectorScore === 0 ? ["Secteur éloigné des préférences déclarées"] : []),
  };

  const active = Object.values(dimensions).filter((item) => item.score !== null);
  const activeWeight = active.reduce((sum, item) => sum + item.weight, 0);
  const weighted = active.reduce((sum, item) => sum + Number(item.score) * item.weight, 0);
  const score = activeWeight ? Math.max(0, Math.min(100, Math.round(weighted / activeWeight))) : 0;
  const profileSignals = [
    Boolean(candidate.headline || candidate.summary),
    Boolean(candidate.skills?.length),
    Boolean(experiences.length),
    Boolean(education.length),
    Boolean(candidate.targetRoles?.length || candidate.location),
  ].filter(Boolean).length;
  const confidence = Math.max(0, Math.min(100, Math.round((activeWeight / 100) * (0.55 + profileSignals / 5 * 0.45) * 100)));
  const reasons = Object.entries(dimensions)
    .filter(([, item]) => item.score !== null && item.score >= 70)
    .map(([key]) => key + " : correspondance détectée");
  const gaps = [
    ...missingSkills.map((item) => "Compétence à démontrer : " + item),
    ...Object.values(dimensions).flatMap((item) => item.gaps),
  ].slice(0, 12);
  return {
    score,
    confidence,
    coverage: Math.round(activeWeight),
    dimensions,
    matchedSkills,
    missingSkills,
    reasons,
    gaps,
    yearsExperience: years,
    algorithm: "jobly-matching-v2",
  };
}

export function scoreRecruiterApplication(input: {
  candidate: MatchingCandidate;
  job: MatchingJob;
  criteria?: MatchingCriterion[];
  cvProvided?: boolean;
  verifiedDocumentKinds?: string[];
}): {
  atsScore: number;
  profileCompleteness: number;
  baseMatch: JobMatchResult;
  matchedCriteria: Array<Record<string, unknown>>;
  missingCriteria: Array<Record<string, unknown>>;
  missingDocuments: Array<Record<string, unknown>>;
} {
  const { candidate, job, criteria = [], cvProvided = false, verifiedDocumentKinds = [] } = input;
  const baseMatch = scoreJobMatch(candidate, job);
  const candidateText = normalize(buildCandidateText(candidate));
  const skillKeys = candidateSkillKeys(candidate);
  const matchedCriteria: Array<Record<string, unknown>> = [];
  const missingCriteria: Array<Record<string, unknown>> = [];
  let criteriaTotal = 0;
  let criteriaMatched = 0;

  for (const item of criteria) {
    const weight = Math.max(0, Number(item.weight ?? 1));
    if (!weight || !item.criterion?.trim()) continue;
    const key = skillKey(item.criterion);
    let score = key && skillKeys.has(key) ? 100 : overlapScore(item.criterion, candidateText);
    if (candidateText.includes(normalize(item.criterion))) score = 100;
    criteriaTotal += weight;
    const record = {
      criterion: item.criterion,
      label: item.label ?? item.criterion,
      weight,
      required: Boolean(item.required),
      score,
    };
    if (score >= 70) {
      criteriaMatched += weight;
      matchedCriteria.push(record);
    } else {
      missingCriteria.push(record);
    }
  }

  const criteriaScore = criteriaTotal ? Math.round((criteriaMatched / criteriaTotal) * 100) : null;
  const atsScore = criteriaScore === null
    ? baseMatch.score
    : Math.round(baseMatch.score * 0.6 + criteriaScore * 0.4);
  const hasProfile = Boolean(candidate.headline || candidate.summary || candidate.location);
  const hasSkills = Boolean(candidate.skills?.length);
  const hasExperiences = Boolean(candidate.experiences?.length);
  const hasEducation = Boolean(candidate.education?.length);
  const verifiedDocs = new Set(verifiedDocumentKinds.map(normalize));
  const profileCompleteness = Math.min(100, Math.round(
    (hasProfile ? 20 : 0) +
    (hasSkills ? 25 : 0) +
    (hasExperiences ? 30 : 0) +
    (hasEducation ? 15 : 0) +
    (cvProvided ? 5 : 0) +
    (verifiedDocs.size ? 5 : 0)
  ));
  const missingDocuments = [
    ...(cvProvided ? [] : [{ kind: "CV", required: true }]),
  ];

  return {
    atsScore: Math.max(0, Math.min(100, atsScore)),
    profileCompleteness,
    baseMatch,
    matchedCriteria,
    missingCriteria,
    missingDocuments,
  };
}
