import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadPublishedPlan(db: ReturnType<typeof adminClient>, id: string) {
  const { data, error } = await db
    .from("BonPlan")
    .select("id,status,startsAt,expiresAt")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const now = new Date().toISOString();
  if (!data || data.status !== "PUBLISHED" || (data.startsAt && data.startsAt > now) || (data.expiresAt && data.expiresAt <= now)) {
    return null;
  }
  return data;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = adminClient();
    const plan = await loadPublishedPlan(db, id);
    if (!plan) return NextResponse.json({ error: "Ce bon plan n’est pas disponible." }, { status: 404 });

    const { data, error, count } = await db
      .from("BonPlanComment")
      .select("id,bonPlanId,userId,content,createdAt", { count: "exact" })
      .eq("bonPlanId", id)
      .order("createdAt", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = Array.from(new Set((data || []).map((comment) => comment.userId)));
    const { data: users, error: usersError } = userIds.length
      ? await db.from("User").select("id,displayName,username,profilePhotoUrl").in("id", userIds)
      : { data: [], error: null };
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
    const usersById = new Map((users || []).map((user) => [user.id, user]));

    return NextResponse.json({
      comments: (data || []).map((comment) => ({ ...comment, author: usersById.get(comment.userId) || null })).reverse(),
      count: count || 0,
      returned: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Commentaires indisponibles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Le commentaire est obligatoire." }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Le commentaire est limité à 1 000 caractères." }, { status: 400 });

  const { id } = await context.params;
  const db = adminClient();
  const plan = await loadPublishedPlan(db, id);
  if (!plan) return NextResponse.json({ error: "Ce bon plan n’est pas disponible." }, { status: 404 });

  const user = await ensureUser(db, authUser);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("BonPlanComment")
    .insert({
      id: newId(),
      bonPlanId: id,
      userId: user.id,
      content,
      createdAt: now,
      updatedAt: now,
    })
    .select("id,bonPlanId,userId,content,createdAt")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    comment: {
      ...data,
      author: { id: user.id, displayName: user.displayName, username: user.username, profilePhotoUrl: user.profilePhotoUrl },
    },
  }, { status: 201 });
}
