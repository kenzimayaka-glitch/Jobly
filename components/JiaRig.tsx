"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { JiaGesture } from "./WaterScene";

type Props = { speaking: boolean; gesture: JiaGesture };
type HeadMotion = { x: number; y: number; rotate: number; scale: number };

const HEAD: Partial<Record<JiaGesture, HeadMotion>> = {
  welcome:{x:0,y:-2,rotate:0,scale:1.01}, analyze:{x:-2,y:1,rotate:-0.8,scale:1.008},
  point:{x:3,y:-1,rotate:1,scale:1.01}, write:{x:-1,y:1,rotate:0.6,scale:1.005},
  validate:{x:0,y:-2,rotate:-0.6,scale:1.012}, alert:{x:0,y:-1,rotate:0,scale:1.01},
  apply:{x:2,y:-1,rotate:0.8,scale:1.008}, celebrate:{x:0,y:-3,rotate:0,scale:1.018},
  wink:{x:2,y:-1,rotate:1.2,scale:1.008}, reassure:{x:-1,y:-1,rotate:-0.5,scale:1.008},
  encourage:{x:1,y:-2,rotate:0.7,scale:1.012}, disappointed:{x:0,y:2,rotate:-1.5,scale:0.998},
  surprised:{x:0,y:-3,rotate:0,scale:1.02}, curious:{x:-2,y:0,rotate:-1.8,scale:1.008},
  tired:{x:0,y:2,rotate:1.2,scale:0.998}, proud:{x:0,y:-2,rotate:0,scale:1.012},
  "present-chart":{x:-2,y:-1,rotate:-0.6,scale:1.008}, handshake:{x:2,y:0,rotate:0.8,scale:1.005},
  "present-team":{x:-2,y:-1,rotate:-0.7,scale:1.008}, "pay-os":{x:0,y:-1,rotate:0,scale:1.01},
  "call-hr":{x:2,y:-1,rotate:0.8,scale:1.008}, filter:{x:-2,y:0,rotate:-1,scale:1.008},
  secure:{x:0,y:-1,rotate:0,scale:1.01}, goodbye:{x:1,y:-1,rotate:0.6,scale:1.005},
};

const EYE = { left:{x:43.8,y:25.4}, right:{x:58.7,y:25.5}, width:4.9, height:2.0 };

function useBlink() {
  const [blink,setBlink]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    let timer:ReturnType<typeof setTimeout>;
    const schedule=()=>{
      timer=setTimeout(()=>{
        if(cancelled)return;
        setBlink(true);
        setTimeout(()=>!cancelled&&setBlink(false),115);
        schedule();
      },2200+Math.random()*3000);
    };
    schedule();
    return()=>{cancelled=true;clearTimeout(timer);};
  },[]);
  return blink;
}

export function JiaRig({speaking,gesture}:Props) {
  const [talk,setTalk]=useState(false);
  const blink=useBlink();
  const talkTimer=useRef<number|null>(null);
  const head=useMemo(()=>HEAD[gesture]??HEAD.welcome,[gesture]);

  useEffect(()=>{
    if(!speaking){setTalk(false);return;}
    talkTimer.current=window.setInterval(()=>setTalk(v=>!v),125);
    return()=>{
      if(talkTimer.current!==null)window.clearInterval(talkTimer.current);
      talkTimer.current=null;
    };
  },[speaking]);

  return (
    <motion.div className="relative h-full w-full select-none overflow-visible" aria-label="J’IA — personnage animé de Jobly"
      animate={head} transition={{duration:.45,ease:"easeInOut"}}>
      <img src="/jia/jia-master.webp" alt="J’IA" draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-center" />

      <div aria-hidden className="pointer-events-none absolute" style={{left:`${EYE.left.x}%`,top:`${EYE.left.y}%`,width:`${EYE.width}%`,height:`${EYE.height}%`,transform:"translate(-50%,-50%)"}}>
        <motion.span className="absolute left-[28%] top-1/2 h-[20%] w-[12%] -translate-y-1/2 rounded-full bg-[#17212B]"
          animate={{x:[0,1.5,0,-0.8,0]}} transition={{duration:4.8,repeat:Infinity,ease:"easeInOut"}} />
      </div>
      <div aria-hidden className="pointer-events-none absolute" style={{left:`${EYE.right.x}%`,top:`${EYE.right.y}%`,width:`${EYE.width}%`,height:`${EYE.height}%`,transform:"translate(-50%,-50%)"}}>
        <motion.span className="absolute left-[28%] top-1/2 h-[20%] w-[12%] -translate-y-1/2 rounded-full bg-[#17212B]"
          animate={{x:[0,-1.5,0,0.8,0]}} transition={{duration:5.2,repeat:Infinity,ease:"easeInOut"}} />
      </div>

      <motion.div aria-hidden className="pointer-events-none absolute left-[36.5%] top-[24.6%] h-[2.2%] w-[29%] rounded-full bg-[#9A5B3E]"
        animate={{scaleY:blink?1:.08,opacity:blink?.9:0}} transition={{duration:.07}} />

      <motion.div aria-hidden className="pointer-events-none absolute left-[51.2%] top-[38.3%] h-[2.4%] w-[8.8%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[#6B302B]/70 bg-[#8E3F3B]/25"
        animate={{scaleX:speaking?(talk?1.12:.88):.86,scaleY:speaking?(talk?1.22:.78):.55,opacity:speaking?.65:0}}
        transition={{duration:.09,ease:"easeOut"}} />
    </motion.div>
  );
}

export function JiaCharacter({speaking,gesture}:Props){ return <JiaRig speaking={speaking} gesture={gesture}/>; }
