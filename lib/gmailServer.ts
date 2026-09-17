import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "./server-auth";
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

export async function recruiterContext(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return null;
  const supabase = adminClient();
  const user = await ensureUser(supabase, authUser);
  return { authUser, supabase, user };
}

export async function saveGmailTokens(req: NextRequest, payload: {
  email: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  scopes?: string[];
}) {
  const context = await recruiterContext(req);
  if (!context) throw new Error("Session Jobly requise.");
  const now = new Date();
  const { supabase, user } = context;
  const record = {
    "recruiterUserId": user.id,
    "googleEmail": payload.email,
    "encryptedAccessToken": payload.accessToken ? encryptToken(payload.accessToken) : null,
    "encryptedRefreshToken": payload.refreshToken ? encryptToken(payload.refreshToken) : null,
    "accessTokenExpiresAt": payload.accessToken ? new Date(now.getTime() + 55 * 60 * 1000).toISOString() : null,
    scopes: payload.scopes || [],
    "updatedAt": now.toISOString(),
  };
  const { error } = await supabase.from("RecruiterGmailConnection").upsert(record, { onConflict: "recruiterUserId" });
  if (error) throw new Error(error.message);
  return { connected: true, email: payload.email, connectedAt: now.toISOString() };
}
