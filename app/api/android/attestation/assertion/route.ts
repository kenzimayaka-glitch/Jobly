import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { enforceApiRateLimit } from "@/lib/server-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session invalide ou révoquée." }, { status: 401, headers: noStore });

    const db = adminClient();
    const user = await ensureUser(db, authUser);
    const limited = await enforceApiRateLimit(request, db, {
      scope: "android-attestation-assertion",
      identity: user.id,
      accountWindows: [{ limit: 180, windowSeconds: 60 }],
      ipWindows: [{ limit: 300, windowSeconds: 60 }],
      requireIp: true,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => ({})) as {
      deviceId?: unknown;
      method?: unknown;
      path?: unknown;
      timestamp?: unknown;
    };
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    const method = typeof body.method === "string" ? body.method.toUpperCase() : "";
    const path = typeof body.path === "string" ? body.path : "";
    const timestamp = typeof body.timestamp === "string" ? body.timestamp : "";
    const timestampNumber = Number(timestamp);

    if (!/^[A-Za-z0-9:_-]{1,160}$/.test(deviceId) ||
        !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method) ||
        !/^\/api\/[^\r\n#\\]{1,1800}$/.test(path) ||
        path.startsWith("/api/android/attestation/") ||
        path.includes("..") ||
        !/^\d{13}$/.test(timestamp) ||
        !Number.isSafeInteger(timestampNumber) ||
        Math.abs(Date.now() - timestampNumber) > 30_000) {
      return NextResponse.json({ message: "Demande de signature d'appareil invalide." }, { status: 400, headers: noStore });
    }

    const { data: attestation, error: attestationError } = await db
      .from("AndroidDeviceAttestation")
      .select("id")
      .eq("userId", user.id)
      .eq("deviceId", deviceId)
      .is("revokedAt", null)
      .gt("expiresAt", new Date().toISOString())
      .maybeSingle();
    if (attestationError) throw new Error("ANDROID_ATTESTATION_LOOKUP_FAILED");
    if (!attestation) {
      return NextResponse.json({ message: "Cet appareil doit d'abord terminer son attestation matérielle." }, { status: 403, headers: noStore });
    }

    const challengeId = randomUUID();
    const canonical = [method, path, timestamp, challengeId].join("\n");
    const challengeHash = createHash("sha256").update(canonical).digest("hex");
    const now = new Date();
    await db.from("AndroidAttestationChallenge")
      .delete()
      .lt("expiresAt", now.toISOString());

    const { error } = await db.from("AndroidAttestationChallenge").insert({
      id: challengeId,
      userId: user.id,
      deviceId,
      challengeHash,
      purpose: "REQUEST",
      expiresAt: new Date(now.getTime() + 30_000).toISOString(),
    });
    if (error) throw new Error("ANDROID_ASSERTION_CHALLENGE_CREATE_FAILED");

    return NextResponse.json({
      challengeId,
      payload: Buffer.from(canonical, "utf8").toString("base64"),
      expiresInSeconds: 30,
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ message: "Impossible de préparer la preuve cryptographique de l'appareil." }, { status: 503, headers: noStore });
  }
}
