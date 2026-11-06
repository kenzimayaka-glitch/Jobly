import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { getActivePlanCode } from "@/lib/entitlements";
import { enforceApiRateLimit } from "@/lib/server-security";
import crypto from "node:crypto";

const BUCKET = "talent-ads";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function hasValidVideoSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "video/webm") {
    return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

async function ensurePublicBucket(supabase: ReturnType<typeof adminClient>) {
  const options = {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_TYPES),
  };
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (error && !/not found/i.test(error.message)) throw new Error(error.message);
  if (!data) {
    const created = await supabase.storage.createBucket(BUCKET, options);
    if (created.error && !/already exists/i.test(created.error.message)) throw new Error(created.error.message);
  }
  const updated = await supabase.storage.updateBucket(BUCKET, options);
  if (updated.error) throw new Error(updated.error.message);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const limited = await enforceApiRateLimit(request, supabase, {
      scope: "talent-ad-upload",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }, { limit: 10, windowSeconds: 86400 }],
      ipWindows: [{ limit: 15, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 1024 * 1024) {
      return NextResponse.json({ message: "Vidéo publicitaire trop volumineuse." }, { status: 413 });
    }

    const plan = await getActivePlanCode(supabase, user.id, "TALENT");
    const maxDuration = plan === "PRO" ? 12000 : plan === "PREMIUM" ? 8000 : 0;
    if (!maxDuration) {
      return NextResponse.json({ message: "La publicité Top Talent est réservée à Premium et Pro." }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Vidéo manquante." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ message: "Formats acceptés : MP4, WebM ou MOV." }, { status: 415 });
    if (file.size < 16 || file.size > MAX_BYTES) return NextResponse.json({ message: "Vidéo invalide ou trop volumineuse." }, { status: 413 });
    const durationMs = Number(form.get("durationMs") || 0);
    if (!Number.isFinite(durationMs) || durationMs < 1000 || durationMs > maxDuration) {
      return NextResponse.json({ message: `Publicité : ${maxDuration / 1000}s maximum avec ${plan}.` }, { status: 422 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidVideoSignature(bytes.slice(0, 16), file.type)) {
      return NextResponse.json({ message: "Le contenu du fichier ne correspond pas à une vidéo MP4, WebM ou MOV valide." }, { status: 415 });
    }

    await ensurePublicBucket(supabase);
    const extension = file.type === "video/mp4" ? "mp4" : file.type === "video/quicktime" ? "mov" : "webm";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });
    if (upload.error) throw new Error(upload.error.message);

    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const previousPath = user.advertisingVideoStoragePath;
    const now = new Date().toISOString();
    const update = await supabase.from("User").update({
      advertisingVideoUrl: url,
      advertisingVideoStoragePath: path,
      advertisingVideoDurationMs: Math.round(durationMs),
      advertisingVideoUpdatedAt: now,
      updatedAt: now,
    }).eq("id", user.id);

    if (update.error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(update.error.message);
    }
    if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);

    return NextResponse.json({ ok: true, advertisingVideoUrl: url, advertisingVideoDurationMs: Math.round(durationMs), plan });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Publication impossible.",
    }, { status: 500 });
  }
}
