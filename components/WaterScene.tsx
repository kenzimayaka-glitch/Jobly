"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { JiaRig } from "./JiaRig";

export type JiaGesture =
  | "welcome" | "analyze" | "point" | "write" | "validate" | "alert" | "apply" | "celebrate"
  | "wink" | "reassure" | "encourage" | "disappointed" | "surprised" | "curious" | "tired" | "proud"
  | "present-chart" | "handshake" | "present-team" | "pay-os" | "call-hr" | "filter" | "secure" | "goodbye";

export type JiaMotionIntent = {
  gesture: JiaGesture;
  message?: string;
  target?: string;
  voice?: boolean;
  roam?: boolean;
};

type Preset = {
  x: number[];
  y: number[];
  rotate: number[];
  scale: number[];
  duration: number;
  repeat?: number | "Infinity";
};

const M = (x:number[], y:number[], r:number[], s:number[], duration:number, repeat?:number|"Infinity"):Preset =>
  ({x,y,rotate:r,scale:s,duration,repeat});

const MOTIONS:Record<JiaGesture,Preset> = {
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

const LABELS:Record<JiaGesture,string> = {
  welcome:"Bienvenue", analyze:"J’analyse", point:"Je te montre", write:"Je note", validate:"C’est validé",
  alert:"Attention", apply:"Je postule", celebrate:"Bravo", wink:"Clin d’œil", reassure:"Je suis avec toi",
  encourage:"On continue", disappointed:"On ajuste", surprised:"Belle opportunité", curious:"Regardons",
  tired:"Je continue", proud:"Fière de toi", "present-chart":"Voici les données", handshake:"Partenariat",
  "present-team":"L’équipe", "pay-os":"PAY OS", "call-hr":"Relation RH", filter:"Je filtre",
  secure:"C’est sécurisé", goodbye:"À bientôt"
};


function speak(text:string, onEnd?:()=>void) {
  if (typeof window === "undefined" || !text || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = document.documentElement.lang?.startsWith("en") ? "en-US" : "fr-FR";
  u.rate = .96;
  u.pitch = 1.04;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function JiaCharacter({speaking, gesture}:{speaking:boolean; gesture:JiaGesture}) {
  return <JiaRig speaking={speaking} gesture={gesture} />;
}

export default function WaterScene({intent,transparent=false}:{intent?:JiaMotionIntent; transparent?:boolean}={}) {
  const reduce = useReducedMotion();
  const explicit = !!intent;
  const [active,setActive] = useState<JiaMotionIntent>(intent ?? {gesture:"welcome",roam:true});
  const [speaking,setSpeaking] = useState(false);
  const [viewport,setViewport] = useState({w:1280,h:800});
  const lastVoice = useRef("");

  useEffect(() => {
    const sync = () => setViewport({w:window.innerWidth,h:window.innerHeight});
    sync(); window.addEventListener("resize",sync); return () => window.removeEventListener("resize",sync);
  }, []);

  useEffect(() => { if (intent) setActive(intent); }, [intent?.gesture,intent?.message,intent?.target,intent?.voice,intent?.roam]);

  useEffect(() => {
    if (explicit || reduce) return;
    let cancelled = false;
    let timer: number | null = null;

    const predict = async () => {
      if (cancelled) return;
      try {
        const response = await fetch("/api/jia/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: typeof window !== "undefined" ? window.location.pathname : "/",
            action: "",
            visibleText: typeof document !== "undefined" ? document.body.innerText.slice(0, 1600) : "",
            recentDialogue: lastVoice.current ? [lastVoice.current] : [],
            idleMs: 0,
          }),
        });
        if (response.ok) {
          const next = await response.json();
          if (next?.message && next.message !== lastVoice.current) {
            setActive({
              gesture: next.gesture || "curious",
              message: String(next.message).slice(0, 260),
              voice: next.shouldSpeak !== false,
              target: next.target,
              roam: true,
            });
          }
        }
      } catch {
        // Keep the character alive with the local fallback when AI is unavailable.
      } finally {
        if (!cancelled) timer = window.setTimeout(predict, 15000);
      }
    };

    timer = window.setTimeout(predict, 1800);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [explicit,reduce]);

  useEffect(() => {
    if (explicit || reduce || !active.voice || !active.message || lastVoice.current === active.message) return;
    lastVoice.current = active.message;
    setSpeaking(true);
    speak(active.message, () => setSpeaking(false));
    return () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); };
  }, [active.voice,active.message,explicit,reduce]);

  useEffect(() => {
    return () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); };
  }, []);

  const p = useMemo(() => MOTIONS[active.gesture] ?? MOTIONS.welcome,[active.gesture]);
  const repeat = reduce ? 0 : p.repeat === "Infinity" ? Infinity : p.repeat;
  const roamX = Math.max(0, Math.min(viewport.w * .72, viewport.w - 230));
  const roamY = Math.max(0, Math.min(viewport.h * .72, viewport.h - 300));
  const roamPath = [
    0, -roamX*.22, roamX*.45, roamX*.12, -roamX*.36, 0
  ];
  const roamYPath = [
    0, -roamY*.32, -roamY*.62, -roamY*.12, roamY*.18, 0
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {!transparent && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#163A63_0%,#071326_42%,#020410_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <motion.div className="absolute left-1/2 top-[12%] h-72 w-72 -translate-x-1/2 rounded-full bg-[#39D7FF]/10 blur-3xl" animate={{scale:[1,1.12,1],opacity:[.35,.55,.35]}} transition={{duration:5.5,repeat:Infinity,ease:"easeInOut"}}/>
        </div>
      </div>}

      <motion.div
        className="pointer-events-auto fixed bottom-5 right-4 z-[70] h-[250px] w-[180px] cursor-grab touch-none sm:h-[290px] sm:w-[210px]"
        drag
        dragMomentum
        dragElastic={.18}
        dragConstraints={{left:-Math.max(0,viewport.w-230),right:0,top:-Math.max(0,viewport.h-320),bottom:0}}
        animate={active.roam === false || reduce ? {x:0,y:0} : {x:roamPath,y:roamYPath}}
        transition={{duration:22,repeat:Infinity,ease:"easeInOut"}}
        whileTap={{cursor:"grabbing",scale:.98}}
        initial={{opacity:0,scale:.82}}
        whileInView={{opacity:1,scale:1}}
        aria-label="J’IA — personnage central de Jobly"
      >
        <JiaCharacter speaking={speaking} gesture={active.gesture}/>
        <AnimatePresence>
          {active.target && (
            <motion.div key={active.target} className="absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md" initial={{opacity:0,y:8,scale:.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6}}>
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-[#FFDE00]"/>{active.target}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="pointer-events-none fixed bottom-5 right-[205px] z-[65] flex max-w-[min(420px,70vw)] flex-col items-end gap-2 text-right sm:right-[235px]">
        <motion.div key={active.gesture} initial={{opacity:0,y:8,scale:.96}} animate={{opacity:1,y:0,scale:1}} className="rounded-full border border-white/15 bg-black/45 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#FFDE00] backdrop-blur-md">{LABELS[active.gesture]}</motion.div>
        {active.message && <motion.p key={active.message} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="max-w-[420px] rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-[14px] font-semibold leading-relaxed text-white/95 shadow-2xl backdrop-blur-md">{active.message}</motion.p>}
      </div>
    </div>
  );
}
