import { NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
import { enforceApiRateLimit } from "@/lib/server-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const phoneKey = phone.replace(/[^0-9+]/g, "").slice(0, 24);
    if (!phone || phoneKey.replace(/[^0-9]/g, "").length < 7 || !/^\d{4,8}$/.test(code)) {
      return NextResponse.json({ message: "Numéro et code de vérification valides requis." }, { status: 400 });
    }

    const supabase = adminClient();
    const limited = await enforceApiRateLimit(request, supabase, {
      scope: "auth-whatsapp-otp-verify",
      identity: "phone:" + phoneKey,
      accountWindows: [{ limit: 5, windowSeconds: 900 }, { limit: 10, windowSeconds: 86400 }],
      ipWindows: [{ limit: 20, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const apiBase = process.env.JOBLY_API_BASE_URL;
    if (!apiBase) return NextResponse.json(
      { message: "Vérification WhatsApp indisponible : backend JOBLY non configuré sur ce déploiement." },
      { status: 503 }
    );

    const upstream = await fetch(`${apiBase.replace(/\/$/, "")}/v1/auth/whatsapp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({}));
    const response = NextResponse.json(payload, { status: upstream.status });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Vérification WhatsApp impossible." }, { status: 500 });
  }
}
