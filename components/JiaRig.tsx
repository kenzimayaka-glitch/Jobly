"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { JIA_MASTER_DATA_URI } from "./JiaMaster";
import type { JiaGesture } from "./WaterScene";
type Props = { speaking: boolean; gesture: JiaGesture };
export function JiaRig({ speaking }: Props) {
  const [assetUrl, setAssetUrl] = useState<string>(JIA_MASTER_DATA_URI); const [talk, setTalk] = useState(false); const [blink, setBlink] = useState(false);
  const talkTimer = useRef<number | null>(null); const blinkTimer = useRef<number | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null; let cancelled = false; const image = new Image();
    image.onload = () => { if (cancelled) return; const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return; ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height); const { data } = pixels; const visited = new Uint8Array(canvas.width * canvas.height); const queue = new Int32Array(canvas.width * canvas.height); let head = 0, tail = 0;
      const push = (x:number,y:number) => { if (x<0||y<0||x>=canvas.width||y>=canvas.height) return; const i=y*canvas.width+x; if(visited[i]) return; visited[i]=1; queue[tail++]=i; };
      for(let x=0;x<canvas.width;x++){push(x,0);push(x,canvas.height-1);} for(let y=0;y<canvas.height;y++){push(0,y);push(canvas.width-1,y);}
      const white=(i:number)=>{const p=i*4;return data[p]>248&&data[p+1]>248&&data[p+2]>248&&data[p+3]>0;};
      while(head<tail){const i=queue[head++];if(!white(i))continue;data[i*4+3]=0;const x=i%canvas.width,y=Math.floor(i/canvas.width);push(x-1,y);push(x+1,y);push(x,y-1);push(x,y+1);}
      ctx.putImageData(pixels,0,0); canvas.toBlob(blob=>{if(!blob||cancelled)return;objectUrl=URL.createObjectURL(blob);setAssetUrl(objectUrl);},"image/png");
    }; image.src=JIA_MASTER_DATA_URI; return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  }, []);
  useEffect(()=>{if(!speaking){setTalk(false);return;} talkTimer.current=window.setInterval(()=>setTalk(v=>!v),125); return()=>{if(talkTimer.current)window.clearInterval(talkTimer.current);talkTimer.current=null;};},[speaking]);
  useEffect(()=>{let cancelled=false;const schedule=()=>{const delay=2400+Math.random()*4200;blinkTimer.current=window.setTimeout(()=>{if(cancelled)return;setBlink(true);window.setTimeout(()=>setBlink(false),115);schedule();},delay);};schedule();return()=>{cancelled=true;if(blinkTimer.current)window.clearTimeout(blinkTimer.current);blinkTimer.current=null;};},[]);
  return <div className="relative h-full w-full select-none" aria-label="J’IA — personnage animé de Jobly"><div className="absolute inset-0"><img src={assetUrl} alt="J’IA" draggable={false} className="absolute inset-0 h-full w-full object-contain object-center"/></div><motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[19%] h-[15%] w-[30%] -translate-x-1/2 rounded-full" animate={{scaleY:blink?0.06:1,opacity:blink?0.9:0}} transition={{duration:blink?0.08:0.16}}/><motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[31%] h-[2.2%] w-[9%] -translate-x-1/2 rounded-full" animate={{scaleX:speaking&&talk?1.22:1,scaleY:speaking&&talk?1.18:1,opacity:speaking?0.16:0}} transition={{duration:.08}}/></div>;
}