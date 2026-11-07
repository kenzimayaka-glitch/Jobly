import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthUser, adminClient } from "@/lib/server-auth";
import { getJiaAvailableEcosystems, isJiaEcosystem } from "@/lib/jia/access";
import { runJiaBrain } from "@/lib/jia/brain";
import { runUnifiedCognitiveCycle } from "@/lib/jia/runtime";
import { shouldUseInternetBrain } from "@/lib/jia/internet/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    if (!user.privacyAcceptedAt) {
      return NextResponse.json({ message: "Le consentement de confidentialité est requis pour J’IA." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const message = typeof body?.message === "string" ? body.message : "";
    const useInternetBrain = shouldUseInternetBrain(message);
    const requestedEcosystem = String(body?.ecosystem || "TALENT").toUpperCase();
    if (!isJiaEcosystem(requestedEcosystem)) {
      return NextResponse.json({ message: "Écosystème J’IA invalide." }, { status: 400 });
    }

    const availableEcosystems = await getJiaAvailableEcosystems(sb, user, auth.id);
    if (!availableEcosystems.includes(requestedEcosystem)) {
      return NextResponse.json({ message: "Cet espace J’IA n'est pas autorisé pour ce compte." }, { status: 403 });
    }

    const ecosystem = requestedEcosystem;
    const recentDialogue = Array.isArray(body?.recentDialogue)
      ? body.recentDialogue.filter((value: unknown): value is string => typeof value === "string").slice(-6)
      : [];

    const cognitive = await runUnifiedCognitiveCycle(sb, {
      userId: String(user.id),
      ecosystem,
      path: typeof body?.path === "string" ? body.path : "",
      action,
      message,
      includeInternet: useInternetBrain,
      internetQuery: useInternetBrain ? message : undefined,
    });

    // The legacy conversational Brain is scoped to Talent, Recruiter and Partner.
    // ADMIN stays on the dedicated CEO/cognitive path and is never downgraded to a
    // personal Talent context.
    const result = ecosystem === "ADMIN"
      ? {
          message: cognitive.recommendations[0]
            ? `Synthèse administrateur prête. Première priorité identifiée : ${cognitive.recommendations[0].title}.`
            : "Espace administrateur connecté. Aucun point prioritaire n’a été identifié dans ce cycle.",
          intent: "ADMIN_OVERVIEW",
          confidence: cognitive.recommendations[0]?.confidence ?? "MEDIUM",
          provider: "JIA_RUNTIME",
        }
      : await runJiaBrain({
          userId: String(user.id),
          ecosystem,
          message,
          path: typeof body?.path === "string" ? body.path : "",
          action: typeof body?.action === "string" ? body.action : "",
          proactive: Boolean(body?.proactive),
          lang: body?.lang === "en" ? "en" : "fr",
          recentDialogue,
        });

    return NextResponse.json({ ok: true, cognitive, ...result });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "J’IA est temporairement indisponible.",
    }, { status: 500 });
  }
}
