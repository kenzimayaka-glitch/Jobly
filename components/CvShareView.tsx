"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Download, X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

type Data = { share:any; user:any; profile:any; experiences:any[]; skills:any[]; education:any[] };

function MiniTalentDemo({ jobTitle }: { jobTitle?: string|null }) {
  return <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] p-3">
    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/45"><span>JOBLY · TALENT INTELLIGENCE</span><span>{jobTitle || "Match Lab"}</span></div>
    <div className="mt-3 grid grid-cols-4 gap-2">
      {[96,93,91,88].map((n,i)=><motion.div key={n} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.15}} className="rounded-xl bg-white/10 p-2 text-center"><motion.div initial={{scale:.7}} animate={{scale:1}} transition={{delay:.15+i*.15}} className="text-sm font-black text-[#FFE135]">{n}%</motion.div><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><motion.div initial={{width:0}} animate={{width:n+"%"}} transition={{delay:.25+i*.15,duration:.6}} className="h-full rounded-full bg-[#FFE135]"/></div></motion.div>)}
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-bold text-white/50"><span>Experience</span><span>Skills</span><span>Secteur</span><span>Seniorité</span></div>
  </div>;
}

export function CvShareView({ token }: { token:string }) {
  const router=useRouter();
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [showRecruiter,setShowRecruiter]=useState(true);
  const [matchCount,setMatchCount]=useState<number|null>(null);

  useEffect(()=>{
    const shareUrl="/api/cv-share/"+encodeURIComponent(token);\n    const discoverUrl="/api/recruiter/discover/"+encodeURIComponent(token);
    Promise.all([fetch(shareUrl),fetch(discoverUrl)]).then(async ([shareResponse,discoverResponse])=>{\n      const shareBody=await shareResponse.json();\n      if(!shareResponse.ok) throw new Error(shareBody.message||"CV indisponible.");\n      const discoverBody=await discoverResponse.json();\n      setData(shareBody);\n      setMatchCount(discoverResponse.ok && typeof discoverBody.totalMatches==="number" ? discoverBody.totalMatches : 0);\n    }).catch(e=>setError(e.message||"CV indisponible."));
  },[token]);

  if(error) return <main className="min-h-[100dvh] grid place-items-center bg-[#F5F7FA] p-6"><div className="rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-xl font-black text-[#0B2447]">CV indisponible</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></main>;
  if(!data) return <main className="min-h-[100dvh] grid place-items-center bg-[#F5F7FA] font-black text-[#0B2447]">Chargement du CV…</main>;

  const name=[data.user?.firstName,data.user?.lastName].filter(Boolean).join(" ")||data.user?.displayName||"Talent Jobly";
  const downloadUrl="/api/cv-share/"+encodeURIComponent(token)+"/pdf";

  return <main className="min-h-[100dvh] bg-[#F5F7FA] pb-10 text-[#0B2447]">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-5xl items-center justify-between"><div className="font-black tracking-tight"><span className="text-[#174EA6]">JOB</span><span className="text-[#FFE135]">LY</span></div><a href="/download" className="rounded-full border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider">Découvrir Jobly</a></div></header>

    <div className="mx-auto max-w-4xl px-4 py-5 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-400">CV professionnel</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{name}</h1><p className="mt-1 text-sm font-bold text-[#174EA6]">{data.share?.companyName ? "Candidature — "+data.share.companyName : data.share?.jobTitle || data.profile?.headline || "Profil professionnel"}</p></div><a href={downloadUrl} className="inline-flex items-center gap-2 rounded-2xl bg-[#174EA6] px-4 py-3 text-sm font-black text-white shadow-lg"><Download size={16}/> Télécharger le CV</a></div>

      <article className="overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200">
        <div className="grid md:grid-cols-[30%_70%]">
          <aside className="bg-[#0B2447] p-6 text-white md:min-h-[900px]">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white/10 text-2xl font-black">{data.user?.profilePhotoUrl?<img src={data.user.profilePhotoUrl} alt="" className="h-full w-full object-cover"/>:name.split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase()}</div>
            <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-white/45">Contact</p><div className="mt-3 space-y-2 text-xs text-white/80">{data.user?.email&&<div>{data.user.email}</div>}{data.user?.phone&&<div>{data.user.phone}</div>}{data.profile?.location&&<div>{data.profile.location}</div>}</div>
            <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-white/45">Compétences</p><div className="mt-3 flex flex-wrap gap-2">{(data.skills||[]).map((s:any)=><span key={s.id||s.name} className="rounded-full bg-white/10 px-2 py-1 text-[10px]">{s.name}</span>)}</div>
          </aside>
          <div className="p-7 sm:p-10"><div className="border-b border-slate-200 pb-7"><h2 className="text-3xl font-black">{name}</h2><p className="mt-2 text-base font-bold text-slate-500">{data.profile?.headline || "Profil professionnel"}</p></div>{data.profile?.summary&&<section className="pt-7"><h3 className="text-[10px] font-black uppercase tracking-[.2em] text-[#174EA6]">Profil</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{data.profile.summary}</p></section>}<section className="pt-7"><h3 className="text-[10px] font-black uppercase tracking-[.2em] text-[#174EA6]">Expérience</h3>{(data.experiences||[]).length?data.experiences.map((x:any)=><div key={x.id} className="mt-4"><div className="font-black">{x.title}</div><div className="text-xs font-bold text-slate-400">{x.company}</div>{x.description&&<p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{x.description}</p>}</div>):<p className="mt-3 text-sm text-slate-500">Expériences non renseignées.</p>}</section><section className="pt-7"><h3 className="text-[10px] font-black uppercase tracking-[.2em] text-[#174EA6]">Formation</h3>{(data.education||[]).map((x:any)=><div key={x.id} className="mt-3 text-sm"><b>{x.degree||x.field||"Formation"}</b><div className="text-slate-500">{x.institution}</div></div>)}</section></div>
        </div>
      </article>
    </div>

    <AnimatePresence>{showRecruiter&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] grid place-items-center bg-[#081B36]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="jobly-recruiter-promo">
      <motion.div initial={{opacity:0,scale:.96,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.98,y:10}} transition={{duration:.2}} className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/10 bg-[#081B36] p-5 text-white shadow-2xl sm:p-7">
        <button aria-label="Fermer l'information Jobly et consulter le CV" onClick={()=>setShowRecruiter(false)} className="absolute right-3 top-3 rounded-full p-2 text-white/60 hover:bg-white/10"><X size={20}/></button>
        <div className="pr-10"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#FFE135]"><Sparkles size={14}/> Jobly · Talent Intelligence</div><h2 id="jobly-recruiter-promo" className="mt-3 text-2xl font-black sm:text-3xl">Vous recrutez ce talent ?</h2><p className="mt-2 text-sm leading-6 text-white/75">Avant de consulter le CV, découvrez en quelques secondes comment Jobly peut vous aider à trouver d'autres profils correspondant à votre besoin.</p></div>
        <MiniTalentDemo jobTitle={data.share?.jobTitle}/>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button onClick={()=>router.push("/recruiter/discover/"+encodeURIComponent(token))} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFE135] px-4 py-3 text-sm font-black text-[#081B36]">Découvrir les talents sur Jobly <ArrowRight size={16}/></button>
          <button onClick={()=>setShowRecruiter(false)} className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10">Fermer et consulter le CV</button>
        </div>
        <p className="mt-3 text-center text-[10px] font-medium text-white/35">Voir ouvre Jobly. Fermer permet de consulter et télécharger le CV directement, sans créer de compte.</p>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </main>;
}
