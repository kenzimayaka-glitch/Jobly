import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.phone) return NextResponse.json({ message: "Numéro WhatsApp requis." }, { status: 400 });

  const apiBase = process.env.JOBLY_API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json(
      { message: "WhatsApp OTP est prêt côté interface mais le backend JOBLY / WhatsApp Business n'est pas encore configuré sur ce déploiement." },
      { status: 503 }
    );
  }

  const upstream = await fetch(`${apiBase.replace(/\/$/, "")}/v1/auth/whatsapp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: body.phone }),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
