"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Program = {
  id: string; code: string; name: string; description?: string | null;
  budgetTotal: number; currency: string; capacity?: number | null;
};

type MobilityRequest = {
  id: string; eligibilityStatus: string; eligibilityThresholdPercent: number;
  eligibilityBurdenPercent: number | null; recruiterGuaranteed: boolean;
  recruiterGuaranteeId: string | null; status: string;
};

export default function MobilityProgramsPage() {
  const router = useRouter();
  const [request, setRequest] = useState<MobilityRequest | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [message, setMessage] = useState("Chargement du dossier et des programmes…");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const raw = localStorage.getItem("jobly-mobility-request");
    if (!raw) {
      setMessage("Aucun dossier Mobility n'est enregistré sur cet appareil.");
      return;
    }
    const localRequest = JSON.parse(raw);
    const session = await getSupabaseClient().auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) { setMessage("Session requise."); return; }

    const [requestResponse, programResponse] = await Promise.all([
      fetch("/api/mobility/request?requestId=" + encodeURIComponent(localRequest.id), { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/mobility/programs", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const requestPayload = await requestResponse.json().catch(() => ({}));
    const programPayload = await programResponse.json().catch(() => ({}));
    if (!requestResponse.ok) throw new Error(requestPayload.message || "Dossier Mobility indisponible.");
    if (!programResponse.ok) throw new Error(programPayload.message || "Programmes indisponibles.");
    setRequest(requestPayload.request);
    localStorage.setItem("jobly-mobility-request", JSON.stringify(requestPayload.request));
    setPrograms(programPayload.programs || []);
    setApplications(requestPayload.programApplications || []);
    setMessage("");
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Chargement impossible."));
  }, []);

  async function apply(programId: string) {
    if (!request) return;
    setBusy(programId);
    setMessage("");
    try {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Session requise.");
      const response = await fetch("/api/mobility/program-applications", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, programId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Candidature au programme impossible.");
      await load();
      setMessage("Candidature transmise à l'institution. Aucun financement n'est réputé approuvé à ce stade.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Candidature impossible.");
    } finally {
      setBusy(null);
    }
  }

  const canApply = request?.eligibilityStatus === "ELIGIBLE"
    && Number(request.eligibilityThresholdPercent) === 50
    && request.recruiterGuaranteed === true
    && Boolean(request.recruiterGuaranteeId);

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <button onClick={() => router.push("/bons-plans/mobility/talent/status")} className="text-sm font-bold text-[#0A3D9C]">← Retour au dossier</button>
        <span className="mt-5 inline-block rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">PROGRAMMES DE FINANCEMENT</span>
        <h1 className="mt-4 text-3xl font-black">Trouver un programme Mobility</h1>
        <p className="mt-2 text-sm text-slate-500">Seuls les programmes dont l'engagement budgétaire a été vérifié par Jobly apparaissent ici. Le dépôt d'une candidature ne vaut pas accord de financement.</p>

        {request && (
          <section className="mt-6 rounded-[24px] border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-black text-slate-400">ÉLIGIBILITÉ DU DOSSIER</p><b className="text-lg">{request.eligibilityStatus}</b></div>
              <div><p className="text-xs font-black text-slate-400">CHARGE / SEUIL</p><b>{request.eligibilityBurdenPercent ?? "—"} % / 50 %</b></div>
              <div><p className="text-xs font-black text-slate-400">GARANTIE RECRUTEUR</p><b>{request.recruiterGuaranteed ? "Acceptée" : "En attente"}</b></div>
            </div>
            {!canApply && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La candidature programme sera possible après validation de l'éligibilité et acceptation de la garantie recruteur.</p>}
          </section>
        )}

        {message && <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{message}</p>}
        <section className="mt-7 grid gap-4">
          <h2 className="text-xl font-black">Programmes ouverts</h2>
          {programs.map((program) => {
            const existing = applications.find((application) => application.programId === program.id);
            return (
              <article key={program.id} className="rounded-[24px] border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-black text-slate-400">{program.code}</p><h3 className="mt-1 text-lg font-black">{program.name}</h3></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Engagement vérifié</span>
                </div>
                {program.description && <p className="mt-2 text-sm text-slate-600">{program.description}</p>}
                <p className="mt-3 text-sm text-slate-500">Budget de programme : {Number(program.budgetTotal).toLocaleString("fr-FR")} {program.currency} · Capacité : {program.capacity ?? "—"}</p>
                {existing ? (
                  <p className="mt-4 text-sm font-bold">Candidature : {existing.status}</p>
                ) : (
                  <button disabled={!canApply || busy === program.id} onClick={() => apply(program.id)} className="mt-4 rounded-full bg-[#0A3D9C] px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                    {busy === program.id ? "Envoi…" : "Candidater au programme"}
                  </button>
                )}
              </article>
            );
          })}
          {!programs.length && !message && <p className="rounded-2xl border border-dashed p-6 text-sm text-slate-600">Aucun programme financé n'est actuellement ouvert. Les programmes de démonstration sont volontairement exclus.</p>}
        </section>
      </div>
    </main>
  );
}
