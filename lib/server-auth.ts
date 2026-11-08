import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/**
 * Shared server-side auth helpers for JOBLY API routes.
 *
 * Internal business records such as Profile, Experience, Skill, Education,
 * RecruiterJob, Partner, Commission and billing rows use the internal
 * "User".id. RecruiterProfile is the deliberate exception: its owner is the
 * verified Supabase Auth UID, matching its database RLS policy.
 */

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // Supabase's modern server-only secret key replaces the legacy service_role key.
  // Never prefix either privileged key with NEXT_PUBLIC_ or expose it to a client.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase serveur non configuré.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function decodeSessionId(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    const value = typeof claims.session_id === "string" ? claims.session_id : "";
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function getAuthSessionId(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return token ? decodeSessionId(token) : null;
}

function inferredDeviceLabel(userAgent: string) {
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iPhone / iPad";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os/i.test(userAgent)) return "Mac";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Navigateur Web";
}

export async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase client non configuré.");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  // Existing and newly provisioned accounts share one server-side limit.
  // The verified JWT session_id, not client-provided metadata, identifies the session.
  const sessionId = decodeSessionId(token);
  if (sessionId) {
    const service = adminClient();
    // Reconcile legacy email-only accounts before registering the device. Otherwise
    // a first authenticated request can skip the device limit because the RPC only
    // recognizes a User row already linked to this Auth UID.
    const internalUser = await ensureUser(service, data.user);
    if (internalUser?.id) {
      const requestedDeviceId = request.headers.get("x-jobly-device-id")?.trim() || `legacy-${sessionId}`;
      const deviceId = /^[A-Za-z0-9:_-]{1,160}$/.test(requestedDeviceId) ? requestedDeviceId : `legacy-${sessionId}`;
      const userAgent = request.headers.get("user-agent") || "";
      const deviceLabel = request.headers.get("x-jobly-device-name")?.trim() || inferredDeviceLabel(userAgent);
      const { data: registration, error: registrationError } = await service.rpc("register_jobly_device_session", {
        p_auth_user_id: data.user.id,
        p_auth_session_id: sessionId,
        p_device_id: deviceId,
        p_device_label: deviceLabel.slice(0, 100),
        p_user_agent: userAgent.slice(0, 1000),
      });
      if (registrationError) throw new Error("Contrôle des appareils connectés indisponible.");
      if (registration && typeof registration === "object" && (registration as { allowed?: boolean }).allowed === false) {
        return null;
      }
    }
  }
  return data.user;
}

export async function ensureUser(
  supabase: ReturnType<typeof adminClient>,
  authUser: { id: string; email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> }
) {
  const email = authUser.email?.trim().toLowerCase() || null;
  const displayName =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    null;
  const now = new Date().toISOString();

  const findByAuthId = async () => {
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("authUserId", authUser.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  };

  const findByEmail = async () => {
    if (!email) return null;
    const exact = await supabase.from("User").select("*").eq("email", email).maybeSingle();
    if (exact.error) throw new Error(exact.error.message);
    if (exact.data) return exact.data;

    // Legacy rows may preserve the casing entered before Auth normalized the email.
    const folded = await supabase.from("User").select("*").ilike("email", email).maybeSingle();
    if (folded.error) throw new Error(folded.error.message);
    return folded.data;
  };

  const linkLegacyRow = async (legacy: Record<string, any>) => {
    if (legacy.authUserId) {
      if (legacy.authUserId === authUser.id) return legacy;
      throw new Error("AUTH_USER_EMAIL_ALREADY_LINKED");
    }

    const updates: Record<string, unknown> = {
      authUserId: authUser.id,
      updatedAt: now,
    };
    if (!legacy.email && email) updates.email = email;
    if (!legacy.phone && authUser.phone) updates.phone = authUser.phone;
    if (!legacy.displayName && displayName) updates.displayName = displayName;

    const { data: linked, error: linkError } = await supabase
      .from("User")
      .update(updates)
      .eq("id", legacy.id)
      .is("authUserId", null)
      .select("*")
      .maybeSingle();

    if (linkError && linkError.code !== "23505") throw new Error(linkError.message);
    if (linked) return linked;

    // Another request may have won the same email-linking race.
    const raced = await findByAuthId();
    if (raced) return raced;
    throw new Error("AUTH_USER_EMAIL_LINK_CONFLICT");
  };

  const existing = await findByAuthId();
  if (existing) return existing;

  const legacy = await findByEmail();
  if (legacy) return linkLegacyRow(legacy);

  const { data, error } = await supabase
    .from("User")
    .insert({
      id: crypto.randomUUID(),
      authUserId: authUser.id,
      email,
      phone: authUser.phone ?? null,
      displayName,
      updatedAt: now,
    })
    .select("*")
    .single();

  if (!error) return data;

  // Idempotent retry: a parallel request may have created or linked the row.
  if (error.code === "23505") {
    const raced = await findByAuthId();
    if (raced) return raced;
    const racedLegacy = await findByEmail();
    if (racedLegacy) return linkLegacyRow(racedLegacy);
  }

  throw new Error(error.message);
}

export function cleanStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim())
    : [];
}

