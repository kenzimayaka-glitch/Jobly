import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../lib/server-auth";
import { checkWeeklyApplicationQuota } from "../../../lib/entitlements";

// Écran "Candidatures" (Statut.md, spec 12.2).
//
// Statuts (enum ApplicationStatus existant, réutilisé sans modification) :
//   DISCOVERED  = Brouillon   (aucune preuve jointe, non compté dans les stats)
//   SUBMITTED   = En attente  (preuve jointe)
//   ACKNOWLEDGED= Vu          (un recruteur a ouvert la candidature — voir /api/recruiter/applications)
//   INTERVIEW   = Entretien   (date renseignée)
//   OFFER       = Acceptée
//   REJECTED    = Refusée
//
// Une candidature porte SOIT sur "Job" (Discovery) SOIT sur "RecruiterJob"
// (offre publiée par un recruteur JOBLY) — jamais les deux (voir migration
// 20260912110000_recruiterjob_unification et Statut.md section 4).

type ApplicationRow = {
  id: string;
  userId: string;
  jobId: string | null;
  recruiterJobId: string | null;
  status: string;
  proofUrl: string | null;
  viewedAt: string | null;
  interviewAt: string | null;
  statusSource: string;
  createdAt: string;
  updatedAt: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "DISCOVERED":
      return "Brouillon";
    case "SUBMITTED":
      return "En attente";
    case "ACKNOWLEDGED":
      return "Vu";
    case "INTERVIEW":
      return "Entretien";
    case "OFFER":
      return "Acceptée";
    case "REJECTED":
      return "Refusée";
    default:
      return status;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    const { data: apps, error } = await supabase
      .from("Application")
      .select("*")
      .eq("userId", user.id)
      .order("updatedAt", { ascending: false });
    if (error) throw new Error(error.message);

    const applications = (apps as ApplicationRow[]) || [];

    const jobIds = applications.map((a) => a.jobId).filter(Boolean) as string[];
    const recruiterJobIds = applications.map((a) => a.recruiterJobId).filter(Boolean) as string[];

    const [jobsRes, recruiterJobsRes] = await Promise.all([
      jobIds.length
        ? supabase.from("Job").select("id,title,location,contractType,remoteMode,companyId").in("id", jobIds)
        : Promise.resolve({ data: [], error: null }),
      recruiterJobIds.length
        ? supabase.from("RecruiterJob").select("id,title,location,contract,remoteMode,companyName").in("id", recruiterJobIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (jobsRes.error) throw new Error(jobsRes.error.message);
    if (recruiterJobsRes.error) throw new Error(recruiterJobsRes.error.message);

    const companyIds = Array.from(new Set((jobsRes.data || []).map((j: any) => j.companyId).filter(Boolean)));
    const companiesRes = companyIds.length
      ? await supabase.from("Company").select("id,name,logoUrl").in("id", companyIds)
      : { data: [], error: null };
    if (companiesRes.error) throw new Error(companiesRes.error.message);

    const jobsById = new Map((jobsRes.data || []).map((j: any) => [j.id, j]));
    const recruiterJobsById = new Map((recruiterJobsRes.data || []).map((j: any) => [j.id, j]));
    const companiesById = new Map((companiesRes.data || []).map((c: any) => [c.id, c]));

    const results = applications.map((app) => {
      const isDiscovery = !!app.jobId;
      const job = isDiscovery ? jobsById.get(app.jobId as string) : recruiterJobsById.get(app.recruiterJobId as string);
      const company = isDiscovery && job?.companyId ? companiesById.get(job.companyId) : null;
      return {
        id: app.id,
        source: isDiscovery ? "discovery" : "recruiter",
        jobId: app.jobId,
        recruiterJobId: app.recruiterJobId,
        status: app.status,
        statusLabel: statusLabel(app.status),
        statusSource: app.statusSource,
        proofUrl: app.proofUrl,
        viewedAt: app.viewedAt,
        interviewAt: app.interviewAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        job: job
          ? {
              title: job.title,
              location: job.location,
              contractType: isDiscovery ? job.contractType : job.contract,
              remoteMode: job.remoteMode,
              companyName: isDiscovery ? company?.name ?? null : job.companyName,
            }
          : null,
      };
    });

    // Compteurs — calculés uniquement à partir des statuts réels (jamais saisis à la main).
    const counters = {
      envoyees: results.filter((a) => a.status !== "DISCOVERED").length,
      vues: results.filter((a) => ["ACKNOWLEDGED", "INTERVIEW", "OFFER", "REJECTED"].includes(a.status)).length,
      entretien: results.filter((a) => a.status === "INTERVIEW").length,
    };

    return NextResponse.json({ applications: results, counters });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger les candidatures." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    const body = await request.json();
    const source = body.source === "recruiter" ? "recruiter" : body.source === "discovery" ? "discovery" : null;
    const targetId = typeof body.jobId === "string" ? body.jobId.trim() : "";
    const proofUrl = typeof body.proofUrl === "string" && body.proofUrl.trim() ? body.proofUrl.trim() : null;

    if (!source || !targetId) {
      return NextResponse.json({ message: "Offre invalide (source et identifiant requis)." }, { status: 400 });
    }

    // Quota hebdomadaire (règle JOBLY : une candidature = une offre soumise).
    // Seules les soumissions avec preuve (proofUrl) comptent dans le quota.
    if (proofUrl) {
      const quota = await checkWeeklyApplicationQuota(supabase, user.id);
      if (!quota.allowed) {
        return NextResponse.json(
          { message: quota.message, quota: { used: quota.used, limit: quota.limit } },
          { status: 429 }
        );
      }
    }

    // Preuve absente → Brouillon (non compté). Preuve jointe → En attente.
    const payload: Record<string, unknown> = {
      id: newId(),
      userId: user.id,
      jobId: source === "discovery" ? targetId : null,
      recruiterJobId: source === "recruiter" ? targetId : null,
      language: "fr",
      status: proofUrl ? "SUBMITTED" : "DISCOVERED",
      proofUrl,
      submittedAt: proofUrl ? new Date().toISOString() : null,
      statusSource: "CANDIDATE",
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("Application").insert(payload).select("*").single();
    if (error) {
      // Contrainte unique(userId, jobId|recruiterJobId) : le candidat a déjà postulé à cette offre.
      if (error.code === "23505") {
        return NextResponse.json({ message: "Vous avez déjà une candidature pour cette offre." }, { status: 409 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ application: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible d'enregistrer la candidature." },
      { status: 500 }
    );
  }
}
