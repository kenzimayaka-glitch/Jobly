import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { inspectCommunityMessage, repeatedViolationAction } from "../../../../lib/communityEventGuard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await request.json();
    const communityId = String(body.communityId ?? "").trim();
    const content = String(body.content ?? "").trim();
    if (!communityId || !content) return NextResponse.json({ message: "Communauté et message obligatoires." }, { status: 400 });
    if (body.mediaUrl || body.media || body.attachments) return NextResponse.json({ message: "Les messages Community sont textuels uniquement." }, { status: 400 });

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const { data: membership } = await sb.from("CommunityMembership").select("id,role").eq("communityId", communityId).eq("userId", user.id).maybeSingle();
    if (!membership || membership.role === "BANNED") return NextResponse.json({ message: "Accès à cette communauté refusé." }, { status: 403 });

    const { data: community } = await sb.from("Community").select("id,createdById,name").eq("id", communityId).maybeSingle();
    if (!community) return NextResponse.json({ message: "Communauté introuvable." }, { status: 404 });

    const decision = inspectCommunityMessage(content);
    if (decision.blocked) {
      const { data: prior } = await sb.from("JiaEvent").select("id").eq("userId", user.id).eq("eventType", "COMMUNITY_EVENT_BYPASS").limit(10);
      const action = repeatedViolationAction(prior?.length ?? 0);
      await sb.from("JiaEvent").insert({
        id: crypto.randomUUID(),
        userId: user.id,
        eventType: "COMMUNITY_EVENT_BYPASS",
        path: "/community/" + communityId,
        metadata: { communityId, confidence: decision.confidence, reasons: decision.reasons, severity: decision.severity, action },
      });
      await sb.from("Notification").insert([
        {
          id: crypto.randomUUID(), userId: user.id, type: "COMMUNITY_MODERATION",
          title: "Message retiré", body: "Ce message semble organiser ou contourner un rendez-vous événementiel dans Community. Utilisez Jobly Events.",
          link: "/events", entityId: communityId, actionType: "COMMUNITY_MESSAGE_REMOVED",
          actionPayload: { communityId, reasons: decision.reasons }, locale: "fr",
          channels: { push: false, email: false, inApp: true }, createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(), userId: community.createdById, type: "COMMUNITY_MODERATION",
          title: "Message Community retiré", body: "J’IA a retiré un message qui semblait organiser un rendez-vous événementiel.",
          link: "/community/" + communityId, entityId: communityId, actionType: "COMMUNITY_MESSAGE_REMOVED",
          actionPayload: { communityId, authorId: user.id, reasons: decision.reasons, severity: decision.severity }, locale: "fr",
          channels: { push: false, email: false, inApp: true }, createdAt: new Date().toISOString(),
        },
      ]);
      if (action === "BAN") {
        await sb.from("CommunityMembership").update({ role: "BANNED" }).eq("communityId", communityId).eq("userId", user.id);
      }
      return NextResponse.json({ ok: false, removed: true, action, decision }, { status: 422 });
    }

    const now = new Date().toISOString();
    const { data: post, error } = await sb.from("CommunityPost").insert({
      id: crypto.randomUUID(),
      communityId,
      authorId: user.id,
      content,
      status: "PUBLISHED",
      sourceType: null,
      sourceId: null,
      mediaUrl: null,
      sourceUrl: null,
      createdAt: now,
      updatedAt: now,
    }).select("*").single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Publication impossible." }, { status: 500 });
  }
}
