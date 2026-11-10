import { adminClient } from "./server-auth";
import { scoreJobMatch, type MatchingCandidate, type MatchingJob, type MatchDimension } from "./matchingEngine";

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
  matchConfidence: number;
  matchCoverage: number;
  matchBreakdown: Record<string, MatchDimension>;
  matchedSkills: string[];
  missingSkills: string[];
  matchReasons: string[];
  prestigeScore: number;
  score: number;
  badge: string;
  location: string | null;
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  description?: string | null;
  location?: string | null;
  contractType?: string | null;
  contract?: string | null;
  remoteMode?: string | null;
  minExperienceYears?: number | null;
  sector?: string | null;
  tags?: unknown;
}): number {
  return scoreJobMatch({
    targetRoles: input.targetRoles,
    targetCities: input.targetCities,
    contractPreferences: input.contractPreferences,
    remotePreference: input.remotePreference,
    preferredSectors: input.preferredSectors,
    skills: input.skills,
    experienceYears: input.experienceYears,
    educationScore: input.educationScore,
    achievementScore: input.achievementScore,
  }, {
    title: job.title,
    description: job.description,
    location: job.location,
    contractType: job.contractType ?? job.contract,
    remoteMode: job.remoteMode,
    minExperienceYears: job.minExperienceYears,
    sector: job.sector,
    tags: job.tags,
  }).score;
}

function sourcePrestige(source: string, verified = false): number {
  const value = normalize(source);
  if (verified) return 95;
  if (value.includes("microsoft")) return 95;
  if (value.includes("freecodecamp")) return 90;
  if (value.includes("jobly")) return 90;
  if (value.includes("recruiter")) return 75;
  return 65;
}

function brandLogo(website?: string | null): string | null {
  const clientId = process.env.BRANDFETCH_CLIENT_ID;
  if (!clientId || !website) return null;
  try {
    const domain = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
    return `https://cdn.brandfetch.io/${domain}/w/128/h/128?c=${encodeURIComponent(clientId)}`;
  } catch {
    return null;
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
  const [profileRes, skillsRes, experiencesRes, educationRes, jobsRes, recruiterRes, companiesRes] = await Promise.all([
    sb.from("Profile").select("headline,summary,location,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors").eq("userId", userId).maybeSingle(),
    sb.from("Skill").select("name,level,provenance").eq("userId", userId).limit(60),
    sb.from("Experience").select("title,description,startDate,endDate").eq("userId", userId).limit(30),
    sb.from("Education").select("degree,field,institution").eq("userId", userId).limit(20),
    sb.from("Job").select("id,title,description,location,contractType,remoteMode,minExperienceYears,companyId,source,sourceUrl,isActive,tags,aiSkills,aiSector,opportunityType,normalizedContent").eq("isActive", true).order("createdAt", { ascending: false }).limit(150),
    sb.from("RecruiterJob").select("id,title,description,companyName,location,contract,remoteMode,minExperienceYears,sector,tags,status").eq("status", "published").order("createdAt", { ascending: false }).limit(100),
    sb.from("Company").select("id,name,logoUrl,verified,website").limit(200),
  ]);
  for (const result of [profileRes, skillsRes, experiencesRes, educationRes, jobsRes, recruiterRes, companiesRes]) {
    if (result.error) throw new Error(result.error.message);
  }

  const profile = profileRes.data ?? {};
  const candidate: MatchingCandidate = {
    headline: profile.headline,
    summary: profile.summary,
    location: profile.location,
    targetRoles: Array.isArray(profile.targetRoles) ? profile.targetRoles : [],
    targetCities: Array.isArray(profile.targetCities) ? profile.targetCities : [],
    contractPreferences: Array.isArray(profile.contractPreferences) ? profile.contractPreferences : [],
    remotePreference: profile.remotePreference,
    preferredSectors: Array.isArray(profile.preferredSectors) ? profile.preferredSectors : [],
    skills: skillsRes.data ?? [],
    experiences: experiencesRes.data ?? [],
    education: educationRes.data ?? [],
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
    const isStage = /stage|internship|intern/i.test(String(job.opportunityType ?? "")) ||
      /stage|internship|intern/i.test(String(job.contractType ?? "")) ||
      /stage|internship/i.test(String(job.title ?? ""));
    const company = job.companyId ? companies.get(job.companyId) : null;
    const detectedCompany = company?.name ?? extractCompanyName(String(job.title ?? ""), String(job.description ?? ""));
    if (!job.sourceUrl || !detectedCompany) continue;

    const match = scoreJobMatch(candidate, {
      title: job.title,
      description: job.description,
      location: job.location,
      contractType: job.contractType,
      remoteMode: job.remoteMode,
      minExperienceYears: job.minExperienceYears,
      sector: job.aiSector,
      tags: [...(job.tags ?? []), ...(Array.isArray(job.aiSkills) ? job.aiSkills : [])],\n      normalizedContent: job.normalizedContent,
    } satisfies MatchingJob);
    const prestige = sourcePrestige(String(job.source ?? "discovery"), Boolean(company?.verified));
    results.push({
      id: `job:${job.id}`,
      kind,
      title: job.title,
      company: detectedCompany,
      logoUrl: company?.logoUrl ?? brandLogo(company?.website),
      sourceUrl: job.sourceUrl,
      source: String(job.source ?? "JOBLY"),
      sourceType: "discovery",
      matchScore: match.score,
      matchConfidence: match.confidence,
      matchCoverage: match.coverage,
      matchBreakdown: match.dimensions,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      matchReasons: match.reasons,
      prestigeScore: prestige,
      score: match.score,
      badge: isStage ? "Stage disponible" : `${detectedCompany} recrute`,
      location: job.location ?? null,
    });
  }

  for (const job of recruiterRes.data ?? []) {
    const isStage = /stage|internship|intern/i.test(String(job.contract ?? "")) || /stage|internship/i.test(String(job.title ?? ""));
    const match = scoreJobMatch(candidate, {
      title: job.title,
      description: job.description,
      location: job.location,
      contractType: job.contract,
      remoteMode: job.remoteMode,
      minExperienceYears: job.minExperienceYears,
      sector: job.sector,
      tags: job.tags,
    });
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
      matchScore: match.score,
      matchConfidence: match.confidence,
      matchCoverage: match.coverage,
      matchBreakdown: match.dimensions,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      matchReasons: match.reasons,
      prestigeScore: prestige,
      score: match.score,
      badge: isStage ? "Stage disponible" : `${job.companyName} recrute`,
      location: job.location ?? null,
    });
  }

  const seen = new Set<string>();
  return results
    .filter((item) => item.kind === "EMPLOI" || item.kind === "STAGE")
    .sort((a, b) => b.score - a.score || b.matchConfidence - a.matchConfidence || b.prestigeScore - a.prestigeScore)
    .filter((item) => {
      const key = `${normalize(item.company)}|${normalize(item.title)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
