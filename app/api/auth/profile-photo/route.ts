import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthUser } from "../../../../lib/server-auth";
import crypto from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) return NextResponse.json({ message: "Photo manquante." }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ message: "Le fichier doit être une image." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "La photo doit faire au maximum 5 Mo." }, { status: 400 });

    const supabase = adminClient();
    const bucket = "profile-photos";
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucket)) {
      const { error } = await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: "5MB", allowedMimeTypes: ["image/*"] });
      if (error && !error.message.toLowerCase().includes("already exists")) throw new Error(error.message);
    }

    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `${authUser.id}/${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

    const { data: user } = await supabase.from("User").select("id").eq("authUserId", authUser.id).maybeSingle();
    if (!user) return NextResponse.json({ message: "Profil JOBLY introuvable." }, { status: 404 });
    const { error: updateError } = await supabase.from("User").update({ profilePhotoUrl: publicData.publicUrl, updatedAt: new Date().toISOString() }).eq("id", user.id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true, url: publicData.publicUrl });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer la photo." }, { status: 500 });
  }
}
