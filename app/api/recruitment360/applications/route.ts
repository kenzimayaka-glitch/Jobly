import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

const RECRUITMENT_READ_ROLES = ["OWNER", "HR", "MANAGER", "DELEGATE", "JURY"];

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

  try {
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const requestedRecruitmentId = req.nextUrl.searchParams.get("recruitmentId");

    // Always derive the accessible recruitment IDs from the authenticated actor.
    // A query-string ID is a filter, never an authorization grant.
    const { data: roles, error: rolesError } = await supabase
      .from("RecruitmentRole")
      .select("recruitmentId")
      .eq("userId", user.id)
      .in("role", RECRUITMENT_READ_ROLES);

    if (rolesError) throw new Error(rolesError.message);

    const accessibleIds = [...new Set((roles ?? []).map((item: any) => item.recruitmentId).filter(Boolean))];

    if (requestedRecruitmentId && !accessibleIds.includes(requestedRecruitmentId)) {
      return NextResponse.json({ message: "Accès refusé à ce recrutement." }, { status: 403 });
    }

    const recruitmentIds = requestedRecruitmentId ? [requestedRecruitmentId] : accessibleIds;
    if (!recruitmentIds.length) return NextResponse.json({ applications: [] });

    const { data: recruitments, error: recruitmentsError } = await supabase
      .from("Recruitment360")
      .select("id,recruiterJobId")
      .in("id", recruitmentIds);

    if (recruitmentsError) throw new Error(recruitmentsError.message);

    const jobIds = [...new Set((recruitments ?? []).map((item: any) => item.recruiterJobId).filter(Boolean))];
    if (!jobIds.length) return NextResponse.json({ applications: [] });

    const { data: applications, error: applicationsError } = await supabase
      .from("Application")
      .select("id,userId,recruiterJobId,status,cvUrl,cvPhotoUrl,letterText,createdAt,updatedAt")
      .in("recruiterJobId", jobIds)
      .order("updatedAt", { ascending: false });

    if (applicationsError) throw new Error(applicationsError.message);

    const applicationIds = (applications ?? []).map((item: any) => item.id);
    const [assessmentsResult, shortlistsResult] = applicationIds.length
      ? await Promise.all([
          supabase.from("RecruitmentApplicationAssessment").select("*").in("applicationId", applicationIds),
          supabase.from("RecruitmentShortlist").select("*").in("applicationId", applicationIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (assessmentsResult.error) throw new Error(assessmentsResult.error.message);
    if (shortlistsResult.error) throw new Error(shortlistsResult.error.message);

    const assessmentByApplication = new Map(
      (assessmentsResult.data ?? []).map((item: any) => [item.applicationId, item]),
    );
    const shortlistByApplication = new Map(
      (shortlistsResult.data ?? []).map((item: any) => [item.applicationId, item]),
    );

    return NextResponse.json({
      applications: (applications ?? []).map((application: any) => ({
        ...application,
        assessment: assessmentByApplication.get(application.id) ?? null,
        shortlist: shortlistByApplication.get(application.id) ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erreur." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

  try {
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const body = await req.json();

    if (body.action === "score") {
      const { data, error } = await supabase.rpc("recruitment360_lot3_score_application", {
        p_application_id: body.applicationId,
        p_actor_user_id: user.id,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ assessment: data });
    }

    if (body.action === "shortlist") {
      const { data, error } = await supabase.rpc("recruitment360_lot3_set_shortlist", {
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
      const applicationId = typeof body.applicationId === "string" ? body.applicationId.trim() : "";
      if (!applicationId || !body.kind || !body.url) {
        throw new Error("DOCUMENT_FIELDS_REQUIRED");
      }

      const { data: application, error: applicationError } = await supabase
        .from("Application")
        .select("id,recruiterJobId")
        .eq("id", applicationId)
        .maybeSingle();
      if (applicationError) throw new Error(applicationError.message);
      if (!application) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });

      const { data: recruitment, error: recruitmentError } = await supabase
        .from("Recruitment360")
        .select("id")
        .eq("recruiterJobId", application.recruiterJobId)
        .maybeSingle();
      if (recruitmentError) throw new Error(recruitmentError.message);
      if (!recruitment) return NextResponse.json({ message: "Recrutement introuvable." }, { status: 404 });

      const { data: actorRole, error: actorRoleError } = await supabase
        .from("RecruitmentRole")
        .select("id")
        .eq("recruitmentId", recruitment.id)
        .eq("userId", user.id)
        .in("role", ["OWNER", "HR", "MANAGER", "DELEGATE"])
        .limit(1)
        .maybeSingle();
      if (actorRoleError) throw new Error(actorRoleError.message);
      if (!actorRole) return NextResponse.json({ message: "Accès refusé à ce recrutement." }, { status: 403 });

      const { data, error } = await supabase
        .from("RecruitmentApplicationDocument")
        .insert({
          applicationId,
          kind: body.kind,
          url: body.url,
          fileName: body.fileName ?? null,
          mimeType: body.mimeType ?? null,
          fileSize: body.fileSize ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ document: data }, { status: 201 });
    }

    throw new Error("ACTION_REQUIRED");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur.";
    return NextResponse.json({ message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}
