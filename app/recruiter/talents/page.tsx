"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function RecruiterTalentsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const session = (await getSupabaseClient().auth.getSession()).data.session;
    if (!session) { router.replace("/"); return; }
    const r = await fetch("/api/recruiter/talents", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { setError(body.message || "Impossible de charger les talents."); return; }
    setData(body);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  return <main className="min-h-screen bg-[#F7FAFF] px-5 py-7 text-[#2E3F4F] sm:px-8">
    <div className="mx-auto max-w-5xl">
      <button onClick={() => router.back()} className="text-xs font-black uppercase tracking-[1.5px] text-[#7A9BB5]">← Retour</button>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><span className="text-[10px] font-black uppercase tracking-[2px] text-[#7A9BB5]">JOBLY / RECRUITER INTELLIGENCE</span><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">Top 10 <span className="text-[#7A9BB5]">Talents</span></h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Les meilleurs profils Jobly actuellement découvrables par les recruteurs. Seuls les talents ayant rendu leur profil public apparaissent.</p></div>
        <button onClick={load} className="rounded-full bg-[#FFE135] px-5 py-3 text-xs font-black">Actualiser</button>
      </header>
      {error && <div className="mt-6 rounded-2xl bg-white p-5 text-sm font-bold shadow">{error}</div>}
      {!data && !error && <div className="mt-8 h-48 animate-pulse rounded-3xl bg-white shadow"/>}
      {data && <section className="mt-8 grid gap-4 md:grid-cols-2">
        {data.talents.map((t:any, i:number) => <article key={t.userId} className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black text-[#7A9BB5]">#{String(i+1).padStart(2,"0")} · PROFIL PUBLIC</span><h2 className="mt-1 text-xl font-black">{t.name}</h2><p className="text-sm font-semibold text-slate-500">{t.headline}</p></div><div className="text-right"><strong className="text-3xl font-black text-[#2E3F4F]">{t.discoveryScore}</strong><span className="block text-[9px] font-black uppercase text-[#7A9BB5]">Signal</span></div></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-[#F7FAFF] p-3"><b>{t.yearsExperience}</b><span className="block text-[10px] text-slate-500">ans</span></div><div className="rounded-2xl bg-[#F7FAFF] p-3"><b>L{t.currentLevel}</b><span className="block text-[10px] text-slate-500">{t.currentLevelLabel}</span></div><div className="rounded-2xl bg-[#F7FAFF] p-3"><b>{t.readiness}%</b><span className="block text-[10px] text-slate-500">readiness</span></div></div>
          <p className="mt-4 text-xs font-semibold text-slate-500">{[t.location, t.bestJob?.title].filter(Boolean).join(" · ") || "Profil Jobly"}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{t.topSkills.slice(0,5).map((s:any)=><span key={s.name} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{s.name}</span>)}</div>
          <div className="mt-4 rounded-2xl bg-[#2E3F4F] p-4 text-white"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#FFE135]">Pourquoi ce talent</p><p className="mt-1 text-xs text-white/80">{t.reasons.join(" · ")}</p>{t.quantifiedEvidence?.length>0&&<p className="mt-2 text-xs"><b>Preuves :</b> {t.quantifiedEvidence.join(" · ")}</p>}</div>
        </article>)}
      </section>}
      {data?.count===0 && <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow"><p className="font-black">Aucun profil public disponible.</p><p className="mt-1 text-sm text-slate-500">Les talents doivent activer la visibilité recruteur de leur profil.</p></div>}
    </div>
  </main>;
}
