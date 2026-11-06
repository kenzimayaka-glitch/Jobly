import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const email = typeof authUser.email === "string" ? authUser.email.trim().toLowerCase() : "";
    const emailConfirmed = Boolean(
      (authUser as typeof authUser & { email_confirmed_at?: string | null }).email_confirmed_at
    );

    let internalUser: { id: string; username?: string | null } | null = null;
    const { data: linked, error: linkedError } = await supabase
      .from("User")
      .select("id,username")
      .eq("authUserId", authUser.id)
      .maybeSingle();
    if (linkedError) throw new Error("Lecture de l'identité JOBLY impossible.");
    internalUser = linked;

    // An exact, provider-confirmed email can claim a legacy row only when no
    // Supabase auth identity is attached to it. Ambiguous matches are not guessed.
    if (!internalUser && email && emailConfirmed) {
      const { data: legacy, error: legacyError } = await supabase
        .from("User")
        .select("id,username")
        .eq("email", email)
        .is("authUserId", null)
        .maybeSingle();

      if (!legacyError && legacy) {
        const { data: claimed, error: claimError } = await supabase
          .from("User")
          .update({ authUserId: authUser.id, updatedAt: new Date().toISOString() })
          .eq("id", legacy.id)
          .is("authUserId", null)
          .select("id,username")
          .maybeSingle();
        if (claimError) throw new Error("Association de l'identité JOBLY impossible.");
        internalUser = claimed;
      }
    }

    if (!internalUser) {
      const createdOrExisting = await ensureUser(supabase, authUser);
      internalUser = { id: createdOrExisting.id, username: createdOrExisting.username ?? null };
    }

    const hasUsername = typeof internalUser.username === "string" && internalUser.username.trim().length > 0;
    return NextResponse.json({ userId: internalUser.id, hasUsername, needsSetup: !hasUsername });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Vérification de l'identité impossible." },
      { status: 500 }
    );
  }
}
