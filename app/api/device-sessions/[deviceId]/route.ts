import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthSessionId, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, context: { params: Promise<{ deviceId: string }> }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session invalide ou révoquée." }, { status: 401 });
    const currentSessionId = getAuthSessionId(request);
    if (!currentSessionId) return NextResponse.json({ message: "Session non reconnue." }, { status: 401 });
    const { deviceId } = await context.params;
    if (!deviceId || deviceId.length > 160) return NextResponse.json({ message: "Appareil invalide." }, { status: 400 });
    const db = adminClient();
    const { data: user, error: userError } = await db.from("User").select("id").eq("authUserId", authUser.id).maybeSingle();
    if (userError) throw new Error(userError.message);
    if (!user) return NextResponse.json({ message: "Compte Jobly introuvable." }, { status: 404 });
    const { data, error } = await db.rpc("revoke_jobly_device_session", {
      p_auth_user_id: authUser.id,
      p_current_session_id: currentSessionId,
      p_target_device_id: deviceId,
    });
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Cet appareil est déjà déconnecté ou correspond à la session actuelle." }, { status: 409 });
    return NextResponse.json({ ok: true, revokedDeviceId: deviceId });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Déconnexion de l'appareil impossible." }, { status: 500 });
  }
}
