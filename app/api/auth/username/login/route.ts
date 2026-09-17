import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "../../../../../lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) return NextResponse.json({ message: "Username et mot de passe sont obligatoires." }, { status: 400 });
    const supabaseAdmin = adminClient();
    const { data: user, error } = await supabaseAdmin.from("User").select("email").ilike("username", username).maybeSingle();
    if (error) throw new Error(error.message);
    if (!user?.email) return NextResponse.json({ message: "Username ou mot de passe incorrect." }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase client non configuré.");
    const auth = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error: authError } = await auth.auth.signInWithPassword({ email: user.email, password });
    if (authError || !data.session) return NextResponse.json({ message: "Username ou mot de passe incorrect." }, { status: 401 });
    return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Connexion impossible." }, { status: 500 });
  }
}
