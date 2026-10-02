import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";
import { getInstitutionSession } from "../../../../lib/institution-auth";

export async function GET(request: NextRequest) {
  const session = await getInstitutionSession(request);
  if (!session) return NextResponse.json({ message: "Accès institutionnel requis." }, { status: 401 });

  try {
    const db = adminClient();
    const institutionId = session.institution.id;

    const [{ data: partnerships }, { data: projects }, { data: reports }] = await Promise.all([
      db.from("InstitutionPartnership").select("id,name,status,startedAt,endedAt,configuration").eq("institutionId", institutionId).order("createdAt", { ascending: false }),
      db.from("InstitutionProject").select("id,name,description,status,startsAt,endsAt,partnershipId,dataScope,dashboardConfig").eq("institutionId", institutionId).order("createdAt", { ascending: false }),
      db.from("InstitutionReport").select("id,title,status,periodStart,periodEnd,projectId,createdAt,payload").eq("institutionId", institutionId).order("createdAt", { ascending: false }).limit(20),
    ]);

    const [{ count: beneficiaries }, { count: applications }] = await Promise.all([
      db.from("Profile").select("id", { count: "exact", head: true }).eq("institutionId", institutionId),
      db.from("Application").select("id,User!inner(Profile!inner(institutionId))", { count: "exact", head: true }).eq("User.Profile.institutionId", institutionId),
    ]);

    return NextResponse.json({
      institution: session.institution,
      kpis: {
        partnerships: partnerships?.filter((p) => p.status === "ACTIVE").length ?? 0,
        projects: projects?.filter((p) => p.status === "ACTIVE").length ?? 0,
        beneficiaries: beneficiaries ?? 0,
        applications: applications ?? 0,
        reports: reports?.length ?? 0,
      },
      partnerships: partnerships ?? [],
      projects: projects ?? [],
      reports: reports ?? [],
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger le cockpit institutionnel." }, { status: 500 });
  }
}
