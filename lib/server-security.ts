import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export type RateLimitWindow = { limit: number; windowSeconds: number };
type RpcRow = { allowed: boolean; remaining?: number; retry_after_seconds?: number };
type RpcClient = { rpc(name: string, args: {
  p_scope: string; p_key_hash: string; p_limit: number; p_window_seconds: number;
}): PromiseLike<{ data: unknown; error: unknown }> };
export type ApiRateLimitPolicy = {
  scope: string; identity?: string | null; accountWindows?: RateLimitWindow[];
  ipWindows?: RateLimitWindow[]; requireIp?: boolean;
};

function json(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, no-store, max-age=0",
    "x-content-type-options": "nosniff", ...extra,
  }});
}

export function resolveTrustedClientIp(headers: Headers): string | null {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) for (const item of vercel.split(",")) {
    const ip = item.trim().replace(/^\[|\]$/g, "");
    if (isIP(ip)) return ip.toLowerCase();
  }
  const real = headers.get("x-real-ip")?.trim().replace(/^\[|\]$/g, "");
  if (real && isIP(real)) return real.toLowerCase();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) for (const item of forwarded.split(",").reverse()) {
    const ip = item.trim().replace(/^\[|\]$/g, "");
    if (isIP(ip)) return ip.toLowerCase();
  }
  return null;
}

export function hashRateLimitSubject(subject: string, secret: string): string {
  if (secret.length < 32) throw new Error("A strong rate-limit secret is required.");
  return createHmac("sha256", secret).update("jobly-security-core:v1:").update(subject).digest("hex");
}

function parseRpcRow(data: unknown): RpcRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || typeof (row as Record<string, unknown>).allowed !== "boolean") return null;
  const value = row as Record<string, unknown>;
  return { allowed: value.allowed as boolean, remaining: Number(value.remaining), retry_after_seconds: Number(value.retry_after_seconds) };
}

export async function enforceApiRateLimit(request: Request, client: RpcClient, policy: ApiRateLimitPolicy): Promise<Response | null> {
  if (!/^[a-z0-9:_-]{1,100}$/i.test(policy.scope)) return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." });
  const secret = process.env.JOBLY_RATE_LIMIT_SECRET?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (secret.length < 32) return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." });

  const buckets: Array<{ scope: string; subject: string; limit: number; windowSeconds: number }> = [];
  for (const w of policy.accountWindows ?? []) {
    if (!policy.identity) return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." });
    buckets.push({ scope: policy.scope + ":account:" + w.windowSeconds, subject: "account:" + policy.identity, ...w });
  }
  const ip = resolveTrustedClientIp(request.headers);
  if (policy.requireIp && !ip && process.env.NODE_ENV === "production") return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Contrôle réseau indisponible. Réessayez." });
  if (ip) for (const w of policy.ipWindows ?? []) buckets.push({ scope: policy.scope + ":ip:" + w.windowSeconds, subject: "ip:" + ip, ...w });
  if (!buckets.length) return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." });

  for (const bucket of buckets) {
    if (!Number.isInteger(bucket.limit) || bucket.limit < 1 || !Number.isInteger(bucket.windowSeconds) || bucket.windowSeconds < 1 || bucket.windowSeconds > 86400) {
      return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." });
    }
    let result: { data: unknown; error: unknown };
    try {
      result = await client.rpc("consume_jobly_rate_limit", {
        p_scope: bucket.scope, p_key_hash: hashRateLimitSubject(bucket.subject, secret),
        p_limit: bucket.limit, p_window_seconds: bucket.windowSeconds,
      });
    } catch { return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." }); }
    if (result.error) return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." });
    const row = parseRpcRow(result.data);
    if (!row) return json(503, { code: "ANTI_ABUSE_UNAVAILABLE", message: "Protection temporairement indisponible." });
    if (!row.allowed) {
      const retry = Number.isFinite(row.retry_after_seconds) ? Math.max(1, Math.min(86400, Math.ceil(row.retry_after_seconds!))) : bucket.windowSeconds;
      return json(429, { code: "RATE_LIMITED", message: "Trop de demandes. Réessayez après quelques instants.", retryAfterSeconds: retry }, { "retry-after": String(retry) });
    }
  }
  return null;
}
