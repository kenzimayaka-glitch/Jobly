"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Download, X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

type Data = { share:any; user:any; profile:any; experiences:any[]; skills:any[]; education:any[]; application?: { cvText?: string; letterText?: string; coverLetterRequired?: boolean } | null };

function MiniTalentDemo({ jobTitle, count, loading }: { jobTitle?: string|null; count: number|null; loading: boolean }) {
  return <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] p-3">
    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/45"><span>JOBLY · TALENT INTELLIGENCE</span><span>{jobTitle || "Match Lab"}</span></div>
    <div className="mt-3 rounded-xl bg-white/10 p-4 text-center">
      {loading ? <motion.div initial={{opacity:.4}} animate={{opacity:1}} transition={{repeat:Infinity,repeatType:"reverse",duration:.8}} className="text-xs font-bold text-white/70">Analyse des correspondances publiques…</motion.div> :
       count === null ? <p className="text-xs font-semibold text-white/65">Le compteur de correspondance est momentanément indisponible.</p> :
       <><motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{repeat:Infinity,repeatType:"mirror",duration:1.1}} className="text-3xl font-black text-[#FFE135]">{count}</motion.div><p className="mt-1 text-[10px] font-bold text-white/70">{count===1?"talent a":"talents ont"} un score supérieur à celui de ce candidat pour cette offre.</p></>}
    </div>
    <div className="mt-3 text-[8px] font-bold text-white/45">Comparaison anonymisée · Profils publics uniquement · Aucun nom révélé</div>
  </div>;
}

export function CvShareView({ token }: { token:string }) {
  const router=useRouter();
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [showRecruiter,setShowRecruiter]=useState(true);
  const [higherScoreCount,setHigherScoreCount]=useState<number|null>(null);
  const [matchingLoading,setMatchingLoading]=useState(true);

  useEffect(()=>{fetch("/api/cv-share/"+encodeURIComponent(token),{cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.message||"CV indisponible.");return b}).then(setData).catch(e=>setError(e.message||"CV indisponible."));},[token]);

  useEffect(()=>{
    let cancelled=false;
    setMatchingLoading(true);
    fetch("/api/cv-share/"+encodeURIComponent(token)+"/matching",{cache:"no-store"})
      .then(async response=>{const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||"Compteur indisponible.");return body;})
      .then(body=>{if(!cancelled)setHigherScoreCount(body.matchingAvailable&&Number.isFinite(body.higherScoreCount)?Number(body.higherScoreCount):null);})
      .catch(()=>{if(!cancelled)setHigherScoreCount(null);})
      .finally(()=>{if(!cancelled)setMatchingLoading(false);});
    return ()=>{cancelled=true;};
  },[token]);

  if(error) return <main className="min-h-[100dvh] grid place-items-center bg-[#F5F7FA] p-6"><div className="rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-xl font-black text-[#0B2447]">CV indisponible</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></main>;
  if(!data) return <main className="min-h-[100dvh] grid place-items-center bg-[#F5F7FA] font-black text-[#0B2447]">Chargement du CV…</main>;

  const name=[data.user?.firstName,data.user?.lastName].filter(Boolean).join(" ")||data.user?.displayName||"Talent Jobly";
  const downloadUrl="/api/cv-share/"+encodeURIComponent(token)+"/pdf";

  return <main className="min-h-[100dvh] bg-[#F5F7FA] pb-10 text-[#0B2447]">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-5xl items-center justify-between"><div className="font-black tracking-tight"><span className="text-[#174EA6]">JOB</span><span className="text-[#FFE135]">LY</span></div><a href="/download" className="rounded-full border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider">Télécharger Jobly</a></div></header>

    <div className="mx-auto max-w-4xl px-4 py-5 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-400">CV professionnel</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{name}</h1><p className="mt-1 text-sm font-bold text-[#174EA6]">{data.share?.companyName ? "Candidature — "+data.share.companyName : data.share?.jobTitle || data.profile?.headline || "Profil professionnel"}</p></div><a href={downloadUrl} className="inline-flex items-center gap-2 rounded-2xl bg-[#174EA6] px-4 py-3 text-sm font-black text-white shadow-lg"><Download size={16}/> Télécharger le CV</a></div>

      {data.application?.cvText ? (
        <article className="overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-200 bg-[#0B2447] px-6 py-5 text-white sm:px-9">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#FFE135]">CV validé sur Jobly</p>
            <h2 className="mt-2 text-xl font-black">{name}</h2>
            <p className="mt-1 text-xs text-white/70">{data.share?.jobTitle || "Candidature"}{data.share?.companyName ? " · " + data.share.companyName : ""}</p>
          </div>
          <div className="p-6 sm:p-9">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">{data.application.cvText}</pre>
            {data.application.coverLetterRequired && data.application.letterText && (
              <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs font-black text-navy">Lettre de motivation validée</p><p className="mt-1 text-[10px] text-slate-500">Document associé à cette candidature.</p></div>
                  <a href={"/api/cv-share/" + encodeURIComponent(token) + "/letter"} className="rounded-xl bg-[#174EA6] px-4 py-2.5 text-xs font-black text-white">Télécharger la lettre PDF</a>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{data.application.letterText}</p>
              </div>
            )}
          </div>
        </article>
      ) : null}

      <article className={data.application?.cvText ? "hidden" : "overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200"}>
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

    <AnimatePresence>
      {showRecruiter && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-[#06152B]/80 p-4 backdrop-blur-md" role="presentation">
          <motion.section initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.97 }} transition={{ type: "spring", stiffness: 220, damping: 22 }} role="dialog" aria-modal="true" aria-labelledby="jobly-recruiter-match-title" className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/15 bg-[#081B36] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#FFE135]/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#3378D8]/20 blur-3xl" />
              <div className="absolute right-5 top-12 select-none text-7xl font-black tracking-tighter text-white/[.035] sm:text-8xl">MATCH</div>
              <div className="absolute bottom-5 right-8 h-28 w-28 rounded-full border border-white/[.07]" />
              <div className="absolute bottom-12 right-16 h-16 w-16 rounded-full border border-[#FFE135]/[.12]" />
            </div>
            <button type="button" aria-label="Fermer" onClick={() => setShowRecruiter(false)} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"><X size={18}/></button>
            <div className="relative z-[1]">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#FFE135]"><Sparkles size={14}/> JOBLY · TALENT INTELLIGENCE</div>
              <h2 id="jobly-recruiter-match-title" className="mt-3 max-w-xl text-2xl font-black leading-tight sm:text-3xl">Votre offre attire des talents qui correspondent.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Pour le poste de {data.share?.jobTitle || "cette offre"}, découvrez le nombre de profils dont le score dépasse celui du candidat qui vous a contacté.</p>
              <MiniTalentDemo jobTitle={data.share?.jobTitle} count={higherScoreCount} loading={matchingLoading}/>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setShowRecruiter(false)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-black text-white transition hover:bg-white/10">Fermer · Lire le CV</button>
                <button type="button" onClick={() => router.push("/recruiter/discover/" + encodeURIComponent(token))} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFE135] px-5 py-3.5 text-sm font-black text-[#081B36] shadow-[0_8px_24px_rgba(255,225,53,.18)] transition hover:brightness-105">Voir les talents <ArrowRight size={16}/></button>
              </div>
              <p className="mt-4 text-center text-[10px] font-semibold text-white/40">Les profils protégés restent anonymisés. Leur ouverture nécessite un abonnement recruteur avec le droit de matching actif.</p>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  </main>;
}
