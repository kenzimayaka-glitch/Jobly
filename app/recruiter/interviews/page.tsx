"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageIntro, Section } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

type App = { id:string; recruiterJobId:string; candidateName?:string; jobTitle?:string };
type Interview = { id:string; applicationId:string; title:string; startsAt:string; endsAt:string; status:string; meetingProvider:string; meetingUrl?:string|null; RecruitmentInterviewJury?:any[]; RecruitmentInterviewAttendance?:any[] };

export default function RecruiterInterviewsPage() {
  const router=useRouter(); const [state,setState]=useState("loading"); const [apps,setApps]=useState<App[]>([]); const [ints,setInts]=useState<Interview[]>([]); const [error,setError]=useState("");
  const [form,setForm]=useState({applicationId:"",startsAt:"",endsAt:"",meetingProvider:"EXTERNAL",meetingUrl:"",jury:"",notes:""});

  async function headers(){const {data:{session}}=await getSupabaseClient().auth.getSession();if(!session){router.replace("/");return {}};return {Authorization:"Bearer "+session.access_token}}
  async function load(){setState("loading");try{const h=await headers();const [a,i]=await Promise.all([fetch("/api/recruiter/applications?markViewed=0",{headers:h}),fetch("/api/recruitment360/interviews",{headers:h})]);if(!a.ok||!i.ok)throw new Error("Chargement impossible");setApps((await a.json()).applications??[]);setInts((await i.json()).interviews??[]);setState("ready")}catch(e){setError(e instanceof Error?e.message:"Erreur");setState("error")}}
  useEffect(()=>{void load()},[]);

  async function schedule(e:any){e.preventDefault();setError("");try{const h=await headers(),a=apps.find(x=>x.id===form.applicationId);if(!a)throw new Error("Candidature requise");const r=await fetch("/api/recruitment360/interviews",{method:"POST",headers:{...h,"Content-Type":"application/json"},body:JSON.stringify({action:"schedule",recruiterJobId:a.recruiterJobId,applicationId:a.id,startsAt:new Date(form.startsAt).toISOString(),endsAt:new Date(form.endsAt).toISOString(),meetingProvider:form.meetingProvider,meetingUrl:form.meetingUrl||null,jury:form.jury.split(",").map(x=>x.trim()).filter(Boolean).map(userId=>({userId,role:"JURY",weight:1})),notes:form.notes})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Planification impossible");setForm({applicationId:"",startsAt:"",endsAt:"",meetingProvider:"EXTERNAL",meetingUrl:"",jury:"",notes:""});await load()}catch(e){setError(e instanceof Error?e.message:"Erreur")}}
  async function action(id:string,b:any){const h=await headers();const r=await fetch("/api/recruitment360/interviews/"+id,{method:"POST",headers:{...h,"Content-Type":"application/json"},body:JSON.stringify(b)});const d=await r.json();if(!r.ok)throw new Error(d.message||"Action impossible");await load()}

  return <AppShell role="recruiter" active="/recruiter/interviews" title="Entretiens" eyebrow="RECRUTEMENT 360°" initial="J" width="lg">
    <PageIntro eyebrow="LOT 5" title="Entretiens" subtitle="Créneaux, jury, présence, rappels et réunion." actions={<Button href="/recruiter">Tableau de bord</Button>}/>
    {state==="loading"&&<LoadingState/>}{state==="error"&&<ErrorState title={error||"Chargement impossible"} onRetry={load}/>}
    {state==="ready"&&<>
      <Section title="Planifier un entretien"><Card><form onSubmit={schedule} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Candidature<select required value={form.applicationId} onChange={e=>setForm(v=>({...v,applicationId:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"><option value="">Choisir…</option>{apps.map(a=><option key={a.id} value={a.id}>{a.candidateName||"Candidat"} — {a.jobTitle||"Offre"}</option>)}</select></label>
        <label className="text-sm font-bold">Début<input required type="datetime-local" value={form.startsAt} onChange={e=>setForm(v=>({...v,startsAt:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-bold">Fin<input required type="datetime-local" value={form.endsAt} onChange={e=>setForm(v=>({...v,endsAt:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-bold">Réunion<select value={form.meetingProvider} onChange={e=>setForm(v=>({...v,meetingProvider:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"><option value="EXTERNAL">Lien externe</option><option value="GOOGLE_MEET">Google Meet</option><option value="JOBLY_NATIVE">Jobly natif (lot 9)</option></select></label>
        <label className="text-sm font-bold sm:col-span-2">Lien<input type="url" value={form.meetingUrl} onChange={e=>setForm(v=>({...v,meetingUrl:e.target.value}))} placeholder="https://meet.google.com/..." className="mt-1 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-bold sm:col-span-2">Jury — IDs User séparés par virgule<input value={form.jury} onChange={e=>setForm(v=>({...v,jury:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-bold sm:col-span-2">Notes<textarea value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} className="mt-1 min-h-24 w-full rounded-xl border p-3"/></label>
        <Button type="submit" className="sm:col-span-2">Planifier l'entretien</Button>
      </form></Card></Section>
      <Section title="Entretiens planifiés">{ints.length===0?<EmptyState title="Aucun entretien planifié"/>:<div className="space-y-3">{ints.map(i=><Card key={i.id}><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="text-xs font-bold text-muted">{new Date(i.startsAt).toLocaleString("fr-FR")}</p><h2 className="text-lg font-black">{i.title}</h2><p className="text-sm text-muted">{i.status} · {i.meetingProvider} · Jury {(i.RecruitmentInterviewJury??[]).length}</p>{i.meetingUrl&&<a className="font-bold underline" href={i.meetingUrl} target="_blank" rel="noreferrer">Ouvrir la réunion</a>}</div><div className="flex flex-wrap gap-2">{i.status==="SCHEDULED"&&<Button size="sm" onClick={()=>void action(i.id,{action:"status",status:"CONFIRMED"})}>Confirmer</Button>}{["SCHEDULED","CONFIRMED"].includes(i.status)&&<Button size="sm" variant="ghost" onClick={()=>void action(i.id,{action:"status",status:"STARTED"})}>Démarrer</Button>}{i.status==="STARTED"&&<Button size="sm" onClick={()=>void action(i.id,{action:"status",status:"COMPLETED"})}>Terminer</Button>}{!["COMPLETED","CANCELLED","NO_SHOW"].includes(i.status)&&<Button size="sm" variant="ghost" onClick={()=>{const reason=prompt("Motif d'annulation (5 caractères min.)");if(reason)void action(i.id,{action:"status",status:"CANCELLED",reason})}}>Annuler</Button>}</div></div></Card>)}</div>}</Section>
    </>}
  </AppShell>
}