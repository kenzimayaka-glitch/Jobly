import { NextRequest, NextResponse } from "next/server";
import { getCommunityAccess } from "@/lib/community/access";
import { newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; postId: string }> }) {
  const access = await getCommunityAccess(request);
  if (!access.allowed || !access.db || !access.user) {
    return NextResponse.json(
      { error: "Un abonnement actif est requis.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" },
      { status: access.authUser ? 403 : 401 },
    );
  }

  const { id, postId } = await context.params;
  const { data: community, error: communityError } = await access.db
    .from("Community")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (communityError) return NextResponse.json({ error: communityError.message }, { status: 500 });
  if (!community || community.status !== "ACTIVE") return NextResponse.json({ error: "Communauté introuvable." }, { status: 404 });

  const [{ data: membership, error: membershipError }, { data: post, error: postError }] = await Promise.all([
    access.db.from("CommunityMembership").select("id,role").eq("communityId", id).eq("userId", access.user.id).maybeSingle(),
    access.db.from("CommunityPost").select("id,status").eq("id", postId).eq("communityId", id).maybeSingle(),
  ]);
  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
  if (postError) return NextResponse.json({ error: postError.message }, { status: 500 });
  if (!membership || membership.role === "BANNED") return NextResponse.json({ error: "Accès à cette communauté refusé." }, { status: 403 });
  if (!post || post.status !== "PUBLISHED") return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });

  const { data: existing, error: existingError } = await access.db
    .from("CommunityPostReaction")
    .select("id")
    .eq("postId", postId)
    .eq("userId", access.user.id)
    .eq("type", "LIKE")
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  if (existing) {
    const { error } = await access.db.from("CommunityPostReaction").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ active: false });
  }

  const { error } = await access.db.from("CommunityPostReaction").insert({
    id: newId(),
    postId,
    userId: access.user.id,
    type: "LIKE",
    createdAt: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ active: true });
}
