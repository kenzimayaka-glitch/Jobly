"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Metric = { key: string; label: string; available: boolean; count: number | null; reason: string | null };
type Data = { snapshotAt: string; metrics: Metric[]; roleCounts: { role: string; available: boolean; count: number | null }[] };

export default function AdminAnalyticsPage() {
  const [token,setToken]=useState("");
  const [data,setData]=useState<Data|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=useCallback(async(accessToken:string)=>{
    const response=await fetch("/api/admin/analytics",{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.message||"Indicateurs indisponibles.");
    setData(body);
  },[]);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      const session=await getSupabaseClient().auth.getSession();
      const accessToken=session.data.session?.access_token;
      if(!accessToken)throw new Error("Session ADMIN requise.");
      if(!alive)return;setToken(accessToken);
      await load(accessToken);
      if(alive)setLoading(false);
    })().catch(e=>{if(alive){setError(e instanceof Error?e.message:"Chargement impossible.");setLoading(false);}});
    return()=>{alive=false;};
  },[load]);
  if(loading)return <main className="grid min-h-[55dvh] place-items-center text-sm font-bold">Calcul des indicateurs réels…</main>;
  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">ADMIN · ANALYST</p><h1 className="mt-2 text-2xl font-black text-[#10264A] sm:text-3xl">Intelligence & reporting</h1><p className="mt-2 max-w-3xl text-sm text-[#66758D]">Indicateurs calculés à partir des tables Jobly interrogées au moment de l'instantané. Les sources indisponibles restent distinctes des valeurs nulles.</p></div>
          <button onClick={()=>load(token).catch(e=>setError(e.message))} className="rounded-full border border-[#DCE4F0] bg-white px-4 py-2.5 text-xs font-black">Actualiser</button>
        </header>
        {error&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{error}</p>}
        <div className="mt-3 text-[10px] text-[#8793A5]">Instantané : {data?.snapshotAt ? new Date(data.snapshotAt).toLocaleString("fr-FR") : "—"}</div>
        <section className="mt-5 rounded-[22px] border border-[#DCE4F0] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-black text-[#10264A]">Répartition des identités utilisateur</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data?.roleCounts.map((row)=> <div key={row.role} className="rounded-xl bg-[#F5F7FB] p-3"><p className="text-[10px] font-black text-[#6D7B91]">{row.role}</p><p className="mt-1 text-2xl font-black tabular-nums">{row.available ? row.count?.toLocaleString("fr-FR") : "—"}</p></div>)}
          </div>
        </section>
        <section className="mt-5">
          <div className="flex items-end justify-between gap-3"><h2 className="text-lg font-black text-[#10264A]">Indicateurs par domaine</h2><span className="text-[10px] font-semibold text-[#8793A5]">Comptages exacts retournés par Supabase</span></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data?.metrics.map((metric)=> <article key={metric.key} className="rounded-[20px] border border-[#DCE4F0] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black text-[#40516C]">{metric.label}</h3><span className={"rounded-full px-2 py-1 text-[8px] font-black "+(metric.available?"bg-[#E6F7EF] text-[#126642]":"bg-[#FFF1E5] text-[#9B4C13]")}>{metric.available?"DISPONIBLE":"NON LUE"}</span></div>
              <p className="mt-4 text-3xl font-black tabular-nums text-[#10264A]">{metric.available?metric.count?.toLocaleString("fr-FR"):"—"}</p>
              {!metric.available&&<p className="mt-2 break-words text-[10px] text-[#9B4C13]">{metric.reason}</p>}
            </article>)}
          </div>
        </section>
        <section className="mt-7 rounded-2xl border border-[#DCE4F0] bg-[#EDF2FA] p-4">
          <h2 className="text-sm font-black">Analyse complémentaire</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#53627B]">Les métriques ci-dessus sont des volumes, pas des prévisions ni des taux de réussite. Les analyses temporelles et projections sont affichées par J’IA CEO lorsqu'une série historique vérifiable est disponible.</p>
          <div className="mt-3 flex flex-wrap gap-2"><a href="/admin/jia" className="rounded-full bg-[#10264A] px-4 py-2.5 text-xs font-black text-white">Ouvrir CEO Intelligence</a><a href="/admin/jia/chat" className="rounded-full border border-[#D0DAE8] bg-white px-4 py-2.5 text-xs font-black">Interroger CEO Copilot</a></div>
        </section>
      </div>
    </main>
  );
}
