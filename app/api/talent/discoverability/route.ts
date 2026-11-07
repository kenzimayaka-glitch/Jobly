import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req); if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const publicDiscoverable = Boolean(body?.publicDiscoverable);
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    if (String(user.role || "").toUpperCase() !== "TALENT") {
      return NextResponse.json({ message: "Cette préférence est réservée aux comptes Talent." }, { status: 403 });
    }
    const { data: existing, error: lookupError } = await sb.from("Profile").select("id").eq("userId", user.id).maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    const payload: Record<string, unknown> = { userId: user.id, publicDiscoverable };
    if (existing?.id) payload.id = existing.id;
    const { error } = await sb.from("Profile").upsert(payload, { onConflict: "userId" });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, publicDiscoverable });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Impossible de modifier la visibilité." }, { status: 500 });
  }
}
