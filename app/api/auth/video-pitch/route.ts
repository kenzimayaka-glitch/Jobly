import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { getActivePlanCode } from "../../../../lib/entitlements";

const BUCKET = "talent-pitches";
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase serveur non configuré.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase client non configuré.");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function ensureUser(supabase: ReturnType<typeof adminClient>, authUser: { id: string; email?: string | null }) {
  const { data: existing, error } = await supabase.from("User").select("*").eq("authUserId", authUser.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return existing;
  const now = new Date().toISOString();
  const { data, error: insertError } = await supabase.from("User").insert({
    id: crypto.randomUUID(), authUserId: authUser.id, email: authUser.email ?? null, updatedAt: now,
  }).select("*").single();
  if (insertError) throw new Error(insertError.message);
  return data;
}

async function ensureBucket(supabase: ReturnType<typeof adminClient>) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(error.message);
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_BYTES}`,
      allowedMimeTypes: Array.from(ALLOWED),
    });
    if (createError && !/already exists/i.test(createError.message)) throw new Error(createError.message);
  }
}

function publicUrl(supabase: ReturnType<typeof adminClient>, path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    return NextResponse.json({ pitchVideoUrl: user.pitchVideoUrl ?? null, pitchVideoDurationMs: user.pitchVideoDurationMs ?? null, updatedAt: user.pitchVideoUpdatedAt ?? null });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger le pitch vidéo." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Vidéo manquante." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ message: "Format accepté : MP4, WebM ou MOV." }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ message: "La vidéo doit faire 4 Mo maximum." }, { status: 413 });
    if (file.size === 0) return NextResponse.json({ message: "La vidéo est vide." }, { status: 400 });

    const durationMs = Number(form.get("durationMs") || 0);
    if (!Number.isFinite(durationMs)) return NextResponse.json({ message: "Durée vidéo invalide." }, { status: 422 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const plan = await getActivePlanCode(supabase, user.id, "TALENT");
    const maxDurationMs = plan === "PRO" ? 20000 : plan === "PREMIUM" ? 10000 : 0;
    if (!maxDurationMs) return NextResponse.json({ message: "Le pitch vidéo est disponible avec les formules Pro et Premium." }, { status: 403 });
    if (durationMs < 5000 || durationMs > maxDurationMs) return NextResponse.json({ message: `Ton pitch doit durer entre 5 et ${Math.round(maxDurationMs / 1000)} secondes avec ta formule.` }, { status: 422 });
    await ensureBucket(supabase);

    const extension = file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });
    if (uploadError) throw new Error(uploadError.message);

    const url = publicUrl(supabase, path);
    const oldPath = typeof user.pitchVideoStoragePath === "string" ? user.pitchVideoStoragePath : null;
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("User").update({
      pitchVideoUrl: url,
      pitchVideoStoragePath: path,
      pitchVideoDurationMs: Math.round(durationMs),
      pitchVideoUpdatedAt: now,
      updatedAt: now,
    }).eq("id", user.id);
    if (updateError) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(updateError.message);
    }

    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
    return NextResponse.json({ ok: true, pitchVideoUrl: url, pitchVideoDurationMs: Math.round(durationMs), updatedAt: now });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer le pitch vidéo." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const oldPath = typeof user.pitchVideoStoragePath === "string" ? user.pitchVideoStoragePath : null;
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
    const now = new Date().toISOString();
    const { error } = await supabase.from("User").update({ pitchVideoUrl: null, pitchVideoStoragePath: null, pitchVideoDurationMs: null, pitchVideoUpdatedAt: null, updatedAt: now }).eq("id", user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de supprimer le pitch vidéo." }, { status: 500 });
  }
}
