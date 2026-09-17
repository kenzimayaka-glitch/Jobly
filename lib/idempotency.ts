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
  const { data, error } = await sb.from("IdempotencyKey").select("*").eq("userId", userId).eq("endpoint", endpoint).eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { key, hash, existing: null };
  if (data.payloadHash !== hash) return { error: "IDEMPOTENCY_KEY_REUSED" as const, conflict: true };
  return { key, hash, existing: data };
}

export async function saveIdempotentResult(userId: string, endpoint: string, key: string, hash: string, statusCode: number, response: unknown) {
  const { error } = await adminClient().from("IdempotencyKey").insert({
    id: crypto.randomUUID(), userId, endpoint, key, payloadHash: hash, statusCode, response, createdAt: new Date().toISOString(),
  });
  if (error && !error.message.toLowerCase().includes("duplicate") && !error.message.toLowerCase().includes("unique")) throw new Error(error.message);
}
