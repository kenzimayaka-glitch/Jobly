import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { id } = await context.params;
    const supabase = adminClient();
    await ensureUser(supabase, authUser);

    const { data, error } = await supabase.rpc("recruitment360_open_notification", {
      p_notification_id: id,
    });
    if (error) {
      const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 500;
      return NextResponse.json({ message: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ notification: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible d'ouvrir la notification." },
      { status: 500 }
    );
  }
}
