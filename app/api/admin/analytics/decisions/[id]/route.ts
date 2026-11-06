import { NextRequest, NextResponse } from "next/server";
import { analyticsError, requireAdminAnalytics } from "@/lib/adminAnalytics360";
export const runtime = "nodejs";
const allowed = new Set(["backlog","planned","in_progress","done","dismissed"]);
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await requireAdminAnalytics(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (!allowed.has(body.status)) return NextResponse.json({ message: "Statut invalide." }, { status: 400 });
    const { data, error } = await db.from("JoblyAnalyticsDecision").update({
      status: body.status, updatedAt: new Date().toISOString(),
    }).eq("id", id).select("id,status").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "Action introuvable." }, { status: 404 });
    await db.from("AuditLog").insert({
      userId: user.id, action: "ADMIN_ANALYTICS_DECISION_STATUS",
      entityType: "JoblyAnalyticsDecision", entityId: id,
      metadata: { status: body.status },
    }).then(() => undefined).catch(() => undefined);
    return NextResponse.json(data);
  } catch (error) { return analyticsError(error); }
}
