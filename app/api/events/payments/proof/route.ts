import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { inspectEventMedia } from "../../../../../lib/eventMedia";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export const runtime = "nodejs";
const BUCKET = "jobly-payment-proofs";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 512 * 1024) return NextResponse.json({ message: "Le justificatif dépasse 10 Mo." }, { status: 413 });
    const limited = await enforceApiRateLimit(request, sb, {
      scope: "event-payment-proof-upload",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }, { limit: 10, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Justificatif manquant." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ message: "Le justificatif doit peser au maximum 10 MB." }, { status: 422 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectEventMedia(bytes, file.type);
    if (!inspected.ok || !["IMAGE","FLYER"].includes(inspected.type)) {
      return NextResponse.json({ message: "Format non accepté. Utilisez une image ou un PDF." }, { status: 422 });
    }
    const path = user.id + "/" + crypto.randomUUID() + "." + inspected.extension;
    const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
      contentType: inspected.mimeType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ proofPath: path, mimeType: inspected.mimeType, sizeBytes: file.size }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Upload du justificatif impossible." }, { status: 500 });
  }
}
