import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const REASONS = new Set(["HARASSMENT","HATE","SPAM","SCAM","MISINFORMATION","ILLEGAL","PRIVACY","OTHER"]);

export async function POST(request: NextRequest, context: { params: Promise<{ communityId: string; postId: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Connectez-vous pour signaler ce contenu." }, { status: 401 });
    const { communityId, postId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim().toUpperCase() : "";
    const details = typeof body.details === "string" ? body.details.trim().slice(0, 1200) : null;
    if (!REASONS.has(reason)) return NextResponse.json({ message: "Motif de signalement invalide." }, { status: 400 });

    const db = adminClient();
    const user = await ensureUser(db, auth);
    const { data: post, error: postError } = await db.from("CommunityPost")
      .select("id,communityId,status").eq("id", postId).eq("communityId", communityId).maybeSingle();
    if (postError) throw new Error(postError.message);
    if (!post || post.status !== "PUBLISHED") return NextResponse.json({ message: "Publication introuvable ou déjà retirée." }, { status: 404 });

    const { data: membership, error: membershipError } = await db.from("CommunityMembership")
      .select("id,role").eq("communityId", communityId).eq("userId", user.id).maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership || membership.role === "BANNED") return NextResponse.json({ message: "Vous devez être membre de cette communauté." }, { status: 403 });

    const { data, error } = await db.from("AdminCommunityReport").insert({
      id: crypto.randomUUID(), postId, communityId, reporterUserId: user.id,
      reason, details, status: "OPEN", updatedAt: new Date().toISOString(),
    }).select("id,status,createdAt").single();
    if (error?.code === "23505") return NextResponse.json({ message: "Vous avez déjà signalé cette publication." }, { status: 409 });
    if (error) throw new Error(error.message);
    await db.from("AuditLog").insert({
      id: crypto.randomUUID(), userId: user.id, action: "COMMUNITY_POST_REPORTED",
      entityType: "CommunityPost", entityId: postId, metadata: { communityId, reason },
    });
    return NextResponse.json({ report: data, message: "Signalement transmis à la modération Jobly." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Signalement impossible." }, { status: 500 });
  }
}
