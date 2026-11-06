import { NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
import { enforceApiRateLimit } from "@/lib/server-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const phoneKey = phone.replace(/[^0-9+]/g, "").slice(0, 24);
    if (!phone || phoneKey.replace(/[^0-9]/g, "").length < 7) {
      return NextResponse.json({ message: "Numéro WhatsApp valide requis." }, { status: 400 });
    }

    const supabase = adminClient();
    const limited = await enforceApiRateLimit(request, supabase, {
      scope: "auth-whatsapp-otp-request",
      identity: "phone:" + phoneKey,
      accountWindows: [{ limit: 3, windowSeconds: 3600 }, { limit: 6, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const apiBase = process.env.JOBLY_API_BASE_URL;
    if (!apiBase) return NextResponse.json(
      { message: "WhatsApp OTP est prêt côté interface mais le backend JOBLY / WhatsApp Business n'est pas encore configuré sur ce déploiement." },
      { status: 503 }
    );

    const upstream = await fetch(`${apiBase.replace(/\/$/, "")}/v1/auth/whatsapp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({}));
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Demande OTP impossible." }, { status: 500 });
  }
}
