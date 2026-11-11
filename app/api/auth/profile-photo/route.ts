import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import crypto from "node:crypto";
import {
  PRIVATE_PROFILE_PHOTO_BUCKET,
  PUBLIC_PROFILE_PHOTO_BUCKET,
  getProfilePhotoStoragePath,
  isProfilePhotoPublic,
} from "../../../../lib/profilePhotoStorage";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && String.fromCharCode(...bytes.subarray(1, 4)) === "PNG") return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.subarray(0, 6)))) return "image/gif";
  return null;
}

const error = (message: string, status = 400) => NextResponse.json({ message }, { status });

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return error("Session requise.", 401);

    const form = await request.formData();
    const kind = form.get("kind") === "hero" ? "hero" : "profile";
    const file = form.get("photo");
    if (!(file instanceof File)) return error("Photo manquante.");
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return error(kind === "hero" ? "Le visuel Hero doit faire au maximum 5 Mo." : "La photo doit faire au maximum 5 Mo.", 422);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const actualMime = detectImageMime(bytes);
    if (!actualMime || actualMime !== file.type) return error("Format image non supporté ou type MIME incohérent.", 422);
    if (kind === "hero" && actualMime !== "image/png") return error("Le visuel Hero doit être un PNG transparent.");

    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const visibility = kind === "hero"
      ? (isProfilePhotoPublic(user) ? "PUBLIC" : "PRIVATE")
      : (form.get("visibility") === "PUBLIC" ? "PUBLIC" : "PRIVATE");
    if (kind === "profile" && visibility === "PUBLIC" && form.get("publicPhotoConsent") !== "true") {
      return error("Confirmez explicitement que vous autorisez la publication de votre photo.", 422);
    }

    const bucket = visibility === "PUBLIC" ? PUBLIC_PROFILE_PHOTO_BUCKET : PRIVATE_PROFILE_PHOTO_BUCKET;
    const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(bucket);
    if (bucketError || !bucketInfo || (visibility === "PRIVATE" && bucketInfo.public)) {
      return error("Le stockage photo privé/public n'est pas correctement configuré. Réessayez après la configuration LOT-00.", 503);
    }

    let storagePath: string;
    if (kind === "hero") {
      const sourcePath = getProfilePhotoStoragePath(user);
      if (!sourcePath) return error("Photo source introuvable.", 409);
      storagePath = `${sourcePath}.hero.png`;
    } else {
      storagePath = `${authUser.id}/${crypto.randomUUID()}.${MIME_EXTENSIONS[actualMime]}`;
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
      contentType: actualMime,
      upsert: kind === "hero",
      cacheControl: "3600",
    });
    if (uploadError) throw new Error(uploadError.message);

    const storage = supabase.storage.from(bucket);
    const photoUrl = visibility === "PUBLIC"
      ? storage.getPublicUrl(storagePath).data.publicUrl
      : (await storage.createSignedUrl(storagePath, 3600)).data?.signedUrl ?? null;

    if (kind === "profile") {
      const previousPath = getProfilePhotoStoragePath(user);
      const previousBucket = isProfilePhotoPublic(user) ? PUBLIC_PROFILE_PHOTO_BUCKET : PRIVATE_PROFILE_PHOTO_BUCKET;
      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from("User").update({
        profilePhotoUrl: visibility === "PUBLIC" ? photoUrl : null,
        profilePhotoStoragePath: storagePath,
        profilePhotoVisibility: visibility,
        profilePhotoConsentAt: visibility === "PUBLIC" ? now : null,
        updatedAt: now,
      }).eq("id", user.id);
      if (updateError) {
        await storage.remove([storagePath]).catch(() => undefined);
        throw new Error(updateError.message);
      }
      if (previousPath && (previousPath !== storagePath || previousBucket !== bucket)) {
        await supabase.storage.from(previousBucket).remove([previousPath, `${previousPath}.hero.png`]);
      }
      const heroPath = `${storagePath}.hero.png`;
      const heroUrl = visibility === "PUBLIC"
        ? storage.getPublicUrl(heroPath).data.publicUrl
        : null;
      return NextResponse.json({ ok: true, url: photoUrl, heroUrl, visibility });
    }

    const heroUrl = visibility === "PUBLIC"
      ? storage.getPublicUrl(storagePath).data.publicUrl
      : (await storage.createSignedUrl(storagePath, 3600)).data?.signedUrl ?? null;
    return NextResponse.json({ ok: true, url: heroUrl, visibility });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer la photo." }, { status: 500 });
  }
}
