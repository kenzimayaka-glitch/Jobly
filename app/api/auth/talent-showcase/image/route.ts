import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { enforceApiRateLimit } from "@/lib/server-security";
import crypto from "node:crypto";

const BUCKET = "talent-showcase";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function ensurePublicBucket(supabase: ReturnType<typeof adminClient>) {
  const options = { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Array.from(MIME_TYPES) };
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
      scope: "talent-showcase-image-upload",
      identity: user.id,
      accountWindows: [{ limit: 10, windowSeconds: 3600 }, { limit: 30, windowSeconds: 86400 }],
      ipWindows: [{ limit: 20, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 512 * 1024) return NextResponse.json({ message: "5 Mo maximum par image." }, { status: 413 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !MIME_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Formats acceptés : JPEG, PNG ou WebP." }, { status: 415 });
    }
    if (file.size < 12 || file.size > MAX_BYTES) return NextResponse.json({ message: "5 Mo maximum par image." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidImageSignature(bytes.slice(0, 16), file.type)) {
      return NextResponse.json({ message: "Le contenu du fichier ne correspond pas à une image acceptée." }, { status: 415 });
    }

    await ensurePublicBucket(supabase);
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });
    if (upload.error) throw new Error(upload.error.message);
    return NextResponse.json({ url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Upload impossible." }, { status: 500 });
  }
}
