import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { getAuthUser } from "../../../../lib/server-auth";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 30000;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Sélectionnez un fichier Word ou PDF." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ message: "Le fichier est trop volumineux. Limite : 5 Mo." }, { status: 413 });

    const name = file.name || "lettre";
    const ext = name.toLowerCase().split(".").pop();
    const bytes = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (ext === "pdf" || file.type === "application/pdf") {
      const parser = new PDFParse({ data: bytes });
      const parsed = await parser.getText();
      text = String(parsed.text || "");
      await parser.destroy();
    } else if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const parsed = await mammoth.extractRawText({ buffer: bytes });
      text = String(parsed.value || "");
    } else if (ext === "doc") {
      return NextResponse.json({ message: "Les anciens fichiers .doc ne sont pas encore pris en charge. Enregistrez-le en .docx ou PDF." }, { status: 415 });
    } else {
      return NextResponse.json({ message: "Format non pris en charge. Utilisez PDF ou Word (.docx)." }, { status: 415 });
    }

    text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT);
    if (!text) return NextResponse.json({ message: "Aucun texte exploitable n'a été trouvé dans ce document." }, { status: 422 });

    return NextResponse.json({ filename: name, mimeType: file.type || null, text, truncated: text.length >= MAX_TEXT, source: "CANDIDATE_UPLOAD" });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de lire ce document." }, { status: 500 });
  }
}
