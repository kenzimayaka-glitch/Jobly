import { NextRequest, NextResponse } from "next/server";
import { recordJiaEvent } from "@/lib/jiaMemory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await recordJiaEvent(req, body);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "Erreur J’IA") }, { status: 500 });
  }
}
