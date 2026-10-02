import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = adminClient();
  const { data, error } = await db
    .from("CommunityPost")
    .select("*, author:User(id,displayName,username,profilePhotoUrl)")
    .eq("communityId", id)
    .eq("status", "PUBLISHED")
    .order("createdAt", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data || [], count: data?.length || 0 });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "content est requis." }, { status: 400 });

  const db = adminClient();
  const user = await ensureUser(db, authUser);
  const { data: membership } = await db
    .from("CommunityMembership")
    .select("id,role")
    .eq("communityId", id)
    .eq("userId", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Rejoins la communauté avant de publier." }, { status: 403 });

  const now = new Date().toISOString();
  const post = {
    id: newId(),
    communityId: id,
    authorId: user.id,
    content,
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
  };
  const { data, error } = await db.from("CommunityPost").insert(post).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201 });
}
