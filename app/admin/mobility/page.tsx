"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";

export default function AdminMobility() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [message, setMessage] = useState("Chargement des contrôles Mobility…");
  const [busy, setBusy] = useState<string | null>(null);

  async function token() {
    const session = await getSupabaseClient().auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) { router.replace("/"); return; }
    const headers = { Authorization: `Bearer ${authToken}` };
    const [providerResponse, programResponse, fundingResponse] = await Promise.all([
      fetch("/api/mobility/admin/providers", { headers }),
      fetch("/api/mobility/admin/programs", { headers }),
      fetch("/api/mobility/admin/funding/pending", { headers }),
    ]);
    const [providerPayload, programPayload, fundingPayload] = await Promise.all([
      providerResponse.json().catch(() => ({})),
      programResponse.json().catch(() => ({})),
      fundingResponse.json().catch(() => ({})),
    ]);
    if (!providerResponse.ok) throw new Error(providerPayload.message || "Registre prestataire indisponible.");
    if (!programResponse.ok) throw new Error(programPayload.message || "Programmes indisponibles.");
    if (!fundingResponse.ok) throw new Error(fundingPayload.message || "Décaissements en attente indisponibles.");
    setProviders(providerPayload.providers || []);
    setPrograms(programPayload.programs || []);
    setPending(fundingPayload.transactions || []);
    setMessage("");
  }

  useEffect(() => { load().catch((error) => setMessage(error instanceof Error ? error.message : "Chargement impossible.")); }, [router]);

  async function post(path: string, body: any, key: string) {
    setBusy(key);
    setMessage("");
    try {
      const authToken = await token();
      const response = await fetch(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Action impossible.");
      await load();
      setMessage(payload.message || "Contrôle enregistré.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function openKyc(providerId: string) {
    const authToken = await token();
    const response = await fetch("/api/mobility/admin/providers/document?providerId=" + encodeURIComponent(providerId), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.message || "Document indisponible."); return; }
    window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] pb-8">
      <PageHeader eyebrow="ADMIN" label="Mobility" onBack={() => router.push("/admin")} />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-3xl font-black">Gouvernance Mobility</h1>
        <p className="mt-2 text-sm text-slate-500">KYC, engagement budgétaire et preuves de transfert. Le programme DEMO n'est jamais activable pour le financement.</p>
        {message && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}

        <section className="mt-7 rounded-[24px] border bg-white p-5">
          <h2 className="text-xl font-black">Prestataires et KYC</h2>
          <div className="mt-4 space-y-3">
            {providers.map((provider) => (
              <article key={provider.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><b>{provider.displayName}</b><p className="text-sm text-slate-500">{provider.providerType} · {provider.legalName} · {provider.city}</p></div><span className="text-xs font-bold">{provider.kycStatus} / {provider.status}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => openKyc(provider.id)} className="rounded-full border px-4 py-2 text-xs font-bold">Voir KYC privé (5 min)</button>
                  <button disabled={busy === provider.id} onClick={() => post("/api/mobility/admin/providers/verify", { providerId: provider.id, decision: "VERIFY" }, provider.id)} className="rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-bold text-white">Vérifier et activer</button>
                  <button disabled={busy === provider.id} onClick={() => post("/api/mobility/admin/providers/verify", { providerId: provider.id, decision: "REJECT", reason: "Justificatifs insuffisants après examen." }, provider.id)} className="rounded-full border px-4 py-2 text-xs font-bold">Rejeter</button>
                </div>
              </article>
            ))}
            {!providers.length && <p className="text-sm text-slate-500">Aucun prestataire soumis.</p>}
          </div>
        </section>

        <section className="mt-7 rounded-[24px] border bg-white p-5">
          <h2 className="text-xl font-black">Programmes et budgets engagés</h2>
          <div className="mt-4 space-y-3">
            {programs.map((program) => {
              const isDemo = String(program.code + " " + program.name).toUpperCase().includes("DEMO");
              return (
                <article key={program.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><b>{program.name}</b><span className="text-xs font-bold">{program.status}</span></div>
                  <p className="mt-1 text-sm text-slate-500">{program.code} · {Number(program.budgetTotal || 0).toLocaleString("fr-FR")} {program.currency} · Engagement : {program.commitmentVerifiedAt ? "vérifié" : "à vérifier"}</p>
                  {program.commitmentEvidenceUrl && <a href={program.commitmentEvidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-[#0A3D9C] underline">Consulter la preuve d'engagement</a>}
                  {!isDemo && !program.commitmentVerifiedAt && (
                    <button disabled={busy === program.id} onClick={() => post("/api/mobility/admin/programs/verify", { programId: program.id, activate: true }, program.id)} className="mt-3 block rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-bold text-white">Confirmer l'engagement et activer</button>
                  )}
                  {isDemo && <p className="mt-2 text-xs font-bold text-amber-800">Programme DEMO — financement désactivé par règle serveur.</p>}
                </article>
              );
            })}
            {!programs.length && <p className="text-sm text-slate-500">Aucun programme enregistré.</p>}
          </div>
        </section>

        <section className="mt-7 rounded-[24px] border bg-white p-5">
          <h2 className="text-xl font-black">Preuves de décaissement à vérifier</h2>
          <p className="mt-2 text-sm text-slate-500">Seule la confirmation d'un transfert externe documenté fait passer une transaction à EXECUTED.</p>
          <div className="mt-4 space-y-3">
            {pending.map((transaction) => (
              <article key={transaction.id} className="rounded-2xl bg-slate-50 p-4">
                <b>{Number(transaction.amount).toLocaleString("fr-FR")} {transaction.currency}</b>
                <p className="mt-1 text-xs text-slate-500">Référence : {transaction.externalReference} · Prestataire : {transaction.provider}</p>
                <p className="mt-1 text-xs text-slate-500">Allocation : {transaction.allocationId}</p>
                {transaction.evidenceUrl && <a href={transaction.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-[#0A3D9C] underline">Consulter la preuve de transfert</a>}
                <button disabled={busy === transaction.id} onClick={() => post("/api/mobility/admin/funding/verify", { transactionId: transaction.id, confirmExternalTransfer: true }, transaction.id)} className="mt-3 block rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-bold text-white">Confirmer le transfert contrôlé</button>
              </article>
            ))}
            {!pending.length && <p className="text-sm text-slate-500">Aucune preuve de décaissement en attente.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
