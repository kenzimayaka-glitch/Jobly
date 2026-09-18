import { adminClient } from "./server-auth";

export type OpportunityKind = "EMPLOI" | "STAGE" | "FORMATION";

export type CascadeOpportunity = {
  id: string;
  kind: OpportunityKind;
  title: string;
  company: string;
  logoUrl: string | null;
  sourceUrl: string | null;
  source: string;
  sourceType: "discovery" | "recruiter" | "external";
  matchScore: number;
  prestigeScore: number;
  score: number;
  badge: string;
  location: string | null;
};

type Profile = {
  targetRoles: string[];
  targetCities: string[];
  contractPreferences: string[];
  remotePreference: string;
  preferredSectors: string[];
};

type Experience = { title: string | null; description: string | null; startDate: string | null; endDate: string | null };
type Skill = { name: string | null; level: string | null };
type Education = { degree: string | null; field: string | null; institution: string | null };

function tokenize(value: string): string[] {
  return normalize(value).split(/\W+/).filter((x) => x.length > 2);
}

function overlapScore(needles: string[], haystack: string): number {
  const text = new Set(tokenize(haystack));
  const wanted = Array.from(new Set(needles.flatMap(tokenize)));
  if (!wanted.length) return 50;
  const hits = wanted.filter((token) => text.has(token)).length;
  return Math.min(100, Math.round((hits / wanted.length) * 100));
}

function experienceYears(experiences: Experience[]): number {
  const starts = experiences.map((x) => x.startDate ? new Date(x.startDate).getTime() : NaN).filter(Number.isFinite);
  if (!starts.length) return 0;
  return Math.max(0, Math.floor((Date.now() - Math.min(...starts)) / (365.25 * 24 * 60 * 60 * 1000)));
}

