import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ message: "Lien invalide." }, { status: 404 });
  const hash = createHash("sha256").update(token).digest("hex");
  const db = adminClient();
  const { data, error } = await db.from("JoblyAnalyticsReport")
    .select("title,reportType,fileFormat,payload,createdAt,shareExpiresAt")
    .eq("shareTokenHash", hash).gt("shareExpiresAt", new Date().toISOString()).maybeSingle();
  if (error) return NextResponse.json({ message: "Rapport indisponible." }, { status: 503 });
  if (!data) return NextResponse.json({ message: "Lien expiré ou révoqué." }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });
}
