import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthSessionId, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session invalide ou révoquée." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, authUser);
    const currentSessionId = getAuthSessionId(request);
    const { data, error } = await db.from("UserDeviceSession")
      .select("id,deviceId,deviceLabel,userAgent,createdAt,lastSeenAt,revokedAt,authSessionId")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    const devices = (data || []).map((device) => ({
      id: device.id,
      deviceId: device.deviceId,
      label: device.deviceLabel,
      userAgent: device.userAgent,
      connectedAt: device.createdAt,
      lastSeenAt: device.lastSeenAt,
      current: Boolean(currentSessionId && device.authSessionId === currentSessionId),
      active: !device.revokedAt,
    }));
    return NextResponse.json({ devices, activeCount: devices.filter((device) => device.active).length, limit: 3 }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger les appareils connectés." }, { status: 500 });
  }
}
