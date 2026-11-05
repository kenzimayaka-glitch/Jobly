"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import BottomNav, { RECRUITER_NAV } from "@/components/BottomNav";

const TERMS_VERSION = "JOBLY-MOBILITY-EMPLOYER-2026-11-05-v1";

export default function RecruiterMobility() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [agreement, setAgreement] = useState<any>(null);
  const [terms, setTerms] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function token() {
    const session = await getSupabaseClient().auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) { router.replace("/"); return; }
    const [reportsResponse, agreementResponse] = await Promise.all([
      fetch("/api/mobility/partner/reports?format=json", { headers: { Authorization: `Bearer ${authToken}` } }),
      fetch("/api/mobility/recruiter/agreement", { headers: { Authorization: `Bearer ${authToken}` } }),
    ]);
    const reports = await reportsResponse.json().catch(() => ({}));
    const agreementPayload = await agreementResponse.json().catch(() => ({}));
    if (!reportsResponse.ok) throw new Error(reports.message || "Dossiers Mobility indisponibles.");
    if (!agreementResponse.ok) throw new Error(agreementPayload.message || "Convention Mobility indisponible.");
    setRows(reports.rows || []);
    setAgreement(agreementPayload.agreement || null);
    setTerms({ version: agreementPayload.termsVersion, text: agreementPayload.terms });
  }

  useEffect(() => { load().catch((error) => setMessage(error instanceof Error ? error.message : "Chargement impossible.")); }, [router]);

  async function acceptAgreement() {
    setBusy("agreement");
    setMessage("");
    try {
      const authToken = await token();
      const response = await fetch("/api/mobility/recruiter/agreement", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptTerms: true,
          authorizedRepresentative: true,
          termsVersion: terms?.version || TERMS_VERSION,
          payrollDeductionMonths: 3,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Acceptation de convention impossible.");
      await load();
      setAccepted(false);
      setMessage("Convention employeur enregistrée. Chaque garantie reste liée à une offre, à un dossier et à une vérification d'éligibilité.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Acceptation impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function guarantee(requestId: string) {
    setBusy(requestId);
    setMessage("");
    try {
      const authToken = await token();
      const response = await fetch("/api/mobility/recruiter/guarantee", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Garantie impossible.");
      await load();
      setMessage("Garantie confirmée et décision Mobility recalculée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Garantie impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] pb-28 text-navy">
      <PageHeader eyebrow="RECRUTEUR" label="Mobility" onBack={() => router.push("/recruiter")} />
      <div className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-2xl font-black">Mobility recruteur</h1>
        <p className="mt-2 text-sm text-slate-500">Convention employeur et garanties liées uniquement à tes candidatures et offres.</p>
        {message && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
        <section className="mt-6 rounded-[24px] border bg-white p-5">
          <h2 className="text-lg font-black">Convention employeur</h2>
          {agreement?.accepted ? (
            <p className="mt-2 text-sm text-emerald-700">Convention acceptée · {agreement.companyName} · {agreement.payrollDeductionMonths} mois · version {agreement.termsVersion}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">{terms?.text || "Convention Mobility versionnée requise."}</p>
              <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />Je confirme être représentant habilité et accepter cette convention.</label>
              <button disabled={!accepted || busy === "agreement"} onClick={acceptAgreement} className="mt-4 rounded-full bg-[#0A3D9C] px-5 py-3 text-sm font-black text-white disabled:opacity-40">{busy === "agreement" ? "Enregistrement…" : "Accepter la convention"}</button>
            </>
          )}
        </section>
        <section className="mt-6 rounded-[24px] border bg-white p-5">
          <h2 className="text-lg font-black">Dossiers liés</h2>
          <div className="mt-4 space-y-3">
            {rows.map((row) => (
              <article key={row.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><b>{row.departCity} → {row.arriveeCity}</b><span className="text-xs font-bold">{row.status}</span></div>
                <p className="mt-1 text-sm text-slate-500">Charge Mobility : {row.eligibilityBurdenPercent ?? "—"} % · Éligibilité : {row.eligibilityStatus || "—"}</p>
                <p className="mt-1 text-xs text-slate-500">Dossier : {row.id}</p>
                {agreement?.accepted && row.eligibilityStatus !== "ELIGIBLE" && <p className="mt-2 text-xs text-amber-800">La garantie ne contourne jamais une inéligibilité ou une information manquante.</p>}
                {agreement?.accepted && row.eligibilityStatus === "ELIGIBLE" && !row.recruiterGuaranteed && (
                  <button disabled={busy === row.id} onClick={() => guarantee(row.id)} className="mt-3 rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-black text-white disabled:opacity-40">{busy === row.id ? "Traitement…" : "Accepter la garantie"}</button>
                )}
              </article>
            ))}
            {!rows.length && <p className="text-sm text-slate-500">Aucun dossier lié à tes recrutements.</p>}
          </div>
        </section>
      </div>
      <BottomNav active="/recruiter" items={RECRUITER_NAV} />
    </main>
  );
}
