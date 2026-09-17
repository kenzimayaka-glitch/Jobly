import type { SupabaseClient } from "@supabase/supabase-js";
import { getDistributorCommission } from "./distributor";

type SubscriptionLike = {
  id: string;
  userId: string;
  planCode: string;
  billingInterval?: string | null;
  productType?: string | null;
};

/**
 * Creates the one-time acquisition commission for a Distributor after a
 * confirmed paid Recruiter subscription. Idempotency is enforced in the DB
 * by Commission_partner_referred_acquisition_key.
 */
export async function generateDistributorAcquisitionCommission(
  supabase: SupabaseClient,
  subscription: SubscriptionLike,
) {
  if (String(subscription.productType || "").toUpperCase() !== "RECRUITER") return null;

  const amount = getDistributorCommission(subscription.planCode);
  if (!amount) return null;

  const { data: referral, error: referralError } = await supabase
    .from("PartnerReferral")
    .select("partnerId, referredUserId, accountType")
    .eq("referredUserId", subscription.userId)
    .eq("accountType", "RECRUITER")
    .maybeSingle();
  if (referralError) throw new Error(referralError.message);
  if (!referral) return null;

  const { data: partner, error: partnerError } = await supabase
    .from("Partner")
    .select("id, partnerType")
    .eq("id", referral.partnerId)
    .eq("partnerType", "DISTRIBUTOR")
    .maybeSingle();
  if (partnerError) throw new Error(partnerError.message);
  if (!partner) return null;

  const { data: existing, error: existingError } = await supabase
    .from("Commission")
    .select("*")
    .eq("partnerId", partner.id)
    .eq("referredUserId", subscription.userId)
    .eq("sourceType", "ACQUISITION")
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const { data: commission, error: insertError } = await supabase
    .from("Commission")
    .insert({
      partnerId: partner.id,
      event: `DISTRIBUTOR_ACQUISITION_${subscription.planCode}`,
      amount,
      currency: "XAF",
      status: "GENERATED",
      sourceType: "ACQUISITION",
      accountType: "RECRUITER",
      planCode: subscription.planCode,
      billingInterval: subscription.billingInterval ?? null,
      subscriptionId: subscription.id,
      referredUserId: subscription.userId,
    })
    .select("*")
    .single();

  if (!insertError) return commission;

  // A concurrent successful-payment verification may have created it first.
  if (insertError.code === "23505") {
    const { data: concurrent } = await supabase
      .from("Commission")
      .select("*")
      .eq("partnerId", partner.id)
      .eq("referredUserId", subscription.userId)
      .eq("sourceType", "ACQUISITION")
      .maybeSingle();
    if (concurrent) return concurrent;
  }

  throw new Error(insertError.message);
}
