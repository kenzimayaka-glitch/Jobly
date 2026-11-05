"use client";

import { useCallback,useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { Button,Card } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

type Recruitment={id:string;job?:{title?:string;companyName?:string}|null;versions?:{title?:string}[]};
type Test={id:string;title:string;instructions:string;durationseconds:number;maxattempts:number;status:string;questionCount:number};

export default function Recruitment360TestsPage(){
 const router=useRouter();
 const [recruitments,setRecruitments]=useState<Recruitment[]>([]);
 const [recruitmentId,setRecruitmentId]=useState("");
 const [tests,setTests]=useState<Test[]>([]);
 const [selectedTest,setSelectedTest]=useState<Test|null>(null);
 const [title,setTitle]=useState("");
 const [instructions,setInstructions]=useState("");
 const [durationMinutes,setDurationMinutes]=useState("30");
 const [maxAttempts,setMaxAttempts]=useState("1");
 const [prompt,setPrompt]=useState("");
 const [questionType,setQuestionType]=useState("SINGLE_CHOICE");
 const [choicesText,setChoicesText]=useState("Option A\nOption B");
 const [correct,setCorrect]=useState("Option A");
 const [points,setPoints]=useState("1");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);

 const accessToken=useCallback(async()=>{
  const {data:{session}}=await getSupabaseClient().auth.getSession();
  if(!session){router.replace("/");throw new Error("Session recruteur requise.");}
  return session.access_token;
 },[router]);

 const loadTests=useCallback(async(id:string)=>{
  if(!id){setTests([]);return;}
  const token=await accessToken();
  const response=await fetch("/api/recruitment360/tests?recruitmentId="+encodeURIComponent(id),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload.message||"Tests indisponibles.");
  setTests(payload.tests??[]);
 },[accessToken]);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const token=await accessToken();
   const response=await fetch("/api/recruitment360/listings",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.message||"Recrutements indisponibles.");
   const rows=payload.recruitments??[];
   setRecruitments(rows);
   const nextId=recruitmentId&&rows.some((item:Recruitment)=>item.id===recruitmentId)?recruitmentId:rows[0]?.id||"";
   setRecruitmentId(nextId);
   await loadTests(nextId);
  }catch(cause){setError(cause instanceof Error?cause.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[accessToken,loadTests,recruitmentId]);

 useEffect(()=>{void load();},[load]);

 async function mutate(body:Record<string,unknown>,key:string){
  setBusy(key);setError("");
  try{
   const token=await accessToken();
   const response=await fetch("/api/recruitment360/tests",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.message||"Action impossible.");
   if(key==="create"){
    setSelectedTest({...payload.test,questionCount:0});
    setTitle("");setInstructions("");
   }
   await loadTests(recruitmentId);
   if(payload.test?.id&&key==="create")setSelectedTest({...payload.test,questionCount:0});
   if(key==="question"&&selectedTest)setSelectedTest(current=>current?{...current,questionCount:current.questionCount+1}:current);
   if(key==="publish"||key==="close")setSelectedTest(null);
  }catch(cause){setError(cause instanceof Error?cause.message:"Action impossible.");}
  finally{setBusy(null);}
 }

 return <AppShell role="recruiter" active="/recruiter/applications360" title="Tests 360°" eyebrow="RECRUTEMENT 360°" initial="R" width="lg">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Lot 4 · Évaluations</p><h1 className="text-2xl font-black">Créer et publier des tests</h1><p className="mt-1 text-sm text-slate-600">Les tests publiés sont visibles uniquement par les candidats concernés.</p></div><div className="flex gap-2"><Button href="/recruiter/applications360" variant="ghost">Candidatures</Button><Button href="/recruiter/interviews360" variant="ghost">Entretiens</Button></div></div>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <Card>
   <label className="grid gap-1 text-sm">Recrutement
    <select value={recruitmentId} onChange={async event=>{const id=event.target.value;setRecruitmentId(id);setSelectedTest(null);try{await loadTests(id)}catch(e){setError(e instanceof Error?e.message:"Chargement impossible.")}}} className="rounded-xl border p-3">
     <option value="">Sélectionner un recrutement</option>
     {recruitments.map(item=><option key={item.id} value={item.id}>{item.job?.title||item.versions?.[0]?.title||"Recrutement"} · {item.job?.companyName||"Organisation"}</option>)}
    </select>
   </label>
  </Card>
  {!selectedTest&&<Card className="mt-4">
   <h2 className="mb-3 font-bold">Nouveau test</h2>
   <form className="grid gap-3" onSubmit={event=>{event.preventDefault();void mutate({action:"create-test",recruitmentId,title,instructions,durationSeconds:Number(durationMinutes)*60,maxAttempts:Number(maxAttempts)},"create")}}>
    <label className="grid gap-1 text-sm">Titre<input required minLength={3} value={title} onChange={event=>setTitle(event.target.value)} className="rounded-xl border p-3"/></label>
    <label className="grid gap-1 text-sm">Consignes<textarea value={instructions} onChange={event=>setInstructions(event.target.value)} className="min-h-20 rounded-xl border p-3"/></label>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="grid gap-1 text-sm">Durée (minutes)<input required type="number" min="1" max="1440" value={durationMinutes} onChange={event=>setDurationMinutes(event.target.value)} className="rounded-xl border p-3"/></label>
     <label className="grid gap-1 text-sm">Tentatives maximum<select value={maxAttempts} onChange={event=>setMaxAttempts(event.target.value)} className="rounded-xl border p-3">{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>
    </div>
    <Button type="submit" disabled={!recruitmentId||busy!==null} loading={busy==="create"}>Créer le brouillon</Button>
   </form>
  </Card>}
  {selectedTest&&<Card className="mt-4">
   <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs uppercase tracking-widest text-slate-500">Brouillon de test</p><h2 className="font-bold">{selectedTest.title}</h2><p className="text-xs text-slate-600">{selectedTest.questionCount} question(s) ajoutée(s)</p></div><Button size="sm" variant="ghost" onClick={()=>setSelectedTest(null)}>Fermer</Button></div>
   <form className="grid gap-3" onSubmit={event=>{event.preventDefault();const choices=choicesText.split(/\n|,/).map(x=>x.trim()).filter(Boolean);void mutate({action:"add-question",testId:selectedTest.id,prompt,type:questionType,choices,correct,points:Number(points)},"question")}}>
    <label className="grid gap-1 text-sm">Question<input required minLength={5} value={prompt} onChange={event=>setPrompt(event.target.value)} className="rounded-xl border p-3"/></label>
    <label className="grid gap-1 text-sm">Type<select value={questionType} onChange={event=>setQuestionType(event.target.value)} className="rounded-xl border p-3"><option value="SINGLE_CHOICE">Choix unique (correction automatique)</option><option value="NUMBER">Réponse numérique (correction automatique)</option></select></label>
    {questionType==="SINGLE_CHOICE"?<>
     <label className="grid gap-1 text-sm">Choix (une ligne par choix)<textarea value={choicesText} onChange={event=>setChoicesText(event.target.value)} className="min-h-24 rounded-xl border p-3"/></label>
     <label className="grid gap-1 text-sm">Bonne réponse (valeur exacte)<input required value={correct} onChange={event=>setCorrect(event.target.value)} className="rounded-xl border p-3"/></label>
    </>:<label className="grid gap-1 text-sm">Bonne réponse numérique<input required type="number" value={correct} onChange={event=>setCorrect(event.target.value)} className="rounded-xl border p-3"/></label>}
    <label className="grid gap-1 text-sm">Points<input type="number" min="0.01" max="1000" step="0.01" value={points} onChange={event=>setPoints(event.target.value)} className="rounded-xl border p-3"/></label>
    <Button type="submit" disabled={busy!==null} loading={busy==="question"}>Ajouter la question</Button>
   </form>
   <div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy!==null||selectedTest.questionCount===0} loading={busy==="publish"} onClick={()=>void mutate({action:"publish",testId:selectedTest.id},"publish")}>Publier le test</Button><Button variant="ghost" disabled={busy!==null} onClick={()=>void mutate({action:"close",testId:selectedTest.id},"close")}>Fermer le test</Button></div>
  </Card>}
  <section className="mt-6 space-y-3"><h2 className="text-lg font-bold">Tests existants</h2>{loading?<Card>Chargement…</Card>:tests.length===0?<Card className="text-sm text-slate-600">Aucun test créé sur ce recrutement.</Card>:tests.map(test=><Card key={test.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{test.title}</h3><p className="text-sm text-slate-600">{test.status} · {test.questionCount} question(s) · {Math.round(test.durationseconds/60)} min · {test.maxattempts} tentative(s)</p></div>{test.status==="DRAFT"&&<Button size="sm" onClick={()=>setSelectedTest(test)}>Modifier le brouillon</Button>}</div></Card>)}</section>
 </AppShell>;
}
