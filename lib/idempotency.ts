import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { adminClient } from "./server-auth";

export function payloadHash(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export async function getIdempotentResult(request: NextRequest, endpoint: string, userId: string, body: unknown) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) return { error: "IDEMPOTENCY_KEY_REQUIRED" as const };
  if (key.length > 200) return { error: "IDEMPOTENCY_KEY_REUSED" as const };
  const hash = payloadHash(body);
  const sb = adminClient();
  const claim = {
    id: crypto.randomUUID(), userId, endpoint, key, payloadHash: hash,
    statusCode: 102, response: { processing: true },
    createdAt: new Date().toISOString(),
  };
  const { data: inserted, error: insertError } = await sb
    .from("IdempotencyKey")
    .insert(claim)
    .select("*")
    .maybeSingle();
  if (!insertError && inserted) return { key, hash, existing: null };
  if (insertError && !insertError.message.toLowerCase().includes("duplicate") && !insertError.message.toLowerCase().includes("unique"))
    throw new Error(insertError.message);

  const { data, error } = await sb.from("IdempotencyKey").select("*").eq("userId", userId).eq("endpoint", endpoint).eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("IDEMPOTENCY_CLAIM_NOT_FOUND");
  if (data.payloadHash !== hash) return { error: "IDEMPOTENCY_KEY_REUSED" as const, conflict: true };
  if (data.statusCode === 102) return { key, hash, existing: null, processing: true as const };
  return { key, hash, existing: data };
}

export async function saveIdempotentResult(userId: string, endpoint: string, key: string, hash: string, statusCode: number, response: unknown) {
  const { error } = await adminClient().from("IdempotencyKey").update({
    statusCode, response,
  }).eq("userId", userId).eq("endpoint", endpoint).eq("key", key);
  if (error) throw new Error(error.message);
}
