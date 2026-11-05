"use client";

import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import {Button,Card} from "@/components/ui";
import {getSupabaseClient} from "@/lib/supabase";

type Recruitment={id:string;job?:{title?:string;companyName?:string}|null};
type Review={id:string;reviewerRole:string;processRating:number;experienceRating:number;joblyRating:number;recommendation:boolean|null;comment:string|null;status:string;createdAt:string};
type Report={recruitment?:any;job?:any;funnel?:Record<string,number>;metrics?:Record<string,number>;reviews?:any;applications?:any[]};

export default function Recruitment360ReportsPage(){
 const router=useRouter();
 const [recruitments,setRecruitments]=useState<Recruitment[]>([]);
 const [recruitmentId,setRecruitmentId]=useState("");
 const [reviews,setReviews]=useState<Review[]>([]);
 const [report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");

 const token=useCallback(async()=>{
  const {data:{session}}=await getSupabaseClient().auth.getSession();
  if(!session){router.replace("/");throw new Error("Session requise.");}
  return session.access_token;
 },[router]);

 const loadReviews=useCallback(async(id:string)=>{
  if(!id){setReviews([]);return;}
  const accessToken=await token();
  const response=await fetch("/api/recruitment360/reports?recruitmentId="+encodeURIComponent(id),{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload.message||"Avis indisponibles.");
  setReviews(payload.reviews??[]);
 },[token]);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const accessToken=await token();
   const response=await fetch("/api/recruitment360/listings",{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.message||"Recrutements indisponibles.");
   const rows=payload.recruitments??[];setRecruitments(rows);
   const id=recruitmentId&&rows.some((item:Recruitment)=>item.id===recruitmentId)?recruitmentId:rows[0]?.id||"";
   setRecruitmentId(id);await loadReviews(id);
  }catch(cause){setError(cause instanceof Error?cause.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[token,recruitmentId,loadReviews]);

 useEffect(()=>{void load();},[load]);

 async function run(body:Record<string,unknown>,key:string){
  setBusy(key);setError("");
  try{
   const accessToken=await token();
   const response=await fetch("/api/recruitment360/reports",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify(body)});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.message||"Opération impossible.");
   if(key==="report")setReport(payload.report);
   await loadReviews(recruitmentId);
  }catch(cause){setError(cause instanceof Error?cause.message:"Opération impossible.");}
  finally{setBusy(null);}
 }

 const metricLabels:Record<string,string>={applicationCount:"Candidatures",completedCount:"Recrutements finalisés",rejectedCount:"Refus",poolCount:"Vivier",withdrawnCount:"Retraits"};
 return <AppShell role="recruiter" active="/recruiter/applications360" title="Rapports & avis 360°" eyebrow="RECRUTEMENT 360°" initial="R" width="lg">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Lots 7 & 11</p><h1 className="text-2xl font-black">Bilan et retours d’expérience</h1><p className="mt-1 text-sm text-slate-600">Suivi du processus et modération des avis candidat/recruteur.</p></div><div className="flex flex-wrap gap-2"><Button href="/recruiter/applications360" variant="ghost">Candidatures</Button><Button href="/recruiter/interviews360" variant="ghost">Entretiens</Button></div></div>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <Card>
   <label className="grid gap-1 text-sm">Recrutement
    <select value={recruitmentId} onChange={async event=>{const id=event.target.value;setRecruitmentId(id);setReport(null);try{await loadReviews(id)}catch(e){setError(e instanceof Error?e.message:"Chargement impossible.")}}} className="rounded-xl border p-3">
     <option value="">Sélectionner un recrutement</option>
     {recruitments.map(item=><option key={item.id} value={item.id}>{item.job?.title||"Recrutement"} · {item.job?.companyName||"Organisation"}</option>)}
    </select>
   </label>
   <Button className="mt-3" disabled={!recruitmentId||busy!==null} loading={busy==="report"} onClick={()=>void run({action:"report",recruitmentId},"report")}>Générer le bilan</Button>
  </Card>
  {report&&<Card className="mt-4">
   <h2 className="mb-3 font-bold">Bilan du recrutement</h2>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(report.metrics||{}).map(([key,value])=><div key={key} className="rounded-xl border p-3"><p className="text-xs text-slate-500">{metricLabels[key]||key}</p><p className="text-2xl font-black">{String(value)}</p></div>)}</div>
   <h3 className="mt-5 font-semibold">Entonnoir</h3>
   <div className="mt-2 flex flex-wrap gap-2">{Object.entries(report.funnel||{}).map(([key,value])=><span key={key} className="rounded-full border px-3 py-1 text-sm">{key} : {value}</span>)}</div>
   <p className="mt-4 text-xs text-slate-500">{(report.applications||[]).length} dossier(s) détaillé(s) dans le rapport.</p>
  </Card>}
  <section className="mt-6 space-y-3">
   <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">Avis reçus</h2><Button variant="ghost" size="sm" disabled={loading||!recruitmentId} onClick={()=>void loadReviews(recruitmentId)}>Actualiser</Button></div>
   {loading?<Card>Chargement…</Card>:reviews.length===0?<Card className="text-sm text-slate-600">Aucun avis candidat ou recruteur pour ce recrutement.</Card>:reviews.map(review=><Card key={review.id}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{review.reviewerRole==="TALENT"?"Avis candidat":"Avis recruteur"} · {review.status}</p><p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleString("fr-FR")}</p></div><div className="flex gap-2">{review.status==="PENDING"&&<><Button size="sm" disabled={busy!==null} loading={busy===review.id+":publish"} onClick={()=>void run({action:"moderate",reviewId:review.id,status:"PUBLISHED"},review.id+":publish")}>Publier</Button><Button size="sm" variant="ghost" disabled={busy!==null} loading={busy===review.id+":reject"} onClick={()=>void run({action:"moderate",reviewId:review.id,status:"REJECTED"},review.id+":reject")}>Écarter</Button></>}</div></div>
    <div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="rounded-lg bg-slate-100 px-2 py-1">Processus {review.processRating}/5</span><span className="rounded-lg bg-slate-100 px-2 py-1">Recruteur {review.experienceRating}/5</span><span className="rounded-lg bg-slate-100 px-2 py-1">Jobly {review.joblyRating}/5</span>{review.recommendation!==null&&<span className="rounded-lg bg-slate-100 px-2 py-1">Recommande : {review.recommendation?"Oui":"Non"}</span>}</div>
    {review.comment&&<p className="mt-3 whitespace-pre-wrap text-sm">{review.comment}</p>}
   </Card>)}
  </section>
 </AppShell>;
}
