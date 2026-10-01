import { NextRequest, NextResponse } from "next/server";
import { loadPublicOfficialListing } from "../../../../../../../lib/recruitment360/publicListing";
import { renderPdf } from "../../../../../../../lib/recruitment360/officialListing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await loadPublicOfficialListing(token);
    const pdf = await renderPdf(data);
    return new NextResponse(pdf as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="listing-officiel-jobly-v${data.versionNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Listing indisponible." }, { status: 404 });
  }
}
