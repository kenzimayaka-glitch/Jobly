"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { RefreshCw } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import BottomNav from "../../components/BottomNav";
import TalentBackground from "../../components/TalentBackground";
import { NGO_OPPORTUNITY_SOURCES } from "../../lib/ngoOpportunitySources";
import { companyAvatar } from "../../lib/avatar";

export default function Opportunities() {
  const router = useRouter();
  const [d, setD] = useState<any[]>([]);
  const [t, setT] = useState<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const s = await getSupabaseClient().auth.getSession();
      if (!s.data.session) { router.replace('/'); return; }
      setT(s.data.session.access_token);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const r = await fetch('/api/opportunities', { headers: { Authorization: `Bearer ${s.data.session.access_token}` }, signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) { setStatus("error"); return; }
      setD((await r.json()).opportunities || []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function fb(jobId: string, feedback: string) {
    if (!t) return;
    await fetch('/api/opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ jobId, feedback }) });
  }

  return <main className="talent-shell relative min-h-screen bg-[#F7FAFF] pb-24 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Opportunity Intelligence" initial="O" theme="talent"/><div className="mx-auto max-w-3xl px-5 py-6"><div className="flex items-start justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Mes opportunités</h1><p className="mt-1 text-sm text-jobly-gray">Score explicable : pertinence du profil + qualité des données de l'offre.</p></div>
    <button onClick={load} disabled={status==="loading"} aria-label="Actualiser les opportunités" className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-jobly-blue shadow disabled:opacity-50"><RefreshCw size={18} className={status==="loading"?"animate-spin":""}/></button></div>
    {status === "loading" && <div className="mt-8 text-center text-sm text-jobly-gray">Chargement…</div>}
    {status === "error" && <div className="mt-8 talent-card rounded-2xl bg-white p-8 text-center shadow"><p className="text-sm font-bold">Impossible de charger tes opportunités.</p><button onClick={load} className="mt-4 rounded-xl bg-jobly-blue px-5 py-2 text-sm font-extrabold text-white">Réessayer</button></div>}
    <section className="mt-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-extrabold">Sources ONG & international</h2><p className="text-xs text-jobly-gray">Stages et emplois externes · ouverture sur la source originale.</p></div><span className="rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-black">10</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{NGO_OPPORTUNITY_SOURCES.map((source)=><a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-100 p-3 transition hover:border-blue-200"><span className="block text-xs font-extrabold">{source.name}</span><span className="block text-[10px] text-jobly-gray">{source.scope}</span></a>)}</div></section>
    {status === "ready" && <div className="mt-5 space-y-3">{d.map((j)=><article key={j.id} className="talent-card rounded-2xl bg-white p-5 shadow">
      <div className="flex items-start justify-between gap-3"><div><b>{j.title}</b><p className="text-xs text-jobly-gray">{j.location||'Lieu non précisé'} · {j.contractType||'Contrat non précisé'}</p></div><strong className="rounded-xl bg-jobly-blue px-3 py-2 text-white">{j.opportunityScore}%</strong></div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Compatibilité</p><b className="text-sm">{j.matchPercent ?? "—"}%</b></div><div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Fiabilité</p><b className="text-sm">{j.matchConfidence ?? "—"}%</b></div><div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Données évaluées</p><b className="text-sm">{j.matchCoverage ?? "—"}%</b></div></div>
      {j.why?.length>0&&<p className="mt-3 text-xs text-slate-600">{j.why.join(' · ')}</p>}
      {(j.matchedSkills?.length>0||j.missingSkills?.length>0)&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Compétences démontrées</p><div className="mt-1 flex flex-wrap gap-1">{(j.matchedSkills||[]).map((x:string)=><span key={x} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800">{x}</span>)}{!j.matchedSkills?.length&&<span className="text-xs text-slate-400">Aucune identifiée</span>}</div></div><div><p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Compétences à démontrer</p><div className="mt-1 flex flex-wrap gap-1">{(j.missingSkills||[]).map((x:string)=><span key={x} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-800">{x}</span>)}{!j.missingSkills?.length&&<span className="text-xs text-slate-400">Aucun écart identifié</span>}</div></div></div>}
      {j.matchGaps?.length>0&&<details className="mt-3 rounded-xl border border-slate-100 p-3"><summary className="cursor-pointer text-xs font-bold">Voir les points à vérifier</summary><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">{j.matchGaps.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></details>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>fb(j.id,'INTERESTED')} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold">Intéressante</button><button onClick={()=>fb(j.id,'NOT_RELEVANT')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold">Pas pertinente</button><button onClick={()=>router.push(`/jobs/\${j.id}?source=discovery`)} className="ml-auto rounded-xl bg-jobly-blue px-3 py-2 text-xs font-bold text-white">Voir l'offre</button></div>
    </article>)}{!d.length&&<div className="talent-card rounded-2xl bg-white p-8 text-center text-sm">Aucune opportunité disponible.</div>}</div>}
  </div></div><BottomNav active="/opportunities"/></main>;
}
