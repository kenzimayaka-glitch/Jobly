import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

const RECRUITER_ROLES = ["OWNER", "HR", "MANAGER", "DELEGATE", "JURY"];

function statusFor(message: string) {
  if (message === "FORBIDDEN") return 403;
  if (message.includes("NOT_FOUND")) return 404;
  if (message.includes("REQUIRED") || message.includes("INVALID") || message.includes("TOO_LONG")) return 400;
  return 409;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

  try {
    const s = adminClient();
    const u = await ensureUser(s, auth);
    const rid = req.nextUrl.searchParams.get("recruitmentId");
    const aid = req.nextUrl.searchParams.get("applicationId");
    if (!rid) return NextResponse.json({ message: "recruitmentId requis." }, { status: 400 });

    if (aid) {
      const { data: app, error: appError } = await s
        .from("Application")
        .select("id,userId,recruiterJobId")
        .eq("id", aid)
        .maybeSingle();
      if (appError) throw new Error(appError.message);
      if (!app) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });

      const { data: recruitment, error: recruitmentError } = await s
        .from("Recruitment360")
        .select("id,recruiterJobId")
        .eq("recruiterJobId", app.recruiterJobId)
        .maybeSingle();
      if (recruitmentError) throw new Error(recruitmentError.message);
      if (!recruitment || recruitment.id !== rid) {
        return NextResponse.json({ message: "Candidature hors recrutement." }, { status: 404 });
      }

      const { data: roles, error: roleError } = await s
        .from("RecruitmentRole")
        .select("role")
        .eq("recruitmentId", rid)
        .eq("userId", u.id);
      if (roleError) throw new Error(roleError.message);

      const recruiterAllowed = (roles ?? []).some((x: any) => RECRUITER_ROLES.includes(x.role));
      const candidateAllowed = String(app.userId) === String(u.id);
      if (!recruiterAllowed && !candidateAllowed) {
        return NextResponse.json({ message: "FORBIDDEN" }, { status: 403 });
      }

      const { data: reviews, error: reviewError } = await s
        .from("RecruitmentReview")
        .select("*")
        .eq("applicationId", aid)
        .order("createdAt", { ascending: false });
      if (reviewError) throw new Error(reviewError.message);

      const { data: reportShares, error: shareError } = await s
        .from("RecruitmentReportShare")
        .select("id,recruitmentId,applicationId,scope,expiresAt,createdByUserId,revokedAt,lastAccessedAt,accessCount,createdAt")
        .eq("recruitmentId", rid)
        .eq("applicationId", aid)
        .is("revokedAt", null)
        .order("createdAt", { ascending: false });
      if (shareError) throw new Error(shareError.message);

      if (!recruiterAllowed) {
        return NextResponse.json({
          reports: [],
          reviews: (reviews ?? []).filter((x: any) => x.visibleToCandidate === true),
          reportShares: reportShares ?? [],
        });
      }

      const { data: report, error: reportError } = await s.rpc("recruitment360_lot7_get_report", {
        p_recruitment_id: rid,
        p_actor_user_id: u.id,
      });
      if (reportError) throw new Error(reportError.message);

      return NextResponse.json({
        reports: report ? [report] : [],
        report: report ?? null,
        reviews: reviews ?? [],
        reportShares: reportShares ?? [],
      });
    }

    const { data: report, error: reportError } = await s.rpc("recruitment360_lot7_get_report", {
      p_recruitment_id: rid,
      p_actor_user_id: u.id,
    });
    if (reportError) throw new Error(reportError.message);

    const { data: reviews, error: reviewError } = await s
      .from("RecruitmentReview")
      .select("*")
      .eq("recruitmentId", rid)
      .order("createdAt", { ascending: false });
    if (reviewError) throw new Error(reviewError.message);

    const { data: reportShares, error: shareError } = await s
      .from("RecruitmentReportShare")
      .select("id,recruitmentId,applicationId,scope,expiresAt,createdByUserId,revokedAt,lastAccessedAt,accessCount,createdAt")
      .eq("recruitmentId", rid)
      .is("revokedAt", null)
      .order("createdAt", { ascending: false });
    if (shareError) throw new Error(shareError.message);

    return NextResponse.json({
      reports: report ? [report] : [],
      report: report ?? null,
      reviews: reviews ?? [],
      reportShares: reportShares ?? [],
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ message: m }, { status: statusFor(m) });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

  try {
    const s = adminClient();
    const u = await ensureUser(s, auth);
    const b = await req.json();

    if (b.action === "report") {
      const recruitmentId = String(b.recruitmentId ?? "").trim();
      if (!recruitmentId) throw new Error("RECRUITMENT_ID_REQUIRED");

      const { data: report, error } = await s.rpc("recruitment360_lot7_get_report", {
        p_recruitment_id: recruitmentId,
        p_actor_user_id: u.id,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ report }, { status: 200 });
    }

    if (b.action === "review") {
      const applicationId = String(b.applicationId ?? "").trim();
      const reviewerRole = String(b.reviewerRole ?? (b.recommendation == null ? "TALENT" : "RECRUITER")).toUpperCase();
      if (!applicationId) throw new Error("APPLICATION_ID_REQUIRED");

      const { data: review, error } = await s.rpc("recruitment360_lot7_submit_review", {
        p_application_id: applicationId,
        p_actor_user_id: u.id,
        p_reviewer_role: reviewerRole,
        p_process_rating: Number(b.processRating),
        p_experience_rating: Number(b.experienceRating),
        p_jobly_rating: Number(b.joblyRating),
        p_recommendation: b.recommendation == null ? null : Boolean(b.recommendation),
        p_comment: b.comment ?? b.reviewText ?? null,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ review }, { status: 201 });
    }

    return NextResponse.json({ message: "action invalide." }, { status: 400 });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Opération impossible.";
    return NextResponse.json({ message: m }, { status: statusFor(m) });
  }
}
