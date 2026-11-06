import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise ou appareil révoqué." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, authUser);
    if (!user.cvOriginalStoragePath) return NextResponse.json({ message: "Aucun CV original n'est enregistré." }, { status: 404 });
    const { data, error } = await db.storage.from("talent-cvs").download(user.cvOriginalStoragePath);
    if (error || !data) return NextResponse.json({ message: "Le fichier CV n'est pas disponible pour la sauvegarde." }, { status: 404 });
    if (data.size > 12 * 1024 * 1024) return NextResponse.json({ message: "Le CV dépasse la limite de sauvegarde de 12 Mo." }, { status: 413 });
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(data.size),
        "Content-Disposition": 'attachment; filename="jobly-cv-original.pdf"',
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Téléchargement du CV impossible." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise ou appareil révoqué." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ message: "Fichier CV invalide (12 Mo maximum)." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ message: "Seuls les fichiers PDF sont acceptés pour la restauration du CV." }, { status: 415 });
    }
    const db = adminClient();
    const user = await ensureUser(db, authUser);
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100) || "cv-restaure.pdf";
    const storagePath = `${user.id}/backup/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await db.storage.from("talent-cvs").upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);
    const { error: updateError } = await db.from("User").update({
      cvOriginalStoragePath: storagePath,
      cvOriginalFileName: safeName,
      cvOriginalUploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq("id", user.id);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ ok: true, fileName: safeName });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Restauration du CV impossible." }, { status: 500 });
  }
}
