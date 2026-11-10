import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, getRecruiterProfileForAuthUser } from "@/lib/server-auth";
import { isProfilePhotoPublic } from "@/lib/profilePhotoStorage";
import { getRecruiterEntitlements } from "@/lib/billingCatalog";
import { resolveActiveEntitlements } from "@/lib/entitlements";
import { calculateExplainableMatch } from "@/lib/opportunityAggregator";

function years(rows: any[]) {
  const starts = rows.map((item) => new Date(item.startDate).getTime()).filter(Number.isFinite);
  if (!starts.length) return 0;
  return Math.max(0, Math.floor((Date.now() - Math.min(...starts)) / (1000 * 60 * 60 * 24 * 365)));
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const db = adminClient();
    const me = await ensureUser(db, auth);
    const recruiterProfile = me.role === "ADMIN" ? true : await getRecruiterProfileForAuthUser(db, auth.id, me.id);
    if (me.role !== "RECRUITER" && me.role !== "ADMIN" && !recruiterProfile) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    if (me.role !== "ADMIN") {
      const active = await resolveActiveEntitlements(db, me.id, "RECRUITER");
      if (!getRecruiterEntitlements(active.planCode).topFiveMatchingProfiles) {
        return NextResponse.json({ message: "Un abonnement Recruteur Premium ou Pro actif est nécessaire pour ouvrir les cinq profils.", code: "MATCHING_PROFILES_LOCKED" }, { status: 403 });
      }
    }

    const params = request.nextUrl.searchParams;
    const id = params.get("userId");
    const token = params.get("shareToken");
    if (!id || !token) {
      return NextResponse.json({ message: "Un profil ne peut être ouvert qu'à partir d'une offre de matching autorisée.", code: "OFFER_CONTEXT_REQUIRED" }, { status: 400 });
    }

    const { data: share, error: shareError } = await db.from("CVShare")
      .select("userId,jobId,source,expiresAt,revokedAt")
      .eq("token", token)
      .maybeSingle();
    if (shareError) throw new Error(shareError.message);
    if (!share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now())) {
      return NextResponse.json({ message: "Partage ou contexte de matching expiré." }, { status: 404 });
    }

    const source = typeof share.source === "string" ? share.source : "";
    const match = source.match(/^WHATSAPP_APPLICATION:([0-9a-f-]{36})$/i);
    if (!match) return NextResponse.json({ message: "Contexte de matching non reconnu." }, { status: 404 });
    const { data: application, error: applicationError } = await db.from("Application")
      .select("id,userId,jobId,recruiterJobId")
      .eq("id", match[1])
      .eq("userId", share.userId)
      .maybeSingle();
    if (applicationError) throw new Error(applicationError.message);
    if (!application) return NextResponse.json({ message: "Offre liée au partage introuvable." }, { status: 404 });
    const relationValid = (application.jobId && share.jobId === application.jobId) ||
      (application.recruiterJobId && !share.jobId);
    if (!relationValid) return NextResponse.json({ message: "Offre liée au partage introuvable." }, { status: 404 });

    const table = application.jobId ? "Job" : "RecruiterJob";
    const offerId = application.jobId || application.recruiterJobId;
    const { data: job, error: jobError } = await db.from(table).select("*").eq("id", offerId).maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job) return NextResponse.json({ message: "Offre introuvable." }, { status: 404 });

    const { data: profiles, error: profilesError } = await db.from("Profile")
      .select("userId,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors,publicDiscoverable")
      .eq("publicDiscoverable", true)
      .neq("userId", share.userId)
      .limit(1000);
    if (profilesError) throw new Error(profilesError.message);
    const ids = Array.from(new Set((profiles || []).map((profile: any) => String(profile.userId || "")).filter(Boolean)));
    if (!ids.length) return NextResponse.json({ message: "Aucun profil admissible pour cette offre." }, { status: 404 });

    const [usersResult, experiencesResult, skillsResult] = await Promise.all([
      db.from("User").select("id,role").in("id", ids).eq("role", "TALENT"),
      db.from("Experience").select("userId,startDate").in("userId", ids),
      db.from("Skill").select("userId,name").in("userId", ids),
    ]);
    for (const result of [usersResult, experiencesResult, skillsResult]) if (result.error) throw new Error(result.error.message);

    const talentIds = new Set((usersResult.data || []).map((item: any) => String(item.id)));
    const expByUser = new Map<string, any[]>();
    const skillsByUser = new Map<string, string[]>();
    for (const item of experiencesResult.data || []) expByUser.set(item.userId, [...(expByUser.get(item.userId) || []), item]);
    for (const item of skillsResult.data || []) skillsByUser.set(item.userId, [...(skillsByUser.get(item.userId) || []), item.name]);

    const ranked = (profiles || []).flatMap((profile: any) => {
      const userId = String(profile.userId || "");
      if (!talentIds.has(userId)) return [];
      const score = calculateExplainableMatch({
        targetRoles: profile.targetRoles,
        targetCities: profile.targetCities,
        contractPreferences: profile.contractPreferences,
        remotePreference: profile.remotePreference,
        preferredSectors: profile.preferredSectors,
        skills: skillsByUser.get(userId) || [],
        experienceYears: years(expByUser.get(userId) || []),
      }, job);
      return Number.isFinite(score) && score >= 90 ? [{ userId, score }] : [];
    }).sort((a: any, b: any) => b.score - a.score || a.userId.localeCompare(b.userId)).slice(0, 5);
    if (!ranked.some((item: any) => item.userId === id)) {
      return NextResponse.json({ message: "Ce profil ne figure pas dans les cinq meilleurs talents admissibles pour cette offre.", code: "PROFILE_NOT_IN_TOP_FIVE" }, { status: 404 });
    }

    const profileResult = await db.from("Profile")
      .select("userId,firstName,lastName,headline,summary,location,targetRoles,publicDiscoverable")
      .eq("userId", id)
      .eq("publicDiscoverable", true)
      .maybeSingle();
    if (profileResult.error) throw new Error(profileResult.error.message);
    if (!profileResult.data) return NextResponse.json({ message: "Profil public introuvable." }, { status: 404 });

    const [userResult, experienceResult, skillResult] = await Promise.all([
      db.from("User").select("displayName,profilePhotoUrl,profilePhotoVisibility,profilePhotoConsentAt,executiveSummary,portfolioBusiness,advertisingVideoUrl,pitchVideoUrl,pitchVideoDurationMs").eq("id", id).single(),
      db.from("Experience").select("title,company,startDate,endDate,description").eq("userId", id).order("startDate", { ascending: false }),
      db.from("Skill").select("name,level").eq("userId", id).order("name"),
    ]);
    for (const result of [userResult, experienceResult, skillResult]) if (result.error) throw new Error(result.error.message);

    if (!userResult.data) return NextResponse.json({ message: "Profil talent introuvable." }, { status: 404 });
    const user = userResult.data;
    return NextResponse.json({
      profile: profileResult.data,
      user: {
        displayName: user.displayName,
        profilePhotoUrl: isProfilePhotoPublic(user) ? user.profilePhotoUrl : null,
        executiveSummary: user.executiveSummary,
        portfolioBusiness: user.portfolioBusiness,
        advertisingVideoUrl: user.advertisingVideoUrl,
        pitchVideoUrl: user.pitchVideoUrl,
        pitchVideoDurationMs: user.pitchVideoDurationMs,
      },
      experiences: experienceResult.data || [],
      skills: skillResult.data || [],
      matchPercent: ranked.find((item: any) => item.userId === id)?.score ?? null,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger le profil." }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}
