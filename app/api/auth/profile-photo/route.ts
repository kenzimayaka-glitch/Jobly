import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthUser } from "../../../../lib/server-auth";
import crypto from "node:crypto";
import sharp from "sharp";
import { getProfilePhotoFormat, PROFILE_HERO_MAX_INPUT_BYTES, PROFILE_PHOTO_BUCKET_MAX_BYTES, PROFILE_PHOTO_MAX_INPUT_BYTES } from "../../../../lib/profilePhoto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const form = await request.formData();
    const kind = form.get("kind") === "hero" ? "hero" : "profile";
    const file = form.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ message: "Photo manquante." }, { status: 400 });
    const maxInputBytes = kind === "hero" ? PROFILE_HERO_MAX_INPUT_BYTES : PROFILE_PHOTO_MAX_INPUT_BYTES;
    if (file.size <= 0 || file.size > maxInputBytes) {
      return NextResponse.json({
        message: kind === "hero" ? "Le visuel Hero source dépasse 10 Mo." : "La photo doit faire au maximum 5 Mo.",
      }, { status: 400 });
    }

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    const metadata = await sharp(inputBytes, { limitInputPixels: 40_000_000 }).metadata().catch(() => null);
    if (!metadata?.width || !metadata.height) {
      return NextResponse.json({ message: "Le fichier image est illisible ou invalide." }, { status: 400 });
    }
    const imageFormat = getProfilePhotoFormat(metadata.format);
    if (!imageFormat || file.type.toLowerCase() !== imageFormat.mimeType) {
      return NextResponse.json({ message: "Format image non pris en charge ou type MIME incohérent." }, { status: 400 });
    }
    if (kind === "hero" && (imageFormat.mimeType !== "image/png" || !metadata.hasAlpha)) {
      return NextResponse.json({ message: "Le visuel Hero doit être un PNG avec transparence." }, { status: 400 });
    }

    // The bucket is limited to exactly 5,000,000 bytes. Hero PNGs are normalized
    // before upload so the API can accept a larger source without exceeding storage.
    let bytes = inputBytes;
    if (kind === "hero") {
      try {
        bytes = new Uint8Array(await sharp(inputBytes, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
          .toBuffer());
      } catch {
        return NextResponse.json({ message: "Le visuel Hero n'a pas pu être optimisé." }, { status: 400 });
      }
    }
    if (bytes.byteLength > PROFILE_PHOTO_BUCKET_MAX_BYTES) {
      return NextResponse.json({ message: "L’image optimisée dépasse la limite de stockage de 5 Mo." }, { status: 413 });
    }

    const supabase = adminClient();
    const bucket = "profile-photos";
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) throw new Error(bucketsError.message);
    if (!buckets?.some((b) => b.name === bucket)) {
      const { error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: PROFILE_PHOTO_BUCKET_MAX_BYTES,
        allowedMimeTypes: ["image/*"],
      });
      if (error && !error.message.toLowerCase().includes("already exists")) throw new Error(error.message);
    }

    const { data: user } = await supabase.from("User").select("id,profilePhotoUrl").eq("authUserId", authUser.id).maybeSingle();
    if (!user) return NextResponse.json({ message: "Profil JOBLY introuvable." }, { status: 404 });

    let path: string;
    if (kind === "hero") {
      const sourceUrl = user.profilePhotoUrl;
      const publicMarker = "/storage/v1/object/public/profile-photos/";
      const sourceIndex = typeof sourceUrl === "string" ? sourceUrl.indexOf(publicMarker) : -1;
      if (sourceIndex < 0) return NextResponse.json({ message: "Photo source introuvable." }, { status: 409 });
      const sourcePath = sourceUrl.slice(sourceIndex + publicMarker.length);
      if (!sourcePath || !sourcePath.startsWith(`${authUser.id}/`)) return NextResponse.json({ message: "Photo source invalide." }, { status: 403 });
      path = `${sourcePath}.hero.png`;
    } else {
      path = `${authUser.id}/${crypto.randomUUID()}.${imageFormat.extension}`;
    }
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: imageFormat.mimeType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (uploadError && !(kind === "hero" && /already exists|duplicate/i.test(uploadError.message))) throw new Error(uploadError.message);
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

    if (kind === "profile") {
      const { error: updateError } = await supabase.from("User").update({ profilePhotoUrl: publicData.publicUrl, updatedAt: new Date().toISOString() }).eq("id", user.id);
      if (updateError) {
        await supabase.storage.from(bucket).remove([path]).catch(() => null);
        throw new Error(updateError.message);
      }
      const heroUrl = supabase.storage.from(bucket).getPublicUrl(`${path}.hero.png`).data.publicUrl;
      return NextResponse.json({ ok: true, url: publicData.publicUrl, heroUrl });
    }

    return NextResponse.json({ ok: true, url: publicData.publicUrl });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer la photo." }, { status: 500 });
  }
}
