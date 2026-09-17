import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

// GET /api/recruiter/applications — espace Recruiter existant (spec 12.2).
//
// "Vu" est automatique : dès qu'un recruteur ouvre (liste ou détail) une
// candidature reçue sur l'une de ses offres RecruiterJob, on enregistre
// viewedAt et on fait passer le statut SUBMITTED → ACKNOWLEDGED. Aucune
// nouvelle brique : on réutilise l'espace Recruiter déjà construit.
//
// Note : ne couvre que les candidatures sur RecruiterJob. Les candidatures
// Discovery ("Job") n'ont pas de recruteur JOBLY à prévenir (offre externe).
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    const { data: ownJobs, error: jobsError } = await supabase
      .from("RecruiterJob")
      .select("id,title")
      .eq("recruiterUserId", user.id);
    if (jobsError) throw new Error(jobsError.message);

    const ownJobIds = (ownJobs || []).map((j: any) => j.id);
    if (!ownJobIds.length) return NextResponse.json({ applications: [] });

    const { data: apps, error: appsError } = await supabase
      .from("Application")
      .select("*")
      .in("recruiterJobId", ownJobIds)
      .order("updatedAt", { ascending: false });
    if (appsError) throw new Error(appsError.message);

    const applications = apps || [];
    const userIds = Array.from(new Set(applications.map((a: any) => a.userId).filter(Boolean)));
    const usersById = new Map<string, any>();
    if (userIds.length) {
      const { data: users, error: usersError } = await supabase
        .from("User")
        .select("id,firstName,lastName,displayName,email,profilePhotoUrl,pitchVideoUrl,pitchVideoDurationMs")
        .in("id", userIds);
      if (usersError) throw new Error(usersError.message);
      for (const u of users || []) usersById.set(u.id, u);
    }

    // Marquer "Vu" les candidatures pas encore ouvertes (SUBMITTED → ACKNOWLEDGED).
    const toMark = applications.filter((a: any) => !a.viewedAt && a.status === "SUBMITTED");
    if (toMark.length) {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("Application")
        .update({ viewedAt: now, status: "ACKNOWLEDGED", updatedAt: now })
        .in("id", toMark.map((a: any) => a.id));
      if (updateError) throw new Error(updateError.message);
      for (const a of applications) {
        if (toMark.some((t: any) => t.id === a.id)) {
          a.viewedAt = now;
          a.status = "ACKNOWLEDGED";
        }
      }
    }

    const jobsById = new Map((ownJobs || []).map((j: any) => [j.id, j]));
    const results = applications.map((a: any) => ({
      id: a.id,
      userId: a.userId,
      recruiterJobId: a.recruiterJobId,
      jobTitle: jobsById.get(a.recruiterJobId)?.title ?? null,
      status: a.status,
      statusSource: a.statusSource,
      proofUrl: a.proofUrl,
      viewedAt: a.viewedAt,
      interviewAt: a.interviewAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      candidateName: usersById.get(a.userId)?.displayName
        || [usersById.get(a.userId)?.firstName, usersById.get(a.userId)?.lastName].filter(Boolean).join(" ")
        || "Candidat",
      candidateEmail: usersById.get(a.userId)?.email || "",
      profilePhotoUrl: usersById.get(a.userId)?.profilePhotoUrl || null,
      pitchVideoUrl: usersById.get(a.userId)?.pitchVideoUrl || null,
      pitchVideoDurationMs: usersById.get(a.userId)?.pitchVideoDurationMs || null,
      cvUrl: a.cvUrl || null,
      cvPhotoUrl: a.cvPhotoUrl || null,
      letterText: a.letterText || "",
      atsScore: typeof a.atsScore === "number" ? a.atsScore : null,
    }));

    return NextResponse.json({ applications: results });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger les candidatures reçues." },
      { status: 500 }
    );
  }
}
