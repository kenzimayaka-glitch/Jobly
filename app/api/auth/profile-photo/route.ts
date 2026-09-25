import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthUser } from "../../../../lib/server-auth";
import crypto from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const form = await request.formData();
    const kind = form.get("kind") === "hero" ? "hero" : "profile";
    const file = form.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ message: "Photo manquante." }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ message: "Le fichier doit être une image." }, { status: 400 });
    if (kind === "hero" && file.type !== "image/png") return NextResponse.json({ message: "Le visuel Hero doit être un PNG transparent." }, { status: 400 });
    if (file.size > (kind === "hero" ? 10 : 5) * 1024 * 1024) return NextResponse.json({ message: kind === "hero" ? "Le visuel Hero est trop volumineux." : "La photo doit faire au maximum 5 Mo." }, { status: 400 });

    const supabase = adminClient();
    const bucket = "profile-photos";
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucket)) {
      const { error } = await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: "5MB", allowedMimeTypes: ["image/*"] });
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
      const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      path = `${authUser.id}/${crypto.randomUUID()}.${extension}`;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
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
