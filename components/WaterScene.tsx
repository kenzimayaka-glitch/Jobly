"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { JIA_MASTER_DATA_URI } from "./JiaMaster";

export type JiaGesture =
  | "welcome" | "analyze" | "point" | "write" | "validate" | "alert" | "apply" | "celebrate"
  | "wink" | "reassure" | "encourage" | "disappointed" | "surprised" | "curious" | "tired" | "proud"
  | "present-chart" | "handshake" | "present-team" | "pay-os" | "call-hr" | "filter" | "secure" | "goodbye";

export type JiaMotionIntent = { gesture: JiaGesture; message?: string; target?: string; voice?: boolean };

type Preset = { x: number[]; y: number[]; rotate: number[]; scale: number[]; duration: number; repeat?: number | "Infinity" };
const M=(x:number[],y:number[],r:number[],s:number[],duration:number,repeat?:number|"Infinity"):Preset=>({x,y,rotate:r,scale:s,duration,repeat});
const MOTIONS:Record<JiaGesture,Preset>={
 welcome:M([0,-5,4,0],[0,-3,0,0],[0,-1.2,1.2,0],[1,1.015,1,1],2.4,"Infinity"),
 analyze:M([0,-5,4,0],[0,1,-2,0],[0,-2,1,0],[1,1.025,1.015,1],2.8,"Infinity"),
 point:M([0,7,10,7,0],[0,-2,1,-1,0],[0,1.5,2.5,1,0],[1,1.02,1.025,1.02,1],1.5,"Infinity"),
 write:M([0,-2,2,0],[0,2,0,1,0],[0,1,-1,.6,0],[1,1.01,1,1.01,1],1.35,"Infinity"),
 validate:M([0,0,0],[0,-4,0],[0,-2,0],[1,1.045,1],1.15),
 alert:M([0,-3,3,-2,0],[0,-2,0,-1,0],[0,-2,2,-1,0],[1,1.03,1.03,1.02,1],1.1,2),
 apply:M([0,6,3,0],[0,-2,0,0],[0,1.5,.5,0],[1,1.02,1.01,1],1.3),
 celebrate:M([0,-8,8,-6,6,0],[0,-5,-2,-6,-2,0],[0,-2,2,-2,2,0],[1,1.05,1.04,1.05,1.04,1],1.8),
 wink:M([0,2,0],[0,-2,0],[0,1.2,0],[1,1.02,1],1.2),
 reassure:M([0,-3,3,0],[0,-3,0,0],[0,-1,1,0],[1,1.03,1.02,1],2,1),
 encourage:M([0,4,-4,0],[0,-5,0,0],[0,1,-1,0],[1,1.04,1.02,1],1.4,1),
 disappointed:M([0,-2,0],[0,5,0],[0,-3,0],[1,.985,1],1.5),
 surprised:M([0,0,0],[0,-7,0],[0,0,0],[1,1.065,1],1),
 curious:M([0,-5,5,0],[0,1,0,0],[0,-4,4,0],[1,1.02,1.02,1],1.7),
 tired:M([0,-2,2,0],[0,4,5,0],[0,-3,3,0],[1,.99,.99,1],2.2),
 proud:M([0,0,0],[0,-4,0],[0,0,0],[1,1.04,1],1.3),
 "present-chart":M([0,-7,6,0],[0,-2,0,0],[0,-1,2,0],[1,1.02,1.02,1],1.8),
 handshake:M([0,7,-4,7,0],[0,0,-2,0,0],[0,1.5,-1,1.5,0],[1,1.02,1.01,1.02,1],1.8),
 "present-team":M([0,-6,6,0],[0,-2,0,0],[0,-1,1,0],[1,1.02,1.02,1],1.7),
 "pay-os":M([0,-4,4,0],[0,-3,0,0],[0,-1.5,1.5,0],[1,1.025,1.02,1],1.8),
 "call-hr":M([0,5,-2,5,0],[0,-2,0,-1,0],[0,1.5,-.5,1.5,0],[1,1.02,1,1.02,1],1.7),
 filter:M([0,-5,5,0],[0,1,-1,0],[0,-2,2,0],[1,1.02,1.02,1],1.5),
 secure:M([0,0,0],[0,-3,0],[0,0,0],[1,1.03,1],1.4),
 goodbye:M([0,-5,5,-3,0],[0,-2,0,-1,0],[0,-1.5,1.5,-.5,0],[1,1.02,1.02,1.01,1],1.9),
};
const LABELS:Record<JiaGesture,string>={welcome:"Bienvenue",analyze:"J’analyse",point:"Je te montre",write:"Je note",validate:"C’est validé",alert:"Attention",apply:"Je postule",celebrate:"Bravo",wink:"Clin d’œil",reassure:"Je suis avec toi",encourage:"On continue",disappointed:"On ajuste",surprised:"Belle opportunité",curious:"Regardons",tired:"Je continue",proud:"Fière de toi","present-chart":"Voici les données",handshake:"Partenariat","present-team":"L’équipe","pay-os":"PAY OS","call-hr":"Relation RH",filter:"Je filtre",secure:"C’est sécurisé",goodbye:"À bientôt"};

