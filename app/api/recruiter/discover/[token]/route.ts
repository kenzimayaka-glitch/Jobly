import { NextRequest, NextResponse } from "next/server";
import {
  adminClient,
  ensureUser,
  getAuthUser,
  getRecruiterProfileForAuthUser,
} from "@/lib/server-auth";
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const db = adminClient();
    const { data: share, error: shareError } = await db.from("CVShare")
      .select("id,token,userId,jobId,source,expiresAt,revokedAt,jobTitleSnapshot,companyNameSnapshot")
      .eq("token", token)
      .maybeSingle();
    if (shareError) throw new Error(shareError.message);
    if (!share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now())) {
      return NextResponse.json({ message: "Partage indisponible." }, { status: 404, headers: { "Cache-Control": "no-store, private" } });
    }

    let profileAccess = false;
    let authenticatedRecruiter = false;
    const auth = await getAuthUser(request);
    if (auth) {
      const user = await ensureUser(db, auth);
      const recruiterProfile = user.role === "ADMIN" ? true : await getRecruiterProfileForAuthUser(db, auth.id, user.id);
      authenticatedRecruiter = user.role === "RECRUITER" || user.role === "ADMIN" || Boolean(recruiterProfile);
      if (authenticatedRecruiter && user.role !== "ADMIN") {
        const active = await resolveActiveEntitlements(db, user.id, "RECRUITER");
        profileAccess = getRecruiterEntitlements(active.planCode).topFiveMatchingProfiles === true;
      } else if (user.role === "ADMIN") {
        profileAccess = true;
      }
    }

    const source = typeof share.source === "string" ? share.source : "";
    const applicationMatch = source.match(/^WHATSAPP_APPLICATION:([0-9a-f-]{36})$/i);
    let job: any = null;

    if (applicationMatch) {
      const { data: application, error } = await db.from("Application")
        .select("id,userId,jobId,recruiterJobId")
        .eq("id", applicationMatch[1])
        .eq("userId", share.userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const relationValid = Boolean(application && (
        (application.jobId && share.jobId === application.jobId) ||
        (application.recruiterJobId && !share.jobId)
      ));
      if (!relationValid) return NextResponse.json({ message: "Offre liée au partage introuvable." }, { status: 404 });

      const table = application.jobId ? "Job" : "RecruiterJob";
      const offerId = application.jobId || application.recruiterJobId;
      const { data: offer, error: offerError } = await db.from(table).select("*").eq("id", offerId).maybeSingle();
      if (offerError) throw new Error(offerError.message);
      job = offer;
    } else if (share.jobId) {
      const { data: offer, error: offerError } = await db.from("Job").select("*").eq("id", share.jobId).maybeSingle();
      if (offerError) throw new Error(offerError.message);
      job = offer;
    }

    if (!job) {
      return NextResponse.json({
        share: { jobTitle: share.jobTitleSnapshot, companyName: share.companyNameSnapshot },
        job: null,
        profileAccess,
        authenticatedRecruiter,
        talents: [],
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const { data: profiles, error: profilesError } = await db.from("Profile")
      .select("userId,firstName,lastName,headline,summary,location,targetRoles,preferredSectors,targetCities,contractPreferences,remotePreference,publicDiscoverable")
      .eq("publicDiscoverable", true)
      .neq("userId", share.userId)
      .limit(1000);
    if (profilesError) throw new Error(profilesError.message);

    const ids = Array.from(new Set((profiles || []).map((profile: any) => String(profile.userId || "")).filter(Boolean)));
    if (!ids.length) {
      return NextResponse.json({
        share: { jobTitle: share.jobTitleSnapshot, companyName: share.companyNameSnapshot },
        job: { id: job.id, title: job.title },
        profileAccess,
        authenticatedRecruiter,
        talents: [],
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const [usersResult, experiencesResult, skillsResult] = await Promise.all([
      db.from("User").select("id,role,displayName,profilePhotoUrl,profilePhotoVisibility,profilePhotoConsentAt").in("id", ids).eq("role", "TALENT"),
      db.from("Experience").select("userId,startDate").in("userId", ids),
      db.from("Skill").select("userId,name").in("userId", ids),
    ]);
    for (const result of [usersResult, experiencesResult, skillsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const talentUserIds = new Set((usersResult.data || []).map((user: any) => String(user.id)));
    const usersById = new Map((usersResult.data || []).map((user: any) => [String(user.id), user]));
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

    const scored = (profiles || []).flatMap((profile: any) => {
      const userId = String(profile.userId || "");
      if (!talentUserIds.has(userId)) return [];
      const user: any = usersById.get(userId) || {};
      const skillNames = skillsByUser.get(userId) || [];
      const score = calculateExplainableMatch({
        targetRoles: profile.targetRoles,
        targetCities: profile.targetCities,
        contractPreferences: profile.contractPreferences,
        remotePreference: profile.remotePreference,
        preferredSectors: profile.preferredSectors,
        skills: skillNames,
        experienceYears: years(experiencesByUser.get(userId) || []),
      }, job);
      if (!Number.isFinite(score) || score < 90) return [];
      return [{ userId, profile, user, score, skillNames, experienceYears: years(experiencesByUser.get(userId) || []) }];
    }).sort((a: any, b: any) => b.score - a.score || a.userId.localeCompare(b.userId)).slice(0, 5);

    // Free and anonymous viewers receive scores only. No profile identifiers or personal details are returned.
    const talents = profileAccess
      ? scored.map((item: any, index: number) => ({
          id: item.userId,
          rank: index + 1,
          name: [item.profile.firstName, item.profile.lastName].filter(Boolean).join(" ") || item.user.displayName || "Talent Jobly",
          headline: item.profile.headline || "Profil professionnel",
          location: item.profile.location || "",
          profilePhotoUrl: isProfilePhotoPublic(item.user) ? item.user.profilePhotoUrl || null : null,
          skills: item.skillNames.slice(0, 6),
          experienceYears: item.experienceYears,
          matchPercent: item.score,
        }))
      : scored.map((item: any, index: number) => ({
          rank: index + 1,
          matchPercent: item.score,
        }));

    return NextResponse.json({
      share: { jobTitle: share.jobTitleSnapshot || job.title, companyName: share.companyNameSnapshot || job.companyName || null },
      job: { id: job.id, title: job.title },
      profileAccess,
      authenticatedRecruiter,
      requiresSubscription: !profileAccess,
      talents,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de charger les talents.",
    }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}
