import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { isFinancialRequest } from "@/lib/jia/guard";

const ACTIONS = new Set(["SEARCH_JOBS", "START_INTERVIEW_COACHING", "BUILD_LEARNING_PLAN", "PREPARE_APPLICATION", "FOLLOW_UP", "REVIEW", "LEARN", "APPLY", "VERIFY"]);

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = typeof body?.type === "string" ? body.type : "";
  const message = typeof body?.message === "string" ? body.message.slice(0, 1200) : "";
  const confirmed = body?.confirmed === true;
  if (!ACTIONS.has(type)) return NextResponse.json({ message: "Action J’IA non autorisée." }, { status: 400 });
  if (isFinancialRequest(message)) return NextResponse.json({ message: "J’IA ne peut pas exécuter d’action financière." }, { status: 403 });
  if (type === "PREPARE_APPLICATION" && !confirmed) {
    return NextResponse.json({ ok: true, requiresConfirmation: true, message: "Je peux préparer cette candidature. Confirme-tu que je lance la préparation ?" });
  }
  const sb = adminClient();
  const user = await ensureUser(sb, auth);
  const result = await sb.from("JiaIntelligenceTrace").insert({
    userId: user.id, stage: "ACTION", title: `J’IA action ${type}`, content: message || type,
    confidence: "HIGH", evidence: { actionType: type, confirmed }, sourceType: "JIA_ACTION", sourceRef: "api/jia/action",
    status: "COMPLETED", metadata: { actionType: type, confirmed },
  }).select("id").single();
  if (result.error) return NextResponse.json({ message: result.error.message }, { status: 500 });
  const next = type === "SEARCH_JOBS" ? "/jobs" : type === "START_INTERVIEW_COACHING" ? "/ai/interview" : type === "BUILD_LEARNING_PLAN" || type === "LEARN" ? "/ai/learning" : type === "FOLLOW_UP" || type === "APPLY" ? "/applications" : type === "VERIFY" ? "/profile" : "/career";
  return NextResponse.json({ ok: true, action: type, status: "PREPARED", traceId: result.data?.id ?? null, next });
}
