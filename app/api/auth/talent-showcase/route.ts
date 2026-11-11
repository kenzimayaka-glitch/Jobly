import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { getTalentShowcasePlan, TALENT_SHOWCASE_LIMITS } from "@/lib/talentShowcaseEntitlements";

function cleanImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const url = item.trim();
      if (url) cleaned.push(url);
    }
  }
  return [...new Set(cleaned)];
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const [plan, profile] = await Promise.all([
      getTalentShowcasePlan(supabase, user.id),
      supabase.from("Profile").select("publicDiscoverable").eq("userId", user.id).maybeSingle(),
    ]);
    if (profile.error) throw new Error(profile.error.message);

    return NextResponse.json({
      plan,
      publicDiscoverable: profile.data?.publicDiscoverable === true,
      actionImages: Array.isArray(user.actionImages) ? user.actionImages : [],
      portfolioBusiness: user.portfolioBusiness || { text: "", url: "" },
      executiveSummary: user.executiveSummary || "",
      advertisingVideoUrl: user.advertisingVideoUrl || null,
      pitchVideoUrl: user.pitchVideoUrl || null,
      pitchVideoDurationMs: user.pitchVideoDurationMs || null,
    });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de charger la vitrine.",
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const plan = await getTalentShowcasePlan(supabase, user.id);
    const body = await request.json();
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (Array.isArray(body.actionImages)) {
      const currentImages = cleanImageUrls(user.actionImages);
      const requestedImages = cleanImageUrls(body.actionImages);
      const additions = requestedImages.filter((url) => !currentImages.includes(url));
      const limit = plan === "FREE" ? 0 : TALENT_SHOWCASE_LIMITS[plan].images;

      if (additions.length && (limit === 0 || requestedImages.length > limit)) {
        return NextResponse.json({
          message: plan === "FREE"
            ? "Les images d’actions sont disponibles avec Pro ou Premium."
            : `Quota d’images atteint pour votre formule (${limit}).`,
          limit,
        }, { status: 403 });
      }

      const publicPrefix = supabase.storage.from("talent-showcase").getPublicUrl(`${user.id}/`).data.publicUrl;
      const invalidAdditions = additions.filter((url) => !url.startsWith(publicPrefix));
      if (invalidAdditions.length) {
        return NextResponse.json({ message: "Une image de la vitrine ne correspond pas à ce compte." }, { status: 403 });
      }
      update.actionImages = requestedImages;
    }

    if (body.portfolioBusiness && typeof body.portfolioBusiness === "object") {
      update.portfolioBusiness = {
        text: String(body.portfolioBusiness.text || "").slice(0, 5000),
        url: String(body.portfolioBusiness.url || "").slice(0, 500),
      };
    }
    if (typeof body.executiveSummary === "string") {
      update.executiveSummary = body.executiveSummary.trim().slice(0, 3000) || null;
    }

    const saved = await supabase.from("User").update(update).eq("id", user.id);
    if (saved.error) throw new Error(saved.error.message);

    if (Array.isArray(body.actionImages)) {
      const marker = "/storage/v1/object/public/talent-showcase/";
      const removedPaths = (Array.isArray(user.actionImages) ? user.actionImages : [])
        .filter((url: unknown): url is string => typeof url === "string" && !body.actionImages.includes(url))
        .map((url: string) => {
          const index = url.indexOf(marker);
          return index < 0 ? null : url.slice(index + marker.length);
        })
        .filter((value: string | null): value is string => Boolean(value && value.startsWith(`${user.id}/`)));
      if (removedPaths.length) {
        const removed = await supabase.storage.from("talent-showcase").remove(removedPaths);
        if (removed.error) {
          // The profile update is authoritative; a failed object cleanup must not
          // turn a successful save into a false failure.
        }
      }
    }

    if (typeof body.publicDiscoverable === "boolean") {
      const existing = await supabase.from("Profile").select("id").eq("userId", user.id).maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      const payload: Record<string, unknown> = { userId: user.id, publicDiscoverable: body.publicDiscoverable };
      if (existing.data?.id) payload.id = existing.data.id;
      const updated = await supabase.from("Profile").upsert(payload, { onConflict: "userId" });
      if (updated.error) throw new Error(updated.error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible d'enregistrer la vitrine.",
    }, { status: 500 });
  }
}
