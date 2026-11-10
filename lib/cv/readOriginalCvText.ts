import type { SupabaseClient } from "@supabase/supabase-js";

export type OriginalCvEvidence = {
  text: string;
  status: "PARSED" | "MISSING" | "UNREADABLE" | "ERROR";
  fileName: string | null;
  pages: number | null;
};

const EMPTY: OriginalCvEvidence = { text: "", status: "MISSING", fileName: null, pages: null };

/** Reads the private original CV through the storage path stored on the internal User row. */
export async function readOriginalCvText(supabase: SupabaseClient, userId: string): Promise<OriginalCvEvidence> {
  let parser: { getText: () => Promise<any>; destroy: () => Promise<void> } | null = null;
  try {
    const { data: user, error: userError } = await supabase.from("User")
      .select("cvOriginalStoragePath,cvOriginalFileName,cvOriginalPageCount").eq("id", userId).maybeSingle();
    if (userError) return { ...EMPTY, status: "ERROR" };
    const storagePath = typeof user?.cvOriginalStoragePath === "string" ? user.cvOriginalStoragePath : "";
    if (!storagePath) return EMPTY;

    const { data: file, error: downloadError } = await supabase.storage.from("talent-cvs").download(storagePath);
    if (downloadError || !file) return { ...EMPTY, status: "ERROR",
      fileName: typeof user?.cvOriginalFileName === "string" ? user.cvOriginalFileName : null,
      pages: Number(user?.cvOriginalPageCount) || null };

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 5 || bytes.length > 3 * 1024 * 1024 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return { ...EMPTY, status: "UNREADABLE",
        fileName: typeof user?.cvOriginalFileName === "string" ? user.cvOriginalFileName : null,
        pages: Number(user?.cvOriginalPageCount) || null };
    }

    const { CanvasFactory } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    parser = new PDFParse({ data: bytes, CanvasFactory });
    const parsed = await parser.getText();
    const text = String(parsed.text || "").replace(/\u0000/g, " ").trim().slice(0, 16000);
    if (text.length < 80) return { ...EMPTY, status: "UNREADABLE",
      fileName: typeof user?.cvOriginalFileName === "string" ? user.cvOriginalFileName : null,
      pages: Number(parsed.total || user?.cvOriginalPageCount) || null };
    return { text, status: "PARSED",
      fileName: typeof user?.cvOriginalFileName === "string" ? user.cvOriginalFileName : null,
      pages: Number(parsed.total || user?.cvOriginalPageCount) || null };
  } catch {
    return { ...EMPTY, status: "ERROR" };
  } finally {
    if (parser) { try { await parser.destroy(); } catch { /* Cleanup must not break scoring. */ } }
  }
}