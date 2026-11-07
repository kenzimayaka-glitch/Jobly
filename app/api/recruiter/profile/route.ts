import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";

async function findRecruiterProfileByAuthUid(
  supabase: ReturnType<typeof adminClient>,
  authUserId: string,
) {
  const { data, error } = await supabase
    .from("RecruiterProfile")
    .select("*")
    .eq("userId", authUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function ensureRecruiterProfile(
  supabase: ReturnType<typeof adminClient>,
  authUserId: string,
  internalUserId: string,
) {
  const current = await findRecruiterProfileByAuthUid(supabase, authUserId);
  if (current) return current;

  // Older recruiter rows may have been stored with User.id. Relink only the
  // row belonging to this already-authenticated internal account, preserving
  // its profile id and business data. Never claim a row owned by another user.
  if (
    internalUserId !== authUserId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(internalUserId)
  ) {
    const { data: legacy, error: legacyError } = await supabase
      .from("RecruiterProfile")
      .select("*")
      .eq("userId", internalUserId)
      .maybeSingle();
    if (legacyError) throw new Error(legacyError.message);

    if (legacy) {
      const { data: linked, error: linkError } = await supabase
        .from("RecruiterProfile")
        .update({ userId: authUserId, updatedAt: new Date().toISOString() })
        .eq("id", legacy.id)
        .eq("userId", internalUserId)
        .select("*")
        .maybeSingle();

      if (linkError) {
        const raced = await findRecruiterProfileByAuthUid(supabase, authUserId);
        if (raced) return raced;
        throw new Error(linkError.message);
      }
      if (linked) return linked;

      // Another request may have completed the same relink first.
      const raced = await findRecruiterProfileByAuthUid(supabase, authUserId);
      if (raced) return raced;
      throw new Error("RECRUITER_PROFILE_LINK_CONFLICT");
    }
  }

  const { data, error } = await supabase
    .from("RecruiterProfile")
    .insert({
      id: newId(),
      userId: authUserId,
      companyName: "Mon entreprise",
      updatedAt: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    // A parallel first visit may have created the Auth-owned row already.
    const raced = await findRecruiterProfileByAuthUid(supabase, authUserId);
    if (raced) return raced;
    throw new Error(error.message);
  }
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const profile = await ensureRecruiterProfile(supabase, authUser.id, user.id);
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
    await ensureRecruiterProfile(supabase, authUser.id, user.id);

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
      .eq("userId", authUser.id)
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
