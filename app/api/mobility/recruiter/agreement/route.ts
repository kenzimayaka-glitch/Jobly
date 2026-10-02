import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../../../lib/mobilityServer";

export async function POST(req: NextRequest) {
  try {
    const au = await authUser(req);
    if (!au) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const u = await ensureUser(sb, au);
    if (String(u.role) !== "RECRUITER" && String(u.role) !== "ADMIN") {
      return NextResponse.json({ message: "Seul un recruteur autorisé peut signer la convention Mobility." }, { status: 403 });
    }
    const b = await req.json();
    if (!b.companyName || !b.accepted) return NextResponse.json({ message: "L'acceptation explicite de la convention est requise." }, { status: 400 });

    const row = {
      recruiterUserId: u.id,
      companyName: String(b.companyName),
      accepted: true,
      acceptedAt: new Date().toISOString(),
      termsVersion: String(b.termsVersion || "mobility-employer-v1"),
      repaymentGuaranteed: true,
      terminationDoesNotRelease: true,
      payrollDeductionMonths: 3,
      paymentProvider: b.paymentProvider || null,
      paymentAccountRef: b.paymentAccountRef || null,
      evidenceUrl: b.evidenceUrl || null,
      updatedAt: new Date().toISOString(),
    };
    const { data, error } = await sb.from("MobilityCompanyAgreement").insert(row).select("*").single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    return NextResponse.json({
      agreement: data,
      rule: "L'entreprise garantit le remboursement sur 3 mois. Une rupture du contrat de travail ne libère pas l'entreprise de son obligation.",
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Convention impossible." }, { status: 500 });
  }
}
