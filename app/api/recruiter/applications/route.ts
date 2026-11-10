import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, getRecruiterProfileForAuthUser } from "../../../../lib/server-auth";
import { isProfilePhotoPublic } from "../../../../lib/profilePhotoStorage";
import { analyzeATSMatch } from "@/lib/atsService";

// GET /api/recruiter/applications — candidatures des seules offres du recruteur connecté.
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const recruiterProfile = user.role === "ADMIN" ? true : await getRecruiterProfileForAuthUser(supabase, authUser.id, user.id);
    if (user.role !== "RECRUITER" && user.role !== "ADMIN" && !recruiterProfile) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const url = new URL(req.url);
    const markViewed = url.searchParams.get("markViewed") !== "0";
    const { data: ownJobs, error: jobsError } = await supabase
      .from("RecruiterJob")
      .select("id,title,description,tags")
      .eq("recruiterUserId", user.id);
    if (jobsError) throw new Error(jobsError.message);

    const ownJobIds = (ownJobs || []).map((job: any) => job.id);
    if (!ownJobIds.length) return NextResponse.json({ applications: [], total: 0 });

    const { data: apps, error: appsError } = await supabase
      .from("Application")
      .select("*")
      .in("recruiterJobId", ownJobIds)
      .order("updatedAt", { ascending: false });
    if (appsError) throw new Error(appsError.message);

    const applications = apps || [];
    const userIds = Array.from(new Set(applications.map((application: any) => application.userId).filter(Boolean)));
    const usersById = new Map<string, any>();
    const profilesById = new Map<string, any>();
    const skillsById = new Map<string, any[]>();
    const experiencesById = new Map<string, any[]>();
    const educationById = new Map<string, any[]>();

    if (userIds.length) {
      const [usersResult, profilesResult, skillsResult, experiencesResult, educationResult] = await Promise.all([
        supabase.from("User").select("id,firstName,lastName,displayName,email,profilePhotoUrl,profilePhotoVisibility,profilePhotoConsentAt,pitchVideoUrl,pitchVideoDurationMs").in("id", userIds),
        supabase.from("Profile").select("userId,headline,summary,experienceSummary,educationSummary,targetRoles").in("userId", userIds),
        supabase.from("Skill").select("userId,name,level").in("userId", userIds),
        supabase.from("Experience").select("userId,title,company,description,startDate,endDate").in("userId", userIds),
        supabase.from("Education").select("userId,institution,degree,field,startDate,endDate").in("userId", userIds),
      ]);
      for (const result of [usersResult, profilesResult, skillsResult, experiencesResult, educationResult]) {
        if (result.error) throw new Error(result.error.message);
      }
      for (const item of usersResult.data || []) usersById.set(item.id, item);
      for (const item of profilesResult.data || []) profilesById.set(item.userId, item);
      for (const item of skillsResult.data || []) skillsById.set(item.userId, [...(skillsById.get(item.userId) || []), item]);
      for (const item of experiencesResult.data || []) experiencesById.set(item.userId, [...(experiencesById.get(item.userId) || []), item]);
      for (const item of educationResult.data || []) educationById.set(item.userId, [...(educationById.get(item.userId) || []), item]);
    }

    // Marquer "Vu" uniquement lorsque l'écran de traitement demande explicitement cette action.
    const toMark = markViewed ? applications.filter((application: any) => !application.viewedAt && application.status === "SUBMITTED") : [];
    if (toMark.length) {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("Application")
        .update({ viewedAt: now, status: "ACKNOWLEDGED", updatedAt: now })
        .in("id", toMark.map((application: any) => application.id));
      if (updateError) throw new Error(updateError.message);
      for (const application of applications) {
        if (toMark.some((item: any) => item.id === application.id)) {
          application.viewedAt = now;
          application.status = "ACKNOWLEDGED";
        }
      }
    }

    const jobsById = new Map((ownJobs || []).map((job: any) => [job.id, job]));
    let results = applications.map((application: any) => {
      const candidate = usersById.get(application.userId);
      const profile = profilesById.get(application.userId) || {};
      const skills = skillsById.get(application.userId) || [];
      const experiences = experiencesById.get(application.userId) || [];
      const education = educationById.get(application.userId) || [];
      const job: any = jobsById.get(application.recruiterJobId);
      const cvText = [
        profile.headline, profile.summary, profile.experienceSummary, profile.educationSummary,
        ...(profile.targetRoles || []),
        ...skills.map((item: any) => [item.name, item.level].filter(Boolean).join(" ")),
        ...experiences.map((item: any) => [item.title, item.company, item.description].filter(Boolean).join(" ")),
        ...education.map((item: any) => [item.degree, item.field, item.institution].filter(Boolean).join(" ")),
      ].filter(Boolean).join("\n");
      const jobText = [job?.title, job?.description, ...(job?.tags || [])].filter(Boolean).join("\n");
      const analysis = analyzeATSMatch(cvText, jobText);
      const hasStoredScore = typeof application.atsScore === "number" && Number.isFinite(application.atsScore);
      // Prefer the live CV-vs-offer calculation; fall back to a previously persisted score only when the profile cannot be evaluated.
      const atsScore = analysis.score !== null ? analysis.score : hasStoredScore ? application.atsScore : null;

      return {
        id: application.id,
        userId: application.userId,
        recruiterJobId: application.recruiterJobId,
        jobTitle: job?.title ?? null,
        status: application.status,
        statusSource: application.statusSource,
        proofUrl: application.proofUrl,
        viewedAt: application.viewedAt,
        interviewAt: application.interviewAt,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        candidateName: candidate?.displayName || [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ") || "Candidat",
        candidateEmail: candidate?.email || "",
        profilePhotoUrl: isProfilePhotoPublic(candidate) ? (candidate?.profilePhotoUrl || null) : null,
        pitchVideoUrl: candidate?.pitchVideoUrl || null,
        pitchVideoDurationMs: candidate?.pitchVideoDurationMs || null,
        cvUrl: application.cvUrl || null,
        cvPhotoUrl: application.cvPhotoUrl || null,
        letterText: application.letterText || "",
        atsScore,
        atsScoreSource: analysis.score !== null ? "PROFILE_ANALYSIS" : hasStoredScore ? "APPLICATION" : "NOT_CALCULABLE",
        atsAnalysis: {
          matchedKeywords: analysis.matchedKeywords,
          missingKeywords: analysis.missingKeywords,
          evaluatedKeywords: analysis.evaluatedKeywords,
        },
      };
    });

    // Filtres ATS appliqués côté API : score et/ou mots-clés/compétences.
    const rawMin = url.searchParams.get("atsMin");
    const rawMax = url.searchParams.get("atsMax");
    const atsMin = rawMin !== null && rawMin !== "" ? Number(rawMin) : null;
    const atsMax = rawMax !== null && rawMax !== "" ? Number(rawMax) : null;
    if (atsMin !== null && (!Number.isFinite(atsMin) || atsMin < 0 || atsMin > 100)) {
      return NextResponse.json({ message: "Score ATS minimum invalide." }, { status: 400 });
    }
    if (atsMax !== null && (!Number.isFinite(atsMax) || atsMax < 0 || atsMax > 100)) {
      return NextResponse.json({ message: "Score ATS maximum invalide." }, { status: 400 });
    }
    if (atsMin !== null && atsMax !== null && atsMin > atsMax) {
      return NextResponse.json({ message: "La plage ATS minimum ne peut pas dépasser le maximum." }, { status: 400 });
    }
    if (atsMin !== null || atsMax !== null) {
      results = results.filter((item: any) => {
        if (typeof item.atsScore !== "number") return false;
        return (atsMin === null || item.atsScore >= atsMin) && (atsMax === null || item.atsScore <= atsMax);
      });
    }

    const normalizeKeyword = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    const keyword = normalizeKeyword((url.searchParams.get("atsKeyword") || "").trim());
    const keywordMode = url.searchParams.get("atsKeywordMode") === "missing" ? "missing" : "present";
    if (keyword) {
      const terms = keyword.split(",").flatMap((group) => group.split(/\\s+/)).map((term) => term.trim()).filter((term) => term.length >= 3 && !["avec","dans","pour","une","des","les","sur","aux","and","the","for"].includes(term));
      if (terms.length > 10 || terms.some((term) => term.length > 60)) {
        return NextResponse.json({ message: "Saisis au maximum 10 mots-clés de 60 caractères chacun." }, { status: 400 });
      }
      results = results.filter((item: any) => {
        const candidates = keywordMode === "missing"
          ? item.atsAnalysis.missingKeywords
          : item.atsAnalysis.matchedKeywords;
        const normalized = candidates.map((term: string) => normalizeKeyword(term));
        return terms.every((term) => normalized.includes(term));
      });
    }

    return NextResponse.json({ applications: results, total: results.length, appliedFilters: { atsMin, atsMax, atsKeyword: keyword, atsKeywordMode } });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger les candidatures reçues." },
      { status: 500 }
    );
  }
}
