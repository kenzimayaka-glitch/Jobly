import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { authUser, adminClient, ensureUser } from "../../../../../lib/mobilityServer";
import {
  getInstitutionMobilityRequestIds,
  getRecruiterMobilityRequestIds,
  getUserMobilityInstitutionIds,
  getMobilityProviderRequestIds,
} from "../../../../../lib/mobilityAccess";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const limited = await enforceApiRateLimit(req, sb, {
      scope: "mobility-partner-report-export",
      identity: user.id,
      accountWindows: [{ limit: 5, windowSeconds: 3600 }, { limit: 20, windowSeconds: 86400 }],
      ipWindows: [{ limit: 10, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const role = String(user.role || "").toUpperCase();
    const isAdmin = role === "ADMIN";
    const isRecruiter = role === "RECRUITER";
    const requestIds = new Set<string>();

    if (!isAdmin) {
      const institutionIds = await getUserMobilityInstitutionIds(sb, String(user.id));
      for (const institutionId of institutionIds) {
        const ids = await getInstitutionMobilityRequestIds(sb, institutionId);
        ids.forEach((id) => requestIds.add(id));
      }

      if (isRecruiter) {
        const ids = await getRecruiterMobilityRequestIds(sb, String(user.id));
        ids.forEach((id) => requestIds.add(id));
      }

      const providerIds = await getMobilityProviderRequestIds(sb, String(user.id));
      providerIds.forEach((id) => requestIds.add(id));

      if (!institutionIds.length && !isRecruiter && !providerIds.length) {
        return NextResponse.json({
          message: "Aucun lien actif vers un dossier Mobility : institution, recrutement ou affectation prestataire vérifiée requis.",
        }, { status: 403 });
      }
    }

    let query = sb.from("MobilityRequest")
      .select("id,departCity,arriveeCity,distanceKm,costTotal,subventionPercent,status,eligibilityStatus,eligibilityBurdenPercent,createdAt")
      .order("createdAt", { ascending: false });
    if (!isAdmin) {
      const ids = [...requestIds];
      if (ids.length === 0) {
        return exportRows([], req);
      }
      query = query.in("id", ids);
    }

    const { data, error } = await query;
    if (error) throw new Error("MOBILITY_REPORT_LOOKUP_FAILED: " + error.message);
    return exportRows(data || [], req);
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Rapport Mobility indisponible.",
    }, { status: 500 });
  }
}

async function exportRows(rows: any[], req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  if (format === "json") return NextResponse.json({ rows, count: rows.length }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mobility");
    worksheet.columns = [
      { header: "ID", key: "id" },
      { header: "Départ", key: "departCity" },
      { header: "Arrivée", key: "arriveeCity" },
      { header: "Distance km", key: "distanceKm" },
      { header: "Coût total", key: "costTotal" },
      { header: "Subvention %", key: "subventionPercent" },
      { header: "Éligibilité", key: "eligibilityStatus" },
      { header: "Charge %", key: "eligibilityBurdenPercent" },
      { header: "Statut", key: "status" },
      { header: "Créé le", key: "createdAt" },
    ];
    worksheet.addRows(rows);
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=jobly-mobility-report.xlsx",
        "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization",
      },
    });
  }

  const header = "id;depart;arrivee;distanceKm;costTotal;subventionPercent;eligibilityStatus;eligibilityBurdenPercent;status;createdAt\n";
  const csv = header + rows.map((row) => [
    row.id, row.departCity, row.arriveeCity, row.distanceKm, row.costTotal,
    row.subventionPercent, row.eligibilityStatus, row.eligibilityBurdenPercent, row.status, row.createdAt,
  ].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=jobly-mobility-report.csv",
      "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization",
    },
  });
}
