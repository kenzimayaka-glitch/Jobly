import { NextRequest, NextResponse } from "next/server";
import { getGmailAccessToken, gmailRawMessage } from "../../../../../lib/gmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const messageBody = typeof body?.body === "string" ? body.body.trim() : "";

    if (!to || !subject || !messageBody) {
      return NextResponse.json({ message: "Destinataire, objet et message sont requis." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ message: "Adresse email destinataire invalide." }, { status: 400 });
    }

    const { token } = await getGmailAccessToken(req);
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: gmailRawMessage({ to, subject, body: messageBody }) }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: result?.error?.message || "Gmail a refusé l'envoi." },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 },
      );
    }

    return NextResponse.json({ ok: true, messageId: result?.id || null, threadId: result?.threadId || null });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Envoi Gmail impossible." },
      { status: 500 },
    );
  }
}
