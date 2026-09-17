import type { SupabaseClient } from "@supabase/supabase-js";

export type JiaContextInput = { operation: string; input?: Record<string, unknown> };
export type JiaContext = {
  profile: Record<string, unknown>;
  skills: Array<Record<string, unknown>>;
  experiences: Array<Record<string, unknown>>;
  memory: Array<Record<string, unknown>>;
  behavior: { consented: boolean; eventCount: number; eventTypes: Record<string, number>; paths: Array<{ path: string; count: number }>; recent: Array<{ eventType: string; path: string | null; occurredAt: string; durationMs: number | null }>; lastActivityAt: string | null };
  gaps: string[];
  readiness: number;
  nextBestAction: string;
  input: Record<string, unknown>;
  requestedModule: string;
};

const redact = (value: unknown) => String(value ?? "")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
  .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone]")
  .slice(0, 4000);
const safeArray = (value: unknown, max = 10) => Array.isArray(value) ? value.map((item) => redact(item)).slice(0, max) : [];

export async function buildJiaContext(sb: SupabaseClient, userId: string, request: JiaContextInput): Promise<{ context: JiaContext | null; error: string | null }> {
  const [userResult, profileResult, skillsResult, experiencesResult, memoryResult, eventsResult] = await Promise.all([
    sb.from("User").select("privacyAcceptedAt").eq("id", userId).maybeSingle(),
    sb.from("Profile").select("headline,summary,location,targetRoles,preferredSectors,targetCities,contractPreferences,remotePreference").eq("userId", userId).maybeSingle(),
    sb.from("Skill").select("name,level").eq("userId", userId).limit(50),
    sb.from("Experience").select("title,company,description,startDate,endDate").eq("userId", userId).limit(20),
    sb.from("JiaMemory").select("category,key,value,confidence,source,lastObservedAt").eq("userId", userId).order("lastObservedAt", { ascending: false }).limit(50),
    sb.from("JiaEvent").select("eventType,path,durationMs,occurredAt").eq("userId", userId).order("occurredAt", { ascending: false }).limit(100),
  ]);
  const firstError = userResult.error || profileResult.error || skillsResult.error || experiencesResult.error || memoryResult.error || eventsResult.error;
  if (firstError) return { context: null, error: firstError.message };

  const profile: any = profileResult.data || {};
  const skills = (skillsResult.data || []).map((x: any) => ({ name: redact(x.name), level: redact(x.level) }));
  const experiences = (experiencesResult.data || []).map((x: any) => ({ title: redact(x.title), company: redact(x.company), description: redact(x.description), startDate: x.startDate, endDate: x.endDate }));
  const memory = (memoryResult.data || []).map((x: any) => ({ category: redact(x.category), key: redact(x.key), value: x.value, confidence: Number(x.confidence || 0), source: redact(x.source), lastObservedAt: x.lastObservedAt }));
  const events = (eventsResult.data || []) as any[];
  const eventTypes: Record<string, number> = {};
  const pathCounts: Record<string, number> = {};
  for (const event of events) {
    const type = redact(event.eventType).slice(0, 80) || "unknown";
    eventTypes[type] = (eventTypes[type] || 0) + 1;
    const path = typeof event.path === "string" && event.path ? event.path.slice(0, 160) : null;
    if (path) pathCounts[path] = (pathCounts[path] || 0) + 1;
  }

  const gaps: string[] = [];
  if (!profile.targetRoles?.length) gaps.push("Définir un métier cible");
  if (!skills.length) gaps.push("Ajouter des compétences");
  if (!experiences.length) gaps.push("Ajouter une expérience");
  if (!profile.summary) gaps.push("Compléter le résumé professionnel");
  if (!memory.length) gaps.push("Construire la mémoire personnelle de J’IA");
  const consented = Boolean(userResult.data?.privacyAcceptedAt);
  const behavior = {
    consented,
    eventCount: consented ? events.length : 0,
    eventTypes: consented ? eventTypes : {},
    paths: consented ? Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, count]) => ({ path, count })) : [],
    recent: consented ? events.slice(0, 12).map((x: any) => ({ eventType: redact(x.eventType).slice(0, 80), path: typeof x.path === "string" ? x.path.slice(0, 160) : null, occurredAt: x.occurredAt, durationMs: typeof x.durationMs === "number" ? x.durationMs : null })) : [],
    lastActivityAt: consented && events[0]?.occurredAt ? events[0].occurredAt : null,
  };
  const safeProfile = {
    headline: redact(profile.headline), summary: redact(profile.summary), location: redact(profile.location),
    targetRoles: safeArray(profile.targetRoles), preferredSectors: safeArray(profile.preferredSectors), targetCities: safeArray(profile.targetCities),
    contractPreferences: safeArray(profile.contractPreferences), remotePreference: redact(profile.remotePreference),
  };
  return {
    context: { profile: safeProfile, skills, experiences, memory, behavior, gaps, readiness: Math.max(0, 100 - gaps.length * 15), nextBestAction: gaps[0] || "Consulter les opportunités pertinentes", input: request.input || {}, requestedModule: request.operation },
    error: null,
  };
}
