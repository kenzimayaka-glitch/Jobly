import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";

async function ensureRecruiterProfile(supabase: ReturnType<typeof adminClient>, userId: string) {
  const { data: existing, error: lookupError } = await supabase
    .from("RecruiterProfile")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("RecruiterProfile")
    .insert({ id: newId(), userId, companyName: "Mon entreprise", updatedAt: now })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const profile = await ensureRecruiterProfile(supabase, user.id);
    return NextResponse.json({ profile: { ...profile, email: user.email || null, phone: user.phone || null } });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger le profil recruteur." },
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
    await ensureRecruiterProfile(supabase, user.id);

    const companyName = String(body.companyName || "").trim();
    if (!companyName) {
      return NextResponse.json({ message: "Le nom de l'entreprise est obligatoire." }, { status: 400 });
    }

    const payload = {
      companyName,
      sector: String(body.sector || "").trim() || null,
      website: String(body.website || "").trim() || null,
      location: String(body.location || "").trim() || null,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("RecruiterProfile")
      .update(payload)
      .eq("userId", user.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const phone = String(body.phone || "").trim() || null;
    const { error: userUpdateError } = await supabase.from("User").update({ phone, updatedAt: new Date().toISOString() }).eq("id", user.id);
    if (userUpdateError) throw new Error(userUpdateError.message);

    return NextResponse.json({ profile: { ...data, email: user.email || null, phone } });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible d'enregistrer le profil recruteur." },
      { status: 500 }
    );
  }
}
