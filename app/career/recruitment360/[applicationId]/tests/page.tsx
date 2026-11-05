"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { Button, Card } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

type Test = { id:string; title:string; instructions?:string|null; durationseconds:number; maxattempts:number };
type Question = { id:string; position:number; prompt:string; type:string; options:any; points:number };
type TestSession = { id:string; status:string; attempt:number; expiresAt:string; score:number|null; submittedAt?:string|null };

export default function CandidateRecruitmentTestPage() {
  const { applicationId } = useParams<{ applicationId:string }>();
  const router = useRouter();
  const [tests,setTests]=useState<Test[]>([]);
  const [sessions,setSessions]=useState<TestSession[]>([]);
  const [activeTest,setActiveTest]=useState<Test|null>(null);
  const [questions,setQuestions]=useState<Question[]>([]);
  const [session,setSession]=useState<TestSession|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  const token = useCallback(async()=>{
    const {data:{session}}=await getSupabaseClient().auth.getSession();
    if(!session){router.replace("/");throw new Error("Session requise.");}
    return session.access_token;
  },[router]);

  const loadTests=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const accessToken=await token();
      const response=await fetch("/api/recruitment360/tests?applicationId="+encodeURIComponent(applicationId),{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.message||"Tests indisponibles.");
      setTests(payload.tests??[]);setSessions(payload.sessions??[]);
    }catch(cause){setError(cause instanceof Error?cause.message:"Chargement impossible.");}
    finally{setLoading(false);}
  },[applicationId,token]);

  useEffect(()=>{void loadTests();},[loadTests]);

  async function loadTest(test:Test,sessionId:string){
    const accessToken=await token();
    const query=new URLSearchParams({applicationId,testId:test.id,sessionId});
    const response=await fetch("/api/recruitment360/tests?"+query.toString(),{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.message||"Questions indisponibles.");
    setActiveTest(test);setQuestions(payload.questions??[]);setSession(payload.session??null);
    const values:Record<string,string>={};
    for(const answer of payload.answers??[])values[answer.questionId]=String(answer.answer?.value??"");
    setAnswers(values);
  }

  async function start(test:Test){
    setBusy(test.id);setError("");
    try{
      const accessToken=await token();
      const response=await fetch("/api/recruitment360/tests",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({action:"start",applicationId,testId:test.id})});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.message||"Démarrage impossible.");
      await loadTest(test,payload.session.id);
      await loadTests();
    }catch(cause){setError(cause instanceof Error?cause.message:"Démarrage impossible.");}
    finally{setBusy(null);}
  }

  async function saveAnswer(questionId:string,value:string){
    if(!session)return;
    setAnswers(current=>({...current,[questionId]:value}));
    setBusy(questionId);setError("");
    try{
      const accessToken=await token();
      const response=await fetch("/api/recruitment360/tests",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({action:"answer",sessionId:session.id,questionId,answer:{value}})});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.message||"Enregistrement impossible.");
    }catch(cause){setError(cause instanceof Error?cause.message:"Enregistrement impossible.");}
    finally{setBusy(null);}
  }

  async function submit(){
    if(!session)return;
    setBusy("submit");setError("");
    try{
      const accessToken=await token();
      const response=await fetch("/api/recruitment360/tests",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({action:"submit",sessionId:session.id})});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.message||"Envoi impossible.");
      setSession(payload.session);await loadTests();
    }catch(cause){setError(cause instanceof Error?cause.message:"Envoi impossible.");}
    finally{setBusy(null);}
  }

  const hasUnsupported=questions.some(q=>!["SINGLE_CHOICE","NUMBER"].includes(String(q.type).toUpperCase()));
  const choices=(question:Question)=>{
    if(Array.isArray(question.options))return question.options;
    if(Array.isArray(question.options?.choices))return question.options.choices;
    if(Array.isArray(question.options?.options))return question.options.options;
    return [];
  };

  return (
    <AppShell role="talent" active="/career" title="Mes tests de recrutement" initial="J" width="lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Recruitment 360</p><h1 className="text-2xl font-black">Évaluations candidat</h1><p className="mt-1 text-sm text-slate-600">Les réponses sont enregistrées côté serveur et horodatées.</p></div><Button href={"/career/recruitment360/"+applicationId} variant="ghost">Ma candidature</Button></div>
      {error&&<p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading?<Card>Chargement…</Card>:null}
      {!loading&&!activeTest&&<div className="space-y-3">{tests.length===0?<Card className="text-sm text-slate-600">Aucun test publié pour cette candidature.</Card>:tests.map(test=>{
        const latest=sessions.find(item=>item.testId===test.id);
        return <Card key={test.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">{test.title}</h2><p className="text-sm text-slate-600">{test.durationseconds} s · {test.maxattempts} tentative(s) maximum</p>{test.instructions&&<p className="mt-1 text-sm">{test.instructions}</p>}{latest&&<p className="mt-1 text-xs text-slate-600">Dernière tentative : {latest.status}{latest.score!=null?" · "+latest.score+"%":""}</p>}</div><Button disabled={busy!==null} loading={busy===test.id} onClick={()=>void start(test)}>{latest?.status==="RUNNING"?"Reprendre":"Commencer"}</Button></div></Card>;
      })}</div>}
      {activeTest&&session&&<section className="space-y-3">
        <Card><h2 className="font-bold">{activeTest.title}</h2><p className="text-sm text-slate-600">Tentative {session.attempt} · Échéance : {new Date(session.expiresAt).toLocaleString("fr-FR")}</p><p className="mt-1 text-xs text-slate-600">Chaque réponse est sauvegardée automatiquement. Ne fermez pas la page avant l'envoi.</p></Card>
        {questions.map((question,index)=>{
          const type=String(question.type).toUpperCase();
          const saved=answers[question.id]??"";
          return <Card key={question.id}><p className="mb-3 font-semibold">{index+1}. {question.prompt}</p>
            {type==="SINGLE_CHOICE"?<div className="space-y-2">{choices(question).map((choice:any,i:number)=>{
              const value=String(choice?.value??choice?.id??choice?.label??choice);
              const label=String(choice?.label??choice?.text??choice?.value??choice);
              return <label key={i} className="flex items-center gap-2 rounded-xl border p-3 text-sm"><input type="radio" name={question.id} value={value} checked={saved===value} disabled={busy!==null||session.status!=="RUNNING"} onChange={()=>void saveAnswer(question.id,value)}/>{label}</label>;
            })}</div>:type==="NUMBER"?<input type="number" value={saved} disabled={busy!==null||session.status!=="RUNNING"} onChange={event=>setAnswers(current=>({...current,[question.id]:event.target.value}))} onBlur={event=>{if(event.target.value!==saved)void saveAnswer(question.id,event.target.value);else if(event.target.value)void saveAnswer(question.id,event.target.value);}} className="w-full rounded-xl border p-3" placeholder="Votre réponse numérique"/>:<p className="text-sm text-amber-700">Ce type de question ({type}) n'est pas pris en charge par le moteur de correction automatique. Le test ne peut pas être envoyé en sécurité.</p>}
            {busy===question.id&&<p className="mt-2 text-xs text-slate-500">Enregistrement…</p>}
          </Card>;
        })}
        {session.status==="RUNNING"?<div className="flex flex-wrap gap-2"><Button disabled={busy!==null||hasUnsupported} loading={busy==="submit"} onClick={()=>void submit()}>Soumettre le test</Button><Button variant="ghost" disabled={busy!==null} onClick={()=>{setActiveTest(null);setSession(null);void loadTests();}}>Quitter sans soumettre</Button></div>:<Card><p className="font-bold">Test {session.status==="SUBMITTED"?"soumis":"terminé"}</p><p className="text-sm">Score : {session.score==null?"en attente":session.score+"%"}</p><Button className="mt-3" onClick={()=>{setActiveTest(null);setSession(null);void loadTests();}}>Retour aux tests</Button></Card>}
        {hasUnsupported&&<p className="text-sm text-amber-700">Certaines questions ne sont pas corrigeables automatiquement. Contactez le recruteur avant de poursuivre.</p>}
      </section>}
    </AppShell>
  );
}
