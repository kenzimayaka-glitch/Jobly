import { NextRequest, NextResponse } from "next/server";
import { recruiterContext } from "../../../../../lib/gmailServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const context = await recruiterContext(req);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const limited = await enforceApiRateLimit(req, context.supabase, {
      scope: "recruiter-gmail-status-read",
      identity: context.user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 400, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data, error } = await context.supabase
      .from("RecruiterGmailConnection")
      .select("googleEmail,connectedAt,updatedAt")
      .eq("recruiterUserId", context.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({
      connected: Boolean(data),
      email: data?.googleEmail || null,
      connectedAt: data?.connectedAt || null,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Statut Gmail indisponible." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const context = await recruiterContext(req);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const limited = await enforceApiRateLimit(req, context.supabase, {
      scope: "recruiter-gmail-disconnect",
      identity: context.user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { error } = await context.supabase.from("RecruiterGmailConnection").delete().eq("recruiterUserId", context.user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ connected: false, email: null, connectedAt: null }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Déconnexion Gmail impossible." }, { status: 500 });
  }
}
