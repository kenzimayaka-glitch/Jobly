import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";

// GET /api/jobs — Écran "Offres" (spec Statut.md 12.1).
//
// Calcule un % de correspondance déterministe à 5 critères pondération égale
// (métier, ville, contrat, télétravail, expérience) — jamais un score IA.
// Le compteur "nombre réel d'offres" (totalActive) est toujours calculé sur
// TOUTES les offres actives, indépendamment des filtres appliqués à la liste
// retournée : les filtres ne doivent jamais fausser ce chiffre.

type Profile = {
  targetRoles: string[] | null;
  targetCities: string[] | null;
  contractPreferences: string[] | null;
  remotePreference: string | null;
};

type Experience = { startDate: string };

type Job = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  minExperienceYears: number | null;
  isActive: boolean;
  createdAt: string;
  companyId: string | null;
};

type Company = { id: string; name: string; logoUrl: string | null };

type RecruiterJobRow = {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  contract: string | null;
  remoteMode: string | null;
  minExperienceYears: number | null;
  status: string;
  createdAt: string;
};

// Forme commune utilisée par computeMatch, quelle que soit la source de l'offre.
type MatchableJob = {
  title: string;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  minExperienceYears: number | null;
};

function computeYearsExperience(experiences: Experience[]): number {
  if (!experiences.length) return 0;
  const earliest = experiences
    .map((e) => new Date(e.startDate).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)[0];
  if (earliest === undefined) return 0;
  const years = (Date.now() - earliest) / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.floor(years));
}

function normalize(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // insensible aux accents (ex: "Développeur" ~ "developpeur")
}

