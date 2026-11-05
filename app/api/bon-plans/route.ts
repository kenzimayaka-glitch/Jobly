import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../lib/server-auth";
import { announceEventToCommunities } from "@/lib/community/automation";

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
  const now = new Date().toISOString();

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

  const visible = (data || []).filter((item) =>
    (!item.startsAt || item.startsAt <= now) && (!item.expiresAt || item.expiresAt > now),
  );
  if (!visible.length) return NextResponse.json({ items: [], count: 0 });

  const ids = visible.map((item) => item.id);
  const [authUser, interactionRows, commentRows] = await Promise.all([
    getAuthUser(request),
    (async () => {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("BonPlanInteraction").select("bonPlanId,userId,type").in("bonPlanId", ids).range(from, from + 999);
        if (error) throw new Error(error.message);
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return rows;
    })(),
    (async () => {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("BonPlanComment").select("bonPlanId").in("bonPlanId", ids).range(from, from + 999);
        if (error) throw new Error(error.message);
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return rows;
    })(),
  ]);

  let viewerId: string | null = null;
  if (authUser) {
    const { data: viewer, error: viewerError } = await db
      .from("User")
      .select("id")
      .eq("authUserId", authUser.id)
      .maybeSingle();
    if (viewerError) return NextResponse.json({ error: viewerError.message }, { status: 500 });
    viewerId = viewer?.id || null;
  }

  const counts = new Map<string, { likes: number; saves: number; shares: number; comments: number; liked: boolean; saved: boolean; shared: boolean }>();
  for (const id of ids) counts.set(id, { likes: 0, saves: 0, shares: 0, comments: 0, liked: false, saved: false, shared: false });
  for (const row of interactionRows) {
    const current = counts.get(row.bonPlanId);
    if (!current) continue;
    if (row.type === "LIKE") { current.likes += 1; if (viewerId && row.userId === viewerId) current.liked = true; }
    if (row.type === "SAVE") { current.saves += 1; if (viewerId && row.userId === viewerId) current.saved = true; }
    if (row.type === "SHARE") { current.shares += 1; if (viewerId && row.userId === viewerId) current.shared = true; }
  }
  for (const row of commentRows) {
    const current = counts.get(row.bonPlanId);
    if (current) current.comments += 1;
  }

  return NextResponse.json({
    items: visible.map((item) => {
      const stats = counts.get(item.id)!;
      return {
        ...item,
        likeCount: stats.likes,
        saveCount: stats.saves,
        shareCount: stats.shares,
        commentCount: stats.comments,
        viewerLiked: stats.liked,
        viewerSaved: stats.saved,
        viewerShared: stats.shared,
      };
    }),
    count: visible.length,
  });
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
  if (title.length > 140 || description.length > 4000) {
    return NextResponse.json({ error: "Titre limité à 140 caractères et description à 4 000 caractères." }, { status: 400 });
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

  const normalizedCategory = category.toLowerCase();
  let communityAnnouncement = null;
  if (["event", "events", "événement", "événements"].includes(normalizedCategory)) {
    communityAnnouncement = await announceEventToCommunities(db, {
      id: data.id,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      sourceUrl: data.sourceUrl,
      discipline: normalize(body.discipline) || null,
      categories: Array.isArray(body.communityCategories)
        ? body.communityCategories.filter((value: unknown): value is string => typeof value === "string")
        : [],
    });
  }

  return NextResponse.json({ item: data, communityAnnouncement }, { status: 201 });
}