function achievementEvidence(experiences: Experience[]): number {
  const text = experiences.map((x) => String(x.description ?? "")).join(" ");
  if (!text.trim()) return 45;
  const quantified = /\b\d+(?:[.,]\d+)?\s*(?:%|x|k|m|b|xaf|fcfa|€|\$)|\b(?:million|milliard|millions|milliards)\b/i.test(text);
  const impact = /\b(?:augmented|increase|increased|growth|croissance|reduced|réduit|managed|géré|generated|généré|revenue|chiffre d'affaires|target|objectif|portfolio|clients|merchants|recruited|recruté|delivered|livré|achieved|atteint)\b/i.test(text);
  return quantified ? 100 : impact ? 75 : 55;
}

function matchProfileToOpportunity(
  profile: Profile,
  experiences: Experience[],
  skills: Skill[],
  education: Education[],
  job: { title: string; description?: string | null; location?: string | null; contract?: string | null; remoteMode?: string | null; minExperienceYears?: number | null; sector?: string | null; tags?: string[] }
): { matchScore: number; details: Record<string, number> } {
  const title = String(job.title ?? "");
  const description = String(job.description ?? "");
  const corpus = title + " " + description + " " + (job.tags ?? []).join(" ");
  const roles = profile.targetRoles;
  const role = roles.length ? Math.max(roleMatch(title, roles), overlapScore(roles, corpus)) : 50;
  const skillNames = skills.map((s) => String(s.name ?? "")).filter(Boolean);
  const skillsScore = skillNames.length ? overlapScore(skillNames, corpus) : 50;
  const years = experienceYears(experiences);
  const min = Number(job.minExperienceYears ?? 0);
  const expScore = min <= 0 ? (experiences.length ? 75 : 50) : Math.min(100, Math.round((years / min) * 100));
  const educationTerms = education.flatMap((e) => [e.degree, e.field, e.institution].filter(Boolean) as string[]);
  const educationScore = educationTerms.length ? overlapScore(educationTerms, corpus) : 50;
  const achievementScore = achievementEvidence(experiences);
  const targetCities = profile.targetCities.map(normalize).filter(Boolean);
  const location = normalize(job.location);
  const cityScore = targetCities.length ? (targetCities.some((c) => location.includes(c)) ? 100 : 40) : 60;
  const remote = normalize(profile.remotePreference);
  const jobRemote = normalize(job.remoteMode);
  const remoteScore = !remote || remote === "indifferent" || remote === jobRemote ? 100 : remote === "yes" && jobRemote === "partial" ? 75 : 40;
  const contractPrefs = profile.contractPreferences.map(normalize).filter(Boolean);
  const contractScore = contractPrefs.length ? (contractPrefs.includes(normalize(job.contract)) ? 100 : 40) : 60;
  const sectors = profile.preferredSectors;
  const sectorScore = sectors.length && job.sector ? overlapScore(sectors, String(job.sector)) : 60;
  const matchScore = Math.round(
    role * 0.22 +
    skillsScore * 0.22 +
    expScore * 0.15 +
    educationScore * 0.10 +
    achievementScore * 0.10 +
    cityScore * 0.07 +
    remoteScore * 0.06 +
    contractScore * 0.04 +
    sectorScore * 0.04
  );
  return { matchScore: Math.max(0, Math.min(100, matchScore)), details: { role, skills: skillsScore, experience: expScore, education: educationScore, achievements: achievementScore, city: cityScore, remote: remoteScore, contract: contractScore, sector: sectorScore } };
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function roleMatch(title: string, roles: string[]): number {
  if (!roles.length) return 50;
  const t = normalize(title);
  if (roles.some((role) => t.includes(normalize(role)))) return 100;
  const tokens = new Set(t.split(/\W+/).filter((x) => x.length > 3));
  const overlap = roles.flatMap((r) => normalize(r).split(/\W+/)).filter((x) => x.length > 3 && tokens.has(x));
  return overlap.length ? 75 : 35;
}

function sourcePrestige(source: string, verified = false): number {
  const s = normalize(source);
  if (verified) return 95;
  if (s.includes("microsoft")) return 95;
  if (s.includes("freecodecamp")) return 90;
  if (s.includes("jobly")) return 90;
  if (s.includes("recruiter")) return 75;
  return 65;
}

function brandLogo(company: string, website?: string | null): string | null {
  const clientId = process.env.BRANDFETCH_CLIENT_ID;
  if (!clientId) return null;
  let domain = "";
  try {
    if (website) domain = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
  } catch {}
  if (!domain) return null;
  return `https://cdn.brandfetch.io/${domain}/w/128/h/128?c=${encodeURIComponent(clientId)}`;
}

async function fetchFreeCodeCamp(): Promise<CascadeOpportunity[]> {
  const endpoint = "https://curriculum-db.freecodecamp.org/graphql";
  const query = `query { curriculum { superblocks { dashedName title } } }`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query }),
      cache: "force-cache",
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: { curriculum?: { superblocks?: Array<{ dashedName: string; title: string }> } } };
    const rows = body.data?.curriculum?.superblocks ?? [];
    return rows.slice(0, 20).map((row) => ({
      id: `fcc:${row.dashedName}`,
      kind: "FORMATION" as const,
      title: row.title,
      company: "freeCodeCamp",
      logoUrl: "https://www.freecodecamp.org/icons/icon-48x48.png",
      sourceUrl: `https://www.freecodecamp.org/learn/${encodeURIComponent(row.dashedName)}/`,
      source: "freeCodeCamp",
      sourceType: "external",
      matchScore: 50,
      prestigeScore: sourcePrestige("freeCodeCamp"),
      score: 50,
      badge: "Formation recommandée",
      location: "En ligne",
    }));
  } catch {
    return [];
  }
}

function extractCompanyName(title: string, description: string): string | null {
  const text = `${title} ${description}`;
  const patterns = [
    /(?:chez|pour|recrutement\s+chez|entreprise\s*:)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ0-9&.\- ]{2,60})/i,
    /(?:company|employer)\s*[:\-]\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ0-9&.\- ]{2,60})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.,;:]+$/, "");
  }
  return null;
}

