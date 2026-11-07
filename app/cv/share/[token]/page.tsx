import type { Metadata } from "next";
import { adminClient } from "@/lib/server-auth";
import { CvShareView } from "@/components/CvShareView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const supabase = adminClient();
  const { data } = await supabase.from("CVShare")
    .select("candidateNameSnapshot,jobTitleSnapshot,companyNameSnapshot,expiresAt,revokedAt")
    .eq("token",token)
    .maybeSingle();
  const expired = Boolean(data?.expiresAt && new Date(data.expiresAt).getTime() <= Date.now());
  const unavailable = !data || Boolean(data.revokedAt) || expired;
  const name = unavailable ? "Partage indisponible" : data.candidateNameSnapshot || "Talent Jobly";
  const context = unavailable ? "" : data.companyNameSnapshot ? " — Candidature " + data.companyNameSnapshot : data.jobTitleSnapshot ? " — " + data.jobTitleSnapshot : "";
  return {
    title: unavailable ? "CV Jobly indisponible" : "CV " + name + context,
    description: unavailable ? "Ce lien de partage CV n’est plus disponible." : "CV professionnel partagé via Jobly.",
    robots: { index: false, follow: false },
    openGraph: { title: unavailable ? "CV Jobly indisponible" : "CV " + name + context, description: unavailable ? "Ce lien de partage CV n’est plus disponible." : "Consultez ce CV professionnel sur Jobly.", type: "website" },
  };
}

export default async function SharedCvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CvShareView token={token}/>;
}