function speak(text:string){if(typeof window==="undefined"||!text||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=document.documentElement.lang?.startsWith("en")?"en-US":"fr-FR";u.rate=.96;u.pitch=1.02;window.speechSynthesis.speak(u);}

export default function WaterScene({intent}:{intent?:JiaMotionIntent}={}){
 const reduce=useReducedMotion(); const explicit=!!intent; const [active,setActive]=useState<JiaMotionIntent>(intent??{gesture:"welcome"}); const lastVoice=useRef("");
 useEffect(()=>{if(intent)setActive(intent)},[intent?.gesture,intent?.message,intent?.target,intent?.voice]);
 useEffect(()=>{if(explicit)return;const timers=[window.setTimeout(()=>setActive({gesture:"analyze",message:"Je regarde déjà comment t’accompagner."}),3600),window.setTimeout(()=>setActive({gesture:"reassure",message:"Tu n’es pas seul dans ton parcours."}),7200)];return()=>timers.forEach(clearTimeout)},[explicit]);
 useEffect(()=>{if(!active.voice||!active.message||lastVoice.current===active.message)return;lastVoice.current=active.message;speak(active.message)},[active.voice,active.message]);
 const p=useMemo(()=>MOTIONS[active.gesture]??MOTIONS.welcome,[active.gesture]); const repeat=reduce?0:p.repeat==="Infinity"?Infinity:p.repeat;
 return <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#163A63_0%,#071326_42%,#020410_100%)]">
  <div className="pointer-events-none absolute inset-0 opacity-80"><motion.div className="absolute left-1/2 top-[12%] h-72 w-72 -translate-x-1/2 rounded-full bg-[#39D7FF]/10 blur-3xl" animate={{scale:[1,1.12,1],opacity:[.35,.55,.35]}} transition={{duration:5.5,repeat:Infinity,ease:"easeInOut"}}/><motion.div className="absolute bottom-[10%] left-1/2 h-40 w-[70vw] -translate-x-1/2 rounded-[50%] border border-[#39D7FF]/20" animate={{scaleX:[1,1.08,1],opacity:[.3,.65,.3]}} transition={{duration:3.8,repeat:Infinity,ease:"easeInOut"}}/></div>
  <div className="absolute inset-x-0 bottom-0 top-[5%] flex items-end justify-center px-3 sm:px-8"><motion.div className="relative h-[82vh] max-h-[760px] w-full max-w-[620px] origin-bottom will-change-transform" animate={{x:p.x,y:p.y,rotate:p.rotate,scale:p.scale}} transition={{duration:reduce?0:p.duration,repeat,ease:"easeInOut"}}>
   <motion.img src={JIA_MASTER_DATA_URI} alt="J’IA — intelligence artificielle JOBLY" className="absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_28px_55px_rgba(0,0,0,.42)]" draggable={false} animate={reduce?undefined:{scale:[1,1.006,1]}} transition={{duration:3.8,repeat:Infinity,ease:"easeInOut"}}/>
   <AnimatePresence>{active.target&&<motion.div key={active.target} className="pointer-events-none absolute left-1/2 top-[44%] flex w-max -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md" initial={{opacity:0,y:8,scale:.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6}}><span className="h-2 w-2 animate-pulse rounded-full bg-[#FFDE00]"/>{active.target}</motion.div>}</AnimatePresence>
  </motion.div></div>
  <div className="absolute inset-x-0 bottom-[5.5vh] z-20 flex flex-col items-center gap-2 px-5 text-center"><motion.div key={active.gesture} initial={{opacity:0,y:8,scale:.96}} animate={{opacity:1,y:0,scale:1}} className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#FFDE00] backdrop-blur-md">{LABELS[active.gesture]}</motion.div>{active.message&&<motion.p key={active.message} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="max-w-[560px] text-[15px] font-semibold leading-relaxed text-white/95">{active.message}</motion.p>}</div>
 </div>;
}