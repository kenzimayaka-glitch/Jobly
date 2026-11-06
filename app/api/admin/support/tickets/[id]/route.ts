import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const admin = await ensureUser(db, auth);
    if (String(admin.role).toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Espace ADMIN requis." }, { status: 403 });
    const { data: identity, error: identityError } = await db.from("AdminIdentity").select("active")
      .eq("authUserId", auth.id).eq("ownerUserId", admin.id).maybeSingle();
    if (identityError) throw new Error(identityError.message);
    if (!identity?.active) return NextResponse.json({ message: "Identité ADMIN maître inactive." }, { status: 403 });

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const allowedStatus = ["OPEN","IN_PROGRESS","WAITING_USER","RESOLVED","CLOSED"];
    const allowedPriority = ["LOW","NORMAL","HIGH","URGENT"];
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.status === "string") {
      const status = body.status.toUpperCase();
      if (!allowedStatus.includes(status)) return NextResponse.json({ message: "Statut invalide." }, { status: 400 });
      patch.status = status;
      patch.resolvedAt = ["RESOLVED","CLOSED"].includes(status) ? new Date().toISOString() : null;
    }
    if (typeof body.priority === "string") {
      const priority = body.priority.toUpperCase();
      if (!allowedPriority.includes(priority)) return NextResponse.json({ message: "Priorité invalide." }, { status: 400 });
      patch.priority = priority;
    }
    if (body.assignToMe === true) patch.assignedToUserId = admin.id;
    if (body.unassign === true) patch.assignedToUserId = null;
    if (Object.keys(patch).length === 1) return NextResponse.json({ message: "Aucun changement demandé." }, { status: 400 });
    const { data, error } = await db.from("AdminSupportTicket").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Ticket introuvable." }, { status: 404 });
    const { error: auditError } = await db.from("AuditLog").insert({
      id: crypto.randomUUID(), userId: admin.id, action: "SUPPORT_TICKET_UPDATED",
      entityType: "AdminSupportTicket", entityId: id, metadata: patch,
    });
    if (auditError) return NextResponse.json({ ticket: data, warning: "Le changement est appliqué, mais le journal d'audit n'a pas pu être écrit." }, { status: 503 });
    return NextResponse.json({ ticket: data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Mise à jour impossible." }, { status: 500 });
  }
}
