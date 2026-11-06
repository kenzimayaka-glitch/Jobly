import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const requestedMode = String(body.mode || "").toUpperCase();
    if (!["ADMIN", "USER"].includes(requestedMode)) {
      return NextResponse.json({ message: "Mode demandé invalide." }, { status: 400 });
    }

    const db = adminClient();
    const user = await ensureUser(db, auth);
    const { data: identity, error } = await db.from("AdminIdentity")
      .select("id,ownerUserId,active")
      .eq("authUserId", auth.id)
      .eq("ownerUserId", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!identity?.active) return NextResponse.json({ message: "Aucun droit administrateur actif n'est associé à cette identité." }, { status: 403 });

    const role = requestedMode === "ADMIN" ? "ADMIN" : "TALENT";
    const { error: updateError } = await db.from("User").update({
      role,
      updatedAt: new Date().toISOString(),
    }).eq("id", user.id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true, mode: requestedMode, role });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Changement d'espace impossible." }, { status: 500 });
  }
}
