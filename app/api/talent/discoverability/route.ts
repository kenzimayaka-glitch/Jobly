import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req); if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const publicDiscoverable = Boolean(body?.publicDiscoverable);
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const { error } = await sb.from("Profile").update({ publicDiscoverable }).eq("userId", user.id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, publicDiscoverable });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Impossible de modifier la visibilité." }, { status: 500 });
  }
}
