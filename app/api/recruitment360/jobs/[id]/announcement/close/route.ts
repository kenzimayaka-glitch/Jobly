import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../../lib/server-auth";
type Ctx = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, context: Ctx) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const { data, error } = await supabase.rpc("recruitment360_lot2_close", { p_recruiter_job_id: id, p_actor_user_id: user.id, p_reason: reason });
    if (error) return NextResponse.json({ message: error.message }, { status: error.message === "FORBIDDEN" ? 403 : 409 });
    return NextResponse.json({ recruitment: data });
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "Clôture impossible." }, { status: 500 }); }
}