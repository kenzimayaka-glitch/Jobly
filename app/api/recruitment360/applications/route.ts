import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { scoreRecruiterApplication, type MatchingCandidate, type MatchingCriterion, type MatchingJob } from "../../../../lib/matchingEngine";

const RECRUITMENT_ROLES = ["OWNER", "HR", "MANAGER", "DELEGATE"];

async function authorizeApplication(sb: ReturnType<typeof adminClient>, applicationId: string, actorId: string) {
  const { data: application, error: applicationError } = await sb
    .from("Application")
    .select("id,userId,recruiterJobId,cvUrl,cvFileId,cvPhotoUrl,tailoredCvText,letterText")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) throw new Error(applicationError.message);
  if (!application?.recruiterJobId) throw new Error("APPLICATION_NOT_FOUND");

  const { data: recruitment, error: recruitmentError } = await sb
    .from("Recruitment360")
    .select("id,recruiterJobId")
    .eq("recruiterJobId", application.recruiterJobId)
    .maybeSingle();
  if (recruitmentError) throw new Error(recruitmentError.message);
  if (!recruitment) throw new Error("RECRUITMENT_NOT_FOUND");

  const { data: access, error: accessError } = await sb
    .from("RecruitmentRole")
    .select("id")
    .eq("recruitmentId", recruitment.id)
    .eq("userId", actorId)
    .in("role", RECRUITMENT_ROLES)
    .maybeSingle();
  if (accessError) throw new Error(accessError.message);
  if (!access) throw new Error("FORBIDDEN");

  return { application, recruitment };
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const requestedRecruitmentId = new URL(req.url).searchParams.get("recruitmentId");
    const { data: roles, error: rolesError } = await sb
      .from("RecruitmentRole")
      .select("recruitmentId")
      .eq("userId", user.id)
      .in("role", RECRUITMENT_ROLES);
    if (rolesError) throw new Error(rolesError.message);

    const authorizedIds = [...new Set((roles ?? []).map((item: any) => String(item.recruitmentId)))];
    if (requestedRecruitmentId && !authorizedIds.includes(requestedRecruitmentId)) {
      return NextResponse.json({ message: "Accès au recrutement refusé." }, { status: 403 });
    }
    const recruitmentIds = requestedRecruitmentId ? [requestedRecruitmentId] : authorizedIds;
    if (!recruitmentIds.length) return NextResponse.json({ applications: [] });

    const { data: recruitments, error: recruitmentError } = await sb
      .from("Recruitment360")
      .select("id,recruiterJobId")
      .in("id", recruitmentIds);
    if (recruitmentError) throw new Error(recruitmentError.message);
    const jobIds = (recruitments ?? []).map((item: any) => item.recruiterJobId);
    if (!jobIds.length) return NextResponse.json({ applications: [] });

    const { data: applications, error: applicationsError } = await sb
      .from("Application")
      .select("id,userId,recruiterJobId,status,cvUrl,cvPhotoUrl,letterText,createdAt,updatedAt,atsScore")
      .in("recruiterJobId", jobIds)
      .order("updatedAt", { ascending: false });
    if (applicationsError) throw new Error(applicationsError.message);

    const applicationIds = (applications ?? []).map((item: any) => item.id);
    const [{ data: assessments, error: assessmentsError }, { data: shortlists, error: shortlistsError }] = applicationIds.length
      ? await Promise.all([
          sb.from("RecruitmentApplicationAssessment").select("*").in("applicationId", applicationIds),
          sb.from("RecruitmentShortlist").select("*").in("applicationId", applicationIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (assessmentsError) throw new Error(assessmentsError.message);
    if (shortlistsError) throw new Error(shortlistsError.message);

    const assessmentByApplication = new Map((assessments ?? []).map((item: any) => [item.applicationId, item]));
    const shortlistByApplication = new Map((shortlists ?? []).map((item: any) => [item.applicationId, item]));
    return NextResponse.json({
      applications: (applications ?? []).map((item: any) => ({
        ...item,
        assessment: assessmentByApplication.get(item.id) ?? null,
        shortlist: shortlistByApplication.get(item.id) ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erreur." },
      { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const body = await req.json();
    if (!body.applicationId || typeof body.applicationId !== "string") {
      return NextResponse.json({ message: "Candidature requise." }, { status: 400 });
    }

    if (body.action === "score") {
      const { application, recruitment } = await authorizeApplication(sb, body.applicationId, user.id);
      const [{ data: job, error: jobError }, { data: version, error: versionError }] = await Promise.all([
        sb.from("RecruiterJob")
          .select("id,title,description,location,contract,remoteMode,minExperienceYears,sector,tags,salary")
          .eq("id", application.recruiterJobId)
          .maybeSingle(),
        sb.from("RecruitmentAnnouncementVersion")
          .select("id,title,description,status,versionNumber")
          .eq("recruitmentId", recruitment.id)
          .in("status", ["PUBLISHED", "EXTENDED"])
          .order("versionNumber", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (jobError) throw new Error(jobError.message);
      if (versionError) throw new Error(versionError.message);
      if (!job) throw new Error("RECRUITER_JOB_NOT_FOUND");

      const criteriaResult = version
        ? await sb.from("RecruitmentCriterion")
            .select("criterion,label,weight,required")
            .eq("versionId", version.id)
            .order("sortOrder", { ascending: true })
        : { data: [], error: null };
      if (criteriaResult.error) throw new Error(criteriaResult.error.message);

      const [profileRes, skillsRes, experiencesRes, educationRes, documentsRes] = await Promise.all([
        sb.from("Profile").select("headline,summary,location,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors").eq("userId", application.userId).maybeSingle(),
        sb.from("Skill").select("name,level,provenance").eq("userId", application.userId).limit(60),
        sb.from("Experience").select("title,description,startDate,endDate").eq("userId", application.userId).limit(30),
        sb.from("Education").select("degree,field,institution").eq("userId", application.userId).limit(20),
        sb.from("RecruitmentApplicationDocument").select("kind,status").eq("applicationId", application.id).eq("status", "VERIFIED"),
      ]);
      for (const result of [profileRes, skillsRes, experiencesRes, educationRes, documentsRes]) {
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
      const effectiveJob: MatchingJob = {
        title: version?.title ?? job.title,
        description: [version?.description ?? job.description, job.description].filter(Boolean).join("\n\n"),
        location: job.location,
        contractType: job.contract,
        remoteMode: job.remoteMode,
        minExperienceYears: job.minExperienceYears,
        sector: job.sector,
        tags: job.tags,
      };
      const score = scoreRecruiterApplication({
        candidate,
        job: effectiveJob,
        criteria: (criteriaResult.data ?? []) as MatchingCriterion[],
        cvProvided: Boolean(application.cvUrl || application.cvFileId || application.cvPhotoUrl || application.tailoredCvText),
        verifiedDocumentKinds: (documentsRes.data ?? []).map((item: any) => String(item.kind)),
      });

      const matchedDimensions = Object.entries(score.baseMatch.dimensions)
        .filter(([, item]) => item.score !== null && item.score >= 70)
        .map(([key, item]) => ({ criterion: key, label: key, score: item.score, weight: item.weight, evidence: item.evidence }));
      const missingDimensions = Object.entries(score.baseMatch.dimensions)
        .filter(([, item]) => item.score !== null && item.score < 70)
        .map(([key, item]) => ({ criterion: key, label: key, score: item.score, weight: item.weight, required: false, evidence: item.gaps }));

      const assessmentPayload = {
        applicationId: application.id,
        recruitmentId: recruitment.id,
        atsScore: score.atsScore,
        profileCompleteness: score.profileCompleteness,
        matchedCriteria: [...score.matchedCriteria, ...matchedDimensions],
        missingCriteria: [...score.missingCriteria, ...missingDimensions],
        missingDocuments: score.missingDocuments,
        computedAt: new Date().toISOString(),
        computedByUserId: user.id,
      };
      const { data: assessment, error: assessmentError } = await sb
        .from("RecruitmentApplicationAssessment")
        .upsert(assessmentPayload, { onConflict: "applicationId" })
        .select("*")
        .single();
      if (assessmentError) throw new Error(assessmentError.message);

      const { error: applicationUpdateError } = await sb
        .from("Application")
        .update({ atsScore: score.atsScore })
        .eq("id", application.id);
      if (applicationUpdateError) throw new Error(applicationUpdateError.message);

      return NextResponse.json({
        assessment,
        matching: {
          algorithm: score.baseMatch.algorithm,
          confidence: score.baseMatch.confidence,
          coverage: score.baseMatch.coverage,
          matchedSkills: score.baseMatch.matchedSkills,
          missingSkills: score.baseMatch.missingSkills,
          gaps: score.baseMatch.gaps,
        },
      });
    }

    if (body.action === "shortlist") {
      await authorizeApplication(sb, body.applicationId, user.id);
      const { data, error } = await sb.rpc("recruitment360_lot3_set_shortlist", {
        p_application_id: body.applicationId,
        p_actor_user_id: user.id,
        p_status: body.status,
        p_reason: body.reason ?? null,
        p_defer_until: body.deferUntil ?? null,
        p_rank: body.rank ?? null,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ shortlist: data });
    }

    if (body.action === "document") {
      const { error: authorizationError } = await authorizeApplication(sb, body.applicationId, user.id);
      if (authorizationError) throw authorizationError;
      if (!body.kind || !body.url) throw new Error("DOCUMENT_FIELDS_REQUIRED");
      const { data, error } = await sb.from("RecruitmentApplicationDocument").insert({
        applicationId: body.applicationId,
        kind: body.kind,
        url: body.url,
        fileName: body.fileName ?? null,
        mimeType: body.mimeType ?? null,
        fileSize: body.fileSize ?? null,
      }).select().single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ document: data }, { status: 201 });
    }

    throw new Error("ACTION_REQUIRED");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur.";
    const status = message === "FORBIDDEN" ? 403 : message === "APPLICATION_NOT_FOUND" || message === "RECRUITMENT_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}
