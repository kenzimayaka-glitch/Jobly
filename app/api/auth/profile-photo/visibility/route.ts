import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import {
  PRIVATE_PROFILE_PHOTO_BUCKET,
  PUBLIC_PROFILE_PHOTO_BUCKET,
  getProfilePhotoStoragePath,
  isProfilePhotoPublic,
} from "../../../../../lib/profilePhotoStorage";

const fail = (message: string, status = 400) => NextResponse.json({ message }, { status });

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return fail("Session requise.", 401);
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    return NextResponse.json({
      hasPhoto: Boolean(getProfilePhotoStoragePath(user)),
      visibility: isProfilePhotoPublic(user) ? "PUBLIC" : "PRIVATE",
      publicConsentRecorded: Boolean(user.profilePhotoConsentAt),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Préférence photo indisponible.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return fail("Session requise.", 401);

    const body = await request.json().catch(() => null);
    const visibility = body?.visibility === "PUBLIC" ? "PUBLIC" : body?.visibility === "PRIVATE" ? "PRIVATE" : null;
    if (!visibility) return fail("Choisissez une visibilité valide.", 422);
    if (visibility === "PUBLIC" && body?.explicitConsent !== true) {
      return fail("Une autorisation explicite est nécessaire pour rendre la photo publique.", 422);
    }

    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const storagePath = getProfilePhotoStoragePath(user);
    if (!storagePath) return fail("Ajoutez d'abord une photo de profil.", 409);

    const currentVisibility = isProfilePhotoPublic(user) ? "PUBLIC" : "PRIVATE";
    const sourceBucket = currentVisibility === "PUBLIC" ? PUBLIC_PROFILE_PHOTO_BUCKET : PRIVATE_PROFILE_PHOTO_BUCKET;
    const targetBucket = visibility === "PUBLIC" ? PUBLIC_PROFILE_PHOTO_BUCKET : PRIVATE_PROFILE_PHOTO_BUCKET;

    const { data: source, error: downloadError } = await supabase.storage.from(sourceBucket).download(storagePath);
    if (downloadError || !source) return fail("Photo introuvable dans le stockage actuel. Une migration de la photo est nécessaire.", 409);

    const targetPath = storagePath;
    const heroPath = storagePath + ".hero.png";
    let heroCopied = false;
    if (sourceBucket !== targetBucket) {
      const bytes = new Uint8Array(await source.arrayBuffer());
      const contentType = source.type || "image/jpeg";
      const { error: uploadError } = await supabase.storage.from(targetBucket).upload(targetPath, bytes, {
        contentType,
        upsert: false,
        cacheControl: "3600",
      });
      if (uploadError) throw new Error(uploadError.message);

      const { data: sourceHero } = await supabase.storage.from(sourceBucket).download(heroPath);
      if (sourceHero) {
        const { error: heroUploadError } = await supabase.storage.from(targetBucket).upload(
          heroPath,
          new Uint8Array(await sourceHero.arrayBuffer()),
          { contentType: "image/png", upsert: false, cacheControl: "3600" },
        );
        if (heroUploadError) {
          await supabase.storage.from(targetBucket).remove([targetPath]);
          throw new Error(heroUploadError.message);
        }
        heroCopied = true;
      }
    }

    const now = new Date().toISOString();
    const publicUrl = visibility === "PUBLIC"
      ? supabase.storage.from(targetBucket).getPublicUrl(targetPath).data.publicUrl
      : null;
    const { error: updateError } = await supabase.from("User").update({
      profilePhotoUrl: publicUrl,
      profilePhotoStoragePath: targetPath,
      profilePhotoVisibility: visibility,
      profilePhotoConsentAt: visibility === "PUBLIC" ? now : null,
      updatedAt: now,
    }).eq("id", user.id);

    if (updateError) {
      if (sourceBucket !== targetBucket) {
        await supabase.storage.from(targetBucket).remove(heroCopied ? [targetPath, heroPath] : [targetPath]);
      }
      throw new Error(updateError.message);
    }

    if (sourceBucket !== targetBucket) {
      await supabase.storage.from(sourceBucket).remove([storagePath, heroPath]);
    }

    return NextResponse.json({ ok: true, visibility, publicConsentRecorded: visibility === "PUBLIC" });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Modification de visibilité impossible.", 500);
  }
}
