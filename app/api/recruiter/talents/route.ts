import { NextRequest, NextResponse } from "next/server";
import { isEligibleSubscription } from "../../../../lib/billingLifecycleCore";
import { enforceApiRateLimit } from "../../../../lib/apiRateLimit";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { isProfilePhotoPublic } from "../../../../lib/profilePhotoStorage";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const me = await ensureUser(sb, auth);
    const recruiter = await sb.from("RecruiterProfile").select("id").eq("userId", auth.id).maybeSingle();
    if (recruiter.error) throw new Error(recruiter.error.message);
    if (me.role !== "RECRUITER" && me.role !== "ADMIN" && !recruiter.data) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const rateLimited = await enforceApiRateLimit(sb, req, {
      scope: "recruiter-talents",
      identity: auth.id,
      accountWindows: [
        { windowSeconds: 60, maxRequests: 60 },
        { windowSeconds: 3600, maxRequests: 600 },
      ],
      ipWindows: [
        { windowSeconds: 60, maxRequests: 120 },
        { windowSeconds: 3600, maxRequests: 1200 },
      ],
      requireIp: true,
    });
    if (rateLimited) return rateLimited;

    const profilesResult = await sb
      .from("Profile")
      .select("userId,firstName,lastName,headline,summary,location,publicDiscoverable")
      .eq("publicDiscoverable", true)
      .limit(200);
    if (profilesResult.error) throw new Error(profilesResult.error.message);

    const profiles = profilesResult.data || [];
    const ids = profiles.map((profile: any) => profile.userId);
    if (!ids.length) return NextResponse.json({ count: 0, talents: [] });

    const now = new Date();
    const nowIso = now.toISOString();
    const [usersResult, experiencesResult, skillsResult, subscriptionsResult, promosResult] = await Promise.all([
      sb.from("User")
        .select("id,displayName,profilePhotoUrl,profilePhotoStoragePath,profilePhotoVisibility,profilePhotoConsentAt,executiveSummary,portfolioBusiness,advertisingVideoUrl,advertisingVideoDurationMs,pitchVideoUrl,pitchVideoDurationMs")
        .in("id", ids),
      sb.from("Experience").select("userId,title,company,startDate,endDate").in("userId", ids),
      sb.from("Skill").select("userId,name,level").in("userId", ids),
      sb.from("Subscription")
        .select("userId,planCode,status,currentPeriodEnd,trialEndsAt,trialStartedAt,createdAt")
        .eq("productType", "TALENT")
        .in("status", ["ACTIVE", "TRIAL"])
        .in("userId", ids)
        .order("createdAt", { ascending: false }),
      sb.from("PromoRedemption")
        .select("userid,grantedplan,producttype,startsat,endsat,revokedat")
        .in("userid", ids)
        .eq("producttype", "TALENT")
        .is("revokedat", null)
        .lte("startsat", nowIso)
        .gt("endsat", nowIso)
        .order("endsat", { ascending: false }),
    ]);

    for (const result of [usersResult, experiencesResult, skillsResult, subscriptionsResult, promosResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const users = new Map((usersResult.data || []).map((user: any) => [user.id, user]));
    const experiences = new Map<string, any[]>();
    const skills = new Map<string, any[]>();
    const subscriptions = new Map<string, any>();
    const promos = new Map<string, any>();

    for (const experience of experiencesResult.data || []) {
      const list = experiences.get(experience.userId) || [];
      list.push(experience);
      experiences.set(experience.userId, list);
    }
    for (const skill of skillsResult.data || []) {
      const list = skills.get(skill.userId) || [];
      list.push(skill);
      skills.set(skill.userId, list);
    }
    for (const subscription of subscriptionsResult.data || []) {
      if (!subscriptions.has(subscription.userId) && isEligibleSubscription(subscription, now.getTime())) {
        subscriptions.set(subscription.userId, subscription);
      }
    }
    for (const promo of promosResult.data || []) {
      if (!promos.has(promo.userid) && promo.grantedplan === "PRO") promos.set(promo.userid, promo);
    }

    const talents = profiles.map((profile: any) => {
      const user: any = users.get(profile.userId) || {};
      const subscription = subscriptions.get(profile.userId) || null;
      const promo = promos.get(profile.userId) || null;
      const plan = promo?.grantedplan === "PRO" ? "PRO" : subscription?.planCode || "FREE";
      const isPaidMediaEligible = plan === "PREMIUM" || plan === "PRO";

      return {
        userId: profile.userId,
        name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user.displayName || "Talent Jobly",
        headline: profile.headline || "Profil professionnel",
        summary: profile.summary || user.executiveSummary || "",
        location: profile.location || null,
        photoUrl: isProfilePhotoPublic(user) ? (user.profilePhotoUrl || null) : null,
        plan,
        topSkills: (skills.get(profile.userId) || []).slice(0, 6),
        experiences: (experiences.get(profile.userId) || []).slice(0, 6),
        pitchVideoUrl: user.pitchVideoUrl || null,
        pitchVideoDurationMs: user.pitchVideoDurationMs || null,
        advertisingVideoUrl: user.advertisingVideoUrl || null,
        advertisingVideoDurationMs: user.advertisingVideoDurationMs || null,
        advertisingEligible: isPaidMediaEligible && Boolean(user.advertisingVideoUrl),
        portfolioBusiness: user.portfolioBusiness || {},
      };
    });

    return NextResponse.json({ count: talents.length, talents }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger Top Talent." },
      { status: Number.isInteger((error as any)?.status) ? (error as any).status : 500 },
    );
  }
}
