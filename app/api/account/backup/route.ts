import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { adminClient, ensureUser, getAuthUser, newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMAT = "jobly-account-backup";
const VERSION = 1;
const MAX_BYTES = 2 * 1024 * 1024;

function checksum(data: unknown) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function checksumMatches(expected: string, actual: string) {
  if (!/^[a-f0-9]{64}$/i.test(expected) || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function optionalText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

function cleanList(value: unknown, max = 50): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, 160));
}

function asDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise ou appareil révoqué." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, authUser);
    const [profile, experiences, skills, education, applications] = await Promise.all([
      db.from("Profile").select("firstName,lastName,phone,country,headline,summary,location,targetRoles,preferredSectors,targetCities,contractPreferences,remotePreference").eq("userId", user.id).maybeSingle(),
      db.from("Experience").select("company,title,startDate,endDate,description,provenance").eq("userId", user.id).order("startDate", { ascending: false }),
      db.from("Skill").select("name,level,provenance").eq("userId", user.id).order("name"),
      db.from("Education").select("institution,degree,field,startDate,endDate,provenance").eq("userId", user.id).order("startDate", { ascending: false }),
      db.from("Application").select("status,language,submittedAt,createdAt,updatedAt,jobId,recruiterJobId").eq("userId", user.id).order("createdAt", { ascending: false }),
    ]);
    for (const result of [profile, experiences, skills, education, applications]) {
      if (result.error) throw new Error(result.error.message);
    }

    const data = {
      user: {
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        country: user.country,
      },
      profile: profile.data || {},
      experiences: experiences.data || [],
      skills: skills.data || [],
      education: education.data || [],
      applicationHistory: applications.data || [],
    };
    const generatedAt = new Date().toISOString();
    return NextResponse.json({
      format: FORMAT,
      version: VERSION,
      generatedAt,
      checksum: checksum(data),
      data,
      restorePolicy: "Les candidatures sont conservées comme historique de référence et ne sont jamais recréées ni écrasées lors d'une restauration.",
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Sauvegarde impossible." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise ou appareil révoqué." }, { status: 401 });
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return NextResponse.json({ message: "Fichier de sauvegarde trop volumineux (2 Mo maximum pour les données structurées)." }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (body.format !== FORMAT || body.version !== VERSION || !body.data || typeof body.data !== "object") {
      return NextResponse.json({ message: "Format de sauvegarde Jobly non reconnu." }, { status: 400 });
    }
    const data = body.data as Record<string, unknown>;
    const actualChecksum = checksum(data);
    if (typeof body.checksum !== "string" || !checksumMatches(body.checksum, actualChecksum)) {
      return NextResponse.json({ message: "L'intégrité de la sauvegarde n'a pas pu être vérifiée." }, { status: 422 });
    }

    const db = adminClient();
    const user = await ensureUser(db, authUser);
    const profileData = data.profile && typeof data.profile === "object" ? data.profile as Record<string, unknown> : {};
    const userData = data.user && typeof data.user === "object" ? data.user as Record<string, unknown> : {};

    const userUpdate: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of ["displayName", "firstName", "lastName", "phone", "country"] as const) {
      if (typeof userData[key] === "string") userUpdate[key] = optionalText(userData[key], key === "displayName" ? 100 : 180);
    }
    if (Object.keys(userUpdate).length > 1) {
      const { error } = await db.from("User").update(userUpdate).eq("id", user.id);
      if (error) throw new Error(error.message);
    }

    const profilePayload: Record<string, unknown> = { userId: user.id };
    const textFields = ["firstName", "lastName", "phone", "country", "headline", "summary", "location"] as const;
    for (const key of textFields) {
      if (typeof profileData[key] === "string") profilePayload[key] = optionalText(profileData[key], key === "summary" ? 6000 : 240);
    }
    for (const key of ["targetRoles", "preferredSectors", "targetCities", "contractPreferences"] as const) {
      if (Array.isArray(profileData[key])) profilePayload[key] = cleanList(profileData[key]);
    }
    if (typeof profileData.remotePreference === "string" && ["YES", "NO", "INDIFFERENT"].includes(profileData.remotePreference)) {
      profilePayload.remotePreference = profileData.remotePreference;
    }
    if (Object.keys(profilePayload).length > 1) {
      const { data: existing, error: lookupError } = await db.from("Profile").select("id").eq("userId", user.id).maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      const { error } = await db.from("Profile").upsert({ id: existing?.id || newId(), ...profilePayload }, { onConflict: "userId" });
      if (error) throw new Error(error.message);
    }

    const [existingExperiences, existingSkills, existingEducation] = await Promise.all([
      db.from("Experience").select("company,title,startDate").eq("userId", user.id),
      db.from("Skill").select("name").eq("userId", user.id),
      db.from("Education").select("institution,degree,field").eq("userId", user.id),
    ]);
    for (const result of [existingExperiences, existingSkills, existingEducation]) if (result.error) throw new Error(result.error.message);

    const experienceKeys = new Set((existingExperiences.data || []).map((row) => [row.company, row.title, row.startDate].map((v) => String(v || "").trim().toLowerCase()).join("|")));
    const experienceRows = (Array.isArray(data.experiences) ? data.experiences : []).slice(0, 100).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const company = optionalText(row.company, 180), title = optionalText(row.title, 180), startDate = asDate(row.startDate);
      if (!company || !title || !startDate) return [];
      const key = [company, title, startDate].map((v) => v.toLowerCase()).join("|");
      if (experienceKeys.has(key)) return [];
      experienceKeys.add(key);
      return [{ id: newId(), userId: user.id, company, title, startDate, endDate: asDate(row.endDate), description: optionalText(row.description, 4000) }];
    });
    if (experienceRows.length) {
      const { error } = await db.from("Experience").insert(experienceRows);
      if (error) throw new Error(error.message);
    }

    const skillKeys = new Set((existingSkills.data || []).map((row) => String(row.name || "").trim().toLowerCase()));
    const skillRows = (Array.isArray(data.skills) ? data.skills : []).slice(0, 200).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const name = optionalText(row.name, 120);
      if (!name || skillKeys.has(name.toLowerCase())) return [];
      skillKeys.add(name.toLowerCase());
      return [{ id: newId(), userId: user.id, name, level: optionalText(row.level, 60) }];
    });
    if (skillRows.length) {
      const { error } = await db.from("Skill").insert(skillRows);
      if (error) throw new Error(error.message);
    }

    const educationKeys = new Set((existingEducation.data || []).map((row) => [row.institution, row.degree, row.field].map((v) => String(v || "").trim().toLowerCase()).join("|")));
    const educationRows = (Array.isArray(data.education) ? data.education : []).slice(0, 100).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const institution = optionalText(row.institution, 180);
      if (!institution) return [];
      const degree = optionalText(row.degree, 180), field = optionalText(row.field, 180);
      const key = [institution, degree, field].map((v) => String(v || "").toLowerCase()).join("|");
      if (educationKeys.has(key)) return [];
      educationKeys.add(key);
      return [{ id: newId(), userId: user.id, institution, degree, field, startDate: asDate(row.startDate), endDate: asDate(row.endDate) }];
    });
    if (educationRows.length) {
      const { error } = await db.from("Education").insert(educationRows);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      restored: {
        profile: Object.keys(profilePayload).length > 1,
        experiencesAdded: experienceRows.length,
        skillsAdded: skillRows.length,
        educationAdded: educationRows.length,
        applicationHistory: "preserved-without-replay",
      },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Restauration impossible." }, { status: 500 });
  }
}
