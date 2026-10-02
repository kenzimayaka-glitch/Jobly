import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthUser } from "../../../../lib/server-auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  const sb = adminClient();
  const { data: user, error } = await sb.from("User")
    .select("id,role,aiWelcomeCredits,aiWelcomeGrantedAt,aiWelcomeSeenAt")
    .eq("authUserId", auth.id)
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!user) return NextResponse.json({ message: "Compte Jobly introuvable." }, { status: 404 });
  if (String(user.role) !== "TALENT") {
    return NextResponse.json({ message: "Cette ressource est réservée au compte Talent." }, { status: 403 });
  }

  const { data: claim, error: claimError } = await sb.rpc("claim_ai_welcome_credit", {
    p_user_id: String(user.id),
    p_role: "TALENT",
  }).maybeSingle();
  if (claimError) return NextResponse.json({ message: claimError.message }, { status: 500 });

  const granted = Number((claim as any)?.credits ?? user.aiWelcomeCredits ?? 0);
  const grantedAt = (claim as any)?.granted_at ?? user.aiWelcomeGrantedAt;
  let used = 0;
  if (granted > 0 && grantedAt) {
    const { data: usage, error: usageError } = await sb.from("AiUsage")
      .select("credits")
      .eq("userId", user.id)
      .eq("planCode", "FREE")
      .gte("createdAt", grantedAt);
    if (usageError) return NextResponse.json({ message: usageError.message }, { status: 500 });
    used = (usage || []).reduce((sum: number, row: any) => sum + Number(row.credits || 0), 0);
  }

  const remaining = Math.max(granted - used, 0);
  const firstDashboardVisit = !user.aiWelcomeSeenAt && granted > 0;
  return NextResponse.json({
    granted,
    used,
    remaining,
    grantedAt,
    firstDashboardVisit,
    message: firstDashboardVisit ? "🎁 30 crédits J’IA vous sont offerts à l’inscription. Utilisez-les pour découvrir J’IA et Jobly." : null,
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  const sb = adminClient();
  const { data: user, error } = await sb.from("User")
    .select("id,role,aiWelcomeCredits,aiWelcomeSeenAt")
    .eq("authUserId", auth.id)
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!user) return NextResponse.json({ message: "Compte Jobly introuvable." }, { status: 404 });
  if (String(user.role) !== "TALENT") {
    return NextResponse.json({ message: "Cette ressource est réservée au compte Talent." }, { status: 403 });
  }

  if (Number(user.aiWelcomeCredits || 0) > 0 && !user.aiWelcomeSeenAt) {
    const { error: seenError } = await sb.from("User")
      .update({ aiWelcomeSeenAt: new Date().toISOString() })
      .eq("id", user.id)
      .is("aiWelcomeSeenAt", null);
    if (seenError) return NextResponse.json({ message: seenError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
