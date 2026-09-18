import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const featureKey = typeof body.featureKey === "string" ? body.featureKey.slice(0, 120) : "";
    const action = typeof body.action === "string" ? body.action.toUpperCase() : "";
    if (!featureKey || !["CLICKED", "DISMISSED"].includes(action)) {
      return NextResponse.json({ message: "Événement J’IA invalide." }, { status: 400 });
    }
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const { error } = await sb.from("JiaUpgradeNudge").insert({
      userId: user.id,
      featureKey,
      action,
      planCode: typeof body.planCode === "string" ? body.planCode.slice(0, 20) : "FREE",
      metadata: { source: "JIA_UI" },
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Impossible d’enregistrer l’action." }, { status: 500 });
  }
}
