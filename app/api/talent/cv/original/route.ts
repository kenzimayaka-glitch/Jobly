import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "../../../../../lib/server-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "STORAGE_UNAVAILABLE", message: "Stockage du CV indisponible." }, { status: 503 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: user, error: userError } = await admin
      .from("User")
      .select("cvOriginalStoragePath,cvOriginalFileName")
      .eq("authUserId", auth.id)
      .maybeSingle();

    if (userError) throw new Error(userError.message);
    if (!user?.cvOriginalStoragePath) {
      return NextResponse.json({ error: "CV_NOT_FOUND", message: "Aucun CV original enregistré." }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from("talent-cvs")
      .createSignedUrl(user.cvOriginalStoragePath, 60);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Impossible de générer le lien sécurisé du CV.");
    }

    return NextResponse.json({
      ok: true,
      fileName: user.cvOriginalFileName || "CV-Jobly.pdf",
      url: data.signedUrl,
      expiresIn: 60,
    });
  } catch (error) {
    return NextResponse.json({
      error: "CV_ORIGINAL_FAILED",
      message: error instanceof Error ? error.message : "Impossible de récupérer le CV original.",
    }, { status: 500 });
  }
}
