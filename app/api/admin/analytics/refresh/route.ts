import { NextRequest, NextResponse } from "next/server";
import { analyticsError, requireAdminAnalytics } from "@/lib/adminAnalytics360";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdminAnalytics(request);
    const body = await request.json().catch(() => ({}));
    const from = typeof body.from === "string" ? body.from : null;
    const to = typeof body.to === "string" ? body.to : null;
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
      return NextResponse.json({ message: "Dates invalides." }, { status: 400 });
    }
    const { data, error } = await db.rpc("jobly_analytics_refresh_created_history", {
      p_from: from, p_to: to,
    });
    if (error) return NextResponse.json({ message: "Reconstruction indisponible : " + error.message }, { status: 503 });
    return NextResponse.json(data);
  } catch (error) { return analyticsError(error); }
}
