import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { getActivePlanCode } from "@/lib/entitlements";
import { enforceApiRateLimit } from "@/lib/server-security";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const limited = await enforceApiRateLimit(request, supabase, {
      scope: "talent-showcase-read",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 600, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const [plan, profile] = await Promise.all([
      getActivePlanCode(supabase, user.id, "TALENT"),
      supabase.from("Profile").select("publicDiscoverable").eq("userId", user.id).maybeSingle(),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    const paidMediaEligible = plan === "PREMIUM" || plan === "PRO";
    const imageLimit = plan === "PRO" ? 6 : plan === "PREMIUM" ? 3 : 0;
    return NextResponse.json({
      plan,
      publicDiscoverable: profile.data?.publicDiscoverable === true,
      actionImages: paidMediaEligible && Array.isArray(user.actionImages) ? user.actionImages.slice(0, imageLimit) : [],
      portfolioBusiness: user.portfolioBusiness || { text: "", url: "" },
      executiveSummary: user.executiveSummary || "",
      advertisingVideoUrl: paidMediaEligible ? user.advertisingVideoUrl || null : null,
      pitchVideoUrl: paidMediaEligible ? user.pitchVideoUrl || null : null,
      pitchVideoDurationMs: paidMediaEligible ? user.pitchVideoDurationMs || null : null,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger la vitrine." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const limited = await enforceApiRateLimit(request, supabase, {
      scope: "talent-showcase-update",
      identity: user.id,
      accountWindows: [{ limit: 10, windowSeconds: 60 }, { limit: 100, windowSeconds: 3600 }],
      ipWindows: [{ limit: 20, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Données de vitrine invalides." }, { status: 400 });
    }
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (Array.isArray(body.actionImages)) {
      const plan = await getActivePlanCode(supabase, user.id, "TALENT");
      const imageLimit = plan === "PRO" ? 6 : plan === "PREMIUM" ? 3 : 0;
      if (!imageLimit) return NextResponse.json({ message: "Les images d’actions sont réservées à Premium et Pro." }, { status: 403 });
      const candidateImages = body.actionImages.filter((value: unknown): value is string => typeof value === "string" && value.startsWith("https://"));
      if (candidateImages.length > imageLimit) {
        return NextResponse.json({ message: `Votre formule ${plan} permet ${imageLimit} images d’actions maximum.`, limit: imageLimit }, { status: 422 });
      }
      update.actionImages = body.actionImages
        .filter((value: unknown): value is string => typeof value === "string" && value.startsWith("https://"))
        .slice(0, 6);
    }
    if (body.portfolioBusiness && typeof body.portfolioBusiness === "object" && !Array.isArray(body.portfolioBusiness)) {
      const url = String(body.portfolioBusiness.url || "").trim();
      update.portfolioBusiness = {
        text: String(body.portfolioBusiness.text || "").slice(0, 5000),
        url: /^https?:\/\//i.test(url) ? url.slice(0, 500) : "",
      };
    }
    if (typeof body.executiveSummary === "string") update.executiveSummary = body.executiveSummary.trim().slice(0, 3000) || null;

    if (Object.keys(update).length === 1 && typeof body.publicDiscoverable !== "boolean") {
      return NextResponse.json({ message: "Aucune donnée de vitrine valide à enregistrer." }, { status: 400 });
    }
    const userUpdate = await supabase.from("User").update(update).eq("id", user.id);
    if (userUpdate.error) throw new Error(userUpdate.error.message);

    if (typeof body.publicDiscoverable === "boolean") {
      const profile = await supabase.from("Profile").select("id").eq("userId", user.id).maybeSingle();
      if (profile.error) throw new Error(profile.error.message);
      const payload: Record<string, unknown> = { userId: user.id, publicDiscoverable: body.publicDiscoverable };
      if (profile.data?.id) payload.id = profile.data.id;
      const changed = await supabase.from("Profile").upsert(payload, { onConflict: "userId" });
      if (changed.error) throw new Error(changed.error.message);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer la vitrine." }, { status: 500 });
  }
}
