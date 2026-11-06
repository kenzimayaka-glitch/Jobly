import { NextRequest, NextResponse } from "next/server";
import { getGmailAccessToken, gmailRawMessage } from "../../../../../lib/gmailServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 64 * 1024) return NextResponse.json({ message: "Message trop volumineux." }, { status: 413 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Message invalide." }, { status: 400 });
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const messageBody = typeof body?.body === "string" ? body.body.trim() : "";

    if (!to || !subject || !messageBody) {
      return NextResponse.json({ message: "Destinataire, objet et message sont requis." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ message: "Adresse email destinataire invalide." }, { status: 400 });
    }

    const { token, context } = await getGmailAccessToken(req);
    const limited = await enforceApiRateLimit(req, context.supabase, {
      scope: "recruiter-gmail-send",
      identity: context.user.id,
      accountWindows: [{ limit: 10, windowSeconds: 60 }, { limit: 40, windowSeconds: 3600 }],
      ipWindows: [{ limit: 20, windowSeconds: 60 }, { limit: 80, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
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
