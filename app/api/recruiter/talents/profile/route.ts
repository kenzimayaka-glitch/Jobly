import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { getActivePlanCode } from "../../../../../lib/entitlements";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const me = await ensureUser(supabase, auth);
    const recruiter = await supabase
      .from("RecruiterProfile")
      .select("id")
      .eq("userId", me.id)
      .maybeSingle();
    if (recruiter.error) throw new Error(recruiter.error.message);

    let recruiterProfile = recruiter.data;
    if (!recruiterProfile && auth.id !== me.id) {
      const legacy = await supabase
        .from("RecruiterProfile")
        .select("id")
        .eq("userId", auth.id)
        .maybeSingle();
      if (legacy.error) throw new Error(legacy.error.message);
      recruiterProfile = legacy.data;
    }
    if (me.role !== "RECRUITER" && me.role !== "ADMIN" && !recruiterProfile) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const rateLimited = await enforceApiRateLimit(request, supabase, {
      scope: "recruiter-talent-profile",
      identity: me.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 600, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (rateLimited) return rateLimited;

    const id = request.nextUrl.searchParams.get("userId");
    if (!id || id.length > 128) return NextResponse.json({ message: "Talent manquant." }, { status: 400 });

    const profile = await supabase
      .from("Profile")
      .select("userId,firstName,lastName,headline,summary,location,targetRoles,publicDiscoverable")
      .eq("userId", id)
      .eq("publicDiscoverable", true)
      .maybeSingle();
    if (profile.error) throw new Error(profile.error.message);
    if (!profile.data) return NextResponse.json({ message: "Profil public introuvable." }, { status: 404 });

    const [userResult, experienceResult, skillResult, plan] = await Promise.all([
      supabase.from("User")
        .select("displayName,profilePhotoUrl,executiveSummary,portfolioBusiness,advertisingVideoUrl,advertisingVideoDurationMs,pitchVideoUrl,pitchVideoDurationMs")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("Experience")
        .select("title,company,startDate,endDate,description")
        .eq("userId", id)
        .order("startDate", { ascending: false }),
      supabase.from("Skill")
        .select("name,level")
        .eq("userId", id)
        .order("name"),
      getActivePlanCode(supabase, id, "TALENT"),
    ]);
    if (userResult.error || experienceResult.error || skillResult.error) {
      throw new Error((userResult.error || experienceResult.error || skillResult.error)?.message || "Erreur");
    }
    if (!userResult.data) return NextResponse.json({ message: "Profil Talent introuvable." }, { status: 404 });

    const paidMediaEligible = plan === "PREMIUM" || plan === "PRO";
    const user = {
      ...userResult.data,
      advertisingVideoUrl: paidMediaEligible ? userResult.data.advertisingVideoUrl : null,
      advertisingVideoDurationMs: paidMediaEligible ? userResult.data.advertisingVideoDurationMs : null,
      pitchVideoUrl: paidMediaEligible ? userResult.data.pitchVideoUrl : null,
      pitchVideoDurationMs: paidMediaEligible ? userResult.data.pitchVideoDurationMs : null,
    };

    return NextResponse.json(
      { profile: profile.data, user, experiences: experienceResult.data || [], skills: skillResult.data || [], plan: plan, paidMediaEligible },
      { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } }
    );
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de charger le profil.",
    }, { status: 500 });
  }
}
