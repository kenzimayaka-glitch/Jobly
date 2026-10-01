"use client";
import {useEffect,useRef,useState} from "react";

type Props={interviewId:string;room?:{provider:string;roomName:string;joinUrl:string;domain?:string}|null;onEvent?:(event:string)=>void;recordingEnabled?:boolean;canRecord?:boolean;};

declare global {interface Window {JitsiMeetExternalAPI?:new(domain:string,options:any)=>any;}}

export default function JoblyVideoRoom({interviewId,room,onEvent,recordingEnabled=false,canRecord=false}:Props){
 const host=useRef<HTMLDivElement|null>(null);const api=useRef<any>(null);
 const [ready,setReady]=useState(false),[joined,setJoined]=useState(false),[participants,setParticipants]=useState(0),[error,setError]=useState("");
 useEffect(()=>{
  if(!room||room.provider!=="JITSI")return;
  let cancelled=false;
  const load=async()=>{
   try{
    const domain=room.domain||new URL(room.joinUrl).hostname;
    if(!window.JitsiMeetExternalAPI){
      await new Promise<void>((resolve,reject)=>{
       const script=document.createElement("script");script.src="https://"+domain+"/external_api.js";script.async=true;
       script.onload=()=>resolve();script.onerror=()=>reject(new Error("VIDEO_PROVIDER_UNAVAILABLE"));document.head.appendChild(script);
      });
    }
    if(cancelled||!host.current||!window.JitsiMeetExternalAPI)return;
    api.current=new window.JitsiMeetExternalAPI(domain,{roomName:room.roomName,parentNode:host.current,width:"100%",height:520,configOverwrite:{prejoinConfig:{enabled:true},disableDeepLinking:true},interfaceConfigOverwrite:{MOBILE_APP_PROMO:false}});
    api.current.addListener("videoConferenceJoined",()=>{setJoined(true);setReady(true);onEvent?.("JOINED");void fetch("/api/recruitment360/interviews/"+encodeURIComponent(interviewId)+"/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start"})});void fetch("/api/recruitment360/interviews/"+encodeURIComponent(interviewId)+"/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"presence",status:"JOINED"})})});
    api.current.addListener("videoConferenceLeft",()=>{setJoined(false);onEvent?.("LEFT");void fetch("/api/recruitment360/interviews/"+encodeURIComponent(interviewId)+"/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"presence",status:"LEFT"})})});
    api.current.addListener("participantJoined",()=>setParticipants(p=>p+1));
    api.current.addListener("participantLeft",()=>setParticipants(p=>Math.max(0,p-1)));
    api.current.addListener("recordingStatusChanged",(payload:any)=>{const active=payload?.on===true||payload?.status==="on";if(canRecord)void fetch("/api/recruitment360/interviews/"+encodeURIComponent(interviewId)+"/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"recording",enabled:active})});});
    api.current.addListener("readyToClose",()=>setReady(false));
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"VIDEO_PROVIDER_UNAVAILABLE");}
  };
  void load();return()=>{cancelled=true;api.current?.dispose?.();api.current=null};
 },[room?.roomName,room?.provider,interviewId,onEvent]);
 if(!room)return <div className="rounded-2xl border p-5 text-sm">La salle vidéo n’est pas encore préparée.</div>;
 if(room.provider!=="JITSI")return <div className="rounded-2xl border p-5 text-sm">Le fournisseur vidéo configuré pour cette salle n’est pas disponible dans ce navigateur. Utilisez le lien sécurisé : <a className="underline font-bold" href={room.joinUrl} target="_blank" rel="noreferrer">ouvrir la salle</a>.</div>;
 return <div className="space-y-3"><div className="rounded-2xl border overflow-hidden bg-black min-h-[320px]" ref={host}/><div className="flex flex-wrap gap-2 text-xs"><span>{ready?"Salle prête":"Connexion…"}</span><span>{joined?"Vous êtes connecté":"Salle d’attente"}</span><span>Participants actifs : {participants+1}</span>{error&&<span>{error}</span>}</div></div>;
}
