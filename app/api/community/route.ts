import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  const db = adminClient();
  const p = request.nextUrl.searchParams;
  const country = clean(p.get("country"));
  const city = clean(p.get("city"));
  const category = clean(p.get("category"));
  const limit = Math.min(Math.max(Number(p.get("limit") || 30), 1), 100);

  let query = db.from("Community")
    .select("*, creator:User(id,displayName,username,profilePhotoUrl)")
    .eq("status", "ACTIVE")
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (country) query = query.eq("country", country);
  if (city) query = query.eq("city", city);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ communities: data || [], count: data?.length || 0 });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = clean(body.name);
  const category = clean(body.category);
  if (!name || !category) return NextResponse.json({ error: "name et category sont requis." }, { status: 400 });

  const db = adminClient();
  const user = await ensureUser(db, authUser);
  const now = new Date().toISOString();
  const baseSlug = slugify(name) || `community-${Date.now()}`;
  let slug = baseSlug;
  const { data: conflict } = await db.from("Community").select("id").eq("slug", slug).maybeSingle();
  if (conflict) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

  const community = {
    id: newId(),
    createdById: user.id,
    name,
    slug,
    description: clean(body.description) || null,
    category,
    country: clean(body.country) || user.country || null,
    city: clean(body.city) || null,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await db.from("Community").insert(community).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("CommunityMembership").insert({
    id: newId(),
    userId: user.id,
    communityId: community.id,
    role: "OWNER",
    createdAt: now,
  });

  return NextResponse.json({ community: data }, { status: 201 });
}
