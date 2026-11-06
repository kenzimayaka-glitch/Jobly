import { NextRequest, NextResponse } from "next/server";
import { analyticsError, requireAdminAnalytics } from "@/lib/adminAnalytics360";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const { db, user } = await requireAdminAnalytics(request);
    const { data, error } = await db.from("JoblyAnalyticsReport")
      .select("id,title,reportType,fileFormat,createdAt,shareExpiresAt,sharedAt")
      .eq("createdByUserId", user.id).order("createdAt", { ascending: false }).limit(30);
    if (error) throw error;
    return NextResponse.json({ reports: data || [] });
  } catch (error) { return analyticsError(error); }
}
