import { NextResponse } from "next/server";
import { adminClient } from "../../../lib/server-auth";
import { ENVIRONMENT_PROFILE } from "../../../config/environment-profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const supabase = adminClient();
    const { error } = await supabase.from("Recruitment360").select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      service: "jobly",
      profile: ENVIRONMENT_PROFILE.name,
      database: "ok",
      recruitment360: "ok",
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      commercialUseAllowed: ENVIRONMENT_PROFILE.commercialUseAllowed,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      service: "jobly",
      profile: ENVIRONMENT_PROFILE.name,
      database: "error",
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      commercialUseAllowed: ENVIRONMENT_PROFILE.commercialUseAllowed,
      error: error instanceof Error ? error.message : "health_check_failed",
    }, { status: 503 });
  }
}
