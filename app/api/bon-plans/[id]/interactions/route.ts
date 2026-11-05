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
  const now = new Date().toISOString();
  const { data: plan, error: planError } = await db
    .from("BonPlan")
    .select("id,status,startsAt,expiresAt")
    .eq("id", id)
    .maybeSingle();

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 });
  if (!plan || plan.status !== "PUBLISHED" || (plan.startsAt && plan.startsAt > now) || (plan.expiresAt && plan.expiresAt <= now)) {
    return NextResponse.json({ error: "Ce bon plan n’est pas disponible." }, { status: 404 });
  }

  const { data: existing, error: existingError } = await db
    .from("BonPlanInteraction")
    .select("id")
    .eq("userId", user.id)
    .eq("bonPlanId", id)
    .eq("type", type)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

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
      createdAt: now,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ active: true });
}
