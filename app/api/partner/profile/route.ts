import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I)
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `JBLY-${out}`;
}

async function ensurePartner(supabase: ReturnType<typeof adminClient>, userId: string) {
  const { data: existing, error: lookupError } = await supabase
    .from("Partner")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return existing;

  // Le code de parrainage doit être unique ; en pratique une collision sur un
  // espace de ~1 milliard de combinaisons est infime, mais on retente proprement.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("Partner")
      .insert({ id: newId(), userId, referralCode: randomCode() })
      .select("*")
      .single();
    if (!error) return data;
    if (!error.message.toLowerCase().includes("duplicate")) throw new Error(error.message);
  }
  throw new Error("Impossible de générer un code de parrainage unique. Réessayez.");
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const partner = await ensurePartner(supabase, user.id);
    return NextResponse.json({ partner });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger le profil partenaire." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await request.json();
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    await ensurePartner(supabase, user.id);

    const payload: Record<string, unknown> = {};
    if (typeof body.payoutProvider === "string") payload.payoutProvider = body.payoutProvider.trim() || null;
    if (typeof body.payoutPhone === "string") payload.payoutPhone = body.payoutPhone.trim() || null;

    const { data, error } = await supabase
      .from("Partner")
      .update(payload)
      .eq("userId", user.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ partner: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible d'enregistrer les infos de paiement." },
      { status: 500 }
    );
  }
}
