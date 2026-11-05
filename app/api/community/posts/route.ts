import { NextRequest, NextResponse } from "next/server";
import { getCommunityEntitlementsForUser } from "@/lib/community/access";
import { moderateCommunityMessage } from "@/lib/community/moderation";
import { adminClient, ensureUser, getAuthUser, newId } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const communityId = typeof body.communityId === "string" ? body.communityId.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!communityId || !content) {
      return NextResponse.json({ message: "Communauté et message obligatoires." }, { status: 400 });
    }
    if (content.length > 4000) {
      return NextResponse.json({ message: "Le message est limité à 4 000 caractères." }, { status: 400 });
    }
    if (body.mediaUrl || body.media || body.attachments) {
      return NextResponse.json({ message: "Les messages Community sont textuels uniquement." }, { status: 400 });
    }

    const db = adminClient();
    const user = await ensureUser(db, auth);
    const entitlement = await getCommunityEntitlementsForUser(db, user.id);
    if (!entitlement.communityAccess) {
      return NextResponse.json({ message: "Un abonnement actif est requis.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }

    const { data: community, error: communityError } = await db
      .from("Community")
      .select("id,createdById,status")
      .eq("id", communityId)
      .maybeSingle();
    if (communityError) throw new Error(communityError.message);
    if (!community || community.status !== "ACTIVE") {
      return NextResponse.json({ message: "Communauté introuvable." }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await db
      .from("CommunityMembership")
      .select("id,role")
      .eq("communityId", communityId)
      .eq("userId", user.id)
      .maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership || membership.role === "BANNED") {
      return NextResponse.json({ message: "Accès à cette communauté refusé." }, { status: 403 });
    }

    const moderation = await moderateCommunityMessage({
      db,
      userId: user.id,
      communityId,
      communityOwnerId: community.createdById,
      content,
    });
    if (moderation) return NextResponse.json(moderation, { status: 422 });

    const now = new Date().toISOString();
    const { data: post, error } = await db
      .from("CommunityPost")
      .insert({
        id: newId(),
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
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Publication impossible." },
      { status: 500 },
    );
  }
}
