import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

// NOTE : aucune commission n'est générée ici. La brique Billing/paiements
// (section 1, brique 8 de Statut.md) n'existe pas encore, donc il n'y a
// aujourd'hui aucun événement réel qui pourrait produire une commission.
// Cette route lit la table "Commission" telle quelle — elle renvoie une liste
// vide honnête plutôt que des données inventées, jusqu'à ce qu'un événement
// commissionnable réel (ex. abonnement payé via un lien de parrainage) écrive
// dedans.

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    const { data: partner, error: partnerError } = await supabase
      .from("Partner")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();
    if (partnerError) throw new Error(partnerError.message);
    if (!partner) return NextResponse.json({ commissions: [], totals: { payable: 0, paid: 0, pending: 0 } });

    const { data, error } = await supabase
      .from("Commission")
      .select("*")
      .eq("partnerId", partner.id)
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);

    const commissions: { status: string; amount: number }[] = data || [];
    const totals = commissions.reduce(
      (acc: { payable: number; paid: number; pending: number }, c: { status: string; amount: number }) => {
        if (c.status === "PAID") acc.paid += c.amount;
        else if (c.status === "PAYABLE" || c.status === "PAYMENT_EXECUTED") acc.payable += c.amount;
        else acc.pending += c.amount;
        return acc;
      },
      { payable: 0, paid: 0, pending: 0 }
    );

    return NextResponse.json({ commissions, totals });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger les commissions." },
      { status: 500 }
    );
  }
}
