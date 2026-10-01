import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../lib/server-auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const nextState = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
    const exceptionReason = typeof body.exceptionReason === "string" ? body.exceptionReason.trim() : null;

    const allowed = [
      "SENT","RECEIVED","REVIEW","SELECTED","TEST","INTERVIEW",
      "FINALIST","OFFER","HIRED","POOL","REJECTED","WITHDRAWN","OFFER_DECLINED"
    ];
    if (!allowed.includes(nextState)) {
      return NextResponse.json({ message: "État de candidature invalide." }, { status: 400 });
    }

    const supabase = adminClient();
    await ensureUser(supabase, authUser);

    const { data, error } = await supabase.rpc("recruitment360_transition_application", {
      p_application_id: id,
      p_next_state: nextState,
      p_exception_reason: exceptionReason || null,
    });

    if (error) {
      const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 409;
      return NextResponse.json({ message: error.message, code: error.code }, { status });
    }

    return NextResponse.json({ state: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de changer l'état." },
      { status: 500 }
    );
  }
}
