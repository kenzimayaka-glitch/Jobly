import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OFFLINE_DAYS = 7;
const OFFER_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    if (request.headers.get("x-jobly-offline-bootstrap") !== "1") {
      return NextResponse.json({ message: "Téléchargement hors connexion explicite requis." }, { status: 400 });
    }
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const db = adminClient();
    const user = await ensureUser(db, authUser);
    const [profile, experiences, skills, education, applications, offers, recruiterProfile, recruiterJobs, partnerProfile] = await Promise.all([
      db.from("Profile").select("firstName,lastName,phone,country,headline,summary,location,targetRoles,preferredSectors,targetCities,contractPreferences,remotePreference").eq("userId", user.id).maybeSingle(),
      db.from("Experience").select("id,company,title,startDate,endDate,description,provenance").eq("userId", user.id).order("startDate", { ascending: false }).limit(100),
      db.from("Skill").select("id,name,level,provenance").eq("userId", user.id).order("name").limit(200),
      db.from("Education").select("id,institution,degree,field,startDate,endDate,provenance").eq("userId", user.id).order("startDate", { ascending: false }).limit(100),
      db.from("Application").select("id,jobId,recruiterJobId,status,language,letterText,atsScore,submittedAt,createdAt,updatedAt").eq("userId", user.id).order("updatedAt", { ascending: false }).limit(200),
      db.from("Job").select("id,title,description,location,contractType,deadline,source,sourceUrl,lastSeenAt,remoteMode,salaryMin,salaryMax,salaryCurrency,companyId,applicationReady,countryCode").eq("isActive", true).order("lastSeenAt", { ascending: false }).limit(OFFER_LIMIT),
      db.from("RecruiterProfile").select("companyName,sector,website,location,verified").eq("userId", authUser.id).maybeSingle(),
      db.from("RecruiterJob").select("id,title,companyName,description,location,mode,contract,salary,sector,tags,status,createdAt,updatedAt").eq("recruiterUserId", authUser.id).order("updatedAt", { ascending: false }).limit(100),
      db.from("Partner").select("referralCode,partnerType,kycStatus,locationText").eq("userId", user.id).maybeSingle(),
    ]);
    for (const result of [profile, experiences, skills, education, applications, offers, recruiterProfile, recruiterJobs, partnerProfile]) {
      if (result.error) throw new Error(result.error.message);
    }

    const companyIds = [...new Set((offers.data || []).map((job) => job.companyId).filter((id): id is string => Boolean(id)))];
    const companies = companyIds.length
      ? await db.from("Company").select("id,name,logoUrl,website,verified").in("id", companyIds)
      : { data: [], error: null };
    if (companies.error) throw new Error(companies.error.message);
    const companyById = new Map((companies.data || []).map((company) => [company.id, company]));
    const generatedAt = new Date();
    const expiresAt = new Date(generatedAt.getTime() + OFFLINE_DAYS * 24 * 60 * 60 * 1000);

    return NextResponse.json({
      userId: user.id,
      authUserId: authUser.id,
      generatedAt: generatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      user: {
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePhotoUrl: user.profilePhotoUrl,
        cvOriginalFileName: user.cvOriginalFileName,
        cvOriginalPageCount: user.cvOriginalPageCount,
        cvOriginalUploadedAt: user.cvOriginalUploadedAt,
      },
      profile: profile.data || {},
      experiences: experiences.data || [],
      skills: skills.data || [],
      education: education.data || [],
      applications: applications.data || [],
      role: String(user.role || "TALENT"),
      recruiterProfile: recruiterProfile.data || null,
      recruiterJobs: recruiterJobs.data || [],
      partnerProfile: partnerProfile.data || null,
      offers: (offers.data || []).map((job) => ({
        id: job.id,
        title: job.title,
        description: String(job.description || "").slice(0, 8000),
        location: job.location,
        contractType: job.contractType,
        deadline: job.deadline,
        source: job.source,
        sourceUrl: job.sourceUrl,
        lastSeenAt: job.lastSeenAt,
        remoteMode: job.remoteMode,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        applicationReady: job.applicationReady,
        countryCode: job.countryCode,
        company: job.companyId ? companyById.get(job.companyId) || null : null,
      })),
      policy: {
        offlineDays: OFFLINE_DAYS,
        note: "Les paiements, authentifications, recherches Internet, actions recruteur et envois de candidatures restent connectés.",
      },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de préparer les données hors connexion." }, { status: 500 });
  }
}
