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

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function calculateExplainableMatch(input: {
  targetRoles?: string[];
  targetCities?: string[];
  contractPreferences?: string[];
  remotePreference?: string;
  preferredSectors?: string[];
  skills?: string[];
  experienceYears?: number;
  educationScore?: number;
  achievementScore?: number;
}, job: {
  title?: string;
  location?: string | null;
  contractType?: string | null;
  contract?: string | null;
  remoteMode?: string | null;
  minExperienceYears?: number | null;
  sector?: string | null;
  tags?: unknown;
}): number {
  const roles = (input.targetRoles ?? []).map(normalize);
  const cities = (input.targetCities ?? []).map(normalize);
  const contracts = (input.contractPreferences ?? []).map(normalize);
  const preferredRemote = normalize(input.remotePreference ?? "indifferent");
  const sectors = (input.preferredSectors ?? []).map(normalize);
  const skills = (input.skills ?? []).map(normalize);
  const title = normalize(job.title);
  const location = normalize(job.location);
  const contract = normalize(job.contractType ?? job.contract);
  const remote = normalize(job.remoteMode);
  const sector = normalize(job.sector);
  const tags = Array.isArray(job.tags) ? job.tags.map(normalize) : String(job.tags ?? "").split(/[,|]/).map(normalize).filter(Boolean);

  const role = roles.length ? (roles.some(r => title.includes(r) || r.includes(title)) ? 100 : 0) : 50;
  const skill = skills.length && tags.length
    ? Math.min(100, Math.round((skills.filter(s => tags.some(t => t.includes(s) || s.includes(t))).length / Math.max(1, skills.length)) * 100))
    : 50;
  const experience = input.experienceYears == null || job.minExperienceYears == null
    ? 50
    : input.experienceYears >= Number(job.minExperienceYears) ? 100 : 0;
  const education = input.educationScore ?? 50;
  const achievements = input.achievementScore ?? 50;
  const city = cities.length ? (cities.some(c => location.includes(c) || c.includes(location)) ? 100 : 0) : 50;
  const remoteScore = !preferredRemote || preferredRemote === "indifferent" || preferredRemote === "peu importe"
    ? 100
    : (remote === preferredRemote || (preferredRemote === "oui" && remote === "partiel")) ? 100 : 0;
  const contractScore = contracts.length ? (contracts.some(c => contract.includes(c) || c.includes(contract)) ? 100 : 0) : 50;
  const sectorScore = sectors.length && sector ? (sectors.some(s => sector.includes(s) || s.includes(sector)) ? 100 : 0) : 50;

  return Math.round(
    role * 0.22 + skill * 0.22 + experience * 0.15 + education * 0.10 +
    achievements * 0.10 + city * 0.07 + remoteScore * 0.06 +
    contractScore * 0.04 + sectorScore * 0.04
  );
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
  const [profileRes, jobsRes, recruiterRes, companiesRes] = await Promise.all([
    sb.from("Profile").select("targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors").eq("userId", userId).maybeSingle(),
    sb.from("Job").select("id,title,location,contractType,remoteMode,minExperienceYears,companyId,source,sourceUrl,isActive,description").eq("isActive", true).order("createdAt", { ascending: false }).limit(150),
    sb.from("RecruiterJob").select("id,title,companyName,location,contract,remoteMode,minExperienceYears,status").eq("status", "published").order("createdAt", { ascending: false }).limit(100),
    sb.from("Company").select("id,name,logoUrl,verified,website").limit(200),
  ]);
  for (const result of [profileRes, jobsRes, recruiterRes, companiesRes]) {
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
  const results: CascadeOpportunity[] = [];

  for (const job of jobsRes.data ?? []) {
    const isStage = /stage|internship|intern/i.test(String(job.contractType ?? "")) || /stage/i.test(String(job.title ?? ""));
    const company = job.companyId ? companies.get(job.companyId) : null;
    const detectedCompany = company?.name ?? extractCompanyName(String(job.title ?? ""), String(job.description ?? ""));
    if (!job.sourceUrl || !detectedCompany) continue;
    const match = roleMatch(job.title, profile.targetRoles);
    const city = profile.targetCities.length && profile.targetCities.some((c) => normalize(c) === normalize(job.location)) ? 100 : 50;
    const remote = profile.remotePreference.toLowerCase() === "indifferent" || normalize(profile.remotePreference) === normalize(job.remoteMode) ? 100 : 50;
    const matchScore = Math.round(match * 0.65 + city * 0.2 + remote * 0.15);
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
    const match = roleMatch(job.title, profile.targetRoles);
    const city = profile.targetCities.length && profile.targetCities.some((c) => normalize(c) === normalize(job.location)) ? 100 : 50;
    const matchScore = Math.round(match * 0.75 + city * 0.25);
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
