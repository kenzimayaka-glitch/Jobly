import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../../lib/server-auth";
import { getInstitutionSession } from "../../../../../lib/institution-auth";

function pct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(request: NextRequest) {
  const session = await getInstitutionSession(request);
  if (!session) return NextResponse.json({ message: "Accès institutionnel requis." }, { status: 401 });

  const db = adminClient();
  const institutionId = session.institution.id;
  const now = new Date();
  const currentStart = new Date(now); currentStart.setDate(now.getDate() - 30);
  const previousStart = new Date(now); previousStart.setDate(now.getDate() - 60);

  try {
    const { data: profiles } = await db.from("Profile").select("userId,createdAt").eq("institutionId", institutionId);
    const userIds = (profiles ?? []).map((p) => p.userId);
    const [currentApps, previousApps, currentJourneys, previousJourneys] = await Promise.all([
      userIds.length ? db.from("Application").select("id", { count: "exact", head: true }).in("userId", userIds).gte("createdAt", currentStart.toISOString()) : { count: 0 },
      userIds.length ? db.from("Application").select("id", { count: "exact", head: true }).in("userId", userIds).gte("createdAt", previousStart.toISOString()).lt("createdAt", currentStart.toISOString()) : { count: 0 },
      userIds.length ? db.from("CareerJourney").select("id", { count: "exact", head: true }).in("userId", userIds).gte("createdAt", currentStart.toISOString()) : { count: 0 },
      userIds.length ? db.from("CareerJourney").select("id", { count: "exact", head: true }).in("userId", userIds).gte("createdAt", previousStart.toISOString()).lt("createdAt", currentStart.toISOString()) : { count: 0 },
    ]);

    const current = { beneficiaries: userIds.length, applications: currentApps.count ?? 0, journeys: currentJourneys.count ?? 0 };
    const previous = { beneficiaries: (profiles ?? []).filter((p) => new Date(p.createdAt) < currentStart).length, applications: previousApps.count ?? 0, journeys: previousJourneys.count ?? 0 };

    let targets: unknown[] = [];
    const targetResult = await db.from("InstitutionKpiTarget").select("id,key,label,target,unit,periodStart,periodEnd,projectId").eq("institutionId", institutionId).lte("periodStart", now.toISOString()).gte("periodEnd", now.toISOString());
    if (!targetResult.error) targets = targetResult.data ?? [];

    const rows = [
      { key: "beneficiaries", label: "Bénéficiaires suivis", value: current.beneficiaries, previous: previous.beneficiaries, unit: "COUNT" },
      { key: "applications", label: "Candidatures", value: current.applications, previous: previous.applications, unit: "COUNT" },
      { key: "journeys", label: "Parcours suivis", value: current.journeys, previous: previous.journeys, unit: "COUNT" },
    ].map((row) => ({ ...row, evolutionPercent: pct(row.value, row.previous) }));

    return NextResponse.json({
      period: { currentStart, currentEnd: now, previousStart, previousEnd: currentStart },
      indicators: rows,
      targets,
      interpretation: rows.map((r) => ({
        key: r.key,
        text: r.evolutionPercent > 0 ? r.label + " progressent de " + r.evolutionPercent + "% sur les 30 derniers jours." :
          r.evolutionPercent < 0 ? r.label + " reculent de " + Math.abs(r.evolutionPercent) + "% sur les 30 derniers jours." :
          r.label + " sont stables sur les 30 derniers jours.",
      })),
      disclaimer: "Analyse calculée uniquement à partir des données autorisées pour cette institution. Aucun résultat n'est inventé.",
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Intelligence institutionnelle indisponible." }, { status: 500 });
  }
}
