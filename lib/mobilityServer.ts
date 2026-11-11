import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureUser as ensureCanonicalUser } from "./server-auth";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase serveur non configuré.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function authUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase client non configuré.");
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export async function ensureUser(
  sb: ReturnType<typeof adminClient>,
  au: { id: string; email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> },
) {
  return ensureCanonicalUser(sb, au);
}

export async function requirePremium(request: NextRequest) {
  const au = await authUser(request);
  if (!au) return { error: "Session requise.", status: 401 as const };
  const sb = adminClient();
  const user = await ensureUser(sb, au);
  const { data: subscriptions, error } = await sb.from("Subscription")
    .select("planCode,status,currentPeriodEnd,trialEndsAt")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })
    .limit(1);
  if (error) throw new Error("SUBSCRIPTION_LOOKUP_FAILED: " + error.message);

  const subscription = subscriptions?.[0];
  const allowedPlans = new Set(["START", "PREMIUM", "PRO"]);
  const planCode = String(subscription?.planCode || "").toUpperCase();
  const status = String(subscription?.status || "").toUpperCase();
  const now = Date.now();
  const currentPeriodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : null;
  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).getTime() : null;
  const periodValid = currentPeriodEnd === null || (Number.isFinite(currentPeriodEnd) && currentPeriodEnd > now);
  const trialValid = status !== "TRIALING" || (trialEndsAt !== null && Number.isFinite(trialEndsAt) && trialEndsAt > now);
  const active = !!subscription && allowedPlans.has(planCode)
    && ["ACTIVE", "TRIALING"].includes(status) && periodValid && trialValid;

  if (!active) {
    return { error: "Mobility nécessite un pack START, PREMIUM ou PRO actif.", status: 403 as const };
  }
  return { user, sb };
}

export function requireRole(user: any, roles: string[]) {
  if (!roles.includes(String(user?.role || "").toUpperCase())) {
    return { error: "Accès non autorisé.", status: 403 as const };
  }
  return null;
}
