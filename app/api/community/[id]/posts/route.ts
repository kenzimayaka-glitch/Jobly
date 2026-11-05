import { NextRequest, NextResponse } from "next/server";
import { getCommunityAccess, getCommunityEntitlementsForUser } from "@/lib/community/access";
import { moderateCommunityMessage } from "@/lib/community/moderation";
import { newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getCommunityAccess(request);
  if (!access.allowed || !access.db || !access.user) {
    return NextResponse.json(
      { error: "Community est réservée aux abonnés avec accès actif.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" },
      { status: access.authUser ? 403 : 401 },
    );
  }

  const { id } = await context.params;
  const { data: community, error: communityError } = await access.db
    .from("Community")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (communityError) return NextResponse.json({ error: communityError.message }, { status: 500 });
  if (!community || community.status !== "ACTIVE") {
    return NextResponse.json({ error: "Communauté introuvable." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await access.db
    .from("CommunityMembership")
    .select("id,role")
    .eq("communityId", id)
    .eq("userId", access.user.id)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
  if (!membership || membership.role === "BANNED") {
    return NextResponse.json({ error: "Rejoins la communauté pour accéder aux discussions." }, { status: 403 });
  }

  const { data, error } = await access.db
    .from("CommunityPost")
    .select("id,communityId,authorId,content,status,sourceType,sourceId,mediaUrl,sourceUrl,createdAt,author:User(id,displayName,username,profilePhotoUrl)")
    .eq("communityId", id)
    .eq("status", "PUBLISHED")
    .order("createdAt", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authorIds = Array.from(new Set((data || []).map((post: any) => post.authorId).filter(Boolean)));
  const badgeByUser = new Map<string, boolean>();
  await Promise.all(authorIds.map(async (authorId) => {
    const entitlement = await getCommunityEntitlementsForUser(access.db!, authorId);
    badgeByUser.set(authorId, entitlement.blueBadge);
  }));
  const postIds = (data || []).map((post: any) => post.id);
  const reactionRows: any[] = [];
  const commentRows: any[] = [];
  for (let from = 0; postIds.length; from += 1000) {
    const { data: batch, error } = await access.db
      .from("CommunityPostReaction")
      .select("postId,userId,type")
      .in("postId", postIds)
      .eq("type", "LIKE")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    reactionRows.push(...(batch || []));
    if (!batch || batch.length < 1000) break;
  }
  for (let from = 0; postIds.length; from += 1000) {
    const { data: batch, error } = await access.db
      .from("CommunityPostComment")
      .select("postId")
      .in("postId", postIds)
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    commentRows.push(...(batch || []));
    if (!batch || batch.length < 1000) break;
  }
  const reactionStats = new Map<string, { count: number; reacted: boolean }>();
  const commentCounts = new Map<string, number>();
  for (const postId of postIds) reactionStats.set(postId, { count: 0, reacted: false });
  for (const row of reactionRows) {
    const stats = reactionStats.get(row.postId);
    if (stats) {
      stats.count += 1;
      if (row.userId === access.user.id) stats.reacted = true;
    }
  }
  for (const row of commentRows) commentCounts.set(row.postId, (commentCounts.get(row.postId) || 0) + 1);
  const posts = (data || []).map((post: any) => ({
    ...post,
    author: post.author ? { ...post.author, blueBadge: badgeByUser.get(post.authorId) === true } : post.author,
    reactionCount: reactionStats.get(post.id)?.count || 0,
    commentCount: commentCounts.get(post.id) || 0,
    viewerReacted: reactionStats.get(post.id)?.reacted || false,
  }));
  return NextResponse.json({ posts, count: posts.length });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getCommunityAccess(request);
  if (!access.authUser || !access.user || !access.db) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!access.allowed) {
    return NextResponse.json(
      { error: "Community est réservé aux abonnés avec accès actif.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "content est requis." }, { status: 400 });
  if (content.length > 4000) return NextResponse.json({ error: "Le message est limité à 4 000 caractères." }, { status: 400 });
  if (body.mediaUrl || body.media || body.attachments) {
    return NextResponse.json({ error: "Les messages Community sont textuels uniquement." }, { status: 400 });
  }

  const { data: community, error: communityError } = await access.db
    .from("Community")
    .select("id,createdById,status")
    .eq("id", id)
    .maybeSingle();
  if (communityError) return NextResponse.json({ error: communityError.message }, { status: 500 });
  if (!community || community.status !== "ACTIVE") {
    return NextResponse.json({ error: "Communauté introuvable." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await access.db
    .from("CommunityMembership")
    .select("id,role")
    .eq("communityId", id)
    .eq("userId", access.user.id)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
  if (!membership || membership.role === "BANNED") {
    return NextResponse.json({ error: "Accès à cette communauté refusé." }, { status: 403 });
  }

  const moderation = await moderateCommunityMessage({
    db: access.db,
    userId: access.user.id,
    communityId: id,
    communityOwnerId: community.createdById,
    content,
  });
  if (moderation) return NextResponse.json(moderation, { status: 422 });

  const now = new Date().toISOString();
  const { data: post, error } = await access.db
    .from("CommunityPost")
    .insert({
      id: newId(),
      communityId: id,
      authorId: access.user.id,
      content,
      status: "PUBLISHED",
      sourceType: null,
      sourceId: null,
      mediaUrl: null,
      sourceUrl: null,
      createdAt: now,
      updatedAt: now,
    })
    .select("id,communityId,authorId,content,status,sourceType,sourceId,mediaUrl,sourceUrl,createdAt")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: { ...post, reactionCount: 0, commentCount: 0, viewerReacted: false } }, { status: 201 });
}
