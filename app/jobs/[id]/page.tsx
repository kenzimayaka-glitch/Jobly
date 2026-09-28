"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { jobPublicUrl } from "@/lib/site";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import TalentBackground from "@/components/TalentBackground";
import CompanyLogo from "@/components/CompanyLogo";
import { cleanCompanyName, parseJobDetailSections } from "@/lib/jobContent";

type Job = Record<string, any>;
function GmailIcon({size=18}:{size?:number}) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13A2.5 2.5 0 0 1 18.5 21H5.5A2.5 2.5 0 0 1 3 18.5v-13Z" fill="white"/><path d="M4.5 6.2 12 12l7.5-5.8V18a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6.2Z" fill="#EA4335"/><path d="M4.5 6.2 12 12l7.5-5.8-1.1-1.6L12 9.4 5.6 4.6 4.5 6.2Z" fill="#4285F4"/><path d="M4.5 6.2V18c0 .55.45 1 1 1h2V8.12L4.5 6.2Z" fill="#34A853"/><path d="M19.5 6.2V18c0 .55-.45 1-1 1h-2V8.12l3-1.92Z" fill="#FBBC04"/></svg>; }
function WhatsAppIcon({size=18}:{size?:number}) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#25D366"/><path d="M8.7 7.6c.3-.3.7-.3 1 0l1.2 1.4c.25.3.25.7.02 1l-.55.72c.5 1 1.35 1.85 2.35 2.35l.72-.55c.3-.23.7-.23 1 .02l1.4 1.2c.3.25.3.7 0 1-.65.75-1.6 1.2-2.65 1.05-1.65-.23-3.4-1.3-4.8-2.7s-2.47-3.15-2.7-4.8c-.15-1.05.3-2 1.05-2.65Z" fill="white"/></svg>; }
function JobDetailInner() {
  const router=useRouter(), params=useParams<{id:string}>(), search=useSearchParams(), source=search.get("source");
  const [job,setJob]=useState<Job|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  useEffect(()=>{if(!params.id||(source!=="discovery"&&source!=="recruiter")){setError("Lien d'offre invalide.");setLoading(false);return;} fetch(`/api/jobs/${encodeURIComponent(params.id)}?source=${encodeURIComponent(source)}`).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.message||"Offre introuvable.");return b.job}).then(setJob).catch(e=>setError(e instanceof Error?e.message:"Offre introuvable.")).finally(()=>setLoading(false));},[params.id,source]);
  function whatsappPhone(profile:any){const values=Array.isArray(profile?.phoneNumbers)?profile.phoneNumbers:typeof profile?.phone==="string"?[profile.phone]:[];const raw=values.find((v:any)=>/237|^6|^2/.test(String(v)))||values[0];if(!raw)return null;let digits=String(raw).replace(/[^0-9]/g,"");if(digits.startsWith("237"))return digits;if(digits.startsWith("6")&&digits.length===9)return "237"+digits;if(digits.startsWith("2")&&digits.length===9)return "237"+digits;return null;}
  async function openWhatsApp(){const phone=whatsappPhone(job?.applicationProfile);if(!phone)return;try{const s=await getSupabaseClient().auth.getSession();if(!s.data.session){sessionStorage.setItem("jobly:after-login", "/jobs/"+params.id+"?source="+source);router.push("/");return;}const r=await fetch("/api/cv-share",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.data.session.access_token},body:JSON.stringify({source,jobId:params.id})});const b=await r.json();if(!r.ok)throw Error(b.message||"Impossible de préparer le CV.");const cvUrl=window.location.origin+"/cv/share/"+b.token;const message="Bonjour, je suis "+b.candidateName+". Je souhaite vous soumettre ma candidature au poste de "+(job?.title||"ce poste")+(company?" chez "+company:"")+".\n\n📄 CV "+b.candidateName+" — Candidature "+(company||job?.title||"ce poste")+"\n"+cvUrl;window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");}catch(e){alert(e instanceof Error?e.message:"Impossible d'ouvrir WhatsApp.");}}
  async function openEmail(){if(!emailChannel||busy)return;setBusy(true);setError("");try{const s=await getSupabaseClient().auth.getSession();if(!s.data.session){sessionStorage.setItem("jobly:after-login",window.location.pathname+window.location.search);router.push("/");return;}const r=await fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.data.session.access_token},body:JSON.stringify({source,jobId:params.id})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.message||"Impossible de préparer la candidature.");router.push("/applications/review/"+encodeURIComponent(b.application.id));}catch(e){setError(e instanceof Error?e.message:"Impossible de préparer la candidature.");}finally{setBusy(false);}} async function apply(){if(phoneChannel){await openWhatsApp();return;}if(applicationLink){window.open(applicationLink,"_blank","noopener,noreferrer");return;}if(emailChannel){await openEmail();}}
  if(loading)return <main className="talent-shell grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  if(error||!job)return <main className="talent-shell min-h-[100dvh] bg-[#F7FAFF] text-navy"><PageHeader label="Offre" onBack={()=>router.replace("/jobs")} theme="talent"/><div className="mx-auto mt-8 max-w-2xl px-5"><div className="talent-card rounded-[24px] bg-white p-6 shadow-sm"><h1 className="text-xl font-black">Offre indisponible</h1><p className="mt-2 text-sm text-slate-500">{error||"Cette offre n'est plus disponible."}</p><button onClick={()=>router.replace("/jobs")} className="mt-5 rounded-2xl bg-jobly-blue px-5 py-3 text-sm font-black text-white">Retour aux offres</button></div></div></main>;
  const company=cleanCompanyName(job.company?.name||job.companyName), emailChannel=Boolean(job.applicationProfile?.applicationEmail||job.applicationProfile?.email), phoneChannel=Boolean(job.applicationProfile?.applicationPhone||job.applicationProfile?.phone||job.applicationProfile?.phoneNumbers?.length), applicationLink=String(job.applicationProfile?.applicationUrl||job.applicationProfile?.applyUrl||job.applicationProfile?.url||"").trim(), contract=job.contractType||job.contract, remote=job.remoteMode==="YES"?"Télétravail":job.remoteMode==="PARTIAL"?"Hybride":job.remoteMode==="NO"?"Présentiel":null;
  const deadline=job.deadline?new Date(job.deadline).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):null;
  const tags:string[]=Array.isArray(job.tags)?job.tags:[];
  const formatContract=(value:any)=>{
    const raw=String(value||"").trim();
    const key=raw.toUpperCase().replace(/[\s_-]+/g,"_");
    const labels:Record<string,string>={
      FULL_TIME:"Temps plein",
      FULLTIME:"Temps plein",
      PART_TIME:"Temps partiel",
      PARTTIME:"Temps partiel",
      INTERNSHIP:"Stage",
      INTERNSHIP_CONTRACT:"Stage",
      FREELANCE:"Freelance",
      TEMPORARY:"Temporaire",
      CDD:"CDD",
      CDI:"CDI",
      FIXED_TERM:"CDD",
      PERMANENT:"CDI",
    };
    return labels[key]||raw;
  };
  const formatSalary=(value:any)=>{
    const raw=String(value??"").trim();
    if(!raw)return "";
    const numeric=Number(raw.replace(/[^0-9.,-]/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",","."));
    if(!Number.isFinite(numeric))return raw;
    return new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(numeric);
  };
  const detailSections = parseJobDetailSections(job.description, job.title);
  const sectionText = (key: keyof typeof detailSections) => detailSections[key] || [];
  const renderLines = (items:string[], emptyFallback?:string) => {
    if (!items.length) return emptyFallback ? <p className="text-sm leading-7 text-slate-500">{emptyFallback}</p> : null;
    return <div className="space-y-3 text-sm leading-7 text-slate-600">{items.map((line:string,index:number)=>{
      const value=line.replace(/^(?:•|▪|◦|-|–|—|\*)\s*/,"");
      return <p key={index} className="relative pl-5 before:absolute before:left-0 before:top-[0.75em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#FFD60A]">{value}</p>;
    })}</div>;
  };
  const profileSections: Array<[keyof typeof detailSections,string,string]> = [
    ["formation","Formation","Formation académique, diplôme ou niveau d’études demandé."],
    ["experience","Expérience",job.minExperienceYears!=null ? `Minimum ${job.minExperienceYears} an${job.minExperienceYears>1?"s":""} d’expérience.` : "Expérience professionnelle précisée dans l’offre."],
    ["skills","Compétences","Compétences techniques et professionnelles attendues."],
    ["qualities","Qualités recherchées","Savoir-être et qualités attendues pour le poste."],
  ];
  const hasProfileContent = detailSections.profile.length>0 || profileSections.some(([key])=>sectionText(key).length>0) || job.minExperienceYears!=null;
  const applicationMode = emailChannel ? "Candidature par e-mail" : phoneChannel ? "Candidature par téléphone / WhatsApp" : applicationLink ? "Candidature via la plateforme externe" : "Candidature depuis Jobly";
  const applicationDocuments = sectionText("application");
  const headerFacts: string[] = [
    job.location ? `📍 ${job.location}` : "",
    contract ? `💼 ${formatContract(contract)}` : "",
    remote ? `🏢 ${remote}` : "",
    (job.salary || job.salaryMin != null)
      ? `💰 ${job.salary ? formatSalary(job.salary) : `${formatSalary(job.salaryMin)}${job.salaryMax != null ? ` – ${formatSalary(job.salaryMax)}` : ""}`} ${job.salaryCurrency || "XAF"}`
      : "",
  ].filter((fact): fact is string => Boolean(fact));
  return <main className="talent-shell relative min-h-[100dvh] bg-[#F7FAFF] pb-28 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Détail de l'offre" onBack={()=>router.replace("/jobs")} theme="talent"/><div className="mx-auto max-w-3xl px-5 py-6 sm:px-6">
    <section className="relative overflow-hidden rounded-[30px] bg-white p-6 shadow-sm sm:p-8">
      <img src="/jobly-logo-reference.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute right-[-4rem] top-12 z-0 w-80 opacity-[0.035] grayscale"/>
      <div className="relative z-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#F3F6FA]"><CompanyLogo companyName={company} logoUrl={job.company?.logoUrl} domain={job.company?.domain} website={job.company?.website} size={56}/></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#B59A00]">Offre d'emploi</p>
            <h1 className="mt-2 text-3xl font-black leading-[1.08] tracking-[-.025em] text-[#17212B] sm:text-4xl">{job.title}</h1>
            <p className="mt-2 text-base font-black text-jobly-blue">{company}</p>
            {headerFacts.length>0 && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">{headerFacts.map((fact:string)=><span key={fact}>{fact}</span>)}</div>}
            {deadline && <p className="mt-3 text-xs font-bold text-amber-700">Candidatures jusqu'au {deadline}</p>}
          </div>
        </div>
        {tags.length>0 && <div className="mt-6 flex flex-wrap gap-2">{tags.map((t)=><span key={t} className="rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-bold text-jobly-blue">{t}</span>)}</div>}
        <div className="mt-7 border-t border-slate-100 pt-6">
          <button disabled={busy} onClick={apply} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-5 py-4 text-sm font-black text-[#17212B] shadow-[0_10px_26px_rgba(255,214,10,.25)] transition hover:brightness-[.98] disabled:opacity-50 sm:w-auto sm:min-w-[220px]">
            {emailChannel ? <><GmailIcon size={18}/><span>Postuler maintenant</span></> : phoneChannel ? <><WhatsAppIcon size={18}/><span>Postuler maintenant</span></> : applicationLink ? <><ExternalLink size={17}/><span>Postuler maintenant</span></> : <span>Postuler maintenant</span>}
          </button>
        </div>
      </div>
    </section>

    <div className="mt-8 space-y-6">
      {sectionText("description").length>0 && <section className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#B59A00]">01 · LE POSTE</p>
        <h2 className="mt-2 text-2xl font-black text-[#17212B]">Description du poste</h2>
        <div className="mt-5">{renderLines(sectionText("description"), "Description non renseignée.")}</div>
      </section>}

      {sectionText("missions").length>0 && <section className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#B59A00]">02 · RESPONSABILITÉS</p>
        <h2 className="mt-2 text-2xl font-black text-[#17212B]">Missions principales</h2>
        <div className="mt-6 space-y-4">{sectionText("missions").map((line:string,index:number)=><div key={index} className="rounded-2xl bg-[#F8FAFC] p-4 sm:p-5"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FFD60A] text-xs font-black text-[#17212B]">{index+1}</span><p className="pt-0.5 text-sm leading-7 text-slate-600">{line.replace(/^(?:•|▪|◦|-|–|—)\s*/,"")}</p></div></div>)}</div>
      </section>}

      {hasProfileContent && <section className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#B59A00]">03 · CANDIDAT</p>
        <h2 className="mt-2 text-2xl font-black text-[#17212B]">Profil recherché</h2>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {sectionText("profile").length>0 && <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-[#FAFBFC] p-5"><h3 className="text-sm font-black text-[#00A6A6]">Profil recherché</h3><div className="mt-3">{renderLines(sectionText("profile"))}</div></div>}\n          {profileSections.map(([key,title,fallback]) => {
            const items=sectionText(key);
            if (!items.length && key!=="experience") return null;
            return <div key={key} className="rounded-2xl border border-slate-100 bg-[#FAFBFC] p-5"><h3 className="text-sm font-black text-[#00A6A6]">{title}</h3><div className="mt-3">{renderLines(items, fallback)}</div></div>;
          })}
        </div>
      </section>}

      {(sectionText("benefits").length>0 || job.company?.description) && <section className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#B59A00]">04 · ENVIRONNEMENT</p>
        <h2 className="mt-2 text-2xl font-black text-[#17212B]">Ce que l'entreprise offre</h2>
        {sectionText("benefits").length>0 ? <div className="mt-6">{renderLines(sectionText("benefits"))}</div> : <p className="mt-5 text-sm leading-7 text-slate-600">Informations disponibles sur l'entreprise et son environnement.</p>}
        {job.company?.description && <div className="mt-6 border-t border-slate-100 pt-6"><p className="text-xs font-black uppercase tracking-[1.2px] text-slate-400">À propos de {company}</p><p className="mt-2 text-sm leading-7 text-slate-600">{job.company.description}</p>{job.company?.website&&<a href={job.company.website.startsWith("http")?job.company.website:`https://${job.company.website}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-jobly-blue underline">Site de l'entreprise</a>}</div>}
      </section>}

      <section className="rounded-[26px] border border-[#FFE135]/60 bg-[#FFFBE0] p-6 shadow-sm sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#8C7600]">05 · CANDIDATURE</p>
        <h2 className="mt-2 text-2xl font-black text-[#17212B]">Postuler</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/80 p-5"><p className="text-xs font-black uppercase tracking-[1px] text-slate-400">Mode de candidature</p><p className="mt-2 text-sm font-bold text-slate-700">{applicationMode}</p></div>
          {deadline && <div className="rounded-2xl bg-white/80 p-5"><p className="text-xs font-black uppercase tracking-[1px] text-slate-400">Échéance</p><p className="mt-2 text-sm font-bold text-slate-700">{deadline}</p></div>}
        </div>
        {applicationDocuments.length>0 && <div className="mt-4 rounded-2xl bg-white/80 p-5"><p className="text-xs font-black uppercase tracking-[1px] text-slate-400">Informations de candidature</p><div className="mt-3">{renderLines(applicationDocuments)}</div></div>}
        {applicationLink && <a href={applicationLink} target="_blank" rel="noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#22448B] bg-white py-4 text-sm font-black text-[#22448B]"><ExternalLink size={17}/>Voir la plateforme de candidature</a>}
        <button type="button" onClick={() => router.push("/cv?mode=adapt&jobId=" + encodeURIComponent(params.id) + "&source=" + encodeURIComponent(source || ""))} className="mt-3 w-full rounded-2xl border border-[#FFD60A] bg-white py-4 text-sm font-black text-[#2E3F4F]">Adapter votre CV pour cette candidature</button>
        <button disabled={busy} onClick={apply} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22448B] py-4 text-sm font-black text-white disabled:opacity-50">{emailChannel?<><GmailIcon size={18}/><span>Postuler maintenant</span></>:phoneChannel?<><WhatsAppIcon size={18}/><span>Postuler maintenant</span></>:applicationLink?<><ExternalLink size={17}/><span>Postuler maintenant</span></>:<span>Postuler maintenant</span>}</button>
        <button onClick={()=>navigator.clipboard?.writeText(jobPublicUrl(params.id,source||undefined))} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-600">Copier le lien de l'offre</button>
      </section>
    </div>
  </div></div><BottomNav active="/jobs"/></main>;

}
export default function JobDetailPage() {
  return <Suspense fallback={<main className="talent-shell grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>}><JobDetailInner/></Suspense>;
}
