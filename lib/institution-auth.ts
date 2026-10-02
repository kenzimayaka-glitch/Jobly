import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "./server-auth";

const COOKIE = "jobly_institution_session";
const SESSION_DAYS = 7;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string, salt: string) {
  return new Promise<string>((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex"));
    })
  );
}

export async function verifyInstitutionPassword(password: string, salt: string, expected: string) {
  const actual = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export async function createInstitutionSession(accessId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = adminClient();
  const { error } = await db.from("InstitutionSession").insert({
    id: crypto.randomUUID(),
    accessId,
    tokenHash: hashToken(token),
    expiresAt: expiresAt.toISOString(),
  });
  if (error) throw new Error(error.message);
  return { token, expiresAt };
}

export async function getInstitutionSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const db = adminClient();
  const { data, error } = await db
    .from("InstitutionSession")
    .select("id, accessId, expiresAt, revokedAt, InstitutionAccess(id, institutionId, login, active, Institution(id, name, city, type, active))")
    .eq("tokenHash", hashToken(token))
    .maybeSingle();
  if (error || !data || data.revokedAt || new Date(data.expiresAt) <= new Date()) return null;
  const access = Array.isArray(data.InstitutionAccess) ? data.InstitutionAccess[0] : data.InstitutionAccess;
  if (!access?.active || !access.Institution?.active) return null;
  return { sessionId: data.id, accessId: data.accessId, institution: access.Institution, login: access.login };
}

export function setInstitutionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearInstitutionCookie(response: NextResponse) {
  response.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export { hashPassword };
