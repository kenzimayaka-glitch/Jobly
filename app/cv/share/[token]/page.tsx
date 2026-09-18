import type { Metadata } from "next";
import { adminClient } from "@/lib/server-auth";
import { CvShareView } from "@/components/CvShareView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const supabase = adminClient();
  const { data } = await supabase.from("CVShare").select("candidateNameSnapshot,jobTitleSnapshot,companyNameSnapshot").eq("token",token).maybeSingle();
  const name = data?.candidateNameSnapshot || "Talent Jobly";
  const context = data?.companyNameSnapshot ? " — Candidature " + data.companyNameSnapshot : data?.jobTitleSnapshot ? " — " + data.jobTitleSnapshot : "";
  return {
    title: "CV " + name + context,
    description: "CV professionnel partagé via Jobly.",
    openGraph: { title: "CV " + name + context, description: "Consultez ce CV professionnel sur Jobly.", type: "website" },
  };
}

export default async function SharedCvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CvShareView token={token}/>;
}
