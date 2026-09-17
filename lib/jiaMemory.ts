import { NextRequest } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "./server-auth";

export const JIA_EVENT_TYPES = [
  "SESSION_START",
  "SESSION_END",
  "PAGE_VIEW",
  "JOB_VIEW",
  "JOB_SAVE",
  "JOB_APPLY_START",
  "JOB_APPLY_COMPLETE",
  "AI_INTERACTION",
  "SEARCH",
  "LEARNING_ACTIVITY",
  "PROFILE_UPDATE",
  "NOTIFICATION_OPEN",
] as const;

export type JiaEventType = (typeof JIA_EVENT_TYPES)[number];

export function safeJiaMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of entries) {
    if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(key)) continue;
    if (typeof raw === "string") out[key] = raw.slice(0, 300);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean" || raw === null) out[key] = raw;
  }
  return out;
}

export async function recordJiaEvent(
  req: NextRequest,
  payload: { eventType: string; sessionId?: string; path?: string; durationMs?: number; metadata?: unknown }
) {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false as const, status: 401, message: "Session requise." };
  const sb = adminClient();
  const user = await ensureUser(sb, auth);
  const privacyAccepted = Boolean(user.privacyAcceptedAt);
  if (!privacyAccepted) return { ok: true as const, recorded: false, reason: "PRIVACY_NOT_ACCEPTED" };

  if (!JIA_EVENT_TYPES.includes(payload.eventType as JiaEventType)) {
    return { ok: false as const, status: 400, message: "Événement J’IA inconnu." };
  }

  const eventType = payload.eventType as JiaEventType;
  const durationMs = typeof payload.durationMs === "number" && Number.isFinite(payload.durationMs)
    ? Math.max(0, Math.min(Math.round(payload.durationMs), 86400000))
    : null;
  const path = typeof payload.path === "string" ? payload.path.slice(0, 500) : null;
  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.slice(0, 100) : null;
  const metadata = safeJiaMetadata(payload.metadata);

  const { error } = await sb.from("JiaEvent").insert({
    userId: user.id,
    eventType,
    sessionId,
    path,
    durationMs,
    metadata,
  });
  if (error) return { ok: false as const, status: 500, message: error.message };

  if (eventType === "PAGE_VIEW" || eventType === "SESSION_START" || eventType === "JOB_VIEW") {
    const key = eventType === "JOB_VIEW" ? "last_job_view" : "last_activity";
    await sb.from("JiaMemory").upsert({
      userId: user.id,
      category: "behavior",
      key,
      value: { eventType, path, metadata },
      confidence: 0.5,
      source: "behavioral",
      lastObservedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { onConflict: "userId,category,key" });
  }

  return { ok: true as const, recorded: true };
}
