import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthUser } from "../../../../lib/server-auth";
import { enforceApiRateLimit } from "../../../../lib/server-security";
import crypto from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const rateLimited = await enforceApiRateLimit(request, supabase, {
      scope: "auth-profile-photo-upload",
      identity: authUser.id,
      accountWindows: [{ limit: 8, windowSeconds: 3600 }, { limit: 20, windowSeconds: 86400 }],
      ipWindows: [{ limit: 20, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (rateLimited) return rateLimited;
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 12 * 1024 * 1024) return NextResponse.json({ message: "Le fichier dépasse la taille maximale autorisée." }, { status: 413 });
    const form = await request.formData();
    const kind = form.get("kind") === "hero" ? "hero" : "profile";
    const file = form.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ message: "Photo manquante." }, { status: 400 });
    const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedImageTypes.has(file.type)) return NextResponse.json({ message: "Formats acceptés : JPEG, PNG ou WebP." }, { status: 415 });
    if (kind === "hero" && file.type !== "image/png") return NextResponse.json({ message: "Le visuel Hero doit être un PNG transparent." }, { status: 400 });
    if (file.size < 12 || file.size > (kind === "hero" ? 10 : 5) * 1024 * 1024) return NextResponse.json({ message: kind === "hero" ? "Le visuel Hero est trop volumineux ou invalide." : "La photo doit faire au maximum 5 Mo." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const hasJpeg = file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const hasPng = file.type === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const hasWebp = file.type === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!(hasJpeg || hasPng || hasWebp)) return NextResponse.json({ message: "Le contenu du fichier ne correspond pas à une image JPEG, PNG ou WebP valide." }, { status: 415 });

    const bucket = "profile-photos";
    const bucketOptions = {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    };
    const { data: existingBucket, error: bucketLookupError } = await supabase.storage.getBucket(bucket);
    if (bucketLookupError && !/not found/i.test(bucketLookupError.message)) throw new Error(bucketLookupError.message);
    if (!existingBucket) {
      const created = await supabase.storage.createBucket(bucket, bucketOptions);
      if (created.error && !/already exists/i.test(created.error.message)) throw new Error(created.error.message);
    }
    const bucketUpdate = await supabase.storage.updateBucket(bucket, bucketOptions);
    if (bucketUpdate.error) throw new Error(bucketUpdate.error.message);

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
      const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      path = `${authUser.id}/${crypto.randomUUID()}.${extension}`;
    }
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (uploadError && !(kind === "hero" && /already exists|duplicate/i.test(uploadError.message))) throw new Error(uploadError.message);
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

    if (kind === "profile") {
      const { error: updateError } = await supabase.from("User").update({ profilePhotoUrl: publicData.publicUrl, updatedAt: new Date().toISOString() }).eq("id", user.id);
      if (updateError) throw new Error(updateError.message);
      const heroUrl = supabase.storage.from(bucket).getPublicUrl(`${path}.hero.png`).data.publicUrl;
      return NextResponse.json({ ok: true, url: publicData.publicUrl, heroUrl });
    }

    return NextResponse.json({ ok: true, url: publicData.publicUrl });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer la photo." }, { status: 500 });
  }
}
