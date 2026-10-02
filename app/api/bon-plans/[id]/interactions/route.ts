import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "@/lib/server-auth";

export const runtime = "nodejs";

const ALLOWED = new Set(["LIKE", "SAVE", "SHARE"]);

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const type = typeof body.type === "string" ? body.type.trim().toUpperCase() : "LIKE";
  if (!ALLOWED.has(type)) return NextResponse.json({ error: "Interaction non supportée." }, { status: 400 });

  const db = adminClient();
  const user = await ensureUser(db, authUser);

  const { data: existing } = await db
    .from("BonPlanInteraction")
    .select("id")
    .eq("userId", user.id)
    .eq("bonPlanId", id)
    .eq("type", type)
    .maybeSingle();

  if (existing && type !== "SHARE") {
    const { error } = await db.from("BonPlanInteraction").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ active: false });
  }

  if (!existing) {
    const { error } = await db.from("BonPlanInteraction").insert({
      id: newId(),
      userId: user.id,
      bonPlanId: id,
      type,
      createdAt: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ active: true });
}
