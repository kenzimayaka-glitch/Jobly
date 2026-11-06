import { NextRequest, NextResponse } from "next/server";
import { analyticsError, buildAnalytics360, requireAdminAnalytics } from "@/lib/adminAnalytics360";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdminAnalytics(request);
    const result = await buildAnalytics360(db, request.nextUrl.searchParams);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return analyticsError(error);
  }
}
