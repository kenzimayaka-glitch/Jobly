import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, getRecruiterProfileForAuthUser } from "@/lib/server-auth";
import { calculateExplainableMatch } from "@/lib/opportunityAggregator";
import { isProfilePhotoPublic } from "@/lib/profilePhotoStorage";
import { getRecruiterEntitlements } from "@/lib/billingCatalog";
import { resolveActiveEntitlements } from "@/lib/entitlements";

export const dynamic = "force-dynamic";
function years(rows: any[]) {
  const starts = rows.map((item) => new Date(item.startDate).getTime()).filter(Number.isFinite);
  if (!starts.length) return 0;
  return Math.max(0, Math.floor((Date.now() - Math.min(...starts)) / (1000 * 60 * 60 * 24 * 365)));
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401, headers: { "Cache-Control": "no-store, private" } });
    const { id } = await context.params;
    const db = adminClient();
    const recruiter = await ensureUser(db, auth);
    const recruiterProfile = recruiter.role === "ADMIN" ? true : await getRecruiterProfileForAuthUser(db, auth.id, recruiter.id);
    if (recruiter.role !== "RECRUITER" && recruiter.role !== "ADMIN" && !recruiterProfile) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403, headers: { "Cache-Control": "no-store, private" } });
    }

    let jobQuery = db.from("RecruiterJob").select("*").eq("id", id);
    if (recruiter.role !== "ADMIN") jobQuery = jobQuery.eq("recruiterUserId", recruiter.id);
    const { data: job, error: jobError } = await jobQuery.maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job) return NextResponse.json({ message: "Offre introuvable ou non autorisée." }, { status: 404, headers: { "Cache-Control": "no-store, private" } });

    let profileAccess = recruiter.role === "ADMIN";
    if (!profileAccess) {
      const active = await resolveActiveEntitlements(db, recruiter.id, "RECRUITER");
      profileAccess = getRecruiterEntitlements(active.planCode).topFiveMatchingProfiles === true;
    }

    const { data: profiles, error: profilesError } = await db.from("Profile")
      .select("userId,firstName,lastName,headline,location,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors,publicDiscoverable")
      .eq("publicDiscoverable", true)
      .neq("userId", recruiter.id)
      .limit(1000);
    if (profilesError) throw new Error(profilesError.message);
    const ids = Array.from(new Set((profiles || []).map((item: any) => String(item.userId || "")).filter(Boolean)));
    if (!ids.length) return NextResponse.json({ job: { id: job.id, title: job.title }, profileAccess, eligibleCount: 0, talents: [] }, { headers: { "Cache-Control": "no-store, private" } });

    const [usersResult, experiencesResult, skillsResult] = await Promise.all([
      db.from("User").select("id,role,displayName,profilePhotoUrl,profilePhotoVisibility,profilePhotoConsentAt").in("id", ids).eq("role", "TALENT"),
      db.from("Experience").select("userId,startDate").in("userId", ids),
      db.from("Skill").select("userId,name").in("userId", ids),
    ]);
    for (const result of [usersResult, experiencesResult, skillsResult]) if (result.error) throw new Error(result.error.message);

    const users = new Map((usersResult.data || []).map((item: any) => [String(item.id), item]));
    const talentIds = new Set(users.keys());
    const experienceMap = new Map<string, any[]>();
    const skillMap = new Map<string, string[]>();
    for (const item of experiencesResult.data || []) {
      const key = String(item.userId);
      experienceMap.set(key, [...(experienceMap.get(key) || []), item]);
    }
    for (const item of skillsResult.data || []) {
      const key = String(item.userId);
      skillMap.set(key, [...(skillMap.get(key) || []), String(item.name)]);
    }

    const ranked = (profiles || []).flatMap((profile: any) => {
      const userId = String(profile.userId || "");
      if (!talentIds.has(userId)) return [];
      const user: any = users.get(userId) || {};
      const skills = skillMap.get(userId) || [];
      const experienceYears = years(experienceMap.get(userId) || []);
      const score = calculateExplainableMatch({
        targetRoles: profile.targetRoles,
        targetCities: profile.targetCities,
        contractPreferences: profile.contractPreferences,
        remotePreference: profile.remotePreference,
        preferredSectors: profile.preferredSectors,
        skills,
        experienceYears,
      }, job);
      return Number.isFinite(score) && score >= 90 ? [{ userId, profile, user, skills, experienceYears, score }] : [];
    }).sort((a: any, b: any) => b.score - a.score || a.userId.localeCompare(b.userId));
    const topFive = ranked.slice(0, 5);

    // No identity, ID, image, location, CV, or profile field leaves this endpoint for FREE recruiters.
    const talents = profileAccess
      ? topFive.map((item: any, index: number) => ({
          id: item.userId,
          rank: index + 1,
          name: [item.profile.firstName, item.profile.lastName].filter(Boolean).join(" ") || item.user.displayName || "Talent Jobly",
          headline: item.profile.headline || "Profil professionnel",
          location: item.profile.location || "",
          profilePhotoUrl: isProfilePhotoPublic(item.user) ? item.user.profilePhotoUrl || null : null,
          skills: item.skills.slice(0, 6),
          experienceYears: item.experienceYears,
          matchPercent: item.score,
        }))
      : topFive.map((item: any, index: number) => ({ rank: index + 1, matchPercent: item.score }));

    return NextResponse.json({
      job: { id: job.id, title: job.title },
      profileAccess,
      requiresSubscription: !profileAccess,
      eligibleCount: ranked.length,
      talents,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de calculer le Top 5." }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}
