import { notFound } from "next/navigation";
import { loadPublicOfficialListing } from "../../../../lib/recruitment360/publicListing";
import { renderWebHtml } from "../../../../lib/recruitment360/officialListing";

export const dynamic = "force-dynamic";\nexport const runtime = "nodejs";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  return {
    title: "Listing officiel Jobly",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PublicRecruitmentListingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const data = await loadPublicOfficialListing(token);
    const html = renderWebHtml(data);
    const body = html.replace(/^<!doctype html>/i, "").replace(/<html[^>]*>/i, "").replace(/<\\/html>/i, "");
    return <div dangerouslySetInnerHTML={{ __html: body }} />;
  } catch {
    notFound();
  }
}