export async function getCascadeOpportunities(userId: string): Promise<CascadeOpportunity[]> {
  const sb = adminClient();
  const [profileRes, experiencesRes, skillsRes, educationRes, jobsRes, recruiterRes, companiesRes] = await Promise.all([
    sb.from("Profile").select("targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors").eq("userId", userId).maybeSingle(),
    sb.from("Experience").select("title,description,startDate,endDate").eq("userId", userId),
    sb.from("Skill").select("name,level").eq("userId", userId),
    sb.from("Education").select("degree,field,institution").eq("userId", userId),
    sb.from("Job").select("id,title,location,contractType,remoteMode,minExperienceYears,companyId,source,sourceUrl,isActive,description,aiSector,aiSkills").eq("isActive", true).order("createdAt", { ascending: false }).limit(150),
    sb.from("RecruiterJob").select("id,title,companyName,description,location,contract,remoteMode,minExperienceYears,sector,tags,status").eq("status", "published").order("createdAt", { ascending: false }).limit(100),
    sb.from("Company").select("id,name,logoUrl,verified,website").limit(200),
  ]);
  for (const result of [profileRes, experiencesRes, skillsRes, educationRes, jobsRes, recruiterRes, companiesRes]) {
    if (result.error) throw new Error(result.error.message);
  }

  type ProfileRow = Partial<Record<keyof Profile, unknown>>;
  const rawProfile = (profileRes.data ?? {}) as ProfileRow;
  const profile: Profile = {
    targetRoles: Array.isArray(rawProfile.targetRoles) ? rawProfile.targetRoles.map(String) : [],
    targetCities: Array.isArray(rawProfile.targetCities) ? rawProfile.targetCities.map(String) : [],
    contractPreferences: Array.isArray(rawProfile.contractPreferences) ? rawProfile.contractPreferences.map(String) : [],
    remotePreference: String(rawProfile.remotePreference ?? "indifferent"),
    preferredSectors: Array.isArray(rawProfile.preferredSectors) ? rawProfile.preferredSectors.map(String) : [],
  };

  type CompanyRow = { id: string; name: string | null; logoUrl: string | null; verified: boolean | null; website: string | null };
  const companies = new Map<string, CompanyRow>((companiesRes.data ?? []).map((company: any) => [
    String(company.id),
    {
      id: String(company.id),
      name: company.name == null ? null : String(company.name),
      logoUrl: company.logoUrl == null ? null : String(company.logoUrl),
      verified: Boolean(company.verified),
      website: company.website == null ? null : String(company.website),
    },
  ]));
  const experiences = (experiencesRes.data ?? []) as Experience[];
  const skills = (skillsRes.data ?? []) as Skill[];
  const education = (educationRes.data ?? []) as Education[];
  const results: CascadeOpportunity[] = [];

  for (const job of jobsRes.data ?? []) {
    const isStage = /stage|internship|intern/i.test(String(job.contractType ?? "")) || /stage/i.test(String(job.title ?? ""));
    const company = job.companyId ? companies.get(job.companyId) : null;
    const detectedCompany = company?.name ?? extractCompanyName(String(job.title ?? ""), String(job.description ?? ""));
    if (!job.sourceUrl || !detectedCompany) continue;
    const matchResult = matchProfileToOpportunity(profile, experiences, skills, education, {
      title: String(job.title ?? ""),
      description: String(job.description ?? ""),
      location: job.location,
      contract: job.contractType,
      remoteMode: job.remoteMode,
      minExperienceYears: job.minExperienceYears,
      sector: job.aiSector,
      tags: Array.isArray(job.aiSkills) ? job.aiSkills.map(String) : [],
    });
    const matchScore = matchResult.matchScore;
    const prestige = sourcePrestige(String(job.source ?? "discovery"), Boolean(company?.verified));
    results.push({
      id: `job:${job.id}`,
      kind: isStage ? "STAGE" : "EMPLOI",
      title: job.title,
      company: detectedCompany,
      logoUrl: company?.logoUrl ?? brandLogo(detectedCompany, company?.website),
      sourceUrl: job.sourceUrl ?? null,
      source: String(job.source ?? "JOBLY"),
      sourceType: "discovery",
      matchScore,
      prestigeScore: prestige,
      score: Math.round(prestige * 0.5 + matchScore * 0.5),
      badge: isStage ? "Stage disponible" : `${detectedCompany} recrute`,
      location: job.location ?? null,
    });
  }

  for (const job of recruiterRes.data ?? []) {
    const isStage = /stage|internship|intern/i.test(String(job.contract ?? "")) || /stage/i.test(String(job.title ?? ""));
    const matchResult = matchProfileToOpportunity(profile, experiences, skills, education, {
      title: String(job.title ?? ""),
      description: String(job.description ?? ""),
      location: job.location,
      contract: job.contract,
      remoteMode: job.remoteMode,
      minExperienceYears: job.minExperienceYears,
      sector: job.sector,
      tags: Array.isArray(job.tags) ? job.tags.map(String) : [],
    });
    const matchScore = matchResult.matchScore;
    const prestige = sourcePrestige("recruiter");
    results.push({
      id: `recruiter:${job.id}`,
      kind: isStage ? "STAGE" : "EMPLOI",
      title: job.title,
      company: job.companyName,
      logoUrl: null,
      sourceUrl: null,
      source: "JOBLY Recruiter",
      sourceType: "recruiter",
      matchScore,
      prestigeScore: prestige,
      score: Math.round(prestige * 0.5 + matchScore * 0.5),
      badge: isStage ? "Stage disponible" : `${job.companyName} recrute`,
      location: job.location ?? null,
    });
  }

  const seen = new Set<string>();
  return results
    .filter((item) => item.kind === "EMPLOI" || item.kind === "STAGE")
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      const key = `${normalize(item.company)}|${normalize(item.title)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
