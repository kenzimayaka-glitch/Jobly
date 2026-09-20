"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { JIA_100_MOVES, type JIA100Move } from "./movements";

export type JIAMove = JIA100Move;
type Props={speaking:boolean;gesture?:string;auto?:boolean;move?:JIA100Move};
type Bone={x?:number;y?:number;rotate?:number;rotateX?:number;rotateY?:number;z?:number;scale?:number};

const SRC="/jia/jia-master.png";
const GESTURE_MOVE:Record<string,JIA100Move>={
 welcome:"wave_hi",validate:"stamping",reassure:"calm_down",encourage:"nod_slow",analyze:"scanning",
 curious:"look_around","present-chart":"chart_up",filter:"point_button",point:"point_button",apply:"point_cv",
 "call-hr":"point_you",handshake:"hand_shake","present-team":"explain_wide","pay-os":"money",alert:"stop",
 secure:"hand_chest",disappointed:"think_doubt",tired:"breathe_deep",surprised:"eyebrow_raise",
 celebrate:"celebrate_jump",proud:"proud",wink:"wink_left",write:"writing"
};
const AUTO:JIA100Move[]=["idle","blink_slow","smile_soft","look_around","nod_slow","think_chin","point_button","scarf_adjust","explain_open","celebrate_fist","listen_tilt","reading","matching","proud"];

const P:Record<string,Record<string,Bone>>={
 point_button:{head:{rotateY:-15,rotate:-2},eyes:{x:3},armR:{rotate:-28,rotateY:-18,z:18},handR:{rotate:8,x:4,y:2},torso:{rotate:-2,scale:1.01},scarf:{rotate:3}},
 point_down:{head:{rotate:-3},eyes:{y:4},armR:{rotate:28,rotateY:-8,z:10},handR:{rotate:-10,y:7}},
 point_up:{head:{rotate:-3,rotateY:-5},eyes:{y:-4},armR:{rotate:-48,rotateY:-10,z:20},handR:{rotate:4,y:-5}},
 point_right:{head:{rotateY:-12},eyes:{x:4},armR:{rotate:-18,rotateY:-25,z:22},handR:{rotate:7,x:5}},
 point_left:{head:{rotateY:12},eyes:{x:-4},armL:{rotate:18,rotateY:25,z:22},handL:{rotate:-7,x:-5}},
 wave_hi:{head:{rotate:2},armR:{rotate:-22,rotateY:-8,z:12},handR:{rotate:18}},wave_bye:{head:{rotate:2},armR:{rotate:-20,rotateY:-8,z:12},handR:{rotate:-20}},
 thumbs_up:{armR:{rotate:-28,rotateY:-8,z:8},handR:{y:-3},head:{rotate:1}},hand_chest:{armR:{rotate:-20,rotateY:8,z:5},handR:{rotate:10,x:-3,y:2},torso:{scale:1.025}},
 hand_hip:{armR:{rotate:20,rotateY:-8,z:5},handR:{rotate:-5,x:3,y:8}},
 explain_open:{armL:{rotate:18,rotateY:10,z:8},armR:{rotate:-18,rotateY:-10,z:8},handL:{rotate:-6},handR:{rotate:6},torso:{scale:1.015}},
 explain_wide:{armL:{rotate:28,rotateY:18,z:14},armR:{rotate:-28,rotateY:-18,z:14},handL:{rotate:-8},handR:{rotate:8},torso:{scale:1.025}},
 clap:{armL:{rotate:-20},armR:{rotate:20},handL:{rotate:8,x:3},handR:{rotate:-8,x:-3}},
 celebrate_jump:{torso:{y:-10,z:20,scale:1.055},head:{y:-8,rotate:-2},armL:{rotate:-42,rotateY:12,z:22},armR:{rotate:-42,rotateY:-12,z:22},handL:{rotate:-8},handR:{rotate:8},scarf:{rotate:-4}},
 shrug:{armL:{rotate:-18,rotateY:12},armR:{rotate:18,rotateY:-12},handL:{rotate:-8},handR:{rotate:8},head:{rotate:2}},
 listen_tilt:{head:{rotate:-9,rotateY:5},eyes:{x:2},torso:{rotate:-2}},nod_slow:{head:{rotate:8}},shake_no:{head:{rotate:-10}},
 think_chin:{head:{rotate:-7,rotateY:-5},eyes:{x:-2,y:-3},armR:{rotate:-18,rotateY:6,z:4},handR:{rotate:10,x:-2,y:-4}},
 think_up:{head:{rotate:-5,rotateY:-3},eyes:{y:-4}},think_doubt:{head:{rotate:5},eyes:{x:-2},armR:{rotate:18,rotateY:5},handR:{rotate:-8}},
 smile_soft:{mouth:{scale:1.03},head:{rotate:1}},smile_wide:{mouth:{scale:1.07},head:{rotate:1}},surprised:{mouth:{scale:1.08},head:{y:-3}},
 calm_down:{armL:{rotate:12},armR:{rotate:-12},handL:{rotate:-5},handR:{rotate:5}},proud:{torso:{scale:1.04},head:{rotate:-1}},
 reading:{head:{rotate:3},eyes:{y:3},armL:{rotate:8},armR:{rotate:-8}},typing:{armL:{rotate:10},armR:{rotate:-10}},
 writing:{armR:{rotate:-12,rotateY:-8},handR:{rotate:5,x:3,y:4},head:{rotate:2}},
 scanning:{eyes:{x:3},head:{rotate:2}},matching:{head:{rotate:1},eyes:{x:3},armR:{rotate:-10},handR:{rotate:4}},
 chart_up:{armR:{rotate:-34,rotateY:-10,z:16},handR:{rotate:4,y:-6},head:{rotateY:-8},eyes:{x:3}},
 money:{armR:{rotate:-18,rotateY:-12},handR:{rotate:-4,x:2,y:2},head:{rotateY:-4}},
 stop:{armR:{rotate:-42,rotateY:-5,z:12},handR:{rotate:2,y:-3},head:{rotate:2}},
};

