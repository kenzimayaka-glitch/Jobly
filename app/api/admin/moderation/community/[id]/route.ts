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
    const action = String(body.action || "").toUpperCase();
    if (!["HIDE_POST","RESTORE_POST","DISMISS"].includes(action)) return NextResponse.json({ message: "Décision invalide." }, { status: 400 });
    const { data: report, error: reportError } = await db.from("AdminCommunityReport")
      .select("id,postId,status,communityId").eq("id", id).maybeSingle();
    if (reportError) throw new Error(reportError.message);
    if (!report) return NextResponse.json({ message: "Signalement introuvable." }, { status: 404 });

    if (action === "HIDE_POST" || action === "RESTORE_POST") {
      const expected = action === "HIDE_POST" ? "PUBLISHED" : "HIDDEN";
      const desired = action === "HIDE_POST" ? "HIDDEN" : "PUBLISHED";
      const { data: post, error } = await db.from("CommunityPost").update({ status: desired, updatedAt: new Date().toISOString() })
        .eq("id", report.postId).eq("status", expected).select("id,status").maybeSingle();
      if (error) throw new Error(error.message);
      if (!post) return NextResponse.json({ message: "La publication a déjà changé d'état. Actualisez la file avant de décider." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const nextStatus = action === "DISMISS" ? "DISMISSED" : "RESOLVED";
    const { data: updated, error: updateError } = await db.from("AdminCommunityReport").update({
      status: nextStatus, reviewAction: action, reviewedByUserId: admin.id, reviewedAt: now, updatedAt: now,
    }).eq("id", id).select("*").single();
    if (updateError) throw new Error(updateError.message);
    await db.from("AuditLog").insert({
      id: crypto.randomUUID(), userId: admin.id, action: "COMMUNITY_MODERATION_" + action,
      entityType: "AdminCommunityReport", entityId: id, metadata: { postId: report.postId, communityId: report.communityId },
    });
    return NextResponse.json({ report: updated, message: action === "HIDE_POST" ? "Publication masquée; décision journalisée." : action === "RESTORE_POST" ? "Publication restaurée." : "Signalement classé sans retrait du contenu." });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Décision de modération impossible." }, { status: 500 });
  }
}
