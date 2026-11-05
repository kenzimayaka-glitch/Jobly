import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

const err = (message: string, status: number, code = message) =>
  NextResponse.json({ error: code, message }, { status });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return err("Session requise.", 401, "UNAUTHENTICATED");

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    if (!["ADMIN", "FINANCE"].includes(user.role)) {
      return err("Accès administrateur requis.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    const { data: payment, error } = await supabase
      .from("Payment")
      .select("id,status,provider")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!payment) return err("Paiement introuvable.", 404, "PAYMENT_NOT_FOUND");
    if (payment.status === "REFUNDED") return NextResponse.json({ payment, idempotent: true });
    if (payment.status !== "SUCCESSFUL") {
      return err("Seul un paiement réussi peut être remboursé.", 422, "INVALID_PAYMENT_TRANSITION");
    }

    // No configured PaymentProvider implements a verifiable refund operation.
    // Do not mark the ledger refunded unless the provider has actually returned success.
    return err(
      "Remboursement fournisseur non disponible : aucun remboursement n'a été exécuté ni enregistré. Effectuez d'abord le remboursement auprès du prestataire et faites-le rapprocher par Finance.",
      501,
      "PROVIDER_REFUND_UNSUPPORTED",
    );
  } catch (error) {
    return err(error instanceof Error ? error.message : "Remboursement impossible.", 500);
  }
}
