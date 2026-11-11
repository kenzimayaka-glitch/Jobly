import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { getTalentShowcasePlan, TALENT_SHOWCASE_LIMITS } from "@/lib/talentShowcaseEntitlements";

const BUCKET = "talent-showcase";
const MAX = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const plan = await getTalentShowcasePlan(supabase, user.id);
    if (plan === "FREE") {
      return NextResponse.json({ message: "Les images d’actions sont disponibles avec Pro ou Premium." }, { status: 403 });
    }

    const limit = TALENT_SHOWCASE_LIMITS[plan].images;
    const existingImages: string[] = [];
    if (Array.isArray(user.actionImages)) {
      for (const value of user.actionImages) {
        if (typeof value === "string" && value.trim()) existingImages.push(value.trim());
      }
    }
    const uniqueExistingImages = [...new Set(existingImages)];
    if (uniqueExistingImages.length >= limit) {
      return NextResponse.json({ message: `Quota d’images atteint pour votre formule (${limit}).`, limit }, { status: 409 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Image manquante." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ message: "Formats acceptés : JPEG, PNG ou WebP." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX) return NextResponse.json({ message: "5 Mo maximum par image." }, { status: 413 });

    const buckets = await supabase.storage.listBuckets();
    if (buckets.error) throw new Error(buckets.error.message);
    if (!buckets.data?.some((bucket) => bucket.name === BUCKET)) {
      const created = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: String(MAX),
        allowedMimeTypes: [...ALLOWED_TYPES],
      });
      if (created.error && !/already exists/i.test(created.error.message)) throw new Error(created.error.message);
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const uploaded = await supabase.storage.from(BUCKET).upload(
      storagePath,
      new Uint8Array(await file.arrayBuffer()),
      { contentType: file.type, upsert: false, cacheControl: "31536000" },
    );
    if (uploaded.error) throw new Error(uploaded.error.message);

    const url = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
    const nextImages = [...uniqueExistingImages, url];
    const saved = await supabase.from("User").update({
      actionImages: nextImages,
      updatedAt: new Date().toISOString(),
    }).eq("id", user.id);
    if (saved.error) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw new Error(saved.error.message);
    }

    return NextResponse.json({ ok: true, url, path: storagePath, count: nextImages.length, limit });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Upload impossible.",
    }, { status: 500 });
  }
}
