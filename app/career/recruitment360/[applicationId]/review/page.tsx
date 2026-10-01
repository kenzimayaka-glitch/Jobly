"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import {useParams,useRouter} from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import {Button,Card,ErrorState,LoadingState,PageIntro,Section} from "@/components/ui";
import {getSupabaseClient} from "@/lib/supabase";

export default function Recruitment360ReviewPage(){
 const {applicationId}=useParams<{applicationId:string}>(),router=useRouter(),[state,setState]=useState("loading"),[error,setError]=useState(""),[form,setForm]=useState({process:5,experience:5,jobly:5,recommendation:true,comment:""}),[saved,setSaved]=useState(false);
 async function headers(){const{data:{session}}=await getSupabaseClient().auth.getSession();if(!session)throw new Error("Session requise.");return{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"}}
 useEffect(()=>{void (async()=>{try{await headers();setState("ready")}catch(e){setError(e instanceof Error?e.message:"Erreur");setState("error")}})()},[]);
 async function submit(e:FormEvent){e.preventDefault();try{const h=await headers();const r=await fetch("/api/recruitment360/reports",{method:"POST",headers:h,body:JSON.stringify({action:"review",applicationId,reviewerRole:"TALENT",processRating:form.process,experienceRating:form.experience,joblyRating:form.jobly,recommendation:form.recommendation,comment:form.comment})});const d=await r.json();if(!r.ok)throw new Error(d.message);setSaved(true)}catch(e){setError(e instanceof Error?e.message:"Erreur")}}
 if(state==="loading")return <AppShell role="talent" active="/career" title="Votre avis"><LoadingState/></AppShell>;
 if(state==="error")return <AppShell role="talent" active="/career" title="Votre avis"><ErrorState title={error} onRetry={()=>location.reload()}/></AppShell>;
 return <AppShell role="talent" active="/career" title="Votre avis" initial="J" width="lg">
  <PageIntro eyebrow="RECRUTEMENT 360°" title="Votre avis sur le processus" subtitle="Votre avis porte sur le processus, votre expérience et Jobly. Il est modéré avant publication."/>
  {saved?<Card><p className="font-bold">Merci. Votre avis a été enregistré et sera modéré.</p><Button className="mt-4" onClick={()=>router.back()}>Retour</Button></Card>:<form onSubmit={submit} className="space-y-4">
   {[["process","Processus"],["experience","Expérience"],["jobly","Jobly"]].map(([key,label])=><Section key={key} title={label}><Card><div className="flex gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={`${label} ${n}/5`} onClick={()=>setForm(f=>({...f,[key]:n}))} className={Number(form[key as keyof typeof form])>=n?"text-2xl":"text-2xl opacity-30"}>★</button>)}</div></Card></Section>)}
   <Card><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.recommendation} onChange={e=>setForm(f=>({...f,recommendation:e.target.checked}))}/> Je recommanderais ce processus à un autre candidat.</label><textarea maxLength={2000} value={form.comment} onChange={e=>setForm(f=>({...f,comment:e.target.value}))} placeholder="Commentaire (facultatif)" className="mt-3 min-h-28 w-full rounded-xl border p-3"/></Card>
   <Button type="submit">Envoyer mon avis</Button>
  </form>}
 </AppShell>
}
