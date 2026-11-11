import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { resolveOwnProfilePhotoUrls } from "@/lib/profilePhotoStorage";


function cleanStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim())
    : [];
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const [profile, experiences, skills, education] = await Promise.all([
      supabase.from("Profile").select("*").eq("userId", user.id).maybeSingle(),
      supabase.from("Experience").select("*").eq("userId", user.id).order("startDate", { ascending: false }),
      supabase.from("Skill").select("*").eq("userId", user.id).order("name"),
      supabase.from("Education").select("*").eq("userId", user.id).order("startDate", { ascending: false }),
    ]);
    for (const result of [profile, experiences, skills, education]) if (result.error) throw new Error(result.error.message);
    const originalCvSignedUrl = user.cvOriginalStoragePath ? (await supabase.storage.from("talent-cvs").createSignedUrl(user.cvOriginalStoragePath, 3600)).data?.signedUrl ?? null : null;
    const photoUrls = await resolveOwnProfilePhotoUrls(supabase, user);
    return NextResponse.json({
      user: { id: user.id, email: user.email, phone: user.phone, displayName: user.displayName, profilePhotoUrl: photoUrls.profilePhotoUrl, heroPhotoUrl: photoUrls.heroPhotoUrl, profilePhotoVisibility: photoUrls.profilePhotoVisibility, pitchVideoUrl: user.pitchVideoUrl ?? null, pitchVideoDurationMs: user.pitchVideoDurationMs ?? null, pitchVideoUpdatedAt: user.pitchVideoUpdatedAt ?? null, englishLevel: user.englishLevel, licences: user.licences ?? [], cvOriginalStoragePath: user.cvOriginalStoragePath ?? null, cvOriginalFileName: user.cvOriginalFileName ?? null, cvOriginalPageCount: user.cvOriginalPageCount ?? null, cvOriginalUploadedAt: user.cvOriginalUploadedAt ?? null, cvOriginalUrl: originalCvSignedUrl },
      profile: profile.data ?? { headline: "", summary: "", location: "", targetRoles: [], preferredSectors: [] },
      experiences: experiences.data ?? [], skills: skills.data ?? [], education: education.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger le profil." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await request.json();
    const section = typeof body.section === "string" ? body.section : "all";
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);

    // Each section is persisted independently. Saving one section never erases another.
    if (section === "profil" || section === "all") {
      const userUpdate: Record<string, unknown> = {};
      if (typeof body.displayName === "string") userUpdate.displayName = body.displayName.trim() || null;
      if (typeof body.englishLevel === "string") userUpdate.englishLevel = body.englishLevel || null;
      if (Array.isArray(body.licences)) userUpdate.licences = cleanStrings(body.licences);
      if (Object.keys(userUpdate).length) {
        userUpdate.updatedAt = new Date().toISOString();
        const { error } = await supabase.from("User").update(userUpdate).eq("id", user.id);
        if (error) throw new Error(error.message);
      }
    }

    if (section === "profil" || section === "objectif" || section === "all") {
      const profilePayload: Record<string, unknown> = { userId: user.id };
      if (typeof body.headline === "string") profilePayload.headline = body.headline.trim() || null;
      if (typeof body.summary === "string") profilePayload.summary = body.summary.trim() || null;
      if (typeof body.phone === "string") profilePayload.phone = body.phone.trim() || null;
      if (typeof body.location === "string") profilePayload.location = body.location.trim() || null;
      if (Array.isArray(body.targetRoles)) profilePayload.targetRoles = cleanStrings(body.targetRoles);
      if (Array.isArray(body.preferredSectors)) profilePayload.preferredSectors = cleanStrings(body.preferredSectors);
      if (section === "objectif") {
        profilePayload.targetRoles = cleanStrings(body.targetRoles);
        profilePayload.preferredSectors = cleanStrings(body.preferredSectors);
      }
      const { data: existing } = await supabase.from("Profile").select("id").eq("userId", user.id).maybeSingle();
      profilePayload.id = existing?.id ?? crypto.randomUUID();
      const { error } = await supabase.from("Profile").upsert(profilePayload, { onConflict: "userId" });
      if (error) throw new Error(error.message);
    }

    // Pattern "insert-then-delete": on écrit d'abord les nouvelles lignes avec de
    // nouveaux id, puis on supprime uniquement les anciennes lignes (celles dont
    // l'id n'est pas dans le nouveau lot). Si l'insertion échoue, rien n'a encore
    // été supprimé : la section précédente reste intacte. Ce n'est pas une vraie
    // transaction SQL (Supabase-js ne l'expose pas ici), mais ça élimine la fenêtre
    // où les données pouvaient être perdues entre le delete et l'insert.
    if (section === "experience" || section === "all") {
      const experiences = Array.isArray(body.experiences) ? body.experiences : [];
      const rows = experiences.map((item: any) => ({
        id: crypto.randomUUID(), userId: user.id, company: String(item.company || "").trim(), title: String(item.title || "").trim(),
        startDate: item.startDate, endDate: item.endDate || null, description: item.description ? String(item.description).trim() : null, provenance: "DECLARED",
      })).filter((item: any) => item.company && item.title && item.startDate);
      if (rows.length) {
        const { error } = await supabase.from("Experience").insert(rows);
        if (error) throw new Error(error.message);
        const { error: delError } = await supabase.from("Experience").delete().eq("userId", user.id).not("id", "in", `(${rows.map((r: { id: string }) => r.id).join(",")})`);
        if (delError) throw new Error(delError.message);
      } else {
        const { error: delError } = await supabase.from("Experience").delete().eq("userId", user.id);
        if (delError) throw new Error(delError.message);
      }
    }

    if (section === "skills" || section === "all") {
      const skills = Array.isArray(body.skills) ? body.skills : [];
      const rows = skills.map((item: any) => ({ id: crypto.randomUUID(), userId: user.id, name: String(item.name || "").trim(), level: item.level || null, provenance: "DECLARED" })).filter((item: any) => item.name);
      if (rows.length) {
        const { error } = await supabase.from("Skill").insert(rows);
        if (error) throw new Error(error.message);
        const { error: delError } = await supabase.from("Skill").delete().eq("userId", user.id).not("id", "in", `(${rows.map((r: { id: string }) => r.id).join(",")})`);
        if (delError) throw new Error(delError.message);
      } else {
        const { error: delError } = await supabase.from("Skill").delete().eq("userId", user.id);
        if (delError) throw new Error(delError.message);
      }
    }

    if (section === "formation" || section === "all") {
      const education = Array.isArray(body.education) ? body.education : [];
      const rows = education.map((item: any) => ({
        id: crypto.randomUUID(), userId: user.id, institution: String(item.institution || "").trim(), degree: item.degree ? String(item.degree).trim() : null,
        field: item.field ? String(item.field).trim() : null, startDate: item.startDate || null, endDate: item.endDate || null, provenance: "DECLARED",
      })).filter((item: any) => item.institution);
      if (rows.length) {
        const { error } = await supabase.from("Education").insert(rows);
        if (error) throw new Error(error.message);
        const { error: delError } = await supabase.from("Education").delete().eq("userId", user.id).not("id", "in", `(${rows.map((r: { id: string }) => r.id).join(",")})`);
        if (delError) throw new Error(delError.message);
      } else {
        const { error: delError } = await supabase.from("Education").delete().eq("userId", user.id);
        if (delError) throw new Error(delError.message);
      }
    }

    if (section === "cv-text") {
      const cvTextPayload: Record<string, unknown> = { userId: user.id };
      if (typeof body.experienceSummary === "string") cvTextPayload.experienceSummary = body.experienceSummary.trim().slice(0, 20000) || null;
      if (typeof body.educationSummary === "string") cvTextPayload.educationSummary = body.educationSummary.trim().slice(0, 12000) || null;
      if (Object.keys(cvTextPayload).length === 1) {
        return NextResponse.json({ message: "Aucune section CV à enregistrer." }, { status: 400 });
      }
      const { data: existing } = await supabase.from("Profile").select("id").eq("userId", user.id).maybeSingle();
      cvTextPayload.id = existing?.id ?? crypto.randomUUID();
      const { error } = await supabase.from("Profile").upsert(cvTextPayload, { onConflict: "userId" });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, section });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer le profil." }, { status: 500 });
  }
}
