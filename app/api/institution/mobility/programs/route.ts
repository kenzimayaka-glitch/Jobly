import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { getUserMobilityInstitutionIds } from "../../../../../lib/mobilityAccess";

const isHttps = (value: unknown) => {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!institutionIds.length) return NextResponse.json({ message: "Membre INSTITUTION_ADMIN actif requis." }, { status: 403 });
    const { data, error } = await db.from("MobilityProgram")
      .select("id,institutionId,code,name,description,status,capacity,budgetTotal,currency,eligibilityRule,fundingModel,commitmentReference,commitmentEvidenceUrl,commitmentVerifiedAt,startsAt,endsAt")
      .in("institutionId", institutionIds)
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ programs: data || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Programmes indisponibles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const body = await req.json().catch(() => ({}));
    const institutionId = String(body.institutionId || "").trim();
    const code = String(body.code || "").trim().toUpperCase();
    const name = String(body.name || "").trim();
    const budgetTotal = Number(body.budgetTotal);
    const capacity = body.capacity === null || body.capacity === undefined || body.capacity === "" ? null : Number(body.capacity);
    const currency = String(body.currency || "XAF").toUpperCase();
    const commitmentReference = String(body.commitmentReference || "").trim();
    const commitmentEvidenceUrl = String(body.commitmentEvidenceUrl || "").trim();
    if (!institutionId || !code || !name || !Number.isFinite(budgetTotal) || budgetTotal <= 0
      || (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0))
      || currency !== "XAF" || !commitmentReference || !isHttps(commitmentEvidenceUrl)) {
      return NextResponse.json({ message: "Code, nom, budget XAF, capacité positive (si définie), référence d'engagement et justificatif HTTPS sont obligatoires." }, { status: 400 });
    }
    const institutionIds = await getUserMobilityInstitutionIds(db, String(user.id));
    if (!institutionIds.includes(institutionId)) return NextResponse.json({ message: "Ce programme n'appartient pas à une institution administrée par ce compte." }, { status: 403 });

    const { data, error } = await db.from("MobilityProgram").insert({
      institutionId,
      code,
      name,
      description: String(body.description || "").trim() || null,
      status: "DRAFT",
      capacity,
      budgetTotal,
      currency,
      eligibilityRule: {
        mobilityThresholdPercent: 50,
        requiresEmployerAgreement: true,
        requiresRecruiterGuarantee: true,
        repaymentMonths: 3,
      },
      fundingModel: String(body.fundingModel || "REPAYABLE_ADVANCE"),
      commitmentReference,
      commitmentEvidenceUrl,
    }).select("id,institutionId,code,name,status,budgetTotal,currency,commitmentReference,commitmentEvidenceUrl").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({
      program: data,
      message: "Programme créé en brouillon. Un administrateur Jobly doit vérifier la preuve d'engagement budgétaire avant activation et allocation.",
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Création du programme impossible." }, { status: 500 });
  }
}
