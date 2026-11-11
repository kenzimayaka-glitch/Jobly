import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { getRecruiterProfileForAuthUser } from "../../../../../lib/server-auth";

const TERMS_VERSION = "JOBLY-MOBILITY-EMPLOYER-2026-11-05-v1";
const TERMS = [
  "L'employeur confirme l'offre et le salaire approuvé rattachés à la candidature.",
  "L'employeur accepte de garantir le financement Mobility convenu selon le dossier et le plan de remboursement accepté.",
  "Le remboursement est plafonné à trois (3) mois et ne peut dépasser les montants et conditions documentés.",
  "La fin du contrat de travail ne libère pas automatiquement les obligations déjà contractées.",
  "Aucune garantie ne rend éligible un dossier qui échoue aux critères Mobility.",
].join(" ");

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (!["RECRUITER", "ADMIN"].includes(String(user.role || "").toUpperCase())) {
      return NextResponse.json({ message: "Accès recruteur requis." }, { status: 403 });
    }
    const { data, error } = await db.from("MobilityCompanyAgreement")
      .select("id,companyName,accepted,acceptedAt,termsVersion,repaymentGuaranteed,payrollDeductionMonths,terminationDoesNotRelease")
      .eq("recruiterUserId", user.id)
      .order("acceptedAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ agreement: data, termsVersion: TERMS_VERSION, terms: TERMS });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Convention indisponible." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (!["RECRUITER", "ADMIN"].includes(String(user.role || "").toUpperCase())) {
      return NextResponse.json({ message: "Seul un compte recruteur autorisé peut accepter la convention." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    if (body.acceptTerms !== true || body.termsVersion !== TERMS_VERSION || body.authorizedRepresentative !== true) {
      return NextResponse.json({ message: "L'acceptation explicite de la convention et la qualité de représentant habilité sont obligatoires.", termsVersion: TERMS_VERSION, terms: TERMS }, { status: 422 });
    }
    const months = Number(body.payrollDeductionMonths ?? 3);
    if (!Number.isInteger(months) || months < 1 || months > 3) {
      return NextResponse.json({ message: "La durée de remboursement doit être comprise entre 1 et 3 mois." }, { status: 400 });
    }

    const profile = await getRecruiterProfileForAuthUser(db, auth.id, user.id);
    const { data: jobs, error: jobsError } = await db.from("RecruiterJob")
      .select("companyName")
      .eq("recruiterUserId", user.id)
      .limit(20);
    if (jobsError) throw new Error(jobsError.message);

    const ownedNames = new Set<string>([
      ...(profile?.companyName ? [String(profile.companyName).trim()] : []),
      ...(jobs ?? []).map((job: { companyName: string }) => String(job.companyName || "").trim()),
    ].filter(Boolean));
    const requestedCompany = String(body.companyName || "").trim();
    const companyName = requestedCompany && ownedNames.has(requestedCompany)
      ? requestedCompany
      : (ownedNames.size === 1 ? [...ownedNames][0] : "");
    if (!companyName) {
      return NextResponse.json({ message: "L'entreprise doit correspondre au profil recruteur ou à l'un de ses postes publiés." }, { status: 422 });
    }

    const acceptedAt = new Date().toISOString();
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;
    const { data: agreement, error } = await db.from("MobilityCompanyAgreement").insert({
      recruiterUserId: user.id,
      companyName,
      accepted: true,
      acceptedAt,
      acceptedByUserId: user.id,
      termsVersion: TERMS_VERSION,
      repaymentGuaranteed: true,
      terminationDoesNotRelease: true,
      payrollDeductionMonths: months,
      acceptanceIp: forwarded,
      acceptanceUserAgent: userAgent,
    }).select("id,companyName,accepted,acceptedAt,termsVersion,repaymentGuaranteed,payrollDeductionMonths,terminationDoesNotRelease").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ agreement, termsVersion: TERMS_VERSION }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Acceptation de convention impossible." }, { status: 500 });
  }
}
