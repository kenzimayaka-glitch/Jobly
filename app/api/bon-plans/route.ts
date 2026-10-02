import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId, cleanStrings } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  const db = adminClient();
  const params = request.nextUrl.searchParams;
  const country = normalize(params.get("country"));
  const city = normalize(params.get("city"));
  const category = normalize(params.get("category"));
  const limit = Math.min(Math.max(Number(params.get("limit") || 30), 1), 100);

  let query = db
    .from("BonPlan")
    .select("*, author:User(id,displayName,username,profilePhotoUrl)")
    .eq("status", "PUBLISHED")
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (country) query = query.eq("country", country);
  if (city) query = query.eq("city", city);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date().toISOString();
  const visible = (data || []).filter((item) => !item.expiresAt || item.expiresAt > now);
  return NextResponse.json({ items: visible, count: visible.length });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = normalize(body.title);
  const description = normalize(body.description);
  const category = normalize(body.category);
  if (!title || !description || !category) {
    return NextResponse.json({ error: "title, description et category sont requis." }, { status: 400 });
  }

  const db = adminClient();
  const user = await ensureUser(db, authUser);
  const now = new Date().toISOString();
  const payload = {
    id: newId(),
    authorId: user.id,
    title,
    description,
    category,
    country: normalize(body.country) || user.country || null,
    city: normalize(body.city) || null,
    sourceUrl: normalize(body.sourceUrl) || null,
    imageUrl: normalize(body.imageUrl) || null,
    status: "PUBLISHED",
    startsAt: normalize(body.startsAt) || null,
    expiresAt: normalize(body.expiresAt) || null,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await db.from("BonPlan").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