function useBlink(){const[b,setB]=useState(false);useEffect(()=>{let dead=false,t:ReturnType<typeof setTimeout>;const f=()=>{t=setTimeout(()=>{if(dead)return;setB(true);setTimeout(()=>!dead&&setB(false),110);f()},2200+Math.random()*3000)};f();return()=>{dead=true;clearTimeout(t)}},[]);return b}


const SLICES:Record<string,[number,number,number,number]>={
  torso:[20,34,60,66], head:[28,5,44,39], hairBack:[24,0,52,25], hairFront:[27,0,46,34],
  eyes:[39,20,23,9], eyebrows:[38,18,25,7], mouth:[45,33,12,9],
  armL:[7,42,30,53], armR:[63,42,30,53], handL:[4,68,31,30], handR:[65,68,31,30],
  scarf:[31,34,38,30], glasses:[34,16,32,17],
};
function sliceStyle([x,y,w,h]:[number,number,number,number]):CSSProperties{
  return {position:"absolute",left:`${x}%`,top:`${y}%`,width:`${w}%`,height:`${h}%`,overflow:"hidden",pointerEvents:"none",userSelect:"none"};
}
function sourceStyle([x,y,w,h]:[number,number,number,number]):CSSProperties{
  return {position:"absolute",width:`${10000/w}%`,height:`${10000/h}%`,left:`-${x/w*100}%`,top:`-${y/h*100}%`,maxWidth:"none",maxHeight:"none",objectFit:"fill",pointerEvents:"none",userSelect:"none"};
}
function SliceLayer({name,bone}:{name:string;bone:Bone}){
  const region=SLICES[name];
  return <motion.div className="absolute" style={{...sliceStyle(region),transformStyle:"preserve-3d",transformOrigin:"50% 50%"}}
    animate={{x:bone.x??0,y:bone.y??0,rotate:bone.rotate??0,rotateX:bone.rotateX??0,rotateY:bone.rotateY??0,z:bone.z??0,scale:bone.scale??1}}
    transition={{type:"spring",stiffness:180,damping:20}}>
    <img src={SRC} alt="" draggable={false} style={sourceStyle(region)}/>
  </motion.div>;
}

