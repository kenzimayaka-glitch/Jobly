import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getProvider } from "../../../../../lib/paymentProviders";

const err = (m: string, s: number, c = m) => NextResponse.json({ error: c, message: m }, { status: s });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const sb = adminClient();
    const u = await ensureUser(sb, auth);
    const { data: p, error } = await sb
      .from("Payment")
      .select("*")
      .eq("id", id)
      .eq("userId", u.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
    if (!p.externalId) return err("Référence provider absente.", 409, "EXTERNAL_ID_MISSING");

    const verification = await getProvider(String(p.provider)).verifyPayment(p.externalId);
    if (verification.amount != null && Number(verification.amount) !== Number(p.amount)) {
      return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
    }

    const now = new Date().toISOString();
    const { data: finalized, error: finalizeError } = await sb.rpc("finalize_payment", {
      p_payment_id: String(p.id),
      p_user_id: String(u.id),
      p_status: String(verification.status),
      p_amount: Number(p.amount),
      p_now: now,
      p_failure_reason: verification.status === "FAILED" ? (verification.message || "Provider returned FAILED") : null,
    });
    if (finalizeError) {
      const code = String(finalizeError.message || "");
      if (code.includes("PAYMENT_NOT_FOUND")) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
      if (code.includes("AMOUNT_MISMATCH")) return err("Montant provider différent.", 409, "AMOUNT_MISMATCH");
      if (code.includes("INVALID_PAYMENT_TRANSITION")) return err("Transition de paiement invalide.", 409, "INVALID_PAYMENT_TRANSITION");
      if (code.includes("SUBSCRIPTION_NOT_FOUND")) return err("Abonnement introuvable.", 409, "SUBSCRIPTION_NOT_FOUND");
      if (code.includes("INVALID_PAYMENT_STATUS")) return err("Statut provider invalide.", 409, "INVALID_PAYMENT_STATUS");
      throw new Error(finalizeError.message);
    }

    const result = finalized as { payment?: unknown; commission?: unknown; idempotent?: boolean };
    return NextResponse.json({
      payment: result.payment,
      verification,
      commission: result.commission ?? null,
      idempotent: Boolean(result.idempotent),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Vérification impossible.", 500);
  }
}
