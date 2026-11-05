"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Dashboard = { institutions: any[]; programs: any[]; requests: any[]; allocations: any[]; communications: any[] };
type Provider = { id: string; providerType: string; displayName: string; city: string };
type Service = { id: string; providerId: string; serviceType: string; title: string; city: string; priceAmount: number | null; currency: string };

export default function InstitutionalMobilityDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("Chargement du Hub institutionnel Mobility…");
  const [busy, setBusy] = useState<string | null>(null);
  const [programDraft, setProgramDraft] = useState({
    institutionId: "", code: "", name: "", budgetTotal: "", capacity: "",
    commitmentReference: "", commitmentEvidenceUrl: "", description: "",
  });
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [disbursements, setDisbursements] = useState<Record<string, { providerId: string; amount: string; reference: string; evidenceUrl: string }>>({});
  const [assignmentServices, setAssignmentServices] = useState<Record<string, string>>({});

  async function token() {
    const session = await getSupabaseClient().auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) throw new Error("Session requise.");
    const headers = { Authorization: `Bearer ${authToken}` };
    const [dashboardResponse, applicationsResponse, providerResponse] = await Promise.all([
      fetch("/api/institution/mobility/dashboard", { headers }),
      fetch("/api/institution/mobility/applications", { headers }),
      fetch("/api/institution/mobility/providers", { headers }),
    ]);
    const [dashboard, apps, providerPayload] = await Promise.all([
      dashboardResponse.json().catch(() => ({})),
      applicationsResponse.json().catch(() => ({})),
      providerResponse.json().catch(() => ({})),
    ]);
    if (!dashboardResponse.ok) throw new Error(dashboard.error || "Tableau de bord indisponible.");
    if (!applicationsResponse.ok) throw new Error(apps.message || "Candidatures institutionnelles indisponibles.");
    if (!providerResponse.ok) throw new Error(providerPayload.message || "Prestataires institutionnels indisponibles.");
    setData(dashboard);
    setApplications(apps.applications || []);
    setProviders(providerPayload.providers || []);
    setServices(providerPayload.services || []);
    setProgramDraft((current) => ({
      ...current,
      institutionId: current.institutionId || dashboard.institutions?.[0]?.id || "",
    }));
    setMessage("");
  }

  useEffect(() => { load().catch((error) => setMessage(error instanceof Error ? error.message : "Chargement impossible.")); }, []);

  async function requestJson(path: string, method: string, body: any, key: string) {
    setBusy(key);
    setMessage("");
    try {
      const authToken = await token();
      if (!authToken) throw new Error("Session requise.");
      const response = await fetch(path, {
        method,
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Action impossible.");
      await load();
      setMessage(payload.message || "Action enregistrée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(applicationId: string, decision: "APPROVE" | "REJECT") {
    const reason = decision === "APPROVE" ? "Dossier retenu après instruction institutionnelle." : "Dossier non retenu après instruction institutionnelle.";
    await requestJson("/api/institution/mobility/applications", "PATCH", { applicationId, decision, reason }, applicationId);
  }

  async function createProgram() {
    const body = {
      ...programDraft,
      budgetTotal: Number(programDraft.budgetTotal),
      capacity: programDraft.capacity === "" ? null : Number(programDraft.capacity),
      currency: "XAF",
    };
    await requestJson("/api/institution/mobility/programs", "POST", body, "program");
    setProgramDraft((current) => ({ ...current, code: "", name: "", budgetTotal: "", capacity: "", commitmentReference: "", commitmentEvidenceUrl: "", description: "" }));
  }

  async function allocate(application: any) {
    const requestId = application.mobilityRequestId;
    const amount = Number(amounts[application.id] || 0);
    await requestJson("/api/institution/mobility/funding/allocate", "POST", {
      programId: application.programId,
      requestId,
      amount,
      currency: "XAF",
    }, application.id);
  }

  async function assignProvider(requestId: string) {
    const serviceId = assignmentServices[requestId];
    if (!serviceId) {
      setMessage("Choisis un service prestataire avant l'affectation.");
      return;
    }
    await requestJson("/api/institution/mobility/providers/assign", "POST", { requestId, serviceId }, "assign-" + requestId);
  }

  async function submitDisbursement(allocation: any) {
    const draft = disbursements[allocation.id];
    if (!draft?.providerId || !draft.amount || !draft.reference.trim() || !draft.evidenceUrl.trim()) {
      setMessage("Prestataire financier, montant, référence externe et preuve HTTPS sont obligatoires.");
      return;
    }
    await requestJson("/api/institution/mobility/funding/disburse", "POST", {
      allocationId: allocation.id,
      providerId: draft.providerId,
      amount: Number(draft.amount),
      externalReference: draft.reference.trim(),
      evidenceUrl: draft.evidenceUrl.trim(),
      idempotencyKey: crypto.randomUUID(),
    }, "disburse-" + allocation.id);
  }

  const committed = data?.allocations
    .filter((row) => !["REJECTED", "CANCELLED"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.approvedAmount || 0), 0) || 0;
  const financeProviders = providers.filter((provider) => provider.providerType === "FINANCE");
  const allocationsByRequest = new Map((data?.allocations || []).map((row) => [row.mobilityRequestId, row]));

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] px-5 py-8 text-[#0A1931]">
      <div className="mx-auto max-w-7xl">
        <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">HUB INSTITUTIONNEL</span>
        <h1 className="mt-4 text-3xl font-black">Mobility — instruction et financement</h1>
        <p className="mt-2 text-sm text-slate-500">Les programmes, bénéficiaires, allocations et prestataires sont limités aux institutions administrées. Les programmes DEMO ne sont jamais éligibles.</p>
        {message && <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{message}</p>}

        {data && (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Institutions autorisées" value={data.institutions.length} />
              <Kpi label="Programmes" value={data.programs.length} />
              <Kpi label="Candidatures" value={applications.length} />
              <Kpi label="Allocations engagées" value={committed.toLocaleString("fr-FR") + " XAF"} />
            </section>

            <section className="mt-8 rounded-[24px] border bg-white p-5">
              <h2 className="text-xl font-black">Créer un programme</h2>
              <p className="mt-2 text-sm text-slate-500">La création produit un brouillon. Jobly doit vérifier la preuve d'engagement budgétaire avant activation et allocation.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select value={programDraft.institutionId} onChange={(e) => setProgramDraft({ ...programDraft, institutionId: e.target.value })} className="rounded-xl border p-3 text-sm">
                  {data.institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}
                </select>
                <input value={programDraft.code} onChange={(e) => setProgramDraft({ ...programDraft, code: e.target.value })} placeholder="Code du programme" className="rounded-xl border p-3 text-sm" />
                <input value={programDraft.name} onChange={(e) => setProgramDraft({ ...programDraft, name: e.target.value })} placeholder="Nom du programme" className="rounded-xl border p-3 text-sm" />
                <input type="number" min="1" value={programDraft.budgetTotal} onChange={(e) => setProgramDraft({ ...programDraft, budgetTotal: e.target.value })} placeholder="Budget engagé (XAF)" className="rounded-xl border p-3 text-sm" />
                <input type="number" min="1" value={programDraft.capacity} onChange={(e) => setProgramDraft({ ...programDraft, capacity: e.target.value })} placeholder="Capacité (facultatif)" className="rounded-xl border p-3 text-sm" />
                <input value={programDraft.commitmentReference} onChange={(e) => setProgramDraft({ ...programDraft, commitmentReference: e.target.value })} placeholder="Référence d'engagement budgétaire" className="rounded-xl border p-3 text-sm" />
                <input value={programDraft.commitmentEvidenceUrl} onChange={(e) => setProgramDraft({ ...programDraft, commitmentEvidenceUrl: e.target.value })} placeholder="URL HTTPS de la preuve d'engagement" className="rounded-xl border p-3 text-sm md:col-span-2" />
                <textarea value={programDraft.description} onChange={(e) => setProgramDraft({ ...programDraft, description: e.target.value })} placeholder="Description et population cible" className="rounded-xl border p-3 text-sm md:col-span-2" />
              </div>
              <button disabled={busy === "program" || !programDraft.institutionId || !programDraft.code || !programDraft.name || !programDraft.budgetTotal || !programDraft.commitmentReference || !programDraft.commitmentEvidenceUrl} onClick={createProgram} className="mt-4 rounded-full bg-[#0A3D9C] px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                {busy === "program" ? "Création…" : "Créer le programme en brouillon"}
              </button>
            </section>

            <section className="mt-8 rounded-[24px] border bg-white p-5">
              <h2 className="text-xl font-black">Programmes de l'institution</h2>
              <div className="mt-4 grid gap-3">
                {data.programs.map((program) => (
                  <article key={program.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><b>{program.name}</b><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{program.status}</span></div>
                    <p className="mt-2 text-sm text-slate-500">{program.code} · {Number(program.budgetTotal || 0).toLocaleString("fr-FR")} {program.currency}</p>
                    <p className="mt-1 text-xs text-slate-500">Engagement budgétaire : {program.commitmentVerifiedAt ? "vérifié par Jobly" : "en attente de contrôle"}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-[24px] border bg-white p-5">
              <h2 className="text-xl font-black">Candidatures à instruire</h2>
              <div className="mt-4 grid gap-3">
                {applications.map((application) => {
                  const request = Array.isArray(application.MobilityRequest) ? application.MobilityRequest[0] : application.MobilityRequest;
                  const allocation = allocationsByRequest.get(application.mobilityRequestId);
                  return (
                    <article key={application.id} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <b>{request?.departCity || "—"} → {request?.arriveeCity || "—"}</b>
                          <p className="mt-1 text-xs text-slate-500">Dossier : {application.mobilityRequestId}</p>
                          <p className="mt-1 text-xs text-slate-500">Charge : {request?.eligibilityBurdenPercent ?? "—"} % · Éligibilité : {request?.eligibilityStatus || "—"}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{application.status}</span>
                      </div>
                      {application.status === "PENDING" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button disabled={busy === application.id} onClick={() => decide(application.id, "APPROVE")} className="rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-black text-white">Retenir</button>
                          <button disabled={busy === application.id} onClick={() => decide(application.id, "REJECT")} className="rounded-full border px-4 py-2 text-xs font-black">Refuser</button>
                        </div>
                      )}
                      {application.status === "APPROVED" && !allocation && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <input type="number" min="1" value={amounts[application.id] || ""} onChange={(e) => setAmounts({ ...amounts, [application.id]: e.target.value })} placeholder="Montant à allouer (XAF)" className="rounded-xl border p-2 text-sm" />
                          <button disabled={busy === application.id || !amounts[application.id]} onClick={() => allocate(application)} className="rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-black text-white">Approuver l'allocation</button>
                        </div>
                      )}
                      {allocation && <p className="mt-3 text-sm font-bold">Allocation : {Number(allocation.approvedAmount).toLocaleString("fr-FR")} {allocation.currency} · {allocation.status}</p>}
                    </article>
                  );
                })}
                {!applications.length && <p className="text-sm text-slate-500">Aucune candidature institutionnelle à instruire.</p>}
              </div>
            </section>

            <section className="mt-8 rounded-[24px] border bg-white p-5">
              <h2 className="text-xl font-black">Affecter un prestataire vérifié</h2>
              <p className="mt-2 text-sm text-slate-500">Une affectation est proposée uniquement sur un dossier qui possède déjà une allocation approuvée dans un programme actif et contrôlé.</p>
              <div className="mt-4 space-y-3">
                {data.allocations.filter((allocation) => ["APPROVED", "PARTIALLY_DISBURSED", "DISBURSED"].includes(allocation.status)).map((allocation) => (
                  <div key={allocation.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
                    <span className="min-w-[220px] flex-1 text-xs">{allocation.mobilityRequestId}</span>
                    <select value={assignmentServices[allocation.mobilityRequestId] || ""} onChange={(e) => setAssignmentServices({ ...assignmentServices, [allocation.mobilityRequestId]: e.target.value })} className="rounded-xl border p-2 text-xs">
                      <option value="">Choisir un service vérifié</option>
                      {services.map((service) => <option key={service.id} value={service.id}>{service.title} · {service.city} · {service.serviceType}</option>)}
                    </select>
                    <button disabled={busy === "assign-" + allocation.mobilityRequestId} onClick={() => assignProvider(allocation.mobilityRequestId)} className="rounded-full border px-4 py-2 text-xs font-bold">Affecter</button>
                  </div>
                ))}
                {!data.allocations.length && <p className="text-sm text-slate-500">Aucune allocation approuvée.</p>}
                {!services.length && <p className="text-xs text-amber-800">Aucun service actif d'un prestataire KYC vérifié.</p>}
              </div>
            </section>

            <section className="mt-8 rounded-[24px] border bg-white p-5">
              <h2 className="text-xl font-black">Soumettre une preuve de décaissement externe</h2>
              <p className="mt-2 text-sm text-slate-500">Cette étape enregistre une preuve à vérifier par Jobly. Elle ne marque pas le paiement comme exécuté.</p>
              {data.allocations.filter((allocation) => ["APPROVED", "PARTIALLY_DISBURSED"].includes(allocation.status)).map((allocation) => {
                const draft = disbursements[allocation.id] || { providerId: "", amount: String(allocation.approvedAmount), reference: "", evidenceUrl: "" };
                return (
                  <article key={allocation.id} className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <b>{allocation.mobilityRequestId} · {Number(allocation.approvedAmount).toLocaleString("fr-FR")} XAF approuvés</b>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <select value={draft.providerId} onChange={(e) => setDisbursements({ ...disbursements, [allocation.id]: { ...draft, providerId: e.target.value } })} className="rounded-xl border p-2 text-sm">
                        <option value="">Prestataire financier vérifié</option>
                        {financeProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName} · {provider.city}</option>)}
                      </select>
                      <input value={draft.amount} onChange={(e) => setDisbursements({ ...disbursements, [allocation.id]: { ...draft, amount: e.target.value } })} type="number" min="1" placeholder="Montant transféré" className="rounded-xl border p-2 text-sm" />
                      <input value={draft.reference} onChange={(e) => setDisbursements({ ...disbursements, [allocation.id]: { ...draft, reference: e.target.value } })} placeholder="Référence externe du transfert" className="rounded-xl border p-2 text-sm" />
                      <input value={draft.evidenceUrl} onChange={(e) => setDisbursements({ ...disbursements, [allocation.id]: { ...draft, evidenceUrl: e.target.value } })} placeholder="URL HTTPS de la preuve" className="rounded-xl border p-2 text-sm" />
                    </div>
                    <button disabled={busy === "disburse-" + allocation.id || !draft.providerId || !draft.reference || !draft.evidenceUrl} onClick={() => submitDisbursement(allocation)} className="mt-3 rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-black text-white disabled:opacity-40">Soumettre la preuve à vérifier</button>
                  </article>
                );
              })}
              {!financeProviders.length && <p className="mt-4 text-sm text-amber-800">Aucun prestataire financier vérifié : aucun décaissement ne peut être soumis.</p>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-[24px] border bg-white p-5"><p className="text-xs font-black uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}
