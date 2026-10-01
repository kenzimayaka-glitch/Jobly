"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { Button,Card,EmptyState,ErrorState,LoadingState,PageIntro,Section } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

type Candidate={application_id:string;candidate_state:string;decision_outcome:string|null;decision_at:string|null;score_total:number|null;rationale:string|null;candidateName?:string;jobTitle?:string};
type Form={applicationId:string;outcome:string;rationale:string;scoreTotal:string;nextAction:string};

export default function RecruiterDecisionsPage(){
 const router=useRouter();const[state,setState]=useState("loading");const[candidates,setCandidates]=useState<Candidate[]>([]);const[error,setError]=useState("");
 const[form,setForm]=useState<Form>({applicationId:"",outcome:"OFFER",rationale:"",scoreTotal:"",nextAction:"PREPARE_OFFER"});
 async function headers(){const{data:{session}}=await getSupabaseClient().auth.getSession();if(!session){router.replace("/");return{}};return{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"}}
 async function load(){setState("loading");try{const h=await headers();const r=await fetch("/api/recruitment360/decisions",{headers:h});const d=await r.json();if(!r.ok)throw new Error(d.message||"Chargement impossible");setCandidates(d.candidates??[]);setState("ready")}catch(e){setError(e instanceof Error?e.message:"Erreur");setState("error")}}
 useEffect(()=>{void load()},[]);
 async function finalize(e:any){e.preventDefault();setError("");try{const h=await headers();const r=await fetch("/api/recruitment360/decisions",{method:"POST",headers:h,body:JSON.stringify({action:"finalize",applicationId:form.applicationId,outcome:form.outcome,rationale:form.rationale,scoreTotal:form.scoreTotal===""?null:Number(form.scoreTotal),nextAction:form.nextAction})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Décision impossible");setForm(v=>({...v,applicationId:"",rationale:"",scoreTotal:""}));await load()}catch(e){setError(e instanceof Error?e.message:"Erreur")}}
 async function vote(applicationId:string,recommendation:string){try{const h=await headers();const r=await fetch("/api/recruitment360/decisions",{method:"POST",headers:h,body:JSON.stringify({action:"vote",applicationId,recommendation})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Vote impossible");await load()}catch(e){setError(e instanceof Error?e.message:"Vote impossible")}}
 return <AppShell role="recruiter" active="/recruiter/decisions" title="Décisions" eyebrow="RECRUTEMENT 360°" initial="J" width="lg">
  <PageIntro eyebrow="LOT 6" title="Décisions" subtitle="Synthèse des candidatures, avis du jury, décision finale et traçabilité." actions={<Button href="/recruiter">Tableau de bord</Button>}/>
  {error&&<p className="mt-3 rounded-xl border p-3 text-sm">{error}</p>}
  {state==="loading"&&<LoadingState/>}{state==="error"&&<ErrorState title={error||"Chargement impossible"} onRetry={load}/>}
  {state==="ready"&&<>
   <Section title="Décider"><Card><form onSubmit={finalize} className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-bold sm:col-span-2">Candidature<select required value={form.applicationId} onChange={e=>setForm(v=>({...v,applicationId:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"><option value="">Choisir…</option>{candidates.map(c=><option key={c.application_id} value={c.application_id}>{c.candidateName||c.application_id.slice(0,8)} · {c.candidate_state}</option>)}</select></label>
    <label className="text-sm font-bold">Issue<select value={form.outcome} onChange={e=>setForm(v=>({...v,outcome:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"><option value="OFFER">Offre</option><option value="HIRED">Recruté</option><option value="POOL">Vivier</option><option value="REJECTED">Rejet</option></select></label>
    <label className="text-sm font-bold">Score global<input type="number" min="0" max="100" value={form.scoreTotal} onChange={e=>setForm(v=>({...v,scoreTotal:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-bold sm:col-span-2">Prochaine action<select value={form.nextAction} onChange={e=>setForm(v=>({...v,nextAction:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"><option value="PREPARE_OFFER">Préparer l'offre</option><option value="NOTIFY_REJECTION">Notifier le rejet</option><option value="KEEP_POOL">Conserver au vivier</option><option value="CLOSE_RECRUITMENT">Clôturer le recrutement</option></select></label>
    <label className="text-sm font-bold sm:col-span-2">Justification<textarea required minLength={5} value={form.rationale} onChange={e=>setForm(v=>({...v,rationale:e.target.value}))} className="mt-1 min-h-28 w-full rounded-xl border p-3"/></label>
    <Button type="submit" className="sm:col-span-2">Finaliser la décision</Button>
   </form></Card></Section>
   <Section title="Candidatures en décision">{candidates.length===0?<EmptyState title="Aucune candidature éligible"/>:<div className="space-y-3">{candidates.map(c=><Card key={c.application_id}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold text-muted">{c.candidate_state}</p><h2 className="text-base font-black">{c.candidateName||"Candidat"}</h2><p className="text-sm text-muted">{c.jobTitle||c.application_id}</p>{c.decision_outcome&&<p className="mt-1 text-sm">Décision : <strong>{c.decision_outcome}</strong>{c.score_total!==null?" · "+c.score_total+"/100":""}</p>}{c.rationale&&<p className="mt-1 text-sm text-muted">{c.rationale}</p>}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={()=>void vote(c.application_id,"YES")}>Avis favorable</Button><Button size="sm" variant="ghost" onClick={()=>void vote(c.application_id,"RESERVE")}>Réserve</Button><Button size="sm" variant="ghost" onClick={()=>void vote(c.application_id,"NO")}>Avis défavorable</Button></div></div></Card>)}</div>}</Section>
  </>}
 </AppShell>
}