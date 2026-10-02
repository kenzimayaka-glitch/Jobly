import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthUser, adminClient } from "@/lib/server-auth";
import { runJiaBrain } from "@/lib/jia/brain";
import { runUnifiedCognitiveCycle } from "@/lib/jia/runtime";

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
    const action = typeof body?.action === "string" ? body.action : "";
    const message = typeof body?.message === "string" ? body.message : "";
    const ecosystem = body?.ecosystem === "RECRUITER" || body?.ecosystem === "PARTNER" ? body.ecosystem : "TALENT";
    const cognitive = await runUnifiedCognitiveCycle(sb, {
      userId: String(user.id), ecosystem, path: typeof body?.path === "string" ? body.path : "", action, message, includeInternet: false,
    });
    const result = await runJiaBrain({
      userId:String(user.id),
      ecosystem,
      message,
      path: typeof body?.path === "string" ? body.path : "",
      action: typeof body?.action === "string" ? body.action : "",
      proactive: Boolean(body?.proactive),
      lang: body?.lang === "en" ? "en" : "fr",
      monAfriqueCountries: Array.isArray(body?.monAfriqueCountries) ? body.monAfriqueCountries : [],
    });
    return NextResponse.json({ ok:true, cognitive, ...result });
  } catch (error) {
    return NextResponse.json({ message:error instanceof Error ? error.message : "J’IA est temporairement indisponible." }, { status:500 });
  }
}
