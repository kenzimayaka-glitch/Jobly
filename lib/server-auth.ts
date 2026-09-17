import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

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

export async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase client non configuré.");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
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
