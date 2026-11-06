import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getModerator(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ error: "Authentification requise." }, { status: 401 }) };
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") {
    return { response: NextResponse.json({ error: "Droit de modération réservé au compte ADMIN maître." }, { status: 403 }) };
  }
  const { data: identity, error } = await db.from("AdminIdentity").select("active")
    .eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) return { response: NextResponse.json({ error: "Identité ADMIN maître inactive." }, { status: 403 }) };
  return { db, user };
}

export async function GET(request: NextRequest) {
  const access = await getModerator(request);
  if ("response" in access) return access.response;

  const { data, error } = await access.db
    .from("BonPlan")
    .select("id,title,description,category,country,city,sourceUrl,startsAt,expiresAt,createdAt,author:User(id,displayName,username)")
    .eq("status", "PENDING_REVIEW")
    .order("createdAt", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [], count: data?.length || 0 });
}
