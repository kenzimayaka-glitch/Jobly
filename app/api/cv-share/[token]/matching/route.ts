import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
import { calculateExplainableMatch } from "@/lib/opportunityAggregator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function years(rows: any[]) {
  const starts = rows.map((item) => new Date(item.startDate).getTime()).filter(Number.isFinite);
  if (!starts.length) return 0;
  return Math.max(0, Math.floor((Date.now() - Math.min(...starts)) / (1000 * 60 * 60 * 24 * 365)));
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const db = adminClient();
    const { data: share, error: shareError } = await db.from("CVShare")
      .select("id,token,userId,jobId,source,expiresAt,revokedAt")
      .eq("token", token)
      .maybeSingle();
    if (shareError) throw new Error(shareError.message);
    if (!share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now())) {
      return NextResponse.json({ message: "Ce partage CV n'est plus disponible." }, { status: 404, headers: { "Cache-Control": "no-store, private" } });
    }

    const source = typeof share.source === "string" ? share.source : "";
    const applicationMatch = source.match(/^WHATSAPP_APPLICATION:([0-9a-f-]{36})$/i);
    if (!applicationMatch) return NextResponse.json({ message: "Ce partage ne comporte pas de contexte de matching." }, { status: 404 });

    const { data: application, error: applicationError } = await db.from("Application")
      .select("id,userId,jobId,recruiterJobId")
      .eq("id", applicationMatch[1])
      .eq("userId", share.userId)
      .maybeSingle();
    if (applicationError) throw new Error(applicationError.message);
    const relationValid = Boolean(application && (
      (application.jobId && share.jobId === application.jobId) ||
      (application.recruiterJobId && !share.jobId)
    ));
    if (!relationValid) return NextResponse.json({ message: "Le contexte de candidature n'est plus disponible." }, { status: 404 });

    const offerTable = application.jobId ? "Job" : "RecruiterJob";
    const offerId = application.jobId || application.recruiterJobId;
    const { data: job, error: offerError } = await db.from(offerTable).select("*").eq("id", offerId).maybeSingle();
    if (offerError) throw new Error(offerError.message);
    if (!job) return NextResponse.json({ message: "L'offre liée n'est plus disponible." }, { status: 404 });

    const { data: triggerProfile, error: triggerProfileError } = await db.from("Profile")
      .select("userId,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors,publicDiscoverable")
      .eq("userId", share.userId)
      .maybeSingle();
    if (triggerProfileError) throw new Error(triggerProfileError.message);
    if (!triggerProfile) return NextResponse.json({ matchingAvailable: false, higherScoreCount: null }, { headers: { "Cache-Control": "no-store, private" } });

    const [triggerExperience, triggerSkills] = await Promise.all([
      db.from("Experience").select("userId,startDate").eq("userId", share.userId),
      db.from("Skill").select("userId,name").eq("userId", share.userId),
    ]);
    if (triggerExperience.error || triggerSkills.error) throw new Error(triggerExperience.error?.message || triggerSkills.error?.message || "Profil candidat indisponible.");
    const triggerScore = calculateExplainableMatch({
      targetRoles: triggerProfile.targetRoles,
      targetCities: triggerProfile.targetCities,
      contractPreferences: triggerProfile.contractPreferences,
      remotePreference: triggerProfile.remotePreference,
      preferredSectors: triggerProfile.preferredSectors,
      skills: (triggerSkills.data || []).map((item: any) => item.name),
      experienceYears: years(triggerExperience.data || []),
    }, job);

    if (!Number.isFinite(triggerScore)) {
      return NextResponse.json({ matchingAvailable: false, higherScoreCount: null }, { headers: { "Cache-Control": "no-store, private" } });
    }

    // Aggregate only: public/consenting Talent profiles, using the exact same
    // explainable matcher as recruiter discovery. Never return identities or profile scores.
    const { data: profiles, error: profilesError } = await db.from("Profile")
      .select("userId,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors")
      .eq("publicDiscoverable", true)
      .neq("userId", share.userId)
      .limit(1000);
    if (profilesError) throw new Error(profilesError.message);
    const ids = Array.from(new Set((profiles || []).map((item: any) => String(item.userId || "")).filter(Boolean)));
    if (!ids.length) return NextResponse.json({ matchingAvailable: true, higherScoreCount: 0 }, { headers: { "Cache-Control": "no-store, private" } });

    const [usersResult, experiencesResult, skillsResult] = await Promise.all([
      db.from("User").select("id").in("id", ids).eq("role", "TALENT"),
      db.from("Experience").select("userId,startDate").in("userId", ids),
      db.from("Skill").select("userId,name").in("userId", ids),
    ]);
    for (const result of [usersResult, experiencesResult, skillsResult]) if (result.error) throw new Error(result.error.message);

    const talentIds = new Set((usersResult.data || []).map((item: any) => String(item.id)));
    const experiencesByUser = new Map<string, any[]>();
    const skillsByUser = new Map<string, string[]>();
    for (const item of experiencesResult.data || []) {
      const key = String(item.userId);
      experiencesByUser.set(key, [...(experiencesByUser.get(key) || []), item]);
    }
    for (const item of skillsResult.data || []) {
      const key = String(item.userId);
      skillsByUser.set(key, [...(skillsByUser.get(key) || []), String(item.name)]);
    }

    let higherScoreCount = 0;
    for (const profile of profiles || []) {
      const userId = String(profile.userId || "");
      if (!talentIds.has(userId)) continue;
      const score = calculateExplainableMatch({
        targetRoles: profile.targetRoles,
        targetCities: profile.targetCities,
        contractPreferences: profile.contractPreferences,
        remotePreference: profile.remotePreference,
        preferredSectors: profile.preferredSectors,
        skills: skillsByUser.get(userId) || [],
        experienceYears: years(experiencesByUser.get(userId) || []),
      }, job);
      if (Number.isFinite(score) && score >= 90 && score > triggerScore) higherScoreCount += 1;
    }

    return NextResponse.json({
      matchingAvailable: true,
      higherScoreCount,
      comparison: "ELIGIBLE_SCORE_AT_LEAST_90_AND_STRICTLY_HIGHER_THAN_TRIGGERING_TALENT",
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Le compteur de matching est indisponible.",
    }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}
