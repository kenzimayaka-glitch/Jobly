import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const db = adminClient();
  const { data, error } = await db.rpc("jobly_analytics_refresh_created_history", { p_from: null, p_to: null });
  if (error) return NextResponse.json({ message: "Analytics refresh failed", detail: error.message }, { status: 503 });
  return NextResponse.json({ ok: true, ...data });
}
