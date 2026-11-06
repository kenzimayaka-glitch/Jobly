import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { verifyAndroidRequestSignature } from "@/lib/android-key-attestation";

/**
 * Shared server-side auth helpers for JOBLY API routes.
 *
 * Mirrors the pattern already proven in app/api/profile/route.ts: every
 * internal table (Profile, Experience, Skill, Education — and now
 * RecruiterProfile/RecruiterJob/Partner/Commission) is owned by the internal
 * "User".id, never by the raw Supabase auth uid directly. This is what lets
 * one JOBLY account carry a Talent profile, a Recruiter profile and a Partner
 * profile at the same time without collision.
 */

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase serveur non configuré.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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
    const { data: internalUser, error: userError } = await service
      .from("User")
      .select("id")
      .eq("authUserId", data.user.id)
      .maybeSingle();
    if (userError) throw new Error("Vérification du compte Jobly impossible.");
    if (internalUser?.id) {
      const userAgent = request.headers.get("user-agent") || "";
      const pathname = new URL(request.url).pathname;
      const isNativeAndroidWebView = /android/i.test(userAgent) && /\bwv\b/i.test(userAgent);
      const isAttestationBootstrap = pathname.startsWith("/api/android/attestation/");
      let requestedDeviceId = request.headers.get("x-jobly-device-id")?.trim() || "";
      if (!requestedDeviceId && isNativeAndroidWebView) {
        const { data: currentDeviceSession, error: deviceSessionError } = await service
          .from("UserDeviceSession")
          .select("deviceId")
          .eq("userId", internalUser.id)
          .eq("authSessionId", sessionId)
          .is("revokedAt", null)
          .maybeSingle();
        if (deviceSessionError) throw new Error("Vérification de l'appareil Android impossible.");
        requestedDeviceId = currentDeviceSession?.deviceId || "";
      }
      if (!requestedDeviceId) requestedDeviceId = `legacy-${sessionId}`;
      const deviceId = /^[A-Za-z0-9:_-]{1,160}$/.test(requestedDeviceId) ? requestedDeviceId : `legacy-${sessionId}`;
      if (isNativeAndroidWebView && !isAttestationBootstrap) {
        const { data: attestation, error: attestationError } = await service
          .from("AndroidDeviceAttestation")
          .select("id,publicKeyPem")
          .eq("userId", internalUser.id)
          .eq("deviceId", deviceId)
          .is("revokedAt", null)
          .gt("expiresAt", new Date().toISOString())
          .maybeSingle();
        if (attestationError) throw new Error("Contrôle d'intégrité Android indisponible.");
        if (!attestation?.publicKeyPem) return null;

        const proofId = request.headers.get("x-jobly-attestation-challenge") || "";
        const proofTimestamp = request.headers.get("x-jobly-attestation-timestamp") || "";
        const proofSignature = request.headers.get("x-jobly-attestation-signature") || "";
        const timestampNumber = Number(proofTimestamp);
        if (!/^[0-9a-f-]{36}$/i.test(proofId) || !/^\\d{13}$/.test(proofTimestamp) ||
            !Number.isSafeInteger(timestampNumber) || Math.abs(Date.now() - timestampNumber) > 30_000) {
          return null;
        }

        const requestBody = Buffer.from(await request.clone().arrayBuffer());
        if (requestBody.byteLength > 4 * 1024 * 1024) return null;
        const bodyHash = crypto.createHash("sha256").update(requestBody).digest("hex");
        const requestPath = new URL(request.url);
        const canonical = [
          request.method.toUpperCase(),
          requestPath.pathname + requestPath.search,
          proofTimestamp,
          proofId,
          bodyHash,
        ].join("\\n");

        const { data: proof, error: proofError } = await service
          .from("AndroidAttestationChallenge")
          .update({ usedAt: new Date().toISOString() })
          .eq("id", proofId)
          .eq("userId", internalUser.id)
          .eq("deviceId", deviceId)
          .eq("purpose", "REQUEST")
          .is("usedAt", null)
          .gt("expiresAt", new Date().toISOString())
          .select("challengeHash")
          .maybeSingle();
        if (proofError) throw new Error("Contrôle de preuve Android indisponible.");
        const expectedHash = crypto.createHash("sha256").update(canonical).digest("hex");
        if (!proof?.challengeHash || proof.challengeHash !== expectedHash) return null;
        if (!verifyAndroidRequestSignature({
          publicKeyPem: attestation.publicKeyPem,
          payload: canonical,
          signature: proofSignature,
        })) return null;
      }
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
  const { data: existing, error: lookupError } = await supabase
    .from("User")
    .select("*")
    .eq("authUserId", authUser.id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return existing;

  const displayName =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("User")
    .insert({
      id: crypto.randomUUID(),
      authUserId: authUser.id,
      email: authUser.email ?? null,
      phone: authUser.phone ?? null,
      displayName,
      updatedAt: now,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export function cleanStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim())
    : [];
}

export function newId() {
  return crypto.randomUUID();
}


export type BillingProductType = "TALENT" | "RECRUITER";

/**
 * An account may carry both a Talent profile and a Recruiter profile.
 * Recruiter ownership is tied to the Supabase Auth UID (RecruiterProfile.userId),
 * whereas billing rows are tied to the internal User.id.
 */
export async function resolveBillingProductType(
  supabase: ReturnType<typeof adminClient>,
  internalUser: { role?: string },
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

  if (productType === "RECRUITER") {
    const { data, error } = await supabase
      .from("RecruiterProfile")
      .select("id")
      .eq("userId", authUserId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("RECRUITER_PROFILE_LOOKUP_FAILED: " + error.message);
    if (!data) throw new Error("RECRUITER_PROFILE_REQUIRED");
  }

  return productType;
}
