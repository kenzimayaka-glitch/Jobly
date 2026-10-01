"use client";
import {useEffect,useState,useCallback} from "react";
import {useParams} from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import {Button,Card,ErrorState,LoadingState,PageIntro,Section} from "@/components/ui";
import JoblyVideoRoom from "@/components/recruitment360/JoblyVideoRoom";

export default function Recruitment360InterviewRoom(){
 const {id}=useParams<{id:string}>();const [data,setData]=useState<any>(null);const [state,setState]=useState("loading");const [note,setNote]=useState("");const [error,setError]=useState("");
 const load=useCallback(async()=>{try{const r=await fetch("/api/recruitment360/interviews/"+encodeURIComponent(id)+"/video");const d=await r.json();if(!r.ok)throw new Error(d.message);setData(d);setState("ready")}catch(e){setError(e instanceof Error?e.message:"Erreur.");setState("error")}},[id]);
 useEffect(()=>{void load()},[load]);
 async function act(action:string,extra:any={}){try{const r=await fetch("/api/recruitment360/interviews/"+encodeURIComponent(id)+"/video",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...extra})});const d=await r.json();if(!r.ok)throw new Error(d.message);await load();return d}catch(e){setError(e instanceof Error?e.message:"Erreur.");return null}}
 if(state==="loading")return <AppShell role="talent" active="/career" title="Entretien Jobly"><LoadingState/></AppShell>;
 if(state==="error")return <AppShell role="talent" active="/career" title="Entretien Jobly"><ErrorState title={error} onRetry={load}/></AppShell>;
 const isRecruiter=data.viewerRole!=="TALENT";const myConsent=Boolean(data.myConsent?.consented&&!data.myConsent?.revokedAt);
 return <AppShell role={isRecruiter?"recruiter":"talent"} active={isRecruiter?"/recruitment":"/career"} title="Entretien Jobly" width="lg"><PageIntro eyebrow="RECRUTEMENT 360°" title="Entretien Jobly" subtitle="Salle d’attente, présence, notes et consentement d’enregistrement."/>
  <Section title="Salle vidéo"><div className="space-y-3"><Button onClick={()=>void act("prepare")}>{data.video?"Ouvrir la salle":"Préparer la salle"}</Button>{data.room&&<JoblyVideoRoom interviewId={id} room={data.room} livekit={data.livekit} canRecord={isRecruiter}/>}<div className="rounded-xl border p-3 text-xs">Enregistrement : {data.recordingAllowed?"disponible après consentement explicite des deux parties":"désactivé dans le profil actuel."}</div></div></Section>
  <Section title="Consentement"><Card><p className="text-sm">Chaque participant doit consentir séparément avant tout enregistrement. Un retrait bloque l’enregistrement futur.</p><Button variant="ghost" onClick={()=>void act("consent",{consented:true})}>{myConsent?"Consentement actif":"J’accepte l’enregistrement"}</Button><Button variant="ghost" onClick={()=>void act("consent",{consented:false})}>Je refuse</Button></Card></Section>
  <Section title={isRecruiter?"Notes du recruteur":"Notes"}><Card>{!isRecruiter&&<p className="text-sm opacity-70 mb-3">Les notes internes du recruteur ne sont pas visibles dans votre espace.</p>} {isRecruiter&&<textarea value={note} onChange={e=>setNote(e.target.value)} className="w-full min-h-28 rounded-xl border p-3" placeholder="Note privée liée à l’entretien…"/><Button onClick={async()=>{if(note.trim()){await act("note",{body:note});setNote("")}}}>Enregistrer</Button>}<div className="mt-4 space-y-2">{(data.notes||[]).map((n:any)=><div key={n.id} className="rounded-xl border p-3 text-sm">{n.body}<div className="text-xs opacity-60 mt-1">{new Date(n.createdAt).toLocaleString("fr-FR")}</div></div>)}</div></Card></Section>
  <Section title="Actions"><div className="flex flex-wrap gap-2">{isRecruiter&&<><Button onClick={()=>void act("start")}>Démarrer</Button><Button variant="ghost" onClick={()=>void act("end",{participantCount:2})}>Terminer</Button><Button variant="ghost" onClick={()=>void act("recording",{enabled:!recording})}>{data.video?.recordingStatus==="RECORDING"?"Arrêter l’enregistrement":"Démarrer l’enregistrement"}</Button></>}</div>{error&&<p className="mt-3 text-sm">{error}</p>}</Section>
 </AppShell>;
}
