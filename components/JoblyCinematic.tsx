"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Bell, BriefcaseBusiness, Check, Heart, Home, MessageCircle, Play, RefreshCw, Send, Sparkles, UserRound, X, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { companyAvatar } from "@/lib/avatar";

const C = { yellow:"#FFE135", blue:"#7A9BB5", navy:"#2E3F4F", white:"#FFFEFB" };

function haptic(level:"light"|"medium"|"heavy"="light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(level === "heavy" ? [18,22,45] : level === "medium" ? 26 : 9);
}
function sound(kind:"pop"|"whoosh"|"ding") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const start = ctx.currentTime;
    const f = kind==="ding" ? 760 : kind==="pop" ? 480 : 230;
    osc.type = kind==="whoosh" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(f,start);
    osc.frequency.exponentialRampToValueAtTime(kind==="whoosh"?85:f*1.6,start+.16);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(.055,start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+.19);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start+.2);
  } catch {}
}
function Tap({children,onClick,className="",ariaLabel}:{children:React.ReactNode;onClick?:()=>void;className?:string;ariaLabel?:string}) {
  return <motion.button type="button" aria-label={ariaLabel} whileTap={{scale:.96}} onClick={()=>{haptic();onClick?.()}} className={className}>{children}</motion.button>;
}
function BlobShape({className=""}:{className?:string}) {
  return <motion.div aria-hidden className={`pointer-events-none absolute rounded-full blur-[70px] opacity-35 ${className}`}
    animate={{x:[0,38,-22,0],y:[0,-25,28,0],scale:[1,1.14,.96,1]}}
    transition={{duration:20,repeat:Infinity,ease:"easeInOut"}}/>;
}
function Confetti({show}:{show:boolean}) {
  if(!show) return null;
  return <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">{Array.from({length:42}).map((_,i)=>
    <motion.i key={i} className="absolute h-2 w-1 rounded-full bg-[#FFE135]"
      style={{left:`${(i*47)%100}%`,top:"45%"}}
      initial={{opacity:0,scale:0,y:0,x:0,rotate:0}}
      animate={{opacity:[0,1,0],scale:[.4,1,0],y:[0,(i%2?1:-1)*(100+(i*23)%180)],x:[0,(i%3-1)*90],rotate:[0,360]}}
      transition={{duration:1.2,delay:i*.012}}/>
  )}</div>;
}
function Glass({children,className=""}:{children:React.ReactNode;className?:string}) {
  return <div className={`border border-white/20 bg-white/[.09] backdrop-blur-[24px] shadow-[0_16px_40px_rgba(46,63,79,.30)] ${className}`}>{children}</div>;
}
function GiantOutline({children,className=""}:{children:React.ReactNode;className?:string}) {
  return <div aria-hidden className={`pointer-events-none absolute select-none text-transparent [-webkit-text-stroke:1px_#FFE135] opacity-35 jobly-outline-pulse ${className}`}>{children}</div>;
}
function Nav3D({active,items}:{active:string;items:{label:string;href:string;icon:React.ReactNode}[]}) {
  const router=useRouter();
  return <Glass className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-22px)] max-w-[620px] -translate-x-1/2 rounded-[30px] p-2">
    {items.map(x=><Tap key={x.label} onClick={()=>router.push(x.href)} className={`group flex flex-1 flex-col items-center gap-1 rounded-[23px] py-2 ${active===x.label?"bg-[#FFE135] text-[#2E3F4F]":"text-[#FFFEFB]/75"}`}>
      <span className="grid h-7 w-7 place-items-center rounded-full border border-current/20 bg-white/10 shadow-[inset_0_1px_8px_rgba(255,255,255,.2)]">{x.icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-[1.25px]">{x.label}</span>
    </Tap>)}
  </Glass>;
}

type MatchBreakdown = { role:number; city:number; contract:number; remote:number; experience:number };
type Job = {
 source:"discovery"|"recruiter"; id:string; title:string; location:string|null; contractType:string|null;
 remoteMode:string|null; company:{name:string;logoUrl:string|null}|null; matchPercent:number; createdAt:string;
 matchBreakdown?:MatchBreakdown;
};

function matchReasons(b?:MatchBreakdown):string[]{
  if(!b)return [];
  const out:string[]=[];
  if(b.role>0)out.push("Métier ciblé");
  if(b.city>0)out.push("Ville souhaitée");
  if(b.contract>0)out.push("Type de contrat");
  if(b.remote>0)out.push("Télétravail");
  if(b.experience>0)out.push("Expérience suffisante");
  return out;
}

