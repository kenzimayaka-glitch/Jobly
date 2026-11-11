import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import crypto from "node:crypto";

export const runtime = "nodejs";
function safeFilePart(value: unknown) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Utilisateur";
}
function canonicalCvFileName(user: { username?: unknown; firstName?: unknown }) {
  const now = new Date();
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now);
  return `CV_${safeFilePart(user.username)}_${safeFilePart(user.firstName)}_${safeFilePart(month)}_${now.getFullYear()}.pdf`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
      return NextResponse.json({ error: "PDF_REQUIRED", message: "Le CV original doit être un PDF." }, { status: 400 });
    }
    const admin = adminClient();
    const user = await ensureUser(admin, auth);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length <= 0 || bytes.length > 3 * 1024 * 1024) return NextResponse.json({ error: "PDF_TOO_LARGE", message: "Le CV original dépasse la limite de 3 Mo." }, { status: 413 });
    if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "PDF_INVALID", message: "Le contenu du fichier ne correspond pas à un PDF valide." }, { status: 415 });
    }
    const canonicalFileName = canonicalCvFileName(user);
    const storagePath = `${auth.id}/${crypto.randomUUID()}.pdf`;
    const upload = await admin.storage.from("talent-cvs").upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    const previousStoragePath = typeof user.cvOriginalStoragePath === "string" ? user.cvOriginalStoragePath : null;
    const { error: updateError } = await admin.from("User").update({
      cvOriginalStoragePath: storagePath,
      cvOriginalFileName: canonicalFileName,
      cvOriginalPageCount: Number(form.get("pages") || 0) || null,
      cvOriginalUploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq("id", user.id);
    if (updateError) {
      await admin.storage.from("talent-cvs").remove([storagePath]);
      throw new Error(updateError.message);
    }
    // L'ancien fichier n'est retiré qu'après persistance du nouveau chemin.
    if (previousStoragePath && previousStoragePath !== storagePath) {
      await admin.storage.from("talent-cvs").remove([previousStoragePath]);
    }
    return NextResponse.json({ ok: true, stored: true, storagePath, fileName: canonicalFileName });
  } catch (error) {
    return NextResponse.json({ error: "CV_ORIGINAL_SAVE_FAILED", message: error instanceof Error ? error.message : "Impossible d’enregistrer le CV original." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });
    const admin = adminClient();
    const user = await ensureUser(admin, auth);
    if (user.cvOriginalStoragePath) await admin.storage.from("talent-cvs").remove([user.cvOriginalStoragePath]);
    const { error: updateError } = await admin.from("User").update({ cvOriginalStoragePath: null, cvOriginalFileName: null, cvOriginalPageCount: null, cvOriginalUploadedAt: null, updatedAt: new Date().toISOString() }).eq("id", user.id);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "CV_ORIGINAL_DELETE_FAILED", message: error instanceof Error ? error.message : "Impossible de supprimer le CV original." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "UNAUTHENTICATED", message: "Session requise." }, { status: 401 });
    }

    const admin = adminClient();
    const user = await ensureUser(admin, auth);
    if (!user?.cvOriginalStoragePath) {
      return NextResponse.json({ error: "CV_NOT_FOUND", message: "Aucun CV original enregistré." }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from("talent-cvs")
      .createSignedUrl(user.cvOriginalStoragePath, 60);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Impossible de générer le lien sécurisé du CV.");
    }

    return NextResponse.json({
      ok: true,
      fileName: user.cvOriginalFileName || "CV-Jobly.pdf",
      url: data.signedUrl,
      expiresIn: 60,
    });
  } catch (error) {
    return NextResponse.json({
      error: "CV_ORIGINAL_FAILED",
      message: error instanceof Error ? error.message : "Impossible de récupérer le CV original.",
    }, { status: 500 });
  }
}