export default function JIA({speaking,gesture="welcome",auto=true,move:requestedMove}:Props){
 const reduced=useReducedMotion(),blink=useBlink(),[move,setMove]=useState<JIA100Move>("idle"),[talk,setTalk]=useState(false);
 const until=useRef(0),idx=useRef(0);const contextual=useMemo(()=>GESTURE_MOVE[gesture]??"idle",[gesture]);const pose=P[move]??{};
 const bone=(n:string):Bone=>pose[n]??{};
 useEffect(()=>{setMove(requestedMove??contextual);until.current=Date.now()+4200},[contextual,requestedMove]);
 useEffect(()=>{if(!auto||reduced)return;const t=window.setInterval(()=>{if(Date.now()<until.current)return;idx.current=(idx.current+1)%AUTO.length;setMove(AUTO[idx.current])},3500);return()=>window.clearInterval(t)},[auto,reduced]);
 useEffect(()=>{const f=(e:Event)=>{const m=(e as CustomEvent<{move?:JIA100Move}>).detail?.move;if(m&&JIA_100_MOVES.includes(m)){setMove(m);until.current=Date.now()+4200}};window.addEventListener("jobly:jia-move",f);return()=>window.removeEventListener("jobly:jia-move",f)},[]);
 useEffect(()=>{if(!speaking){setTalk(false);return}const t=window.setInterval(()=>setTalk(v=>!v),125);return()=>window.clearInterval(t)},[speaking]);

 const e=bone("eyes"),head=bone("head"),winkL=move==="wink_left",winkR=move==="wink_right";
 return <motion.div className="relative h-full w-full select-none overflow-visible" aria-label={`J’IA — ${move} — rig anatomique Jobly`} style={{perspective:1000,transformStyle:"preserve-3d"}}>
   {/* Independent anatomical slices — no full-canvas clipPath duplication. */}
   <SliceLayer name="torso" bone={bone("torso")}/>
   <SliceLayer name="hairBack" bone={bone("hairBack")}/>
   <SliceLayer name="head" bone={head}/>
   <SliceLayer name="hairFront" bone={bone("hairFront")}/>
   <SliceLayer name="armL" bone={bone("armL")}/>
   <SliceLayer name="armR" bone={bone("armR")}/>
   <SliceLayer name="handL" bone={bone("handL")}/>
   <SliceLayer name="handR" bone={bone("handR")}/>
   <SliceLayer name="scarf" bone={bone("scarf")}/>
   <SliceLayer name="glasses" bone={bone("glasses")}/>
   <motion.div className="absolute inset-0 pointer-events-none" animate={head} transition={{type:"spring",stiffness:160,damping:18}} style={{transformOrigin:"50% 80%"}}>
     <motion.span className="absolute rounded-full bg-[#17212B]" style={{left:"43.8%",top:"25.5%",width:"1.7%",height:"0.9%"}} animate={{x:e.x??0,y:e.y??0,scaleY:(blink||winkL) ? 0.08 : 1}}/>
     <motion.span className="absolute rounded-full bg-[#17212B]" style={{left:"58.7%",top:"25.5%",width:"1.7%",height:"0.9%"}} animate={{x:e.x??0,y:e.y??0,scaleY:(blink||winkR) ? 0.08 : 1}}/>
     <motion.span className="absolute rounded-[50%] border border-[#6B302B]/70 bg-[#8E3F3B]/25" style={{left:"51.2%",top:"38.3%",width:"8.8%",height:"2.4%",transform:"translate(-50%,-50%)"}} animate={{scaleX:speaking?(talk?1.12:.88):.86,scaleY:speaking?(talk?1.22:.78):.55,opacity:speaking?.7:0}}/>
   </motion.div>
 </motion.div>
}
