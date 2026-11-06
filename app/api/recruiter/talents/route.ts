import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { isEligibleSubscription } from "../../../../lib/billingLifecycleCore";
import { enforceApiRateLimit } from "../../../../lib/server-security";

type PlanCode = "FREE" | "START" | "PREMIUM" | "PRO";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const me = await ensureUser(sb, auth);
    const recruiter = await sb.from("RecruiterProfile").select("id").eq("userId", me.id).maybeSingle();
    if (recruiter.error) throw new Error(recruiter.error.message);
    if (me.role !== "RECRUITER" && me.role !== "ADMIN" && !recruiter.data) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const rateLimited = await enforceApiRateLimit(req, sb, {
      scope: "recruiter-talents",
      identity: auth.id,
      accountWindows: [{ limit: 120, windowSeconds: 60 }, { limit: 1000, windowSeconds: 3600 }],
      ipWindows: [{ limit: 240, windowSeconds: 60 }, { limit: 3000, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (rateLimited) return rateLimited;

    const profileResult = await sb.from("Profile")
      .select("userId,firstName,lastName,headline,summary,location,publicDiscoverable")
      .eq("publicDiscoverable", true)
      .limit(200);
    if (profileResult.error) throw new Error(profileResult.error.message);

    const profiles = profileResult.data || [];
    const ids = profiles.map((profile: any) => String(profile.userId)).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ count: 0, talents: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const [userResult, experienceResult, skillResult, subscriptionResult, promoResult] = await Promise.all([
      sb.from("User")
        .select("id,displayName,profilePhotoUrl,executiveSummary,portfolioBusiness,advertisingVideoUrl,advertisingVideoDurationMs,pitchVideoUrl,pitchVideoDurationMs")
        .in("id", ids),
      sb.from("Experience")
        .select("userId,title,company,startDate,endDate")
        .in("userId", ids),
      sb.from("Skill")
        .select("userId,name,level")
        .in("userId", ids),
      sb.from("Subscription")
        .select("userId,planCode,status,currentPeriodEnd,trialEndsAt,createdAt")
        .in("userId", ids)
        .in("status", ["ACTIVE", "TRIAL"])
        .order("createdAt", { ascending: false }),
      sb.from("PromoRedemption")
        .select("userid,grantedplan,producttype,startsat,endsat,revokedat")
        .in("userid", ids)
        .eq("producttype", "RECRUITER")
        .eq("grantedplan", "PRO")
        .is("revokedat", null)
        .lte("startsat", nowIso)
        .gt("endsat", nowIso),
    ]);

    for (const result of [userResult, experienceResult, skillResult, subscriptionResult, promoResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const users = new Map((userResult.data || []).map((user: any) => [user.id, user]));
    const experiences = new Map<string, any[]>();
    const skills = new Map<string, any[]>();
    const plans = new Map<string, PlanCode>();

    for (const item of experienceResult.data || []) {
      const list = experiences.get(item.userId) || [];
      list.push(item);
      experiences.set(item.userId, list);
    }
    for (const item of skillResult.data || []) {
      const list = skills.get(item.userId) || [];
      list.push(item);
      skills.set(item.userId, list);
    }

    // A valid, non-revoked promotional grant takes precedence over a paid subscription.
    for (const promo of promoResult.data || []) {
      if (promo.userid && promo.grantedplan === "PRO" && promo.producttype === "RECRUITER") {
        plans.set(String(promo.userid), "PRO");
      }
    }

    for (const subscription of subscriptionResult.data || []) {
      const userId = String(subscription.userId || "");
      if (!userId || plans.has(userId) || !isEligibleSubscription(subscription, now.getTime())) continue;
      const code = String(subscription.planCode || "").toUpperCase();
      plans.set(userId, code === "PRO" || code === "PREMIUM" || code === "START" ? code as PlanCode : "FREE");
    }

    const talents = profiles.map((profile: any) => {
      const user: any = users.get(profile.userId) || {};
      const plan = plans.get(String(profile.userId)) || "FREE";
      const isPaidMediaEligible = (plan === "PRO" || plan === "PREMIUM") && Boolean(user.advertisingVideoUrl);
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
        advertisingEligible: isPaidMediaEligible,
        portfolioBusiness: user.portfolioBusiness || {},
      };
    });

    return NextResponse.json(
      { count: talents.length, talents },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger Top Talent." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
