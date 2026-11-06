import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

const BUCKET = "mobility-provider-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES + 512 * 1024) return NextResponse.json({ message: "Le document dépasse 10 Mo." }, { status: 413 });
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-kyc-document-upload",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }, { limit: 10, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data: existingProvider, error: providerError } = await db.from("MobilityServiceProvider")
      .select("id,status,kycStatus").eq("userId", user.id).maybeSingle();
    if (providerError) throw new Error(providerError.message);
    if (existingProvider && existingProvider.status === "ACTIVE" && existingProvider.kycStatus === "VERIFIED") {
      return NextResponse.json({ message: "Un prestataire déjà vérifié doit demander une mise à jour KYC à Jobly." }, { status: 409 });
    }
    const bucketOptions = { public: false, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(MIME_EXT) };
    const { data: existingBucket, error: bucketLookupError } = await db.storage.getBucket(BUCKET);
    if (bucketLookupError && !/not found/i.test(bucketLookupError.message)) throw new Error(bucketLookupError.message);
    if (!existingBucket) {
      const created = await db.storage.createBucket(BUCKET, bucketOptions);
      if (created.error && !/already exists/i.test(created.error.message)) throw new Error(created.error.message);
    }
    const bucketUpdate = await db.storage.updateBucket(BUCKET, bucketOptions);
    if (bucketUpdate.error) throw new Error(bucketUpdate.error.message);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Document KYC requis." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ message: "Le document doit peser entre 1 octet et 10 Mo." }, { status: 400 });
    const extension = MIME_EXT[file.type];
    if (!extension) return NextResponse.json({ message: "Formats acceptés : PDF, JPG et PNG." }, { status: 400 });

    const path = user.id + "/" + crypto.randomUUID() + "." + extension;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validPdf = file.type === "application/pdf" && bytes.length >= 5 && Buffer.from(bytes.subarray(0,5)).toString("ascii") === "%PDF-";
    const validJpeg = file.type === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const validPng = file.type === "image/png" && bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (!(validPdf || validJpeg || validPng)) return NextResponse.json({ message: "Le contenu du document ne correspond pas au type PDF/JPEG/PNG déclaré." }, { status: 415 });
    const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ storagePath: path, fileName: file.name, fileSize: file.size }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Dépôt KYC impossible." }, { status: 500 });
  }
}
