import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { isFinancialRequest } from "@/lib/jia/guard";
import { evaluateJiaPolicy } from "@/lib/jia/policy";
import { runJiaSafeAction } from "@/lib/jia/agent";

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
  const policy = evaluateJiaPolicy({ level: type === "PREPARE_APPLICATION" ? "PREPARE" : "PROPOSE", minimumLevel: type === "PREPARE_APPLICATION" ? "PREPARE" : "PROPOSE", ecosystem: "TALENT", action: type, consent: confirmed, risk: type === "PREPARE_APPLICATION" ? 0.5 : 0.2 });
  if (!policy.allowed) return NextResponse.json({ message: "Action bloquée par la politique J’IA.", reason: policy.reason, requiredLevel: policy.requiredLevel }, { status: 403 });
  if (type === "PREPARE_APPLICATION" && !confirmed) {
    return NextResponse.json({ ok: true, requiresConfirmation: true, message: "Je peux préparer cette candidature. Confirme-tu que je lance la préparation ?" });
  }
  const sb = adminClient();
  const user = await ensureUser(sb, auth);
  const execution = await runJiaSafeAction({
    userId: String(user.id),
    actionType: type,
    ecosystem: "TALENT",
    message,
    confirmed,
  });
  if (!execution.ok) return NextResponse.json({ message: "Action bloquée par la politique J’IA.", reason: execution.reason, requiredLevel: execution.requiredLevel }, { status: 403 });
  return NextResponse.json({ ok: true, action: type, status: "VERIFIED", traceId: execution.run?.id ?? execution.run?.run?.id ?? null, next: execution.next });
}
