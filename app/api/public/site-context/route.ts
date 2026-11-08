import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ accountKey: null, role: null }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase client non configuré.");

    const authClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ accountKey: null, role: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const service = adminClient();
    const { data: account, error: accountError } = await service
      .from("User")
      .select("id,role")
      .eq("authUserId", data.user.id)
      .maybeSingle();
    if (accountError) throw accountError;

    const accountKey = createHash("sha256")
      .update(String(account?.id ?? data.user.id))
      .digest("hex")
      .slice(0, 32);

    return NextResponse.json(
      { accountKey, role: account?.role ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { accountKey: null, role: null, message: "Contexte du compte momentanément indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
