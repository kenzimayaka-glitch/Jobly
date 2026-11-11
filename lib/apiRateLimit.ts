import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server.js";

type RateWindow = { windowSeconds: number; maxRequests: number };
type RateLimitOptions = {
  scope: string;
  identity: string;
  accountWindows: RateWindow[];
  ipWindows: RateWindow[];
  requireIp?: boolean;
};

type RateLimitResult = { allowed: boolean; retry_after_seconds?: number };

function requestIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || null;
  return candidate && candidate.toLowerCase() !== "unknown" ? candidate : null;
}

/** Shared atomic limiter. Raw account IDs and IP addresses are HMACed before storage. */
export async function enforceApiRateLimit(
  supabase: any,
  request: NextRequest,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const ip = requestIp(request);
  if (options.requireIp && !ip) {
    return NextResponse.json(
      { message: "Adresse IP indisponible pour le contrôle de sécurité." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Use the configured server-only secret key, with legacy service_role fallback.
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return NextResponse.json(
      { message: "Le contrôle de sécurité est temporairement indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const windows: Array<{ kind: string; identity: string; window: RateWindow }> = [
    ...options.accountWindows.map((window) => ({ kind: "account", identity: options.identity, window })),
    ...(ip ? options.ipWindows.map((window) => ({ kind: "ip", identity: ip, window })) : []),
  ];

  try {
    const results = await Promise.all(windows.map(async ({ kind, identity, window }) => {
      const identityHash = crypto.createHmac("sha256", secret)
        .update([options.scope, kind, identity].join(":"))
        .digest("hex");
      const { data, error } = await supabase.rpc("consume_api_rate_limit", {
        p_scope: options.scope,
        p_identity_hash: identityHash,
        p_window_seconds: window.windowSeconds,
        p_max_requests: window.maxRequests,
      });
      if (error) throw new Error(error.message);
      const row = (Array.isArray(data) ? data[0] : data) as RateLimitResult | null;
      if (!row || typeof row.allowed !== "boolean") throw new Error("Réponse invalide du contrôle de débit.");
      return row;
    }));

    const blocked = results.filter((result) => !result.allowed);
    if (blocked.length > 0) {
      const retryAfter = Math.max(1, ...blocked.map((result) => Number(result.retry_after_seconds) || 1));
      return NextResponse.json(
        { message: "Trop de requêtes. Réessayez après le délai indiqué.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      { message: "Le contrôle de sécurité est temporairement indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