function computeMatch(profile: Profile, yearsExperience: number, job: MatchableJob) {
  const targetRoles = (profile.targetRoles || []).map(normalize).filter(Boolean);
  const targetCities = (profile.targetCities || []).map(normalize).filter(Boolean);
  const contractPreferences = (profile.contractPreferences || []).map(normalize).filter(Boolean);
  const remotePreference = normalize(profile.remotePreference) || "indifferent";

  const jobTitle = normalize(job.title);
  const jobLocation = normalize(job.location);
  const jobContract = normalize(job.contractType);
  const jobRemote = normalize(job.remoteMode) || "no";
  const minExperience = job.minExperienceYears ?? 0;

  // 1. Métier : l'intitulé du poste contient ou correspond au métier ciblé.
  const roleScore = targetRoles.length > 0 && targetRoles.some((role) => jobTitle.includes(role)) ? 1 : 0;

  // 2. Ville : correspond si la ville de l'offre = une ville souhaitée.
  const cityScore = targetCities.length > 0 && jobLocation ? (targetCities.includes(jobLocation) ? 1 : 0) : 0;

  // 3. Contrat : correspond si le type de contrat de l'offre est souhaité.
  const contractScore =
    contractPreferences.length > 0 && jobContract ? (contractPreferences.includes(jobContract) ? 1 : 0) : 0;

  // 4. Télétravail : "peu importe" matche toujours ; sinon égalité stricte = 1,
  //    "partiel" alors que le candidat veut du télétravail = 0.5, sinon 0.
  let remoteScore = 0;
  if (remotePreference === "indifferent") {
    remoteScore = 1;
  } else if (remotePreference === jobRemote) {
    remoteScore = 1;
  } else if (remotePreference === "yes" && jobRemote === "partial") {
    remoteScore = 0.5;
  }

  // 5. Expérience : avoir plus d'expérience que le minimum ne pénalise jamais.
  const experienceScore = yearsExperience >= minExperience ? 1 : 0;

  const total = roleScore + cityScore + contractScore + remoteScore + experienceScore;
  const matchPercent = Math.round((total / 5) * 100);

  return {
    matchPercent,
    breakdown: {
      role: roleScore,
      city: cityScore,
      contract: contractScore,
      remote: remoteScore,
      experience: experienceScore,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    const { searchParams } = new URL(request.url);
    const filterContract = searchParams.get("contractType");
    const filterCity = searchParams.get("city");
    const filterRemote = searchParams.get("remote"); // "YES" | "NO" | "PARTIAL"
    const search = searchParams.get("q");

    const [profileRes, experiencesRes, allActiveJobsRes, publishedRecruiterJobsRes] = await Promise.all([
      supabase.from("Profile").select("targetRoles,targetCities,contractPreferences,remotePreference").eq("userId", user.id).maybeSingle(),
      supabase.from("Experience").select("startDate").eq("userId", user.id),
      supabase.from("Job").select("*").eq("isActive", true).order("createdAt", { ascending: false }),
      supabase.from("RecruiterJob").select("*").eq("status", "published").order("createdAt", { ascending: false }),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (experiencesRes.error) throw new Error(experiencesRes.error.message);
    if (allActiveJobsRes.error) throw new Error(allActiveJobsRes.error.message);
    if (publishedRecruiterJobsRes.error) throw new Error(publishedRecruiterJobsRes.error.message);

    const profile: Profile = profileRes.data || {
      targetRoles: [],
      targetCities: [],
      contractPreferences: [],
      remotePreference: "INDIFFERENT",
    };
    const yearsExperience = computeYearsExperience((experiencesRes.data as Experience[]) || []);
    const discoveryJobs = (allActiveJobsRes.data as Job[]) || [];
    const recruiterJobs = (publishedRecruiterJobsRes.data as RecruiterJobRow[]) || [];

    // Compteur réel — TOUJOURS sur l'ensemble des offres actives des 2 sources, jamais filtré.
    const totalActive = discoveryJobs.length + recruiterJobs.length;

    // Forme unifiée : chaque offre porte "source" + "sourceId" pour que le
    // détail/candidature sache dans quelle table aller chercher/écrire ensuite.
    type UnifiedJob = {
      source: "discovery" | "recruiter";
      sourceId: string;
      title: string;
      location: string | null;
      contractType: string | null;
      remoteMode: string | null;
      minExperienceYears: number | null;
      companyName: string | null;
      companyId: string | null;
      createdAt: string;
    };

    let unified: UnifiedJob[] = [
      ...discoveryJobs.map((j): UnifiedJob => ({
        source: "discovery",
        sourceId: j.id,
        title: j.title,
        location: j.location,
        contractType: j.contractType,
        remoteMode: j.remoteMode,
        minExperienceYears: j.minExperienceYears,
        companyName: null, // résolu via Company plus bas
        companyId: j.companyId,
        createdAt: j.createdAt,
      })),
      ...recruiterJobs.map((j): UnifiedJob => ({
        source: "recruiter",
        sourceId: j.id,
        title: j.title,
        location: j.location,
        contractType: j.contract,
        remoteMode: j.remoteMode,
        minExperienceYears: j.minExperienceYears,
        companyName: j.companyName,
        companyId: null,
        createdAt: j.createdAt,
      })),
    ];

    const allUnified = [...unified];

    if (filterContract) unified = unified.filter((j) => normalize(j.contractType) === normalize(filterContract));
    if (filterCity) unified = unified.filter((j) => normalize(j.location) === normalize(filterCity));
    if (filterRemote) unified = unified.filter((j) => normalize(j.remoteMode) === normalize(filterRemote));
    if (search) {
      const needle = normalize(search);
      unified = unified.filter((j) => normalize(j.title).includes(needle));
    }

    const companyIds = Array.from(new Set(allUnified.map((j) => j.companyId).filter(Boolean))) as string[];
    const companiesRes = companyIds.length
      ? await supabase.from("Company").select("id,name,logoUrl").in("id", companyIds)
      : { data: [] as Company[], error: null };
    if (companiesRes.error) throw new Error(companiesRes.error.message);
    const companiesById = new Map((companiesRes.data as Company[]).map((c) => [c.id, c]));

    const results = unified
      .map((job) => {
        const { matchPercent, breakdown } = computeMatch(profile, yearsExperience, job);
        const discoveryCompany = job.companyId ? companiesById.get(job.companyId) : undefined;
        return {
          source: job.source, // "discovery" | "recruiter" — nécessaire pour créer la candidature au bon endroit
          id: job.sourceId,
          title: job.title,
          location: job.location,
          contractType: job.contractType,
          remoteMode: job.remoteMode,
          minExperienceYears: job.minExperienceYears,
          createdAt: job.createdAt,
          company: discoveryCompany
            ? { name: discoveryCompany.name, logoUrl: discoveryCompany.logoUrl }
            : job.companyName
              ? { name: job.companyName, logoUrl: null }
              : null,
          matchPercent,
          matchBreakdown: breakdown,
        };
      })
      .sort((a, b) => b.matchPercent - a.matchPercent);

    const matchingCount = allUnified.reduce((count, job) => {
      const { matchPercent } = computeMatch(profile, yearsExperience, job);
      return count + (matchPercent >= 60 ? 1 : 0);
    }, 0);

    return NextResponse.json({
      totalActive,
      matchingCount,
      count: results.length,
      yearsExperience,
      jobs: results,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger les offres." },
      { status: 500 }
    );
  }
}
