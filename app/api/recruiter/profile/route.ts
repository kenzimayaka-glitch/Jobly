import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";
import { enforceApiRateLimit } from "../../../../lib/server-security";

async function resolveRecruiterProfile(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  authUserId: string,
  createIfMissing: boolean,
) {
  const byInternalId = await supabase.from("RecruiterProfile").select("*").eq("userId", userId).maybeSingle();
  if (byInternalId.error) throw new Error(byInternalId.error.message);
  if (byInternalId.data) return byInternalId.data;

  if (authUserId !== userId) {
    const byAuthId = await supabase.from("RecruiterProfile").select("*").eq("userId", authUserId).maybeSingle();
    if (byAuthId.error) throw new Error(byAuthId.error.message);
    if (byAuthId.data) return byAuthId.data;
  }

  if (!createIfMissing) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("RecruiterProfile")
    .insert({ id: newId(), userId, companyName: "Mon entreprise", updatedAt: now })
    .select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

async function recruiterContext(request: NextRequest, scope: string, write = false) {
  const authUser = await getAuthUser(request);
  if (!authUser) return { error: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const supabase = adminClient();
  const user = await ensureUser(supabase, authUser);
  const role = String(user.role || "").toUpperCase();
  let profile = await resolveRecruiterProfile(supabase, user.id, authUser.id, false);
  if (!["RECRUITER", "ADMIN"].includes(role) && !profile) {
    return { error: NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 }) };
  }
  if (!profile) profile = await resolveRecruiterProfile(supabase, user.id, authUser.id, true);
  const limited = await enforceApiRateLimit(request, supabase, {
    scope,
    identity: user.id,
    accountWindows: write
      ? [{ limit: 10, windowSeconds: 60 }, { limit: 60, windowSeconds: 3600 }]
      : [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
    ipWindows: write
      ? [{ limit: 20, windowSeconds: 60 }, { limit: 120, windowSeconds: 3600 }]
      : [{ limit: 60, windowSeconds: 60 }, { limit: 600, windowSeconds: 3600 }],
    requireIp: true,
  });
  if (limited) return { error: limited };
  return { supabase, user, profile, authUser };
}

export async function GET(request: NextRequest) {
  try {
    const context = await recruiterContext(request, "recruiter-profile-read");
    if ("error" in context) return context.error;
    const { profile, user } = context;
    return NextResponse.json(
      { profile: { ...profile, email: user.email || null, phone: user.phone || null } },
      { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } }
    );
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger le profil recruteur." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 24 * 1024) return NextResponse.json({ message: "Profil recruteur trop volumineux." }, { status: 413 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Données de profil invalides." }, { status: 400 });
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    if (!companyName || companyName.length > 160) return NextResponse.json({ message: "Nom d'entreprise invalide (160 caractères maximum)." }, { status: 400 });

    const context = await recruiterContext(request, "recruiter-profile-update", true);
    if ("error" in context) return context.error;
    const { supabase, user, profile } = context;
    const website = typeof body.website === "string" ? body.website.trim() : "";
    if (website && !/^https?:\/\//i.test(website)) {
      return NextResponse.json({ message: "Le site web doit commencer par https:// ou http://." }, { status: 400 });
    }
    const payload = {
      companyName,
      sector: typeof body.sector === "string" ? body.sector.trim().slice(0, 120) || null : null,
      website: website.slice(0, 500) || null,
      location: typeof body.location === "string" ? body.location.trim().slice(0, 200) || null : null,
      updatedAt: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("RecruiterProfile")
      .update(payload).eq("id", profile.id).select("*").single();
    if (error) throw new Error(error.message);

    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 32) || null : null;
    const { error: userUpdateError } = await supabase.from("User")
      .update({ phone, updatedAt: new Date().toISOString() }).eq("id", user.id);
    if (userUpdateError) throw new Error(userUpdateError.message);

    return NextResponse.json(
      { profile: { ...data, email: user.email || null, phone } },
      { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } }
    );
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible d'enregistrer le profil recruteur." }, { status: 500 });
  }
}
