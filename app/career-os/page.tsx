"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "../../components/PageHeader";
import BottomNav from "../../components/BottomNav";
import TalentBackground from "../../components/TalentBackground";

export default function CareerOS() {
  const router = useRouter();
  const [d, setD] = useState<any>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const s = await getSupabaseClient().auth.getSession();
      if (!s.data.session) { router.replace("/"); return; }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const r = await fetch("/api/career-os", { headers: { Authorization: `Bearer ${s.data.session.access_token}` }, signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) { setStatus("error"); return; }
      setD(await r.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (status === "loading") return <main className="talent-shell grid min-h-screen place-items-center text-sm text-jobly-gray">Chargement…</main>;
  if (status === "error" || !d) return (
    <main className="talent-shell grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-lg font-extrabold">Impossible de charger ton Career OS.</p>
        <p className="mt-2 text-sm text-jobly-gray">Vérifie ta connexion et réessaie.</p>
        <button onClick={load} className="mt-5 rounded-2xl bg-jobly-blue px-6 py-3 font-extrabold text-white">Réessayer</button>
        <button onClick={() => router.push("/dashboard")} className="mt-3 block w-full rounded-2xl border px-6 py-3 font-extrabold">Retour au dashboard</button>
      </div>
    </main>
  );
  return <main className="talent-shell relative min-h-screen bg-[#F7FAFF] pb-24 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Career OS" initial="C" theme="talent"/><div className="mx-auto max-w-3xl px-5 py-6"><h1 className="text-3xl font-extrabold">Ton GPS carrière</h1><p className="mt-1 text-sm text-jobly-gray">Une lecture simple de ta préparation et de tes prochaines actions.</p><section className="mt-5 grid grid-cols-2 gap-3"><div className="talent-card rounded-2xl bg-white p-5 shadow"><b>Readiness</b><div className="mt-2 text-4xl font-black">{d.readiness}%</div></div><div className="talent-card rounded-2xl bg-white p-5 shadow"><b>Expérience</b><div className="mt-2 text-4xl font-black">{d.yearsExperience} an{d.yearsExperience>1?'s':''}</div></div></section><div className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><b>Next Best Action</b><p className="mt-2 text-sm">{d.nextBestAction}</p></div><section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><h2 className="font-extrabold">Career Gap</h2>{d.gap.length?<ul className="mt-3 space-y-2 text-sm">{d.gap.map((x:string)=><li key={x}>• {x}</li>)}</ul>:<p className="mt-3 text-sm">Aucun gap critique détecté.</p>}</section><section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><h2 className="font-extrabold">Roadmap</h2><div className="mt-3 space-y-3">{d.roadmap.map((x:any)=><div key={x.step} className="flex gap-3"><span>{x.done?'✅':'◻️'}</span><div><b>{x.title}</b><p className="text-xs text-jobly-gray">{x.action}</p></div></div>)}</div></section><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Career GPS","/career-gps"],["Career Gap","/career-gap"],["Readiness","/readiness"],["Radar","/opportunity-radar"]].map(([label,href])=><button key={href} onClick={()=>router.push(href)} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm"><span className="block text-xs font-black text-jobly-blue">{label}</span><span className="mt-1 block text-[10px] text-slate-500">Ouvrir →</span></button>)}</div>
<section className="mt-4 talent-card rounded-2xl bg-white p-5 shadow"><h2 className="font-extrabold">Explorer</h2><p className="mt-1 text-xs text-jobly-gray">D'autres espaces Career OS à découvrir.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Market Intelligence","/market-intelligence"],["Communities","/communities"],["Campus","/campus"],["Events","/events"]].map(([label,href])=><button key={href} onClick={()=>router.push(href)} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm"><span className="block text-xs font-black text-jobly-blue">{label}</span><span className="mt-1 block text-[10px] text-slate-500">Ouvrir →</span></button>)}</div></section>
<button onClick={()=>router.push('/jobs')} className="mt-5 w-full rounded-2xl bg-jobly-blue py-3 font-extrabold text-white">Voir les opportunités →</button></div></div><BottomNav active="/career-os"/></main>;
}
