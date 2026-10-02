import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "@/lib/mobilityServer";

export async function GET(request: NextRequest) {
  const au = await authUser(request);
  if (!au) return NextResponse.json({ error: "Session requise." }, { status: 401 });
  const sb = adminClient();
  const user = await ensureUser(sb, au);

  const { data: memberships } = await sb.from("InstitutionMember").select("institutionId,role,active").eq("userId", user.id).eq("active", true);
  if (!memberships?.length && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Aucun accès institutionnel actif pour ce compte." }, { status: 403 });
  }

  const institutionIds = (memberships ?? []).map((m) => m.institutionId);
  const institutionId = institutionIds[0];
  if (!institutionId && user.role === "ADMIN") {
    const { data: first } = await sb.from("Institution").select("id,name,city,type,active").eq("active", true).order("createdAt", { ascending: true }).limit(1).maybeSingle();
    if (!first) return NextResponse.json({ error: "Aucune institution disponible." }, { status: 404 });
    institutionIds.push(first.id);
  }

  const { data: institutions } = await sb.from("Institution").select("id,name,city,type,active").in("id", institutionIds);
  const { data: programs } = await sb.from("MobilityProgram").select("*").in("institutionId", institutionIds).order("createdAt", { ascending: false });
  const { data: requests } = await sb.from("MobilityRequest").select("id,status,eligibilityStatus,eligibilityBurdenPercent,costTotal,salaryApproved,departCity,arriveeCity,createdAt").order("createdAt", { ascending: false }).limit(100);
  const { data: allocations } = await sb.from("MobilityFundingAllocation").select("id,programId,mobilityRequestId,approvedAmount,currency,status,createdAt").order("createdAt", { ascending: false }).limit(100);
  const { data: communications } = await sb.from("InstitutionCommunication").select("id,programId,sourceEcosystem,targetEcosystem,eventType,status,payload,createdAt,deliveredAt").in("institutionId", institutionIds).order("createdAt", { ascending: false }).limit(30);

  return NextResponse.json({
    user: { id: user.id, displayName: user.displayName, email: user.email, role: user.role },
    institutions: institutions ?? [],
    programs: programs ?? [],
    requests: requests ?? [],
    allocations: allocations ?? [],
    communications: communications ?? [],
  });
}

export async function POST(request: NextRequest) {
  const au = await authUser(request);
  if (!au) return NextResponse.json({ error: "Session requise." }, { status: 401 });
  const sb = adminClient();
  const user = await ensureUser(sb, au);
  const body = await request.json().catch(() => ({}));

  const { data: membership } = await sb.from("InstitutionMember").select("institutionId,role,active").eq("userId", user.id).eq("active", true).limit(1).maybeSingle();
  if (!membership && user.role !== "ADMIN") return NextResponse.json({ error: "Accès institutionnel requis." }, { status: 403 });

  const institutionId = body.institutionId || membership?.institutionId;
  if (!institutionId) return NextResponse.json({ error: "Institution manquante." }, { status: 400 });

  const payload = {
    title: String(body.title || "Événement Mobility"),
    body: String(body.body || "Nouvel événement institutionnel Mobility."),
    sourceEcosystem: String(body.sourceEcosystem || "INSTITUTIONAL_HUB"),
    targetEcosystem: String(body.targetEcosystem || "JOBLY"),
    eventType: String(body.eventType || "MOBILITY_INSTITUTION_EVENT"),
  };

  const { data: comm, error } = await sb.from("InstitutionCommunication").insert({
    institutionId,
    programId: body.programId || null,
    sourceEcosystem: payload.sourceEcosystem,
    targetEcosystem: payload.targetEcosystem,
    eventType: payload.eventType,
    payload,
    status: "DELIVERED",
    deliveredAt: new Date().toISOString(),
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sb.from("JiaEvent").insert({
    userId: user.id,
    eventType: payload.eventType,
    path: "/institution/mobility",
    metadata: { institutionId, programId: body.programId || null, sourceEcosystem: payload.sourceEcosystem, targetEcosystem: payload.targetEcosystem },
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  await sb.from("Notification").insert({
    userId: user.id,
    type: "INSTITUTION_MOBILITY",
    title: payload.title,
    body: payload.body,
    link: "/institution/mobility",
    entityId: comm.id,
    actionPayload: payload,
    locale: "fr",
    channels: ["IN_APP"],
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ communication: comm, connected: true });
}
