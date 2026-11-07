import { NextRequest, NextResponse } from "next/server";
import { adminClient, cleanStrings, ensureUser, getAuthUser, getRecruiterProfileForAuthUser, newId } from "../../../../lib/server-auth";
import { enforceRecruiterMarketEntitlement, normalizeRecruiterMarket } from "../../../../lib/recruiterMarket";

async function authorizeRecruiterWorkspace(supabase: ReturnType<typeof adminClient>, user: { id: string; role?: string }, authUserId: string) {
  if (user.role === "RECRUITER" || user.role === "ADMIN") return true;
  const profile = await getRecruiterProfileForAuthUser(supabase, authUserId, user.id);
  if (profile) return true;
  const { data: ownedJob, error: jobsError } = await supabase.from("RecruiterJob").select("id").eq("recruiterUserId", user.id).limit(1).maybeSingle();
  if (jobsError) throw new Error(jobsError.message);
  return Boolean(ownedJob);
}

// NOTE (C0.9.7): cette route interrogeait auparavant une table "recruiter_jobs"
// qui n'existe dans aucune migration ni script SQL du projet, avec le client
// Supabase scoped-session (clé anon + Authorization) et "recruiter_id" = uid
// Supabase brut. Ni la table ni la clé de propriété n'étaient cohérentes avec
// le reste de l'app (Profile/Experience/Skill utilisent tous l'id interne
// "User", pas l'uid Supabase). Réécrite pour suivre exactement le pattern de
// /api/profile : client admin (service role) + "User".id comme clé de
// propriété. RecruiterProfile is Auth-UID-owned by RLS, while RecruiterJob
// remains attached to the internal User.id.

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Session requise." }, { status: 401 });
    }
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    if (!await authorizeRecruiterWorkspace(supabase, user, authUser.id)) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("RecruiterJob")
      .select("*")
      .eq("recruiterUserId", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: data || [] });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erreur." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Session requise." }, { status: 401 });
    }
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    if (!await authorizeRecruiterWorkspace(supabase, user, authUser.id)) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const b = await req.json();
    const title = String(b.title || "").trim();
    const description = String(b.description || "").trim();

    if (!title || !description) {
      return NextResponse.json(
        { message: "Le titre et la description sont obligatoires." },
        { status: 400 }
      );
    }

    let company = String(b.companyName || "").trim();
    if (!company) {
      const profile = await getRecruiterProfileForAuthUser(supabase, authUser.id, user.id);
      company = profile?.companyName || "Mon entreprise";
    }

    const now = new Date().toISOString();
    const market = normalizeRecruiterMarket(b, user.country);
    const entitlement = await enforceRecruiterMarketEntitlement(supabase, user.id, market, b.status === "published" ? "published" : "draft");
    if (!entitlement.ok) return NextResponse.json({ message: entitlement.message }, { status: 403 });
    const payload = {
      id: newId(),
      recruiterUserId: user.id,
      title,
      companyName: company,
      location: String(b.location || "").trim() || null,
      countryCode: market.countryCode,
      distributionScope: market.distributionScope,
      targetCountryCodes: market.targetCountryCodes,
      mode: b.mode || "Hybride",
      contract: b.contract || "CDI",
      salary: String(b.salary || "").trim() || null,
      sector: String(b.sector || "").trim() || null,
      description,
      tags: cleanStrings(b.tags),
      status: b.status === "published" ? "published" : "draft",
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from("RecruiterJob")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ job: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Erreur." },
      { status: 500 }
    );
  }
}
