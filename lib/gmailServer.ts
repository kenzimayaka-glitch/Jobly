import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "./server-auth";
import { getActivePlanCode } from "./entitlements";
import type { NextRequest } from "next/server";

function encryptionKey() {
  const root = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!root) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante côté serveur.");
  return crypto.createHash("sha256").update(`jobly-gmail:${root}`).digest();
}

export function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptToken(value: string) {
  const [ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Jeton Gmail chiffré invalide.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

const RECRUITER_GMAIL_PLANS = new Set(["PREMIUM", "PRO"]);

export function hasRecruiterGmailEntitlement(plan: string): boolean {
  return RECRUITER_GMAIL_PLANS.has(String(plan || "").toUpperCase());
}

export async function recruiterContext(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return null;
  const supabase = adminClient();
  const user = await ensureUser(supabase, authUser);
  if (!["RECRUITER", "ADMIN"].includes(String(user.role).toUpperCase())) {
    const byInternalId = await supabase.from("RecruiterProfile").select("id").eq("userId", user.id).maybeSingle();
    if (byInternalId.error) throw new Error(byInternalId.error.message);
    let profile = byInternalId.data;
    if (!profile && authUser.id !== user.id) {
      const byAuthId = await supabase.from("RecruiterProfile").select("id").eq("userId", authUser.id).maybeSingle();
      if (byAuthId.error) throw new Error(byAuthId.error.message);
      profile = byAuthId.data;
    }
    if (!profile) throw new Error("Cette connexion Gmail est réservée à l’espace recruteur.");
  }
  return { authUser, supabase, user };
}

async function assertRecruiterGmailEntitlement(context: { supabase: ReturnType<typeof adminClient>; user: { id: string; role?: string } }) {
  if (String(context.user.role || "").toUpperCase() === "ADMIN") return;
  const plan = await getActivePlanCode(context.supabase, context.user.id, "RECRUITER");
  if (!hasRecruiterGmailEntitlement(plan)) {
    throw new Error("La connexion Gmail recruteur est incluse à partir de Premium.");
  }
}

export async function saveGmailTokens(req: NextRequest, payload: { email: string; accessToken?: string | null; refreshToken?: string | null; scopes?: string[] }) {
  const context = await recruiterContext(req);
  if (!context) throw new Error("Session Jobly requise.");
  await assertRecruiterGmailEntitlement(context);
  const now = new Date();
  const { supabase, user } = context;
  const record = {
    recruiterUserId: user.id,
    googleEmail: payload.email,
    encryptedAccessToken: payload.accessToken ? encryptToken(payload.accessToken) : null,
    encryptedRefreshToken: payload.refreshToken ? encryptToken(payload.refreshToken) : null,
    accessTokenExpiresAt: payload.accessToken ? new Date(now.getTime() + 55 * 60 * 1000).toISOString() : null,
    scopes: payload.scopes || [],
    updatedAt: now.toISOString(),
  };
  const { error } = await supabase.from("RecruiterGmailConnection").upsert(record, { onConflict: "recruiterUserId" });
  if (error) throw new Error(error.message);
  return { connected: true, email: payload.email, connectedAt: now.toISOString() };
}

function googleClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Credentials Google serveur manquantes (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).");
  return { clientId, clientSecret };
}

export async function getGmailAccessToken(req: NextRequest) {
  const context = await recruiterContext(req);
  if (!context) throw new Error("Session Jobly requise.");
  await assertRecruiterGmailEntitlement(context);
  const { data: connection, error } = await context.supabase.from("RecruiterGmailConnection").select("*").eq("recruiterUserId", context.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!connection?.encryptedAccessToken) throw new Error("Gmail n'est pas connecté.");

  const expiresAt = connection.accessTokenExpiresAt ? new Date(connection.accessTokenExpiresAt).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return { token: decryptToken(connection.encryptedAccessToken), context };
  if (!connection.encryptedRefreshToken) throw new Error("La session Gmail a expiré. Reconnecte Gmail.");

  const { clientId, clientSecret } = googleClientCredentials();
  const refreshToken = decryptToken(connection.encryptedRefreshToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const refreshed = await response.json();
  if (!response.ok || !refreshed.access_token) throw new Error("Impossible de renouveler l'accès Gmail. Reconnecte Gmail.");

  await context.supabase.from("RecruiterGmailConnection").update({
    encryptedAccessToken: encryptToken(refreshed.access_token),
    accessTokenExpiresAt: new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }).eq("recruiterUserId", context.user.id);
  return { token: refreshed.access_token as string, context };
}

export function gmailRawMessage({ to, subject, body }: { to: string; subject: string; body: string }) {
  return Buffer.from([
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n"), "utf8").toString("base64url");
}
