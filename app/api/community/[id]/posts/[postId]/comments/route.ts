import { NextRequest, NextResponse } from "next/server";
import { getCommunityAccess } from "@/lib/community/access";
import { moderateCommunityMessage } from "@/lib/community/moderation";
import { newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveContext(request: NextRequest, communityId: string, postId: string) {
  const access = await getCommunityAccess(request);
  if (!access.allowed || !access.db || !access.user) {
    return { response: NextResponse.json({ error: "Un abonnement actif est requis." }, { status: access.authUser ? 403 : 401 }) };
  }
  const [{ data: community, error: communityError }, { data: membership, error: membershipError }, { data: post, error: postError }] = await Promise.all([
    access.db.from("Community").select("id,createdById,status").eq("id", communityId).maybeSingle(),
    access.db.from("CommunityMembership").select("id,role").eq("communityId", communityId).eq("userId", access.user.id).maybeSingle(),
    access.db.from("CommunityPost").select("id,status").eq("id", postId).eq("communityId", communityId).maybeSingle(),
  ]);
  if (communityError) return { response: NextResponse.json({ error: communityError.message }, { status: 500 }) };
  if (membershipError) return { response: NextResponse.json({ error: membershipError.message }, { status: 500 }) };
  if (postError) return { response: NextResponse.json({ error: postError.message }, { status: 500 }) };
  if (!community || community.status !== "ACTIVE" || !post || post.status !== "PUBLISHED") {
    return { response: NextResponse.json({ error: "Publication introuvable." }, { status: 404 }) };
  }
  if (!membership || membership.role === "BANNED") {
    return { response: NextResponse.json({ error: "Rejoins la communauté pour participer." }, { status: 403 }) };
  }
  return { access, community };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await context.params;
  const resolved = await resolveContext(request, id, postId);
  if ("response" in resolved) return resolved.response;
  const { data, error } = await resolved.access.db
    .from("CommunityPostComment")
    .select("id,postId,userId,content,createdAt")
    .eq("postId", postId)
    .order("createdAt", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((data || []).map((comment) => comment.userId)));
  const { data: users, error: usersError } = userIds.length
    ? await resolved.access.db.from("User").select("id,displayName,username,profilePhotoUrl").in("id", userIds)
    : { data: [], error: null };
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
  const usersById = new Map((users || []).map((user) => [user.id, user]));
  return NextResponse.json({
    comments: (data || []).map((comment) => ({ ...comment, author: usersById.get(comment.userId) || null })),
    count: data?.length || 0,
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await context.params;
  const resolved = await resolveContext(request, id, postId);
  if ("response" in resolved) return resolved.response;

  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Le commentaire est obligatoire." }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Le commentaire est limité à 1 000 caractères." }, { status: 400 });

  const moderation = await moderateCommunityMessage({
    db: resolved.access.db,
    userId: resolved.access.user.id,
    communityId: id,
    communityOwnerId: resolved.community.createdById,
    content,
  });
  if (moderation) return NextResponse.json(moderation, { status: 422 });

  const now = new Date().toISOString();
  const { data, error } = await resolved.access.db
    .from("CommunityPostComment")
    .insert({ id: newId(), postId, userId: resolved.access.user.id, content, createdAt: now, updatedAt: now })
    .select("id,postId,userId,content,createdAt")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
