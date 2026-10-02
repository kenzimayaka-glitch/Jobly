import { NextRequest, NextResponse } from "next/server";
import { getCommunityAccess } from "@/lib/community/access";
import { newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getCommunityAccess(request);
  if (!access.authUser || !access.user || !access.db) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!access.allowed) {
    return NextResponse.json({ error: "Community est réservé aux abonnés avec accès actif.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: community } = await access.db.from("Community").select("id,name,status").eq("id", id).maybeSingle();
  if (!community || community.status !== "ACTIVE") {
    return NextResponse.json({ error: "Communauté introuvable." }, { status: 404 });
  }

  const { data: existing } = await access.db
    .from("CommunityMembership")
    .select("id,role")
    .eq("communityId", id)
    .eq("userId", access.user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ membership: existing, alreadyMember: true });

  const now = new Date().toISOString();
  const { data, error } = await access.db.from("CommunityMembership").insert({
    id: newId(),
    communityId: id,
    userId: access.user.id,
    role: "MEMBER",
    createdAt: now,
  }).select("id,communityId,userId,role,createdAt").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ membership: data }, { status: 201 });
}
