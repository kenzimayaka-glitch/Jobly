"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {getSupabaseClient} from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import TalentBackground from "@/components/TalentBackground";

export default function Page() {
 const router=useRouter(); const [d,setD]=useState<any>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{const s=await getSupabaseClient().auth.getSession(); if(!s.data.session){router.replace("/");return}; try{const r=await fetch("/api/career-os",{headers:{Authorization:`Bearer ${s.data.session.access_token}`}}); if(r.ok)setD(await r.json())}finally{setLoading(false)}})()},[router]);
 if(loading)return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
 const gap=d?.gap||[]; const readiness=d?.readiness??0;
 return <main className="talent-shell relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Market Intelligence" eyebrow="JOBLY" initial="J" onBack={()=>router.push("/career-brain")} theme="talent"/><div className="mx-auto max-w-3xl px-5 py-6"><div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-sm"><span className="rounded-full bg-[#FFF4BF] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#735700]">Career Operating System</span><h1 className="mt-4 text-3xl font-black">Comprendre le marché</h1><p className="mt-2 text-sm leading-6 text-slate-600">Une première couche de lecture du marché à partir des données disponibles dans Jobly.</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-blue-50 p-4"><div className="text-xs font-bold text-slate-500">Readiness</div><div className="mt-1 text-3xl font-black text-jobly-blue">{readiness}%</div></div><div className="rounded-2xl bg-yellow-50 p-4"><div className="text-xs font-bold text-slate-500">Career Gap</div><div className="mt-1 text-3xl font-black text-navy">{gap.length}</div></div></div><div className="mt-5 rounded-2xl border border-slate-100 p-4"><h2 className="font-black">Principe</h2><p className="mt-2 text-sm text-slate-600">Cette V1 affiche uniquement des signaux calculables à partir des données disponibles. Aucun chiffre externe n’est inventé.</p></div><button onClick={()=>router.push("/jobs")} className="mt-6 w-full rounded-2xl bg-jobly-blue py-3.5 font-black text-white">Explorer les offres →</button></div></div></div><BottomNav active="/career-brain"/></main>
}