export function CinematicTalentFeed() {
  const router=useRouter();
  const [token,setToken]=useState<string|null>(null), [jobs,setJobs]=useState<Job[]>([]);
  const [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null), [refreshing,setRefreshing]=useState(false);
  const [applied,setApplied]=useState<Set<string>>(new Set());
  const [burst,setBurst]=useState(false), [query,setQuery]=useState("");

  useEffect(()=>{getSupabaseClient().auth.getSession().then(({data})=>{
    if(!data.session){router.replace("/");return} setToken(data.session.access_token);
  })},[router]);

  const load=useCallback(async(isManualRefresh?:boolean)=>{
    if(!token)return;
    if(isManualRefresh)setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const p=new URLSearchParams(); if(query.trim())p.set("q",query.trim());
      const [jr,ar]=await Promise.all([
        fetch(`/api/jobs?${p}`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch("/api/applications",{headers:{Authorization:`Bearer ${token}`}})
      ]);
      const jb=await jr.json(); if(!jr.ok)throw new Error(jb.message||"Offres indisponibles.");
      setJobs(jb.jobs||[]);
      if(ar.ok){const ab=await ar.json();setApplied(new Set((ab.applications||[]).map((a:any)=>`${a.source}:${a.jobId||a.recruiterJobId}`)))}
    }catch(e){setError(e instanceof Error?e.message:"Erreur réseau.")}finally{setLoading(false);setRefreshing(false)}
  },[token,query]);

  useEffect(()=>{load()},[load]);

  async function apply(job:Job){
    if(!token)return;
    const key=`${job.source}:${job.id}`; if(applied.has(key))return;
    setApplied(p=>new Set(p).add(key)); haptic(job.matchPercent>=90?"heavy":"medium"); sound("ding"); setBurst(true); setTimeout(()=>setBurst(false),1300);
    try {
      const r=await fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({source:job.source,jobId:job.id})});
      if(!r.ok && r.status!==409)setApplied(p=>{const n=new Set(p);n.delete(key);return n});
    }catch{}
  }
  const visible=useMemo(()=>jobs.slice(0,10),[jobs]);

  return <main className="min-h-[100dvh] overflow-hidden bg-[#2E3F4F] pb-28 text-[#FFFEFB]">
    <BlobShape className="left-[-18%] top-[5%] h-[44vw] w-[44vw] bg-[#7A9BB5]"/><BlobShape className="right-[-20%] top-[45%] h-[50vw] w-[50vw] bg-[#7A9BB5]"/>
    <GiantOutline className="right-[-6%] top-20 text-[120px] font-black italic leading-none">READY</GiantOutline>
    <div className="relative mx-auto max-w-6xl px-5 pt-7 sm:px-8">
      <header className="flex items-end justify-between">
        <div><span className="text-[10px] font-semibold uppercase tracking-[2px] text-[#7A9BB5]">JOBLY / TALENT FEED</span>
        <h1 className="mt-2 text-[54px] font-black italic leading-[.78] tracking-[-.07em] sm:text-8xl">Your <span className="font-light not-italic">Next</span><br/><span className="text-[#FFE135]">Role</span> <span className="font-light">is</span> <span className="underline decoration-[#FFE135]">Ready.</span></h1></div>
        <Tap ariaLabel="Notifications" onClick={()=>router.push("/notifications")} className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-[#FFE135]"><Bell size={20}/></Tap>
      </header>
      <div className="mt-7 flex items-center gap-3">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the signal…" className="h-12 min-w-0 flex-1 rounded-full border border-white/15 bg-white/[.08] px-5 text-sm text-[#FFFEFB] outline-none placeholder:text-white/45 focus:border-[#FFE135]"/>
        <Tap ariaLabel="Actualiser les offres" onClick={()=>load(true)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-[#FFE135]"><RefreshCw size={18} className={refreshing?"animate-spin":""}/></Tap>
      </div>
      {!loading&&!error&&<p className="mt-3 text-[11px] font-semibold uppercase tracking-[1.2px] text-[#7A9BB5]">{jobs.length} offre{jobs.length>1?"s":""} analysée{jobs.length>1?"s":""} sur ton profil</p>}
      {error&&<div className="mt-4 rounded-2xl border border-[#7A9BB5]/30 bg-white/10 p-3 text-xs font-bold">{error}</div>}
      {loading&&jobs.length===0?<div className="mt-9 h-[440px] animate-pulse rounded-[38px] bg-white/10"/>:
      <div className="mt-9 grid gap-5 md:grid-cols-2">{visible.map((job,i)=>{
        const key=`${job.source}:${job.id}`, done=applied.has(key), high=job.matchPercent>=90;
        const reasons=matchReasons(job.matchBreakdown);
        const visual=job.company?.logoUrl||companyAvatar(job.company?.name);
        return <motion.article key={key} initial={{opacity:0,y:45,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{delay:i*.08,type:"spring",stiffness:200,damping:12}}
          className={`relative overflow-hidden rounded-[32px] border border-white/20 bg-white/[.09] p-4 backdrop-blur-[24px] shadow-[0_16px_40px_rgba(46,63,79,.32)] ${i%3===1?"md:rotate-[1deg]":i%3===2?"md:-rotate-[1deg]":""}`}>
          <div className="relative overflow-hidden rounded-[27px] bg-[#7A9BB5]/25">
            <img className="aspect-[16/9] w-full object-cover opacity-90" src={visual} alt={job.company?.name||"Entreprise"}/>
            <div className="absolute inset-0 bg-gradient-to-t from-[#2E3F4F] via-transparent to-transparent"/>
            <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-[#2E3F4F]/65 px-3 py-1 text-[9px] font-bold uppercase tracking-[1.3px] backdrop-blur">Opportunity signal</div>
          </div>
          <div className="-mt-5 relative mx-2 rounded-[27px] border border-white/15 bg-[#2E3F4F]/80 p-4 backdrop-blur-[24px]">
            <div className="flex items-start justify-between gap-3"><div><span className="text-[9px] font-bold uppercase tracking-[1.8px] text-[#7A9BB5]">{job.company?.name||"JOBLY OPPORTUNITY"}</span><h2 className="mt-1 text-[28px] font-black leading-[.9] tracking-[-.04em]">{job.title}</h2></div>
              <div className="text-right"><strong className="text-5xl font-black text-[#FFE135]">{job.matchPercent}<span className="text-lg">%</span></strong><span className="block text-[9px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">MATCH</span></div></div>
            <p className="mt-3 text-[13px] font-light italic text-white/70">{[job.location,job.contractType,job.remoteMode].filter(Boolean).join(" · ")||"Worldwide"}</p>
            {reasons.length>0&&<p className="mt-2 text-[11px] font-semibold text-[#FFE135]/90">Pourquoi : {reasons.join(" · ")}</p>}
            <div className="mt-5 flex gap-2"><Tap onClick={()=>apply(job)} className={`h-14 flex-1 rounded-full font-black ${done?"bg-white/20 text-[#FFFEFB]":"bg-[#FFE135] text-[#2E3F4F]"}`}>{done?<><Check size={18} className="mr-2 inline"/>Applied</>:<><Send size={17} className="mr-2 inline"/>Apply Now</>}</Tap>
              <Tap ariaLabel="Open opportunity" onClick={()=>router.push(`/jobs/${job.id}?source=${job.source}`)} className="h-11 w-11 rounded-full border border-white/15 bg-white/10 text-[#FFE135]"><ArrowUpRight size={18}/></Tap></div>
          </div><Confetti show={burst&&high}/></motion.article>
      })}</div>}
    </div>
    <Nav3D active="Apply" items={[{label:"Home",href:"/dashboard",icon:<Home size={16}/>},{label:"Matches",href:"/opportunities",icon:<Heart size={16}/>},{label:"Apply",href:"/jobs",icon:<Send size={16}/>},{label:"Messages",href:"/notifications",icon:<MessageCircle size={16}/>},{label:"Profile",href:"/talent/profile",icon:<UserRound size={16}/>}]} />
  </main>;
}

export function CinematicRecruiter() {
  const router=useRouter(); const [apps,setApps]=useState<any[]>([]); const [idx,setIdx]=useState(0); const [burst,setBurst]=useState(false); const [expanded,setExpanded]=useState(false); const [morph,setMorph]=useState<any|null>(null);
  useEffect(()=>{getSupabaseClient().auth.getSession().then(async({data})=>{if(!data.session){router.replace("/");return} const r=await fetch("/api/recruiter/applications",{headers:{Authorization:`Bearer ${data.session.access_token}`}}); if(r.ok){const b=await r.json();setApps(b.applications||[])}})},[router]);
  const current=apps[idx];
  const [pitchPlaying,setPitchPlaying]=useState(true);
  const openProfile=()=>{if(!current)return;haptic("medium");sound("pop");setMorph(current);sessionStorage.setItem("jobly:selected-talent",JSON.stringify(current));setTimeout(()=>router.push(`/talent/profile?candidate=${encodeURIComponent(current.userId||current.id)}`),520)};
  const next=(like:boolean)=>{if(!current)return;setPitchPlaying(false);haptic(like?"medium":"light");sound(like?"pop":"whoosh");if(like && 94>=90){haptic("heavy");setBurst(true);setTimeout(()=>setBurst(false),1200)} setTimeout(()=>setIdx(i=>i+1),180)};
  return <main className="min-h-[100dvh] overflow-hidden bg-[#2E3F4F] pb-28 text-[#FFFEFB]"><BlobShape className="left-[-20%] top-[10%] h-[45vw] w-[45vw] bg-[#7A9BB5]"/><BlobShape className="right-[-15%] bottom-[5%] h-[50vw] w-[50vw] bg-[#7A9BB5]"/>
    <GiantOutline className="left-[-4%] top-24 text-[120px] font-black italic leading-none">TALENT</GiantOutline>
    <div className="relative mx-auto max-w-5xl px-5 pt-7 sm:px-8"><header className="flex items-end justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[2px] text-[#7A9BB5]">RECRUITER / MATCH LAB</span><h1 className="mt-2 text-[70px] font-black italic leading-[.72] tracking-[-.08em]">TAL<span className="font-light not-italic">ENT</span></h1></div><span className="text-right text-[9px] font-bold uppercase tracking-[1.7px] text-[#FFE135]">WATCH<br/>SWIPE<br/>MATCH</span></header>
      <div className="relative mx-auto mt-10 max-w-md">
        {!current?<Glass className="rounded-[38px] p-9 text-center"><Sparkles className="mx-auto text-[#FFE135]" size={32}/><h2 className="mt-4 text-3xl font-black">{apps.length?"You've seen the stack.":"Your match stack is loading."}</h2><p className="mt-2 text-[13px] italic text-white/65">{apps.length?"Reviens bientôt pour de nouveaux talents.":"Les candidatures réelles apparaîtront ici."}</p></Glass>:
        <motion.div key={current.id} drag="x" dragConstraints={{left:0,right:0}} onDragEnd={(_,info)=>{if(Math.abs(info.offset.x)>75)next(info.offset.x>0)}} initial={{opacity:0,y:40,scale:.96}} animate={{opacity:1,y:0,scale:1}} transition={{type:"spring",stiffness:200,damping:12}} className="relative overflow-hidden rounded-[38px] border border-white/20 bg-white/[.09] p-4 backdrop-blur-[24px] shadow-[0_22px_70px_rgba(0,0,0,.35)]">
          <div className="relative overflow-hidden rounded-[30px] bg-[#7A9BB5]/20"><video className="h-[430px] w-full object-cover" src={current.pitchVideoUrl || undefined} poster={current.profilePhotoUrl || "/jobly/cinematic-ui.png"} autoPlay={!!current.pitchVideoUrl && pitchPlaying} muted loop playsInline onClick={()=>{if(current.pitchVideoUrl){setPitchPlaying(v=>!v);sound("pop");haptic("medium")}}}/>{!current.pitchVideoUrl&&<div className="absolute inset-0 grid place-items-center bg-[#2E3F4F]/55 p-8 text-center"><div><span className="text-[10px] font-black uppercase tracking-[2px] text-[#FFE135]">PITCH À COMPLÉTER</span><p className="mt-2 text-sm font-bold">Ce talent n’a pas encore publié son pitch vidéo.</p></div></div>}<div className="absolute inset-0 bg-gradient-to-t from-[#2E3F4F] via-transparent to-transparent"/>{current.pitchVideoUrl&&<Tap ariaLabel={pitchPlaying?"Pause talent pitch":"Play talent pitch"} onClick={()=>{setPitchPlaying(v=>!v);sound("pop");haptic("medium")}} className="absolute left-1/2 top-1/2 grid h-[70px] w-[70px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F] shadow-[0_0_48px_rgba(255,225,53,.45)]"><Play fill="currentColor"/></Tap>}</div>
          <div className="-mt-20 relative mx-2 rounded-[30px] border border-white/15 bg-[#2E3F4F]/85 p-5 backdrop-blur-[24px]"><div className="flex justify-between gap-4"><div><span className="text-[9px] font-bold uppercase tracking-[1.8px] text-[#7A9BB5]">{current.candidateRole||"TALENT"}</span><button type="button" onClick={openProfile} className="mt-1 text-left text-4xl font-black underline decoration-[#FFE135]/70 underline-offset-4">{current.candidateName||"Candidate"}</button></div><div className="text-right"><strong className="text-6xl font-black text-[#FFE135]">94<span className="text-xl">%</span></strong><span className="block text-[9px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">MATCH</span></div></div>
            <div className="mt-5 flex gap-2"><Tap ariaLabel="Pass" onClick={()=>next(false)} className="h-12 w-12 rounded-full border border-white/15 bg-white/10"><X/></Tap><Tap onClick={()=>next(true)} className="h-12 flex-1 rounded-full bg-[#FFE135] font-black text-[#2E3F4F]"><Heart className="mr-2 inline" size={18}/>Like</Tap></div>
          </div><Confetti show={burst}/></motion.div>}
      </div>
      <Tap onClick={()=>setExpanded(true)} className="mx-auto mt-5 flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-xs font-bold"><BriefcaseBusiness size={16}/> My hiring stack <ArrowUpRight size={15}/></Tap>
    </div>
    <AnimatePresence>{expanded&&<motion.div className="fixed inset-0 z-[60] flex items-end bg-[#2E3F4F]/65 p-3 backdrop-blur-md" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div initial={{y:"92%"}} animate={{y:0}} exit={{y:"92%"}} transition={{type:"spring",damping:12,stiffness:200}} className="w-full rounded-[38px] bg-[#2E3F4F]/96 p-6"><button onClick={()=>setExpanded(false)} className="float-right text-[#FFE135]"><X/></button><span className="text-[9px] font-bold uppercase tracking-[2px] text-[#7A9BB5]">HIRING INTELLIGENCE</span><h2 className="mt-3 text-5xl font-black">Your stack.<br/><span className="font-light italic">Your call.</span></h2><p className="mt-4 text-sm italic text-white/65">{apps.length} candidature(s) disponibles dans ton flux.</p></motion.div></motion.div>}</AnimatePresence>
    <Nav3D active="Matches" items={[{label:"Home",href:"/recruiter",icon:<Home size={16}/>},{label:"Matches",href:"/recruiter",icon:<Heart size={16}/>},{label:"Apply",href:"/recruiter/jobs",icon:<Send size={16}/>},{label:"Messages",href:"/notifications",icon:<MessageCircle size={16}/>},{label:"Profile",href:"/recruiter/profile",icon:<UserRound size={16}/>}]} />
    <AnimatePresence>{morph&&<motion.div className="fixed inset-0 z-[100] bg-[#2E3F4F] p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <motion.div layoutId={`talent-${morph.id}`} className="absolute inset-4 overflow-hidden rounded-[38px] border border-white/25 bg-[#2E3F4F] shadow-[0_30px_100px_rgba(0,0,0,.45)]">
        <video className="h-full w-full object-cover opacity-75" src="/jobly/ambient-loop.mp4" autoPlay muted loop playsInline poster="/jobly/cinematic-ui.png"/>
        <div className="absolute inset-0 bg-gradient-to-t from-[#2E3F4F] via-transparent to-[#2E3F4F]/10"/>
        <motion.div initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.15,type:"spring",stiffness:200,damping:12}} className="absolute bottom-8 left-6 right-6">
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#7A9BB5]">SHARED ELEMENT / TALENT PROFILE</span>
          <h2 className="mt-2 text-5xl font-black leading-[.85]">{morph.candidateName||"Candidate"}</h2>
        </motion.div>
      </motion.div>
    </motion.div>}</AnimatePresence>
  </main>;
}

function TalentPitchStudio({owner,plan,pitchUrl,pitchDuration,busy,message,recording,setRecording,recordSeconds,setRecordSeconds,onUpload,onDelete,router}:{owner:any;plan:"FREE"|"PREMIUM"|"PRO";pitchUrl:string|null;pitchDuration:number|null;busy:boolean;message:string|null;recording:boolean;setRecording:(v:boolean)=>void;recordSeconds:number;setRecordSeconds:(v:number)=>void;onUpload:(f:File)=>Promise<void>;onDelete:()=>Promise<void>;router:any}){
  const [stream,setStream]=useState<MediaStream|null>(null); const [rec,setRec]=useState<MediaRecorder|null>(null); const [localError,setLocalError]=useState<string|null>(null);
  const videoRef=React.useRef<HTMLVideoElement>(null); const timerRef=React.useRef<number|null>(null); const maxSeconds=plan==="PRO"?20:plan==="PREMIUM"?10:0;
  useEffect(()=>()=>{stream?.getTracks().forEach(t=>t.stop());if(timerRef.current)window.clearInterval(timerRef.current)},[stream]);
  async function start(){
    setLocalError(null);
    if(!maxSeconds){setLocalError("Le pitch vidéo est disponible avec les formules Pro et Premium.");return;}
    if(!navigator.mediaDevices?.getUserMedia){setLocalError("Caméra non disponible sur ce navigateur.");return;}
    try{const s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});setStream(s);if(videoRef.current){videoRef.current.srcObject=s;await videoRef.current.play();}
      if(!window.MediaRecorder)throw new Error("Enregistrement vidéo non pris en charge par ce navigateur.");
      const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":MediaRecorder.isTypeSupported("video/webm")?"video/webm":MediaRecorder.isTypeSupported("video/mp4")?"video/mp4":"";
      if(!mime)throw new Error("Format d’enregistrement non pris en charge.");
      const mr=new MediaRecorder(s,{mimeType:mime});
      const parts:Blob[]=[];mr.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};mr.onstop=async()=>{s.getTracks().forEach(t=>t.stop());setStream(null);setRec(null);setRecording(false);if(timerRef.current)window.clearInterval(timerRef.current);setRecordSeconds(0);const blob=new Blob(parts,{type:mr.mimeType||"video/webm"});const file=Object.assign(blob,{name:`jobly-pitch-${Date.now()}.webm`,lastModified:Date.now()}) as File;await onUpload(file);};
      setRec(mr);setRecording(true);setRecordSeconds(0);mr.start();const started=Date.now();timerRef.current=window.setInterval(()=>{const sec=Math.min(maxSeconds,Math.floor((Date.now()-started)/1000));setRecordSeconds(sec);if(sec>=maxSeconds)mr.stop()},200);
    }catch(e){setRecording(false);setRecordSeconds(0);setLocalError(e instanceof Error?e.message:"Impossible de démarrer la caméra.");}
  }
  function stop(){if(rec?.state!=="inactive")rec?.stop();}
  return <main className="min-h-[100dvh] overflow-hidden bg-[#2E3F4F] pb-28 text-[#FFFEFB]"><BlobShape className="left-[-18%] top-[6%] h-[45vw] w-[45vw] bg-[#7A9BB5]"/><GiantOutline className="right-[-8%] top-24 text-[110px] font-black italic">PITCH</GiantOutline><div className="relative mx-auto max-w-3xl px-5 pt-7 sm:px-8"><button onClick={()=>router.back()} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold">← Back</button><span className="mt-8 block text-[10px] font-black uppercase tracking-[2px] text-[#7A9BB5]">TALENT / VIDEO PITCH</span><h1 className="mt-2 text-[58px] font-black italic leading-[.8] tracking-[-.07em]">Show them<br/><span className="text-[#FFE135]">you.</span></h1><p className="mt-5 max-w-xl text-[13px] italic text-white/65">Crée un pitch vidéo court pour te présenter aux recruteurs. Pro : 20 s max · Premium : 10 s max.</p><div className="mt-7 overflow-hidden rounded-[36px] border border-white/20 bg-white/[.08] p-3 backdrop-blur-[24px]">{recording?<video ref={videoRef} muted playsInline className="aspect-[9/16] max-h-[58vh] w-full rounded-[30px] bg-[#7A9BB5]/20 object-cover"/>:pitchUrl?<video src={pitchUrl} controls muted playsInline className="aspect-[9/16] max-h-[58vh] w-full rounded-[30px] bg-[#7A9BB5]/20 object-cover"/>:<div className="grid aspect-[9/16] max-h-[58vh] place-items-center rounded-[30px] bg-[#7A9BB5]/20 p-8 text-center"><div><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F]">●</div><p className="mt-5 text-sm font-black">Aucun pitch publié</p><p className="mt-1 text-xs text-white/55">Enregistre ou importe ta vidéo.</p></div></div>} {recording&&<div className="absolute ml-[-1px] mt-[-78px] rounded-full bg-[#2E3F4F]/85 px-4 py-2 text-[11px] font-black text-[#FFE135]">REC · {recordSeconds}s / {maxSeconds}s</div>}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button disabled={busy||recording||!maxSeconds} onClick={start} className="rounded-full bg-[#FFE135] py-4 font-black text-[#2E3F4F]">{recording?"Recording…":"Record 5–{maxSeconds}s pitch"}</button><label className={`cursor-pointer rounded-full border border-white/20 bg-white/10 py-4 text-center font-black ${busy||recording?"pointer-events-none opacity-50":""}`}>Upload video<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" disabled={busy||recording||!maxSeconds} onChange={e=>{const f=e.target.files?.[0];if(f)void onUpload(f);e.currentTarget.value=""}}/></label></div>{recording&&<button onClick={stop} className="mt-3 w-full rounded-full border border-white/20 bg-white/10 py-3 text-xs font-black">Stop recording</button>}{pitchUrl&&<div className="mt-5 flex items-center justify-between rounded-[26px] border border-white/15 bg-white/[.08] p-4"><div><span className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">LIVE SIGNAL</span><p className="mt-1 text-sm font-black">Pitch publié · {pitchDuration?`${(pitchDuration/1000).toFixed(1)}s`:"durée validée"}</p></div><button disabled={busy} onClick={()=>void onDelete()} className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold">Supprimer</button></div>}{(message||localError)&&<p className="mt-4 rounded-2xl border border-[#FFE135]/25 bg-[#FFE135]/10 p-3 text-xs font-bold text-[#FFE135]">{message||localError}</p>}<p className="mt-6 text-[10px] font-semibold uppercase tracking-[1.4px] text-white/45">MP4 · WEBM · MOV · 25MB MAX · PRO 20S · PREMIUM 10S</p></div><Nav3D active="Profile" items={[{label:"Home",href:"/dashboard",icon:<Home size={16}/>},{label:"Matches",href:"/opportunities",icon:<Heart size={16}/>},{label:"Apply",href:"/jobs",icon:<Send size={16}/>},{label:"Messages",href:"/notifications",icon:<MessageCircle size={16}/>},{label:"Profile",href:"/talent/profile",icon:<UserRound size={16}/>}]} /></main>;
}

export function CinematicProfile() {
  const router=useRouter(); const params=useSearchParams();
  const [candidate,setCandidate]=useState<any|null>(null); const [owner,setOwner]=useState<any|null>(null); const [chat,setChat]=useState(false); const [menu,setMenu]=useState(false); const [playing,setPlaying]=useState(true); const [pitchUrl,setPitchUrl]=useState<string|null>(null); const [pitchDuration,setPitchDuration]=useState<number|null>(null); const [pitchBusy,setPitchBusy]=useState(false); const [pitchMessage,setPitchMessage]=useState<string|null>(null); const [recording,setRecording]=useState(false); const [recordSeconds,setRecordSeconds]=useState(0); const [pitchPlan,setPitchPlan]=useState<"FREE"|"PREMIUM"|"PRO">("FREE");
  const y=useMotionValue(0), sy=useSpring(y,{stiffness:200,damping:12}); const scale=useTransform(sy,[-300,0],[1.09,1]);
  useEffect(()=>{if(params.get("candidate"))return; getSupabaseClient().auth.getSession().then(async({data})=>{if(!data.session){router.replace("/");return;} const r=await fetch("/api/profile",{headers:{Authorization:`Bearer ${data.session.access_token}`}}); if(r.ok){const b=await r.json(); setOwner(b); setPitchPlan(b.plan === "PRO" ? "PRO" : b.plan === "PREMIUM" || b.plan === "PREMIUM_MONTHLY" || b.plan === "PREMIUM_ANNUAL" ? "PREMIUM" : "FREE"); setPitchUrl(b.user?.pitchVideoUrl||null); setPitchDuration(b.user?.pitchVideoDurationMs||null);}})},[params,router]);
  useEffect(()=>{try{const raw=sessionStorage.getItem("jobly:selected-talent"); if(raw)setCandidate(JSON.parse(raw))}catch{}},[]);
  useEffect(()=>{const id=params.get("candidate"); if(!id)return; getSupabaseClient().auth.getSession().then(async({data})=>{if(!data.session)return; const r=await fetch("/api/recruiter/applications",{headers:{Authorization:`Bearer ${data.session.access_token}`}}); if(r.ok){const b=await r.json(); const hit=(b.applications||[]).find((a:any)=>String(a.userId||a.id)===id); if(hit)setCandidate(hit)}})},[params]);
  const isOwner=!params.get("candidate");
  const photo=candidate?.profilePhotoUrl||null;
  const video=candidate?.pitchVideoUrl||null;
  async function uploadPitch(file:File){
    setPitchMessage(null);
    if(!["video/mp4","video/webm","video/quicktime"].includes(file.type)){setPitchMessage("Format accepté : MP4, WebM ou MOV.");return;}
    if(file.size>25*1024*1024){setPitchMessage("25 Mo maximum.");return;}
    const probe=document.createElement("video"); probe.preload="metadata"; const url=URL.createObjectURL(file); probe.src=url;
    await new Promise<void>((resolve)=>{probe.onloadedmetadata=()=>resolve();probe.onerror=()=>resolve();});
    const durationMs=Math.round((probe.duration||0)*1000); URL.revokeObjectURL(url);
    const maxSeconds = pitchPlan==="PRO" ? 20 : pitchPlan==="PREMIUM" ? 10 : 0;
    if(!maxSeconds){setPitchMessage("Le pitch vidéo est disponible avec les formules Pro et Premium.");return;}
    if(durationMs<5000||durationMs>maxSeconds*1000){setPitchMessage(`Ton pitch doit durer entre 5 et ${maxSeconds} secondes avec ta formule.`);return;}
    const session=(await getSupabaseClient().auth.getSession()).data.session; if(!session){router.replace("/");return;}
    setPitchBusy(true); const form=new FormData(); form.append("file",file); form.append("durationMs",String(durationMs));
    try{const r=await fetch("/api/auth/video-pitch",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`},body:form}); const b=await r.json(); if(!r.ok)throw new Error(b.message||"Upload impossible."); setPitchUrl(b.pitchVideoUrl);setPitchDuration(b.pitchVideoDurationMs);setPitchMessage("Pitch publié. Il apparaît maintenant dans le flux recruteur.");sound("ding");haptic("heavy");}catch(e){setPitchMessage(e instanceof Error?e.message:"Upload impossible.");}finally{setPitchBusy(false);}
  }
  async function removePitch(){const session=(await getSupabaseClient().auth.getSession()).data.session;if(!session)return;setPitchBusy(true);try{const r=await fetch("/api/auth/video-pitch",{method:"DELETE",headers:{Authorization:`Bearer ${session.access_token}`}});if(!r.ok)throw new Error("Suppression impossible.");setPitchUrl(null);setPitchDuration(null);setPitchMessage("Pitch supprimé.");}catch(e){setPitchMessage(e instanceof Error?e.message:"Suppression impossible.");}finally{setPitchBusy(false);}}
  const name=candidate?.candidateName||"Your next signal";
  const role=candidate?.candidateRole||candidate?.jobTitle||"Talent";
  if(isOwner){return <TalentPitchStudio owner={owner} plan={pitchPlan} pitchUrl={pitchUrl} pitchDuration={pitchDuration} busy={pitchBusy} message={pitchMessage} recording={recording} setRecording={setRecording} recordSeconds={recordSeconds} setRecordSeconds={setRecordSeconds} onUpload={uploadPitch} onDelete={removePitch} router={router}/>;}
  return <main className="min-h-[100dvh] overflow-hidden bg-[#2E3F4F] text-[#FFFEFB]">
    <motion.div style={{scale}} className="fixed inset-0">
      {video?<video className="h-full w-full object-cover opacity-80" src={video} autoPlay={playing} muted loop playsInline poster={photo||"/jobly/cinematic-ui.png"}/>:photo?<img src={photo} alt="" className="h-full w-full object-cover opacity-80"/>:<div className="h-full w-full bg-[#7A9BB5]/20"/>}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2E3F4F]/5 via-[#2E3F4F]/25 to-[#2E3F4F]"/>
    </motion.div>
    <motion.section style={{y:sy}} drag="y" dragConstraints={{top:-220,bottom:0}} className="relative min-h-[135dvh] px-5 pb-40 pt-[43vh] sm:px-10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#FFE135]">VIDEO PITCH / PROFILE</span>
        <Tap ariaLabel={playing?"Pause pitch":"Play pitch"} onClick={()=>{setPlaying(v=>!v);sound("pop")}} className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-[#FFE135] text-[#2E3F4F] shadow-[0_0_38px_rgba(255,225,53,.35)]"><Play fill="currentColor" size={18}/></Tap>
      </div>
      <h1 className="mt-3 max-w-5xl text-[60px] font-black leading-[.78] tracking-[-.07em] sm:text-8xl">{name}<br/><span className="font-light italic">in</span> <span className="underline decoration-[#FFE135]">{role}</span><span className="text-[#FFE135]">.</span></h1>
      <p className="mt-5 max-w-xl text-[13px] font-light italic text-white/70">Le talent passe devant. Les preuves restent derrière. Le profil devient une expérience, pas un CV.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Glass className="rounded-[30px] p-5"><span className="text-[9px] font-bold uppercase tracking-[1.7px] text-[#7A9BB5]">MATCH</span><strong className="mt-1 block text-6xl font-black text-[#FFE135]">94<span className="text-xl">%</span></strong><span className="text-[10px] text-white/60">Opportunity fit</span></Glass>
        <Glass className="rounded-full p-5"><span className="text-[9px] font-bold uppercase tracking-[1.7px] text-[#7A9BB5]">SIGNAL</span><strong className="mt-1 block text-2xl font-extrabold">Video first</strong><span className="text-[10px] italic text-white/60">Pitch · proof · presence</span></Glass>
        <Glass className="rounded-[30px] p-5 sm:translate-y-5"><span className="text-[9px] font-bold uppercase tracking-[1.7px] text-[#7A9BB5]">ROLE</span><strong className="mt-1 block text-2xl font-extrabold">{role}</strong><span className="text-[10px] italic text-white/60">Matched signal</span></Glass>
      </div>
      <div className="mt-8 flex max-w-xl gap-2"><Tap onClick={()=>{sound("pop");haptic("medium");setChat(true)}} className="h-14 flex-1 rounded-full bg-[#FFE135] font-black text-[#2E3F4F]"><MessageCircle className="mr-2 inline" size={19}/> Start conversation</Tap><Tap ariaLabel="Open actions" onClick={()=>setMenu(!menu)} className="h-14 w-14 rounded-full border border-white/20 bg-white/10 text-[#FFE135]"><Zap size={19}/></Tap></div>
      <p className="mt-7 text-[13px] font-light italic text-white/60">Le CV devient un signal secondaire. Le pitch, les preuves et le match occupent le premier plan.</p>
    </motion.section>
    <AnimatePresence>{chat&&<motion.div className="fixed inset-0 z-50 flex items-end bg-[#2E3F4F]/55 p-3 backdrop-blur-md" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div initial={{y:"60%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:12,stiffness:200}} className="w-full rounded-[38px] border border-white/20 bg-[#2E3F4F]/96 p-6"><div className="mx-auto h-1.5 w-12 rounded-full bg-white/20"/><span className="mt-6 block text-[9px] font-bold uppercase tracking-[2px] text-[#7A9BB5]">JOBLY AI / CONTACT</span><h2 className="mt-3 text-5xl font-black">Let's talk.<br/><span className="font-light italic">No noise.</span></h2><p className="mt-3 text-[13px] italic text-white/65">Le contact démarre dans ce panneau. La prochaine itération le branche au chat réel.</p><button onClick={()=>setChat(false)} className="mt-7 w-full rounded-full bg-[#FFE135] py-4 font-black text-[#2E3F4F]">Close</button></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{menu&&<motion.div className="fixed bottom-24 right-5 z-50 flex flex-col gap-3" initial={{opacity:0,scale:.7,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.7,y:20}}><Tap onClick={()=>{sound("pop");router.push("/talent/cvs")}} className="h-12 w-12 rounded-full bg-[#FFE135] text-[#2E3F4F] shadow-[0_0_35px_rgba(255,225,53,.35)]"><BriefcaseBusiness size={18}/></Tap><Tap onClick={()=>{sound("pop");router.push("/talent/settings")}} className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-[#FFE135]"><UserRound size={18}/></Tap></motion.div>}</AnimatePresence>
    <Nav3D active="Profile" items={[{label:"Home",href:"/dashboard",icon:<Home size={16}/>},{label:"Matches",href:"/opportunities",icon:<Heart size={16}/>},{label:"Apply",href:"/jobs",icon:<Send size={16}/>},{label:"Messages",href:"/notifications",icon:<MessageCircle size={16}/>},{label:"Profile",href:"/talent/profile",icon:<UserRound size={16}/>}]} />
  </main>;
}
