import { createHash, randomUUID } from "node:crypto";
import { adminClient } from "@/lib/server-auth";
import { watchExternal, type JiaWatchTarget } from "@/lib/jia/watcher";

export type PersistentWatchRow = {
  id: string;
  userId: string;
  key: string;
  query: string;
  domain: string;
  country: string | null;
  frequencyMinutes: number;
  active: boolean;
  notificationMode: string;
  validationMode: string;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  lastSignalHash: string | null;
  lastConfidence: number | null;
};

function hashState(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function nextCheckAt(frequencyMinutes: number) {
  return new Date(Date.now() + Math.max(1440, frequencyMinutes) * 60_000).toISOString();
}

export async function listDueWatchSubscriptions(limit = 50) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient()
    .from("JiaWatchSubscription")
    .select("*")
    .eq("active", true)
    .or(`nextCheckAt.is.null,nextCheckAt.lte.${now}`)
    .order("nextCheckAt", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PersistentWatchRow[];
}

export async function createOrUpdateWatchSubscription(
  userId: string,
  target: JiaWatchTarget,
  options?: Partial<Pick<PersistentWatchRow, "country" | "frequencyMinutes" | "notificationMode" | "validationMode">>,
) {
  const frequencyMinutes = Math.max(1440, options?.frequencyMinutes ?? 1440);
  const payload = {
    userId,
    key: target.key,
    query: target.query,
    domain: target.domain,
    country: options?.country ?? null,
    frequencyMinutes,
    active: true,
    notificationMode: options?.notificationMode ?? "DIGEST",
    validationMode: options?.validationMode ?? "ON_DEMAND",
    nextCheckAt: new Date().toISOString(),
  };

  const { data, error } = await adminClient()
    .from("JiaWatchSubscription")
    .upsert(payload, { onConflict: "userId,key" })
    .select("*")
    .single();

  if (error) throw error;
  return data as PersistentWatchRow;
}

export async function runPersistentWatch(subscription: PersistentWatchRow) {
  const scheduledFor = subscription.nextCheckAt ?? new Date().toISOString();
  const db = adminClient();
  const runId = randomUUID();

  const { error: runInsertError } = await db.from("JiaWatchRun").insert({
    id: runId,
    subscriptionId: subscription.id,
    scheduledFor,
    status: "RUNNING",
  });

  if (runInsertError && runInsertError.code !== "23505") throw runInsertError;
  if (runInsertError?.code === "23505") return { skipped: true, reason: "ALREADY_SCHEDULED" };

  try {
    const signal = await watchExternal(subscription.userId, {
      key: subscription.key,
      query: subscription.query,
      domain: subscription.domain,
    });

    const observation = signal.observation;
    const stateHash = hashState({
      facts: observation.facts,
      sources: observation.sourcesUsed.map((source) => ({ url: source.url, title: source.title })),
      status: observation.status,
    });

    const changed = subscription.lastSignalHash !== stateHash;

    await db.from("JiaWatchSnapshot").upsert({
      id: randomUUID(),
      subscriptionId: subscription.id,
      stateHash,
      facts: observation.facts,
      sources: observation.sourcesUsed,
      context: observation.context,
      observedAt: new Date().toISOString(),
    }, { onConflict: "subscriptionId,stateHash" });

    const now = new Date().toISOString();
    await db.from("JiaWatchSubscription").update({
      lastCheckedAt: now,
      nextCheckAt: nextCheckAt(subscription.frequencyMinutes),
      lastSignalHash: stateHash,
      lastConfidence: observation.confidence,
    }).eq("id", subscription.id);

    await db.from("JiaWatchRun").update({
      status: "SUCCEEDED",
      finishedAt: now,
      signalHash: stateHash,
      changeCount: changed ? Math.max(1, observation.changes.length) : 0,
      confidence: observation.confidence,
    }).eq("id", runId);

    return { skipped: false, changed, signal, stateHash };
  } catch (error) {
    const now = new Date().toISOString();
    await db.from("JiaWatchRun").update({
      status: "FAILED",
      finishedAt: now,
      error: error instanceof Error ? error.message : "Veille indisponible.",
    }).eq("id", runId);
    throw error;
  }
}
