import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "./server-auth";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const STATE_TTL_SECONDS = 10 * 60;

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante côté serveur.");
  return crypto.createHash("sha256").update(`jobly-candidate-gmail:${value}`).digest();
}

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credentials Google serveur manquantes.");
  return { clientId, clientSecret };
}

export function publicUrl(request?: NextRequest) {
  const configured = process.env.JOBLY_PUBLIC_URL || process.env.NEXT_PUBLIC_JOBLY_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  throw new Error("JOBLY_PUBLIC_URL manquante.");
}

export function callbackUrl(request?: NextRequest) {
  return `${publicUrl(request)}/api/talent/gmail/callback`;
}

export async function candidateContext(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return null;
  const supabase = adminClient();
  const user = await ensureUser(supabase, authUser);
  return { authUser, supabase, user };
}

export function createOAuthState(userId: string) {
  const payload = `${userId}.${Date.now()}`;
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}

export function verifyOAuthState(state: string) {
  const decoded = Buffer.from(state, "base64url").toString("utf8");
  const [userId, issuedRaw, signature] = decoded.split(".");
  if (!userId || !issuedRaw || !signature) throw new Error("État OAuth invalide.");
  const issued = Number(issuedRaw);
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > STATE_TTL_SECONDS * 1000) throw new Error("État OAuth expiré.");
  const payload = `${userId}.${issuedRaw}`;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("Signature OAuth invalide.");
  return userId;
}

export function googleAuthorizationUrl(request: NextRequest, userId: string) {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: `openid email profile ${GMAIL_SCOPE}`,
    state: createOAuthState(userId),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string, request: NextRequest) {
  const { clientId, clientSecret } = credentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl(request),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) throw new Error(`Google OAuth token error (${response.status}).`);
  return json as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
}

export async function gmailProfile(accessToken: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.emailAddress) throw new Error("Impossible de vérifier le compte Gmail.");
  return { email: String(json.emailAddress) };
}

export function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptToken(value: string) {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Jeton Gmail chiffré invalide.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export { GMAIL_SCOPE };
