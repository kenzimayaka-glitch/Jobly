"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import BottomNav from "../../components/BottomNav";
import TalentBackground from "../../components/TalentBackground";
import { getSupabaseClient } from "@/lib/supabase";

export default function CareerOS() {
  const router = useRouter();
  const [d, setD] = useState<any>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [visibilityBusy, setVisibilityBusy] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const s = await getSupabaseClient().auth.getSession();
      if (!s.data.session) { router.replace("/"); return; }
      const r = await fetch("/api/career-os", { headers: { Authorization: `Bearer ${s.data.session.access_token}` } });
      if (!r.ok) { setStatus("error"); return; }
      setD(await r.json()); setStatus("ready");
    } catch { setStatus("error"); }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  async function togglePublic() {
    const s = await getSupabaseClient().auth.getSession(); if (!s.data.session) return;
    setVisibilityBusy(true);
    try {
      const next = !d.publicDiscoverable;
      const r = await fetch("/api/talent/discoverability", { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.data.session.access_token}`}, body:JSON.stringify({publicDiscoverable:next}) });
      if (r.ok) setD((x:any)=>({...x,publicDiscoverable:next}));
    } finally { setVisibilityBusy(false); }
  }

  if (status === "loading") return <main className="talent-shell grid min-h-screen place-items-center text-sm text-jobly-gray">Chargement…</main>;
  if (status === "error" || !d) return <main className="talent-shell grid min-h-screen place-items-center px-6 text-center"><div><p className="text-lg font-extrabold">Impossible de charger ton Career OS.</p><button onClick={load} className="mt-5 rounded-2xl bg-jobly-blue px-6 py-3 font-extrabold text-white">Réessayer</button></div></main>;

  const dims = Object.entries(d.dimensions || {}) as [string, any][];
  return <main className="talent-shell relative min-h-screen bg-[#F7FAFF] pb-24 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Career OS" initial="C" theme="talent"/><div className="mx-auto max-w-4xl px-5 py-6">
    <h1 className="text-3xl font-extrabold">Ton GPS carrière</h1>
    <p className="mt-1 text-sm text-jobly-gray">Jobly évalue ta progression à partir de preuves : expérience, résultats, responsabilités, compétences et formation.</p>

    <section className="mt-5 grid gap-3 sm:grid-cols-4">
      <div className="talent-card rounded-2xl bg-white p-5 shadow"><b>Niveau actuel</b><div className="mt-2 text-4xl font-black">L{d.currentLevel}</div><p className="text-xs text-slate-500">{d.currentLevelLabel}</p></div>
      <div className="talent-card rounded-2xl bg-white p-5 shadow"><b>Prochain niveau</b><div className="mt-2 text-4xl font-black">L{d.targetLevel}</div><p className="text-xs text-slate-500">{d.targetLevelLabel}</p></div>
      <div className="talent-card rounded-2xl bg-white p-5 shadow"><b>Readiness</b><div className="mt-2 text-4xl font-black">{d.readiness}%</div><p className="text-xs text-slate-500">préparation estimée</p></div>
      <div className="talent-card rounded-2xl bg-white p-5 shadow"><b>Expérience</b><div className="mt-2 text-4xl font-black">{d.yearsExperience}</div><p className="text-xs text-slate-500">ans</p></div>
    </section>

    <section className="mt-4 talent-card rounded-2xl bg-[#2E3F4F] p-5 text-white shadow"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[1.5px] text-[#FFE135]">PROCHAINE ÉTAPE</span><h2 className="mt-2 text-xl font-black">{d.nextBestAction}</h2></div><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">L{d.currentLevel} → L{d.targetLevel}</span></div></section>

    <section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><h2 className="font-extrabold">Ce qui détermine ton niveau</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{dims.map(([key,v])=><div key={key}><div className="flex justify-between text-xs font-bold"><span>{({experience:"Expérience",impact:"Résultats chiffrés",responsibility:"Responsabilités",skills:"Compétences",education:"Formation",progression:"Progression",evidenceCompleteness:"Qualité des preuves"} as any)[key] || key}</span><span>{v.score}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-jobly-blue" style={{width:`${v.score}%`}}/></div><p className="mt-1 text-[10px] text-slate-500">{v.evidence?.join(" · ")}</p></div>)}</div></section>

    <section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><h2 className="font-extrabold">Critères du prochain niveau</h2><ul className="mt-3 space-y-2 text-sm">{d.criteria.map((x:string)=><li key={x}>• {x}</li>)}</ul></section>
    <section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><h2 className="font-extrabold">Gaps prioritaires</h2>{d.gap.length?<ul className="mt-3 space-y-2 text-sm">{d.gap.map((x:string)=><li key={x}>• {x}</li>)}</ul>:<p className="mt-3 text-sm">Aucun gap critique détecté.</p>}</section>

    <section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><h2 className="font-extrabold">Roadmap</h2><div className="mt-3 space-y-3">{d.roadmap.map((x:any)=><div key={x.step} className="flex gap-3"><span>{x.done?'✅':'◻️'}</span><div><b>{x.title}</b><p className="text-xs text-jobly-gray">{x.action}</p></div></div>)}</div></section>

    <section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><div className="flex items-center justify-between gap-4"><div><h2 className="font-extrabold">Profil visible aux recruteurs</h2><p className="mt-1 text-xs text-jobly-gray">Quand activé, ton profil peut apparaître dans le Top 10 des talents publics Jobly. Ton email et ton téléphone ne sont pas exposés par cette fonctionnalité.</p></div><button disabled={visibilityBusy} onClick={togglePublic} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${d.publicDiscoverable?'bg-[#FFE135] text-[#2E3F4F]':'bg-slate-100 text-slate-600'}`}>{d.publicDiscoverable?'Public':'Privé'}</button></div></section>

    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Career GPS","/career-gps"],["Career Gap","/career-gap"],["Readiness","/readiness"],["Radar","/opportunity-radar"]].map(([label,href])=><button key={href} onClick={()=>router.push(href)} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm"><span className="block text-xs font-black text-jobly-blue">{label}</span><span className="mt-1 block text-[10px] text-slate-500">Ouvrir →</span></button>)}</div>
    <button onClick={()=>router.push('/jobs')} className="mt-5 w-full rounded-2xl bg-jobly-blue py-3 font-extrabold text-white">Voir les opportunités →</button>
  </div></div><BottomNav active="/career-os"/></main>;
}
