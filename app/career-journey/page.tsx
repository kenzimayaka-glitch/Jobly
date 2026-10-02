"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Journey = any;

export default function CareerJourneyPage() {
  const [data, setData] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceMetric, setEvidenceMetric] = useState("");
  const [evidenceValue, setEvidenceValue] = useState("");

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: session } = await getSupabaseClient().auth.getSession();
    const headers: Record<string, string> = {};
    if (session.session?.access_token) headers.Authorization = `Bearer ${session.session.access_token}`;
    return headers;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/career-journey", { headers: await authHeaders(), cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erreur");
      setData(json);
    } catch (e: any) {
      setMessage(e.message || "Impossible de charger Career Journey.");
    } finally { setLoading(false); }
  }, [authHeaders]);

  useEffect(() => { void load(); }, [load]);

  async function post(body: any) {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/career-journey", {
        method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erreur");
      setMessage("Career Journey actualisé.");
      await load();
    } catch (e: any) { setMessage(e.message || "Action impossible."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen p-8"><p>J’IA prépare ton Career Journey…</p></main>;

  const journey = data?.journey;
  const snapshot = journey?.latestSnapshot || {};
  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-medium text-slate-500">J’IA · Career Journey</p>
          <h1 className="mt-1 text-3xl font-semibold">Votre carrière, suivie dans le temps.</h1>
          <p className="mt-2 max-w-3xl text-slate-600">J’IA relie objectif, écarts, actions, preuves facultatives et réévaluation. Vous acceptez, refusez ou modifiez chaque proposition.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button disabled={busy} onClick={() => post({ action: "REASSESS" })} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Réévaluer avec J’IA</button>
            <button disabled={busy} onClick={() => post({ consentFollowUp: !journey?.consentFollowUp })} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold">{journey?.consentFollowUp ? "Suivi activé" : "Activer le suivi"}</button>
          </div>
          {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="Préparation" value={journey?.latestReadiness ?? "—"} suffix={journey?.latestReadiness == null ? "" : "/100"} />
          <Stat title="Écarts" value={snapshot?.gaps?.length ?? 0} />
          <Stat title="Missions" value={data?.missions?.length ?? 0} />
          <Stat title="Objectifs" value={data?.goals?.length ?? 0} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Prochaine priorité">
            <p className="text-lg font-medium">{snapshot?.nextBestAction || "Complète ton objectif professionnel pour commencer."}</p>
            {snapshot?.missingData?.length > 0 && <p className="mt-3 text-sm text-slate-500">Données manquantes : {snapshot.missingData.join(", ")}.</p>}
          </Panel>
          <Panel title="Recommandations">
            <div className="space-y-3">
              {(data?.recommendations || []).slice(0, 4).map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{r.rationale}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{r.type === "LEARN" ? "Formation / apprentissage" : r.type}</p>
                  {r.type === "LEARN" && Array.isArray(r.alternatives) && r.alternatives.length > 0 && (
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      {r.alternatives.slice(0, 3).map((option: any, index: number) => (
                        <p key={index}>• {typeof option === "string" ? option : option.label}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {!data?.recommendations?.length && <p className="text-sm text-slate-500">Aucune recommandation enregistrée.</p>}
            </div>
          </Panel>
        </section>

        <Panel title="Missions">
          <div className="grid gap-3 md:grid-cols-2">
            {(data?.missions || []).map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{m.title}</h3><span className="text-xs text-slate-400">{m.status}</span></div>
                <p className="mt-2 text-sm text-slate-600">{m.objective}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${m.progressPercent || 0}%` }} /></div>
                <button disabled={busy} onClick={() => { setEvidenceFor(m.id); setEvidenceTitle(""); setEvidenceDescription(""); setEvidenceMetric(""); setEvidenceValue(""); }} className="mt-3 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold">Ajouter une preuve terrain</button>
                {evidenceFor === m.id && <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                  <input value={evidenceTitle} onChange={e => setEvidenceTitle(e.target.value)} placeholder="Ex. Résultat terrain / challenge géré" className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm" />
                  <textarea value={evidenceDescription} onChange={e => setEvidenceDescription(e.target.value)} placeholder="Ce qui a réellement été réalisé…" className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm" />
                  <div className="grid grid-cols-2 gap-2"><input value={evidenceMetric} onChange={e => setEvidenceMetric(e.target.value)} placeholder="Métrique (ex. CA)" className="rounded-xl border border-slate-200 bg-white p-2 text-sm" /><input value={evidenceValue} onChange={e => setEvidenceValue(e.target.value)} placeholder="Valeur" inputMode="decimal" className="rounded-xl border border-slate-200 bg-white p-2 text-sm" /></div>
                  <div className="flex gap-2"><button disabled={busy || !evidenceTitle.trim()} onClick={async () => { await post({ action: "ADD_EVIDENCE", missionId: m.id, title: evidenceTitle, description: evidenceDescription, type: "DOCUMENT", terrainKind: "PHOTO_OR_TERRAIN", metric: evidenceMetric, value: evidenceValue ? Number(evidenceValue) : undefined, acceptedByUser: true }); setEvidenceFor(null); }} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Enregistrer</button><button onClick={() => setEvidenceFor(null)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs">Annuler</button></div>
                </div>}
              </div>
            ))}
            {!data?.missions?.length && <p className="text-sm text-slate-500">J’IA pourra proposer une mission après identification d’un écart concret.</p>}
          </div>
        </Panel>

        <Panel title="Preuves de terrain et matière carrière">
          <div className="grid gap-3 md:grid-cols-2">
            {(data?.evidence || []).slice(0, 10).map((e: any) => <div key={e.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><p className="font-semibold">{e.title}</p><span className="text-xs text-slate-400">{e.verified ? "Vérifiée" : "À vérifier"}</span></div><p className="mt-1 text-sm text-slate-600">{e.description || "Preuve capturée dans Career Journey."}</p>{e.metadata?.metric && <p className="mt-2 text-xs font-medium text-slate-500">{e.metadata.metric} : {e.metadata.value ?? "—"} {e.metadata.unit || ""}</p>}</div>)}
            {!data?.evidence?.length && <p className="text-sm text-slate-500">Chaque mission peut produire une preuve : photo terrain, résultat, document, cas concret ou challenge géré.</p>}
          </div>
        </Panel>

        <Panel title="Parcours alternatifs">
          <div className="grid gap-3 md:grid-cols-3">
            {(data?.scenarios || []).map((s: any) => <div key={s.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-semibold">{s.title}</p><p className="mt-1 text-sm text-slate-600">{s.targetRole}</p></div>)}
            {!data?.scenarios?.length && <p className="text-sm text-slate-500">Les scénarios restent exploratoires : aucune trajectoire n’est imposée.</p>}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Stat({ title, value, suffix = "" }: { title: string; value: any; suffix?: string }) {
  return <div className="rounded-3xl border border-slate-200 p-5"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-semibold">{value}<span className="text-sm font-normal text-slate-400">{suffix}</span></p></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
}
