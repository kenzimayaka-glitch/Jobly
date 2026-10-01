"use client";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import {Card,ErrorState,LoadingState,PageIntro,Section} from "@/components/ui";

export default function Recruitment360SharedReportPage(){
 const params=useSearchParams(),token=params.get("token")||"",[state,setState]=useState("loading"),[report,setReport]=useState<any>(null),[error,setError]=useState("");
 async function load(){try{const r=await fetch("/api/recruitment360/reports/share?token="+encodeURIComponent(token),{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.message);setReport(d.report);setState("ready")}catch(e){setError(e instanceof Error?e.message:"Lien indisponible");setState("error")}}
 useEffect(()=>{void load()},[token]);
 if(state==="loading")return <main className="mx-auto max-w-3xl p-5"><LoadingState/></main>;
 if(state==="error")return <main className="mx-auto max-w-3xl p-5"><ErrorState title={error} onRetry={load}/></main>;
 const m=report.metrics||{},r=report.reviews||{};
 return <main className="mx-auto max-w-3xl p-5"><PageIntro eyebrow="JOBLY · RAPPORT SÉCURISÉ" title={report.job.title} subtitle={[report.job.companyName,report.job.location,report.job.contract].filter(Boolean).join(" · ")}/>
  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Candidatures",m.applicationCount],["Embauchés",m.completedCount],["Refusés",m.rejectedCount],["Vivier",m.poolCount],["Retraits",m.withdrawnCount]].map(([k,v])=><Card key={String(k)}><p className="text-xs opacity-70">{k}</p><p className="text-2xl font-black">{String(v??0)}</p></Card>)}</div>
  <Section title="Entonnoir"><Card>{Object.entries(report.funnel||{}).map(([k,v])=><div key={k} className="flex justify-between border-b py-2 text-sm"><span>{k}</span><strong>{String(v)}</strong></div>)}</Card></Section>
  <Section title="Avis publiés"><Card><p className="text-sm">Processus {r.processAverage??"—"}/5 · Expérience {r.experienceAverage??"—"}/5 · Jobly {r.joblyAverage??"—"}/5</p></Card></Section>
  <Section title="Candidatures"><div className="space-y-2">{(report.applications||[]).map((a:any)=><Card key={a.applicationId}><p className="font-bold">{a.candidateName}</p><p className="text-xs opacity-70">{a.state} · ATS {a.atsScore??"—"} · score {a.scoreTotal??"—"} · {a.decisionOutcome||"—"}</p></Card>)}</div></Section>
  <p className="mt-5 text-xs opacity-60">Ce lien ne contient pas les coordonnées, justificatifs, liens CV ni informations salariales sensibles. Il expire automatiquement.</p>
 </main>
}
