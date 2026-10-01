import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { getActivePlanCode } from "../../../../lib/entitlements";

async function loadRecruiter(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { error: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const sb = adminClient();
  const user = await ensureUser(sb, auth);
  if (String(user.role) !== "RECRUITER") {
    return { error: NextResponse.json({ message: "Cette ressource est réservée au compte recruteur." }, { status: 403 }) };
  }
  return { sb, user };
}

export async function GET(request: NextRequest) {
  try {
    const loaded = await loadRecruiter(request);
    if ("error" in loaded) return loaded.error;
    const { sb, user } = loaded;
    const plan = String(await getActivePlanCode(sb, user.id, "RECRUITER")).toUpperCase();

    if (plan === "FREE") {
      const { data: claim, error: claimError } = await sb.rpc("claim_ai_welcome_credit", {
        p_user_id: String(user.id),
        p_role: "RECRUITER",
      }).maybeSingle();
      if (claimError) throw new Error(claimError.message);
      if (claim?.granted) {
        user.aiWelcomeCredits = claim.credits;
        user.aiWelcomeGrantedAt = claim.granted_at;
      }
    }

    const granted = Number(user.aiWelcomeCredits || 0);
    const grantedAt = user.aiWelcomeGrantedAt;
    const { data: usage, error: usageError } = granted > 0 && grantedAt
      ? await sb.from("AiUsage")
        .select("credits")
        .eq("userId", user.id)
        .eq("planCode", "FREE")
        .gte("createdAt", grantedAt)
      : { data: [], error: null };
    if (usageError) throw new Error(usageError.message);

    const used = (usage || []).reduce((sum: number, row: any) => sum + Number(row.credits || 0), 0);
    const remaining = Math.max(granted - used, 0);
    return NextResponse.json({
      granted,
      used,
      remaining,
      grantedAt,
      firstDashboardVisit: !user.aiWelcomeSeenAt && granted > 0,
      message: !user.aiWelcomeSeenAt && granted > 0 ? "🎁 30 crédits J’IA recruteur vous sont offerts à l’inscription." : null,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger les crédits J’IA recruteur." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const loaded = await loadRecruiter(request);
    if ("error" in loaded) return loaded.error;
    const { sb, user } = loaded;
    const { error } = await sb.from("User")
      .update({ aiWelcomeSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq("id", user.id)
      .is("aiWelcomeSeenAt", null);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de confirmer la notification." }, { status: 500 });
  }
}
