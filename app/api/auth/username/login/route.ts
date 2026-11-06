import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "../../../../../lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) {
      return NextResponse.json({ message: "Username et mot de passe sont obligatoires." }, { status: 400 });
    }

    const supabaseAdmin = adminClient();
    const { data: user, error: lookupError } = await supabaseAdmin
      .from("User")
      .select("id,email,authUserId")
      .ilike("username", username)
      .maybeSingle();

    if (lookupError) throw new Error("Recherche du compte impossible.");
    if (!user?.email) {
      console.info("[auth/username/login] lookup_not_found");
      return NextResponse.json({ message: "Username ou mot de passe incorrect." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase client non configuré.");

    const auth = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error: authError } = await auth.auth.signInWithPassword({ email: user.email, password });

    if (authError || !data.session || !data.user) {
      console.info("[auth/username/login] password_rejected");
      return NextResponse.json({ message: "Username ou mot de passe incorrect." }, { status: 401 });
    }

    // Claim a legacy internal row only after the credentials are verified.
    if (user.authUserId && user.authUserId !== data.user.id) {
      console.warn("[auth/username/login] account_link_conflict");
      return NextResponse.json({ message: "Ce compte nécessite une vérification auprès du support JOBLY." }, { status: 409 });
    }

    if (!user.authUserId) {
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("User")
        .update({ authUserId: data.user.id, updatedAt: new Date().toISOString() })
        .eq("id", user.id)
        .is("authUserId", null)
        .select("id")
        .maybeSingle();

      if (claimError) throw new Error("Association du compte JOBLY impossible.");
      if (!claimed) {
        const { data: current, error: currentError } = await supabaseAdmin
          .from("User")
          .select("authUserId")
          .eq("id", user.id)
          .maybeSingle();
        if (currentError || current?.authUserId !== data.user.id) {
          return NextResponse.json({ message: "Ce compte est déjà associé à une autre identité." }, { status: 409 });
        }
      }
    }

    console.info("[auth/username/login] success");
    return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Connexion impossible." },
      { status: 500 }
    );
  }
}
