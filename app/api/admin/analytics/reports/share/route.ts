import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { analyticsError, requireAdminAnalytics } from "@/lib/adminAnalytics360";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { db, user } = await requireAdminAnalytics(request);
    const body = await request.json().catch(() => ({}));
    const reportId = typeof body.reportId === "string" ? body.reportId : "";
    const days = Number(body.expiresInDays || 7);
    if (!reportId || !Number.isInteger(days) || days < 1 || days > 30) {
      return NextResponse.json({ message: "Rapport ou durée de partage invalide." }, { status: 400 });
    }
    const { data: report, error } = await db.from("JoblyAnalyticsReport").select("id")
      .eq("id", reportId).eq("createdByUserId", user.id).maybeSingle();
    if (error) throw error;
    if (!report) return NextResponse.json({ message: "Rapport introuvable." }, { status: 404 });
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const { error: updateError } = await db.from("JoblyAnalyticsReport").update({
      shareTokenHash: hash, shareExpiresAt: expiresAt, sharedAt: new Date().toISOString(), sharedByUserId: user.id,
    }).eq("id", reportId).eq("createdByUserId", user.id);
    if (updateError) throw updateError;
    return NextResponse.json({ url: new URL("/shared/analytics/" + token, request.nextUrl.origin).toString(), expiresAt });
  } catch (error) { return analyticsError(error); }
}
