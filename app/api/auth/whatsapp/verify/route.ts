import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.phone || !body?.code) return NextResponse.json({ message: "Numéro et code requis." }, { status: 400 });

  const apiBase = process.env.JOBLY_API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json(
      { message: "Vérification WhatsApp indisponible : backend JOBLY non configuré sur ce déploiement." },
      { status: 503 }
    );
  }

  const upstream = await fetch(`${apiBase.replace(/\/$/, "")}/v1/auth/whatsapp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: body.phone, code: body.code }),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  const response = NextResponse.json(payload, { status: upstream.status });

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);
  return response;
}
