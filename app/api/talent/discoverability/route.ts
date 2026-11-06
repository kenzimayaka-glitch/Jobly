import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { enforceApiRateLimit } from "../../../../lib/server-security";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req); if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 2 * 1024) return NextResponse.json({ message: "Préférence de visibilité trop volumineuse." }, { status: 413 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.publicDiscoverable !== "boolean") {
      return NextResponse.json({ message: "La visibilité doit être un booléen explicite." }, { status: 400 });
    }
    const publicDiscoverable = body.publicDiscoverable;
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const limited = await enforceApiRateLimit(req, sb, {
      scope: "talent-discoverability-update",
      identity: user.id,
      accountWindows: [{ limit: 10, windowSeconds: 3600 }, { limit: 20, windowSeconds: 86400 }],
      ipWindows: [{ limit: 20, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { error } = await sb.from("Profile").update({ publicDiscoverable }).eq("userId", user.id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, publicDiscoverable }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Impossible de modifier la visibilité." }, { status: 500 });
  }
}
