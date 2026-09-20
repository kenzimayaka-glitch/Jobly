"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { JIA_MASTER_DATA_URI } from "./JiaMaster";
import type { JiaGesture } from "./WaterScene";

type Props = { speaking: boolean; gesture: JiaGesture };

const HEAD: Partial<Record<JiaGesture, { x: number; y: number; rotate: number; scale: number }>> = {
  welcome:{x:0,y:-3,rotate:0,scale:1.01}, analyze:{x:-4,y:1,rotate:-1.5,scale:1.015},
  point:{x:7,y:-1,rotate:2,scale:1.01}, write:{x:-2,y:2,rotate:1,scale:1},
  validate:{x:0,y:-4,rotate:-1,scale:1.02}, alert:{x:0,y:-2,rotate:0,scale:1.025},
  apply:{x:5,y:-2,rotate:1.5,scale:1.015}, celebrate:{x:0,y:-5,rotate:0,scale:1.035},
  wink:{x:2,y:-2,rotate:2,scale:1.01}, reassure:{x:-3,y:-2,rotate:-1,scale:1.015},
  encourage:{x:3,y:-4,rotate:1,scale:1.025}, disappointed:{x:0,y:4,rotate:-3,scale:.99},
  surprised:{x:0,y:-6,rotate:0,scale:1.04}, curious:{x:-5,y:0,rotate:-4,scale:1.015},
  tired:{x:0,y:3,rotate:3,scale:.995}, proud:{x:0,y:-4,rotate:0,scale:1.025},
  "present-chart":{x:-4,y:-2,rotate:-1,scale:1.015}, handshake:{x:5,y:0,rotate:1.5,scale:1.01},
  "present-team":{x:-5,y:-2,rotate:-1,scale:1.015}, "pay-os":{x:0,y:-3,rotate:0,scale:1.02},
  "call-hr":{x:5,y:-2,rotate:1.5,scale:1.01}, filter:{x:-4,y:0,rotate:-2,scale:1.015},
  secure:{x:0,y:-3,rotate:0,scale:1.02}, goodbye:{x:3,y:-2,rotate:1,scale:1.01},
};

export function JiaRig({ speaking, gesture }: Props) {
  const [assetUrl, setAssetUrl] = useState(JIA_MASTER_DATA_URI);
  const [talk, setTalk] = useState(false);
  const [blink, setBlink] = useState(false);
  const talkTimer = useRef<number | null>(null);
  const blinkTimer = useRef<number | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = pixels;
      const visited = new Uint8Array(canvas.width * canvas.height);
      const queue = new Int32Array(canvas.width * canvas.height);
      let head = 0, tail = 0;
      const push = (x:number,y:number) => {
        if (x<0||y<0||x>=canvas.width||y>=canvas.height) return;
        const i=y*canvas.width+x;
        if (visited[i]) return;
        visited[i]=1; queue[tail++]=i;
      };
      for(let x=0;x<canvas.width;x++){push(x,0);push(x,canvas.height-1);}
      for(let y=0;y<canvas.height;y++){push(0,y);push(canvas.width-1,y);}
      const white=(i:number)=>{const p=i*4;return data[p]>248&&data[p+1]>248&&data[p+2]>248&&data[p+3]>0;};
      while(head<tail){
        const i=queue[head++];
        if(!white(i)) continue;
        data[i*4+3]=0;
        const x=i%canvas.width,y=Math.floor(i/canvas.width);
        push(x-1,y);push(x+1,y);push(x,y-1);push(x,y+1);
      }
      ctx.putImageData(pixels,0,0);
      canvas.toBlob(blob=>{
        if(!blob||cancelled)return;
        objectUrl=URL.createObjectURL(blob);setAssetUrl(objectUrl);
      },"image/png");
    };
    image.src=JIA_MASTER_DATA_URI;
    return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  }, []);

  useEffect(()=>{
    if(!speaking){setTalk(false);return;}
    talkTimer.current=window.setInterval(()=>setTalk(v=>!v),115);
    return()=>{if(talkTimer.current)window.clearInterval(talkTimer.current);talkTimer.current=null;};
  },[speaking]);

  useEffect(()=>{
    let cancelled=false;
    const schedule=()=>{
      const delay=1800+Math.random()*3600;
      blinkTimer.current=window.setTimeout(()=>{
        if(cancelled)return;
        setBlink(true);
        window.setTimeout(()=>setBlink(false),105);
        schedule();
      },delay);
    };
    schedule();
    return()=>{cancelled=true;if(blinkTimer.current)window.clearTimeout(blinkTimer.current);blinkTimer.current=null;};
  },[]);

  const head = useMemo(()=>HEAD[gesture]||HEAD.welcome,[gesture]);

  return (
    <motion.div
      className="relative h-full w-full select-none overflow-visible"
      aria-label="J’IA — personnage animé de Jobly"
      animate={head}
      transition={{duration:.55,ease:"easeInOut"}}
    >
      <img src={assetUrl} alt="J’IA" draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-center"
      />

      <motion.div aria-hidden="true" className="pointer-events-none absolute left-[41%] top-[20.5%] h-[2.7%] w-[18%] -translate-y-1/2"
        animate={{opacity:blink?1:.88,scaleY:blink?.08:1}}
        transition={{duration:blink?.07:.16}}
      >
        <span className="absolute left-0 top-1/2 h-[42%] w-[37%] -translate-y-1/2 rounded-full bg-[#17212B]"/>
        <span className="absolute right-0 top-1/2 h-[42%] w-[37%] -translate-y-1/2 rounded-full bg-[#17212B]"/>
        <motion.span className="absolute left-[8%] top-1/2 h-[18%] w-[10%] rounded-full bg-white"
          animate={{x:blink?0:[0,2,0]}} transition={{duration:2.8,repeat:Infinity,ease:"easeInOut"}}/>
        <motion.span className="absolute right-[8%] top-1/2 h-[18%] w-[10%] rounded-full bg-white"
          animate={{x:blink?0:[0,-2,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut"}}/>
      </motion.div>

      <motion.div aria-hidden="true" className="pointer-events-none absolute left-[45%] top-[31%] h-[4.2%] w-[11%] -translate-x-1/2"
        animate={{
          scaleX:speaking?(talk?1.16:.78):.72,
          scaleY:speaking?(talk?1.28:.72):.45,
          opacity:speaking?1:.72,
          borderRadius:speaking?(talk?"45% 45% 55% 55%":"50%"):"50%",
        }}
        transition={{duration:.09,ease:"easeOut"}}
      >
        <div className="h-full w-full rounded-full border-2 border-[#17212B] bg-[#D98B83]"/>
      </motion.div>

      <motion.div aria-hidden="true" className="pointer-events-none absolute left-[46%] top-[17%] h-[2%] w-[12%] -translate-x-1/2"
        animate={{rotate:head?.rotate||0,scaleX:gesture==="surprised"?1.18:1}}
        transition={{duration:.35}}
      >
        <span className="absolute left-0 top-0 h-full w-[40%] -rotate-3 rounded-full bg-[#17212B]"/>
        <span className="absolute right-0 top-0 h-full w-[40%] rotate-3 rounded-full bg-[#17212B]"/>
      </motion.div>
    </motion.div>
  );
}
