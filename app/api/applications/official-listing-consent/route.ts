import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ ok:false, message:"Session requise." }, { status:401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const body = await request.json().catch(() => ({}));
    const applicationId = String(body.applicationId || "").trim();
    if (!applicationId) return NextResponse.json({ ok:false, message:"applicationId requis." }, { status:400 });
    const consent = Boolean(body.consent);
    const { data, error } = await supabase.rpc("recruitment360_lot11_set_listing_consent", {
      p_application_id: applicationId,
      p_consent: consent,
    });
    if (error) return NextResponse.json({ ok:false, message:error.message }, { status: error.code === "42501" ? 403 : 400 });
    return NextResponse.json({ ok:true, consent:data });
  } catch (error) {
    return NextResponse.json({ ok:false, message:error instanceof Error ? error.message : "Impossible d'enregistrer le consentement." }, { status:500 });
  }
}
