"use client";
import {useEffect,useRef,useState} from "react";

type Props={
 interviewId:string;
 room?:{provider:string;roomName:string;joinUrl:string;domain?:string}|null;
 livekit?:{token:string}|null;
 onEvent?:(event:string)=>void;
 canRecord?:boolean;
};

declare global {
 interface Window {
  JitsiMeetExternalAPI?:new(domain:string,options:any)=>any;
  LivekitClient?:any;
 }
}

export default function JoblyVideoRoom({interviewId,room,livekit,onEvent,canRecord=false}:Props){
 const host=useRef<HTMLDivElement|null>(null);
 const api=useRef<any>(null);
 const livekitRoom=useRef<any>(null);
 const [ready,setReady]=useState(false),[joined,setJoined]=useState(false),[participants,setParticipants]=useState(0),[error,setError]=useState("");

 useEffect(()=>{
  if(!room)return;
  let cancelled=false;
  const loadScript=(src:string)=>new Promise<void>((resolve,reject)=>{
   const existing=document.querySelector('script[src="'+src+'"]') as HTMLScriptElement|null;
   if(existing){existing.addEventListener("load",()=>resolve(),{once:true});if((existing as any).dataset.loaded==="true")resolve();return;}
   const script=document.createElement("script");script.src=src;script.async=true;
   script.onload=()=>{script.dataset.loaded="true";resolve()};script.onerror=()=>reject(new Error("VIDEO_PROVIDER_UNAVAILABLE"));document.head.appendChild(script);
  });
  const post=(payload:any)=>fetch("/api/recruitment360/interviews/"+encodeURIComponent(interviewId)+"/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).catch(()=>undefined);
  const start=async()=>{
   try{
    if(room.provider==="JITSI"){
     const domain=room.domain||new URL(room.joinUrl).hostname;
     await loadScript("https://"+domain+"/external_api.js");
     if(cancelled||!host.current||!window.JitsiMeetExternalAPI)throw new Error("VIDEO_PROVIDER_UNAVAILABLE");
     api.current=new window.JitsiMeetExternalAPI(domain,{roomName:room.roomName,parentNode:host.current,width:"100%",height:520,configOverwrite:{prejoinConfig:{enabled:true},disableDeepLinking:true},interfaceConfigOverwrite:{MOBILE_APP_PROMO:false}});
     api.current.addListener("videoConferenceJoined",()=>{setJoined(true);setReady(true);onEvent?.("JOINED");void post({action:"start"});});
     api.current.addListener("videoConferenceLeft",()=>{setJoined(false);onEvent?.("LEFT");void post({action:"presence",status:"LEFT"});});
     api.current.addListener("participantJoined",()=>setParticipants(p=>p+1));
     api.current.addListener("participantLeft",()=>setParticipants(p=>Math.max(0,p-1)));
     api.current.addListener("recordingStatusChanged",(payload:any)=>{const active=payload?.on===true||payload?.status==="on";if(canRecord)void post({action:"recording",enabled:active});});
     setReady(true);
     return;
    }
    if(room.provider==="LIVEKIT"){
     await loadScript("https://cdn.jsdelivr.net/npm/livekit-client@2.22.3/dist/livekit-client.umd.min.js");
     if(cancelled||!host.current||!window.LivekitClient||!livekit?.token)throw new Error("LIVEKIT_CREDENTIALS_UNAVAILABLE");
     const lk=window.LivekitClient;
     const r=new lk.Room({adaptiveStream:true,dynacast:true});
     livekitRoom.current=r;
     r.on(lk.RoomEvent.TrackSubscribed,(track:any)=>{if(!host.current)return;const el=track.attach();el.className="w-full rounded-xl";host.current.appendChild(el);});
     r.on(lk.RoomEvent.TrackUnsubscribed,(track:any)=>track.detach());
     r.on(lk.RoomEvent.ParticipantConnected,()=>setParticipants(p=>p+1));
     r.on(lk.RoomEvent.ParticipantDisconnected,()=>setParticipants(p=>Math.max(0,p-1)));
     r.on(lk.RoomEvent.Disconnected,()=>{setJoined(false);void post({action:"presence",status:"LEFT"});});
     await r.connect(room.joinUrl,livekit.token);
     await r.localParticipant.enableCameraAndMicrophone();
     setJoined(true);setReady(true);void post({action:"start"});void post({action:"presence",status:"JOINED"});
     return;
    }
    window.open(room.joinUrl,"_blank","noopener,noreferrer");
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"VIDEO_PROVIDER_UNAVAILABLE");}
  };
  void start();
  return()=>{cancelled=true;api.current?.dispose?.();api.current=null;void livekitRoom.current?.disconnect?.();livekitRoom.current=null};
 },[room?.roomName,room?.provider,room?.joinUrl,room?.domain,livekit?.token,interviewId,onEvent,canRecord]);

 if(!room)return <div className="rounded-2xl border p-5 text-sm">La salle vidéo n’est pas encore préparée.</div>;
 return <div className="space-y-3">
  <div className="rounded-2xl border overflow-hidden bg-black min-h-[320px] p-1" ref={host}/>
  <div className="flex flex-wrap gap-2 text-xs">
   <span>{ready?"Salle prête":"Connexion…"}</span>
   <span>{joined?"Vous êtes connecté":"Salle d’attente"}</span>
   <span>Participants actifs : {participants+1}</span>
   {error&&<span>{error}</span>}
  </div>
 </div>;
}
