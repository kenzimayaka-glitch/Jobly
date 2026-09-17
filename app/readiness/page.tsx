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
 return <main className="talent-shell relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Readiness" eyebrow="JOBLY" initial="J" onBack={()=>router.push("/career-brain")} theme="talent"/><div className="mx-auto max-w-3xl px-5 py-6"><div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-sm"><span className="rounded-full bg-[#FFF4BF] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#735700]">Career Operating System</span><h1 className="mt-4 text-3xl font-black">Es-tu prêt à candidater ?</h1><p className="mt-2 text-sm leading-6 text-slate-600">Un indicateur simple construit à partir du profil, des compétences, de l’expérience et de la cible.</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-blue-50 p-4"><div className="text-xs font-bold text-slate-500">Readiness</div><div className="mt-1 text-3xl font-black text-jobly-blue">{readiness}%</div></div><div className="rounded-2xl bg-yellow-50 p-4"><div className="text-xs font-bold text-slate-500">Career Gap</div><div className="mt-1 text-3xl font-black text-navy">{gap.length}</div></div></div><div className="mt-5 rounded-2xl border border-slate-100 p-4"><h2 className="font-black">Lecture</h2><p className="mt-2 text-sm text-slate-600">Plus ton profil est renseigné, plus Jobly peut comparer précisément tes objectifs avec les opportunités.</p></div><button onClick={()=>router.push("/jobs")} className="mt-6 w-full rounded-2xl bg-jobly-blue py-3.5 font-black text-white">Voir les opportunités →</button></div></div></div><BottomNav active="/career-brain"/></main>
}
