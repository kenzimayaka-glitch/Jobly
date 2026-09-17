import { redirect } from "next/navigation";

export default async function OffreAliasPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const source = typeof query.source === "string" ? query.source : undefined;
  redirect(`/jobs/${encodeURIComponent(id)}${source ? `?source=${encodeURIComponent(source)}` : ""}`);
}
