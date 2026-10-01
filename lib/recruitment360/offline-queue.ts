"use client";

const KEY_PREFIX = "jobly:recruitment360:test-events:";

export type OfflineEvent = {
  event: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
};

function key(sessionId: string) {
  return KEY_PREFIX + sessionId;
}

export function enqueueOfflineEvent(sessionId: string, event: OfflineEvent) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(key(sessionId)) || "[]") as OfflineEvent[];
    existing.push(event);
    localStorage.setItem(key(sessionId), JSON.stringify(existing.slice(-500)));
  } catch {
    // Storage can be disabled or full; the server remains authoritative.
  }
}

export function drainOfflineEvents(sessionId: string): OfflineEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const events = JSON.parse(localStorage.getItem(key(sessionId)) || "[]") as OfflineEvent[];
    localStorage.removeItem(key(sessionId));
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}
