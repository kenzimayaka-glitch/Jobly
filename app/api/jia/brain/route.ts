import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthUser, adminClient } from "@/lib/server-auth";
import { runJiaBrain } from "@/lib/jia/brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message:"Session requise." }, { status:401 });
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    if (!user.privacyAcceptedAt) return NextResponse.json({ message:"Le consentement de confidentialité est requis pour J’IA." }, { status:403 });

    const body = await req.json().catch(() => ({}));
    const result = await runJiaBrain({
      userId:String(user.id),
      ecosystem: body?.ecosystem === "RECRUITER" || body?.ecosystem === "PARTNER" ? body.ecosystem : "TALENT",
      message: typeof body?.message === "string" ? body.message : "",
      path: typeof body?.path === "string" ? body.path : "",
      action: typeof body?.action === "string" ? body.action : "",
      proactive: Boolean(body?.proactive),
    });
    return NextResponse.json({ ok:true, ...result });
  } catch (error) {
    return NextResponse.json({ message:error instanceof Error ? error.message : "J’IA est temporairement indisponible." }, { status:500 });
  }
}
