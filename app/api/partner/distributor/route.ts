import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { isEligibleSubscription } from "../../../../lib/billingLifecycleCore";
import { enforceApiRateLimit } from "../../../../lib/server-security";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const rateLimited = await enforceApiRateLimit(request, sb, {
      scope: "partner-distributor-dashboard",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 600, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (rateLimited) return rateLimited;
    const { data: partner, error: partnerError } = await sb
      .from("Partner")
      .select("id,referralCode,partnerType,kycStatus,agreementId")
      .eq("userId", user.id)
      .maybeSingle();
    if (partnerError) throw new Error(partnerError.message);
    if (!partner || partner.partnerType !== "DISTRIBUTOR") {
      return NextResponse.json({ message: "Compte Distributor requis." }, { status: 403 });
    }

    const { data: referrals, error: referralsError } = await sb
      .from("PartnerReferral")
      .select("referredUserId,createdAt,accountType")
      .eq("partnerId", partner.id)
      .eq("accountType", "RECRUITER")
      .order("createdAt", { ascending: false });
    if (referralsError) throw new Error(referralsError.message);

    const referredIds = (referrals || []).map((r) => r.referredUserId);
    let subscriptions: any[] = [];
    if (referredIds.length) {
      const { data, error } = await sb
        .from("Subscription")
        .select("id,userId,planCode,status,priceAmount,priceCurrency,billingInterval,currentPeriodEnd,trialEndsAt,createdAt")
        .in("userId", referredIds)
        .eq("productType", "RECRUITER");
      if (error) throw new Error(error.message);
      subscriptions = data || [];
    }

    const { data: commissions, error: commissionsError } = await sb
      .from("Commission")
      .select("id,event,amount,currency,status,planCode,subscriptionId,referredUserId,createdAt,paidAt")
      .eq("partnerId", partner.id)
      .eq("sourceType", "ACQUISITION")
      .order("createdAt", { ascending: false });
    if (commissionsError) throw new Error(commissionsError.message);

    const activeSubscriptions = subscriptions.filter((subscription) => isEligibleSubscription(subscription, Date.now()));
    const paidCompanies = new Set(
      activeSubscriptions
        .filter((s) => ["PREMIUM", "PRO"].includes(String(s.planCode).toUpperCase()))
        .map((s) => s.userId),
    );
    const premium = new Set(
      activeSubscriptions.filter((s) => String(s.planCode).toUpperCase() === "PREMIUM").map((s) => s.userId),
    ).size;
    const pro = new Set(
      activeSubscriptions.filter((s) => String(s.planCode).toUpperCase() === "PRO").map((s) => s.userId),
    ).size;
    const totalCompanies = new Set(referredIds).size;
    const conversion = totalCompanies ? Math.round((paidCompanies.size / totalCompanies) * 1000) / 10 : 0;
    const totals = (commissions || []).reduce(
      (acc, c) => {
        if (c.status === "PAID") acc.paid += Number(c.amount || 0);
        else if (["PAYABLE", "PAYMENT_EXECUTED"].includes(c.status)) acc.payable += Number(c.amount || 0);
        else acc.pending += Number(c.amount || 0);
        acc.generated += Number(c.amount || 0);
        return acc;
      },
      { generated: 0, pending: 0, payable: 0, paid: 0 },
    );

    return NextResponse.json({
      partnerType: "DISTRIBUTOR",
      referralCode: partner.referralCode,
      kycStatus: partner.kycStatus,
      agreementId: partner.agreementId,
      commissionRules: { FREE: 0, START: 0, PREMIUM: 5000, PRO: 10000 },
      monthlyObjective: null,
      stats: {
        prospects: totalCompanies,
        companiesRecruited: totalCompanies,
        premium,
        pro,
        conversion,
        commissions: totals,
      },
      companies: referrals || [],
      commissionHistory: commissions || [],
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger le dashboard Distributor." },
      { status: 500 },
    );
  }
}
