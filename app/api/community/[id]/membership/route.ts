import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { id } = await context.params;
  const db = adminClient();
  const user = await ensureUser(db, authUser);

  const { data: community } = await db.from("Community").select("id,status").eq("id", id).maybeSingle();
  if (!community || community.status !== "ACTIVE") {
    return NextResponse.json({ error: "Communauté introuvable." }, { status: 404 });
  }

  const { data: existing } = await db.from("CommunityMembership")
    .select("id,role").eq("communityId", id).eq("userId", user.id).maybeSingle();

  if (existing) return NextResponse.json({ joined: true, role: existing.role });

  const { data, error } = await db.from("CommunityMembership").insert({
    id: newId(),
    userId: user.id,
    communityId: id,
    role: "MEMBER",
    createdAt: new Date().toISOString(),
  }).select("id,role").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ joined: true, membership: data }, { status: 201 });
}
