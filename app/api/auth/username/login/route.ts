import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "../../../../../lib/server-auth";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || username.length > 40 || !password || password.length > 256) {
      return NextResponse.json({ message: "Username ou mot de passe invalide." }, { status: 400 });
    }
    const supabaseAdmin = adminClient();
    const rateLimited = await enforceApiRateLimit(request, supabaseAdmin, {
      scope: "auth-username-login",
      identity: "username:" + username.toLowerCase(),
      accountWindows: [{ limit: 5, windowSeconds: 900 }, { limit: 20, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 60 }, { limit: 30, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (rateLimited) return rateLimited;
    const { data: user, error } = await supabaseAdmin.from("User").select("email").ilike("username", username).maybeSingle();
    if (error) throw new Error(error.message);
    if (!user?.email) { console.info("[auth/username/login] lookup_not_found"); return NextResponse.json({ message: "Username ou mot de passe incorrect." }, { status: 401 }); }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase client non configuré.");
    const auth = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error: authError } = await auth.auth.signInWithPassword({ email: user.email, password });
    if (authError || !data.session) { console.info("[auth/username/login] password_rejected"); return NextResponse.json({ message: "Username ou mot de passe incorrect." }, { status: 401 }); }
    console.info("[auth/username/login] success");
    return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Connexion impossible." }, { status: 500 });
  }
}
