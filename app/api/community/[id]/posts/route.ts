import { NextRequest, NextResponse } from "next/server";
import { getCommunityAccess, getCommunityEntitlementsForUser } from "@/lib/community/access";
import { newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getCommunityAccess(request);
  if (!access.allowed || !access.db || !access.user) {
    return NextResponse.json({ error: "Community est réservée aux abonnés avec accès actif.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" }, { status: access.authUser ? 403 : 401 });
  }

  const { id } = await context.params;
  const { data: membership } = await access.db
    .from("CommunityMembership")
    .select("id")
    .eq("communityId", id)
    .eq("userId", access.user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Rejoins la communauté pour accéder aux discussions." }, { status: 403 });

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
    const entitlement = await getCommunityEntitlementsForUser(access.db, authorId);
    badgeByUser.set(authorId, entitlement.blueBadge);
  }));
  const posts = (data || []).map((post: any) => ({ ...post, author: post.author ? { ...post.author, blueBadge: badgeByUser.get(post.authorId) === true } : post.author }));
  return NextResponse.json({ posts, count: posts.length });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getCommunityAccess(request);
  if (!access.authUser || !access.user || !access.db) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!access.allowed) {
    return NextResponse.json({ error: "Community est réservé aux abonnés avec accès actif.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "content est requis." }, { status: 400 });

  const { data: membership } = await access.db
    .from("CommunityMembership")
    .select("id,role")
    .eq("communityId", id)
    .eq("userId", access.user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Rejoins la communauté avant de publier." }, { status: 403 });

  const now = new Date().toISOString();
  const post = {
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
  };
  const { data, error } = await access.db.from("CommunityPost").insert(post).select("id,communityId,authorId,content,status,sourceType,sourceId,mediaUrl,sourceUrl,createdAt").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201 });
}
