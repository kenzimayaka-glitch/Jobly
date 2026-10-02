import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { loadPublicOfficialListing } from "../../../../lib/recruitment360/publicListing";
import { renderWebHtml } from "../../../../lib/recruitment360/officialListing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  return {
    title: "Listing officiel Jobly",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PublicRecruitmentListingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
    const proto = requestHeaders.get("x-forwarded-proto") || "https";
    const origin = host ? `${proto}://${host}` : "";
    const data = await loadPublicOfficialListing(token, origin);
    const html = renderWebHtml(data);
    return (
      <main className="min-h-screen bg-white">
        <iframe
          title="Listing officiel Jobly"
          srcDoc={html}
          className="min-h-screen w-full border-0"
          sandbox="allow-same-origin"
        />
      </main>
    );
  } catch {
    notFound();
  }
}
