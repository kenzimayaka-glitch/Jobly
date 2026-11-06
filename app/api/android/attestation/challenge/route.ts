import { createHash, randomBytes, randomUUID } from "node:crypto";
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
      scope: "android-attestation-challenge",
      identity: user.id,
      accountWindows: [{ limit: 8, windowSeconds: 3600 }],
      ipWindows: [{ limit: 24, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => ({})) as { deviceId?: unknown };
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    if (!/^[A-Za-z0-9:_-]{1,160}$/.test(deviceId)) {
      return NextResponse.json({ message: "Identifiant d'appareil invalide." }, { status: 400, headers: noStore });
    }

    const now = new Date();
    const { data: existing, error: existingError } = await db
      .from("AndroidDeviceAttestation")
      .select("securityLevel,verifiedBootState,deviceLocked,verifiedAt,expiresAt,revokedAt")
      .eq("userId", user.id)
      .eq("deviceId", deviceId)
      .is("revokedAt", null)
      .gt("expiresAt", now.toISOString())
      .maybeSingle();
    if (existingError) throw new Error("ATTESTATION_STATUS_LOOKUP_FAILED");
    if (existing?.deviceLocked && existing.verifiedBootState === "VERIFIED") {
      return NextResponse.json({
        alreadyVerified: true,
        securityLevel: existing.securityLevel,
        verifiedAt: existing.verifiedAt,
        expiresAt: existing.expiresAt,
      }, { headers: noStore });
    }

    const challenge = randomBytes(32);
    const challengeId = randomUUID();
    const { error } = await db.from("AndroidAttestationChallenge").insert({
      id: challengeId,
      userId: user.id,
      deviceId,
      challengeHash: createHash("sha256").update(challenge).digest("hex"),
      expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
    });
    if (error) throw new Error("ATTESTATION_CHALLENGE_CREATE_FAILED");

    return NextResponse.json({
      alreadyVerified: false,
      challengeId,
      challenge: challenge.toString("base64"),
      expiresInSeconds: 300,
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ message: "Impossible de préparer la vérification d'intégrité Android." }, { status: 503, headers: noStore });
  }
}
