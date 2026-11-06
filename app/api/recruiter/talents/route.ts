import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { isEligibleSubscription } from "../../../../lib/billingLifecycleCore";
import { enforceApiRateLimit } from "../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
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
      const legacyRecruiter = await supabase
        .from("RecruiterProfile")
        .select("id")
        .eq("userId", auth.id)
        .maybeSingle();
      if (legacyRecruiter.error) throw new Error(legacyRecruiter.error.message);
      recruiterProfile = legacyRecruiter.data;
    }

    if (me.role !== "RECRUITER" && me.role !== "ADMIN" && !recruiterProfile) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const rateLimited = await enforceApiRateLimit(req, supabase, {
      scope: "recruiter-talents",
      identity: me.id,
      accountWindows: [
        { limit: 60, windowSeconds: 60 },
        { limit: 600, windowSeconds: 3600 },
      ],
      ipWindows: [
        { limit: 120, windowSeconds: 60 },
        { limit: 1200, windowSeconds: 3600 },
      ],
      requireIp: true,
    });
    if (rateLimited) return rateLimited;

    const profiles = await supabase
      .from("Profile")
      .select("userId,firstName,lastName,headline,summary,location,publicDiscoverable")
      .eq("publicDiscoverable", true)
      .limit(200);
    if (profiles.error) throw new Error(profiles.error.message);

    const ids = (profiles.data || []).map((profile: any) => profile.userId);
    if (!ids.length) return NextResponse.json({ count: 0, talents: [] });

    const now = new Date();
    const nowIso = now.toISOString();
    const [usersResult, experienceResult, skillsResult, subscriptionResult, promoResult] = await Promise.all([
      supabase.from("User")
        .select("id,displayName,profilePhotoUrl,executiveSummary,portfolioBusiness,advertisingVideoUrl,advertisingVideoDurationMs,pitchVideoUrl,pitchVideoDurationMs")
        .in("id", ids),
      supabase.from("Experience")
        .select("userId,title,company,startDate,endDate")
        .in("userId", ids),
      supabase.from("Skill")
        .select("userId,name,level")
        .in("userId", ids),
      supabase.from("Subscription")
        .select("userId,planCode,status,currentPeriodEnd,trialEndsAt,createdAt")
        .in("userId", ids)
        .in("status", ["ACTIVE", "TRIAL"])
        .order("createdAt", { ascending: false })
        .limit(ids.length * 10),
      supabase.from("PromoRedemption")
        .select("userid,grantedplan")
        .in("userid", ids)
        .eq("producttype", "TALENT")
        .eq("grantedplan", "PRO")
        .is("revokedat", null)
        .lte("startsat", nowIso)
        .gt("endsat", nowIso),
    ]);

    for (const result of [usersResult, experienceResult, skillsResult, subscriptionResult, promoResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const users = new Map((usersResult.data || []).map((user: any) => [user.id, user]));
    const experiences = new Map<string, any[]>();
    const skills = new Map<string, any[]>();
    const plans = new Map<string, string>();

    for (const item of experienceResult.data || []) {
      (experiences.get(item.userId) || experiences.set(item.userId, []).get(item.userId)!).push(item);
    }
    for (const item of skillsResult.data || []) {
      (skills.get(item.userId) || skills.set(item.userId, []).get(item.userId)!).push(item);
    }

    // Resolve only entitlements that are actually active now; a stale ACTIVE
    // status alone must never preserve Premium/Pro visibility after expiry.
    for (const subscription of subscriptionResult.data || []) {
      if (plans.has(subscription.userId)) continue;
      if (!isEligibleSubscription(subscription, now.getTime())) continue;
      const plan = String(subscription.planCode || "FREE").toUpperCase();
      if (["FREE", "START", "PREMIUM", "PRO"].includes(plan)) plans.set(subscription.userId, plan);
    }

    // Active PRO promotions have the same precedence as the canonical resolver.
    for (const promo of promoResult.data || []) {
      if (typeof promo.userid === "string") plans.set(promo.userid, "PRO");
    }

    const talents = (profiles.data || []).map((profile: any) => {
      const user = users.get(profile.userId) || {};
      const plan = plans.get(profile.userId) || "FREE";
      const isPaidMediaEligible = plan === "PREMIUM" || plan === "PRO";

      return {
        userId: profile.userId,
        name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user.displayName || "Talent Jobly",
        headline: profile.headline || "Profil professionnel",
        summary: profile.summary || user.executiveSummary || "",
        location: profile.location || null,
        photoUrl: user.profilePhotoUrl || null,
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

    return NextResponse.json({ count: talents.length, talents });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de charger Top Talent.",
    }, { status: 500 });
  }
}