export function newId() {
  return crypto.randomUUID();
}



/**
 * Resolve a recruiter's profile using the Supabase Auth UID required by RLS.
 * Older application code may have stored User.id in RecruiterProfile.userId;
 * only that exact row from the already authenticated internal User is eligible
 * for a conditional relink. Existing profile content and id are preserved.
 */
export async function getRecruiterProfileForAuthUser(
  supabase: ReturnType<typeof adminClient>,
  authUserId: string,
  internalUserId?: string | null,
) {
  const findByAuthUid = async () => {
    const { data, error } = await supabase
      .from("RecruiterProfile")
      .select("*")
      .eq("userId", authUserId)
      .maybeSingle();
    if (error) throw new Error("RECRUITER_PROFILE_LOOKUP_FAILED: " + error.message);
    return data;
  };

  const current = await findByAuthUid();
  if (current) return current;

  if (
    internalUserId &&
    internalUserId !== authUserId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(internalUserId)
  ) {
    const { data: legacy, error: legacyError } = await supabase
      .from("RecruiterProfile")
      .select("*")
      .eq("userId", internalUserId)
      .maybeSingle();
    if (legacyError) throw new Error("RECRUITER_PROFILE_LEGACY_LOOKUP_FAILED: " + legacyError.message);

    if (legacy) {
      const { data: linked, error: linkError } = await supabase
        .from("RecruiterProfile")
        .update({ userId: authUserId, updatedAt: new Date().toISOString() })
        .eq("id", legacy.id)
        .eq("userId", internalUserId)
        .select("*")
        .maybeSingle();

      if (linkError) {
        const raced = await findByAuthUid();
        if (raced) return raced;
        throw new Error("RECRUITER_PROFILE_LINK_FAILED: " + linkError.message);
      }
      if (linked) return linked;

      // Another request may have completed the same relink first.
      const raced = await findByAuthUid();
      if (raced) return raced;
      throw new Error("RECRUITER_PROFILE_LINK_CONFLICT");
    }
  }

  return null;
}

export async function ensureRecruiterProfileForAuthUser(
  supabase: ReturnType<typeof adminClient>,
  authUserId: string,
  internalUserId: string,
) {
  const existing = await getRecruiterProfileForAuthUser(supabase, authUserId, internalUserId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("RecruiterProfile")
    .insert({
      id: crypto.randomUUID(),
      userId: authUserId,
      companyName: "Mon entreprise",
      updatedAt: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    const raced = await getRecruiterProfileForAuthUser(supabase, authUserId, internalUserId);
    if (raced) return raced;
    throw new Error("RECRUITER_PROFILE_CREATE_FAILED: " + error.message);
  }
  return data;
}

export type BillingProductType = "TALENT" | "RECRUITER";

/**
 * An account may carry both a Talent profile and a Recruiter profile.
 * RecruiterProfile and billing rows are both tied to the internal User.id.
  */
export async function resolveBillingProductType(
  supabase: ReturnType<typeof adminClient>,
  internalUser: { id?: string; role?: string },
  authUserId: string,
  requested?: unknown,
): Promise<BillingProductType> {
  const requestedValue = String(requested || "").trim().toUpperCase();
  const productType: BillingProductType = requestedValue
    ? requestedValue as BillingProductType
    : internalUser.role === "RECRUITER" ? "RECRUITER" : "TALENT";

  if (productType !== "TALENT" && productType !== "RECRUITER") {
    throw new Error("INVALID_PRODUCT_TYPE");
  }

  // RecruiterProfile is owned by the Supabase Auth UID; billing rows remain
  // owned by the internal User.id.
  if (productType === "RECRUITER") {
    const profile = await getRecruiterProfileForAuthUser(supabase, authUserId, internalUser.id);
    if (!profile) throw new Error("RECRUITER_PROFILE_REQUIRED");
  }

  return productType;
}
