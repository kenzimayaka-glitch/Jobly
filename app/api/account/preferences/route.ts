import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const profile = await supabase.from("Profile")
      .select("publicDiscoverable")
      .eq("userId", user.id)
      .maybeSingle();
    if (profile.error) throw new Error(profile.error.message);
    return NextResponse.json({
      notificationsEnabled: user.notificationsEnabled !== false,
      publicDiscoverable: profile.data?.publicDiscoverable === true,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de charger les préférences du compte.",
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    if (typeof body.notificationsEnabled !== "boolean") {
      return NextResponse.json({ message: "La préférence de notifications doit être un booléen." }, { status: 400 });
    }
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const { error } = await supabase.from("User")
      .update({ notificationsEnabled: body.notificationsEnabled, updatedAt: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, notificationsEnabled: body.notificationsEnabled });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible d’enregistrer les préférences du compte.",
    }, { status: 500 });
  }
}
