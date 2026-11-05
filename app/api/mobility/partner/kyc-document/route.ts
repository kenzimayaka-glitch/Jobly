import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";

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
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Document KYC requis." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ message: "Le document doit peser entre 1 octet et 10 Mo." }, { status: 400 });
    const extension = MIME_EXT[file.type];
    if (!extension) return NextResponse.json({ message: "Formats acceptés : PDF, JPG et PNG." }, { status: 400 });

    const path = user.id + "/" + crypto.randomUUID() + "." + extension;
    const bytes = new Uint8Array(await file.arrayBuffer());
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
