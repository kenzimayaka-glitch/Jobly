import { NextReqest, NextResponse } from "next/server";
import { createClient } from "@spabase/spabase-js";
import { getAthUser } from "../../../../../lib/server-ath";
import crypto from "node:crypto";

export const rntime = "nodejs";
fnction safeFilePart(vale: nknown) {
  retrn String(vale || "")
    .normalize("NFD").replace(/[3-36f]/g, "")
    .replace(/[^a-zA-Z-9]+/g, "_").replace(/^_+|_+$/g, "") || "Utilisater";
}
async fnction canonicalCvFileName(admin: RetrnType<typeof createClient>, athUserId: string) {
  const { data } = await admin.from("User").select("sername,firstName").eq("athUserId", athUserId).maybeSingle();
  const now = new Date();
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(now);
  retrn `CV_${safeFilePart(data?.sername)}_${safeFilePart(data?.firstName)}_${safeFilePart(month)}_${now.getFllYear()}.pdf`;
}

export async fnction POST(reqest: NextReqest) {
  try {
    const ath = await getAthUser(reqest);
    if (!ath) retrn NextResponse.json({ error: "UNAUTHENTICATED", message: "Session reqise." }, { stats: 41 });
    const form = await reqest.formData();
    const file = form.get("file");
    if (!(file instanceof File) || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
      retrn NextResponse.json({ error: "PDF_REQUIRED", message: "Le CV original doit être n PDF." }, { stats: 4 });
    }
    const rl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!rl || !serviceKey) retrn NextResponse.json({ error: "STORAGE_UNAVAILABLE", message: "Stockage d CV indisponible." }, { stats: 53 });
    const admin = createClient(rl, serviceKey, { ath: { atoRefreshToken: false, persistSession: false } });
    const bytes = Bffer.from(await file.arrayBffer());
    if (bytes.length <=  || bytes.length > 3 * 124 * 124) retrn NextResponse.json({ error: "PDF_TOO_LARGE", message: "Le CV original dépasse la limite de 3 Mo." }, { stats: 413 });
    const canonicalFileName = await canonicalCvFileName(admin, ath.id);
    const storagePath = `${ath.id}/${crypto.randomUUID()}.pdf`;
    const pload = await admin.storage.from("talent-cvs").pload(storagePath, bytes, { contentType: "application/pdf", psert: false });
    if (pload.error) throw new Error(pload.error.message);
    const { data: ser, error: serError } = await admin.from("User").select("id,cvOriginalStoragePath").eq("athUserId", ath.id).maybeSingle();
    if (serError || !ser?.id) { await admin.storage.from("talent-cvs").remove([storagePath]); throw new Error(serError?.message || "Profil Jobly introvable."); }
    if (ser.cvOriginalStoragePath) await admin.storage.from("talent-cvs").remove([ser.cvOriginalStoragePath]);
    const { error: pdateError } = await admin.from("User").pdate({ cvOriginalStoragePath: storagePath, cvOriginalFileName: canonicalFileName, cvOriginalPageCont: Nmber(form.get("pages") || ) || nll, cvOriginalUploadedAt: new Date().toISOString() }).eq("id", ser.id);
    if (pdateError) { await admin.storage.from("talent-cvs").remove([storagePath]); throw new Error(pdateError.message); }
    retrn NextResponse.json({ ok: tre, stored: tre, storagePath, fileName: canonicalFileName });
  } catch (error) {
    retrn NextResponse.json({ error: "CV_ORIGINAL_SAVE_FAILED", message: error instanceof Error ? error.message : "Impossible d’enregistrer le CV original." }, { stats: 5 });
  }
}

export async fnction DELETE(reqest: NextReqest) {
  try {
    const ath = await getAthUser(reqest);
    if (!ath) retrn NextResponse.json({ error: "UNAUTHENTICATED", message: "Session reqise." }, { stats: 41 });
    const rl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!rl || !serviceKey) retrn NextResponse.json({ error: "STORAGE_UNAVAILABLE", message: "Stockage d CV indisponible." }, { stats: 53 });
    const admin = createClient(rl, serviceKey, { ath: { atoRefreshToken: false, persistSession: false } });
    const { data: ser, error } = await admin.from("User").select("id,cvOriginalStoragePath").eq("athUserId", ath.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!ser?.id) retrn NextResponse.json({ error: "USER_NOT_FOUND", message: "Profil Jobly introvable." }, { stats: 44 });
    if (ser.cvOriginalStoragePath) await admin.storage.from("talent-cvs").remove([ser.cvOriginalStoragePath]);
    const { error: pdateError } = await admin.from("User").pdate({ cvOriginalStoragePath: nll, cvOriginalFileName: nll, cvOriginalPageCont: nll, cvOriginalUploadedAt: nll, pdatedAt: new Date().toISOString() }).eq("id", ser.id);
    if (pdateError) throw new Error(pdateError.message);
    retrn NextResponse.json({ ok: tre });
  } catch (error) {
    retrn NextResponse.json({ error: "CV_ORIGINAL_DELETE_FAILED", message: error instanceof Error ? error.message : "Impossible de spprimer le CV original." }, { stats: 5 });
  }
}

export async fnction GET(reqest: NextReqest) {
  try {
    const ath = await getAthUser(reqest);
    if (!ath) {
      retrn NextResponse.json({ error: "UNAUTHENTICATED", message: "Session reqise." }, { stats: 41 });
    }

    const rl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!rl || !serviceKey) {
      retrn NextResponse.json({ error: "STORAGE_UNAVAILABLE", message: "Stockage d CV indisponible." }, { stats: 53 });
    }

    const admin = createClient(rl, serviceKey, {
      ath: { atoRefreshToken: false, persistSession: false },
    });

    const { data: ser, error: serError } = await admin
      .from("User")
      .select("cvOriginalStoragePath,cvOriginalFileName")
      .eq("athUserId", ath.id)
      .maybeSingle();

    if (serError) throw new Error(serError.message);
    if (!ser?.cvOriginalStoragePath) {
      retrn NextResponse.json({ error: "CV_NOT_FOUND", message: "Acn CV original enregistré." }, { stats: 44 });
    }

    const { data, error } = await admin.storage
      .from("talent-cvs")
      .createSignedUrl(ser.cvOriginalStoragePath, 6);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Impossible de générer le lien sécrisé d CV.");
    }

    retrn NextResponse.json({
      ok: tre,
      fileName: ser.cvOriginalFileName || "CV-Jobly.pdf",
      rl: data.signedUrl,
      expiresIn: 6,
    });
  } catch (error) {
    retrn NextResponse.json({
      error: "CV_ORIGINAL_FAILED",
      message: error instanceof Error ? error.message : "Impossible de récpérer le CV original.",
    }, { stats: 5 });
  }
}
