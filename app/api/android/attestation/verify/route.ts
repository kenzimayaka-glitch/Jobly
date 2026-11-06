import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { enforceApiRateLimit } from "@/lib/server-security";
import { verifyAndroidKeyAttestation } from "@/lib/android-key-attestation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

async function readLimitedJson(request: NextRequest, maxBytes: number): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("ATTESTATION_BODY_MISSING");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("ATTESTATION_BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return JSON.parse(bytes.toString("utf8")) as unknown;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session invalide ou révoquée." }, { status: 401, headers: noStore });

    const db = adminClient();
    const user = await ensureUser(db, authUser);
    const limited = await enforceApiRateLimit(request, db, {
      scope: "android-attestation-verify",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }],
      ipWindows: [{ limit: 15, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const body = await readLimitedJson(request, 140 * 1024) as {
      challengeId?: unknown;
      deviceId?: unknown;
      certificateChain?: unknown;
    };
    const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    const certificateChain = Array.isArray(body.certificateChain) ? body.certificateChain : [];
    const encodedChainBytes = certificateChain.reduce(
      (sum, value) => sum + (typeof value === "string" ? value.length : 0), 0
    );
    if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^[A-Za-z0-9:_-]{1,160}$/.test(deviceId) ||
        certificateChain.length < 2 || certificateChain.length > 8 ||
        encodedChainBytes > 128 * 1024 ||
        certificateChain.some((value) => typeof value !== "string")) {
      return NextResponse.json({ message: "Preuve d'intégrité invalide." }, { status: 400, headers: noStore });
    }

    const now = new Date().toISOString();
    const { data: challenge, error: challengeError } = await db
      .from("AndroidAttestationChallenge")
      .update({ usedAt: now })
      .eq("id", challengeId)
      .eq("userId", user.id)
      .eq("deviceId", deviceId)
      .eq("purpose", "REGISTER")
      .is("usedAt", null)
      .gt("expiresAt", now)
      .select("challengeHash")
      .maybeSingle();
    if (challengeError) throw new Error("ATTESTATION_CHALLENGE_LOOKUP_FAILED");
    if (!challenge?.challengeHash) {
      return NextResponse.json({ message: "Défi expiré ou déjà utilisé. Relancez la vérification." }, { status: 409, headers: noStore });
    }

    const attestation = await verifyAndroidKeyAttestation({
      certificateChain: certificateChain as string[],
      challengeHash: challenge.challengeHash,
    });

    const verifiedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    const { error: saveError } = await db.from("AndroidDeviceAttestation").upsert({
      userId: user.id,
      deviceId,
      publicKeyPem: attestation.publicKeyPem,
      certificateFingerprintSha256: attestation.certificateFingerprintSha256,
      securityLevel: attestation.securityLevel,
      verifiedBootState: attestation.verifiedBootState,
      deviceLocked: attestation.deviceLocked,
      packageName: attestation.packageName,
      verifiedAt,
      expiresAt,
      revokedAt: null,
      updatedAt: verifiedAt,
    }, { onConflict: "userId,deviceId" });
    if (saveError) throw new Error("ATTESTATION_RESULT_SAVE_FAILED");

    return NextResponse.json({
      verified: true,
      securityLevel: attestation.securityLevel,
      verifiedBootState: attestation.verifiedBootState,
      deviceLocked: attestation.deviceLocked,
      verifiedAt,
      expiresAt,
    }, { headers: noStore });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ATTESTATION_FAILED";
    if (code === "ATTESTATION_SIGNING_IDENTITY_NOT_CONFIGURED") {
      return NextResponse.json({ message: "Identité de signature Android non configurée côté serveur." }, { status: 503, headers: noStore });
    }
    return NextResponse.json({ message: "La preuve d'intégrité Android n'a pas été validée.", code }, { status: 403, headers: noStore });
  }
}
