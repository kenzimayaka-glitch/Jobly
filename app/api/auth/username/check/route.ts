import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";

// Un username est unique quelle que soit sa casse ou ses espaces superflus :
// "Kenzi", "KENZI" et " kenzi " désignent le même identifiant. On normalise
// donc systématiquement en trim()+toLowerCase() avant toute comparaison, et
// on interroge la base avec `ilike` (insensible à la casse) en plus de la
// normalisation côté serveur, en filet de sécurité.
// 15/09/2026 : seule l'unicité est vérifiée désormais — plus de contrainte de
// format sur le username (voir lib/auth.ts pour le même changement côté client).
const USERNAME_SANE = (value: string) => value.length > 0 && value.length <= 40;

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("username") || "";
    const username = raw.trim().toLowerCase();

    if (!USERNAME_SANE(username)) {
      return NextResponse.json({ available: false, reason: "format" });
    }

    const supabase = adminClient();
    const { data, error } = await supabase
      .from("User")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (error) throw new Error(error.message);

    return NextResponse.json({ available: !data, reason: data ? "taken" : null });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Vérification impossible." },
      { status: 500 }
    );
  }
}
